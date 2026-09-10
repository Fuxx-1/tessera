"""PropertyList real-window regression; remote injection is not product acceptance."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import time
import traceback
import urllib.parse

import makepad_component_smoke as smoke


ROWS = ("property_row_one", "property_row_two", "property_row_three", "property_row_four")


def run_cell(build: dict, output: Path, viewport: tuple[int, int], theme: str) -> dict:
    output.mkdir(parents=True, exist_ok=False)
    port = smoke.free_port()
    argv = [build["binary"], *smoke.launch_arguments("property-list", theme, viewport, port)]
    result = {"theme": theme, "viewport": viewport, "argv": argv, "checks": [], "artifacts": []}

    def check(name: str, passed: bool, observed: object) -> None:
        result["checks"].append({"name": name, "passed": bool(passed), "observed": observed})

    def widget(widget_id: str) -> dict:
        return smoke.visible_widget(port, widget_id)

    def text(widget_id: str) -> str:
        return smoke.widget_text(widget(widget_id))

    def click(widget_id: str) -> None:
        smoke.click_widget(port, widget(widget_id))

    def key(code: str, **modifiers: int) -> None:
        params = {"k": "down", "c": code, "wait": 1, **modifiers}
        if smoke.remote_json(port, "/k?" + urllib.parse.urlencode(params)).get("ok") != 1:
            raise RuntimeError("key injection rejected")
        params["k"] = "up"
        smoke.remote_json(port, "/k?" + urllib.parse.urlencode(params))

    def capture(name: str) -> None:
        snapshot = output / (name + ".widgets.json")
        snapshot.write_text(json.dumps(smoke.remote_json(port, "/snap?all=1"), indent=2) + "\n")
        png = output / (name + ".png")
        if smoke.cleanup_grabs(smoke.remote_json(port, "/g?scale=1"), True, png) is None:
            raise RuntimeError("window capture returned no PNG")
        for artifact in (snapshot, png):
            result["artifacts"].append({"path": str(artifact), "sha256": smoke.sha256_file(artifact)})
        if name != "back":
            parent = smoke.widget_rect(widget("property_list_actions"))
            children = [smoke.widget_rect(widget(child)) for child in (
                "property_copy_one", "property_copy_two", "property_copy_three",
                "property_copy_four", "property_list_density",
            )]
            check(f"{name}-action-bounds", all(
                x >= parent[0] and y >= parent[1]
                and x + width <= parent[0] + parent[2] + 0.5
                and y + height <= parent[1] + parent[3] + 0.5
                for x, y, width, height in children
            ) and all(a[0] + a[2] <= b[0] for a, b in zip(children, children[1:])),
                  {"parent": parent, "children": children})

    def selection(name: str, index: int) -> None:
        labels = [text(row) for row in ROWS]
        status = text("property_list_status")
        check(name, [label.startswith("> ") for label in labels] == [i == index for i in range(4)]
              and status.startswith(f"selected {index} /"), {"rows": labels, "status": status})

    with (output / "app.log").open("w") as log:
        process = subprocess.Popen(argv, cwd=build["cwd"], stdout=log, stderr=subprocess.STDOUT)
        instance = smoke.RunningInstance(process=process, log_path=output / "app.log")
        result["pid"] = process.pid
        try:
            result["runtime"] = smoke.wait_for_remote(port, instance)
            smoke.wait_for_widget(port, instance, ROWS[0])
            selection("initial-selection", 0)
            comfortable = [smoke.widget_rect(widget(row)) for row in ROWS]
            capture("initial")

            click(ROWS[1])
            selection("pointer-select", 1)
            key("ArrowDown")
            selection("keyboard-next", 2)
            key("End")
            selection("keyboard-end", 3)
            key("Home")
            selection("keyboard-home", 0)
            key("ArrowDown", ctrl=1)
            selection("modified-navigation-inert", 0)
            key("ArrowDown")
            key("Tab")
            key("Enter")
            check("tab-exits-row-group-and-activates-copy",
                  "clipboard denied" in text("property_list_status")
                  and text("property_list_status").startswith("selected 0 /"),
                  text("property_list_status"))
            key("Tab", shift=1)
            key("End")
            selection("reverse-tab-restores-row-group", 3)
            capture("keyboard-selection")

            click("property_list_density")
            dense = [smoke.widget_rect(widget(row)) for row in ROWS]
            check("density-changes-real-row-height",
                  all(a[3] == 36 and b[3] == 28 and a[2] == b[2] for a, b in zip(comfortable, dense)),
                  {"comfortable": comfortable, "dense": dense})
            capture("dense")
            key("Space")
            restored = [smoke.widget_rect(widget(row)) for row in ROWS]
            check("keyboard-density-restores-geometry", restored == comfortable,
                  {"expected": comfortable, "observed": restored})
            key("Enter")
            check("enter-toggles-density-once", text("property_list_density") == "Comfortable",
                  text("property_list_density"))

            for index in range(3):
                click("toggle_theme")
                selection(f"theme-{index}-preserves-selection", 3)
                check(f"theme-{index}-preserves-density",
                      [smoke.widget_rect(widget(row)) for row in ROWS] == dense,
                      [smoke.widget_rect(widget(row)) for row in ROWS])
            capture("theme-cycle")
            click("component_back")
            smoke.wait_for_widget(port, instance, "component_catalog")
            capture("back")

            # Reopen through the catalog so the same in-memory widget must reset.
            for _ in range(30):
                entries = smoke.remote_json(port, "/snap?all=1")["s"]
                names = [entry for entry in entries if entry.get("i") == "name"
                         and entry.get("t") == "PropertyList" and entry.get("v") != 0]
                buttons = [entry for entry in entries if entry.get("i") == "open_button"
                           and entry.get("v") != 0]
                matching = [button for name in names for button in buttons
                            if abs(smoke.widget_rect(name)[1] - smoke.widget_rect(button)[1]) < 12]
                if matching and smoke.widget_rect(matching[0])[3] == 28:
                    smoke.click_widget(port, matching[0])
                    break
                x, y = smoke.rect_center(smoke.widget_rect(widget("component_catalog")))
                params = {"k": "scroll", "x": round(x), "y": round(y), "dy": 360, "wait": 1}
                smoke.remote_json(port, "/m?" + urllib.parse.urlencode(params))
                time.sleep(0.08)
            else:
                raise RuntimeError("PropertyList catalog row not reached within scroll budget")
            smoke.wait_for_widget(port, instance, ROWS[0])
            selection("route-reentry-resets-selection", 0)
            check("route-reentry-resets-density",
                  [smoke.widget_rect(widget(row)) for row in ROWS] == comfortable,
                  [smoke.widget_rect(widget(row)) for row in ROWS])
            check("route-reentry-resets-copy", "clipboard unavailable" in text("property_list_status"),
                  text("property_list_status"))
            capture("reentry")
            runtime_log = smoke.remote_json(port, "/log?n=200")
            (output / "runtime-log.json").write_text(json.dumps(runtime_log, indent=2) + "\n")
            check("runtime-log", isinstance(runtime_log.get("l"), list)
                  and not any("[E]" in line for line in runtime_log["l"]), runtime_log)
        except Exception as error:
            result.update(error=str(error), traceback=traceback.format_exc())
        finally:
            _, close_errors = smoke.close_instance(port, instance, False, output / "shutdown.png", 1)
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)
            check("clean-shutdown", not close_errors and process.returncode == 0, close_errors)
    result["passed"] = not result.get("error") and all(item["passed"] for item in result["checks"])
    (output / "report.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"cell": output.name, "passed": result["passed"],
                      "failed_checks": [c["name"] for c in result["checks"] if not c["passed"]],
                      "error": result.get("error")}), flush=True)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-record", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--themes", choices=("light", "dark", "both"), default="both")
    parser.add_argument("--viewport", type=smoke.parse_viewport, action="append")
    args = parser.parse_args()
    build = json.loads(args.build_record.read_text())
    if build.get("status") != "passed" or not build.get("source_unchanged"):
        parser.error("requires a successful frozen diagnostic build")
    if smoke.sha256_file(Path(build["binary"])) != build["binary_sha256"]:
        parser.error("binary hash differs from its build record")
    output = args.output.resolve()
    if output.is_relative_to(Path(build["cwd"]).resolve()):
        parser.error("evidence must be outside the source tree")
    output.mkdir(parents=True, exist_ok=False)
    report = {
        "diagnostic_only": True, "sealed": False, "product_acceptance": False,
        "input_method": "makepad-remote injection, not platform keyboard, IME or OS AX",
        "visual_review": "required separately; geometry uses internal clipped rectangles",
        "build_record": str(args.build_record.resolve()),
        "source_sha256": build["source_sha256"], "binary_sha256": build["binary_sha256"],
        "runner_sha256": smoke.sha256_file(Path(__file__)), "started_at": smoke.utc_now(), "cells": [],
    }
    for viewport in args.viewport or ((840, 600), (1240, 800)):
        for theme in ("light", "dark") if args.themes == "both" else (args.themes,):
            report["cells"].append(run_cell(
                build, output / f"{viewport[0]}x{viewport[1]}-{theme}", viewport, theme,
            ))
            (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    report.update(passed=all(cell["passed"] for cell in report["cells"]), finished_at=smoke.utc_now())
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
