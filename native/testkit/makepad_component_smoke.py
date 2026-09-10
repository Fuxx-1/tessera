#!/usr/bin/env python3
"""Exercise every Makepad gallery component over the built-in remote API.

This is deliberately a runtime smoke test, not sealed product evidence. It
checks that a release binary can enter the default component catalog, open and
leave a catalog detail route, expose the current native surface contract,
process the route action where a surface is connected, emit no runtime errors,
and exit through the remote protocol. The report always preserves the
manifest's product acceptance disposition instead of upgrading it from smoke
results.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import plistlib
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "testkit" / "makepad-component-manifest-v1.json"
DEFAULT_CWD = ROOT
START_TIMEOUT_SECONDS = 12.0
REQUEST_TIMEOUT_SECONDS = 8.0
EXIT_TIMEOUT_SECONDS = 8.0
SCROLL_STEP = 180.0
SCROLL_ATTEMPTS = 32
DEFAULT_CAPTURE_SCALE = 0.25

SURFACE_WIDGET_IDS = {
    "TesseraButton": "button_surface",
    "TesseraFloatButton": "float_button_surface",
    "TesseraIcon": "icon_surface",
    "TesseraTypography": "typography_surface",
    "TesseraIconButton": "icon_button_surface",
    "TesseraToolbar": "toolbar_surface",
    "TesseraDivider": "divider_surface",
    "TesseraSpace": "space_surface",
    "TesseraWatermark": "watermark_surface",
    "TesseraBadge": "badge_surface",
    "TesseraTag": "tag_surface",
    "TesseraAvatar": "avatar_surface",
    "TesseraLineChart": "line_chart_surface",
    "TesseraAreaChart": "area_chart_surface",
    "TesseraBarChart": "bar_chart_surface",
    "TesseraScatterChart": "scatter_chart_surface",
    "TesseraSparkline": "sparkline_surface",
    "TesseraFunnelChart": "funnel_chart_surface",
    "TesseraGaugeChart": "gauge_chart_surface",
    "TesseraHeatmap": "heatmap_surface",
    "TesseraMindMap": "mind_map_surface",
    "TesseraOrganizationChart": "organization_chart_surface",
    "TesseraPieChart": "pie_chart_surface",
    "TesseraRadarChart": "radar_chart_surface",
    "TesseraSankeyChart": "sankey_chart_surface",
    "TesseraTreemap": "treemap_surface",
    "TesseraWordCloud": "word_cloud_surface",
    "TesseraInput": "input_surface",
    "TesseraTextarea": "textarea_surface",
    "TesseraInputNumber": "input_number_surface",
    "TesseraCheckbox": "checkbox_surface",
    "TesseraRadio": "radio_surface",
    "TesseraSwitch": "switch_surface",
    "TesseraSlider": "slider_surface",
    "TesseraSelect": "select_surface",
    "TesseraAutoComplete": "auto_complete_surface",
    "TesseraMentions": "mentions_surface",
    "TesseraColorPicker": "color_picker_surface",
    "TesseraDatePicker": "date_picker_surface",
    "TesseraTimePicker": "time_picker_surface",
    "TesseraCascader": "cascader_surface",
    "TesseraTreeSelect": "tree_select_surface",
    "TesseraTransfer": "transfer_surface",
    "TesseraUpload": "upload_surface",
    "TesseraForm": "form_surface",
    "TesseraCalendar": "calendar_surface",
    "TesseraCollapse": "collapse_surface",
    "TesseraDescriptions": "descriptions_surface",
    "TesseraImage": "image_surface",
    "TesseraList": "list_surface",
    "TesseraMenu": "menu_surface",
    "TesseraQrCode": "qr_code_surface",
    "TesseraRate": "rate_surface",
    "TesseraMasonry": "masonry_surface",
    "TesseraBreadcrumb": "breadcrumb_surface",
    "TesseraPagination": "pagination_surface",
    "TesseraSteps": "steps_surface",
    "TesseraSkeleton": "skeleton_surface",
    "TesseraSpin": "spin_surface",
    "TesseraStatistic": "statistic_surface",
    "TesseraTimeline": "timeline_surface",
    "TesseraAlert": "alert_surface",
    "TesseraEmpty": "empty_surface",
    "TesseraProgress": "progress_surface",
    "TesseraResult": "result_surface",
    "TesseraAffix": "affix_surface",
    "TesseraAnchor": "anchor_surface",
    "TesseraCard": "card_surface",
    "TesseraFlex": "flex_surface",
    "TesseraGrid": "grid_surface",
    "TesseraLayout": "layout_surface",
    "TesseraSegmented": "segmented_surface",
    "TesseraTabs": "tabs_surface",
    "TesseraTree": "tree_surface",
    "TesseraCarousel": "carousel_surface",
    "TesseraSplitter": "splitter_surface",
    "TesseraBorderBeam": "border_beam_surface",
    "TesseraApp": "app_surface",
    "TesseraConfigProvider": "config_provider_surface",
    "TesseraUtil": "util_surface",
    "TesseraDrawer": "drawer_surface",
    "TesseraDropdown": "dropdown_surface",
    "TesseraMessage": "message_surface",
    "TesseraModal": "modal_surface",
    "TesseraNotification": "notification_surface",
    "TesseraPopconfirm": "popconfirm_surface",
    "TesseraPopover": "popover_surface",
    "TesseraTooltip": "tooltip_surface",
    "TesseraCodeBlock": "code_block_surface",
    "TesseraCommandPalette": "command_palette_surface",
    "TesseraDataToolbar": "data_toolbar_surface",
    "TesseraFilterPanel": "filter_panel_surface",
    "TesseraMarkdownEditor": "markdown_editor_surface",
    "TesseraTable": "table_surface",
    "TesseraMermaidSvgViewer": "mermaid_svg_viewer_surface",
    "TesseraMetricCard": "metric_card_surface",
    "TesseraMiniChartCard": "mini_chart_card_surface",
    "TesseraMobilePreviewFrame": "mobile_preview_frame_surface",
    "TesseraPropertyList": "property_list_surface",
    "TesseraStatusTimeline": "status_timeline_surface",
    "TesseraTour": "tour_surface",
}

# These routes have a stable internal control that proves a surface-owned
# reducer ran when it changes the Gallery action status.
SURFACE_ACTION_PROBES = {
    "TesseraCalendar": "calendar_next",
    "TesseraCollapse": "collapse_header",
    "TesseraDescriptions": "descriptions_toggle",
    "TesseraImage": "image_zoom",
    "TesseraList": "list_reload",
    "TesseraMenu": "menu_toggle",
    "TesseraQrCode": "qr_regenerate",
    "TesseraRate": "rate_three",
    "TesseraMasonry": "masonry_toggle",
    "TesseraBreadcrumb": "breadcrumb_overflow",
    "TesseraPagination": "pagination_next",
    "TesseraSteps": "steps_next",
    "TesseraSkeleton": "skeleton_loading",
    "TesseraSpin": "spin_active",
    "TesseraStatistic": "statistic_increment",
    "TesseraTimeline": "timeline_next",
    "TesseraAlert": "alert_dismiss",
    "TesseraEmpty": "empty_create",
    "TesseraProgress": "progress_reset",
    "TesseraResult": "result_retry",
    "TesseraAffix": "affix_toggle",
    "TesseraAnchor": "anchor_next",
    "TesseraCard": "card_toggle",
    "TesseraFlex": "flex_reverse",
    "TesseraGrid": "grid_density",
    "TesseraLayout": "layout_sidebar_toggle",
    "TesseraSegmented": "segmented_weekly",
    "TesseraTabs": "tabs_activity",
    "TesseraTree": "tree_root",
    "TesseraCarousel": "carousel_next",
    "TesseraSplitter": "splitter_increase",
    "TesseraBorderBeam": "border_beam_advance",
    "TesseraApp": "app_activate",
    "TesseraConfigProvider": "config_provider_dark",
    "TesseraUtil": "util_run",
    "TesseraDrawer": "drawer_open",
    "TesseraDropdown": "dropdown_trigger",
    "TesseraMessage": "message_send",
    "TesseraModal": "modal_open",
    "TesseraNotification": "notification_show",
    "TesseraPopconfirm": "popconfirm_trigger",
    "TesseraPopover": "popover_trigger",
    "TesseraTooltip": "tooltip_target",
    "TesseraCodeBlock": "code_block_copy",
    "TesseraCommandPalette": "command_palette_open",
    "TesseraDataToolbar": "data_toolbar_refresh",
    "TesseraFilterPanel": "filter_panel_apply",
    "TesseraMarkdownEditor": "markdown_editor_preview",
    "TesseraTable": "table_next",
    "TesseraMermaidSvgViewer": "mermaid_validate",
    "TesseraMetricCard": "metric_card_increase",
    "TesseraMiniChartCard": "mini_chart_next",
    "TesseraMobilePreviewFrame": "mobile_preview_next",
    "TesseraPropertyList": "property_copy_one",
    "TesseraStatusTimeline": "status_timeline_next",
    "TesseraTour": "tour_start",
}

# Most connected surfaces expose a stock Button action. A selector and a tip
# intentionally use their native interaction widgets instead; treating either
# as a Button would turn the probe into a fixture-only contract.
SURFACE_ACTION_PROBE_WIDGETS = {
    "TesseraDropdown": "DropDown2",
    "TesseraTooltip": "Button",
}

# Each overlay must prove its component-owned close path, then reopen and
# prove Escape closes the same visible panel. This is still runtime smoke, not
# AX or focus-return acceptance evidence.
OVERLAY_INTERACTION_PROBES = {
    "modal": ("modal_open", "modal_cancel", "modal_panel", ("closed",)),
    "drawer": ("drawer_open", "drawer_close", "drawer_panel", ("closed",)),
    # DropDown2 owns its popup subtree, so it has no stable detail-child ID to
    # inspect. Its typed Closed action is emitted only after set_closed().
    "dropdown": ("dropdown_trigger", None, None, ("closed",)),
    "popconfirm": (
        "popconfirm_trigger",
        "popconfirm_cancel",
        "popconfirm_panel",
        ("cancelled",),
    ),
    # Popover uses CalloutTooltip's owned subtree, not a popover_panel child.
    # A missing historical widget ID cannot prove that its overlay closed.
    "popover": ("popover_anchor", "popover_close", None, ("closed",)),
    # CalloutTooltip is likewise an owned native overlay. The target's typed
    # Hidden action calls CalloutTooltip::hide(), rather than hiding a fixture
    # View in the detail surface.
    "tooltip": ("tooltip_target", "tooltip_target", None, ("hidden",)),
    "notification": (
        "notification_show",
        "notification_hide",
        "notification_panel",
        ("hidden",),
    ),
}

# Atomic widgets are component-owned custom Makepad widgets, so their action
# target is the surface itself rather than a nested stock Button. Decorative
# primitives are deliberately non-interactive and are checked visually only.
ATOMIC_ACTION_PROBES = {
    "button": ("TesseraButton", "button_surface", "click"),
    "float-button": ("TesseraFloatButton", "float_button_surface", "click"),
    "typography": ("TesseraTypography", "typography_surface", "click"),
    "icon-button": ("TesseraIconButton", "icon_button_surface", "click"),
    "toolbar": ("TesseraToolbar", "toolbar_surface", "toolbar"),
    "tag": ("TesseraTag", "tag_surface", "right_click"),
    "avatar": ("TesseraAvatar", "avatar_surface", "click"),
}
VISUAL_ONLY_COMPONENTS = {
    "icon": "TesseraIcon",
    "divider": "TesseraDivider",
    "space": "TesseraSpace",
    "watermark": "TesseraWatermark",
    "badge": "TesseraBadge",
}

# The first independent chart routes are focusable canvas widgets rather than
# button-based surfaces. Each probe must both hit its own canvas and exercise
# a keyboard selection, so a gallery-level action cannot satisfy the check.
CHART_ACTION_PROBES = {
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

# Each foundational input owns a dedicated live widget and control tree. Keep
# the probe keyed by component slug so the smoke run cannot exercise another
# route's widget or controller.
INPUT_ACTION_PROBES = {
    "input": ("input_control", "text"),
    "textarea": ("textarea_control", "text"),
    "input-number": ("input_number_control", "text"),
    "checkbox": ("checkbox_control", "click"),
    "radio": ("radio_advanced", "click"),
    "switch": ("switch_control", "click"),
    "slider": ("slider_control", "click"),
    "select": ("select_control", "dropdown"),
}
INPUT_NUMBER_STEPPER_PROBE = "input_number_increment"
INPUT_NUMBER_KEYBOARD_PROBES = ("ArrowUp", "ArrowDown")

RUNTIME_INPUT_COMPONENTS = frozenset(INPUT_ACTION_PROBES)
INPUT_SURFACE_WIDGETS = {
    "input": "TesseraInput",
    "textarea": "TesseraTextarea",
    "input-number": "TesseraInputNumber",
    "checkbox": "TesseraCheckbox",
    "radio": "TesseraRadio",
    "switch": "TesseraSwitch",
    "slider": "TesseraSlider",
    "select": "TesseraSelect",
}
COMPOSITE_INPUT_ACTION_PROBES = {
    "auto-complete": ("auto_complete_choices", "click"),
    "mentions": ("mentions_choices", "click"),
    "color-picker": ("color_picker_choices", "click"),
    "date-picker": ("date_picker_choices", "click"),
    "time-picker": ("time_picker_choices", "click"),
}
RUNTIME_INPUT_COMPOSITE_COMPONENTS = frozenset(COMPOSITE_INPUT_ACTION_PROBES)
COMPOSITE_INPUT_CANCEL_PROBES = {
    "auto-complete": (None, "auto_complete_reset"),
    "mentions": (None, "mentions_reset"),
    "color-picker": (None, "color_picker_reset"),
    "date-picker": (None, "date_picker_reset"),
    "time-picker": (None, "time_picker_reset"),
}
ADVANCED_INPUT_ACTION_PROBES = {
    "cascader": ("cascader_parent", "click"),
    "tree-select": ("tree_select_node", "click"),
    "transfer": ("transfer_move", "click"),
    "upload": ("upload_stage", "click"),
    "form": ("form_submit", "click"),
}
ADVANCED_INPUT_SURFACE_WIDGETS = {
    "cascader": "TesseraCascader",
    "tree-select": "TesseraTreeSelect",
    "transfer": "TesseraTransfer",
    "upload": "TesseraUpload",
    "form": "TesseraForm",
}
RUNTIME_ADVANCED_INPUT_COMPONENTS = frozenset(ADVANCED_INPUT_ACTION_PROBES)
ADVANCED_INPUT_CANCEL_PROBES = {
    "cascader": None,
    "tree-select": None,
    "transfer": None,
    "upload": None,
}
ADVANCED_INPUT_CANCEL_OPEN_PROBES = {
    "transfer": "transfer_source",
}
ADVANCED_INPUT_RESET_PROBES = {
    "cascader": "cascader_reset",
    "tree-select": "tree_select_reset",
    "transfer": "transfer_reset",
    "upload": "upload_reset",
    "form": "form_reset",
}
BLOCKED_INPUT_COMPONENTS = frozenset()

INPUT_COMPONENT_NAMES = {
    "input": "Input",
    "textarea": "Textarea",
    "input-number": "InputNumber",
    "checkbox": "Checkbox",
    "radio": "Radio",
    "switch": "Switch",
    "slider": "Slider",
    "select": "Select",
}


@dataclass
class ComponentResult:
    component: str
    theme: str
    viewport: str
    passed: bool
    checks: dict[str, bool]
    component_name: str = ""
    surface_status: str = ""
    surface_widget: str = ""
    surface_disposition: str = "not_checked"
    surface_check: str = "not_run"
    action_check: str = "not_run"
    action_status: str = ""
    cancel_status: str = ""
    reset_status: str = ""
    errors: list[str] | None = None
    capture: str | None = None


@dataclass
class CatalogEntryResult:
    theme: str
    viewport: str
    passed: bool
    checks: dict[str, bool]
    opened_component: str = ""
    errors: list[str] | None = None
    capture: str | None = None


@dataclass
class RunningInstance:
    """One runner-owned Gallery launch.

    Direct binary launches have a ``Popen`` handle. LaunchServices only gives
    us the app PID through Makepad's local remote endpoint, so the instance
    binds that PID after the endpoint responds. Both paths are deliberately
    bounded and may only terminate the process this runner launched.
    """

    process: subprocess.Popen[str] | None = None
    remote_pid: int | None = None
    log_path: Path | None = None
    launch_mode: str = "binary"

    def bind_status(self, status: dict[str, Any]) -> None:
        if self.launch_mode != "app_bundle":
            return
        pid = status.get("pid")
        if not isinstance(pid, int) or pid <= 0:
            raise ValueError("LaunchServices status has no valid app PID")
        self.remote_pid = pid

    def has_exited(self) -> bool:
        if self.process is not None:
            return self.process.poll() is not None
        if self.remote_pid is None:
            return False
        try:
            os.kill(self.remote_pid, 0)
        except ProcessLookupError:
            return True
        except PermissionError:
            return False
        return False

    def failure_detail(self) -> str:
        if self.process is not None and self.log_path is not None:
            return self.log_path.read_text(encoding="utf-8", errors="replace")
        if self.remote_pid is not None:
            return f"LaunchServices app process {self.remote_pid} exited"
        return "LaunchServices did not expose an app process"

    def terminate(self) -> None:
        if self.process is not None:
            self.process.terminate()
            return
        if self.remote_pid is not None and not self.has_exited():
            os.kill(self.remote_pid, signal.SIGTERM)


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_viewport(value: str) -> tuple[int, int]:
    try:
        width_text, height_text = value.split("x", 1)
        width = int(width_text)
        height = int(height_text)
    except ValueError as error:
        raise argparse.ArgumentTypeError("viewport must be WIDTHxHEIGHT") from error
    if not (320 <= width <= 7680 and 320 <= height <= 4320):
        raise argparse.ArgumentTypeError("viewport must be within 320x320 to 7680x4320")
    return width, height


def parse_capture_scale(value: str) -> float:
    try:
        scale = float(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("capture scale must be a number") from error
    if not 0.25 <= scale <= 1.0:
        raise argparse.ArgumentTypeError("capture scale must be within 0.25 and 1.0")
    return scale


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def remote_json(port: int, path: str) -> dict[str, Any]:
    url = f"http://127.0.0.1:{port}{path}"
    with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        payload = response.read().decode("utf-8")
    value = json.loads(payload)
    if not isinstance(value, dict):
        raise ValueError(f"remote response for {path} is not an object")
    return value


def wait_for_remote(port: int, instance: RunningInstance) -> dict[str, Any]:
    deadline = time.monotonic() + START_TIMEOUT_SECONDS
    last_error = "remote endpoint did not respond"
    while time.monotonic() < deadline:
        if instance.has_exited():
            raise RuntimeError(f"process exited before remote startup: {instance.failure_detail()}")
        try:
            status = remote_json(port, "/status")
            instance.bind_status(status)
            return status
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as error:
            last_error = str(error)
            time.sleep(0.1)
    raise RuntimeError(last_error)


def first_widget(port: int, widget_id: str) -> dict[str, Any]:
    snapshot = remote_json(port, "/snap?all=1&q=" + urllib.parse.quote(widget_id, safe=""))
    entries = snapshot.get("s")
    if not isinstance(entries, list):
        raise ValueError(f"snapshot for {widget_id} has no widget list")
    for entry in entries:
        if isinstance(entry, dict) and entry.get("i") == widget_id:
            return entry
    raise ValueError(f"widget {widget_id} was not present")


def visible_widgets(port: int, widget_id: str) -> list[dict[str, Any]]:
    snapshot = remote_json(port, "/snap?all=1&q=" + urllib.parse.quote(widget_id, safe=""))
    entries = snapshot.get("s")
    if not isinstance(entries, list):
        raise ValueError(f"snapshot for {widget_id} has no widget list")
    visible = [
        entry
        for entry in entries
        if isinstance(entry, dict) and entry.get("i") == widget_id and entry.get("v") != 0
    ]
    if visible:
        return visible
    raise ValueError(f"visible widget {widget_id} was not present")


def visible_widget(port: int, widget_id: str) -> dict[str, Any]:
    visible = visible_widgets(port, widget_id)
    if visible:
        return visible[0]
    raise ValueError(f"visible widget {widget_id} was not present")


def wait_for_widget(
    port: int,
    instance: RunningInstance,
    widget_id: str,
) -> dict[str, Any]:
    deadline = time.monotonic() + START_TIMEOUT_SECONDS
    last_error = f"widget {widget_id} was not present"
    while time.monotonic() < deadline:
        if instance.has_exited():
            raise RuntimeError(f"process exited before first frame: {instance.failure_detail()}")
        try:
            entry = visible_widget(port, widget_id)
            widget_rect(entry)
            return entry
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as error:
            last_error = str(error)
            time.sleep(0.1)
    raise RuntimeError(last_error)


def widget_rect(entry: dict[str, Any]) -> tuple[float, float, float, float]:
    rect = entry.get("r")
    if not isinstance(rect, list) or len(rect) != 4:
        raise ValueError("widget has no rectangle")
    values = tuple(float(value) for value in rect)
    if values[2] <= 0 or values[3] <= 0:
        raise ValueError("widget is not visible")
    return values


def widget_text(entry: dict[str, Any]) -> str:
    text = entry.get("t")
    return text if isinstance(text, str) else ""


def parse_surface_status(value: str) -> tuple[str, str]:
    if value.startswith("Native surface: "):
        payload = value.removeprefix("Native surface: ")
        widget, separator, route = payload.partition(" / route ")
        if widget and separator and route:
            return "connected", widget
        raise ValueError(f"native surface status is malformed: {value!r}")
    if value.startswith("Blocked: "):
        return "blocked", ""
    raise ValueError(f"unknown surface status: {value!r}")


def rect_center(rect: tuple[float, float, float, float]) -> tuple[float, float]:
    x, y, width, height = rect
    return x + width / 2.0, y + height / 2.0


def center_is_inside(
    rect: tuple[float, float, float, float],
    viewport: tuple[float, float, float, float],
) -> bool:
    x, y = rect_center(rect)
    left, top, width, height = viewport
    return left <= x <= left + width and top <= y <= top + height


def scroll_widget_into_view(
    port: int,
    instance: RunningInstance,
    widget_id: str,
) -> dict[str, Any]:
    """Bring a widget into the scroll viewport through a real scroll event.

    Makepad reports clipped widget rectangles. Checking the target center against
    the content viewport prevents a partially clipped control from being used as
    a click target while preserving the normal scroll path used by a user.
    """

    last_error = f"widget {widget_id} was not visible in the content viewport"
    for _ in range(SCROLL_ATTEMPTS):
        try:
            target = visible_widget(port, widget_id)
            viewport = widget_rect(first_widget(port, "content_scroll"))
            target_rect = widget_rect(target)
            if center_is_inside(target_rect, viewport):
                return target
            last_error = (
                f"widget {widget_id} center {rect_center(target_rect)} is outside "
                f"content viewport {viewport}"
            )
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as error:
            last_error = str(error)

        if instance.has_exited():
            raise RuntimeError(
                f"process exited while scrolling to {widget_id}: {instance.failure_detail()}"
            )
        viewport = widget_rect(first_widget(port, "content_scroll"))
        x, y = rect_center(viewport)
        query = urllib.parse.urlencode(
            {"k": "scroll", "x": round(x), "y": round(y), "dy": SCROLL_STEP, "wait": 1}
        )
        response = remote_json(port, "/m?" + query)
        if response.get("ok") != 1:
            raise RuntimeError(f"scroll failed while seeking {widget_id}: {response}")

    raise RuntimeError(last_error)


def click_widget_at(
    port: int,
    entry: dict[str, Any],
    x_fraction: float = 0.5,
    y_fraction: float = 0.5,
) -> None:
    x, y, width, height = widget_rect(entry)
    x_fraction = min(1.0, max(0.0, x_fraction))
    y_fraction = min(1.0, max(0.0, y_fraction))
    query = urllib.parse.urlencode(
        {
            "x": round(x + width * x_fraction),
            "y": round(y + height * y_fraction),
            "wait": 1,
        }
    )
    response = remote_json(port, "/click?" + query)
    if response.get("ok") != 1:
        raise RuntimeError(f"click failed: {response}")


def click_widget(port: int, entry: dict[str, Any]) -> None:
    click_widget_at(port, entry)


def press_key(port: int, key_code: str, primary: bool = False) -> None:
    params: dict[str, str | int] = {"k": "down", "c": key_code, "wait": 1}
    if primary:
        # Makepad maps the platform primary modifier to Command on Apple and
        # Control elsewhere. This keeps the input probe portable while still
        # exercising TextInput's real select-all path.
        params["cmd" if sys.platform == "darwin" else "ctrl"] = 1
    query = urllib.parse.urlencode(params)
    response = remote_json(port, "/k?" + query)
    if response.get("ok") != 1:
        raise RuntimeError(f"key press failed: {response}")


def type_into_widget(port: int, entry: dict[str, Any], value: str) -> None:
    click_widget(port, entry)
    press_key(port, "KeyA", primary=True)
    query = urllib.parse.urlencode({"t": value, "wait": 1})
    response = remote_json(port, "/text?" + query)
    if response.get("ok") != 1:
        raise RuntimeError(f"text input failed: {response}")


def wait_for_hidden_widget(
    port: int,
    instance: RunningInstance,
    widget_id: str,
) -> None:
    deadline = time.monotonic() + START_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        if instance.has_exited():
            raise RuntimeError(f"process exited while closing {widget_id}: {instance.failure_detail()}")
        try:
            visible_widget(port, widget_id)
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError):
            return
        time.sleep(0.1)
    raise RuntimeError(f"widget {widget_id} remained visible")


def inspect_component_surface(
    port: int,
    instance: RunningInstance,
    status: str,
) -> tuple[str, str, str]:
    """Validate the detail surface without treating blocked routes as passes.

    A connected route must expose its declared concrete widget. A blocked route
    is still a valid route-level smoke result, but it is reported as
    ``route_fallback`` and never upgraded to a component implementation.
    """

    disposition, widget_name = parse_surface_status(status)
    if disposition == "blocked":
        return disposition, widget_name, "route_fallback"

    widget_id = SURFACE_WIDGET_IDS.get(widget_name)
    if widget_id is None:
        raise ValueError(f"surface status names an unknown widget: {widget_name!r}")
    scroll_widget_into_view(port, instance, widget_id)
    return disposition, widget_name, "concrete_surface"


def input_action_probe(component: str, surface_widget: str) -> tuple[str, str] | None:
    if input_route_is_runtime_connected(component, surface_widget):
        return INPUT_ACTION_PROBES.get(component)
    if advanced_input_route_is_runtime_connected(component, surface_widget):
        return ADVANCED_INPUT_ACTION_PROBES.get(component)
    return COMPOSITE_INPUT_ACTION_PROBES.get(component)


def chart_action_probe(component: str, surface_widget: str) -> tuple[str, str] | None:
    expected = CHART_ACTION_PROBES.get(component)
    if expected is None or expected[0] != surface_widget:
        return None
    return expected[1], "chart"


def atomic_action_probe(component: str, surface_widget: str) -> tuple[str, str] | None:
    expected = ATOMIC_ACTION_PROBES.get(component)
    if expected is None or expected[0] != surface_widget:
        return None
    return expected[1], expected[2]


def component_is_visual_only(component: str, surface_widget: str) -> bool:
    return VISUAL_ONLY_COMPONENTS.get(component) == surface_widget


def input_route_is_runtime_connected(component: str, surface_widget: str) -> bool:
    return INPUT_SURFACE_WIDGETS.get(component) == surface_widget


def advanced_input_route_is_runtime_connected(component: str, surface_widget: str) -> bool:
    return ADVANCED_INPUT_SURFACE_WIDGETS.get(component) == surface_widget


def component_action_status_matches(
    component: str,
    component_name: str,
    surface_widget: str,
    action_check: str,
    action_status: str,
) -> bool:
    if action_check != "component_specific":
        return False
    if input_route_is_runtime_connected(component, surface_widget):
        expected_name = INPUT_COMPONENT_NAMES.get(component)
        if expected_name is None:
            return False
        return action_status.startswith(
            f"{expected_name} input "
        ) or action_status.startswith(f"{expected_name} input validation failed")
    if surface_widget in INPUT_SURFACE_WIDGETS.values():
        return False
    return component_name in action_status


def overlay_close_status_matches(
    component_name: str, action_status: str, expected_words: tuple[str, ...]
) -> bool:
    lower_status = action_status.lower()
    return component_name in action_status and any(
        word in lower_status for word in expected_words
    )


def overlay_open_status_matches(component_name: str, action_status: str) -> bool:
    lower_status = action_status.lower()
    return component_name in action_status and (
        "opened" in lower_status or "shown" in lower_status
    )


def cleanup_grabs(response: dict[str, Any], keep_capture: bool, destination: Path) -> str | None:
    pngs = response.get("png")
    if isinstance(pngs, str):
        pngs = [pngs]
    if not isinstance(pngs, list):
        return None
    paths = [Path(value) for value in pngs if isinstance(value, str)]
    if not paths:
        return None
    capture_path = paths[0]
    saved_path = None
    if keep_capture:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(capture_path, destination)
        saved_path = str(destination)

    temp_root = (Path(tempfile.gettempdir()) / "makepad-remote").resolve()
    capture_dir = capture_path.parent.resolve()
    try:
        relative = capture_dir.relative_to(temp_root)
    except ValueError:
        return saved_path
    if relative.parts and not destination.resolve().is_relative_to(capture_dir):
        shutil.rmtree(capture_dir, ignore_errors=True)
    return saved_path


def app_bundle_executable(app: Path) -> Path:
    """Resolve the declared executable without assuming a working directory."""

    info_path = app / "Contents" / "Info.plist"
    if not app.is_dir() or app.suffix != ".app" or not info_path.is_file():
        raise ValueError(f"application bundle is invalid: {app}")
    try:
        with info_path.open("rb") as source:
            info = plistlib.load(source)
    except (OSError, plistlib.InvalidFileException) as error:
        raise ValueError(f"application bundle has an invalid Info.plist: {app}") from error
    executable_name = info.get("CFBundleExecutable")
    if not isinstance(executable_name, str) or not executable_name or Path(executable_name).name != executable_name:
        raise ValueError(f"application bundle has an invalid executable name: {app}")
    executable = app / "Contents" / "MacOS" / executable_name
    if not executable.is_file() or not os.access(executable, os.X_OK):
        raise ValueError(f"application bundle executable is not usable: {executable}")
    return executable


def launch_arguments(
    component: str | None,
    theme: str,
    viewport: tuple[int, int],
    port: int,
) -> list[str]:
    # Makepad consumes remote-control flags during its first argument pass.
    # Keep them before Gallery-owned startup options so the smoke endpoint is
    # available for every independently launched route.
    arguments = [
        f"--remote={port}",
        "--remote-title-tag=smoke",
    ]
    if component is not None:
        arguments.append(f"--component={component}")
    arguments.extend((f"--{theme}", f"--viewport={viewport[0]}x{viewport[1]}"))
    return arguments


def launch_instance(
    binary: Path | None,
    app: Path | None,
    cwd: Path,
    component: str | None,
    theme: str,
    viewport: tuple[int, int],
    port: int,
) -> RunningInstance:
    arguments = launch_arguments(component, theme, viewport, port)
    if app is not None:
        launched = subprocess.run(
            ["open", "-n", str(app), "--args", *arguments],
            capture_output=True,
            text=True,
            check=False,
        )
        if launched.returncode != 0:
            detail = (launched.stderr or launched.stdout).strip()
            raise RuntimeError(f"LaunchServices failed to open {app}: {detail}")
        return RunningInstance(launch_mode="app_bundle")

    assert binary is not None
    temporary_log = Path(tempfile.mkdtemp(prefix="tessera-makepad-smoke-")) / "app.log"
    with temporary_log.open("w", encoding="utf-8") as log_file:
        process = subprocess.Popen(
            [str(binary), *arguments],
            cwd=cwd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )
    return RunningInstance(process=process, log_path=temporary_log)


def close_instance(
    port: int,
    instance: RunningInstance,
    keep_capture: bool,
    destination: Path,
    capture_scale: float,
) -> tuple[str | None, list[str]]:
    errors: list[str] = []
    capture: str | None = None
    try:
        if keep_capture:
            destination.parent.mkdir(parents=True, exist_ok=True)
            snapshot = remote_json(port, "/snap?all=1")
            destination.with_suffix(".widgets.json").write_text(
                json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        quit_path = (
            "/quit"
            if instance.launch_mode == "app_bundle"
            else f"/gq?scale={capture_scale:g}"
        )
        response = remote_json(port, quit_path)
        quit_accepted = response.get("ok") == 1 if instance.launch_mode == "app_bundle" else response.get("quit") == 1
        if not quit_accepted:
            errors.append(f"remote quit rejected: {response}")
        elif instance.launch_mode != "app_bundle":
            capture = cleanup_grabs(response, keep_capture, destination)
    except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as error:
        errors.append(f"remote gq failed: {error}")
        try:
            remote_json(port, "/quit")
        except (OSError, ValueError, urllib.error.URLError, urllib.error.HTTPError) as quit_error:
            errors.append(f"remote quit fallback failed: {quit_error}")

    deadline = time.monotonic() + EXIT_TIMEOUT_SECONDS
    while time.monotonic() < deadline and not instance.has_exited():
        time.sleep(0.1)
    if not instance.has_exited():
        # The process belongs to this runner. A failed remote protocol must not
        # leave a test window on the user's screen.
        instance.terminate()
        deadline = time.monotonic() + EXIT_TIMEOUT_SECONDS
        while time.monotonic() < deadline and not instance.has_exited():
            time.sleep(0.1)
        errors.append("process required local termination after remote shutdown")
    if instance.process is not None and instance.process.returncode not in (0, None):
        errors.append(f"process exited with {instance.process.returncode}")
    return capture, errors


def component_ids(manifest_path: Path) -> tuple[list[str], dict[str, int]]:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    entries = payload.get("components")
    if not isinstance(entries, list):
        raise ValueError("manifest components must be an array")
    ids = [entry.get("id") for entry in entries if isinstance(entry, dict)]
    if not all(isinstance(component, str) and component for component in ids):
        raise ValueError("manifest includes an invalid component id")
    if len(ids) != len(set(ids)):
        raise ValueError("manifest includes duplicate component ids")
    expected = payload.get("component_count")
    if expected != len(ids):
        raise ValueError(f"manifest count {expected!r} does not match {len(ids)} entries")
    statuses: dict[str, int] = {}
    for entry in entries:
        if isinstance(entry, dict) and isinstance(entry.get("status"), str):
            status = entry["status"]
            statuses[status] = statuses.get(status, 0) + 1
    return ids, statuses


def exercise_component(
    binary: Path | None,
    app: Path | None,
    cwd: Path,
    output_dir: Path,
    component: str,
    theme: str,
    viewport: tuple[int, int],
    capture: bool,
    capture_scale: float = DEFAULT_CAPTURE_SCALE,
) -> ComponentResult:
    port = free_port()
    checks = {
        "window": False,
        "component_slug": False,
        "surface": False,
        "surface_disposition": False,
        "theme": False,
        "surface_check": False,
        "action": False,
        "cancel": True,
        "reset": True,
        "runtime_log": False,
        "clean_exit": False,
    }
    errors: list[str] = []
    component_name = ""
    surface_status = ""
    surface_widget = ""
    surface_disposition = "not_checked"
    surface_check = "not_run"
    action_check = "not_run"
    action_status = ""
    cancel_status = ""
    reset_status = ""
    saved_capture: str | None = None
    instance: RunningInstance | None = None

    try:
        instance = launch_instance(binary, app, cwd, component, theme, viewport, port)
        wait_for_remote(port, instance)
        component_category = wait_for_widget(port, instance, "component_category")
        status = remote_json(port, "/status")
        windows = status.get("w")
        checks["window"] = (
            isinstance(windows, list)
            and len(windows) == 1
            and isinstance(windows[0], dict)
            and windows[0].get("sz") == [viewport[0], viewport[1]]
        )

        checks["component_slug"] = widget_text(component_category).endswith(f" / {component}")

        component_name = widget_text(first_widget(port, "component_name"))
        scroll_widget_into_view(port, instance, "component_surface")
        surface_status_entry = wait_for_widget(port, instance, "surface_status")
        surface_status = widget_text(surface_status_entry)
        checks["surface"] = bool(component_name and surface_status)
        (
            surface_disposition,
            surface_widget,
            surface_check,
        ) = inspect_component_surface(port, instance, surface_status)
        checks["surface_disposition"] = surface_disposition in {"connected", "blocked"}
        checks["surface_check"] = surface_check in {"concrete_surface", "route_fallback"}

        theme_status = widget_text(first_widget(port, "theme_status"))
        checks["theme"] = f"Requested {theme.title()} -> resolved {theme.title()}" in theme_status

        action_status = widget_text(first_widget(port, "component_action_status"))
        if surface_disposition == "connected":
            if component_is_visual_only(component, surface_widget):
                action_check = "visual_only"
                action_status = "No input path: visual-only native primitive."
                checks["action"] = True
            else:
                probe = (
                    chart_action_probe(component, surface_widget)
                    or input_action_probe(component, surface_widget)
                    or atomic_action_probe(component, surface_widget)
                )
                probe_kind = "click"
                if probe is not None:
                    probe, probe_kind = probe
                else:
                    probe = SURFACE_ACTION_PROBES.get(surface_widget)
                previous_action_status = action_status
                if probe is None:
                    action_check = "missing_component_probe"
                else:
                    if component == "result":
                        # Retry is intentionally visible only in the failed
                        # state. Enter that state through Result's own
                        # component control before probing its recovery action.
                        click_widget(
                            port,
                            scroll_widget_into_view(port, instance, "result_error"),
                        )
                    target = scroll_widget_into_view(port, instance, probe)
                    if probe_kind == "text":
                        value = "43" if component == "input-number" else "smoke input"
                        type_into_widget(port, target, value)
                    elif probe_kind == "dropdown":
                        click_widget(port, target)
                        press_key(port, "ArrowDown")
                        press_key(port, "Enter")
                    elif probe_kind == "chart":
                        click_widget(port, target)
                        press_key(port, "ArrowRight")
                    elif probe_kind == "right_click":
                        click_widget_at(port, target, 0.9)
                    elif probe_kind == "toolbar":
                        # The toolbar's remaining width is intentionally inert.
                        # Hit the first 36-DIP command in its fixed 40-DIP slot.
                        click_widget_at(port, target, 20.0 / widget_rect(target)[2])
                    else:
                        click_widget(port, target)
                    action_check = "component_specific"
                action_status = widget_text(first_widget(port, "component_action_status"))
                checks["action"] = (
                    action_status != previous_action_status
                    and component_action_status_matches(
                        component,
                        component_name,
                        surface_widget,
                        action_check,
                        action_status,
                    )
                )
            if component == "input-number":
                increment = scroll_widget_into_view(
                    port,
                    instance,
                    INPUT_NUMBER_STEPPER_PROBE,
                )
                previous_stepper_status = action_status
                click_widget(port, increment)
                action_status = widget_text(first_widget(port, "component_action_status"))
                checks["action"] = (
                    checks["action"]
                    and action_status != previous_stepper_status
                    and component_action_status_matches(
                        component,
                        component_name,
                        surface_widget,
                        action_check,
                        action_status,
                    )
                )
                keyboard_target = scroll_widget_into_view(
                    port,
                    instance,
                    INPUT_ACTION_PROBES[component][0],
                )
                click_widget(port, keyboard_target)
                for key_code in INPUT_NUMBER_KEYBOARD_PROBES:
                    previous_keyboard_status = action_status
                    press_key(port, key_code)
                    action_status = widget_text(first_widget(port, "component_action_status"))
                    checks["action"] = (
                        checks["action"]
                        and action_status != previous_keyboard_status
                        and component_action_status_matches(
                            component,
                            component_name,
                            surface_widget,
                            action_check,
                            action_status,
                        )
                    )
            if component in RUNTIME_INPUT_COMPOSITE_COMPONENTS:
                overlay_id, reset_id = COMPOSITE_INPUT_CANCEL_PROBES[component]
                press_key(port, "Escape")
                cancel_status = widget_text(first_widget(port, "component_action_status"))
                if overlay_id is not None:
                    wait_for_hidden_widget(port, instance, overlay_id)
                checks["cancel"] = (
                    cancel_status != action_status
                    and component_name in cancel_status
                    and "cancelled" in cancel_status.lower()
                )
                click_widget(port, scroll_widget_into_view(port, instance, reset_id))
                reset_status = widget_text(first_widget(port, "component_action_status"))
                checks["reset"] = (
                    reset_status != cancel_status
                    and component_name in reset_status
                    and "reset" in reset_status.lower()
                )
            elif component in RUNTIME_ADVANCED_INPUT_COMPONENTS:
                cancel_probe = ADVANCED_INPUT_CANCEL_PROBES.get(component)
                previous_reset_status = action_status
                if component in ADVANCED_INPUT_CANCEL_PROBES:
                    cancel_open_probe = ADVANCED_INPUT_CANCEL_OPEN_PROBES.get(component)
                    if cancel_open_probe is not None:
                        click_widget(
                            port,
                            scroll_widget_into_view(port, instance, cancel_open_probe),
                        )
                    press_key(port, "Escape")
                    cancel_status = widget_text(first_widget(port, "component_action_status"))
                    if cancel_probe is not None:
                        wait_for_hidden_widget(port, instance, cancel_probe)
                    checks["cancel"] = (
                        cancel_status != action_status
                        and component_name in cancel_status
                        and "cancelled" in cancel_status.lower()
                    )
                    previous_reset_status = cancel_status
                reset_id = ADVANCED_INPUT_RESET_PROBES[component]
                click_widget(port, scroll_widget_into_view(port, instance, reset_id))
                reset_status = widget_text(first_widget(port, "component_action_status"))
                checks["reset"] = (
                    reset_status != previous_reset_status
                    and component_name in reset_status
                    and "reset" in reset_status.lower()
                )
            if component in OVERLAY_INTERACTION_PROBES:
                trigger_id, explicit_close_id, hidden_id, expected_words = (
                    OVERLAY_INTERACTION_PROBES[component]
                )
                if component == "tooltip":
                    # A native pointer sequence can hover-show then click-hide a
                    # tooltip. Observe the component's own Shown action before
                    # exercising its explicit click close path.
                    if not overlay_open_status_matches(component_name, action_status):
                        click_widget(
                            port,
                            scroll_widget_into_view(port, instance, trigger_id),
                        )
                    opened_status = widget_text(first_widget(port, "component_action_status"))
                    if not overlay_open_status_matches(component_name, opened_status):
                        raise RuntimeError("tooltip target did not produce its native shown action")
                if component == "dropdown":
                    # The selector retains focus while its native popup is open;
                    # Tab is the component-owned explicit close path.
                    press_key(port, "Tab")
                elif component == "tooltip":
                    # Tooltip disclosure is hover/focus-owned. Escape is the
                    # deterministic explicit close path because a remote click
                    # begins with hover-in and would close the tooltip before
                    # the click sequence has finished.
                    press_key(port, "Escape")
                else:
                    assert explicit_close_id is not None
                    click_widget(
                        port,
                        scroll_widget_into_view(port, instance, explicit_close_id),
                    )
                cancel_status = widget_text(first_widget(port, "component_action_status"))
                if hidden_id is not None:
                    wait_for_hidden_widget(port, instance, hidden_id)
                checks["cancel"] = (
                    cancel_status != action_status
                    and overlay_close_status_matches(
                        component_name, cancel_status, expected_words
                    )
                )

                click_widget(
                    port,
                    scroll_widget_into_view(port, instance, trigger_id),
                )
                reopened_status = widget_text(first_widget(port, "component_action_status"))
                press_key(port, "Escape")
                reset_status = widget_text(first_widget(port, "component_action_status"))
                if hidden_id is not None:
                    wait_for_hidden_widget(port, instance, hidden_id)
                checks["reset"] = (
                    reopened_status != cancel_status
                    and reset_status != reopened_status
                    and overlay_close_status_matches(
                        component_name, reset_status, expected_words
                    )
                )
        else:
            action_check = "blocked"
            checks["action"] = "blocked" in action_status.lower()

        log = remote_json(port, "/log?n=200")
        lines = log.get("l")
        log_errors = [
            line
            for line in lines if isinstance(line, str) and "[E]" in line
        ] if isinstance(lines, list) else ["remote log response has no line array"]
        checks["runtime_log"] = not log_errors
        errors.extend(log_errors)
    except (OSError, ValueError, RuntimeError, urllib.error.URLError, urllib.error.HTTPError) as error:
        errors.append(str(error))
    finally:
        if instance is not None:
            destination = output_dir / "captures" / f"{component}-{theme}.png"
            saved_capture, close_errors = close_instance(
                port,
                instance,
                capture,
                destination,
                capture_scale,
            )
            errors.extend(close_errors)
            checks["clean_exit"] = not close_errors
            if instance.log_path is not None:
                shutil.rmtree(instance.log_path.parent, ignore_errors=True)

    passed = all(checks.values()) and not errors
    return ComponentResult(
        component=component,
        theme=theme,
        viewport=f"{viewport[0]}x{viewport[1]}",
        passed=passed,
        checks=checks,
        component_name=component_name,
        surface_status=surface_status,
        surface_widget=surface_widget,
        surface_disposition=surface_disposition,
        surface_check=surface_check,
        action_check=action_check,
        action_status=action_status,
        cancel_status=cancel_status,
        reset_status=reset_status,
        errors=errors,
        capture=saved_capture,
    )


def exercise_catalog_entry(
    binary: Path | None,
    app: Path | None,
    cwd: Path,
    output_dir: Path,
    theme: str,
    viewport: tuple[int, int],
    capture: bool,
    capture_scale: float = DEFAULT_CAPTURE_SCALE,
) -> CatalogEntryResult:
    """Prove that the user-facing default route can enter and leave a detail page."""

    port = free_port()
    checks = {
        "window": False,
        "catalog": False,
        "open": False,
        "detail": False,
        "back": False,
        "runtime_log": False,
        "clean_exit": False,
    }
    errors: list[str] = []
    opened_component = ""
    saved_capture: str | None = None
    instance: RunningInstance | None = None

    try:
        instance = launch_instance(binary, app, cwd, None, theme, viewport, port)
        wait_for_remote(port, instance)
        catalog = wait_for_widget(port, instance, "component_catalog")
        status = remote_json(port, "/status")
        windows = status.get("w")
        checks["window"] = (
            isinstance(windows, list)
            and len(windows) == 1
            and isinstance(windows[0], dict)
            and windows[0].get("sz") == [viewport[0], viewport[1]]
        )
        checks["catalog"] = bool(widget_rect(catalog))

        open_button = min(
            visible_widgets(port, "open_button"),
            key=lambda entry: (widget_rect(entry)[1], widget_rect(entry)[0]),
        )
        click_widget(port, open_button)
        component_name = wait_for_widget(port, instance, "component_name")
        opened_component = widget_text(component_name)
        wait_for_widget(port, instance, "content_scroll")
        wait_for_hidden_widget(port, instance, "catalog_page")
        checks["open"] = opened_component == "Button"
        checks["detail"] = bool(widget_rect(component_name))

        click_widget(port, wait_for_widget(port, instance, "component_back"))
        wait_for_widget(port, instance, "component_catalog")
        wait_for_hidden_widget(port, instance, "content_scroll")
        checks["back"] = True

        log = remote_json(port, "/log?n=200")
        lines = log.get("l")
        log_errors = (
            [line for line in lines if isinstance(line, str) and "[E]" in line]
            if isinstance(lines, list)
            else ["remote log response has no line array"]
        )
        checks["runtime_log"] = not log_errors
        errors.extend(log_errors)
    except (OSError, ValueError, RuntimeError, urllib.error.URLError, urllib.error.HTTPError) as error:
        errors.append(str(error))
    finally:
        if instance is not None:
            destination = output_dir / "captures" / f"catalog-entry-{theme}.png"
            saved_capture, close_errors = close_instance(
                port,
                instance,
                capture,
                destination,
                capture_scale,
            )
            errors.extend(close_errors)
            checks["clean_exit"] = not close_errors
            if instance.log_path is not None:
                shutil.rmtree(instance.log_path.parent, ignore_errors=True)

    return CatalogEntryResult(
        theme=theme,
        viewport=f"{viewport[0]}x{viewport[1]}",
        passed=all(checks.values()) and not errors,
        checks=checks,
        opened_component=opened_component,
        errors=errors,
        capture=saved_capture,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    launch_target = parser.add_mutually_exclusive_group(required=True)
    launch_target.add_argument("--binary", type=Path, help="release tessera-gallery binary")
    launch_target.add_argument(
        "--app",
        type=Path,
        help="macOS .app bundle launched through LaunchServices with open -n",
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--cwd", type=Path, default=DEFAULT_CWD, help="working directory for the app")
    parser.add_argument("--out", required=True, type=Path, help="new report directory outside the source tree")
    parser.add_argument("--themes", default="light,dark", help="comma-separated subset of light,dark")
    parser.add_argument(
        "--components",
        default="",
        help="comma-separated component slug subset for a diagnostic run",
    )
    parser.add_argument("--viewport", default="1240x800", type=parse_viewport)
    parser.add_argument("--limit", type=int, default=0, help="limit components for a diagnostic run")
    parser.add_argument("--capture", action="store_true", help="retain one PNG per component/theme")
    parser.add_argument(
        "--capture-scale",
        type=parse_capture_scale,
        default=DEFAULT_CAPTURE_SCALE,
        help="PNG scale from 0.25 through 1.0; use 1.0 for visual review",
    )
    parser.add_argument(
        "--require-product-acceptance",
        action="store_true",
        help="fail when the manifest is not fully verified, even when smoke passes",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    binary = args.binary.resolve() if args.binary is not None else None
    app = args.app.resolve() if args.app is not None else None
    cwd = args.cwd.resolve()
    output_dir = args.out.resolve()
    manifest = args.manifest.resolve()
    if binary is not None and (not binary.is_file() or not os.access(binary, os.X_OK)):
        raise SystemExit(f"release binary is not executable: {binary}")
    if app is not None:
        try:
            binary = app_bundle_executable(app)
        except ValueError as error:
            raise SystemExit(str(error)) from error
        if args.capture:
            raise SystemExit("--capture is not supported with --app; LaunchServices runs close through /quit")
    if not cwd.is_dir():
        raise SystemExit(f"working directory does not exist: {cwd}")
    if not manifest.is_file():
        raise SystemExit(f"manifest does not exist: {manifest}")
    if output_dir.exists():
        raise SystemExit(f"refusing to overwrite existing output: {output_dir}")
    try:
        output_dir.relative_to(ROOT)
    except ValueError:
        pass
    else:
        raise SystemExit("output must stay outside the source tree")
    if args.limit < 0:
        raise SystemExit("limit must not be negative")

    themes = [theme.strip().lower() for theme in args.themes.split(",") if theme.strip()]
    if not themes or any(theme not in {"light", "dark"} for theme in themes):
        raise SystemExit("themes must be a non-empty comma-separated subset of light,dark")

    components, manifest_statuses = component_ids(manifest)
    if args.components:
        requested_components = [item.strip() for item in args.components.split(",") if item.strip()]
        unknown_components = sorted(set(requested_components) - set(components))
        if unknown_components:
            raise SystemExit(f"unknown component slugs: {', '.join(unknown_components)}")
        components = [component for component in components if component in set(requested_components)]
    if args.limit:
        components = components[: args.limit]
    output_dir.mkdir(parents=True)
    started_at = utc_now()
    catalog_entry_results: list[CatalogEntryResult] = []
    for theme in themes:
        result = exercise_catalog_entry(
            binary,
            app,
            cwd,
            output_dir,
            theme,
            args.viewport,
            args.capture,
            args.capture_scale,
        )
        catalog_entry_results.append(result)
        state = "PASS" if result.passed else "FAIL"
        print(f"{state} catalog-entry {theme}", flush=True)

    results: list[ComponentResult] = []
    for component in components:
        for theme in themes:
            result = exercise_component(
                binary,
                app,
                cwd,
                output_dir,
                component,
                theme,
                args.viewport,
                args.capture,
                args.capture_scale,
            )
            results.append(result)
            state = "PASS" if result.passed else "FAIL"
            print(f"{state} {component} {theme}", flush=True)

    failed = [result for result in results if not result.passed]
    failed_catalog_entries = [result for result in catalog_entry_results if not result.passed]
    surface_check_modes: dict[str, int] = {}
    for result in results:
        surface_check_modes[result.surface_check] = (
            surface_check_modes.get(result.surface_check, 0) + 1
        )
    all_verified = manifest_statuses == {"verified": len(components)} and len(components) == 101
    report = {
        "schema_version": "tessera/makepad-component-smoke/v1",
        "kind": "runtime_smoke_not_product_evidence",
        "started_at": started_at,
        "completed_at": utc_now(),
        "binary": str(binary),
        "binary_sha256": sha256_file(binary),
        "launch_mode": "app_bundle" if app is not None else "binary",
        "app_bundle": str(app) if app is not None else None,
        "manifest": str(manifest),
        "manifest_statuses": manifest_statuses,
        "viewport": f"{args.viewport[0]}x{args.viewport[1]}",
        "capture_scale": args.capture_scale if args.capture else None,
        "themes": themes,
        "catalog_entry_runs": len(catalog_entry_results),
        "catalog_entry_passed": len(catalog_entry_results) - len(failed_catalog_entries),
        "catalog_entry_failed": len(failed_catalog_entries),
        "components_requested": len(components),
        "component_theme_runs": len(results),
        "smoke_passed": len(results) - len(failed),
        "smoke_failed": len(failed),
        "surface_check_modes": dict(sorted(surface_check_modes.items())),
        "product_acceptance": (
            "verified"
            if all_verified and not failed and not failed_catalog_entries
            else "blocked"
        ),
        "product_acceptance_reasons": [
            "The smoke runner does not collect sealed GUI, AX, IME, mobile, DPI, or performance evidence.",
            "The component manifest is the product acceptance authority and remains fail-closed.",
        ],
        "catalog_entry_results": [asdict(result) for result in catalog_entry_results],
        "results": [asdict(result) for result in results],
    }
    report_path = output_dir / "smoke-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(f"report={report_path}")
    print(
        f"catalog_entry={len(catalog_entry_results) - len(failed_catalog_entries)}/"
        f"{len(catalog_entry_results)}"
    )
    print(f"smoke={len(results) - len(failed)}/{len(results)} product_acceptance={report['product_acceptance']}")
    if failed or failed_catalog_entries:
        return 1
    if args.require_product_acceptance and report["product_acceptance"] != "verified":
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
