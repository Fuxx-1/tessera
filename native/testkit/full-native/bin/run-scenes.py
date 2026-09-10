#!/usr/bin/env python3
"""Run full-native scenes through an external GUI capture hook.

The hook is intentionally not implemented here.  It must launch the real
application, drive platform input, and write capture-result.json for every
scene.  Without that hook this command blocks and writes no synthetic PNG.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "lib"
sys.path.insert(0, str(LIB))
from full_native_contract import (  # noqa: E402
    CAPTURE_SCHEMA_VERSION,
    generate_scene_manifest,
    load_frozen_registry,
    load_json,
    validate_ax_and_keyboard,
    validate_geometry,
    validate_scene_manifest,
    write_json,
)

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
REQUIRED_CAPTURE_ARTIFACTS = {"capture.png", "geometry.json", "runtime.log", "keyboard_trace.json", "ax_snapshot.json"}
MODAL_TRANSITION_STAGES = ("before", "click", "open", "escape", "closed")


def blocked(out_dir: Path, code: str, message: str) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    write_json(out_dir / "runner-result.json", {"status": "blocked", "code": code, "message": message, "captured_scenes": 0})
    return 2


def resolve_artifact(scene_dir: Path, value: object, expected_suffix: str) -> Path | None:
    if not isinstance(value, str) or not value or Path(value).is_absolute():
        return None
    path = (scene_dir / value).resolve()
    try:
        path.relative_to(scene_dir.resolve())
    except ValueError:
        return None
    return path if path.suffix == expected_suffix and path.is_file() else None


def resolve_local_artifact(scene_dir: Path, value: object) -> Path | None:
    if not isinstance(value, str) or not value or Path(value).is_absolute():
        return None
    path = (scene_dir / value).resolve()
    try:
        path.relative_to(scene_dir.resolve())
    except ValueError:
        return None
    return path if path.is_file() else None


def validate_modal_transition(evidence: object, scene_dir: Path) -> list[dict[str, object]]:
    """Reject generic traces for Modal: it needs a complete platform transition."""
    if not isinstance(evidence, dict):
        return [{"code": "MODAL_TRANSITION_MISSING", "message": "Modal capture requires transition evidence"}]
    transition = evidence.get("modal_transition")
    if not isinstance(transition, dict):
        return [{"code": "MODAL_TRANSITION_MISSING", "message": "Modal capture requires before/open/closed transition evidence"}]
    if transition.get("stage_order") != list(MODAL_TRANSITION_STAGES):
        return [{"code": "MODAL_TRANSITION_ORDER", "message": "Modal transition stages must be before, click, open, Escape, closed"}]
    stages = transition.get("stages")
    if not isinstance(stages, list) or [stage.get("stage") for stage in stages if isinstance(stage, dict)] != list(MODAL_TRANSITION_STAGES):
        return [{"code": "MODAL_TRANSITION_STAGES", "message": "Modal transition must emit every ordered stage"}]
    errors: list[dict[str, object]] = []
    for phase in ("before", "open", "closed"):
        artifact = resolve_artifact(scene_dir, transition.get(f"{phase}_png"), ".png")
        if artifact is None or artifact.stat().st_size <= len(PNG_SIGNATURE) or artifact.read_bytes()[: len(PNG_SIGNATURE)] != PNG_SIGNATURE:
            errors.append({"code": "MODAL_TRANSITION_PNG", "message": "Modal transition phase needs a nonempty PNG", "phase": phase})
    for key in ("open_delta", "open_to_closed_delta", "closed_to_before_delta"):
        delta = transition.get(key)
        if not isinstance(delta, dict) or delta.get("dimensions_match") is not True or not isinstance(delta.get("significant_pixel_count"), int):
            errors.append({"code": "MODAL_TRANSITION_DELTA", "message": "Modal transition requires complete pixel delta records", "delta": key})
    if transition.get("open_material_delta") is not True or transition.get("close_material_delta") is not True:
        errors.append({"code": "MODAL_TRANSITION_ZERO_DELTA", "message": "Modal open and close must each have a material platform pixel delta"})
    if transition.get("panel_backdrop_appeared_then_disappeared") is not True:
        errors.append({"code": "MODAL_TRANSITION_PANEL", "message": "Modal panel or backdrop did not appear then disappear in the same transition region"})
    if transition.get("closed_approximately_before") is not True:
        errors.append({"code": "MODAL_TRANSITION_CLOSED", "message": "Modal closed frame must approximately match the before frame"})
    if transition.get("status") != "observed":
        errors.append({"code": "MODAL_TRANSITION_NOT_OBSERVED", "message": "Modal transition remains blocked"})
    return errors


def validate_capture(
    scene: dict[str, object],
    scene_dir: Path,
    manifest_sha256: str | None = None,
    source_revision: str | None = None,
    build_key: str | None = None,
    binary_sha256: str | None = None,
) -> list[dict[str, object]]:
    result_path = scene_dir / "capture-result.json"
    if not result_path.is_file():
        return [{"code": "CAPTURE_RESULT_MISSING", "message": "capture hook did not write capture-result.json"}]
    result = load_json(result_path)
    if not isinstance(result, dict) or result.get("schema_version") != CAPTURE_SCHEMA_VERSION:
        return [{"code": "CAPTURE_RESULT_SCHEMA", "message": "capture result schema is invalid"}]
    if result.get("status") == "blocked":
        blocker = result.get("blocker")
        if isinstance(blocker, dict) and isinstance(blocker.get("code"), str) and isinstance(blocker.get("message"), str):
            return [{
                "code": "CAPTURE_HOOK_BLOCKED",
                "message": "capture hook explicitly blocked the requested scene",
                "hook_code": blocker["code"],
                "hook_message": blocker["message"],
            }]
        return [{"code": "CAPTURE_RESULT_BLOCKED", "message": "capture hook returned blocked without a valid blocker record"}]
    errors: list[dict[str, object]] = []
    if result.get("scenario_id") != scene.get("id") or result.get("status") != "captured":
        errors.append({"code": "CAPTURE_RESULT_IDENTITY", "message": "capture result does not identify a captured requested scene"})
    required = set(scene.get("required_artifacts", []))
    if "png" in required:
        png = resolve_artifact(scene_dir, result.get("capture_png"), ".png")
        if png is None or png.stat().st_size <= len(PNG_SIGNATURE) or png.read_bytes()[: len(PNG_SIGNATURE)] != PNG_SIGNATURE:
            errors.append({"code": "CAPTURE_PNG_INVALID", "message": "real nonempty PNG capture is required"})
    if "geometry" in required:
        geometry = resolve_artifact(scene_dir, result.get("geometry_json"), ".json")
        if geometry is None:
            errors.append({"code": "GEOMETRY_ARTIFACT_MISSING", "message": "geometry JSON is required"})
        else:
            errors.extend(validate_geometry(load_json(geometry)))
    evidence = result.get("evidence")
    if not isinstance(evidence, dict) or not isinstance(evidence.get("evidence_id"), str) or not evidence.get("revision"):
        errors.append({"code": "EVIDENCE_MISSING", "message": "capture result needs revisioned evidence"})
    else:
        errors.extend(validate_assertion_facts(evidence, scene))
        errors.extend(validate_ax_and_keyboard(evidence, scene))
        plan = evidence.get("interaction_plan")
        if not isinstance(plan, dict) or plan.get("status") not in {"observed", "blocked"} or not isinstance(plan.get("postcondition"), str):
            errors.append({"code": "INTERACTION_PLAN_SHAPE", "message": "capture evidence needs an explicit interaction plan and postcondition"})
        elif plan.get("status") != "observed" or plan.get("postcondition_observed") is not True:
            errors.append({"code": "INTERACTION_POSTCONDITION_NOT_OBSERVED", "message": "component-specific interaction postcondition was not observed; screenshot deltas are insufficient"})
        if scene.get("component_id") == "modal":
            errors.extend(validate_modal_transition(evidence, scene_dir))
    request = result.get("request")
    viewport = scene.get("viewport")
    expected_request = {
        "scene_id": scene.get("id"),
        "component_id": scene.get("component_id"),
        "theme": scene.get("theme") or "system",
        "viewport": viewport,
    }
    if request != expected_request:
        errors.append({"code": "CAPTURE_REQUEST_IDENTITY", "message": "capture result request does not match the requested scene", "expected": expected_request, "actual": request})
    provenance = result.get("provenance")
    if not isinstance(provenance, dict):
        errors.append({"code": "CAPTURE_PROVENANCE_MISSING", "message": "capture result needs source revision, build key, manifest hash, and binary hash"})
    else:
        for key in ("source_revision", "build_key", "scene_manifest_sha256", "binary_sha256"):
            if not isinstance(provenance.get(key), str) or not provenance[key]:
                errors.append({"code": "CAPTURE_PROVENANCE_FIELD", "message": f"provenance field {key} is missing"})
        if source_revision is not None and provenance.get("source_revision") != source_revision:
            errors.append({"code": "CAPTURE_SOURCE_IDENTITY", "message": "capture result source revision does not match runner input"})
        if build_key is not None and provenance.get("build_key") != build_key:
            errors.append({"code": "CAPTURE_BUILD_IDENTITY", "message": "capture result build key does not match runner input"})
        if binary_sha256 is not None and provenance.get("binary_sha256") != binary_sha256:
            errors.append({"code": "CAPTURE_BINARY_IDENTITY", "message": "capture result binary hash does not match runner input"})
        if manifest_sha256 and provenance.get("scene_manifest_sha256") != manifest_sha256:
            errors.append({"code": "CAPTURE_MANIFEST_IDENTITY", "message": "capture result manifest hash does not match runner input"})
        if isinstance(evidence, dict) and evidence.get("revision") != provenance.get("source_revision"):
            errors.append({"code": "CAPTURE_EVIDENCE_REVISION_IDENTITY", "message": "evidence revision must equal provenance source revision"})
    artifact_hashes = result.get("artifact_sha256")
    if not isinstance(artifact_hashes, dict):
        errors.append({"code": "CAPTURE_ARTIFACT_HASHES_MISSING", "message": "capture result needs hashes for every emitted artifact"})
    else:
        for name in sorted(REQUIRED_CAPTURE_ARTIFACTS - set(artifact_hashes)):
            errors.append({"code": "CAPTURE_ARTIFACT_CLOSED_SET", "message": "capture result must hash the complete v2 artifact set", "artifact": name})
        for name, digest in artifact_hashes.items():
            artifact = resolve_local_artifact(scene_dir, name)
            if artifact is None or not isinstance(digest, str):
                errors.append({"code": "CAPTURE_ARTIFACT_HASH_INVALID", "message": "artifact hash must reference a local emitted file", "artifact": name})
            elif hashlib.sha256(artifact.read_bytes()).hexdigest() != digest:
                errors.append({"code": "CAPTURE_ARTIFACT_HASH_MISMATCH", "message": "artifact hash does not match emitted file", "artifact": name})
    trace = evidence.get("keyboard_trace")
    if trace is not None:
        if not isinstance(trace, dict) or trace.get("input_origin") != "platform_injected" or not isinstance(trace.get("steps"), list):
            errors.append({"code": "KEYBOARD_TRACE_SHAPE", "message": "keyboard trace must carry platform provenance and a bounded step list"})
        elif len(trace["steps"]) > 32:
            errors.append({"code": "KEYBOARD_TRACE_BOUNDED", "message": "keyboard trace exceeds the bounded step limit"})
    if not isinstance(trace, dict) or trace.get("input_origin") != "platform_injected" or not isinstance(trace.get("steps"), list):
        errors.append({"code": "KEYBOARD_TRACE_REQUIRED", "message": "every v2 capture must emit a platform-provenance keyboard trace"})
    ax = evidence.get("ax_snapshot")
    if not isinstance(ax, dict) or not isinstance(ax.get("status"), str) or not isinstance(ax.get("nodes"), list) or not isinstance(ax.get("focused_ax_id"), (str, type(None))):
        errors.append({"code": "AX_SNAPSHOT_SHAPE", "message": "AX snapshot must expose status and a bounded node list"})
    return errors


def validate_assertion_facts(evidence: dict[str, object], scene: dict[str, object]) -> list[dict[str, object]]:
    """Require each requested scene assertion to have an observed GUI fact.

    A screenshot file alone cannot establish focus, text, input, performance,
    or scroll claims. Hooks may report an explicit blocker, but that is not an
    acceptance observation and must leave the scene blocked.
    """
    assertions = scene.get("assertions", [])
    if not isinstance(assertions, list):
        return [{"code": "SCENE_ASSERTIONS_INVALID", "message": "scene assertions must be a list"}]
    facts = evidence.get("assertion_facts")
    if not isinstance(facts, list):
        return [{"code": "ASSERTION_FACTS_MISSING", "message": "capture evidence must contain assertion_facts for every requested assertion"}]
    by_assertion: dict[str, dict[str, object]] = {}
    for fact in facts:
        if isinstance(fact, dict) and isinstance(fact.get("assertion"), str):
            by_assertion[fact["assertion"]] = fact
    errors: list[dict[str, object]] = []
    for assertion in assertions:
        if not isinstance(assertion, str):
            errors.append({"code": "ASSERTION_FACT_INVALID", "message": "scene assertion is not a string"})
            continue
        fact = by_assertion.get(assertion)
        if fact is None:
            errors.append({"code": "ASSERTION_FACT_MISSING", "message": "capture evidence has no fact for requested assertion", "assertion": assertion})
        elif fact.get("status") != "observed":
            errors.append({"code": "ASSERTION_NOT_OBSERVED", "message": "requested assertion is not supported by an observed GUI fact", "assertion": assertion, "status": fact.get("status"), "reason": fact.get("reason")})
    return errors


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parent = Path(__file__).resolve().parents[1]
    parser.add_argument("--scene-manifest", default=str(parent / "scene-manifest-v1.json"))
    parser.add_argument("--frozen-registry", default=str(parent / "frozen-registry-v1.json"))
    parser.add_argument("--capture-hook", help="absolute executable GUI harness")
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--only", action="append", default=[], help="run one exact scene ID; repeatable")
    parser.add_argument("--source-revision", default=os.environ.get("TESSERA_SOURCE_REVISION", "unbound"))
    parser.add_argument("--build-key", default=os.environ.get("TESSERA_BUILD_KEY", "unbound"))
    parser.add_argument("--binary-sha256", default=os.environ.get("TESSERA_BINARY_SHA256", "unbound"))
    args = parser.parse_args(argv)
    out_dir = Path(args.out_dir).resolve()
    if not args.capture_hook:
        return blocked(out_dir, "GUI_CAPTURE_HOOK_MISSING", "no GUI capture hook was supplied; screenshots are not fabricated")
    if "unbound" in {args.source_revision, args.build_key, args.binary_sha256}:
        return blocked(out_dir, "CAPTURE_PROVENANCE_UNBOUND", "source revision, build key, and release binary SHA-256 are required")
    hook = Path(args.capture_hook)
    if not hook.is_absolute() or not hook.is_file() or not os.access(hook, os.X_OK):
        return blocked(out_dir, "GUI_CAPTURE_HOOK_INVALID", "capture hook must be an absolute executable file")
    registry, registry_errors = load_frozen_registry(Path(args.frozen_registry))
    scenes_document = load_json(Path(args.scene_manifest))
    scene_errors = registry_errors + validate_scene_manifest(scenes_document, registry)
    if scene_errors:
        out_dir.mkdir(parents=True, exist_ok=True)
        write_json(out_dir / "runner-result.json", {"status": "blocked", "code": "SCENE_MANIFEST_INVALID", "errors": scene_errors, "captured_scenes": 0})
        return 2
    scenes = scenes_document["scenes"]
    manifest_sha256 = hashlib.sha256(Path(args.scene_manifest).read_bytes()).hexdigest()
    if args.only:
        requested = set(args.only)
        scenes = [scene for scene in scenes if scene["id"] in requested]
        if len(scenes) != len(requested):
            return blocked(out_dir, "SCENE_NOT_FOUND", "one or more requested scene IDs are absent")
    out_dir.mkdir(parents=True, exist_ok=True)
    reports: list[dict[str, object]] = []
    for scene in scenes:
        scene_dir = out_dir / scene["id"]
        scene_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".json", delete=False) as source:
            json.dump(scene, source, sort_keys=True)
            scene_file = Path(source.name)
        process = None
        try:
            environment = os.environ.copy()
            environment.update({
                "TESSERA_SOURCE_REVISION": args.source_revision,
                "TESSERA_BUILD_KEY": args.build_key,
                "TESSERA_BINARY_SHA256": args.binary_sha256,
                "TESSERA_SCENE_MANIFEST_SHA256": manifest_sha256,
            })
            if scene.get("suite") == "keyboard_focus":
                environment["TESSERA_INPUT_PROBE"] = "1"
            process = subprocess.Popen(
                [str(hook), "--scene", str(scene_file), "--out-dir", str(scene_dir)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                start_new_session=True,
                env=environment,
            )
            try:
                stdout, stderr = process.communicate(timeout=90)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    stdout, stderr = process.communicate(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    stdout, stderr = process.communicate()
                reports.append({"scene_id": scene["id"], "status": "blocked", "errors": [{"code": "CAPTURE_HOOK_TIMEOUT", "message": "capture hook exceeded 90 seconds and its process group was terminated"}], "stdout": stdout[-2000:], "stderr": stderr[-2000:]})
                continue
            errors = validate_capture(scene, scene_dir, manifest_sha256, args.source_revision, args.build_key, args.binary_sha256)
            if process.returncode != 0 and not any(error.get("code") == "CAPTURE_HOOK_BLOCKED" for error in errors):
                errors.append({"code": "CAPTURE_HOOK_FAILED", "message": "capture hook returned nonzero", "returncode": process.returncode})
            reports.append({"scene_id": scene["id"], "status": "pass" if not errors else "blocked", "errors": errors, "stdout": stdout[-2000:], "stderr": stderr[-2000:]})
        finally:
            if process is not None and process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
            scene_file.unlink(missing_ok=True)
    verdict = "pass" if all(report["status"] == "pass" for report in reports) else "blocked"
    write_json(out_dir / "runner-result.json", {"status": verdict, "captured_scenes": len(reports), "reports": reports})
    return 0 if verdict == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
