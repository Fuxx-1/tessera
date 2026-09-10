from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lib"))

from makepad_build import (  # noqa: E402
    BuildContractError,
    ManagedRoots,
    ValidationError,
    atomic_write_bytes,
    canonical_json_bytes,
    read_json,
)


def add_root_arguments(parser: Any) -> None:
    parser.add_argument("--fixture-root", help="derive all managed roots below a temporary fixture root")
    parser.add_argument("--cache-root")
    parser.add_argument("--result-root")
    parser.add_argument("--evidence-root")


def roots_from_args(args: Any) -> ManagedRoots:
    if args.fixture_root and any(getattr(args, name, None) for name in ("cache_root", "result_root", "evidence_root")):
        raise BuildContractError("fixture-root cannot be combined with explicit managed roots")
    if args.fixture_root:
        return ManagedRoots.fixture(args.fixture_root)
    defaults = ManagedRoots.default()
    explicit = (args.cache_root, args.result_root, args.evidence_root)
    if any(explicit) and tuple(
        Path(value).expanduser().absolute() if value else default
        for value, default in zip(explicit, (defaults.cache_root, defaults.result_root, defaults.evidence_root))
    ) != (defaults.cache_root, defaults.result_root, defaults.evidence_root):
        raise BuildContractError(
            "custom managed roots require --fixture-root; production roots are fixed to Tessera locations"
        )
    return ManagedRoots(
        args.cache_root or defaults.cache_root,
        args.result_root or defaults.result_root,
        args.evidence_root or defaults.evidence_root,
    )


def load_json_argument(value: str) -> Any:
    if value == "-":
        try:
            return json.load(sys.stdin)
        except json.JSONDecodeError as exc:
            raise BuildContractError(f"invalid JSON from stdin: {exc}") from exc
    return read_json(value)


def write_report(value: Any, path: str | None = None) -> None:
    payload = canonical_json_bytes(value) + b"\n"
    if path:
        atomic_write_bytes(path, payload)
    sys.stdout.buffer.write(payload)


def cli_error(exc: BaseException) -> int:
    if isinstance(exc, ValidationError):
        errors = exc.errors
    else:
        errors = [{"code": "CONTRACT", "message": str(exc)}]
    sys.stderr.write(json.dumps({"ok": False, "errors": errors}, sort_keys=True) + "\n")
    return 2


def run(main: Any) -> int:
    try:
        return int(main())
    except (BuildContractError, OSError, ValueError) as exc:
        return cli_error(exc)
