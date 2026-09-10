"""Audit real Makepad smoke captures for basic geometry and render integrity.

This is a diagnostic check only. It proves that a captured route produced
visible, finite geometry and a non-empty PNG; it does not prove AX, physical
keyboard, IME, DPI, performance, or product acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as stream:
        header = stream.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError("not a PNG with an IHDR chunk")
    return struct.unpack(">II", header[16:24])


def visible_geometry(entries: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    checked: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    ignored_types = {"Root", "Window"}
    for entry in entries:
        if entry.get("v", 1) == 0 or entry.get("ty") in ignored_types:
            continue
        rect = entry.get("r")
        record = {"id": entry.get("i"), "type": entry.get("ty"), "rect": rect}
        checked.append(record)
        if not isinstance(rect, list) or len(rect) != 4:
            issues.append({**record, "reason": "invalid-rect"})
            continue
        if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in rect):
            issues.append({**record, "reason": "non-finite-rect"})
            continue
        if rect[2] <= 0 or rect[3] <= 0:
            issues.append({**record, "reason": "non-positive-size"})
    return checked, issues


def audit_capture(capture_dir: Path, expected_viewport: tuple[int, int] | None = None) -> dict[str, Any]:
    widgets_files = sorted(capture_dir.glob("*.widgets.json"))
    png_files = sorted(capture_dir.glob("*.png"))
    png_by_stem = {path.stem: path for path in png_files}
    results: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []

    for widgets_path in widgets_files:
        stem = widgets_path.name.removesuffix(".widgets.json")
        try:
            payload = json.loads(widgets_path.read_text())
            entries = payload.get("s")
            if not isinstance(entries, list):
                raise ValueError("snapshot has no widget list")
            checked, geometry_issues = visible_geometry(entries)
            detail = next(
                (item for item in checked if item["type"] == "ComponentDetail"),
                None,
            )
            local_issues = list(geometry_issues)
            # Catalog-entry captures intentionally have no detail surface; all
            # component/theme captures must expose one concrete detail host.
            is_catalog_entry = stem.startswith("catalog-entry-")
            if detail is None and not is_catalog_entry:
                local_issues.append({"reason": "missing-visible-component-detail"})
            png = png_by_stem.get(stem)
            png_record: dict[str, Any] | None = None
            if png is None:
                local_issues.append({"reason": "missing-png"})
            else:
                try:
                    width, height = png_size(png)
                    if width <= 0 or height <= 0 or png.stat().st_size <= 1024:
                        local_issues.append({"reason": "empty-or-too-small-png"})
                    if expected_viewport is not None:
                        expected_width, expected_height = expected_viewport
                        if abs(width / height - expected_width / expected_height) > 0.001:
                            local_issues.append({"reason": "png-aspect-ratio-mismatch"})
                    png_record = {
                        "path": str(png),
                        "width": width,
                        "height": height,
                        "bytes": png.stat().st_size,
                        "sha256": sha256_file(png),
                    }
                except (OSError, ValueError, struct.error) as error:
                    local_issues.append({"reason": "invalid-png", "detail": str(error)})
            result = {
                "capture": stem,
                "widgets": str(widgets_path),
                "visible_nodes": len(checked),
                "detail_rect": detail["rect"] if detail else None,
                "png": png_record,
                "issues": local_issues,
            }
            results.append(result)
            issues.extend({"capture": stem, **issue} for issue in local_issues)
        except (OSError, ValueError, json.JSONDecodeError) as error:
            issue = {"capture": stem, "reason": "invalid-snapshot", "detail": str(error)}
            results.append({"capture": stem, "issues": [issue]})
            issues.append(issue)

    for png in png_files:
        stem = png.stem
        if not (capture_dir / f"{stem}.widgets.json").exists():
            issues.append({"capture": stem, "reason": "png-without-snapshot"})

    return {
        "schema_version": "tessera/makepad-geometry-audit/v1",
        "capture_dir": str(capture_dir),
        "snapshot_count": len(widgets_files),
        "png_count": len(png_files),
        "passed": not issues and bool(widgets_files),
        "issues": issues,
        "captures": results,
    }


def parse_viewport(value: str) -> tuple[int, int]:
    try:
        width, height = (int(part) for part in value.lower().split("x", 1))
    except (ValueError, TypeError) as error:
        raise argparse.ArgumentTypeError("viewport must be WIDTHxHEIGHT") from error
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("viewport must be positive")
    return width, height


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--captures", required=True, type=Path)
    parser.add_argument("--viewport", type=parse_viewport)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    report = audit_capture(args.captures.resolve(), args.viewport)
    output = args.out.resolve() if args.out else args.captures.resolve() / "geometry-audit.json"
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"report={output}")
    print(f"captures={report['snapshot_count']} png={report['png_count']} passed={report['passed']}")
    if report["issues"]:
        for issue in report["issues"][:20]:
            print(json.dumps(issue, ensure_ascii=False, sort_keys=True))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
