from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "bin"
SHELL_HOOK = BIN / "capture-macos.sh"
SWIFT_HOOK = BIN / "capture-macos.swift"
PACKAGE_SCRIPT = ROOT.parents[1] / "scripts" / "package-macos.sh"


class CaptureMacosContractTest(unittest.TestCase):
    def test_shell_hook_requires_the_coordinating_release_without_building(self) -> None:
        source = SHELL_HOOK.read_text(encoding="utf-8")
        self.assertIn("TESSERA_GALLERY_BIN", source)
        self.assertIn("TESSERA_GALLERY_APP", source)
        self.assertIn("must be the executable inside TESSERA_GALLERY_APP", source)
        self.assertIn("capture never builds Gallery", source)
        self.assertNotIn("cargo +1.88.0 build --release", source)

    def test_swift_hook_uses_real_window_capture_and_pixel_geometry(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn("CGWindowListCopyWindowInfo", source)
        self.assertIn(".optionAll", source)
        self.assertIn("CGDisplayBounds(CGMainDisplayID())", source)
        self.assertIn("kCGWindowSharingState", source)
        self.assertIn("kCGWindowIsOnscreen", source)
        self.assertIn("window-observation.json", source)
        self.assertIn('"/usr/sbin/screencapture"', source)
        self.assertIn('"-l\\(window.id)"', source)
        self.assertIn("detectedSurfaces", source)
        self.assertIn("waitForRenderableCapture", source)
        self.assertIn("capture_png_physical_pixels", source)
        self.assertIn("the captured PNG contains no independently observable internal surface", source)

    def test_swift_hook_passes_explicit_theme_to_gallery(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('case "light":', source)
        self.assertIn('arguments.append("--light")', source)
        self.assertIn('case "dark":', source)
        self.assertIn('arguments.append("--dark")', source)

    def test_swift_hook_uses_gallery_component_argument_contract(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('"--component=\\(scene.component_id)"', source)
        self.assertNotIn('var arguments = ["--component", scene.component_id]', source)

    def test_swift_hook_spawns_and_verifies_a_dedicated_gallery_process_group(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn("POSIX_SPAWN_SETPGROUP", source)
        self.assertIn("posix_spawnattr_setpgroup", source)
        self.assertIn("getpgid(pid) == pid", source)
        self.assertNotIn("setpgid(process.processIdentifier", source)

    def test_swift_hook_can_launch_a_managed_bundle_through_launchservices(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('case "--gallery-app":', source)
        self.assertIn('URL(fileURLWithPath: "/usr/bin/open")', source)
        self.assertIn('opener.arguments = ["-n", app.path, "--args"] + arguments', source)
        self.assertIn('launchMode: "launchservices_app"', source)
        self.assertIn("Gallery launched through LaunchServices", source)
        self.assertIn("process.requestTermination()", source)

    def test_managed_bundle_capture_binds_build_result_provenance(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn("captureProvenance", source)
        self.assertIn('appendingPathComponent("build-result.json")', source)
        self.assertIn('"source_tree_digest_sha256"', source)
        self.assertIn('"lockfile_sha256"', source)
        self.assertIn('"rust_toolchain"', source)
        self.assertIn('"build_command_sha256"', source)
        self.assertIn('"vws_session"', source)
        self.assertIn('"package_manifest_sha256"', source)
        self.assertIn('"build_result_sha256"', source)
        self.assertIn("managed package provenance does not bind the supplied Gallery executable", source)

    def test_package_script_writes_a_bound_managed_build_result(self) -> None:
        source = PACKAGE_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("--build-key", source)
        self.assertIn("--session", source)
        self.assertIn("--build-command", source)
        self.assertIn("--rust-toolchain", source)
        self.assertIn("source-tree-material.txt", source)
        self.assertIn("git -C \"$REPO_DIR\" diff --binary", source)
        self.assertIn('"tessera/macos-build-result/v1"', source)
        self.assertIn("build-result.json", source)
        self.assertIn("LOCKFILE_SHA256", source)
        self.assertIn("PACKAGE_MANIFEST_SHA256", source)

    def test_swift_hook_requires_platform_screenshot_proofs_for_focus_and_ax_claims(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('scene.suite == "keyboard_focus"', source)
        self.assertIn("AX child controls and IME evidence remain blocked", source)
        self.assertIn("focusRingDelta", source)
        self.assertIn("distinct keyboard-focus OS screenshot", source)

    def test_button_interaction_plan_uses_its_real_target_and_material_os_delta(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('case "button":', source)
        self.assertIn('["x": 236.0, "y": 636.0]', source)
        self.assertIn('"capture_point_physical_pixels"', source)
        self.assertIn('"button_run_native_action"', source)
        self.assertIn("isMaterialVisualDelta", source)
        self.assertIn("clickActivationObserved && keyboardActivationObserved", source)

    def test_modal_interaction_plan_requires_platform_open_and_escape_close(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('case "modal":', source)
        self.assertIn('"modal_open_then_escape_close"', source)
        self.assertIn('"keyboard_activation_actions": ["escape"]', source)
        self.assertIn('"actions": ["click_primary_probe", "tab", "shift_tab", "escape"]', source)
        self.assertIn("let selectedActions = Set(requestedActions", source)

    def test_swift_hook_requires_gallery_to_be_frontmost_before_platform_input(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn("NSRunningApplication(processIdentifier", source)
        self.assertIn("application.unhide()", source)
        self.assertIn("application.activate()", source)
        self.assertIn("activateAllWindows", source)
        self.assertIn("application.isActive", source)
        self.assertIn("frontmostApplication?.processIdentifier", source)
        self.assertIn("observedWindow?.isOnscreen == true", source)
        self.assertIn("sameWindow($0, expectedWindow)", source)
        self.assertIn("for attempt in 1...activationAttempts", source)
        self.assertIn("requiredStablePolls", source)
        self.assertIn("activation_attempts=", source)
        self.assertIn("activation_accepted=", source)
        self.assertIn('stage: "\\(stage):key_down"', source)
        self.assertIn('stage: "\\(stage):key_up"', source)
        self.assertIn('stage: "\\(stage):mouse_down"', source)
        self.assertIn('stage: "\\(stage):mouse_up"', source)
        self.assertIn('"platform_input_readiness"', source)
        self.assertIn('"platform_foreground_pid"', source)

    def test_capture_schema_documents_assertion_facts(self) -> None:
        schema = (ROOT / "schema/capture-result-v2.schema.json").read_text(encoding="utf-8")
        self.assertIn('"tessera.full-native.capture/v2"', schema)
        self.assertIn('"assertion_facts"', schema)
        self.assertIn('"blocked_capabilities"', schema)

    def test_swift_hook_uses_v2_provenance_and_platform_input_shapes(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn('"--viewport=\\(viewport.width)x\\(viewport.height)"', source)
        self.assertIn("CGEvent(keyboardEventSource", source)
        self.assertIn("CGEvent(mouseEventSource", source)
        self.assertIn("CGPreflightScreenCaptureAccess()", source)
        self.assertIn("AXUIElementCreateApplication(pid)", source)
        self.assertIn('"artifact_sha256"', source)

    def test_coordinate_bridge_fixture_maps_physical_pixels_to_quartz_points(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        window_x, window_y = 136.0, 71.0
        target_x, target_y = 185.0, 784.0
        png_width, png_height = 2480.0, 1600.0
        window_width, window_height = 1240.0, 800.0
        self.assertEqual(window_x + target_x / (png_width / window_width), 228.5)
        self.assertEqual(window_y + target_y / (png_height / window_height), 463.0)
        self.assertIn("CaptureCoordinateBridge", source)
        self.assertIn("target_physical_pixels", source)
        self.assertIn("final_cg_event_point", source)
        self.assertIn("overlapping_display_ids", source)

    def test_coordinate_bridge_rejects_nonmain_display_and_scale_mismatch(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn("refuses a non-main display", source)
        self.assertIn("refuses a window spanning displays", source)
        self.assertIn("coordinate bridge scale mismatch", source)
        self.assertIn("abs(scaleX - selected.backingScale)", source)

    def test_modal_capture_has_independent_transition_stages(self) -> None:
        source = SWIFT_HOOK.read_text(encoding="utf-8")
        self.assertIn("ModalProbeResult", source)
        self.assertIn("modal-before.png", source)
        self.assertIn("modal-open.png", source)
        self.assertIn("modal-closed.png", source)
        self.assertIn('"stage_order": ["before", "click", "open", "escape", "closed"]', source)
        self.assertIn("both_open_and_close_material_deltas", source)
        self.assertIn("closed_approximately_before", source)

    @unittest.skipUnless(sys.platform == "darwin" and shutil.which("swiftc"), "requires macOS Swift")
    def test_swift_hook_typechecks(self) -> None:
        with tempfile.TemporaryDirectory(prefix="tessera-swift-module-cache-") as module_cache:
            environment = os.environ.copy()
            environment["CLANG_MODULE_CACHE_PATH"] = module_cache
            completed = subprocess.run(
                ["swiftc", "-typecheck", str(SWIFT_HOOK)],
                check=False,
                capture_output=True,
                text=True,
                env=environment,
            )
        self.assertEqual(completed.returncode, 0, completed.stderr)


if __name__ == "__main__":
    unittest.main()
