#!/usr/bin/env python3
"""Generate the deterministic scene manifest from the frozen component registry."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "lib"
sys.path.insert(0, str(LIB))
from full_native_contract import generate_scene_manifest, load_frozen_registry, write_json  # noqa: E402


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parent = Path(__file__).resolve().parents[1]
    parser.add_argument("--frozen-registry", default=str(parent / "frozen-registry-v1.json"))
    parser.add_argument("--out", default=str(parent / "scene-manifest-v1.json"))
    args = parser.parse_args(argv)
    registry, errors = load_frozen_registry(Path(args.frozen_registry))
    if errors:
        for error in errors:
            print(f"{error['code']}: {error['message']}", file=sys.stderr)
        return 2
    write_json(Path(args.out), generate_scene_manifest(registry))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
