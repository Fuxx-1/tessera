#!/usr/bin/env python3
"""Emit a full-native source coverage manifest and fail on any gate breach."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "lib"
sys.path.insert(0, str(LIB))
from full_native_contract import validate_coverage, write_json  # noqa: E402


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--frozen-registry", default=str(Path(__file__).resolve().parents[1] / "frozen-registry-v1.json"))
    parser.add_argument("--scene-manifest", default=str(Path(__file__).resolve().parents[1] / "scene-manifest-v1.json"))
    parser.add_argument("--out", help="write manifest here; omit to print JSON")
    args = parser.parse_args(argv)
    manifest = validate_coverage(Path(args.repo_root), Path(args.frozen_registry), Path(args.scene_manifest))
    if args.out:
        write_json(Path(args.out), manifest)
    else:
        import json
        print(json.dumps(manifest, sort_keys=True))
    return 0 if manifest["verdict"] == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
