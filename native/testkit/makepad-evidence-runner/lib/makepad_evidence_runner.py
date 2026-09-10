from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

CAPABILITY_PROBE_VERSION = "tessera/makepad-capability-probe/v1"
CAPTURE_METADATA_VERSION = "tessera/makepad-capture-metadata/v1"
CAPTURE_PROVENANCE_VERSION = "tessera/makepad-capture-provenance/v1"
CAPTURE_ATTESTATION_VERSION = "tessera/makepad-capture-attestation/v1"
ARTIFACT_INDEX_VERSION = "tessera/makepad-artifacts/v1"
RESERVATION_VERSION = "tessera/makepad-reservation/v1"
EVIDENCE_VERSION = "tessera/makepad-evidence-record/v1"
MANIFEST_VERSION = "tessera/makepad-evidence-matrix/v1"
RUNNER_VERSION = "makepad-evidence-runner/0.1.0"
DEFAULT_EVIDENCE_ROOT = Path.home() / "Library" / "Application Support" / "Tessera" / "evidence"
RUN_ID_RE = re.compile(r"^RUN-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}-[0-9]{3}$")
REVISION_RE = re.compile(r"^[a-f0-9]{40}$")
HEX64_RE = re.compile(r"^[a-f0-9]{64}$")
SUPPORTED_CAPTURE_SOURCES = {"state_only", "synthetic", "runtime_capture"}
SUPPORTED_EXECUTION_STATUSES = {"PASS", "FAIL", "BLOCKED"}


class RunnerError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


def error(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise RunnerError("JSON_INVALID", f"unable to read JSON file: {path}") from exc


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = canonical_json_bytes(value)
    with tempfile.NamedTemporaryFile("wb", delete=False, dir=path.parent, prefix=f".{path.name}.", suffix=".tmp") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
        temp_name = Path(handle.name)
    os.replace(temp_name, path)


def require_str(obj: dict[str, Any], key: str, code: str) -> str:
    value = obj.get(key)
    if not isinstance(value, str) or not value:
        raise RunnerError(code, f"missing string field {key!r}")
    return value


def require_int(obj: dict[str, Any], key: str, code: str) -> int:
    value = obj.get(key)
    if not isinstance(value, int):
        raise RunnerError(code, f"missing integer field {key!r}")
    return value


def require_bool(obj: dict[str, Any], key: str, code: str) -> bool:
    value = obj.get(key)
    if not isinstance(value, bool):
        raise RunnerError(code, f"missing boolean field {key!r}")
    return value


def object_or_empty(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def validate_revision(revision: str) -> None:
    if not REVISION_RE.fullmatch(revision):
        raise RunnerError("REVISION_INVALID", "revision must be a 40-character lowercase hex commit id")


def validate_run_id(run_id: str) -> None:
    if not RUN_ID_RE.fullmatch(run_id):
        raise RunnerError("RUN_ID_INVALID", "run id must use RUN-YYYYMMDDTHHMMSSZ-<source8>-<seq>")


def validate_run_revision_binding(run_id: str, revision: str) -> None:
    validate_run_id(run_id)
    if run_id.split("-")[2] != revision[:8]:
        raise RunnerError("RUN_ID_REVISION_MISMATCH", "run id source prefix must match revision prefix")


def validate_hex(value: str, code: str, label: str) -> None:
    if not HEX64_RE.fullmatch(value):
        raise RunnerError(code, f"{label} must be a 64-character lowercase hex digest")


def safe_relative_path(value: str, code: str) -> str:
    if not isinstance(value, str) or not value:
        raise RunnerError(code, "relative path must be a non-empty string")
    if "\x00" in value or value.startswith("/") or value.startswith("\\") or ":" in value or "\\" in value:
        raise RunnerError(code, f"unsafe relative path {value!r}")
    rel = PurePosixPath(value)
    if rel.is_absolute():
        raise RunnerError(code, f"unsafe absolute path {value!r}")
    parts = rel.parts
    if any(part in {"..", ".", ""} for part in parts):
        raise RunnerError(code, f"unsafe relative path {value!r}")
    return rel.as_posix()


def safe_join(root: Path, relative: str, code: str = "PATH_ESCAPE") -> Path:
    rel = safe_relative_path(relative, code)
    resolved_root = root.resolve()
    raw_candidate = root / rel
    current = root
    for part in PurePosixPath(rel).parts:
        current = current / part
        if current.is_symlink():
            raise RunnerError(code, f"symlink path component is not allowed: {relative!r}")
    candidate = raw_candidate.resolve()
    try:
        candidate.relative_to(resolved_root)
    except ValueError as exc:
        raise RunnerError(code, f"path escapes managed root: {relative!r}") from exc
    return candidate


def ensure_managed_root(evidence_root: Path) -> Path:
    evidence_root.mkdir(parents=True, exist_ok=True)
    if evidence_root.is_symlink() or not evidence_root.is_dir():
        raise RunnerError("EVIDENCE_ROOT_INVALID", "evidence root must be a real directory")
    return evidence_root.resolve()


def ensure_regular_file(path: Path, code: str, label: str) -> None:
    if not path.exists():
        raise RunnerError(code, f"missing {label}: {path}")
    if path.is_symlink():
        raise RunnerError(code, f"{label} must not be a symlink: {path}")
    if not path.is_file():
        raise RunnerError(code, f"{label} must be a regular file: {path}")


def load_manifest(manifest_path: Path, *, verify_fixture_bytes: bool = True) -> dict[str, Any]:
    ensure_regular_file(manifest_path, "MANIFEST_MISSING", "manifest")
    manifest = read_json(manifest_path)
    if not isinstance(manifest, dict):
        raise RunnerError("MANIFEST_SCHEMA", "manifest must be a JSON object")
    if manifest.get("schema_version") != MANIFEST_VERSION:
        raise RunnerError("MANIFEST_SCHEMA", f"manifest schema_version must be {MANIFEST_VERSION!r}")

    fixtures = manifest.get("fixtures")
    cells = manifest.get("cells")
    if not isinstance(fixtures, list) or not isinstance(cells, list):
        raise RunnerError("MANIFEST_SCHEMA", "manifest must contain fixtures[] and cells[]")

    fixture_map: dict[str, dict[str, Any]] = {}
    normalized_fixtures: list[dict[str, Any]] = []
    for fixture in fixtures:
        if not isinstance(fixture, dict):
            raise RunnerError("MANIFEST_SCHEMA", "fixture entries must be JSON objects")
        fixture_id = require_str(fixture, "fixture_id", "MANIFEST_SCHEMA")
        relative_path = safe_relative_path(require_str(fixture, "relative_path", "MANIFEST_SCHEMA"), "MANIFEST_PATH")
        fixture_sha = require_str(fixture, "sha256", "MANIFEST_SCHEMA")
        validate_hex(fixture_sha, "MANIFEST_FIXTURE_HASH", f"fixture {fixture_id} hash")
        if fixture_id in fixture_map:
            raise RunnerError("MANIFEST_DUPLICATE_FIXTURE", f"duplicate fixture id {fixture_id!r}")
        fixture_path = manifest_path.parent / relative_path
        if verify_fixture_bytes:
            ensure_regular_file(fixture_path, "MANIFEST_FIXTURE_MISSING", f"fixture {fixture_id}")
            actual_sha = sha256_file(fixture_path)
            if actual_sha != fixture_sha:
                raise RunnerError(
                    "MANIFEST_FIXTURE_HASH",
                    f"fixture {fixture_id!r} hash mismatch: expected {fixture_sha}, got {actual_sha}",
                )
        else:
            actual_sha = fixture_sha
        normalized_fixture = dict(fixture)
        normalized_fixture["relative_path"] = relative_path
        normalized_fixture["sha256"] = fixture_sha
        normalized_fixture["source_sha256"] = actual_sha
        fixture_map[fixture_id] = normalized_fixture
        normalized_fixtures.append(normalized_fixture)

    cell_map: dict[str, dict[str, Any]] = {}
    normalized_cells: list[dict[str, Any]] = []
    for cell in cells:
        if not isinstance(cell, dict):
            raise RunnerError("MANIFEST_SCHEMA", "cell entries must be JSON objects")
        cell_id = require_str(cell, "cell_id", "MANIFEST_SCHEMA")
        case_id = require_str(cell, "case_id", "MANIFEST_SCHEMA")
        fixture_id = require_str(cell, "fixture_id", "MANIFEST_SCHEMA")
        platform_name = require_str(cell, "platform", "MANIFEST_SCHEMA")
        device = require_str(cell, "device", "MANIFEST_SCHEMA")
        theme = require_str(cell, "theme", "MANIFEST_SCHEMA")
        viewport = require_str(cell, "viewport", "MANIFEST_SCHEMA")
        system_scale = require_str(cell, "system_scale", "MANIFEST_SCHEMA")
        app_scale = require_str(cell, "app_scale", "MANIFEST_SCHEMA")
        content_profile = require_str(cell, "content_profile", "MANIFEST_SCHEMA")
        input_profile = require_str(cell, "input_profile", "MANIFEST_SCHEMA")
        lifecycle_profile = require_str(cell, "lifecycle_profile", "MANIFEST_SCHEMA")
        ordinal = require_int(cell, "ordinal", "MANIFEST_SCHEMA")
        if cell_id in cell_map:
            raise RunnerError("MANIFEST_DUPLICATE_CELL", f"duplicate cell id {cell_id!r}")
        if fixture_id not in fixture_map:
            raise RunnerError("MANIFEST_FIXTURE_UNKNOWN", f"cell {cell_id!r} refers to unknown fixture {fixture_id!r}")
        artifacts = cell.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts:
            raise RunnerError("MANIFEST_SCHEMA", f"cell {cell_id!r} must define artifacts[]")
        normalized_artifacts: list[dict[str, Any]] = []
        seen_artifact_ids: set[str] = set()
        seen_paths: set[str] = set()
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                raise RunnerError("MANIFEST_SCHEMA", f"cell {cell_id!r} artifact entries must be objects")
            artifact_id = require_str(artifact, "artifact_id", "MANIFEST_SCHEMA")
            relative_path = safe_relative_path(require_str(artifact, "relative_path", "MANIFEST_SCHEMA"), "MANIFEST_PATH")
            kind = require_str(artifact, "kind", "MANIFEST_SCHEMA")
            required = require_bool(artifact, "required", "MANIFEST_SCHEMA")
            synthetic_allowed = require_bool(artifact, "synthetic_allowed", "MANIFEST_SCHEMA")
            binding = artifact.get("binding")
            if binding is not None and (not isinstance(binding, str) or not binding):
                raise RunnerError("MANIFEST_SCHEMA", f"cell {cell_id!r} artifact binding must be a string")
            if artifact_id in seen_artifact_ids:
                raise RunnerError("MANIFEST_DUPLICATE_ARTIFACT", f"cell {cell_id!r} duplicates artifact id {artifact_id!r}")
            if relative_path in seen_paths:
                raise RunnerError("MANIFEST_DUPLICATE_ARTIFACT", f"cell {cell_id!r} duplicates artifact path {relative_path!r}")
            seen_artifact_ids.add(artifact_id)
            seen_paths.add(relative_path)
            normalized_artifacts.append(
                {
                    "artifact_id": artifact_id,
                    "relative_path": relative_path,
                    "kind": kind,
                    "required": required,
                    "synthetic_allowed": synthetic_allowed,
                    "binding": binding,
                }
            )
        normalized_cell = {
            "cell_id": cell_id,
            "case_id": case_id,
            "fixture_id": fixture_id,
            "platform": platform_name,
            "device": device,
            "theme": theme,
            "viewport": viewport,
            "system_scale": system_scale,
            "app_scale": app_scale,
            "content_profile": content_profile,
            "input_profile": input_profile,
            "lifecycle_profile": lifecycle_profile,
            "ordinal": ordinal,
            "requires": list(cell.get("requires", [])),
            "artifacts": normalized_artifacts,
        }
        cell_map[cell_id] = normalized_cell
        normalized_cells.append(normalized_cell)

    normalized = {
        "schema_version": MANIFEST_VERSION,
        "runner_version": manifest.get("runner_version", RUNNER_VERSION),
        "manifest_sha256": sha256_file(manifest_path),
        "manifest_path": str(manifest_path),
        "fixtures": normalized_fixtures,
        "cells": normalized_cells,
    }
    normalized["_index"] = {"fixtures": fixture_map, "cells": cell_map}
    return normalized


def manifest_cell(manifest: dict[str, Any], cell_id: str) -> dict[str, Any]:
    cell = manifest.get("_index", {}).get("cells", {}).get(cell_id)
    if not isinstance(cell, dict):
        raise RunnerError("MANIFEST_CELL_UNKNOWN", f"unknown cell id {cell_id!r}")
    return cell


def manifest_fixture(manifest: dict[str, Any], fixture_id: str) -> dict[str, Any]:
    fixture = manifest.get("_index", {}).get("fixtures", {}).get(fixture_id)
    if not isinstance(fixture, dict):
        raise RunnerError("MANIFEST_FIXTURE_UNKNOWN", f"unknown fixture id {fixture_id!r}")
    return fixture


def evidence_root_for(revision: str, evidence_root: Path) -> Path:
    validate_revision(revision)
    return evidence_root / revision


def run_root_for(revision: str, run_id: str, evidence_root: Path) -> Path:
    validate_revision(revision)
    validate_run_revision_binding(run_id, revision)
    return evidence_root / revision / run_id


def _copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with source.open("rb") as src, tempfile.NamedTemporaryFile("wb", delete=False, dir=destination.parent, prefix=f".{destination.name}.", suffix=".tmp") as tmp:
        shutil.copyfileobj(src, tmp)
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_name = Path(tmp.name)
    os.replace(tmp_name, destination)


def probe_platform_capabilities() -> dict[str, Any]:
    system = platform.system()
    lower = system.lower()

    def blocked(reason: str) -> dict[str, str]:
        return {"status": "blocked", "reason": reason}

    def supported(reason: str) -> dict[str, str]:
        return {"status": "supported", "reason": reason}

    android_reason = "no verified Android runtime bridge"
    if shutil.which("adb"):
        android_reason = "adb is present, but live Android evidence is still required"

    ios_reason = "no verified iOS runtime bridge"
    if shutil.which("xcodebuild") or shutil.which("xcrun"):
        ios_reason = "Apple toolchain is present, but live iOS evidence is still required"

    windowserver = {"status": "blocked", "reason": "no verified desktop window server"}
    if lower == "darwin":
        try:
            result = subprocess.run(
                ["/usr/bin/pgrep", "-x", "WindowServer"],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=2,
            )
            if result.returncode == 0:
                windowserver = blocked("WindowServer process is present; runtime capture is still required")
            else:
                windowserver = blocked("WindowServer process was not observed")
        except (OSError, subprocess.TimeoutExpired):
            windowserver = blocked("WindowServer probe failed")

    platforms = {
        "macos": blocked("macOS host detected; verified capture adapter is not implemented") if lower == "darwin" else blocked(f"host is {system}"),
        "android": blocked(android_reason),
        "ios": blocked(ios_reason),
        "windows": blocked("Windows host detected; verified Makepad capture adapter is not implemented") if lower == "windows" else blocked(f"host is {system}"),
        "linux": blocked("Linux host detected; verified Makepad capture adapter is not implemented") if lower == "linux" else blocked(f"host is {system}"),
    }
    macos_tools = {name: bool(shutil.which(name)) for name in ("screencapture", "osascript", "swiftc", "xcrun")}
    capabilities = {
        "windowserver": windowserver,
        "accessibility": blocked("no verified Makepad AX bridge or trust-root verifier"),
        "ime": blocked("no verified native IME capture adapter"),
        "mobile_runtime": blocked("no verified Android/iOS install and device capture adapter"),
        "screen_capture": blocked("capture adapter is external to this skeleton"),
        "macos_runner": {
            "status": "blocked",
            "reason": "host/tool detection is informational; real GUI/AX/IME capture adapter is unimplemented",
            "tools": macos_tools,
        },
    }
    return {
        "schema_version": CAPABILITY_PROBE_VERSION,
        "captured_at": now_iso(),
        "host": {
            "system": system,
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "python_version": platform.python_version(),
            "executable": sys.executable,
        },
        "platforms": platforms,
        "capabilities": capabilities,
    }


def _validate_artifact_specs(cell: dict[str, Any]) -> None:
    if not cell["artifacts"]:
        raise RunnerError("MANIFEST_SCHEMA", f"cell {cell['cell_id']!r} must declare at least one artifact")
    for artifact in cell["artifacts"]:
        if artifact["kind"] in {"metadata", "probe", "provenance"}:
            continue
    real_count = sum(1 for artifact in cell["artifacts"] if artifact["kind"] not in {"metadata", "probe", "provenance"})
    if real_count <= 0:
        raise RunnerError("MANIFEST_SCHEMA", f"cell {cell['cell_id']!r} must declare a real runtime artifact")


def reserve_run(
    *,
    revision: str,
    run_id: str,
    manifest_path: Path,
    evidence_root: Path,
    cell_id: str,
    binary_sha256: str,
    build_key_sha256: str,
    ordinal: int = 0,
) -> dict[str, Any]:
    validate_revision(revision)
    validate_run_revision_binding(run_id, revision)
    validate_hex(binary_sha256, "HASH_INVALID", "binary hash")
    validate_hex(build_key_sha256, "HASH_INVALID", "build key hash")
    if ordinal not in {0, 1}:
        raise RunnerError("ORDINAL_INVALID", "ordinal must be 0 for an initial run or 1 for one targeted retest")
    evidence_root = ensure_managed_root(evidence_root)
    manifest = load_manifest(manifest_path)
    cell = manifest_cell(manifest, cell_id)
    _validate_artifact_specs(cell)
    fixture = manifest_fixture(manifest, cell["fixture_id"])
    run_root = run_root_for(revision, run_id, evidence_root)
    if run_root.exists():
        if (run_root / "evidence.json").exists():
            raise RunnerError("RUN_ALREADY_SEALED", f"sealed evidence already exists at {run_root}")
        raise RunnerError("RUN_ALREADY_EXISTS", f"run directory already exists: {run_root}")

    run_root.mkdir(parents=True, exist_ok=False)
    (run_root / "capture").mkdir(parents=True, exist_ok=True)
    (run_root / "artifacts").mkdir(parents=True, exist_ok=True)

    manifest_snapshot = run_root / "manifest.snapshot.json"
    _copy_file(manifest_path, manifest_snapshot)
    snapshot_sha256 = sha256_file(manifest_snapshot)
    for fixture in manifest["fixtures"]:
        source_fixture = manifest_path.parent / fixture["relative_path"]
        destination_fixture = run_root / fixture["relative_path"]
        try:
            _copy_file(source_fixture, destination_fixture)
        except OSError as exc:
            raise RunnerError("MANIFEST_FIXTURE_MISSING", f"unable to copy fixture {fixture['fixture_id']!r}") from exc

    reservation = {
        "schema_version": RESERVATION_VERSION,
        "state": "reserved",
        "reserved_at": now_iso(),
        "run": {
            "revision": revision,
            "run_id": run_id,
            "ordinal": ordinal,
            "root": str(run_root),
            "evidence_root": str(evidence_root.resolve()),
        },
        "source": {
            "binary_sha256": binary_sha256,
            "build_key_sha256": build_key_sha256,
            "manifest_sha256": snapshot_sha256,
            "fixture_sha256": fixture["sha256"],
        },
        "matrix": {
            "cell_id": cell["cell_id"],
            "case_id": cell["case_id"],
            "fixture_id": cell["fixture_id"],
            "platform": cell["platform"],
            "device": cell["device"],
            "theme": cell["theme"],
            "viewport": cell["viewport"],
            "system_scale": cell["system_scale"],
            "app_scale": cell["app_scale"],
            "content_profile": cell["content_profile"],
            "input_profile": cell["input_profile"],
            "lifecycle_profile": cell["lifecycle_profile"],
            "requires": list(cell.get("requires", [])),
        },
        "fixture": {
            "fixture_id": fixture["fixture_id"],
            "relative_path": fixture["relative_path"],
            "sha256": fixture["sha256"],
        },
        "artifacts": [
            {
                "artifact_id": artifact["artifact_id"],
                "relative_path": artifact["relative_path"],
                "kind": artifact["kind"],
                "required": artifact["required"],
                "synthetic_allowed": artifact["synthetic_allowed"],
                "binding": artifact.get("binding"),
            }
            for artifact in cell["artifacts"]
        ],
        "manifest": {
            "source_path": str(manifest_path),
            "snapshot_path": str(manifest_snapshot),
        },
    }
    write_json(run_root / "reservation.json", reservation)
    return reservation


def _load_reservation(run_root: Path) -> dict[str, Any]:
    reservation_path = run_root / "reservation.json"
    ensure_regular_file(reservation_path, "MISSING_RESERVATION", "reservation")
    reservation = read_json(reservation_path)
    if not isinstance(reservation, dict) or reservation.get("schema_version") != RESERVATION_VERSION:
        raise RunnerError("RESERVATION_SCHEMA", "reservation file is malformed")
    return reservation


def _write_capture_stage_files(run_root: Path, payload: dict[str, Any]) -> None:
    write_json(run_root / "capture" / "metadata.json", payload["metadata"])
    write_json(run_root / "capture" / "platform-probe.json", payload["platform_probe"])
    write_json(run_root / "capture" / "provenance.json", payload["provenance"])


def capture_metadata(
    run_root: Path,
    *,
    capture_source: str = "state_only",
    execution_status: str = "BLOCKED",
    attestation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if capture_source not in SUPPORTED_CAPTURE_SOURCES:
        raise RunnerError("CAPTURE_SOURCE_INVALID", f"unsupported capture source {capture_source!r}")
    if execution_status not in SUPPORTED_EXECUTION_STATUSES:
        raise RunnerError("EXECUTION_STATUS_INVALID", f"unsupported execution status {execution_status!r}")
    reservation = _load_reservation(run_root)
    platform_probe = probe_platform_capabilities()
    matrix = reservation["matrix"]
    fixture = reservation["fixture"]
    blockers: list[str] = []
    target_platform = matrix["platform"]
    target_status = platform_probe["platforms"].get(target_platform, {"status": "blocked", "reason": "unknown platform"})
    if target_status.get("status") != "supported":
        blockers.append(f"platform:{target_platform}:{target_status.get('reason', 'blocked')}")
    if capture_source != "runtime_capture":
        blockers.append(f"capture_source:{capture_source}")
    capability_map = {
        "real_gui": "windowserver",
        "ax": "accessibility",
        "ax_tree": "accessibility",
        "ax_action_roundtrip": "accessibility",
        "voiceover": "accessibility",
        "ime": "ime",
        "candidate_window": "ime",
        "real_mobile": "mobile_runtime",
        "install": "mobile_runtime",
        "touch": "mobile_runtime",
        "safe_area": "mobile_runtime",
        "soft_keyboard": "mobile_runtime",
        "rotation": "mobile_runtime",
    }
    for requirement in matrix.get("requires", []):
        capability = capability_map.get(requirement)
        if capability is None:
            continue
        capability_status = platform_probe.get("capabilities", {}).get(capability, {"status": "blocked", "reason": "missing"})
        if capability_status.get("status") != "supported":
            blockers.append(f"capability:{capability}:{capability_status.get('reason', 'blocked')}")
    if capture_source == "runtime_capture":
        if not isinstance(attestation, dict) or attestation.get("schema_version") != CAPTURE_ATTESTATION_VERSION:
            blockers.append("capture_attestation:missing_or_invalid")
        else:
            blockers.append("capture_attestation_verifier:unimplemented")

    metadata = {
        "schema_version": CAPTURE_METADATA_VERSION,
        "captured_at": now_iso(),
        "run_id": reservation["run"]["run_id"],
        "revision": reservation["run"]["revision"],
        "cell_id": matrix["cell_id"],
        "capture_source": capture_source,
        "execution_status": execution_status,
        "platform": target_platform,
        "device": matrix["device"],
        "theme": matrix["theme"],
        "viewport": matrix["viewport"],
        "system_scale": matrix["system_scale"],
        "app_scale": matrix["app_scale"],
        "content_profile": matrix["content_profile"],
        "input_profile": matrix["input_profile"],
        "lifecycle_profile": matrix["lifecycle_profile"],
        "blockers": blockers,
        "manifest_sha256": reservation["source"]["manifest_sha256"],
        "fixture_sha256": fixture["sha256"],
        "binary_sha256": reservation["source"]["binary_sha256"],
        "build_key_sha256": reservation["source"]["build_key_sha256"],
        "attestation_schema_version": attestation.get("schema_version") if isinstance(attestation, dict) else None,
    }
    provenance = {
        "schema_version": CAPTURE_PROVENANCE_VERSION,
        "captured_at": now_iso(),
        "capture_source": capture_source,
        "provenance_state": capture_source,
        "run_id": reservation["run"]["run_id"],
        "revision": reservation["run"]["revision"],
        "ordinal": reservation["run"]["ordinal"],
        "cell_id": matrix["cell_id"],
        "manifest_sha256": reservation["source"]["manifest_sha256"],
        "fixture_sha256": fixture["sha256"],
        "binary_sha256": reservation["source"]["binary_sha256"],
        "build_key_sha256": reservation["source"]["build_key_sha256"],
        "declared_artifacts": reservation["artifacts"],
        "attestation": attestation,
        "attestation_verification": "unimplemented" if isinstance(attestation, dict) else "absent",
    }
    payload = {
        "schema_version": CAPTURE_METADATA_VERSION,
        "metadata": metadata,
        "platform_probe": platform_probe,
        "provenance": provenance,
        "blockers": blockers,
    }
    _write_capture_stage_files(run_root, payload)
    if isinstance(attestation, dict):
        write_json(run_root / "capture" / "attestation.json", attestation)
    return payload


def hash_artifacts(run_root: Path) -> dict[str, Any]:
    reservation = _load_reservation(run_root)
    capture_metadata_path = run_root / "capture" / "metadata.json"
    platform_probe_path = run_root / "capture" / "platform-probe.json"
    provenance_path = run_root / "capture" / "provenance.json"
    ensure_regular_file(capture_metadata_path, "MISSING_CAPTURE", "capture metadata")
    ensure_regular_file(platform_probe_path, "MISSING_CAPTURE", "platform probe")
    ensure_regular_file(provenance_path, "MISSING_CAPTURE", "capture provenance")
    capture_metadata_doc = read_json(capture_metadata_path)
    platform_probe_doc = read_json(platform_probe_path)
    provenance_doc = read_json(provenance_path)
    if capture_metadata_doc.get("schema_version") != CAPTURE_METADATA_VERSION:
        raise RunnerError("CAPTURE_SCHEMA", "capture metadata schema mismatch")
    if platform_probe_doc.get("schema_version") != CAPABILITY_PROBE_VERSION:
        raise RunnerError("CAPTURE_SCHEMA", "platform probe schema mismatch")
    if provenance_doc.get("schema_version") != CAPTURE_PROVENANCE_VERSION:
        raise RunnerError("CAPTURE_SCHEMA", "capture provenance schema mismatch")
    manifest = load_manifest(run_root / "manifest.snapshot.json", verify_fixture_bytes=True)
    cell = manifest_cell(manifest, reservation["matrix"]["cell_id"])
    artifacts: list[dict[str, Any]] = []
    blocked_reasons: list[str] = []
    capture_source = provenance_doc.get("capture_source")
    for artifact_spec in cell["artifacts"]:
        relative_path = artifact_spec["relative_path"]
        artifact_path = safe_join(run_root, relative_path)
        artifact_record = {
            "artifact_id": artifact_spec["artifact_id"],
            "kind": artifact_spec["kind"],
            "relative_path": relative_path,
            "required": artifact_spec["required"],
            "synthetic_allowed": artifact_spec["synthetic_allowed"],
            "present": False,
            "size_bytes": 0,
            "sha256": None,
            "blocked_reason": None,
        }
        if capture_source != "runtime_capture":
            artifact_record["blocked_reason"] = f"capture_source:{capture_source}"
            blocked_reasons.append(artifact_record["blocked_reason"])
        elif not artifact_path.exists():
            artifact_record["blocked_reason"] = "missing_artifact"
            blocked_reasons.append(f"missing:{relative_path}")
        elif artifact_path.is_symlink() or not artifact_path.is_file():
            raise RunnerError("PATH_ESCAPE", f"artifact must be a regular file inside the run root: {relative_path}")
        else:
            artifact_record["present"] = True
            artifact_record["size_bytes"] = artifact_path.stat().st_size
            if artifact_record["size_bytes"] <= 0:
                artifact_record["blocked_reason"] = "empty_artifact"
                blocked_reasons.append(f"empty:{relative_path}")
            else:
                artifact_record["sha256"] = sha256_file(artifact_path)
        artifacts.append(artifact_record)
    index = {
        "schema_version": ARTIFACT_INDEX_VERSION,
        "hashed_at": now_iso(),
        "state": "hashed" if not blocked_reasons else "blocked",
        "capture_source": capture_source,
        "artifact_count": len(artifacts),
        "real_artifact_count": sum(
            1
            for item in artifacts
            if item["kind"] not in {"metadata", "probe", "provenance"}
            and item["present"]
            and item["sha256"]
        ),
        "blocked_reasons": sorted(set(blocked_reasons)),
        "artifacts": artifacts,
    }
    write_json(run_root / "artifacts.json", index)
    return index


def _record_hash_ignoring_seal(record: dict[str, Any]) -> str:
    cloned = copy.deepcopy(record)
    seal = cloned.get("seal")
    if isinstance(seal, dict):
        seal = dict(seal)
        seal.pop("record_sha256", None)
        cloned["seal"] = seal
    return sha256_bytes(canonical_json_bytes(cloned))


def _real_artifact_present(artifacts: list[dict[str, Any]]) -> bool:
    for artifact in artifacts:
        if artifact.get("kind") in {"metadata", "probe", "provenance"}:
            continue
        if artifact.get("present") and artifact.get("sha256"):
            return True
    return False


def seal_run(run_root: Path) -> dict[str, Any]:
    reservation = _load_reservation(run_root)
    capture_metadata_path = run_root / "capture" / "metadata.json"
    platform_probe_path = run_root / "capture" / "platform-probe.json"
    provenance_path = run_root / "capture" / "provenance.json"
    artifacts_path = run_root / "artifacts.json"
    ensure_regular_file(capture_metadata_path, "MISSING_CAPTURE", "capture metadata")
    ensure_regular_file(platform_probe_path, "MISSING_CAPTURE", "platform probe")
    ensure_regular_file(provenance_path, "MISSING_CAPTURE", "capture provenance")
    ensure_regular_file(artifacts_path, "MISSING_ARTIFACT_INDEX", "artifact index")
    capture_metadata_doc = read_json(capture_metadata_path)
    platform_probe_doc = read_json(platform_probe_path)
    provenance_doc = read_json(provenance_path)
    artifact_index = read_json(artifacts_path)
    if artifact_index.get("schema_version") != ARTIFACT_INDEX_VERSION:
        raise RunnerError("ARTIFACT_INDEX_SCHEMA", "artifact index schema mismatch")
    capture_source = provenance_doc.get("capture_source")
    execution_status = capture_metadata_doc.get("execution_status", "BLOCKED")
    blockers = list(capture_metadata_doc.get("blockers", [])) + list(artifact_index.get("blocked_reasons", []))
    target_platform = reservation["matrix"]["platform"]
    target_status = platform_probe_doc.get("platforms", {}).get(target_platform, {"status": "blocked", "reason": "unknown"})
    if target_status.get("status") != "supported":
        blockers.append(f"platform:{target_platform}:{target_status.get('reason', 'blocked')}")
    if provenance_doc.get("provenance_state") != "runtime_capture" or capture_source != "runtime_capture":
        blockers.append(f"capture_source:{capture_source}")
    if not _real_artifact_present(artifact_index.get("artifacts", [])):
        blockers.append("real_artifacts_missing")
    if blockers:
        outcome = "BLOCKED"
    elif execution_status not in SUPPORTED_EXECUTION_STATUSES:
        raise RunnerError("EXECUTION_STATUS_INVALID", f"unsupported execution status {execution_status!r}")
    else:
        outcome = execution_status
    stage_files = {
        "reservation.json": sha256_file(run_root / "reservation.json"),
        "manifest.snapshot.json": sha256_file(run_root / "manifest.snapshot.json"),
        "capture/metadata.json": sha256_file(capture_metadata_path),
        "capture/platform-probe.json": sha256_file(platform_probe_path),
        "capture/provenance.json": sha256_file(provenance_path),
        "artifacts.json": sha256_file(artifacts_path),
    }
    attestation_path = run_root / "capture" / "attestation.json"
    if attestation_path.exists():
        ensure_regular_file(attestation_path, "PATH_ESCAPE", "capture attestation")
        stage_files["capture/attestation.json"] = sha256_file(attestation_path)
    record = {
        "schema_version": EVIDENCE_VERSION,
        "state": "sealed",
        "outcome": outcome,
        "reservation": reservation,
        "capture": {
            "metadata": capture_metadata_doc,
            "platform_probe": platform_probe_doc,
            "provenance": provenance_doc,
        },
        "artifacts": artifact_index,
        "seal": {
            "sealed_at": now_iso(),
            "state_transition": "reserved->captured->hashed->sealed",
            "stage_files": stage_files,
        },
    }
    record["seal"]["record_sha256"] = _record_hash_ignoring_seal(record)
    if (run_root / "evidence.json").exists():
        raise RunnerError("RUN_ALREADY_SEALED", f"sealed evidence already exists at {run_root}")
    write_json(run_root / "evidence.json", record)
    return record


def _run_signature(record: dict[str, Any]) -> tuple[Any, ...]:
    reservation = record.get("reservation", {})
    matrix = reservation.get("matrix", {})
    return (
        reservation.get("run", {}).get("revision"),
        matrix.get("cell_id"),
        matrix.get("case_id"),
        matrix.get("platform"),
        matrix.get("device"),
        matrix.get("theme"),
        matrix.get("viewport"),
        matrix.get("system_scale"),
        matrix.get("app_scale"),
        matrix.get("content_profile"),
        matrix.get("input_profile"),
        matrix.get("lifecycle_profile"),
        reservation.get("run", {}).get("ordinal"),
    )


def _find_artifact(record_artifacts: list[dict[str, Any]], artifact_id: str, relative_path: str) -> dict[str, Any] | None:
    for artifact in record_artifacts:
        if artifact.get("artifact_id") == artifact_id and artifact.get("relative_path") == relative_path:
            return artifact
    return None


def validate_record(record: dict[str, Any], manifest: dict[str, Any], run_root: Path, evidence_root: Path) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    if not isinstance(record, dict):
        errors.append(error("EVIDENCE_SCHEMA", "evidence must be a JSON object"))
        return {"schema_version": "tessera/makepad-validation/v1", "evidence_valid": False, "errors": errors, "warnings": []}
    if record.get("schema_version") != EVIDENCE_VERSION:
        errors.append(error("EVIDENCE_SCHEMA", f"evidence schema_version must be {EVIDENCE_VERSION!r}"))
    if record.get("state") != "sealed":
        errors.append(error("EVIDENCE_STATE", "evidence must be sealed before validation"))

    seal = record.get("seal")
    if not isinstance(seal, dict) or not isinstance(seal.get("record_sha256"), str):
        errors.append(error("EVIDENCE_HASH_MISSING", "sealed evidence must include a record hash"))
    else:
        expected_hash = seal["record_sha256"]
        if _record_hash_ignoring_seal(record) != expected_hash:
            errors.append(error("EVIDENCE_HASH_MISMATCH", "sealed record hash does not match the canonical payload"))
        stage_files = seal.get("stage_files")
        if not isinstance(stage_files, dict):
            errors.append(error("STAGE_HASH_MISSING", "sealed evidence must include stage file hashes"))
        else:
            for relative_path, expected_stage_hash in stage_files.items():
                try:
                    stage_path = safe_join(run_root, relative_path, "PATH_ESCAPE")
                except RunnerError as exc:
                    errors.append(error(exc.code, exc.message))
                    continue
                if not isinstance(expected_stage_hash, str) or not HEX64_RE.fullmatch(expected_stage_hash):
                    errors.append(error("STAGE_HASH_INVALID", f"invalid stage hash for {relative_path!r}"))
                    continue
                if not stage_path.exists():
                    errors.append(error("STAGE_MISSING", f"sealed stage file is missing: {relative_path!r}"))
                    continue
                if stage_path.is_symlink() or not stage_path.is_file():
                    errors.append(error("PATH_ESCAPE", f"sealed stage file is not regular: {relative_path!r}"))
                    continue
                if sha256_file(stage_path) != expected_stage_hash:
                    errors.append(error("STAGE_HASH_MISMATCH", f"sealed stage file was modified: {relative_path!r}"))

    reservation = record.get("reservation")
    if not isinstance(reservation, dict):
        errors.append(error("RESERVATION_SCHEMA", "sealed evidence must include reservation data"))
        reservation = {}
    capture = record.get("capture")
    if not isinstance(capture, dict):
        errors.append(error("CAPTURE_SCHEMA", "sealed evidence must include capture data"))
        capture = {}
    artifact_index = record.get("artifacts")
    if not isinstance(artifact_index, dict):
        errors.append(error("ARTIFACT_INDEX_SCHEMA", "sealed evidence must include artifact index"))
        artifact_index = {}

    run_info = object_or_empty(reservation.get("run", {}))
    matrix = object_or_empty(reservation.get("matrix", {}))
    source = object_or_empty(reservation.get("source", {}))
    fixture = object_or_empty(reservation.get("fixture", {}))
    platform_probe = object_or_empty(capture.get("platform_probe", {}))
    provenance = object_or_empty(capture.get("provenance", {}))
    capture_metadata_doc = object_or_empty(capture.get("metadata", {}))

    try:
        validate_revision(str(run_info.get("revision", "")))
    except RunnerError as exc:
        errors.append(error(exc.code, exc.message))
    try:
        validate_run_id(str(run_info.get("run_id", "")))
    except RunnerError as exc:
        errors.append(error(exc.code, exc.message))
    try:
        validate_run_revision_binding(str(run_info.get("run_id", "")), str(run_info.get("revision", "")))
    except RunnerError as exc:
        errors.append(error(exc.code, exc.message))

    expected_run_root = evidence_root / str(run_info.get("revision", "")) / str(run_info.get("run_id", ""))
    if run_root.resolve() != expected_run_root.resolve():
        errors.append(error("PATH_ESCAPE", "evidence path does not match revision/run-id managed layout"))
    if evidence_root.resolve() not in run_root.resolve().parents and run_root.resolve() != evidence_root.resolve():
        errors.append(error("PATH_ESCAPE", "evidence path is not inside the managed evidence root"))

    manifest_cell_id = matrix.get("cell_id")
    cell: dict[str, Any] = {}
    if not isinstance(manifest_cell_id, str):
        errors.append(error("MATRIX_SCHEMA", "missing cell id"))
    else:
        try:
            cell = manifest_cell(manifest, manifest_cell_id)
        except RunnerError as exc:
            errors.append(error(exc.code, exc.message))
            cell = {}
    for field in (
        "case_id",
        "fixture_id",
        "platform",
        "device",
        "theme",
        "viewport",
        "system_scale",
        "app_scale",
        "content_profile",
        "input_profile",
        "lifecycle_profile",
    ):
        if cell and matrix.get(field) != cell.get(field):
            errors.append(error("MATRIX_BINDING_MISMATCH", f"matrix field {field!r} does not match the manifest cell"))
    if cell and matrix.get("requires") != cell.get("requires"):
        errors.append(error("MATRIX_BINDING_MISMATCH", "matrix requirements do not match the manifest cell"))
    if not isinstance(manifest.get("manifest_sha256"), str):
        errors.append(error("MANIFEST_SCHEMA", "manifest hash missing"))
    else:
        snapshot_path = run_root / "manifest.snapshot.json"
        if not snapshot_path.exists():
            errors.append(error("MANIFEST_MISSING", "sealed evidence is missing its manifest snapshot"))
        elif sha256_file(snapshot_path) != manifest["manifest_sha256"]:
            errors.append(error("MANIFEST_HASH_MISMATCH", "manifest snapshot hash does not match the recorded manifest hash"))
    if fixture and isinstance(fixture, dict):
        fixture_sha = fixture.get("sha256")
        if isinstance(fixture_sha, str):
            try:
                validate_hex(fixture_sha, "HASH_INVALID", "fixture hash")
            except RunnerError as exc:
                errors.append(error(exc.code, exc.message))
            if fixture_sha != source.get("fixture_sha256"):
                errors.append(error("FIXTURE_BINDING_MISMATCH", "fixture hash does not match the reservation binding"))
            fixture_relative_path = fixture.get("relative_path")
            if isinstance(fixture_relative_path, str):
                try:
                    copied_fixture = safe_join(run_root, fixture_relative_path)
                    if not copied_fixture.exists():
                        errors.append(error("MISSING_FIXTURE", f"copied fixture is missing: {fixture_relative_path!r}"))
                    elif copied_fixture.is_symlink() or not copied_fixture.is_file():
                        errors.append(error("PATH_ESCAPE", f"copied fixture is not a regular file: {fixture_relative_path!r}"))
                    elif sha256_file(copied_fixture) != fixture_sha:
                        errors.append(error("FIXTURE_HASH_MISMATCH", f"copied fixture hash mismatch: {fixture_relative_path!r}"))
                except RunnerError as exc:
                    errors.append(error(exc.code, exc.message))
    if source and isinstance(source, dict):
        for label in ("binary_sha256", "build_key_sha256", "manifest_sha256", "fixture_sha256"):
            try:
                validate_hex(str(source.get(label, "")), "HASH_INVALID", label.replace("_", " "))
            except RunnerError as exc:
                errors.append(error(exc.code, exc.message))

    if provenance:
        if provenance.get("capture_source") != "runtime_capture" or provenance.get("provenance_state") != "runtime_capture":
            errors.append(error("SYNTHETIC_EVIDENCE", "capture provenance is not a real runtime capture"))
        if provenance.get("attestation_verification") != "verified":
            errors.append(error("CAPTURE_ATTESTATION_UNVERIFIED", "runtime capture has no verified attestation"))
        if provenance.get("manifest_sha256") != source.get("manifest_sha256"):
            errors.append(error("MANIFEST_HASH_MISMATCH", "capture provenance manifest binding does not match reservation"))
        if provenance.get("binary_sha256") != source.get("binary_sha256"):
            errors.append(error("BINARY_HASH_MISMATCH", "capture provenance binary binding does not match reservation"))
        if provenance.get("build_key_sha256") != source.get("build_key_sha256"):
            errors.append(error("BUILD_KEY_HASH_MISMATCH", "capture provenance build key binding does not match reservation"))
        if provenance.get("fixture_sha256") != source.get("fixture_sha256"):
            errors.append(error("FIXTURE_BINDING_MISMATCH", "capture provenance fixture binding does not match reservation"))
        if provenance.get("run_id") != run_info.get("run_id"):
            errors.append(error("RUN_BINDING_MISMATCH", "capture provenance run id does not match reservation"))
        if provenance.get("revision") != run_info.get("revision"):
            errors.append(error("REVISION_BINDING_MISMATCH", "capture provenance revision does not match reservation"))
        if provenance.get("cell_id") != matrix.get("cell_id"):
            errors.append(error("MATRIX_BINDING_MISMATCH", "capture provenance cell id does not match reservation"))
        if provenance.get("ordinal") != run_info.get("ordinal"):
            errors.append(error("ORDINAL_BINDING_MISMATCH", "capture provenance ordinal does not match reservation"))
        declared_artifacts = provenance.get("declared_artifacts")
        if not isinstance(declared_artifacts, list) or len(declared_artifacts) != len(cell.get("artifacts", [])):
            errors.append(error("ARTIFACT_DECLARATION_MISMATCH", "declared artifacts do not match the manifest"))
    else:
        errors.append(error("PROVENANCE_SCHEMA", "capture provenance is missing or malformed"))

    if capture_metadata_doc:
        if capture_metadata_doc.get("capture_source") != provenance.get("capture_source"):
            errors.append(error("CAPTURE_SOURCE_MISMATCH", "capture metadata does not match provenance"))
        if capture_metadata_doc.get("execution_status") not in SUPPORTED_EXECUTION_STATUSES:
            errors.append(error("EXECUTION_STATUS_INVALID", "capture execution status is invalid"))
        if capture_metadata_doc.get("manifest_sha256") != source.get("manifest_sha256"):
            errors.append(error("MANIFEST_HASH_MISMATCH", "capture metadata manifest binding does not match reservation"))
        if capture_metadata_doc.get("fixture_sha256") != source.get("fixture_sha256"):
            errors.append(error("FIXTURE_BINDING_MISMATCH", "capture metadata fixture binding does not match reservation"))
        if capture_metadata_doc.get("binary_sha256") != source.get("binary_sha256"):
            errors.append(error("BINARY_HASH_MISMATCH", "capture metadata binary binding does not match reservation"))
        if capture_metadata_doc.get("build_key_sha256") != source.get("build_key_sha256"):
            errors.append(error("BUILD_KEY_HASH_MISMATCH", "capture metadata build key binding does not match reservation"))
        if capture_metadata_doc.get("run_id") != run_info.get("run_id"):
            errors.append(error("RUN_BINDING_MISMATCH", "capture metadata run id does not match reservation"))
        if capture_metadata_doc.get("revision") != run_info.get("revision"):
            errors.append(error("REVISION_BINDING_MISMATCH", "capture metadata revision does not match reservation"))
        if capture_metadata_doc.get("cell_id") != matrix.get("cell_id"):
            errors.append(error("MATRIX_BINDING_MISMATCH", "capture metadata cell id does not match reservation"))

    target_platform = matrix.get("platform")
    if platform_probe:
        target_status = platform_probe.get("platforms", {}).get(target_platform, {"status": "blocked", "reason": "missing"})
        if target_status.get("status") != "supported":
            errors.append(error("PLATFORM_BLOCKED", f"target platform {target_platform!r} is not supported: {target_status.get('reason', 'blocked')}"))
    else:
        errors.append(error("PROBE_SCHEMA", "platform probe is missing or malformed"))

    artifact_entries = artifact_index.get("artifacts", [])
    if not isinstance(artifact_entries, list):
        errors.append(error("ARTIFACT_INDEX_SCHEMA", "artifact index is malformed"))
        artifact_entries = []
    artifact_keys: list[tuple[str, str]] = []
    for item in artifact_entries:
        if not isinstance(item, dict):
            errors.append(error("ARTIFACT_INDEX_SCHEMA", "artifact index entries must be objects"))
            continue
        artifact_id = item.get("artifact_id")
        relative_path = item.get("relative_path")
        if not isinstance(artifact_id, str) or not isinstance(relative_path, str):
            errors.append(error("ARTIFACT_INDEX_SCHEMA", "artifact index entries need string artifact_id and relative_path"))
            continue
        artifact_keys.append((artifact_id, relative_path))
    if len(artifact_keys) != len(set(artifact_keys)):
        errors.append(error("DUPLICATE_ARTIFACT", "artifact index contains duplicate artifact identities"))
    expected_artifact_keys = {(item.get("artifact_id"), item.get("relative_path")) for item in cell.get("artifacts", []) if isinstance(item, dict)}
    if set(artifact_keys) != expected_artifact_keys:
        errors.append(error("ARTIFACT_SET_MISMATCH", "artifact index does not exactly match the selected manifest cell"))
    if not _real_artifact_present(artifact_entries):
        errors.append(error("REAL_ARTIFACT_MISSING", "no real runtime artifact was captured"))

    required_real_paths = {artifact["relative_path"] for artifact in cell.get("artifacts", []) if artifact["kind"] not in {"metadata", "probe", "provenance"}}
    for artifact_spec in cell.get("artifacts", []):
        if not isinstance(artifact_spec, dict):
            continue
        artifact_id = artifact_spec["artifact_id"]
        relative_path = artifact_spec["relative_path"]
        try:
            artifact_path = safe_join(run_root, relative_path)
        except RunnerError as exc:
            errors.append(error(exc.code, exc.message))
            continue
        artifact_record = _find_artifact(artifact_entries, artifact_id, relative_path)
        if artifact_record is None:
            errors.append(error("ARTIFACT_INDEX_MISSING", f"artifact index does not include {artifact_id!r} at {relative_path!r}"))
            continue
        if not artifact_path.exists():
            errors.append(error("MISSING_ARTIFACT", f"missing artifact {relative_path!r}"))
            continue
        if artifact_path.is_symlink() or not artifact_path.is_file():
            errors.append(error("PATH_ESCAPE", f"artifact must be a regular file: {relative_path!r}"))
            continue
        size_bytes = artifact_path.stat().st_size
        if size_bytes <= 0:
            errors.append(error("EMPTY_ARTIFACT", f"artifact is empty: {relative_path!r}"))
            continue
        actual_hash = sha256_file(artifact_path)
        if artifact_record.get("sha256") != actual_hash:
            errors.append(error("HASH_MISMATCH", f"artifact hash mismatch for {relative_path!r}"))
        for field in ("kind", "required", "synthetic_allowed"):
            if artifact_record.get(field) != artifact_spec.get(field):
                errors.append(error("ARTIFACT_BINDING_MISMATCH", f"artifact field {field!r} does not match the manifest"))
        if artifact_spec.get("binding") == "binary" and actual_hash != source.get("binary_sha256"):
            errors.append(error("BINARY_HASH_MISMATCH", f"binary artifact hash does not match reservation for {relative_path!r}"))
        if artifact_spec["kind"] not in {"metadata", "probe", "provenance"} and provenance.get("capture_source") != "runtime_capture":
            errors.append(error("SYNTHETIC_EVIDENCE", f"real artifact {artifact_id!r} was not captured from runtime"))

    if provenance.get("capture_source") == "runtime_capture" and len(required_real_paths) == 0:
        errors.append(error("MANIFEST_SCHEMA", "manifest must define at least one real artifact"))

    record_outcome = record.get("outcome")
    if record_outcome not in SUPPORTED_EXECUTION_STATUSES:
        errors.append(error("OUTCOME_INVALID", "record outcome is invalid"))
    elif record_outcome != "PASS":
        errors.append(error("OUTCOME_BLOCKED", f"sealed evidence outcome is {record_outcome!r}, not PASS"))

    signature = _run_signature(record)
    if signature[-1] is None:
        errors.append(error("ORDINAL_INVALID", "ordinal is missing"))

    duplicate_root = evidence_root / str(run_info.get("revision", ""))
    if duplicate_root.exists():
        for candidate in duplicate_root.rglob("evidence.json"):
            if candidate.resolve() == (run_root / "evidence.json").resolve():
                continue
            try:
                other = read_json(candidate)
            except Exception:
                continue
            if not isinstance(other, dict) or other.get("state") != "sealed":
                continue
            if _run_signature(other) == signature:
                errors.append(error("DUPLICATE_ORDINAL", f"another sealed evidence record already exists for the same matrix signature: {candidate}"))
                break

    evidence_valid = len(errors) == 0
    return {
        "schema_version": "tessera/makepad-validation/v1",
        "evidence_valid": evidence_valid,
        "record_outcome": record_outcome,
        "errors": errors,
        "warnings": [],
    }


def validate_evidence_file(evidence_path: Path, manifest_path: Path | None, evidence_root: Path) -> dict[str, Any]:
    ensure_regular_file(evidence_path, "MISSING_EVIDENCE", "evidence")
    run_root = evidence_path.parent
    snapshot_path = run_root / "manifest.snapshot.json"
    if manifest_path is None:
        manifest_path = snapshot_path
    manifest = load_manifest(manifest_path, verify_fixture_bytes=True)
    record = read_json(evidence_path)
    return validate_record(record, manifest, run_root, evidence_root)


def _print_result(value: dict[str, Any]) -> None:
    print(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")))


def main_reserve(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Reserve a managed Makepad evidence run.")
    parser.add_argument("revision")
    parser.add_argument("run_id")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--cell-id", required=True)
    parser.add_argument("--binary-sha256", required=True)
    parser.add_argument("--build-key-sha256", required=True)
    parser.add_argument("--ordinal", type=int, default=0)
    args = parser.parse_args(argv)
    try:
        reservation = reserve_run(
            revision=args.revision,
            run_id=args.run_id,
            manifest_path=Path(args.manifest),
            evidence_root=Path(args.evidence_root),
            cell_id=args.cell_id,
            binary_sha256=args.binary_sha256,
            build_key_sha256=args.build_key_sha256,
            ordinal=args.ordinal,
        )
    except RunnerError as exc:
        print(f"{exc.code}: {exc.message}", file=sys.stderr)
        return 1
    _print_result({"reserved": True, "run_root": reservation["run"]["root"], "cell_id": reservation["matrix"]["cell_id"]})
    return 0


def main_capture(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Capture Makepad metadata and provenance.")
    parser.add_argument("run_root")
    parser.add_argument("--capture-source", choices=sorted(SUPPORTED_CAPTURE_SOURCES), default="state_only")
    parser.add_argument("--execution-status", choices=sorted(SUPPORTED_EXECUTION_STATUSES), default="BLOCKED")
    parser.add_argument("--attestation")
    args = parser.parse_args(argv)
    try:
        attestation = read_json(Path(args.attestation)) if args.attestation else None
        result = capture_metadata(
            Path(args.run_root),
            capture_source=args.capture_source,
            execution_status=args.execution_status,
            attestation=attestation,
        )
    except RunnerError as exc:
        print(f"{exc.code}: {exc.message}", file=sys.stderr)
        return 1
    _print_result({"captured": True, "capture_source": result["provenance"]["capture_source"], "blockers": result["blockers"]})
    return 0


def main_hash(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Hash declared Makepad evidence artifacts.")
    parser.add_argument("run_root")
    args = parser.parse_args(argv)
    try:
        result = hash_artifacts(Path(args.run_root))
    except RunnerError as exc:
        print(f"{exc.code}: {exc.message}", file=sys.stderr)
        return 1
    _print_result({"hashed": True, "real_artifact_count": result["real_artifact_count"], "blocked_reasons": result["blocked_reasons"]})
    return 0


def main_seal(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Seal a Makepad evidence run.")
    parser.add_argument("run_root")
    args = parser.parse_args(argv)
    try:
        result = seal_run(Path(args.run_root))
    except RunnerError as exc:
        print(f"{exc.code}: {exc.message}", file=sys.stderr)
        return 1
    _print_result({"sealed": True, "outcome": result["outcome"], "record_sha256": result["seal"]["record_sha256"]})
    return 0


def main_validate(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Validate a sealed Makepad evidence bundle.")
    parser.add_argument("evidence")
    parser.add_argument("--manifest")
    parser.add_argument("--evidence-root", default=str(DEFAULT_EVIDENCE_ROOT))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = validate_evidence_file(Path(args.evidence), Path(args.manifest) if args.manifest else None, Path(args.evidence_root))
    except RunnerError as exc:
        print(f"{exc.code}: {exc.message}", file=sys.stderr)
        return 1
    if args.write:
        write_json(Path(args.evidence).parent / "validation.json", result)
    print(f"evidence_valid={str(result['evidence_valid']).lower()}")
    for entry in result["errors"]:
        print(f"{entry['code']}: {entry['message']}", file=sys.stderr)
    return 0 if result["evidence_valid"] else 1


def main_probe(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Probe host capabilities relevant to Makepad evidence.")
    parser.parse_args(argv)
    _print_result(probe_platform_capabilities())
    return 0
