"""Bounded real-window layout regression, never sealed product acceptance."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import time
import traceback
import urllib.parse

import makepad_component_smoke as smoke


def region_pixels(png: Path, region: tuple, viewport: tuple[int, int]) -> tuple[bytes, dict]:
    magick = shutil.which("magick")
    if magick is None:
        raise RuntimeError("ImageMagick is required for the affix pixel regression")
    with png.open("rb") as stream:
        header = stream.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise RuntimeError("capture is not a PNG with IHDR dimensions")
    width, height = struct.unpack(">II", header[16:24])
    sx, sy = width / viewport[0], height / viewport[1]
    if abs(sx - sy) > 0.001:
        raise RuntimeError("capture aspect ratio differs from the window")
    x, y, w, h = region
    left, top = round(x * sx), round(y * sy)
    right, bottom = round((x + w) * sx), round((y + h) * sy)
    if not (0 <= left < right <= width and 0 <= top < bottom <= height):
        raise RuntimeError("pixel region falls outside the captured window")
    crop = f"{right - left}x{bottom - top}+{left}+{top}"
    pixels = subprocess.check_output(
        [magick, str(png), "-crop", crop, "+repage", "-depth", "8", "rgba:-"], timeout=15)
    if len(pixels) != (right - left) * (bottom - top) * 4:
        raise RuntimeError("pixel crop returned an unexpected byte count")
    return pixels, {"path": str(png), "crop": crop, "sha256": hashlib.sha256(pixels).hexdigest()}


def run_cell(build: dict, output: Path, component: str, theme: str, viewport: tuple[int, int]) -> dict:
    output.mkdir(parents=True, exist_ok=False)
    port = smoke.free_port()
    argv = [build["binary"], *smoke.launch_arguments(component, theme, viewport, port)]
    if component == "affix":
        argv.append("--focus-trace")
    report = {"component": component, "theme": theme, "viewport": viewport, "argv": argv,
              "checks": [], "events": [], "artifacts": []}

    def check(name: str, passed: bool, observed: object) -> None:
        report["checks"].append({"name": name, "passed": bool(passed), "observed": observed})

    def widget(name: str) -> dict:
        return smoke.visible_widget(port, name)

    def rect(name: str) -> tuple:
        return smoke.widget_rect(widget(name))

    def text(name: str) -> str:
        return smoke.widget_text(widget(name))

    def click(name: str) -> None:
        target = widget(name)
        report["events"].append({"kind": "click", "widget": name, "rect": smoke.widget_rect(target)})
        smoke.click_widget(port, target)

    def key(code: str) -> None:
        for phase in ("down", "up"):
            params = {"k": phase, "c": code, "wait": 1}
            report["events"].append({"kind": "key", **params})
            if smoke.remote_json(port, "/k?" + urllib.parse.urlencode(params)).get("ok") != 1:
                raise RuntimeError("key event rejected")

    def scroll(name: str, delta: int) -> None:
        x, y = smoke.rect_center(rect(name))
        params = {"k": "scroll", "x": round(x), "y": round(y), "dy": delta, "wait": 1}
        report["events"].append({"kind": "scroll", "widget": name, **params})
        if smoke.remote_json(port, "/m?" + urllib.parse.urlencode(params)).get("ok") != 1:
            raise RuntimeError("scroll event rejected")
        time.sleep(0.08)

    def capture(name: str) -> None:
        snapshot = output / (name + ".widgets.json")
        snapshot.write_text(json.dumps(smoke.remote_json(port, "/snap?all=1"), indent=2) + "\n")
        png = output / (name + ".png")
        if smoke.cleanup_grabs(smoke.remote_json(port, "/g?scale=1"), True, png) is None:
            raise RuntimeError("real window capture returned no PNG")
        for path in (snapshot, png):
            report["artifacts"].append({"path": str(path), "sha256": smoke.sha256_file(path)})

    def anchor_selected(name: str, index: int) -> None:
        labels = [text(button) for button in ("anchor_first", "anchor_second", "anchor_third")]
        check(name, [label.startswith("> ") for label in labels] == [i == index for i in range(3)], labels)
        target = rect(("anchor_target_one", "anchor_target_two", "anchor_target_three")[index])
        document = rect("anchor_document")
        check(name + "-target-in-viewport", target[1] >= document[1]
              and target[1] + target[3] <= document[1] + document[3],
              {"target": target, "document": document})

    def affix_draw_region() -> tuple:
        # /snap rounds DIP values; the opt-in trace preserves the painted area's precision.
        # A harmless event observes the completed frame instead of the previous scroll event.
        x, y = smoke.rect_center(rect("affix_region"))
        params = {"k": "move", "x": round(x), "y": round(y), "wait": 1}
        report["events"].append({"kind": "geometry-observation", **params})
        if smoke.remote_json(port, "/m?" + urllib.parse.urlencode(params)).get("ok") != 1:
            raise RuntimeError("geometry observation event rejected")
        for line in reversed(smoke.remote_json(port, "/log?n=200").get("l", [])):
            if line.startswith("[tessera-focus] "):
                record = json.loads(line.removeprefix("[tessera-focus] "))
                region = record.get("target_rect")
                if (record.get("stage") == "affix-region-event" and record.get("target_valid")
                        and region and region[2] > 0 and region[3] > 0):
                    return tuple(region)
        raise RuntimeError("no precise affix draw geometry in the diagnostic trace")

    with (output / "app.log").open("w") as log:
        process = subprocess.Popen(argv, cwd=build["cwd"], stdout=log, stderr=subprocess.STDOUT)
        instance = smoke.RunningInstance(process=process, log_path=output / "app.log")
        try:
            report["runtime"] = smoke.wait_for_remote(port, instance)
            smoke.wait_for_widget(port, instance, component + "_surface")
            capture("initial")
            if component == "anchor":
                anchor_selected("initial", 0)
                click("anchor_second")
                anchor_selected("pointer-jump", 1)
                capture("section-focus")
                key("ArrowDown")
                anchor_selected("arrow-jump", 2)
                capture("keyboard-focus")
                key("Home")
                anchor_selected("home", 0)
                scroll("anchor_document", 180)
                anchor_selected("scroll-spy", 1)
                click("anchor_next")
                anchor_selected("next-section", 2)
                capture("active")
                before_theme = rect("anchor_target_three")
                for _ in range(3):
                    click("toggle_theme")
                anchor_selected("theme-preserves-section", 2)
                check("theme-preserves-scroll", rect("anchor_target_three") == before_theme,
                      {"before": before_theme, "after": rect("anchor_target_three")})
            elif component == "grid":
                rows = ("grid_first_row", "grid_second_row")
                tiles = ("grid_tile_one", "grid_tile_two", "grid_tile_three", "grid_tile_four")
                labels = ("grid_cell_one", "grid_cell_two", "grid_cell_three", "grid_cell_four")
                before = [rect(row) for row in rows]
                click("grid_density")
                after = [rect(row) for row in rows]
                geometry = [rect(tile) for tile in tiles]
                check("compact-preserves-both-rows", all(a[3] == 36 and b[3] == 28 for a, b in zip(before, after)),
                      {"before": before, "after": after})
                check("compact-preserves-four-values", [text(label) for label in labels] == ["Build", "Test", "Review", "Release"],
                      [text(label) for label in labels])
                check("grid-track-order-and-gaps",
                      geometry[0][0] == geometry[2][0] and geometry[1][0] == geometry[3][0]
                      and geometry[0][1] == geometry[1][1] and geometry[2][1] == geometry[3][1]
                      and abs(geometry[0][2] - geometry[1][2]) <= 1
                      and after[1][1] - after[0][1] - after[0][3] == 4,
                      geometry)
                capture("active")
                key("Space")
                check("space-restores-density", [rect(row) for row in rows] == before, [rect(row) for row in rows])
                key("Enter")
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-density", [rect(row) for row in rows] == after, [rect(row) for row in rows])
            elif component == "flex":
                before = (rect("flex_first"), rect("flex_second"))
                control = rect("flex_reverse")
                click("flex_reverse")
                after = (rect("flex_first"), rect("flex_second"))
                check("direction-control-retains-size", rect("flex_reverse") == control,
                      {"before": control, "after": rect("flex_reverse")})
                check("reverse-moves-same-widgets",
                      before[0][0] < before[1][0] and after[0][0] > after[1][0]
                      and text("flex_first") == "Primary action" and text("flex_second") == "Secondary action",
                      {"before": before, "after": after, "labels": [text("flex_first"), text("flex_second")]})
                capture("active")
                key("Space")
                check("space-restores-order", (rect("flex_first"), rect("flex_second")) == before,
                      [rect("flex_first"), rect("flex_second")])
                key("Enter")
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-widget-order", (rect("flex_first"), rect("flex_second")) == after,
                      [rect("flex_first"), rect("flex_second")])
            elif component == "card":
                initial_detail = smoke.first_widget(port, "card_detail")
                initial_toggle = text("card_toggle")
                check("card-detail-starts-collapsed",
                      initial_detail.get("v") == 0 and initial_toggle == "Show details",
                      {"detail": initial_detail, "toggle": initial_toggle})
                click("card_toggle")
                expanded_detail = smoke.visible_widget(port, "card_detail")
                check("card-expands-real-content",
                      expanded_detail["r"][3] > 0
                      and text("card_header_status") == "Reviewed"
                      and text("card_toggle") == "Hide details",
                      {"detail": expanded_detail, "status": text("card_header_status"),
                       "toggle": text("card_toggle")})
                capture("expanded")
                key("Space")
                collapsed_detail = smoke.first_widget(port, "card_detail")
                check("card-keyboard-collapse",
                      collapsed_detail.get("v") == 0 and text("card_toggle") == "Show details",
                      collapsed_detail)
                key("Enter")
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-card-state",
                      smoke.visible_widget(port, "card_detail")["r"][3] > 0
                      and text("card_toggle") == "Hide details",
                      {"detail": smoke.visible_widget(port, "card_detail"),
                       "toggle": text("card_toggle")})
            elif component == "layout":
                sidebar = smoke.first_widget(port, "layout_sidebar")
                before = rect("layout_regions")
                check("layout-starts-with-sidebar", sidebar.get("v") != 0 and before[2] > 0,
                      {"sidebar": sidebar, "regions": before})
                click("layout_sidebar_toggle")
                hidden = smoke.first_widget(port, "layout_sidebar")
                check("layout-hides-sidebar-without-collapsing-content",
                      hidden.get("v") == 0 and rect("layout_content")[2] > 0
                      and text("layout_sidebar_toggle") == "Show navigation",
                      {"sidebar": hidden, "content": rect("layout_content"),
                       "toggle": text("layout_sidebar_toggle")})
                capture("collapsed")
                key("Space")
                check("layout-keyboard-restores-sidebar",
                      smoke.first_widget(port, "layout_sidebar").get("v") != 0
                      and text("layout_sidebar_toggle") == "Hide navigation",
                      smoke.first_widget(port, "layout_sidebar"))
                key("Enter")
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-layout-state",
                      smoke.first_widget(port, "layout_sidebar").get("v") == 0
                      and text("layout_sidebar_toggle") == "Show navigation",
                      smoke.first_widget(port, "layout_sidebar"))
            elif component == "masonry":
                comfortable = smoke.first_widget(port, "masonry_comfortable")
                dense = smoke.first_widget(port, "masonry_dense")
                before = [rect(name) for name in ("masonry_column_one", "masonry_column_two")]
                check("masonry-starts-comfortable",
                      comfortable.get("v") != 0 and dense.get("v") == 0
                      and all(item[2] > 0 for item in before),
                      {"comfortable": comfortable, "dense": dense, "columns": before})
                click("masonry_toggle")
                dense_after = smoke.visible_widget(port, "masonry_dense")
                compact = [rect(name) for name in ("masonry_dense_alpha", "masonry_dense_beta",
                                                    "masonry_dense_gamma", "masonry_dense_delta")]
                check("masonry-switches-to-bounded-dense-layout",
                      smoke.first_widget(port, "masonry_comfortable").get("v") == 0
                      and dense_after["r"][3] > 0
                      and all(item[2] > 0 and item[3] > 0 for item in compact)
                      and text("masonry_status") == "dense bounded layout",
                      {"dense": dense_after, "tiles": compact, "status": text("masonry_status")})
                capture("dense")
                key("Space")
                check("masonry-keyboard-restores-comfortable",
                      smoke.first_widget(port, "masonry_comfortable").get("v") != 0
                      and text("masonry_status") == "comfortable bounded layout",
                      smoke.first_widget(port, "masonry_comfortable"))
                key("Enter")
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-masonry-state",
                      smoke.first_widget(port, "masonry_comfortable").get("v") == 0
                      and text("masonry_status") == "dense bounded layout",
                      smoke.first_widget(port, "masonry_comfortable"))
            elif component == "space":
                spacer = rect("space_surface")
                check("space-has-stable-noninteractive-geometry",
                      spacer[2] == 4 and spacer[3] == 18,
                      {"rect": spacer, "token": "Px4 horizontal", "widget": widget("space_surface")})
                capture("geometry")
                key("Tab")
                check("space-does-not-register-focus-stop",
                      smoke.first_widget(port, "space_surface").get("v") != 0,
                      smoke.first_widget(port, "space_surface"))
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-space-geometry", rect("space_surface") == spacer,
                      {"before": spacer, "after": rect("space_surface")})
            elif component == "splitter":
                initial_status = text("splitter_status")
                initial_control = rect("splitter_control")
                check("splitter-starts-at-bounded-default",
                      initial_status == "320 px (min 180, max 560)" and initial_control[2] > 0,
                      {"status": initial_status, "control": initial_control})
                click("splitter_increase")
                check("splitter-increase-is-typed-and-bounded",
                      text("splitter_status") == "340 px (min 180, max 560)",
                      text("splitter_status"))
                click("splitter_decrease")
                check("splitter-decrease-restores-default",
                      text("splitter_status") == initial_status,
                      text("splitter_status"))
                click("splitter_control")
                key("Home")
                check("splitter-home-clamps-minimum",
                      text("splitter_status") == "180 px (min 180, max 560)",
                      text("splitter_status"))
                key("End")
                check("splitter-end-clamps-maximum",
                      text("splitter_status") == "560 px (min 180, max 560)",
                      text("splitter_status"))
                capture("maximum")
                key("Home")
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-splitter-state",
                      text("splitter_status") == "180 px (min 180, max 560)",
                      text("splitter_status"))
            elif component == "affix":
                document = rect("affix_document")
                initial = rect("affix_region")
                scroll("affix_document", 20)
                moving = rect("affix_region")
                check("unfixed-region-moves-with-document", initial[1] - moving[1] == 20,
                      {"initial": initial, "moving": moving})
                click("affix_toggle")
                scroll("affix_document", 80)
                pinned = rect("affix_region")
                body = rect("affix_second_section")
                capture("pinned-first")
                precise_region = affix_draw_region()
                scroll("affix_document", 60)
                body_after = rect("affix_second_section")
                check("fixed-region-stays-at-edge-while-body-scrolls",
                      pinned[1] == document[1] and rect("affix_region") == pinned
                      and body[1] - body_after[1] == 60,
                      {"document": document, "region": pinned, "body": body, "body_after": body_after})
                capture("active")
                active_region = affix_draw_region()
                check("precise-pinned-geometry-stable", precise_region == active_region
                      and all(abs(a - b) <= 0.5 for a, b in zip(precise_region, pinned)),
                      {"first": precise_region, "active": active_region, "rounded_snapshot": pinned})
                first_pixels, first_info = region_pixels(output / "pinned-first.png", precise_region, viewport)
                active_pixels, active_info = region_pixels(output / "active.png", active_region, viewport)
                check("pinned-pixels-occlude-scrolling-body", first_pixels == active_pixels,
                      {"first": first_info, "active": active_info,
                       "changed_channels": sum(a != b for a, b in zip(first_pixels, active_pixels))})
                click("affix_toggle")
                unpinned = smoke.first_widget(port, "affix_region")
                check("release-returns-region-to-document", unpinned.get("v") == 0 or unpinned["r"][3] == 0,
                      unpinned)
                key("Space")
                check("space-restores-pinned-region", rect("affix_region") == pinned, rect("affix_region"))
                for _ in range(3):
                    click("toggle_theme")
                check("theme-preserves-pinning-and-scroll",
                      rect("affix_region") == pinned and rect("affix_second_section") == body_after,
                      {"region": rect("affix_region"), "body": rect("affix_second_section")})
            capture("theme-cycle")
            click("component_back")
            smoke.wait_for_widget(port, instance, "component_catalog")
            capture("back")
            logs = smoke.remote_json(port, "/log?n=200")
            check("runtime-log", isinstance(logs.get("l"), list)
                  and not any("[E]" in line for line in logs["l"]), logs)
        except Exception as error:
            report.update(error=str(error), traceback=traceback.format_exc())
        finally:
            _, errors = smoke.close_instance(port, instance, False, output / "shutdown.png", 1)
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)
            check("clean-shutdown", not errors and process.returncode == 0, errors)
    report["passed"] = not report.get("error") and all(item["passed"] for item in report["checks"])
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"cell": output.name, "passed": report["passed"], "error": report.get("error"),
                      "failed": [c["name"] for c in report["checks"] if not c["passed"]]}), flush=True)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-record", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--component", choices=("affix", "anchor", "grid", "flex", "card", "layout",
                                                "masonry", "space", "splitter"), action="append")
    parser.add_argument("--themes", choices=("light", "dark", "both"), default="both")
    parser.add_argument("--viewport", type=smoke.parse_viewport, action="append")
    args = parser.parse_args()
    build = json.loads(args.build_record.read_text())
    if build.get("status") != "passed" or not build.get("source_unchanged"):
        parser.error("requires a successful frozen diagnostic build")
    if smoke.sha256_file(Path(build["binary"])) != build["binary_sha256"]:
        parser.error("binary hash differs from build record")
    output = args.output.resolve()
    if output.is_relative_to(Path(build["cwd"]).resolve()):
        parser.error("evidence must be outside the source tree")
    output.mkdir(parents=True, exist_ok=False)
    report = {"diagnostic_only": True, "sealed": False, "product_acceptance": False,
              "input_method": "Makepad remote injection, not platform keyboard or OS AX",
              "visual_review": "separate inspection required; rectangles are internal clipped geometry",
              "build_record": str(args.build_record.resolve()), "source_sha256": build["source_sha256"],
              "binary_sha256": build["binary_sha256"], "runner_sha256": smoke.sha256_file(Path(__file__)),
              "started_at": smoke.utc_now(), "cells": []}
    for component in args.component or ("affix", "anchor", "grid", "flex", "card", "layout",
                                        "masonry", "space", "splitter"):
        for viewport in args.viewport or ((840, 600), (1240, 800)):
            for theme in ("light", "dark") if args.themes == "both" else (args.themes,):
                name = f"{component}-{viewport[0]}x{viewport[1]}-{theme}"
                report["cells"].append(run_cell(build, output / name, component, theme, viewport))
                (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    report.update(passed=all(cell["passed"] for cell in report["cells"]), finished_at=smoke.utc_now())
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
