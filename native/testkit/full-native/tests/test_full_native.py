from __future__ import annotations

import hashlib
import json
import importlib.util
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "lib"
sys.path.insert(0, str(LIB))

from full_native_contract import (  # noqa: E402
    component_paths,
    generate_scene_manifest,
    load_frozen_registry,
    validate_ax_and_keyboard,
    validate_coverage,
    validate_geometry,
    validate_scene_manifest,
)

RUNNER_SPEC = importlib.util.spec_from_file_location("run_scenes", ROOT / "bin/run-scenes.py")
assert RUNNER_SPEC and RUNNER_SPEC.loader
RUNNER = importlib.util.module_from_spec(RUNNER_SPEC)
RUNNER_SPEC.loader.exec_module(RUNNER)


class FullNativeContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(tempfile.mkdtemp(prefix="tessera-full-native-test-"))
        self.repo = self.temp / "repo"
        (self.repo / "native/crates/tessera-core/src").mkdir(parents=True)
        (self.repo / "native/crates/tessera-gallery/src/examples").mkdir(parents=True)
        (self.repo / "native/crates/tessera-iced/src/components").mkdir(parents=True)
        self.catalog = self.repo / "native/crates/tessera-core/src/catalog.rs"
        self.frozen = self.temp / "frozen.json"
        self.write_catalog()
        self.frozen.write_text(json.dumps({
            "schema_version": "tessera.full-native.registry/v1",
            "component_count": 1,
            "category_counts": {"Base": 1},
            "components": [{"id": "button", "name": "Button", "category": "Base", "group": "General"}],
        }), encoding="utf-8")

    def tearDown(self) -> None:
        shutil.rmtree(self.temp)

    def write_catalog(self, duplicate: bool = False) -> None:
        tuples = '(Button, "button", "Button", Base, General, "button")'
        if duplicate:
            tuples += ', (ButtonAgain, "button", "Button", Base, General, "duplicate")'
        self.catalog.write_text(
            "pub const COMPONENT_COUNT: usize = 1;\n"
            f"component_registry!({tuples});\n",
            encoding="utf-8",
        )

    def write_good_sources(self) -> None:
        module = self.repo / "native/crates/tessera-iced/src/components/general/button.rs"
        example = self.repo / "native/crates/tessera-gallery/src/examples/general/button/mod.rs"
        integration = example.parent / "integration.rs"
        module.parent.mkdir(parents=True)
        example.parent.mkdir(parents=True)
        module.write_text("use iced::Element; pub fn view<'a, M: 'a>() -> Element<'a, M> { todo!() }\n", encoding="utf-8")
        example.write_text("mod integration; pub const CODE: &str = include_str!(\"integration.rs\"); use tessera_iced::components::general::button; use iced::Element; pub fn view<'a, M: 'a>() -> Element<'a, M> { integration::view(); todo!() }\n", encoding="utf-8")
        integration.write_text("use tessera_iced::components::general::button; pub fn view() { let _ = button::view::<()>; }\n", encoding="utf-8")
        dispatcher = self.repo / "native/crates/tessera-gallery/src/examples/dispatch.rs"
        dispatcher.write_text("example_registry!((Button, Button, general::button),);\n", encoding="utf-8")
        detail = self.repo / "native/crates/tessera-gallery/src/component_detail/mod.rs"
        detail.parent.mkdir(parents=True)
        detail.write_text("struct DetailRoute { state: DetailState, }\n#[test] fn every_catalog_id_constructs_a_typed_detail_route() { for spec in COMPONENTS { let _ = DetailRoute::new(spec.id); } }\n", encoding="utf-8")
        main = self.repo / "native/crates/tessera-gallery/src/main.rs"
        main.write_text("fn update() { Message::OpenComponent(id); let route = component_detail::DetailRoute::new(id); app.component_detail = Some(route); }\n", encoding="utf-8")

    def test_minimal_fixed_directory_and_typed_dispatch_pass(self) -> None:
        self.write_good_sources()
        result = validate_coverage(self.repo, self.frozen)
        self.assertEqual(result["verdict"], "pass", result["errors"])
        self.assertFalse((self.repo / "native/crates/tessera-gallery/src/route.rs").exists())

    def test_missing_component_module_is_blocking(self) -> None:
        self.write_good_sources()
        (self.repo / "native/crates/tessera-iced/src/components/general/button.rs").unlink()
        result = validate_coverage(self.repo, self.frozen)
        self.assertIn("COMPONENT_MODULE_MISSING", {error["code"] for error in result["errors"]})

    def test_duplicate_typed_catalog_id_is_blocking(self) -> None:
        self.write_catalog(duplicate=True)
        result = validate_coverage(self.repo, self.frozen)
        codes = {error["code"] for error in result["errors"]}
        self.assertTrue({"TYPED_CATALOG_MAPPING", "FROZEN_REGISTRY_DRIFT"} & codes)

    def test_fallback_source_is_blocking(self) -> None:
        self.write_good_sources()
        source = self.repo / "native/crates/tessera-gallery/src/main.rs"
        source.write_text(source.read_text(encoding="utf-8") + " fn fallback() { let _ = GenericFallback; }\n", encoding="utf-8")
        result = validate_coverage(self.repo, self.frozen)
        self.assertIn("FORBIDDEN_GENERIC_FALLBACK", {error["code"] for error in result["errors"]})

    def test_empty_integration_is_blocking(self) -> None:
        self.write_good_sources()
        integration = self.repo / "native/crates/tessera-gallery/src/examples/general/button/integration.rs"
        integration.write_text("// intentionally empty\n", encoding="utf-8")
        result = validate_coverage(self.repo, self.frozen)
        self.assertIn("INTEGRATION_EMPTY", {error["code"] for error in result["errors"]})

    def test_integration_not_compiled_and_rendered_by_its_example_is_blocking(self) -> None:
        self.write_good_sources()
        example = self.repo / "native/crates/tessera-gallery/src/examples/general/button/mod.rs"
        example.write_text("mod integration; pub fn view() {}\n", encoding="utf-8")
        result = validate_coverage(self.repo, self.frozen)
        self.assertIn("INTEGRATION_NOT_SAME_ORIGIN", {error["code"] for error in result["errors"]})

    def test_reducer_without_real_iced_renderer_is_blocking(self) -> None:
        self.write_good_sources()
        module = self.repo / "native/crates/tessera-iced/src/components/general/button.rs"
        module.write_text("pub fn reduce(state: bool) -> bool { !state }\n", encoding="utf-8")
        result = validate_coverage(self.repo, self.frozen)
        self.assertIn("COMPONENT_RENDERER_MISSING", {error["code"] for error in result["errors"]})

    def test_scene_manifest_has_frozen_counts_and_strict_suites(self) -> None:
        registry, errors = load_frozen_registry(ROOT / "frozen-registry-v1.json")
        self.assertFalse(errors)
        manifest = generate_scene_manifest(registry)
        self.assertEqual(manifest["counts"]["base_visual"], 404)
        self.assertEqual(manifest["counts"]["long_text"], 101)
        self.assertEqual(manifest["counts"]["keyboard_focus"], 101)
        self.assertEqual(manifest["counts"]["chart_capacity"], 15)
        self.assertEqual(manifest["counts"]["chart_cache"], 15)
        self.assertEqual(validate_scene_manifest(manifest, registry), [])
        keyboard = next(scene for scene in manifest["scenes"] if scene["suite"] == "keyboard_focus")
        self.assertIn("ax_tree", keyboard["required_artifacts"])
        self.assertIn("tab_enters_sidebar", keyboard["assertions"])

    def test_all_101_paths_are_unique_and_all_15_charts_use_f7_charts_group(self) -> None:
        registry, errors = load_frozen_registry(ROOT / "frozen-registry-v1.json")
        self.assertFalse(errors)
        paths = [component_paths(self.repo, entry) for entry in registry]
        self.assertEqual(len({module for module, _, _ in paths}), 101)
        self.assertEqual(len({example for _, example, _ in paths}), 101)
        charts = [(entry, paths[index]) for index, entry in enumerate(registry) if entry["category"] == "Charts"]
        self.assertEqual(len(charts), 15)
        for _entry, (module, example, integration) in charts:
            self.assertEqual(module.parent.name, "charts")
            self.assertEqual(example.parent.parent.name, "charts")
            self.assertEqual(integration.parent, example.parent)

    def test_out_of_bounds_geometry_is_blocking(self) -> None:
        geometry = {"viewport": {"x": 0, "y": 0, "width": 840, "height": 600}, "page_scroll_extent": {"x": 0, "y": 0, "width": 900, "height": 600}, "surfaces": [{"id": "effect", "outer_rect": {"x": 0, "y": 0, "width": 100, "height": 100}, "content_rect": {"x": 0, "y": 0, "width": 100, "height": 100}, "children": [{"id": "bad", "layout_rect": {"x": 99, "y": 0, "width": 10, "height": 10}, "hit_rect": {"x": 99, "y": 0, "width": 10, "height": 10}}]}]}
        codes = {error["code"] for error in validate_geometry(geometry)}
        self.assertEqual(codes, {"PAGE_HORIZONTAL_OVERFLOW", "GEOMETRY_CHILD_OUT_OF_BOUNDS", "GEOMETRY_HIT_RECT"})

    def test_ax_tree_without_internal_controls_and_real_tab_is_blocking(self) -> None:
        scene = {"suite": "keyboard_focus", "id": "FN-button-KEY"}
        evidence = {"capture_kind": "gui", "evidence_id": "EV-1", "revision": "deadbeef", "keyboard_trace": {"input_origin": "platform_injected", "tab_entered_sidebar": False, "enter_activated_catalog_tile": False, "focused_ax_id": "window", "ime": "blocked"}, "ax_snapshot": {"nodes": [{"id": "window", "role": "window", "visible": True}]}}
        codes = {error["code"] for error in validate_ax_and_keyboard(evidence, scene)}
        self.assertEqual(codes, {"KEYBOARD_NAVIGATION_UNREACHABLE", "AX_INTERNAL_CONTROLS_MISSING", "AX_SIDEBAR_MISSING", "AX_FOCUS_TARGET_MISSING", "IME_EVIDENCE_BLOCKED"})

    def test_cache_artifact_is_blocking(self) -> None:
        self.write_good_sources()
        (self.repo / "native/target").mkdir(parents=True)
        result = validate_coverage(self.repo, self.frozen)
        self.assertIn("CACHE_ARTIFACT_PRESENT", {error["code"] for error in result["errors"]})

    def test_missing_capture_evidence_is_blocking(self) -> None:
        scene_dir = self.temp / "missing-evidence"
        scene_dir.mkdir()
        errors = RUNNER.validate_capture({"id": "FN-button-L-1240", "suite": "base_visual", "required_artifacts": ["evidence"]}, scene_dir)
        self.assertIn("CAPTURE_RESULT_MISSING", {error["code"] for error in errors})

    def test_blocked_capture_without_evidence_returns_a_runner_blocker(self) -> None:
        scene_dir = self.temp / "blocked-capture"
        scene_dir.mkdir()
        scene = {"id": "FN-button-L-1240", "suite": "base_visual", "required_artifacts": ["evidence"]}
        (scene_dir / "capture-result.json").write_text(json.dumps({
            "schema_version": "tessera.full-native.capture/v2",
            "scenario_id": scene["id"],
            "status": "blocked",
            "blocker": {"code": "MACOS_CAPTURE_BLOCKED", "message": "release Gallery process group could not be isolated"},
        }), encoding="utf-8")
        errors = RUNNER.validate_capture(scene, scene_dir)
        self.assertEqual(errors, [{
            "code": "CAPTURE_HOOK_BLOCKED",
            "message": "capture hook explicitly blocked the requested scene",
            "hook_code": "MACOS_CAPTURE_BLOCKED",
            "hook_message": "release Gallery process group could not be isolated",
        }])

    def test_capture_assertions_need_observed_gui_facts(self) -> None:
        scene = {
            "id": "FN-button-L-1240",
            "suite": "base_visual",
            "assertions": ["focus_visible", "nonblank_pixels"],
        }
        evidence = {
            "capture_kind": "gui",
            "assertion_facts": [
                {"assertion": "focus_visible", "status": "blocked", "reason": "no platform input"},
                {"assertion": "nonblank_pixels", "status": "observed", "facts": {"pixels": 42}},
            ],
        }
        errors = RUNNER.validate_assertion_facts(evidence, scene)
        self.assertEqual({error["code"] for error in errors}, {"ASSERTION_NOT_OBSERVED"})

    def test_capture_v2_requires_provenance_request_and_artifact_hashes(self) -> None:
        scene_dir = self.temp / "v2-capture"
        scene_dir.mkdir()
        scene = {
            "id": "FN-button-L-1240",
            "component_id": "button",
            "theme": "light",
            "viewport": {"width": 1240, "height": 800},
            "suite": "base_visual",
            "assertions": [],
            "required_artifacts": [],
        }
        result = {
            "schema_version": "tessera.full-native.capture/v2",
            "scenario_id": scene["id"],
            "status": "captured",
            "request": {
                "scene_id": scene["id"],
                "component_id": scene["component_id"],
                "theme": scene["theme"],
                "viewport": scene["viewport"],
            },
            "provenance": {
                "source_revision": "a" * 40,
                "build_key": "authority/revision/profile/target",
                "scene_manifest_sha256": "b" * 64,
                "binary_sha256": "c" * 64,
            },
            "artifact_sha256": {},
            "evidence": {
                "evidence_id": "EV-button",
                "revision": "a" * 40,
                "capture_kind": "gui",
                "assertion_facts": [],
                "blocked_capabilities": ["AX", "IME"],
                "interaction_plan": {"status": "observed", "postcondition": "button activation changes the native action counter", "postcondition_observed": True},
                "keyboard_trace": {"input_origin": "platform_injected", "steps": [], "ime": "observed"},
                "ax_snapshot": {"status": "observed", "nodes": [], "focused_ax_id": None, "internal_controls": []},
            },
        }
        for name in RUNNER.REQUIRED_CAPTURE_ARTIFACTS:
            (scene_dir / name).write_bytes(b"artifact")
        result["artifact_sha256"] = {name: hashlib.sha256(b"artifact").hexdigest() for name in RUNNER.REQUIRED_CAPTURE_ARTIFACTS}
        (scene_dir / "capture-result.json").write_text(json.dumps(result), encoding="utf-8")
        self.assertEqual(RUNNER.validate_capture(scene, scene_dir, "b" * 64), [])
        result["request"]["component_id"] = "masonry"
        (scene_dir / "capture-result.json").write_text(json.dumps(result), encoding="utf-8")
        codes = {error["code"] for error in RUNNER.validate_capture(scene, scene_dir, "b" * 64)}
        self.assertIn("CAPTURE_REQUEST_IDENTITY", codes)

    def test_capture_v2_rejects_source_build_and_artifact_identity_mismatch(self) -> None:
        scene_dir = self.temp / "v2-identity"
        scene_dir.mkdir()
        scene = {
            "id": "FN-button-L-1240",
            "component_id": "button",
            "theme": "light",
            "viewport": {"width": 1240, "height": 800},
            "suite": "base_visual",
            "assertions": [],
            "required_artifacts": [],
        }
        result = {
            "schema_version": "tessera.full-native.capture/v2",
            "scenario_id": scene["id"],
            "status": "captured",
            "request": {"scene_id": scene["id"], "component_id": "button", "theme": "light", "viewport": scene["viewport"]},
            "provenance": {"source_revision": "a" * 40, "build_key": "build-a", "scene_manifest_sha256": "b" * 64, "binary_sha256": "c" * 64},
            "artifact_sha256": {"../outside.png": "d" * 64},
            "evidence": {"evidence_id": "EV-button", "revision": "a" * 40, "capture_kind": "gui", "assertion_facts": [], "blocked_capabilities": [], "interaction_plan": {"status": "observed", "postcondition": "button activation changes the native action counter", "postcondition_observed": True}, "keyboard_trace": {"input_origin": "platform_injected", "steps": [], "ime": "observed"}, "ax_snapshot": {"status": "observed", "nodes": [], "focused_ax_id": None, "internal_controls": []}},
        }
        for name in RUNNER.REQUIRED_CAPTURE_ARTIFACTS:
            (scene_dir / name).write_bytes(b"artifact")
            result["artifact_sha256"][name] = hashlib.sha256(b"artifact").hexdigest()
        (scene_dir / "capture-result.json").write_text(json.dumps(result), encoding="utf-8")
        codes = {error["code"] for error in RUNNER.validate_capture(scene, scene_dir, "b" * 64, "expected-source", "expected-build")}
        self.assertEqual(codes, {"CAPTURE_SOURCE_IDENTITY", "CAPTURE_BUILD_IDENTITY", "CAPTURE_ARTIFACT_HASH_INVALID"})

    def test_capture_v2_rejects_evidence_revision_drift(self) -> None:
        scene_dir = self.temp / "v2-evidence-revision"
        scene_dir.mkdir()
        scene = {"id": "FN-button-L-1240", "component_id": "button", "theme": "light", "viewport": {"width": 1240, "height": 800}, "suite": "base_visual", "assertions": [], "required_artifacts": []}
        result = {"schema_version": "tessera.full-native.capture/v2", "scenario_id": scene["id"], "status": "captured", "request": {"scene_id": scene["id"], "component_id": "button", "theme": "light", "viewport": scene["viewport"]}, "provenance": {"source_revision": "a" * 40, "build_key": "build-a", "scene_manifest_sha256": "b" * 64, "binary_sha256": "c" * 64}, "artifact_sha256": {}, "evidence": {"evidence_id": "EV-button", "revision": "d" * 40, "capture_kind": "gui", "assertion_facts": [], "blocked_capabilities": [], "interaction_plan": {"status": "observed", "postcondition": "button activation changes the native action counter", "postcondition_observed": True}, "keyboard_trace": {"input_origin": "platform_injected", "steps": [], "ime": "observed"}, "ax_snapshot": {"status": "observed", "nodes": [], "focused_ax_id": None, "internal_controls": []}}}
        for name in RUNNER.REQUIRED_CAPTURE_ARTIFACTS:
            (scene_dir / name).write_bytes(b"artifact")
            result["artifact_sha256"][name] = hashlib.sha256(b"artifact").hexdigest()
        (scene_dir / "capture-result.json").write_text(json.dumps(result), encoding="utf-8")
        codes = {error["code"] for error in RUNNER.validate_capture(scene, scene_dir, "b" * 64)}
        self.assertEqual(codes, {"CAPTURE_EVIDENCE_REVISION_IDENTITY"})

    def test_runner_terminates_bounded_process_groups(self) -> None:
        source = (ROOT / "bin/run-scenes.py").read_text(encoding="utf-8")
        self.assertIn("start_new_session=True", source)
        self.assertIn("os.killpg", source)
        self.assertIn("CAPTURE_HOOK_TIMEOUT", source)

    def test_modal_transition_requires_all_stages_and_nonzero_deltas(self) -> None:
        scene_dir = self.temp / "modal-transition"
        scene_dir.mkdir()
        png = b"\x89PNG\r\n\x1a\nmodal"
        for name in ("modal-before.png", "modal-open.png", "modal-closed.png"):
            (scene_dir / name).write_bytes(png)
        transition = {
            "status": "observed",
            "stage_order": ["before", "click", "open", "escape", "closed"],
            "stages": [{"stage": stage} for stage in ("before", "click", "open", "escape", "closed")],
            "before_png": "modal-before.png",
            "open_png": "modal-open.png",
            "closed_png": "modal-closed.png",
            "open_delta": {"dimensions_match": True, "significant_pixel_count": 200},
            "open_to_closed_delta": {"dimensions_match": True, "significant_pixel_count": 200},
            "closed_to_before_delta": {"dimensions_match": True, "significant_pixel_count": 0},
            "open_material_delta": True,
            "close_material_delta": True,
            "panel_backdrop_appeared_then_disappeared": True,
            "closed_approximately_before": True,
        }
        evidence = {"modal_transition": transition}
        self.assertEqual(RUNNER.validate_modal_transition(evidence, scene_dir), [])
        transition["stages"] = [{"stage": "before"}]
        codes = {error["code"] for error in RUNNER.validate_modal_transition(evidence, scene_dir)}
        self.assertEqual(codes, {"MODAL_TRANSITION_STAGES"})

    def test_modal_transition_zero_delta_is_blocking(self) -> None:
        scene_dir = self.temp / "modal-zero-delta"
        scene_dir.mkdir()
        png = b"\x89PNG\r\n\x1a\nmodal"
        for name in ("modal-before.png", "modal-open.png", "modal-closed.png"):
            (scene_dir / name).write_bytes(png)
        transition = {
            "status": "blocked",
            "stage_order": ["before", "click", "open", "escape", "closed"],
            "stages": [{"stage": stage} for stage in ("before", "click", "open", "escape", "closed")],
            "before_png": "modal-before.png",
            "open_png": "modal-open.png",
            "closed_png": "modal-closed.png",
            "open_delta": {"dimensions_match": True, "significant_pixel_count": 0},
            "open_to_closed_delta": {"dimensions_match": True, "significant_pixel_count": 0},
            "closed_to_before_delta": {"dimensions_match": True, "significant_pixel_count": 0},
            "open_material_delta": False,
            "close_material_delta": False,
            "panel_backdrop_appeared_then_disappeared": False,
            "closed_approximately_before": True,
        }
        codes = {error["code"] for error in RUNNER.validate_modal_transition({"modal_transition": transition}, scene_dir)}
        self.assertEqual(codes, {"MODAL_TRANSITION_ZERO_DELTA", "MODAL_TRANSITION_PANEL", "MODAL_TRANSITION_NOT_OBSERVED"})


if __name__ == "__main__":
    unittest.main()
