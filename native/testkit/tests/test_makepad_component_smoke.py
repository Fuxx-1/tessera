from __future__ import annotations

import argparse
import importlib.util
import json
import os
import plistlib
import re
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path


TESTKIT = Path(__file__).resolve().parents[1]
SCRIPT = TESTKIT / "makepad_component_smoke.py"
SPEC = importlib.util.spec_from_file_location("makepad_component_smoke", SCRIPT)
assert SPEC and SPEC.loader
SMOKE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = SMOKE
SPEC.loader.exec_module(SMOKE)


class MakepadComponentSmokeTests(unittest.TestCase):
    def test_retained_capture_removes_only_its_original_temporary_directory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            capture = root / "makepad-remote" / "owned-run" / "window.png"
            capture.parent.mkdir(parents=True)
            capture.write_bytes(b"capture")
            destination = root / "evidence" / "window.png"
            with patch.object(SMOKE.tempfile, "gettempdir", return_value=directory):
                saved = SMOKE.cleanup_grabs({"png": [str(capture)]}, True, destination)
            self.assertEqual(saved, str(destination))
            self.assertEqual(destination.read_bytes(), b"capture")
            self.assertFalse(capture.parent.exists())
            self.assertTrue((root / "makepad-remote").is_dir())

    def test_capture_cleanup_never_deletes_the_shared_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            capture = root / "makepad-remote" / "window.png"
            capture.parent.mkdir()
            capture.write_bytes(b"capture")
            with patch.object(SMOKE.tempfile, "gettempdir", return_value=directory):
                SMOKE.cleanup_grabs({"png": [str(capture)]}, False, root / "unused.png")
            self.assertTrue(capture.exists())

    def test_standalone_grab_accepts_a_single_png_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            capture = root / "makepad-remote" / "owned-session" / "window.png"
            capture.parent.mkdir(parents=True)
            capture.write_bytes(b"capture")
            destination = root / "retained" / "window.png"
            with patch.object(SMOKE.tempfile, "gettempdir", return_value=directory):
                saved = SMOKE.cleanup_grabs({"png": str(capture)}, True, destination)
            self.assertEqual(saved, str(destination))
            self.assertEqual(destination.read_bytes(), b"capture")
            self.assertTrue((root / "makepad-remote").is_dir())

    def test_launch_arguments_place_makepad_remote_flags_first(self) -> None:
        self.assertEqual(
            SMOKE.launch_arguments("button", "light", (840, 600), 9000),
            [
                "--remote=9000",
                "--remote-title-tag=smoke",
                "--component=button",
                "--light",
                "--viewport=840x600",
            ],
        )

    def test_catalog_entry_launch_omits_the_direct_component_argument(self) -> None:
        self.assertEqual(
            SMOKE.launch_arguments(None, "dark", (1240, 800), 9001),
            [
                "--remote=9001",
                "--remote-title-tag=smoke",
                "--dark",
                "--viewport=1240x800",
            ],
        )

    def test_missing_component_probe_fails_closed_without_gallery_activation(self) -> None:
        self.assertFalse(
            SMOKE.component_action_status_matches(
                "button",
                "Button",
                "TesseraButton",
                "missing_component_probe",
                "Button Gallery activation recorded for Button (run 1).",
            )
        )
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertNotIn("gallery_activation", source)
        self.assertNotIn(
            'scroll_widget_into_view(port, instance, "component_action")', source
        )

    def test_overlay_runtime_contract_requires_explicit_and_escape_close(self) -> None:
        self.assertEqual(
            SMOKE.OVERLAY_INTERACTION_PROBES["modal"],
            ("modal_open", "modal_cancel", "modal_panel", ("closed",)),
        )
        self.assertEqual(
            SMOKE.OVERLAY_INTERACTION_PROBES["dropdown"],
            ("dropdown_trigger", None, None, ("closed",)),
        )
        self.assertEqual(
            SMOKE.OVERLAY_INTERACTION_PROBES["tooltip"],
            ("tooltip_target", "tooltip_target", None, ("hidden",)),
        )
        self.assertEqual(
            SMOKE.OVERLAY_INTERACTION_PROBES["popover"],
            ("popover_anchor", "popover_close", None, ("closed",)),
        )
        self.assertTrue(
            SMOKE.overlay_close_status_matches("Modal", "Modal closed", ("closed",))
        )
        self.assertFalse(
            SMOKE.overlay_close_status_matches("Modal", "Modal opened (1)", ("closed",))
        )
        self.assertTrue(SMOKE.overlay_open_status_matches("Tooltip", "Tooltip shown"))
        self.assertFalse(SMOKE.overlay_open_status_matches("Tooltip", "Tooltip hidden"))

    def test_first_widget_uses_a_full_snapshot_for_scrolled_content(self) -> None:
        requested_paths: list[str] = []

        def remote_json(_port: int, path: str) -> dict[str, object]:
            requested_paths.append(path)
            return {"s": [{"i": "theme_status", "r": [0, 0, 1, 1]}]}

        original = SMOKE.remote_json
        self.addCleanup(setattr, SMOKE, "remote_json", original)
        SMOKE.remote_json = remote_json

        self.assertEqual(SMOKE.first_widget(9000, "theme_status")["i"], "theme_status")
        self.assertEqual(requested_paths, ["/snap?all=1&q=theme_status"])

    def test_visible_widget_rejects_a_hidden_widget_from_a_full_snapshot(self) -> None:
        def remote_json(_port: int, _path: str) -> dict[str, object]:
            return {
                "s": [
                    {"i": "theme_status", "r": [0, 0, 1, 1], "v": 0},
                    {"i": "other", "r": [0, 0, 1, 1]},
                ]
            }

        original = SMOKE.remote_json
        self.addCleanup(setattr, SMOKE, "remote_json", original)
        SMOKE.remote_json = remote_json

        with self.assertRaises(ValueError):
            SMOKE.visible_widget(9000, "theme_status")

    def test_surface_status_distinguishes_concrete_and_blocked_routes(self) -> None:
        self.assertEqual(
            SMOKE.parse_surface_status("Native surface: TesseraButton / route button"),
            ("connected", "TesseraButton"),
        )
        self.assertEqual(
            SMOKE.parse_surface_status(
                "Blocked: no component-owned Makepad surface is connected for Input."
            ),
            ("blocked", ""),
        )
        with self.assertRaises(ValueError):
            SMOKE.parse_surface_status("Ready to exercise activate.")

    def test_capture_scale_is_bounded_for_reviewable_artifacts(self) -> None:
        self.assertEqual(SMOKE.parse_capture_scale("0.25"), 0.25)
        self.assertEqual(SMOKE.parse_capture_scale("1"), 1.0)
        for value in ("0.24", "1.01", "not-a-number"):
            with self.assertRaises(argparse.ArgumentTypeError):
                SMOKE.parse_capture_scale(value)

    def test_new_display_surfaces_have_concrete_widget_and_action_probes(self) -> None:
        expected = {
            "TesseraCalendar": "calendar_surface",
            "TesseraCollapse": "collapse_surface",
            "TesseraDescriptions": "descriptions_surface",
            "TesseraImage": "image_surface",
            "TesseraList": "list_surface",
            "TesseraMenu": "menu_surface",
            "TesseraQrCode": "qr_code_surface",
            "TesseraRate": "rate_surface",
        }
        self.assertEqual(
            {widget: SMOKE.SURFACE_WIDGET_IDS[widget] for widget in expected},
            expected,
        )
        self.assertEqual(set(expected).difference(SMOKE.SURFACE_ACTION_PROBES), set())

    def test_component_owned_chart_surfaces_have_canvas_and_keyboard_probes(self) -> None:
        expected = {
            "line-chart": ("TesseraLineChart", "line_chart_surface"),
            "area-chart": ("TesseraAreaChart", "area_chart_surface"),
            "bar-chart": ("TesseraBarChart", "bar_chart_surface"),
            "scatter-chart": ("TesseraScatterChart", "scatter_chart_surface"),
            "sparkline": ("TesseraSparkline", "sparkline_surface"),
            "funnel-chart": ("TesseraFunnelChart", "funnel_chart_surface"),
            "gauge-chart": ("TesseraGaugeChart", "gauge_chart_surface"),
            "heatmap": ("TesseraHeatmap", "heatmap_surface"),
            "mind-map": ("TesseraMindMap", "mind_map_surface"),
            "organization-chart": ("TesseraOrganizationChart", "organization_chart_surface"),
            "pie-chart": ("TesseraPieChart", "pie_chart_surface"),
            "radar-chart": ("TesseraRadarChart", "radar_chart_surface"),
            "sankey-chart": ("TesseraSankeyChart", "sankey_chart_surface"),
            "treemap": ("TesseraTreemap", "treemap_surface"),
            "word-cloud": ("TesseraWordCloud", "word_cloud_surface"),
        }
        self.assertEqual(SMOKE.CHART_ACTION_PROBES, expected)
        for component, (widget, surface_id) in expected.items():
            self.assertEqual(SMOKE.SURFACE_WIDGET_IDS[widget], surface_id)
            self.assertEqual(
                SMOKE.chart_action_probe(component, widget),
                (surface_id, "chart"),
            )
        self.assertNotIn("TesseraChartSurface", SMOKE.SURFACE_WIDGET_IDS)

    def test_atomic_probes_target_the_component_widget_or_are_explicitly_visual_only(self) -> None:
        expected = {
            "button": ("TesseraButton", "button_surface", "click"),
            "float-button": ("TesseraFloatButton", "float_button_surface", "click"),
            "typography": ("TesseraTypography", "typography_surface", "click"),
            "icon-button": ("TesseraIconButton", "icon_button_surface", "click"),
            "toolbar": ("TesseraToolbar", "toolbar_surface", "toolbar"),
            "tag": ("TesseraTag", "tag_surface", "right_click"),
            "avatar": ("TesseraAvatar", "avatar_surface", "click"),
        }
        self.assertEqual(SMOKE.ATOMIC_ACTION_PROBES, expected)
        for component, (widget, surface_id, kind) in expected.items():
            self.assertEqual(SMOKE.SURFACE_WIDGET_IDS[widget], surface_id)
            self.assertEqual(SMOKE.atomic_action_probe(component, widget), (surface_id, kind))
        self.assertEqual(
            SMOKE.VISUAL_ONLY_COMPONENTS,
            {
                "icon": "TesseraIcon",
                "divider": "TesseraDivider",
                "space": "TesseraSpace",
                "watermark": "TesseraWatermark",
                "badge": "TesseraBadge",
            },
        )
        self.assertTrue(SMOKE.component_is_visual_only("badge", "TesseraBadge"))
        self.assertFalse(SMOKE.component_is_visual_only("button", "TesseraButton"))

    def test_input_runtime_contract_separates_independent_controls_composites_and_advanced(self) -> None:
        expected = {
            "input": ("input_control", "text"),
            "textarea": ("textarea_control", "text"),
            "input-number": ("input_number_control", "text"),
            "checkbox": ("checkbox_control", "click"),
            "radio": ("radio_advanced", "click"),
            "switch": ("switch_control", "click"),
            "slider": ("slider_control", "click"),
            "select": ("select_control", "dropdown"),
        }
        self.assertEqual(SMOKE.INPUT_ACTION_PROBES, expected)
        self.assertEqual(SMOKE.RUNTIME_INPUT_COMPONENTS, frozenset(expected))
        input_widgets = {
            "input": "TesseraInput",
            "textarea": "TesseraTextarea",
            "input-number": "TesseraInputNumber",
            "checkbox": "TesseraCheckbox",
            "radio": "TesseraRadio",
            "switch": "TesseraSwitch",
            "slider": "TesseraSlider",
            "select": "TesseraSelect",
        }
        self.assertEqual(SMOKE.INPUT_SURFACE_WIDGETS, input_widgets)
        composites = {
            "auto-complete": ("auto_complete_choices", "click"),
            "mentions": ("mentions_choices", "click"),
            "color-picker": ("color_picker_choices", "click"),
            "date-picker": ("date_picker_choices", "click"),
            "time-picker": ("time_picker_choices", "click"),
        }
        self.assertEqual(SMOKE.COMPOSITE_INPUT_ACTION_PROBES, composites)
        self.assertEqual(SMOKE.RUNTIME_INPUT_COMPOSITE_COMPONENTS, frozenset(composites))
        self.assertEqual(
            SMOKE.COMPOSITE_INPUT_CANCEL_PROBES,
            {
                "auto-complete": (None, "auto_complete_reset"),
                "mentions": (None, "mentions_reset"),
                "color-picker": (None, "color_picker_reset"),
                "date-picker": (None, "date_picker_reset"),
                "time-picker": (None, "time_picker_reset"),
            },
        )
        advanced = {
            "cascader": ("cascader_parent", "click"),
            "tree-select": ("tree_select_node", "click"),
            "transfer": ("transfer_move", "click"),
            "upload": ("upload_stage", "click"),
            "form": ("form_submit", "click"),
        }
        advanced_widgets = {
            "cascader": "TesseraCascader",
            "tree-select": "TesseraTreeSelect",
            "transfer": "TesseraTransfer",
            "upload": "TesseraUpload",
            "form": "TesseraForm",
        }
        self.assertEqual(SMOKE.ADVANCED_INPUT_ACTION_PROBES, advanced)
        self.assertEqual(SMOKE.ADVANCED_INPUT_SURFACE_WIDGETS, advanced_widgets)
        self.assertEqual(SMOKE.RUNTIME_ADVANCED_INPUT_COMPONENTS, frozenset(advanced))
        self.assertEqual(
            SMOKE.ADVANCED_INPUT_CANCEL_OPEN_PROBES,
            {"transfer": "transfer_source"},
        )
        self.assertEqual(SMOKE.BLOCKED_INPUT_COMPONENTS, frozenset())
        for component, probe in expected.items():
            widget = input_widgets[component]
            self.assertEqual(SMOKE.SURFACE_WIDGET_IDS[widget], f"{component.replace('-', '_')}_surface")
            self.assertEqual(
                SMOKE.input_action_probe(component, widget),
                probe,
            )
            self.assertFalse(SMOKE.input_route_is_runtime_connected(component, "TesseraInputSurface"))
        for component, probe in composites.items():
            self.assertEqual(
                SMOKE.input_action_probe(component, "TesseraButton"),
                probe,
            )
        for component, probe in advanced.items():
            self.assertTrue(
                SMOKE.advanced_input_route_is_runtime_connected(
                    component,
                    advanced_widgets[component],
                )
            )
            self.assertEqual(
                SMOKE.input_action_probe(component, advanced_widgets[component]),
                probe,
            )
            self.assertIsNone(SMOKE.input_action_probe(component, "TesseraInputSurface"))
        for component in SMOKE.BLOCKED_INPUT_COMPONENTS:
            self.assertFalse(
                SMOKE.input_route_is_runtime_connected(component, "TesseraInputSurface")
            )
            self.assertIsNone(SMOKE.input_action_probe(component, "TesseraInputSurface"))
        self.assertIsNone(SMOKE.input_action_probe("input", "TesseraButton"))

    def test_input_number_stepper_probe_uses_the_component_owned_widget_id(self) -> None:
        self.assertEqual(SMOKE.INPUT_NUMBER_STEPPER_PROBE, "input_number_increment")
        self.assertNotEqual(SMOKE.INPUT_NUMBER_STEPPER_PROBE, "increment")
        self.assertEqual(SMOKE.INPUT_NUMBER_KEYBOARD_PROBES, ("ArrowUp", "ArrowDown"))
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn(
            "scroll_widget_into_view(\n"
            "                    port,\n"
            "                    instance,\n"
            "                    INPUT_NUMBER_STEPPER_PROBE,",
            source,
        )
        self.assertIn("for key_code in INPUT_NUMBER_KEYBOARD_PROBES:", source)

    def test_text_probe_selects_the_existing_fixture_through_primary_key(self) -> None:
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn('press_key(port, "KeyA", primary=True)', source)
        self.assertIn('params["cmd" if sys.platform == "darwin" else "ctrl"] = 1', source)

    def test_input_action_status_rejects_foreign_surface_action(self) -> None:
        self.assertTrue(
            SMOKE.component_action_status_matches(
                "select",
                "Select",
                "TesseraSelect",
                "component_specific",
                "Select input Changed recorded for Select (run 1).",
            )
        )
        self.assertFalse(
            SMOKE.component_action_status_matches(
                "upload",
                "Upload",
                "TesseraSelect",
                "component_specific",
                "Upload input validation failed recorded for Upload (run 1).",
            )
        )
        self.assertTrue(
            SMOKE.component_action_status_matches(
                "upload",
                "Upload",
                "TesseraUpload",
                "component_specific",
                "Upload metadata staged recorded for Upload (run 1).",
            )
        )
        self.assertFalse(
            SMOKE.component_action_status_matches(
                "select",
                "Select",
                "TesseraSelect",
                "component_specific",
                "Table row 2 selected recorded for Select (run 1).",
            )
        )
        self.assertTrue(
            SMOKE.component_action_status_matches(
                "table",
                "Table",
                "TesseraTable",
                "component_specific",
                "Table row 2 selected recorded for Table (run 1).",
            )
        )

    def test_current_batch_surfaces_have_distinct_widget_and_action_probes(self) -> None:
        expected = {
            "TesseraSegmented": "segmented_surface",
            "TesseraTabs": "tabs_surface",
            "TesseraTree": "tree_surface",
            "TesseraCarousel": "carousel_surface",
            "TesseraSplitter": "splitter_surface",
            "TesseraBorderBeam": "border_beam_surface",
            "TesseraApp": "app_surface",
            "TesseraConfigProvider": "config_provider_surface",
            "TesseraUtil": "util_surface",
        }
        self.assertEqual(
            {widget: SMOKE.SURFACE_WIDGET_IDS[widget] for widget in expected},
            expected,
        )
        self.assertEqual(set(expected).difference(SMOKE.SURFACE_ACTION_PROBES), set())

    def test_component_action_probes_target_live_buttons(self) -> None:
        sources = {
            "TesseraCalendar": "calendar.rs",
            "TesseraCollapse": "collapse.rs",
            "TesseraDescriptions": "descriptions.rs",
            "TesseraImage": "image.rs",
            "TesseraList": "list.rs",
            "TesseraMenu": "menu.rs",
            "TesseraQrCode": "qr_code.rs",
            "TesseraRate": "rate.rs",
            "TesseraMasonry": "masonry.rs",
            "TesseraBreadcrumb": "breadcrumb.rs",
            "TesseraPagination": "pagination.rs",
            "TesseraSteps": "steps.rs",
            "TesseraSkeleton": "skeleton.rs",
            "TesseraSpin": "spin.rs",
            "TesseraStatistic": "statistic.rs",
            "TesseraTimeline": "timeline.rs",
            "TesseraAlert": "feedback.rs",
            "TesseraEmpty": "feedback.rs",
            "TesseraProgress": "feedback.rs",
            "TesseraResult": "feedback.rs",
            "TesseraAffix": "layout.rs",
            "TesseraAnchor": "layout.rs",
            "TesseraCard": "layout.rs",
            "TesseraFlex": "layout.rs",
            "TesseraGrid": "layout.rs",
            "TesseraLayout": "layout.rs",
            "TesseraSegmented": "navigation.rs",
            "TesseraTabs": "navigation.rs",
            "TesseraTree": "navigation.rs",
            "TesseraCarousel": "interactive.rs",
            "TesseraSplitter": "interactive.rs",
            "TesseraBorderBeam": "interactive.rs",
            "TesseraApp": "runtime.rs",
            "TesseraConfigProvider": "runtime.rs",
            "TesseraUtil": "runtime.rs",
            "TesseraDrawer": "drawer.rs",
            "TesseraDropdown": "dropdown.rs",
            "TesseraMessage": "message.rs",
            "TesseraModal": "modal.rs",
            "TesseraNotification": "notification.rs",
            "TesseraPopconfirm": "popconfirm.rs",
            "TesseraPopover": "popover.rs",
            "TesseraTooltip": "tooltip.rs",
            "TesseraCodeBlock": "code_block.rs",
            "TesseraCommandPalette": "command_palette.rs",
            "TesseraDataToolbar": "data_toolbar.rs",
            "TesseraFilterPanel": "filter_panel.rs",
            "TesseraMarkdownEditor": "markdown_editor.rs",
            "TesseraTable": "table.rs",
            "TesseraMermaidSvgViewer": "mermaid_svg_viewer.rs",
            "TesseraMetricCard": "metric_card.rs",
            "TesseraMiniChartCard": "mini_chart_card.rs",
            "TesseraMobilePreviewFrame": "mobile_preview_frame.rs",
            "TesseraPropertyList": "property_list.rs",
            "TesseraStatusTimeline": "status_timeline.rs",
            "TesseraTour": "tour.rs",
        }
        surfaces = TESTKIT.parent / "crates" / "tessera-makepad" / "src" / "components" / "surfaces"

        self.assertEqual(set(SMOKE.SURFACE_ACTION_PROBES), set(sources))
        for widget, control in SMOKE.SURFACE_ACTION_PROBES.items():
            source = (surfaces / sources[widget]).read_text(encoding="utf-8")
            native_widget = SMOKE.SURFACE_ACTION_PROBE_WIDGETS.get(widget, "Button")
            self.assertRegex(
                source,
                rf"\b{re.escape(control)}\s*:=\s*{re.escape(native_widget)}\b",
            )

        breadcrumb = (surfaces / "breadcrumb.rs").read_text(encoding="utf-8")
        self.assertRegex(breadcrumb, r"\bbreadcrumb_overflow_menu\s*:=\s*View\b")

    def test_blocked_route_records_a_blocked_action_check(self) -> None:
        original_values = {
            name: getattr(SMOKE, name)
            for name in (
                "launch_instance",
                "free_port",
                "wait_for_remote",
                "wait_for_widget",
                "remote_json",
                "first_widget",
                "scroll_widget_into_view",
                "close_instance",
            )
        }
        for name, value in original_values.items():
            self.addCleanup(setattr, SMOKE, name, value)

        instance = SMOKE.RunningInstance()
        SMOKE.free_port = lambda: 9000
        SMOKE.launch_instance = lambda *_args: instance
        SMOKE.wait_for_remote = lambda *_args: {}

        def wait_for_widget(_port: int, _instance: object, widget_id: str) -> dict[str, object]:
            if widget_id == "component_category":
                return {"i": widget_id, "t": "Base / Atomic / button", "r": [0, 0, 1, 1]}
            if widget_id == "surface_status":
                return {
                    "i": widget_id,
                    "t": "Blocked: no component-owned Makepad surface is connected for Button.",
                    "r": [0, 0, 1, 1],
                }
            raise AssertionError(f"unexpected widget wait: {widget_id}")

        SMOKE.wait_for_widget = wait_for_widget
        SMOKE.remote_json = lambda _port, path: (
            {"w": [{"sz": [840, 600]}]} if path == "/status" else {"l": []}
        )

        def first_widget(_port: int, widget_id: str) -> dict[str, object]:
            values = {
                "component_name": "Button",
                "theme_status": "Requested Light -> resolved Light",
                "component_action_status": "Native surface blocked; route smoke only.",
            }
            return {"i": widget_id, "t": values[widget_id], "r": [0, 0, 1, 1]}

        SMOKE.first_widget = first_widget
        SMOKE.scroll_widget_into_view = lambda *_args: {"r": [0, 0, 1, 1]}
        SMOKE.close_instance = lambda *_args: (None, [])

        result = SMOKE.exercise_component(
            binary=Path("/unused/binary"),
            app=None,
            cwd=Path("/unused"),
            output_dir=Path("/unused/out"),
            component="button",
            theme="light",
            viewport=(840, 600),
            capture=False,
        )

        self.assertTrue(result.passed)
        self.assertEqual(result.action_check, "blocked")

    def test_viewport_parser_accepts_only_bounded_dimensions(self) -> None:
        self.assertEqual(SMOKE.parse_viewport("840x600"), (840, 600))
        with self.assertRaises(Exception):
            SMOKE.parse_viewport("319x600")
        with self.assertRaises(Exception):
            SMOKE.parse_viewport("840X600")

    def test_component_ids_requires_a_complete_unique_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="makepad-smoke-test-") as directory:
            manifest = Path(directory) / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "component_count": 2,
                        "components": [
                            {"id": "button", "status": "blocked"},
                            {"id": "input", "status": "blocked"},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            self.assertEqual(SMOKE.component_ids(manifest), (["button", "input"], {"blocked": 2}))

            manifest.write_text(
                json.dumps(
                    {
                        "component_count": 2,
                        "components": [
                            {"id": "button", "status": "blocked"},
                            {"id": "button", "status": "blocked"},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(ValueError):
                SMOKE.component_ids(manifest)

    def test_app_bundle_executable_uses_the_declared_bundle_entrypoint(self) -> None:
        with tempfile.TemporaryDirectory(prefix="makepad-app-smoke-test-") as directory:
            app = Path(directory) / "Tessera Makepad.app"
            executable = app / "Contents" / "MacOS" / "tessera-gallery"
            executable.parent.mkdir(parents=True)
            with (app / "Contents" / "Info.plist").open("wb") as target:
                plistlib.dump({"CFBundleExecutable": "tessera-gallery"}, target)
            executable.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
            executable.chmod(executable.stat().st_mode | stat.S_IXUSR)

            self.assertEqual(SMOKE.app_bundle_executable(app), executable)

            with (app / "Contents" / "Info.plist").open("wb") as target:
                plistlib.dump({"CFBundleExecutable": "../outside"}, target)
            with self.assertRaises(ValueError):
                SMOKE.app_bundle_executable(app)


if __name__ == "__main__":
    unittest.main()
