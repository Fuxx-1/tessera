#!/usr/bin/env python3
"""Snapshot the 101 catalog rows into the test authority (never production)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "lib"
sys.path.insert(0, str(LIB))
from full_native_contract import frozen_registry_document, parse_catalog, write_json  # noqa: E402


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parent = Path(__file__).resolve().parents[1]
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--out", default=str(parent / "frozen-registry-v1.json"))
    args = parser.parse_args(argv)
    catalog, errors = parse_catalog(Path(args.repo_root) / "native/crates/tessera-core/src/catalog.rs")
    if errors or len(catalog) != 101:
        for error in errors:
            print(f"{error['code']}: {error['message']}", file=sys.stderr)
        print(f"REGISTRY_COUNT: expected 101, got {len(catalog)}", file=sys.stderr)
        return 2
    write_json(Path(args.out), frozen_registry_document(catalog))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
