#!/usr/bin/env python3
"""Losslessly compress the pinned, unmodified LXGW XiHei MN release font."""

import argparse
import hashlib
from pathlib import Path
import zlib

SOURCE_SHA256 = "e29b6388cff06d2c9f665a5f8bb2e2d832793a4f3a5aeaeb74622bf14a27eb5b"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    original = args.source.read_bytes()
    if hashlib.sha256(original).hexdigest() != SOURCE_SHA256:
        parser.error("source must be the unmodified LXGWXiHeiMN.ttf from v1.001")
    compressed = zlib.compress(original, level=9)
    assert zlib.decompress(compressed) == original
    output = Path(__file__).resolve().parents[1] / (
        "crates/tessera-gallery/resources/fonts/LXGWXiHeiMN.ttf.zlib"
    )
    output.write_bytes(compressed)
    print(f"{len(original)} -> {len(compressed)} bytes; sha256={hashlib.sha256(compressed).hexdigest()}")


if __name__ == "__main__":
    main()
