#!/usr/bin/env python3
"""Check embedded Gallery resources while all source directories are unreadable.

This is a macOS resource/distribution smoke, not sealed component acceptance.
"""

import argparse
import json
from pathlib import Path
import subprocess
import sys

import makepad_component_smoke as smoke


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--denied-source", required=True, action="append", type=Path)
    args = parser.parse_args()
    binary = args.binary.resolve(strict=True)
    sources = [path.resolve(strict=True) for path in args.denied_source]
    if sys.platform != "darwin":
        parser.error("sandbox-exec resource smoke requires macOS")
    if any(binary.is_relative_to(source) for source in sources):
        parser.error("the binary must be outside the denied source trees")
    output = args.out.resolve()
    output.mkdir(parents=True, exist_ok=False)
    profile = "(version 1)(allow default)" + "".join(
        f"(deny file-read* (subpath {json.dumps(str(source))}))"
        for source in sources
    )
    command_prefix = ["/usr/bin/sandbox-exec", "-p", profile]
    report = {
        "scope": "embedded-resource-smoke-only",
        "binary": str(binary),
        "binary_sha256": smoke.sha256_file(binary),
        "denied_sources": [str(source) for source in sources],
        "source_denial_checks": [],
        "runs": [],
    }
    for source in sources:
        sentinel = source / "Cargo.toml"
        if not sentinel.is_file():
            sentinel = source / "native" / "Cargo.toml"
        sentinel.read_bytes()
        probe = subprocess.run(
            [*command_prefix, "/bin/cat", str(sentinel)],
            capture_output=True, text=True, check=False,
        )
        denied = probe.returncode != 0 and "Operation not permitted" in probe.stderr
        report["source_denial_checks"].append({"path": str(sentinel), "denied": denied})
        if not denied:
            raise RuntimeError(f"source denial was not enforced: {sentinel}")

    text = "\u971e\u9e5c\u6670\u9ed1 \u4e2d\u6587\u754c\u9762\uff1a\u4fdd\u5b58\u3001\u53d6\u6d88\u3001\u8fd4\u56de\nTessera 0123456789 \u2605 \u2606 \u2588 \u2500"
    for theme in ("light", "dark"):
        port = smoke.free_port()
        log_path = output / f"font-{theme}.log"
        command = [
            *command_prefix, str(binary),
            *smoke.launch_arguments("textarea", theme, (840, 600), port),
        ]
        with log_path.open("w", encoding="utf-8") as log:
            process = subprocess.Popen(
                command, cwd=output, stdout=log, stderr=subprocess.STDOUT, text=True,
            )
        instance = smoke.RunningInstance(process=process, log_path=log_path)
        run = {"theme": theme, "command": command, "errors": []}
        try:
            smoke.wait_for_remote(port, instance)
            control = smoke.wait_for_widget(port, instance, "textarea_control")
            smoke.type_into_widget(port, control, text)
            actual = smoke.visible_widget(port, "textarea_control").get("val", "")
            run["text_roundtrip"] = actual == text
            if actual != text:
                run["errors"].append(f"text mismatch: {actual!r}")
        except Exception as error:
            run["errors"].append(str(error))
        finally:
            capture, errors = smoke.close_instance(
                port, instance, True, output / f"font-{theme}.png", 1.0,
            )
            run["capture"] = capture
            run["errors"].extend(errors)
            report["runs"].append(run)
    passed = all(not run["errors"] and run.get("capture") for run in report["runs"])
    report["passed"] = bool(passed)
    path = output / "report.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"embedded resource smoke: {'PASS' if passed else 'FAIL'}; {path}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
