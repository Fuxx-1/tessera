"""Check shared frame pixels in real smoke captures, never product acceptance."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess

from makepad_geometry_audit import png_size, sha256_file


def distance(a, b):
    return max(abs(x - y) for x, y in zip(a[:3], b[:3]))


def frame_samples(rect, viewport):
    if (len(rect) != 4 or not all(math.isfinite(v) for v in rect)
            or rect[2] < 32 or rect[3] < 32):
        raise ValueError("invalid or too-small frame rectangle")
    x, y, w, h = rect
    vw, vh = viewport
    if x < 3 or x + w > vw:
        raise ValueError("frame horizontal bounds are clipped")
    # A tall component may scroll, but at least one rounded edge must be visible.
    if y >= 0 and y + 14 < vh:
        edge, direction = y, 1
    elif y + h <= vh and y + h - 14 > 0:
        edge, direction = y + h, -1
    else:
        raise ValueError("no complete rounded edge in the capture")
    return {
        "outside": (x - 2, edge + direction * 2),
        "corner_left": (x + 1, edge + direction),
        "corner_right": (x + w - 1, edge + direction),
        "inset_left": (x + 7, edge + direction * 7),
        "inset_right": (x + w - 7, edge + direction * 7),
        "fill": (x + 12, edge + direction * 12),
        "border": (x + w / 2, edge + direction),
    }


def check_colors(samples):
    return {
        "opaque_samples": all(c[3] == 255 for c in samples.values()),
        "surface_distinct_from_canvas": distance(samples["fill"], samples["outside"]) >= 5,
        "rounded_left_exposes_canvas": distance(samples["corner_left"], samples["outside"]) <= 3,
        "rounded_right_exposes_canvas": distance(samples["corner_right"], samples["outside"]) <= 3,
        "left_inset_filled": distance(samples["inset_left"], samples["fill"]) <= 3,
        "right_inset_filled": distance(samples["inset_right"], samples["fill"]) <= 3,
        "visible_border": distance(samples["border"], samples["fill"]) >= 3,
    }


def check_capture(png, snapshot, widget_type, viewport):
    entries = json.loads(snapshot.read_text())["s"]
    frames = [e for e in entries if e.get("v", 1) != 0 and e.get("ty") == widget_type]
    if len(frames) != 1:
        raise ValueError(f"expected one visible {widget_type}, found {len(frames)}")
    rect = frames[0]["r"]
    points = frame_samples(rect, viewport)
    width, height = png_size(png)
    sx, sy = width / viewport[0], height / viewport[1]
    if not 1 <= sx <= 4 or abs(sx - sy) > 0.001:
        raise ValueError("capture scale or aspect does not match the viewport")
    magick = shutil.which("magick")
    if not magick:
        raise RuntimeError("ImageMagick is required to decode real capture pixels")
    pixels = subprocess.check_output([magick, str(png), "-depth", "8", "rgba:-"], timeout=20)
    if len(pixels) != width * height * 4:
        raise ValueError("unexpected decoded pixel count")
    samples = {}
    for name, (x, y) in points.items():
        px, py = math.floor(x * sx), math.floor(y * sy)
        if not 0 <= px < width or not 0 <= py < height:
            raise ValueError(f"sample {name} is outside the capture")
        offset = (py * width + px) * 4
        samples[name] = list(pixels[offset:offset + 4])
    checks = check_colors(samples)
    return {"rect": rect, "scale": sx, "sample_dip": points, "samples_rgba": samples,
            "checks": checks, "passed": all(checks.values()),
            "png_sha256": sha256_file(png), "snapshot_sha256": sha256_file(snapshot)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke-report", type=Path, required=True)
    parser.add_argument("--build-record", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    smoke = json.loads(args.smoke_report.read_text())
    build = json.loads(args.build_record.read_text())
    if (build["status"] != "passed" or not build["source_unchanged"]
            or smoke["binary_sha256"] != build["binary_sha256"]
            or sha256_file(Path(build["binary"])) != build["binary_sha256"]):
        parser.error("smoke and successful frozen build must identify the same binary")
    viewport = tuple(int(v) for v in smoke["viewport"].split("x"))
    results = []
    for cell in smoke["results"]:
        record = {"component": cell["component"], "theme": cell["theme"]}
        try:
            if not cell["passed"] or not cell.get("capture"):
                raise ValueError("smoke cell failed or lacks a capture")
            png = Path(cell["capture"])
            record.update(check_capture(png, png.with_suffix(".widgets.json"),
                                        cell["surface_widget"], viewport))
        except (ValueError, KeyError, OSError, RuntimeError, subprocess.SubprocessError) as error:
            record.update(passed=False, error=str(error))
        results.append(record)
    report = {"schema": "tessera/surface-frame-pixels/v1", "diagnostic_only": True,
              "sealed": False, "product_acceptance": False,
              "source_sha256": build["source_sha256"], "binary_sha256": build["binary_sha256"],
              "build_record": str(args.build_record.resolve()),
              "smoke_report": str(args.smoke_report.resolve()),
              "smoke_report_sha256": sha256_file(args.smoke_report),
              "viewport": viewport, "results": results,
              "passed": bool(results) and all(r["passed"] for r in results)}
    with args.out.open("x") as stream:
        stream.write(json.dumps(report, indent=2) + "\n")
    print(f"frames={len(results)} passed={sum(r['passed'] for r in results)} report={args.out}")
    for record in results:
        if not record["passed"]:
            print(json.dumps(record))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
