"""Bounded real-window theme regression, not sealed product acceptance."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import traceback

import makepad_component_smoke as smoke


INPUT_FIXTURE = "Persistent CJK \u7ec4\u4ef6\u5185\u5bb9 123"


def input_value(entry: dict) -> str:
    value = entry.get("val")
    if not isinstance(value, str) or not value:
        raise RuntimeError("TextInput snapshot is missing its non-empty val field")
    return value


def positive_iterations(value: str) -> int:
    count = int(value)
    if not 1 <= count <= 1000:
        raise argparse.ArgumentTypeError("iterations must be between 1 and 1000")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-record", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--iterations", type=positive_iterations, default=60)
    parser.add_argument("--component", choices=("input", "select"))
    parser.add_argument("--viewport", type=smoke.parse_viewport, default=(1240, 800))
    args = parser.parse_args()
    build = json.loads(args.build_record.read_text())
    binary = Path(build["binary"])
    if build["status"] != "passed" or not build["source_unchanged"]:
        parser.error("a successful frozen diagnostic build is required")
    if smoke.sha256_file(binary) != build["binary_sha256"]:
        parser.error("binary hash does not match the build record")
    cwd = Path(build["cwd"])
    args.output.mkdir(parents=True, exist_ok=False)
    port = smoke.free_port()
    argv = [str(binary), *smoke.launch_arguments(args.component, "light", args.viewport, port)]
    report = {
        "diagnostic_only": True,
        "sealed": False,
        "product_acceptance": False,
        "input_method": "makepad-remote event injection, not platform keyboard or IME",
        "build_record": str(args.build_record.resolve()),
        "source_sha256": build["source_sha256"],
        "binary_sha256": build["binary_sha256"],
        "argv": argv,
        "events": [],
    }
    started = time.monotonic()

    def capture(name: str) -> None:
        snapshot = smoke.remote_json(port, "/snap?all=1")
        (args.output / (name + ".widgets.json")).write_text(json.dumps(snapshot, indent=2))
        smoke.cleanup_grabs(
            smoke.remote_json(port, "/g?scale=1"), True, args.output / (name + ".png")
        )

    with (args.output / "app.log").open("w") as log:
        process = subprocess.Popen(
            argv, cwd=cwd, env={**os.environ, "RUST_BACKTRACE": "full"},
            stdout=log, stderr=subprocess.STDOUT,
        )
        instance = smoke.RunningInstance(process=process, log_path=args.output / "app.log")
        report["pid"] = process.pid
        try:
            report["runtime"] = smoke.wait_for_remote(port, instance)
            smoke.wait_for_widget(port, instance, "component_surface" if args.component else "component_catalog")
            if args.component == "input":
                smoke.type_into_widget(port, smoke.visible_widget(port, "input_control"), INPUT_FIXTURE)
                if input_value(smoke.visible_widget(port, "input_control")) != INPUT_FIXTURE:
                    raise RuntimeError("input setup failed")
            if args.component == "select":
                smoke.click_widget(port, smoke.visible_widget(port, "select_control"))
                smoke.press_key(port, "ArrowDown")
                smoke.press_key(port, "Enter")
                report["selection_review"] = "PNG must retain Advanced; remote snapshot omits selected value"
            capture("before")
            geometry = smoke.widget_rect(smoke.visible_widget(port, "toggle_theme"))
            for index in range(args.iterations):
                smoke.click_widget(port, smoke.visible_widget(port, "toggle_theme"))
                time.sleep(0.15)
                status = smoke.widget_text(smoke.visible_widget(port, "theme_status"))
                requested = ("Dark", "System", "Light")[index % 3]
                if not status.startswith(f"Requested {requested} -> resolved "):
                    raise RuntimeError("theme activation did not advance: " + status)
                if requested != "System" and not status.endswith(requested):
                    raise RuntimeError("explicit theme resolved incorrectly")
                if smoke.widget_rect(smoke.visible_widget(port, "toggle_theme")) != geometry:
                    raise RuntimeError("theme control geometry moved")
                event = {"index": index, "theme": status}
                if args.component:
                    category = smoke.widget_text(smoke.visible_widget(port, "component_category"))
                    if not category.endswith(" / " + args.component):
                        raise RuntimeError("theme update changed the active route")
                if args.component == "input":
                    event["input"] = input_value(smoke.visible_widget(port, "input_control"))
                    if event["input"] != INPUT_FIXTURE:
                        raise RuntimeError("theme update changed input content")
                report["events"].append(event)
                if index < 3 or index == args.iterations - 1:
                    capture("theme-" + str(index))
                if index % 20 == 0:
                    print(json.dumps(event), flush=True)
            if args.component:
                smoke.click_widget(port, smoke.visible_widget(port, "component_back"))
                smoke.wait_for_widget(port, instance, "component_catalog")
                capture("back")
            report["completed"] = True
        except Exception as error:
            report.update(completed=False, error=str(error), traceback=traceback.format_exc())
        finally:
            if process.poll() is None:
                try:
                    smoke.remote_json(port, "/quit")
                except Exception:
                    pass
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    report["forced_shutdown"] = True
                    process.terminate()
                    try:
                        process.wait(timeout=4)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
            report.update(returncode=process.returncode, duration_seconds=round(time.monotonic() - started, 3))
    report["passed"] = bool(report.get("completed")) and report["returncode"] == 0 and not report.get("forced_shutdown")
    (args.output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k not in ("events", "runtime", "traceback")}), flush=True)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
