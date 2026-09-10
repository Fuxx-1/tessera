"""Fail-closed primitives for the Makepad build contract.

This testkit module uses only the Python standard library.  It is deliberately
independent from the historical Iced evidence contract.
"""

from __future__ import annotations

import contextlib
import datetime as datetime_module
import hashlib
import json
import math
import os
import platform
import plistlib
import re
import secrets
import shutil
import socket
import stat
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterator, Mapping, Sequence

try:
    import fcntl
except ImportError:  # pragma: no cover - Windows has no fcntl
    fcntl = None


BUILD_KEY_SCHEMA = "tessera/build-key/v1"
LEASE_SCHEMA = "tessera/build-lease/v1"
LEDGER_SCHEMA = "tessera/build-ledger/v1"
RESULT_SCHEMA = "tessera/build-result/v1"
GC_POLICY_SCHEMA = "tessera/build-gc-policy/v1"
GC_REPORT_SCHEMA = "tessera/build-gc-report/v1"
REBUILDABLE_SCHEMA = "tessera/build-rebuildable/v1"
# Kept as a compatibility alias for callers that imported the old name.
GC_SCHEMA = GC_POLICY_SCHEMA

DEFAULT_HEARTBEAT_SECONDS = 10
DEFAULT_LEASE_TTL_SECONDS = 60
MIN_FREE_BYTES = 30 * 1024**3
GC_MIN_FREE_BYTES = 5 * 1024**3
GC_MIN_FREE_PERCENT = 10.0
PREFLIGHT_SCHEMA = "tessera/build-preflight/v1"

HEX40_RE = re.compile(r"^[0-9a-fA-F]{40}$")
HEX64_RE = re.compile(r"^[0-9a-fA-F]{64}$")
SLUG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
ENV_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class BuildContractError(ValueError):
    """Input or state does not satisfy the build contract."""


class PathContractError(BuildContractError):
    """A path is outside the contract's managed boundary."""


class LeaseBusy(BuildContractError):
    """Another writer owns the single-writer lease."""


class LeaseFenced(BuildContractError):
    """A late or mismatched writer transition was rejected."""


class ValidationError(BuildContractError):
    """Structured validation errors."""

    def __init__(self, errors: Sequence[Mapping[str, str]] | Sequence[str]):
        self.errors = [
            dict(item) if isinstance(item, Mapping) else {"code": "INVALID", "message": str(item)}
            for item in errors
        ]
        super().__init__("; ".join(item.get("message", "invalid") for item in self.errors))


def error(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def absolute_path(value: os.PathLike[str] | str) -> Path:
    return Path(os.path.abspath(os.path.expanduser(os.fspath(value))))


def path_contains(root: os.PathLike[str] | str, candidate: os.PathLike[str] | str) -> bool:
    root_path = absolute_path(root)
    candidate_path = absolute_path(candidate)
    try:
        return os.path.commonpath((os.fspath(root_path), os.fspath(candidate_path))) == os.fspath(root_path)
    except ValueError:
        return False


def is_private_tmp(path: os.PathLike[str] | str) -> bool:
    resolved = os.path.realpath(os.fspath(absolute_path(path)))
    return (
        resolved in {"/private/tmp", "/tmp"}
        or resolved.startswith("/private/tmp/")
        or resolved.startswith("/tmp/")
    )


def contains_symlink(path: os.PathLike[str] | str, root: os.PathLike[str] | str | None = None) -> bool:
    candidate = absolute_path(path)
    base = absolute_path(root) if root is not None else Path(candidate.anchor or os.sep)
    try:
        relative = candidate.relative_to(base)
    except ValueError:
        base = Path(candidate.anchor or os.sep)
        relative = Path(*candidate.parts[1:])
    current = base
    for part in relative.parts:
        current = current / part
        if os.path.lexists(os.fspath(current)) and current.is_symlink():
            return True
    return False


def validate_relative_path(value: object) -> str:
    if not isinstance(value, str) or not value:
        raise PathContractError("relative path must be a non-empty string")
    if "\x00" in value or "\\" in value:
        raise PathContractError("relative path contains NUL or backslash")
    if value.startswith("/") or re.match(r"^[A-Za-z]:", value):
        raise PathContractError("relative path must not be absolute")
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise PathContractError("relative path contains an unsafe component")
    return "/".join(parts)


def validate_managed_path(
    path: os.PathLike[str] | str,
    root: os.PathLike[str] | str,
    *,
    repo_root: os.PathLike[str] | str | None = None,
    allow_missing: bool = True,
    reject_private_tmp: bool = True,
) -> Path:
    raw = os.fspath(path)
    if "\x00" in raw:
        raise PathContractError("path contains NUL")
    candidate = absolute_path(raw)
    managed_root = absolute_path(root)
    if os.path.lexists(os.fspath(managed_root)) and managed_root.is_symlink():
        raise PathContractError(f"managed root is a symlink: {managed_root}")
    if reject_private_tmp and is_private_tmp(candidate):
        raise PathContractError(f"private temporary path is not managed: {candidate}")
    if repo_root is not None and path_contains(repo_root, candidate):
        raise PathContractError(f"path is inside source tree: {candidate}")
    if not path_contains(managed_root, candidate):
        raise PathContractError(f"path escapes managed root: {candidate}")
    if contains_symlink(candidate, managed_root):
        raise PathContractError(f"symlink path is not allowed: {candidate}")
    if not allow_missing and not candidate.exists():
        raise PathContractError(f"path does not exist: {candidate}")
    return candidate


@dataclass(frozen=True)
class ManagedRoots:
    cache_root: Path
    result_root: Path
    evidence_root: Path
    fixture_mode: bool = False

    def __post_init__(self) -> None:
        object.__setattr__(self, "cache_root", absolute_path(self.cache_root))
        object.__setattr__(self, "result_root", absolute_path(self.result_root))
        object.__setattr__(self, "evidence_root", absolute_path(self.evidence_root))
        if not self.fixture_mode:
            home = Path.home()
            expected = (
                absolute_path(home / "Library" / "Caches" / "tessera" / "builds"),
                absolute_path(home / "Library" / "Application Support" / "Tessera" / "build-results"),
                absolute_path(home / "Library" / "Application Support" / "Tessera" / "evidence"),
            )
            actual = (self.cache_root, self.result_root, self.evidence_root)
            if actual != expected:
                raise PathContractError(
                    "production managed roots are fixed to Tessera cache, build-results, and evidence locations"
                )

    @classmethod
    def default(cls) -> "ManagedRoots":
        home = Path.home()
        return cls(
            home / "Library" / "Caches" / "tessera" / "builds",
            home / "Library" / "Application Support" / "Tessera" / "build-results",
            home / "Library" / "Application Support" / "Tessera" / "evidence",
        )

    @classmethod
    def fixture(cls, base: os.PathLike[str] | str) -> "ManagedRoots":
        base_path = absolute_path(base)
        return cls(
            base_path / "cache" / "builds",
            base_path / "results",
            base_path / "evidence",
            fixture_mode=True,
        )


def stable_slug(value: object, field: str) -> str:
    if not isinstance(value, str) or not SLUG_RE.fullmatch(value):
        raise BuildContractError(f"{field} must be a stable slug")
    return value


def logical_path(value: str, *, repo_root: Path | None, roots: ManagedRoots | None) -> str:
    if value.startswith("$") or not value.startswith(("/", "~")):
        return value
    candidate = absolute_path(value)
    mappings: list[tuple[Path, str]] = []
    if repo_root is not None:
        mappings.append((absolute_path(repo_root), "$REPO"))
    if roots is not None:
        mappings.extend(
            (
                (roots.cache_root, "$TESSERA_BUILD_CACHE"),
                (roots.result_root, "$TESSERA_BUILD_RESULTS"),
                (roots.evidence_root, "$TESSERA_EVIDENCE"),
            )
        )
    for root, replacement in mappings:
        if path_contains(root, candidate):
            relative = os.path.relpath(os.fspath(candidate), os.fspath(root))
            return replacement if relative == "." else replacement + "/" + relative.replace(os.sep, "/")
    return value


def validate_logical_path(value: str, field: str) -> str:
    if not value.startswith("$"):
        return value
    prefixes = ("$REPO", "$TESSERA_BUILD_CACHE", "$TESSERA_BUILD_RESULTS", "$TESSERA_EVIDENCE")
    prefix = next(
        (candidate for candidate in prefixes if value == candidate or value.startswith(candidate + "/")),
        None,
    )
    if prefix is None:
        raise PathContractError(f"{field} uses an unknown logical path variable")
    suffix = value[len(prefix):].lstrip("/")
    if suffix:
        validate_relative_path(suffix)
    return value


def normalise_json(value: object, *, repo_root: Path | None, roots: ManagedRoots | None) -> object:
    if isinstance(value, Mapping):
        result: dict[str, object] = {}
        for key, child in value.items():
            if not isinstance(key, str):
                raise BuildContractError("JSON object keys must be strings")
            result[key] = normalise_json(child, repo_root=repo_root, roots=roots)
        return result
    if isinstance(value, (list, tuple)):
        return [normalise_json(item, repo_root=repo_root, roots=roots) for item in value]
    if isinstance(value, str):
        if "\x00" in value:
            raise BuildContractError("strings may not contain NUL")
        return logical_path(value, repo_root=repo_root, roots=roots)
    if isinstance(value, bool) or value is None or isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise BuildContractError("NaN and infinity are not valid JSON")
        if value == 0 or value.is_integer():
            return int(value)
        return float(format(value, ".15g"))
    raise BuildContractError(f"unsupported JSON type: {type(value).__name__}")


def normalise_string_set(value: object, field: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, (list, tuple, set)):
        raise BuildContractError(f"{field} must be an array")
    result: set[str] = set()
    for item in value:
        if not isinstance(item, str) or not item or "\x00" in item:
            raise BuildContractError(f"{field} entries must be non-empty strings")
        result.add(item)
    return sorted(result)


def normalise_environment(value: object) -> dict[str, str]:
    if value is None:
        return {}
    if isinstance(value, Mapping):
        pairs = list(value.items())
    elif isinstance(value, list):
        pairs = []
        for item in value:
            if not isinstance(item, Mapping) or set(item) != {"name", "value"}:
                raise BuildContractError("environment entries require only name and value")
            pairs.append((item["name"], item["value"]))
    else:
        raise BuildContractError("environment must be an object or an entry array")
    result: dict[str, str] = {}
    for name, raw_value in pairs:
        if not isinstance(name, str) or not ENV_NAME_RE.fullmatch(name):
            raise BuildContractError(f"invalid environment variable name: {name!r}")
        if not isinstance(raw_value, (str, int, bool)) or "\x00" in str(raw_value):
            raise BuildContractError(f"invalid environment value for {name}")
        normalised = str(raw_value).lower() if isinstance(raw_value, bool) else str(raw_value)
        if name in result and result[name] != normalised:
            raise BuildContractError(f"conflicting duplicate environment variable: {name}")
        result[name] = normalised
    return {name: result[name] for name in sorted(result)}


def normalise_commands(value: object, *, repo_root: Path | None, roots: ManagedRoots | None) -> list[list[str]]:
    if isinstance(value, str) or not isinstance(value, (list, tuple)) or not value:
        raise BuildContractError("commands must be a non-empty array of token arrays")
    commands = [list(value)] if all(isinstance(item, str) for item in value) else list(value)
    result: list[list[str]] = []
    shell_executables = {"sh", "bash", "zsh", "fish", "cmd", "powershell", "pwsh"}
    for command in commands:
        if not isinstance(command, (list, tuple)) or not command:
            raise BuildContractError("each command must be a non-empty token array")
        tokens: list[str] = []
        for index, token in enumerate(command):
            if not isinstance(token, str) or not token or "\x00" in token:
                raise BuildContractError("command tokens must be non-empty strings")
            if "\n" in token or "\r" in token:
                raise BuildContractError("command tokens may not contain line breaks")
            if index == 0:
                executable = Path(token).name.lower()
                if any(char.isspace() for char in token) or executable in shell_executables:
                    raise BuildContractError("command must not invoke a shell")
            if token in {"-c", "--command", "-Command", "/c"}:
                raise BuildContractError("command must not use shell command mode")
            tokens.append(logical_path(token, repo_root=repo_root, roots=roots))
        result.append(tokens)
    return result


def canonicalize_build_key(
    raw: Mapping[str, object],
    *,
    repo_root: os.PathLike[str] | str | None = None,
    roots: ManagedRoots | None = None,
) -> dict[str, object]:
    if not isinstance(raw, Mapping):
        raise BuildContractError("build key must be an object")
    repo = absolute_path(repo_root) if repo_root is not None else None
    revision = raw.get("source_revision", raw.get("revision"))
    lockfile_sha256 = raw.get("lockfile_sha256", raw.get("lockfile_hash"))
    if not isinstance(revision, str) or not HEX40_RE.fullmatch(revision):
        raise BuildContractError("source_revision must be 40 hexadecimal characters")
    if not isinstance(lockfile_sha256, str) or not HEX64_RE.fullmatch(lockfile_sha256):
        raise BuildContractError("lockfile_sha256 must be 64 hexadecimal characters")
    target_value = raw.get("target", raw.get("targets"))
    if isinstance(target_value, str) and target_value:
        target: str | list[str] = target_value
    else:
        targets = normalise_string_set(target_value, "target")
        if not targets:
            raise BuildContractError("target is required")
        target = targets[0] if len(targets) == 1 else targets
    required = ("authority", "namespace", "toolchain", "host", "profile", "renderer", "backend")
    for field in required:
        if field not in raw:
            raise BuildContractError(f"missing required field: {field}")
    canonical: dict[str, object] = {
        "schema_version": BUILD_KEY_SCHEMA,
        "authority": stable_slug(raw["authority"], "authority"),
        "namespace": stable_slug(raw["namespace"], "namespace"),
        "source_revision": revision.lower(),
        "toolchain": stable_slug(raw["toolchain"], "toolchain"),
        "host": stable_slug(raw["host"], "host"),
        "target": target,
        "profile": stable_slug(raw["profile"], "profile"),
        "features": normalise_string_set(raw.get("features", []), "features"),
        "renderer": stable_slug(raw["renderer"], "renderer"),
        "backend": stable_slug(raw["backend"], "backend"),
        "lockfile_sha256": lockfile_sha256.lower(),
        "commands": normalise_commands(
            raw.get("commands", raw.get("command")),
            repo_root=repo,
            roots=roots,
        ),
        "environment": normalise_environment(raw.get("environment", {})),
    }
    optional = {
        "profile_id",
        "manifest_path",
        "working_directory",
        "target_dir",
        "result_dir",
        "evidence_dir",
    }
    path_roots = {
        "target_dir": roots.cache_root if roots is not None else None,
        "result_dir": roots.result_root if roots is not None else None,
        "evidence_dir": roots.evidence_root if roots is not None else None,
        "manifest_path": repo,
        "working_directory": repo,
    }
    for field in optional:
        if field not in raw:
            continue
        value = raw[field]
        if field == "profile_id":
            canonical[field] = stable_slug(value, field)
        elif not isinstance(value, str):
            raise BuildContractError(f"{field} must be a string")
        else:
            if value.startswith("$"):
                logical = validate_logical_path(value, field)
                expected_prefix = {
                    "target_dir": "$TESSERA_BUILD_CACHE",
                    "result_dir": "$TESSERA_BUILD_RESULTS",
                    "evidence_dir": "$TESSERA_EVIDENCE",
                    "manifest_path": "$REPO",
                    "working_directory": "$REPO",
                }.get(field)
                if expected_prefix is not None and not (
                    logical == expected_prefix or logical.startswith(expected_prefix + "/")
                ):
                    raise PathContractError(f"{field} is outside its logical managed root")
                canonical[field] = logical
                continue
            if not value.startswith(("/", "~")):
                raise PathContractError(f"{field} must be absolute or a logical path")
            expected_root = path_roots[field]
            if expected_root is None:
                raise PathContractError(f"{field} cannot use an absolute path without its root")
            candidate = absolute_path(value)
            if field in {"manifest_path", "working_directory"}:
                if repo is None or not path_contains(repo, candidate):
                    raise PathContractError(f"{field} must be inside repo_root")
            else:
                validate_managed_path(
                    candidate,
                    expected_root,
                    repo_root=repo,
                    reject_private_tmp=not roots.fixture_mode if roots is not None else True,
                )
            canonical[field] = logical_path(value, repo_root=repo, roots=roots)
            validate_logical_path(canonical[field], field)
    return canonical


def canonical_json_bytes(value: object) -> bytes:
    def canonical_value(item: object) -> object:
        if isinstance(item, Mapping):
            result: dict[str, object] = {}
            for key, child in item.items():
                if not isinstance(key, str):
                    raise BuildContractError("canonical JSON object keys must be strings")
                result[key] = canonical_value(child)
            return result
        if isinstance(item, (list, tuple)):
            return [canonical_value(child) for child in item]
        if isinstance(item, float):
            if not math.isfinite(item):
                raise BuildContractError("NaN and infinity are not valid canonical JSON")
            if item == 0 or item.is_integer():
                return int(item)
            return float(format(item, ".15g"))
        if isinstance(item, (str, int, bool)) or item is None:
            return item
        raise BuildContractError(f"unsupported canonical JSON type: {type(item).__name__}")
    try:
        return json.dumps(
            canonical_value(value),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise BuildContractError(f"cannot encode canonical JSON: {exc}") from exc


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def build_key(
    raw: Mapping[str, object],
    *,
    repo_root: os.PathLike[str] | str | None = None,
    roots: ManagedRoots | None = None,
) -> tuple[dict[str, object], bytes, str]:
    canonical = canonicalize_build_key(raw, repo_root=repo_root, roots=roots)
    encoded = canonical_json_bytes(canonical)
    return canonical, encoded, sha256_bytes(encoded)


def write_key_json(
    path: os.PathLike[str] | str,
    raw: Mapping[str, object],
    *,
    repo_root: os.PathLike[str] | str | None = None,
    roots: ManagedRoots | None = None,
) -> tuple[dict[str, object], str]:
    key, encoded, digest = build_key(raw, repo_root=repo_root, roots=roots)
    atomic_write_bytes(path, encoded)
    return key, digest


def read_key_json(path: os.PathLike[str] | str) -> tuple[dict[str, object], bytes, str]:
    target = absolute_path(path)
    if contains_symlink(target, target.parent):
        raise PathContractError(f"refusing to read symlink key: {target}")
    try:
        payload = target.read_bytes()
        parsed = json.loads(payload.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BuildContractError(f"invalid key.json: {target}") from exc
    if not isinstance(parsed, Mapping):
        raise BuildContractError("key.json must contain an object")
    canonical, encoded, digest = build_key(parsed)
    if payload != encoded:
        raise BuildContractError("key.json is not in canonical byte form")
    return canonical, encoded, digest


def read_json(path: os.PathLike[str] | str, *, max_bytes: int = 16 * 1024 * 1024) -> Any:
    target = absolute_path(path)
    if contains_symlink(target, target.parent):
        raise PathContractError(f"refusing to read symlink JSON: {target}")
    try:
        payload = target.read_bytes()
    except OSError as exc:
        raise BuildContractError(f"cannot read JSON: {target}") from exc
    if len(payload) > max_bytes:
        raise BuildContractError(f"JSON exceeds size limit: {target}")
    try:
        return json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BuildContractError(f"invalid JSON: {target}") from exc


def atomic_write_bytes(path: os.PathLike[str] | str, payload: bytes, *, mode: int = 0o600) -> None:
    target = absolute_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    if contains_symlink(target.parent, target.parent.parent):
        raise PathContractError(f"refusing to write through symlinked path: {target.parent}")
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=os.fspath(target.parent))
    temporary = Path(temporary_name)
    try:
        os.fchmod(descriptor, mode)
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(os.fspath(temporary), os.fspath(target))
    except BaseException:
        with contextlib.suppress(OSError):
            os.close(descriptor)
        with contextlib.suppress(FileNotFoundError):
            temporary.unlink()
        raise


def profile_id(key: Mapping[str, object]) -> str:
    supplied = key.get("profile_id")
    return stable_slug(supplied if supplied is not None else key["profile"], "profile_id").lower()


def managed_target_dir(key: Mapping[str, object], key_sha256: str, roots: ManagedRoots | None = None) -> Path:
    roots = roots or ManagedRoots.default()
    if not HEX64_RE.fullmatch(key_sha256):
        raise BuildContractError("key_sha256 must be 64 hexadecimal characters")
    return (
        roots.cache_root
        / str(key["authority"])
        / str(key["source_revision"])
        / profile_id(key)
        / key_sha256.lower()
        / "target"
    )


def managed_result_dir(key: Mapping[str, object], key_sha256: str, roots: ManagedRoots | None = None) -> Path:
    roots = roots or ManagedRoots.default()
    if not HEX64_RE.fullmatch(key_sha256):
        raise BuildContractError("key_sha256 must be 64 hexadecimal characters")
    return (
        roots.result_root
        / str(key["authority"])
        / str(key["source_revision"])
        / profile_id(key)
        / key_sha256.lower()
    )


def key_json_path_for_key(
    key: Mapping[str, object],
    key_sha256: str,
    roots: ManagedRoots | None = None,
) -> Path:
    return managed_result_dir(key, key_sha256, roots) / "key.json"


def managed_lease_path(key: Mapping[str, object], key_sha256: str, roots: ManagedRoots | None = None) -> Path:
    return managed_target_dir(key, key_sha256, roots).parent / "writer.lease.json"


def validate_managed_lease_path(
    path: os.PathLike[str] | str,
    roots: ManagedRoots,
) -> Path:
    target = validate_managed_path(
        path,
        roots.cache_root,
        reject_private_tmp=not roots.fixture_mode,
    )
    try:
        relative = target.relative_to(roots.cache_root)
    except ValueError as exc:
        raise PathContractError(f"lease is outside managed cache root: {target}") from exc
    parts = relative.parts
    if (
        len(parts) != 5
        or parts[-1] != "writer.lease.json"
        or not SLUG_RE.fullmatch(parts[0])
        or not HEX40_RE.fullmatch(parts[1])
        or parts[1] != parts[1].lower()
        or not SLUG_RE.fullmatch(parts[2])
        or not HEX64_RE.fullmatch(parts[3])
        or parts[3] != parts[3].lower()
    ):
        raise PathContractError(
            "lease path must be cache/<authority>/<revision>/<profile-id>/<key-sha256>/writer.lease.json"
        )
    return target


# Short aliases used by build wrappers and kept intentionally read-only.
target_dir_for_key = managed_target_dir
result_dir_for_key = managed_result_dir
lease_path_for_key = managed_lease_path


def now_seconds(value: object | None = None) -> float:
    if value is None:
        return time.time()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, datetime_module.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=datetime_module.timezone.utc)
        return value.timestamp()
    raise BuildContractError(f"unsupported clock value: {type(value).__name__}")


def timestamp(value: object | None = None) -> str:
    moment = datetime_module.datetime.fromtimestamp(now_seconds(value), datetime_module.timezone.utc)
    return moment.isoformat(timespec="microseconds").replace("+00:00", "Z")


def parse_timestamp(value: object) -> float:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise BuildContractError("timestamps must be UTC ISO-8601 strings")
    try:
        parsed = datetime_module.datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as exc:
        raise BuildContractError(f"invalid timestamp: {value!r}") from exc
    if parsed.tzinfo is None:
        raise BuildContractError("timestamp must include a timezone")
    return parsed.timestamp()


def host_identity() -> str:
    hostname = socket.gethostname().strip()
    if not hostname:
        raise BuildContractError("host identity is unavailable")
    return f"{platform.system().lower()}:{hostname}"


def current_process_start_token(pid: int | None = None) -> str | None:
    process_id = os.getpid() if pid is None else int(pid)
    if process_id <= 0:
        return None
    proc_stat = Path(f"/proc/{process_id}/stat")
    if proc_stat.exists():
        try:
            contents = proc_stat.read_text(encoding="utf-8")
            tail = contents.rsplit(")", 1)[1].split()
            # Field 22 (starttime), after fields 1 and 2 have been removed.
            return f"proc:{tail[19]}"
        except (OSError, IndexError, ValueError):
            return None
    try:
        completed = subprocess.run(
            ["ps", "-p", str(process_id), "-o", "lstart="],
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    value = completed.stdout.strip()
    return f"ps:{value}" if completed.returncode == 0 and value else None


def process_identity(
    pid: int,
    *,
    expected_host_id: str | None = None,
    expected_start_token: str | None = None,
) -> dict[str, object]:
    if not isinstance(pid, int) or pid <= 0:
        return {"known": False, "alive": None, "reason": "invalid-pid"}
    local_host = host_identity()
    if expected_host_id is not None and expected_host_id != local_host:
        return {"known": False, "alive": None, "reason": "different-host"}
    token = current_process_start_token(pid)
    if token is None:
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return {"known": True, "alive": False, "reason": "process-absent"}
        except PermissionError:
            return {"known": False, "alive": None, "reason": "process-identity-denied"}
        except OSError:
            return {"known": False, "alive": None, "reason": "process-identity-unknown"}
        return {"known": False, "alive": None, "reason": "start-token-unknown"}
    if expected_start_token is None:
        return {
            "known": False,
            "alive": None,
            "reason": "lease-start-token-missing",
            "actual_start_token": token,
        }
    if token != expected_start_token:
        return {"known": True, "alive": False, "reason": "pid-reused", "actual_start_token": token}
    return {"known": True, "alive": True, "reason": "identity-matches", "actual_start_token": token}


def _lease_fingerprint(record: Mapping[str, object]) -> tuple[object, ...]:
    return (
        record.get("lease_id"),
        record.get("key_sha256"),
        record.get("host_id"),
        record.get("pid"),
        record.get("process_start_token"),
    )


def _validate_lease_shape(record: object) -> dict[str, object]:
    if not isinstance(record, Mapping):
        raise BuildContractError("lease must be an object")
    required = (
        "schema_version",
        "lease_id",
        "key_sha256",
        "source_revision",
        "writer_session",
        "pid",
        "process_start_token",
        "host_id",
        "acquired_at",
        "heartbeat_at",
        "expires_at",
    )
    missing = [field for field in required if field not in record]
    if missing:
        raise BuildContractError("lease is missing fields: " + ", ".join(missing))
    if record["schema_version"] != LEASE_SCHEMA:
        raise BuildContractError("unsupported lease schema")
    if not isinstance(record["lease_id"], str) or not re.fullmatch(r"[0-9a-f]{64}", record["lease_id"]):
        raise BuildContractError("lease_id must be 32 random bytes encoded as lowercase hex")
    if not isinstance(record["key_sha256"], str) or not HEX64_RE.fullmatch(record["key_sha256"]):
        raise BuildContractError("lease key_sha256 is invalid")
    if not isinstance(record["source_revision"], str) or not HEX40_RE.fullmatch(record["source_revision"]):
        raise BuildContractError("lease source_revision is invalid")
    if not isinstance(record["writer_session"], str) or not record["writer_session"] or "\x00" in record["writer_session"]:
        raise BuildContractError("lease writer_session is invalid")
    if not isinstance(record["pid"], int) or isinstance(record["pid"], bool) or record["pid"] <= 0:
        raise BuildContractError("lease pid is invalid")
    if not isinstance(record["process_start_token"], str) or not record["process_start_token"]:
        raise BuildContractError("lease process_start_token is missing")
    if not isinstance(record["host_id"], str) or not record["host_id"]:
        raise BuildContractError("lease host_id is missing")
    acquired = parse_timestamp(record["acquired_at"])
    heartbeat = parse_timestamp(record["heartbeat_at"])
    expires = parse_timestamp(record["expires_at"])
    if heartbeat < acquired or expires < heartbeat:
        raise BuildContractError("lease timestamps are not monotonic")
    return dict(record)


def read_lease(path: os.PathLike[str] | str) -> dict[str, object]:
    target = absolute_path(path)
    if contains_symlink(target, target.parent):
        raise PathContractError(f"refusing to read symlink lease: {target}")
    try:
        mode = os.stat(target, follow_symlinks=False).st_mode
    except OSError as exc:
        raise BuildContractError(f"cannot stat lease: {target}: {exc}") from exc
    if not stat.S_ISREG(mode):
        raise BuildContractError(f"lease is not a regular file: {target}")
    try:
        payload = target.read_bytes()
        if len(payload) > 1024 * 1024:
            raise BuildContractError("lease exceeds the size limit")
        record = json.loads(payload.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BuildContractError(f"invalid lease JSON: {target}") from exc
    return _validate_lease_shape(record)


@contextlib.contextmanager
def _lease_guard(lease_path: Path) -> Any:
    parent = lease_path.parent
    parent.mkdir(parents=True, exist_ok=True)
    guard_path = parent / ".lease.guard"
    if os.path.lexists(os.fspath(guard_path)) and guard_path.is_symlink():
        raise PathContractError(f"lease guard is a symlink: {guard_path}")
    guard_flags = os.O_CREAT | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        guard_flags |= os.O_NOFOLLOW
    descriptor = os.open(os.fspath(guard_path), guard_flags, 0o600)
    try:
        if fcntl is not None:
            fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        if fcntl is not None:
            with contextlib.suppress(OSError):
                fcntl.flock(descriptor, fcntl.LOCK_UN)
        os.close(descriptor)


def _write_exclusive_json(path: Path, value: Mapping[str, object]) -> None:
    _write_exclusive_bytes(path, canonical_json_bytes(value))


def _write_exclusive_bytes(path: Path, payload: bytes) -> None:
    if contains_symlink(path.parent, path.parent.parent):
        raise PathContractError(f"refusing to write through symlinked parent: {path.parent}")
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(os.fspath(path), flags, 0o600)
    except FileExistsError as exc:
        raise LeaseBusy(f"lease already exists: {path}") from exc
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        with contextlib.suppress(OSError):
            directory_descriptor = os.open(os.fspath(path.parent), os.O_RDONLY)
            try:
                os.fsync(directory_descriptor)
            finally:
                os.close(directory_descriptor)
    except BaseException:
        with contextlib.suppress(OSError):
            os.close(descriptor)
        with contextlib.suppress(FileNotFoundError):
            path.unlink()
        raise


def ensure_key_json(
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
    roots: ManagedRoots,
) -> Path:
    canonical, payload, digest = _canonical_key_from_value(key)
    target = key_json_path_for_key(canonical, digest, roots)
    validate_managed_path(
        target,
        managed_result_dir(canonical, digest, roots),
        reject_private_tmp=not roots.fixture_mode,
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.is_symlink():
            raise PathContractError(f"key.json is a symlink: {target}")
        try:
            existing = target.read_bytes()
        except OSError as exc:
            raise BuildContractError(f"cannot read existing key.json: {target}") from exc
        if existing != payload:
            raise BuildContractError("existing key.json does not match canonical key bytes")
    else:
        _write_exclusive_bytes(target, payload)
    return target


REBUILDABLE_MARKER_NAME = "rebuildable.json"


def rebuildable_marker(
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
) -> dict[str, object]:
    """Return the small, stable proof that a cache entry has a rebuild recipe."""
    canonical, key_bytes, digest = _canonical_key_from_value(key)
    return {
        "schema_version": REBUILDABLE_SCHEMA,
        "key_sha256": digest,
        "key_json_bytes_sha256": sha256_bytes(key_bytes),
        "authority": canonical["authority"],
        "source_revision": canonical["source_revision"],
        "profile_id": profile_id(canonical),
        "rebuildable": True,
    }


def write_rebuildable_marker(
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
    *,
    roots: ManagedRoots,
) -> Path:
    """Write the canonical rebuildability proof beside one managed target."""
    marker = rebuildable_marker(key)
    canonical, _key_bytes, digest = _canonical_key_from_value(key)
    target = managed_target_dir(canonical, digest, roots).parent / REBUILDABLE_MARKER_NAME
    validate_managed_path(
        target,
        roots.cache_root,
        reject_private_tmp=not roots.fixture_mode,
    )
    atomic_write_bytes(target, canonical_json_bytes(marker))
    return target


def validate_rebuildable_marker(
    path: os.PathLike[str] | str,
    *,
    authority: str,
    source_revision: str,
    profile_id_value: str,
    key_sha256: str,
    key_json_bytes_sha256: str | None = None,
) -> list[dict[str, str]]:
    """Validate a cache entry's rebuildability proof without touching its target."""
    errors: list[dict[str, str]] = []
    try:
        record, _payload = _canonical_file_bytes(absolute_path(path))
    except BuildContractError as exc:
        return [error("REBUILDABLE_READ", str(exc))]
    if record.get("schema_version") != REBUILDABLE_SCHEMA:
        errors.append(error("REBUILDABLE_SCHEMA", "unsupported rebuildability marker schema"))
    if record.get("rebuildable") is not True:
        errors.append(error("REBUILDABLE_FLAG", "rebuildability marker is not affirmative"))
    expected = {
        "authority": authority,
        "source_revision": source_revision.lower(),
        "profile_id": profile_id_value.lower(),
        "key_sha256": key_sha256.lower(),
    }
    for field, expected_value in expected.items():
        if record.get(field) != expected_value:
            errors.append(error("REBUILDABLE_IDENTITY", f"marker {field} does not match cache identity"))
    marker_key_bytes_hash = record.get("key_json_bytes_sha256")
    if not isinstance(marker_key_bytes_hash, str) or not HEX64_RE.fullmatch(marker_key_bytes_hash):
        errors.append(error("REBUILDABLE_KEY_HASH", "marker key JSON byte hash is invalid"))
    elif key_json_bytes_sha256 is not None and marker_key_bytes_hash != key_json_bytes_sha256:
        errors.append(error("REBUILDABLE_KEY_HASH", "marker key JSON byte hash does not match key.json"))
    return errors


def lease_liveness(
    record: Mapping[str, object],
    *,
    now: object | None = None,
    checker: Callable[[Mapping[str, object]], object] | None = None,
) -> tuple[str, str]:
    """Return active, stale or uncertain without guessing."""
    try:
        lease = _validate_lease_shape(record)
        current = now_seconds(now)
        heartbeat = parse_timestamp(lease["heartbeat_at"])
        expires = parse_timestamp(lease["expires_at"])
    except BuildContractError as exc:
        return "uncertain", str(exc)
    if heartbeat > current or expires > current:
        return "active", "lease has not expired"
    if checker is not None:
        result = checker(lease)
        if isinstance(result, Mapping):
            if result.get("alive") is True and result.get("known") is True:
                return "active", str(result.get("reason", "process identity matches"))
            if result.get("alive") is False and result.get("known") is True:
                return "stale", str(result.get("reason", "process identity absent"))
            return "uncertain", str(result.get("reason", "process identity unknown"))
        if result is True or result == "alive" or result == "active":
            return "active", "injected process identity is alive"
        if result is False or result in {"dead", "stale", "absent"}:
            return "stale", "injected process identity is absent"
        return "uncertain", "injected process identity is unknown"
    identity = process_identity(
        int(lease["pid"]),
        expected_host_id=str(lease["host_id"]),
        expected_start_token=str(lease["process_start_token"]),
    )
    if identity["known"] and identity["alive"]:
        return "active", str(identity["reason"])
    if identity["known"] and identity["alive"] is False:
        return "stale", str(identity["reason"])
    return "uncertain", str(identity["reason"])


def acquire_lease(
    lease_path: os.PathLike[str] | str,
    *,
    key_sha256: str,
    source_revision: str,
    writer_session: str,
    ttl_seconds: int = DEFAULT_LEASE_TTL_SECONDS,
    heartbeat_seconds: int = DEFAULT_HEARTBEAT_SECONDS,
    pid: int | None = None,
    process_start_token: str | None = None,
    host_id: str | None = None,
    now: object | None = None,
    process_checker: Callable[[Mapping[str, object]], object] | None = None,
) -> dict[str, object]:
    if not HEX64_RE.fullmatch(key_sha256):
        raise BuildContractError("key_sha256 must be 64 hexadecimal characters")
    if not HEX40_RE.fullmatch(source_revision):
        raise BuildContractError("source_revision must be 40 hexadecimal characters")
    if not isinstance(writer_session, str) or not writer_session or "\x00" in writer_session:
        raise BuildContractError("writer_session must be a non-empty string")
    if ttl_seconds <= 0 or heartbeat_seconds <= 0 or heartbeat_seconds > ttl_seconds:
        raise BuildContractError("lease heartbeat/TTL values are invalid")
    process_id = os.getpid() if pid is None else int(pid)
    start_token = process_start_token or current_process_start_token(process_id)
    if not start_token:
        raise BuildContractError("process start identity is unavailable; refusing lease")
    identity = host_id or host_identity()
    path = absolute_path(lease_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with _lease_guard(path):
        if os.path.lexists(os.fspath(path)):
            if contains_symlink(path, path.parent):
                raise LeaseBusy(f"lease path is a symlink: {path}")
            try:
                current = read_lease(path)
            except BuildContractError as exc:
                raise LeaseBusy(f"existing lease is unreadable; retaining it: {path}") from exc
            state, reason = lease_liveness(current, now=now, checker=process_checker)
            if state != "stale":
                raise LeaseBusy(f"existing lease is {state}: {reason}")
            stale_path = path.with_name(path.name + ".stale." + secrets.token_hex(8))
            try:
                os.replace(os.fspath(path), os.fspath(stale_path))
            except OSError as exc:
                raise LeaseBusy(f"could not fence stale lease: {path}") from exc
        current_time = now_seconds(now)
        record: dict[str, object] = {
            "schema_version": LEASE_SCHEMA,
            "lease_id": secrets.token_hex(32),
            "key_sha256": key_sha256.lower(),
            "source_revision": source_revision.lower(),
            "writer_session": writer_session,
            "pid": process_id,
            "process_start_token": start_token,
            "host_id": identity,
            "acquired_at": timestamp(current_time),
            "heartbeat_at": timestamp(current_time),
            "expires_at": timestamp(current_time + ttl_seconds),
            "heartbeat_interval_seconds": heartbeat_seconds,
            "ttl_seconds": ttl_seconds,
        }
        _validate_lease_shape(record)
        _write_exclusive_json(path, record)
        return record


def assert_lease(
    lease_path: os.PathLike[str] | str,
    expected: Mapping[str, object],
    *,
    now: object | None = None,
) -> dict[str, object]:
    try:
        current = read_lease(lease_path)
    except (BuildContractError, OSError) as exc:
        raise LeaseFenced(f"lease cannot be read: {lease_path}") from exc
    if _lease_fingerprint(current) != _lease_fingerprint(expected):
        raise LeaseFenced("lease fencing identity does not match")
    if parse_timestamp(current["expires_at"]) <= now_seconds(now):
        raise LeaseFenced("lease has expired")
    return current


def heartbeat_lease(
    lease_path: os.PathLike[str] | str,
    expected: Mapping[str, object],
    *,
    now: object | None = None,
    ttl_seconds: int | None = None,
    verify_process: bool = True,
) -> dict[str, object]:
    path = absolute_path(lease_path)
    with _lease_guard(path):
        current = assert_lease(path, expected, now=now)
        if verify_process:
            identity = process_identity(
                int(current["pid"]),
                expected_host_id=str(current["host_id"]),
                expected_start_token=str(current["process_start_token"]),
            )
            if not (identity["known"] and identity["alive"]):
                raise LeaseFenced(f"process identity is not current: {identity.get('reason')}")
        current_time = now_seconds(now)
        ttl = int(ttl_seconds if ttl_seconds is not None else current.get("ttl_seconds", DEFAULT_LEASE_TTL_SECONDS))
        if ttl <= 0:
            raise BuildContractError("lease TTL must be positive")
        current["heartbeat_at"] = timestamp(current_time)
        current["expires_at"] = timestamp(current_time + ttl)
        _validate_lease_shape(current)
        atomic_write_bytes(path, canonical_json_bytes(current))
        return current


def release_lease(
    lease_path: os.PathLike[str] | str,
    expected: Mapping[str, object],
    *,
    now: object | None = None,
) -> None:
    path = absolute_path(lease_path)
    with _lease_guard(path):
        assert_lease(path, expected, now=now)
        try:
            path.unlink()
        except FileNotFoundError as exc:
            raise LeaseFenced("lease disappeared before release") from exc


def fence_lease_write(
    lease_path: os.PathLike[str] | str,
    expected: Mapping[str, object],
    *,
    now: object | None = None,
) -> dict[str, object]:
    return assert_lease(lease_path, expected, now=now)


def file_digest(path: os.PathLike[str] | str) -> tuple[str, int]:
    target = absolute_path(path)
    if contains_symlink(target, target.parent):
        raise PathContractError(f"symlink file is not hashable: {target}")
    try:
        mode = os.stat(target, follow_symlinks=False).st_mode
    except OSError as exc:
        raise BuildContractError(f"cannot stat artifact: {target}") from exc
    if not stat.S_ISREG(mode):
        raise BuildContractError(f"artifact is not a regular file: {target}")
    digest = hashlib.sha256()
    size = 0
    with open(target, "rb") as stream:
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def sha256_file(path: os.PathLike[str] | str) -> str:
    return file_digest(path)[0]


def tree_manifest(
    path: os.PathLike[str] | str,
    *,
    max_entries: int = 100_000,
) -> tuple[list[dict[str, object]], int]:
    root = absolute_path(path)
    if contains_symlink(root, root.parent):
        raise PathContractError(f"symlink tree root is not allowed: {root}")
    if not root.is_dir():
        raise BuildContractError(f"tree artifact is not a directory: {root}")
    entries: list[dict[str, object]] = []
    total_size = 0
    pending: list[tuple[Path, str]] = [(root, "")]
    while pending:
        directory, prefix = pending.pop()
        try:
            children = sorted(os.scandir(directory), key=lambda item: item.name, reverse=True)
        except OSError as exc:
            raise BuildContractError(f"cannot enumerate tree: {directory}") from exc
        for entry in children:
            relative = entry.name if not prefix else prefix + "/" + entry.name
            if entry.name in {".", ".."} or "\\" in relative or "\x00" in relative:
                raise PathContractError(f"unsafe tree entry: {relative}")
            entry_path = Path(entry.path)
            if entry.is_symlink():
                raise PathContractError(f"symlink tree entry is not allowed: {entry_path}")
            if entry.is_dir(follow_symlinks=False):
                entries.append({"path": relative, "kind": "directory"})
                pending.append((entry_path, relative))
            elif entry.is_file(follow_symlinks=False):
                digest, size = file_digest(entry_path)
                entries.append(
                    {"path": relative, "kind": "file", "size_bytes": size, "sha256": digest}
                )
                total_size += size
            else:
                raise BuildContractError(f"special tree entry is not allowed: {entry_path}")
            if len(entries) > max_entries:
                raise BuildContractError("tree manifest exceeds the entry limit")
    entries.sort(key=lambda item: str(item["path"]))
    return entries, total_size


def tree_digest(path: os.PathLike[str] | str) -> tuple[str, str, int]:
    entries, total_size = tree_manifest(path)
    manifest_bytes = canonical_json_bytes(entries)
    manifest_digest = sha256_bytes(manifest_bytes)
    tree_hash = sha256_bytes(b"tessera-tree-v1\x00" + manifest_digest.encode("ascii"))
    return tree_hash, manifest_digest, total_size


def artifact_descriptor(
    *,
    artifact_id: str,
    kind: str,
    root_id: str,
    relative_path: str,
    roots: ManagedRoots,
    media_type: str = "application/octet-stream",
    retention_class: str = "rebuildable",
    key: Mapping[str, object] | None = None,
    key_sha256: str | None = None,
) -> dict[str, object]:
    relative = validate_relative_path(relative_path)
    if root_id == "target":
        if key is None or key_sha256 is None:
            raise BuildContractError("target artifacts require their canonical key")
        root = managed_target_dir(key, key_sha256, roots)
    elif root_id in {"result", "results"}:
        if key is None or key_sha256 is None:
            raise BuildContractError("result artifacts require their canonical key")
        root = managed_result_dir(key, key_sha256, roots)
    elif root_id == "evidence":
        root = roots.evidence_root
        if key is not None and not relative.startswith(str(key["source_revision"]).lower() + "/"):
            raise PathContractError("evidence artifacts must be below their source revision")
    elif root_id == "cache":
        root = roots.cache_root
    else:
        raise PathContractError(f"unknown artifact root_id: {root_id}")
    target = validate_managed_path(
        root / relative,
        root,
        allow_missing=False,
        reject_private_tmp=not roots.fixture_mode,
    )
    if target.is_dir():
        digest, manifest_digest, size = tree_digest(target)
        return {
            "artifact_id": artifact_id,
            "kind": "tree" if kind in {"directory", "tree"} else kind,
            "root_id": root_id,
            "relative_path": relative,
            "sha256": digest,
            "tree_manifest_sha256": manifest_digest,
            "size_bytes": size,
            "media_type": media_type,
            "retention_class": retention_class,
        }
    digest, size = file_digest(target)
    return {
        "artifact_id": artifact_id,
        "kind": kind,
        "root_id": root_id,
        "relative_path": relative,
        "sha256": digest,
        "size_bytes": size,
        "media_type": media_type,
        "retention_class": retention_class,
    }


LEDGER_STATES = {"reserved", "running", "passed", "failed", "sealed"}
LEDGER_TERMINAL_STATUSES = {
    "passed",
    "failed",
    "cancelled",
    "timeout",
    "orphaned_writer",
    "seal_error",
}
LEDGER_TRANSITIONS = {
    "reserved": {"running"},
    "running": {"passed", "failed"},
    "passed": {"sealed"},
    "failed": {"sealed"},
}
LEDGER_REQUIRED_FIELDS = {
    "schema_version",
    "ledger_id",
    "authority",
    "namespace",
    "source_revision",
    "source_session",
    "key",
    "key_sha256",
    "toolchain",
    "host",
    "target",
    "profile",
    "features",
    "renderer",
    "backend",
    "lockfile_sha256",
    "commands",
    "environment",
    "state",
    "status",
    "consumable",
    "created_at",
    "updated_at",
    "artifacts",
    "evidence_refs",
    "profile_id",
    "key_json_bytes_sha256",
    "outcome",
    "sealed_at",
    "lease_fingerprint",
    "transitions",
}


def _canonical_key_from_value(
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
) -> tuple[dict[str, object], bytes, str]:
    if isinstance(key, tuple):
        if len(key) != 3:
            raise BuildContractError("canonical key tuple must contain key, bytes, and digest")
        canonical, encoded, digest = key
        rebuilt, rebuilt_encoded, rebuilt_digest = build_key(canonical)
        if not isinstance(encoded, bytes) or not isinstance(digest, str):
            raise BuildContractError("canonical key tuple bytes or digest has an invalid type")
        if encoded != rebuilt_encoded or digest.lower() != rebuilt_digest:
            raise BuildContractError("canonical key tuple bytes or digest do not match its key")
        return rebuilt, rebuilt_encoded, rebuilt_digest
    return build_key(key)


def new_ledger(
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
    *,
    source_session: str,
    now: object | None = None,
    ledger_id: str | None = None,
    lease_path: os.PathLike[str] | str | None = None,
    lease: Mapping[str, object] | None = None,
    roots: ManagedRoots | None = None,
) -> dict[str, object]:
    canonical_key, key_bytes, key_digest = _canonical_key_from_value(key)
    if not isinstance(source_session, str) or not source_session or "\x00" in source_session:
        raise BuildContractError("source_session must be a non-empty string")
    identifier = ledger_id or uuid.uuid4().hex
    if not re.fullmatch(r"[0-9a-f]{32}", identifier):
        raise BuildContractError("ledger_id must be 128-bit lowercase hex")
    created = timestamp(now)
    record: dict[str, object] = {
        "schema_version": LEDGER_SCHEMA,
        "ledger_id": identifier,
        "authority": canonical_key["authority"],
        "namespace": canonical_key["namespace"],
        "source_revision": canonical_key["source_revision"],
        "source_session": source_session,
        "key": canonical_key,
        "key_sha256": key_digest,
        "key_json_bytes_sha256": sha256_bytes(key_bytes),
        "toolchain": canonical_key["toolchain"],
        "host": canonical_key["host"],
        "target": canonical_key["target"],
        "profile": canonical_key["profile"],
        "profile_id": profile_id(canonical_key),
        "features": canonical_key["features"],
        "renderer": canonical_key["renderer"],
        "backend": canonical_key["backend"],
        "lockfile_sha256": canonical_key["lockfile_sha256"],
        "commands": canonical_key["commands"],
        "environment": canonical_key["environment"],
        "state": "reserved",
        "status": "reserved",
        "outcome": "pending",
        "consumable": False,
        "created_at": created,
        "updated_at": created,
        "sealed_at": None,
        "artifacts": [],
        "evidence_refs": [],
        "transitions": [{"state": "reserved", "at": created}],
    }
    if lease_path is None or lease is None:
        raise LeaseFenced("reserving a ledger requires an active writer lease")
    lease_value = fence_lease_write(lease_path, lease, now=now)
    if lease_value["key_sha256"] != key_digest or lease_value["source_revision"] != canonical_key["source_revision"]:
        raise LeaseFenced("writer lease does not bind this canonical key and revision")
    record["lease_fingerprint"] = {
        "lease_id": lease_value["lease_id"],
        "key_sha256": lease_value["key_sha256"],
        "host_id": lease_value["host_id"],
        "pid": lease_value["pid"],
        "process_start_token": lease_value["process_start_token"],
    }
    record["transitions"] = [
        {
            "state": "reserved",
            "at": created,
            "lease_fingerprint": dict(record["lease_fingerprint"]),
        }
    ]
    if roots is not None:
        record["target_root"] = "$TESSERA_BUILD_CACHE/" + "/".join(
            (
                str(canonical_key["authority"]),
                str(canonical_key["source_revision"]),
                profile_id(canonical_key),
                key_digest,
                "target",
            )
        )
        record["result_root"] = "$TESSERA_BUILD_RESULTS/" + "/".join(
            (
                str(canonical_key["authority"]),
                str(canonical_key["source_revision"]),
                profile_id(canonical_key),
                key_digest,
            )
        )
    return record


def _record_from_json(value: Mapping[str, object] | os.PathLike[str] | str) -> tuple[dict[str, object], Path | None]:
    if isinstance(value, Mapping):
        return dict(value), None
    path = absolute_path(value)
    if contains_symlink(path, path.parent):
        raise PathContractError(f"refusing to read symlink ledger: {path}")
    try:
        payload = path.read_bytes()
        record = json.loads(payload.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BuildContractError(f"invalid ledger JSON: {path}") from exc
    if not isinstance(record, Mapping):
        raise BuildContractError("ledger JSON must be an object")
    return dict(record), path


def _artifact_root(
    record: Mapping[str, object],
    root_id: str,
    roots: ManagedRoots,
) -> Path:
    key = record.get("key")
    digest = record.get("key_sha256")
    if not isinstance(key, Mapping) or not isinstance(digest, str):
        raise PathContractError("artifact root cannot be resolved without the canonical key")
    if root_id == "target":
        return managed_target_dir(key, digest, roots)
    if root_id in {"result", "results"}:
        return managed_result_dir(key, digest, roots)
    if root_id == "evidence":
        return roots.evidence_root
    if root_id == "cache":
        return roots.cache_root
    raise PathContractError(f"unknown artifact root_id: {root_id}")


def _valid_lease_fingerprint(value: object) -> dict[str, object] | None:
    if not isinstance(value, Mapping):
        return None
    required = {"lease_id", "key_sha256", "host_id", "pid", "process_start_token"}
    if required - set(value):
        return None
    candidate = {field: value[field] for field in required}
    if not isinstance(candidate["lease_id"], str) or not re.fullmatch(r"[0-9a-f]{64}", candidate["lease_id"]):
        return None
    if not isinstance(candidate["key_sha256"], str) or not HEX64_RE.fullmatch(candidate["key_sha256"]):
        return None
    if not isinstance(candidate["host_id"], str) or not candidate["host_id"]:
        return None
    if not isinstance(candidate["pid"], int) or isinstance(candidate["pid"], bool) or candidate["pid"] <= 0:
        return None
    if not isinstance(candidate["process_start_token"], str) or not candidate["process_start_token"]:
        return None
    return candidate


def _validate_artifact(
    record: Mapping[str, object],
    artifact: object,
    *,
    roots: ManagedRoots | None,
    check_hashes: bool,
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if not isinstance(artifact, Mapping):
        return [error("ARTIFACT_TYPE", "artifact descriptor must be an object")]
    required = {
        "artifact_id",
        "kind",
        "root_id",
        "relative_path",
        "sha256",
        "size_bytes",
        "media_type",
        "retention_class",
    }
    missing = sorted(required - set(artifact))
    if missing:
        errors.append(error("ARTIFACT_FIELDS", "artifact is missing: " + ", ".join(missing)))
        return errors
    for field in ("artifact_id", "kind", "root_id", "media_type", "retention_class"):
        if not isinstance(artifact[field], str) or not artifact[field]:
            errors.append(error("ARTIFACT_FIELD", f"artifact {field} must be a non-empty string"))
    try:
        relative = validate_relative_path(artifact["relative_path"])
    except BuildContractError as exc:
        errors.append(error("ARTIFACT_PATH", str(exc)))
        return errors
    if not isinstance(artifact["sha256"], str) or not HEX64_RE.fullmatch(artifact["sha256"]):
        errors.append(error("ARTIFACT_HASH", "artifact sha256 must be 64 hexadecimal characters"))
    if not isinstance(artifact["size_bytes"], int) or isinstance(artifact["size_bytes"], bool) or artifact["size_bytes"] < 0:
        errors.append(error("ARTIFACT_SIZE", "artifact size_bytes must be a non-negative integer"))
    if errors or roots is None or not check_hashes:
        return errors
    try:
        root = _artifact_root(record, str(artifact["root_id"]), roots)
        if artifact["root_id"] == "evidence":
            revision_prefix = str(record["source_revision"]) + "/"
            if not relative.startswith(revision_prefix):
                raise PathContractError("evidence artifact must be below its source revision")
        target = validate_managed_path(
            root / relative,
            root,
            allow_missing=False,
            reject_private_tmp=not roots.fixture_mode,
        )
    except (BuildContractError, OSError) as exc:
        errors.append(error("ARTIFACT_PATH", str(exc)))
        return errors
    try:
        if target.is_dir():
            if artifact["kind"] not in {"tree", "directory"}:
                errors.append(error("ARTIFACT_KIND", "directory artifact must have kind tree"))
            digest, manifest_digest, size = tree_digest(target)
            if artifact["sha256"].lower() != digest:
                errors.append(error("ARTIFACT_HASH", f"tree hash mismatch for {relative}"))
            if artifact.get("tree_manifest_sha256") != manifest_digest:
                errors.append(error("ARTIFACT_MANIFEST_HASH", f"tree manifest hash mismatch for {relative}"))
        else:
            if artifact["kind"] in {"tree", "directory"}:
                errors.append(error("ARTIFACT_KIND", "tree artifact path is not a directory"))
            digest, size = file_digest(target)
            if artifact["sha256"].lower() != digest:
                errors.append(error("ARTIFACT_HASH", f"artifact hash mismatch for {relative}"))
        if artifact["size_bytes"] != size:
            errors.append(error("ARTIFACT_SIZE", f"artifact size mismatch for {relative}"))
    except (BuildContractError, OSError) as exc:
        errors.append(error("ARTIFACT_READ", str(exc)))
    return errors


def validate_ledger(
    value: Mapping[str, object] | os.PathLike[str] | str,
    *,
    roots: ManagedRoots | None = None,
    require_sealed: bool = True,
    check_hashes: bool = True,
) -> list[dict[str, str]]:
    """Return structured errors; an empty list is the only valid result."""
    try:
        record, path = _record_from_json(value)
    except BuildContractError as exc:
        return [error("LEDGER_READ", str(exc))]
    errors: list[dict[str, str]] = []
    missing = sorted(LEDGER_REQUIRED_FIELDS - set(record))
    if missing:
        errors.append(error("LEDGER_FIELDS", "ledger is missing: " + ", ".join(missing)))
        return errors
    if record.get("schema_version") != LEDGER_SCHEMA:
        errors.append(error("LEDGER_SCHEMA", "unsupported ledger schema"))
    if not isinstance(record.get("ledger_id"), str) or not re.fullmatch(r"[0-9a-f]{32}", str(record.get("ledger_id"))):
        errors.append(error("LEDGER_ID", "ledger_id must be lowercase 128-bit hex"))
    try:
        key, key_bytes, key_digest = build_key(record["key"])  # type: ignore[arg-type]
        if record["key"] != key:
            errors.append(error("LEDGER_KEY_CANONICAL", "embedded key is not canonical"))
        if record.get("key_sha256") != key_digest:
            errors.append(error("LEDGER_KEY_HASH", "ledger key_sha256 does not match key.json bytes"))
        if record.get("key_json_bytes_sha256", key_digest) != sha256_bytes(key_bytes):
            errors.append(error("LEDGER_KEY_BYTES", "key JSON byte hash mismatch"))
    except (BuildContractError, TypeError) as exc:
        errors.append(error("LEDGER_KEY", str(exc)))
        key = {}
    if isinstance(key, Mapping):
        for field in (
            "authority",
            "namespace",
            "source_revision",
            "toolchain",
            "host",
            "target",
            "profile",
            "features",
            "renderer",
            "backend",
            "lockfile_sha256",
            "commands",
            "environment",
        ):
            if record.get(field) != key.get(field):
                errors.append(error("LEDGER_KEY_MISMATCH", f"ledger field {field} disagrees with canonical key"))
    if not isinstance(record.get("source_session"), str) or not record["source_session"] or "\x00" in str(record["source_session"]):
        errors.append(error("LEDGER_SESSION", "source_session must be a non-empty string"))
    if "lease_fingerprint" in record and _valid_lease_fingerprint(record["lease_fingerprint"]) is None:
        errors.append(error("LEDGER_LEASE", "lease_fingerprint is incomplete or malformed"))
    elif "lease_fingerprint" in record:
        fingerprint = _valid_lease_fingerprint(record["lease_fingerprint"])
        if fingerprint is not None and fingerprint["key_sha256"] != record.get("key_sha256"):
            errors.append(error("LEDGER_LEASE", "lease fingerprint key hash disagrees with ledger"))
    if "transitions" in record:
        transitions = record["transitions"]
        if not isinstance(transitions, list) or not transitions:
            errors.append(error("LEDGER_TRANSITIONS", "transitions must be a non-empty array"))
        else:
            previous = None
            previous_at = None
            bound_fingerprint = _valid_lease_fingerprint(record.get("lease_fingerprint"))
            for item in transitions:
                if not isinstance(item, Mapping) or item.get("state") not in LEDGER_STATES:
                    errors.append(error("LEDGER_TRANSITIONS", "transition entry has an invalid state"))
                    continue
                if previous is not None and item["state"] not in LEDGER_TRANSITIONS.get(previous, set()):
                    errors.append(error("LEDGER_TRANSITIONS", "transition sequence is not legal"))
                try:
                    item_at = parse_timestamp(item.get("at"))
                    if previous_at is not None and item_at < previous_at:
                        errors.append(error("LEDGER_TRANSITIONS", "transition timestamps are not monotonic"))
                    previous_at = item_at
                except BuildContractError as exc:
                    errors.append(error("LEDGER_TRANSITIONS", str(exc)))
                if bound_fingerprint is not None:
                    item_fingerprint = _valid_lease_fingerprint(item.get("lease_fingerprint"))
                    if item_fingerprint != bound_fingerprint:
                        errors.append(error("LEDGER_TRANSITIONS", "transition lease fingerprint changed"))
                previous = str(item["state"])
            if transitions and transitions[0].get("state") != "reserved":
                errors.append(error("LEDGER_TRANSITIONS", "transition sequence must begin at reserved"))
            ledger_state = record.get("state")
            if transitions and ledger_state:
                if transitions[-1].get("state") != ledger_state:
                    errors.append(error("LEDGER_TRANSITIONS", "transition sequence does not reach ledger state"))
    if not isinstance(record.get("consumable"), bool):
        errors.append(error("LEDGER_CONSUMABLE", "consumable must be boolean"))
    try:
        created = parse_timestamp(record["created_at"])
        updated = parse_timestamp(record["updated_at"])
        if updated < created:
            errors.append(error("LEDGER_TIME", "updated_at precedes created_at"))
        if record.get("sealed_at") is not None:
            sealed_at = parse_timestamp(record["sealed_at"])
            if sealed_at < updated:
                errors.append(error("LEDGER_TIME", "sealed_at precedes updated_at"))
    except BuildContractError as exc:
        errors.append(error("LEDGER_TIME", str(exc)))
    state = record.get("state")
    status = record.get("status")
    if state not in LEDGER_STATES:
        errors.append(error("LEDGER_STATE", "unknown ledger state"))
    if not isinstance(status, str):
        errors.append(error("LEDGER_STATUS", "ledger status must be a string"))
    elif state in {"reserved", "running"} and status != state:
        errors.append(error("LEDGER_STATUS", "intermediate state/status must match"))
    elif state == "passed" and status != "passed":
        errors.append(error("LEDGER_STATUS", "passed state requires passed status"))
    elif state in {"failed", "sealed"} and status not in LEDGER_TERMINAL_STATUSES:
        errors.append(error("LEDGER_STATUS", "terminal status is not allowed"))
    if require_sealed and state != "sealed":
        errors.append(error("LEDGER_NOT_SEALED", "only sealed ledgers may be consumed"))
    if require_sealed and roots is None:
        errors.append(error("LEDGER_ROOTS", "sealed validation requires explicit managed roots"))
    if path is not None and require_sealed:
        try:
            if path.read_bytes() != canonical_json_bytes(record):
                errors.append(error("LEDGER_CANONICAL", "sealed ledger file is not canonical JSON"))
        except OSError as exc:
            errors.append(error("LEDGER_READ", f"cannot re-read sealed ledger: {exc}"))
    if state == "sealed":
        if status == "passed":
            if record.get("outcome") != "passed" or record.get("consumable") is not True:
                errors.append(error("LEDGER_CONSUMABLE", "sealed passed ledger must be consumable"))
        else:
            if record.get("outcome") != "failed" or record.get("consumable") is not False:
                errors.append(error("LEDGER_CONSUMABLE", "sealed failure must be non-consumable"))
        if record.get("sealed_at") is None:
            errors.append(error("LEDGER_TIME", "sealed ledger requires sealed_at"))
    elif record.get("sealed_at") is not None:
        errors.append(error("LEDGER_TIME", "non-sealed ledger must not have sealed_at"))
    expected_outcome = (
        "pending"
        if state in {"reserved", "running"}
        else "passed"
        if state == "passed"
        else "failed"
        if state == "failed"
        else None
    )
    if expected_outcome is not None and record.get("outcome") != expected_outcome:
        errors.append(error("LEDGER_OUTCOME", f"{state} ledger requires outcome={expected_outcome}"))
    if state in {"reserved", "running", "passed", "failed"} and record.get("consumable") is not False:
        errors.append(error("LEDGER_CONSUMABLE", "unsealed ledger must be non-consumable"))
    if not isinstance(record.get("artifacts"), list):
        errors.append(error("LEDGER_ARTIFACTS", "artifacts must be an array"))
    else:
        artifact_ids: set[str] = set()
        for artifact in record["artifacts"]:
            if isinstance(artifact, Mapping) and isinstance(artifact.get("artifact_id"), str):
                artifact_id = artifact["artifact_id"]
                if artifact_id in artifact_ids:
                    errors.append(error("LEDGER_ARTIFACTS", "artifact_id values must be unique"))
                artifact_ids.add(artifact_id)
            errors.extend(_validate_artifact(record, artifact, roots=roots, check_hashes=check_hashes))
        if state == "sealed" and status == "passed" and not record["artifacts"]:
            errors.append(error("LEDGER_ARTIFACTS", "sealed passed ledger requires artifacts"))
    if not isinstance(record.get("evidence_refs"), list):
        errors.append(error("LEDGER_EVIDENCE", "evidence_refs must be an array"))
    else:
        for reference in record["evidence_refs"]:
            if not isinstance(reference, Mapping):
                errors.append(error("LEDGER_EVIDENCE", "evidence reference must be an object"))
                continue
            if "relative_path" in reference:
                try:
                    evidence_relative = validate_relative_path(reference["relative_path"])
                    if not evidence_relative.startswith(str(record["source_revision"]) + "/"):
                        errors.append(
                            error(
                                "LEDGER_EVIDENCE_PATH",
                                "evidence reference must be below its source revision",
                            )
                        )
                except BuildContractError as exc:
                    errors.append(error("LEDGER_EVIDENCE_PATH", str(exc)))
            for field in ("key_sha256", "ledger_sha256"):
                if field in reference and (
                    not isinstance(reference[field], str) or not HEX64_RE.fullmatch(reference[field])
                ):
                    errors.append(error("LEDGER_EVIDENCE_HASH", f"invalid evidence {field}"))
            if "key_sha256" in reference and reference["key_sha256"] != record.get("key_sha256"):
                errors.append(error("LEDGER_EVIDENCE_KEY", "evidence key hash disagrees with ledger"))
            if roots is not None and "relative_path" in reference:
                try:
                    evidence_path = validate_managed_path(
                        roots.evidence_root / validate_relative_path(reference["relative_path"]),
                        roots.evidence_root,
                        allow_missing=False,
                        reject_private_tmp=not roots.fixture_mode,
                    )
                    if "sha256" in reference:
                        digest = (
                            sha256_file(evidence_path)
                            if evidence_path.is_file()
                            else tree_digest(evidence_path)[0]
                            if evidence_path.is_dir()
                            else None
                        )
                        if digest is None or digest != reference["sha256"]:
                            errors.append(error("LEDGER_EVIDENCE_HASH", "evidence content hash mismatch"))
                except (BuildContractError, OSError) as exc:
                    errors.append(error("LEDGER_EVIDENCE_PATH", str(exc)))
    if path is not None and roots is not None:
        try:
            expected_dir = _artifact_root(record, "result", roots)
            validate_managed_path(
                path,
                expected_dir,
                allow_missing=False,
                reject_private_tmp=not roots.fixture_mode,
            )
        except (BuildContractError, OSError) as exc:
            errors.append(error("LEDGER_PATH", str(exc)))
        if require_sealed:
            try:
                key_file = key_json_path_for_key(record["key"], record["key_sha256"], roots)  # type: ignore[arg-type]
                key_value, key_payload, key_digest = read_key_json(key_file)
                if key_value != record["key"] or key_digest != record["key_sha256"]:
                    errors.append(error("LEDGER_KEY_FILE", "key.json does not match sealed ledger"))
                if record.get("key_json_bytes_sha256") != sha256_bytes(key_payload):
                    errors.append(error("LEDGER_KEY_FILE", "key.json byte hash does not match ledger"))
            except (BuildContractError, OSError) as exc:
                errors.append(error("LEDGER_KEY_FILE", str(exc)))
    return errors


def assert_valid_ledger(
    value: Mapping[str, object] | os.PathLike[str] | str,
    *,
    roots: ManagedRoots | None = None,
    require_sealed: bool = True,
    check_hashes: bool = True,
) -> dict[str, object]:
    record, _path = _record_from_json(value)
    errors = validate_ledger(record, roots=roots, require_sealed=require_sealed, check_hashes=check_hashes)
    if errors:
        raise ValidationError(errors)
    return record


def ledger_path_for_key(
    key: Mapping[str, object],
    key_sha256: str,
    roots: ManagedRoots | None = None,
) -> Path:
    return managed_result_dir(key, key_sha256, roots) / "build-ledger.json"


def publish_ledger(
    path: os.PathLike[str] | str,
    record: Mapping[str, object],
    *,
    roots: ManagedRoots | None = None,
    require_sealed: bool = False,
    overwrite: bool = True,
    lease_path: os.PathLike[str] | str | None = None,
    lease: Mapping[str, object] | None = None,
    now: object | None = None,
) -> str:
    if "lease_fingerprint" in record:
        if lease_path is None or lease is None:
            raise LeaseFenced("publishing a lease-bound ledger requires fencing")
        fence_lease_write(lease_path, lease, now=now)
    errors = validate_ledger(
        record,
        roots=roots,
        require_sealed=require_sealed,
        check_hashes=require_sealed,
    )
    if errors:
        raise ValidationError(errors)
    target = absolute_path(path)
    if roots is not None:
        expected_dir = _artifact_root(record, "result", roots)
        validate_managed_path(target, expected_dir, reject_private_tmp=not roots.fixture_mode)
        expected_path = ledger_path_for_key(record["key"], record["key_sha256"], roots)  # type: ignore[arg-type]
        if target != expected_path:
            raise PathContractError("ledger must be published at its canonical result location")
        ensure_key_json(record["key"], roots)  # type: ignore[arg-type]
    payload = canonical_json_bytes(record)
    if overwrite:
        atomic_write_bytes(target, payload)
    else:
        _write_exclusive_json(target, dict(record))
    return sha256_bytes(payload)


def reserve_ledger(
    path: os.PathLike[str] | str,
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
    *,
    source_session: str,
    now: object | None = None,
    lease_path: os.PathLike[str] | str | None = None,
    lease: Mapping[str, object] | None = None,
    roots: ManagedRoots | None = None,
) -> dict[str, object]:
    if lease_path is None or lease is None:
        raise LeaseFenced("reserving a ledger requires an active writer lease")
    record = new_ledger(
        key,
        source_session=source_session,
        now=now,
        lease_path=lease_path,
        lease=lease,
        roots=roots,
    )
    errors = validate_ledger(record, roots=roots, require_sealed=False, check_hashes=False)
    if errors:
        raise ValidationError(errors)
    target = absolute_path(path)
    if roots is not None:
        ensure_key_json(record["key"], roots)  # type: ignore[arg-type]
        expected_dir = managed_result_dir(record["key"], record["key_sha256"], roots)  # type: ignore[arg-type]
        validate_managed_path(
            target,
            expected_dir,
            reject_private_tmp=not roots.fixture_mode,
        )
        expected_path = ledger_path_for_key(record["key"], record["key_sha256"], roots)  # type: ignore[arg-type]
        if target != expected_path:
            raise PathContractError("ledger must be reserved at its canonical result location")
    target.parent.mkdir(parents=True, exist_ok=True)
    _write_exclusive_json(target, record)
    return record


def transition_ledger(
    record: Mapping[str, object],
    new_state: str,
    *,
    status: str | None = None,
    now: object | None = None,
    lease_path: os.PathLike[str] | str | None = None,
    lease: Mapping[str, object] | None = None,
) -> dict[str, object]:
    current = dict(record)
    old_state = current.get("state")
    if old_state not in LEDGER_TRANSITIONS or new_state not in LEDGER_TRANSITIONS[old_state]:
        raise BuildContractError(f"illegal ledger transition: {old_state} -> {new_state}")
    if lease_path is not None or lease is not None:
        if lease_path is None or lease is None:
            raise LeaseFenced("ledger transition requires both lease path and lease record")
        fence_lease_write(lease_path, lease, now=now)
    bound = current.get("lease_fingerprint")
    if bound is not None and (lease_path is None or lease is None):
        raise LeaseFenced("a lease-bound ledger requires fencing on every transition")
    if bound is not None and lease is not None:
        if not isinstance(bound, Mapping) or _lease_fingerprint(bound) != _lease_fingerprint(lease):
            raise LeaseFenced("ledger lease fingerprint does not match")
    if status is None:
        if new_state == "sealed":
            status = str(current.get("status", "failed"))
        else:
            status = "passed" if new_state == "passed" else "failed" if new_state == "failed" else new_state
    if new_state in {"passed", "failed"} and status not in LEDGER_TERMINAL_STATUSES:
        raise BuildContractError(f"invalid terminal status: {status}")
    current["state"] = new_state
    current["status"] = status
    current["updated_at"] = timestamp(now)
    transition_entry: dict[str, object] = {
        "state": new_state,
        "at": current["updated_at"],
    }
    if lease is not None:
        transition_entry["lease_fingerprint"] = dict(_valid_lease_fingerprint(lease) or {})
    transitions = current.setdefault("transitions", [])
    if isinstance(transitions, list):
        transitions.append(transition_entry)
    if new_state == "passed":
        current["outcome"] = "passed"
        current["consumable"] = False
    elif new_state == "failed":
        current["outcome"] = "failed"
        current["consumable"] = False
    return current


def seal_ledger(
    record: Mapping[str, object],
    *,
    roots: ManagedRoots | None = None,
    now: object | None = None,
    lease_path: os.PathLike[str] | str | None = None,
    lease: Mapping[str, object] | None = None,
) -> dict[str, object]:
    if roots is not None:
        ensure_key_json(record["key"], roots)  # type: ignore[arg-type]
    sealed = transition_ledger(
        record,
        "sealed",
        now=now,
        lease_path=lease_path,
        lease=lease,
    )
    sealed["sealed_at"] = timestamp(now)
    sealed["updated_at"] = sealed["sealed_at"]
    if sealed.get("status") == "passed":
        sealed["outcome"] = "passed"
        sealed["consumable"] = True
    else:
        sealed["outcome"] = "failed"
        sealed["consumable"] = False
    errors = validate_ledger(sealed, roots=roots, require_sealed=True, check_hashes=True)
    if errors:
        raise ValidationError(errors)
    return sealed


def _canonical_file_bytes(path: Path) -> tuple[dict[str, object], bytes]:
    if contains_symlink(path, path.parent):
        raise PathContractError(f"refusing to read symlinked JSON: {path}")
    try:
        payload = path.read_bytes()
        parsed = json.loads(payload.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BuildContractError(f"invalid JSON file: {path}") from exc
    if not isinstance(parsed, Mapping):
        raise BuildContractError(f"JSON file must contain an object: {path}")
    encoded = canonical_json_bytes(parsed)
    if payload != encoded:
        raise BuildContractError(f"JSON file is not canonical: {path}")
    return dict(parsed), payload


def build_result_path_for_key(
    key: Mapping[str, object],
    key_sha256: str,
    roots: ManagedRoots | None = None,
) -> Path:
    return managed_result_dir(key, key_sha256, roots) / "build-result.json"


def _relative_to_root(path: Path, root: Path) -> str:
    try:
        relative = path.relative_to(root).as_posix()
    except ValueError as exc:
        raise PathContractError(f"path is outside managed root: {path}") from exc
    return validate_relative_path(relative)


def publish_build_result(
    ledger: Mapping[str, object] | os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    ledger_path: os.PathLike[str] | str | None = None,
    result_path: os.PathLike[str] | str | None = None,
) -> dict[str, object]:
    """Publish a derived projection only after validating a sealed ledger."""
    if isinstance(ledger, Mapping):
        record = dict(ledger)
        if ledger_path is None:
            key = record.get("key")
            digest = record.get("key_sha256")
            if not isinstance(key, Mapping) or not isinstance(digest, str):
                raise BuildContractError("ledger mapping lacks canonical key")
            ledger_file = ledger_path_for_key(key, digest, roots)
        else:
            ledger_file = absolute_path(ledger_path)
    else:
        ledger_file = absolute_path(ledger)
        record, _payload = _canonical_file_bytes(ledger_file)
    errors = validate_ledger(record, roots=roots, require_sealed=True, check_hashes=True)
    if errors:
        raise ValidationError(errors)
    if not ledger_file.exists():
        raise BuildContractError(f"ledger file does not exist: {ledger_file}")
    ledger_file = validate_managed_path(
        ledger_file,
        roots.result_root,
        allow_missing=False,
        reject_private_tmp=not roots.fixture_mode,
    )
    _record_on_disk, ledger_payload = _canonical_file_bytes(ledger_file)
    if _record_on_disk != record:
        raise BuildContractError("ledger mapping differs from the published ledger")
    key = record["key"]
    digest = str(record["key_sha256"])
    expected_ledger_path = ledger_path_for_key(key, digest, roots)  # type: ignore[arg-type]
    if ledger_file != expected_ledger_path:
        raise PathContractError("ledger is not at its canonical result location")
    projection: dict[str, object] = {
        "schema_version": RESULT_SCHEMA,
        "state": "sealed",
        "status": record["status"],
        "consumable": record["consumable"],
        "key_sha256": digest,
        "ledger_sha256": sha256_bytes(ledger_payload),
        "ledger_ref": {
            "root_id": "results",
            "relative_path": _relative_to_root(ledger_file, roots.result_root),
        },
        "source_revision": record["source_revision"],
        "profile": record["profile"],
        "profile_id": record["profile_id"],
        "lockfile_sha256": record["lockfile_sha256"],
        "renderer": record["renderer"],
        "backend": record["backend"],
        "artifacts": record["artifacts"],
        "evidence_refs": record["evidence_refs"],
        "created_at": record["created_at"],
        "sealed_at": record["sealed_at"],
    }
    output = absolute_path(result_path) if result_path is not None else build_result_path_for_key(key, digest, roots)  # type: ignore[arg-type]
    expected_result_dir = managed_result_dir(key, digest, roots)  # type: ignore[arg-type]
    expected_output = build_result_path_for_key(key, digest, roots)  # type: ignore[arg-type]
    validate_managed_path(output, expected_result_dir, reject_private_tmp=not roots.fixture_mode)
    if output != expected_output:
        raise PathContractError("build-result must be published at its canonical result location")
    atomic_write_bytes(output, canonical_json_bytes(projection))
    return projection


def _load_result(path: os.PathLike[str] | str) -> tuple[dict[str, object], bytes]:
    target = absolute_path(path)
    return _canonical_file_bytes(target)


def validate_build_result(
    path: os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    requested_key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str] | None = None,
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    result_file = absolute_path(path)
    try:
        validate_managed_path(
            result_file,
            roots.result_root,
            allow_missing=False,
            reject_private_tmp=not roots.fixture_mode,
        )
    except (BuildContractError, OSError) as exc:
        return [error("RESULT_PATH", str(exc))]
    try:
        projection, _result_payload = _load_result(result_file)
    except BuildContractError as exc:
        return [error("RESULT_READ", str(exc))]
    required = {
        "schema_version",
        "state",
        "status",
        "consumable",
        "key_sha256",
        "ledger_sha256",
        "ledger_ref",
        "source_revision",
        "profile",
        "profile_id",
        "lockfile_sha256",
        "artifacts",
        "evidence_refs",
    }
    missing = sorted(required - set(projection))
    if missing:
        return [error("RESULT_FIELDS", "result is missing: " + ", ".join(missing))]
    if projection.get("schema_version") != RESULT_SCHEMA:
        errors.append(error("RESULT_SCHEMA", "unsupported build-result schema"))
    if projection.get("state") != "sealed":
        errors.append(error("RESULT_NOT_SEALED", "build-result is not sealed"))
    if not isinstance(projection.get("key_sha256"), str) or not HEX64_RE.fullmatch(str(projection["key_sha256"])):
        errors.append(error("RESULT_KEY_HASH", "invalid result key hash"))
    if not isinstance(projection.get("ledger_sha256"), str) or not HEX64_RE.fullmatch(str(projection["ledger_sha256"])):
        errors.append(error("RESULT_LEDGER_HASH", "invalid result ledger hash"))
    reference = projection.get("ledger_ref")
    if not isinstance(reference, Mapping) or reference.get("root_id") != "results":
        errors.append(error("RESULT_LEDGER_REF", "ledger_ref must use the results root"))
        return errors
    try:
        relative = validate_relative_path(reference.get("relative_path"))
        ledger_file = validate_managed_path(
            roots.result_root / relative,
            roots.result_root,
            allow_missing=False,
            reject_private_tmp=not roots.fixture_mode,
        )
    except BuildContractError as exc:
        errors.append(error("RESULT_LEDGER_REF", str(exc)))
        return errors
    try:
        ledger_record, ledger_payload = _canonical_file_bytes(ledger_file)
    except BuildContractError as exc:
        errors.append(error("RESULT_LEDGER_READ", str(exc)))
        return errors
    if sha256_bytes(ledger_payload) != projection.get("ledger_sha256"):
        errors.append(error("RESULT_LEDGER_HASH", "ledger hash does not match projection"))
    errors.extend(validate_ledger(ledger_record, roots=roots, require_sealed=True, check_hashes=True))
    if projection.get("key_sha256") != ledger_record.get("key_sha256"):
        errors.append(error("RESULT_KEY_HASH", "result key hash disagrees with ledger"))
    for field in ("source_revision", "profile", "profile_id", "lockfile_sha256", "status", "consumable", "artifacts", "evidence_refs"):
        if projection.get(field) != ledger_record.get(field):
            errors.append(error("RESULT_LEDGER_MISMATCH", f"result field {field} disagrees with ledger"))
    try:
        expected_result = build_result_path_for_key(ledger_record["key"], ledger_record["key_sha256"], roots)  # type: ignore[arg-type]
        if result_file != expected_result:
            errors.append(error("RESULT_PATH", "build-result is not at its canonical result location"))
    except (BuildContractError, KeyError, TypeError) as exc:
        errors.append(error("RESULT_PATH", str(exc)))
    if requested_key is not None:
        requested_value, _requested_bytes, requested_digest = _canonical_key_from_value(requested_key)
        if requested_digest != projection.get("key_sha256"):
            errors.append(error("RESULT_REQUEST_MISMATCH", "requested key hash does not match result"))
        for field in ("source_revision", "profile", "lockfile_sha256"):
            if requested_value.get(field) != projection.get(field):
                errors.append(error("RESULT_REQUEST_MISMATCH", f"requested {field} does not match result"))
    return errors


def reusable_result_report(
    path: os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    requested_key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
) -> dict[str, object]:
    errors = validate_build_result(path, roots=roots, requested_key=requested_key)
    if errors:
        return {"ok": False, "reason": "cache miss: sealed result validation failed", "errors": errors}
    projection, _payload = _load_result(path)
    if projection.get("status") != "passed" or projection.get("consumable") is not True:
        return {"ok": False, "reason": "cache miss: result is not consumable", "errors": []}
    return {"ok": True, "reason": "sealed result matches requested key", "errors": []}


def check_reusable_result(
    path: os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    requested_key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
) -> bool:
    return bool(reusable_result_report(path, roots=roots, requested_key=requested_key)["ok"])


def can_reuse_result(
    path: os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    requested_key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
) -> bool:
    return check_reusable_result(path, roots=roots, requested_key=requested_key)


def publish_evidence_consumer_ref(
    ref_path: os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    key_sha256: str,
    source_revision: str,
    ledger_sha256: str,
    artifact_ids: Sequence[str],
    evidence_path: os.PathLike[str] | str | None = None,
    evidence_sha256: str | None = None,
    now: object | None = None,
) -> dict[str, object]:
    if not HEX64_RE.fullmatch(key_sha256) or not HEX64_RE.fullmatch(ledger_sha256):
        raise BuildContractError("consumer-ref key and ledger hashes must be 64 hexadecimal characters")
    if not HEX40_RE.fullmatch(source_revision):
        raise BuildContractError("consumer-ref source revision is invalid")
    if not artifact_ids or any(not isinstance(item, str) or not item for item in artifact_ids):
        raise BuildContractError("consumer-ref requires artifact IDs")
    if evidence_path is None:
        raise BuildContractError("consumer-ref requires an evidence path under the managed evidence root")
    ref = absolute_path(ref_path)
    validate_managed_path(
        ref,
        roots.evidence_root,
        reject_private_tmp=not roots.fixture_mode,
    )
    evidence_relative = None
    if evidence_path is not None:
        evidence = validate_managed_path(
            evidence_path,
            roots.evidence_root,
            allow_missing=False,
            reject_private_tmp=not roots.fixture_mode,
        )
        evidence_relative = _relative_to_root(evidence, roots.evidence_root)
        if not evidence_relative.startswith(source_revision.lower() + "/"):
            raise PathContractError("evidence must be stored below its source revision")
        if evidence.is_dir():
            calculated, _manifest, _size = tree_digest(evidence)
        else:
            calculated = sha256_file(evidence)
        if evidence_sha256 is not None and evidence_sha256 != calculated:
            raise BuildContractError("evidence hash does not match evidence file")
        evidence_sha256 = calculated
    if evidence_sha256 is None or not HEX64_RE.fullmatch(evidence_sha256):
        raise BuildContractError("consumer-ref requires an evidence SHA-256")
    record: dict[str, object] = {
        "schema_version": "tessera/evidence-consumer-ref/v1",
        "consumer_ref_id": uuid.uuid4().hex,
        "source_revision": source_revision.lower(),
        "key_sha256": key_sha256.lower(),
        "ledger_sha256": ledger_sha256.lower(),
        "artifact_ids": sorted(set(artifact_ids)),
        "evidence_sha256": evidence_sha256.lower(),
        "evidence_relative_path": evidence_relative,
        "created_at": timestamp(now),
    }
    atomic_write_bytes(ref, canonical_json_bytes(record))
    return record


def validate_evidence_consumer_ref(
    ref_path: os.PathLike[str] | str,
    *,
    roots: ManagedRoots,
    expected_key_sha256: str | None = None,
    expected_ledger_sha256: str | None = None,
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    try:
        record, _payload = _canonical_file_bytes(absolute_path(ref_path))
    except BuildContractError as exc:
        return [error("EVIDENCE_REF_READ", str(exc))]
    if record.get("schema_version") != "tessera/evidence-consumer-ref/v1":
        errors.append(error("EVIDENCE_REF_SCHEMA", "unsupported evidence consumer-ref schema"))
    for field, pattern in (
        ("key_sha256", HEX64_RE),
        ("ledger_sha256", HEX64_RE),
        ("evidence_sha256", HEX64_RE),
    ):
        if not isinstance(record.get(field), str) or not pattern.fullmatch(str(record[field])):
            errors.append(error("EVIDENCE_REF_HASH", f"invalid evidence ref {field}"))
    if expected_key_sha256 is not None and record.get("key_sha256") != expected_key_sha256:
        errors.append(error("EVIDENCE_REF_KEY", "evidence ref key mismatch"))
    if expected_ledger_sha256 is not None and record.get("ledger_sha256") != expected_ledger_sha256:
        errors.append(error("EVIDENCE_REF_LEDGER", "evidence ref ledger mismatch"))
    relative = record.get("evidence_relative_path")
    if relative is not None:
        try:
            evidence_relative = validate_relative_path(relative)
            source_revision = record.get("source_revision")
            if not isinstance(source_revision, str) or not HEX40_RE.fullmatch(source_revision):
                raise PathContractError("evidence reference source revision is invalid")
            if not evidence_relative.startswith(source_revision + "/"):
                raise PathContractError("evidence must be stored below its source revision")
            evidence = validate_managed_path(
                roots.evidence_root / evidence_relative,
                roots.evidence_root,
                allow_missing=False,
                reject_private_tmp=not roots.fixture_mode,
            )
            calculated = tree_digest(evidence)[0] if evidence.is_dir() else sha256_file(evidence)
            if calculated != record.get("evidence_sha256"):
                errors.append(error("EVIDENCE_REF_HASH", "evidence content hash mismatch"))
        except (BuildContractError, OSError) as exc:
            errors.append(error("EVIDENCE_REF_PATH", str(exc)))
    return errors


def collect_volume_info(path: os.PathLike[str] | str) -> dict[str, object]:
    """Collect conservative volume facts without writing or scanning the volume."""
    requested = absolute_path(path)
    probe = requested
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    try:
        usage = shutil.disk_usage(probe)
        device = os.stat(probe).st_dev
    except OSError as exc:
        return {
            "known": False,
            "path": str(requested),
            "reason": f"volume inspection failed: {exc}",
        }
    total = int(usage.total)
    free = int(usage.free)
    info: dict[str, object] = {
        "known": False,
        "path": str(requested),
        "volume_id": f"dev:{device}",
        "filesystem": None,
        "protocol": None,
        "is_ssd": None,
        "available_bytes": free,
        "total_bytes": total,
        "free_percent": (100.0 * free / total) if total else 0.0,
        "source": "statvfs",
    }
    if platform.system() == "Darwin":
        try:
            completed = subprocess.run(
                ["diskutil", "info", "-plist", os.fspath(probe)],
                check=False,
                capture_output=True,
                timeout=3,
            )
            if completed.returncode != 0:
                # `diskutil info` accepts a volume or device, but not an
                # arbitrary directory. Resolve the directory to its mounted
                # volume before retrying, while keeping the original path in
                # the returned facts for target-path validation.
                filesystem = subprocess.run(
                    ["df", "-P", os.fspath(probe)],
                    check=False,
                    capture_output=True,
                    timeout=3,
                )
                rows = filesystem.stdout.decode("utf-8", errors="replace").splitlines()
                if len(rows) >= 2:
                    mount_point = rows[-1].rsplit(None, 1)[-1]
                    mount_point = mount_point.replace(r"\040", " ").replace(r"\011", "\t")
                    completed = subprocess.run(
                        ["diskutil", "info", "-plist", mount_point],
                        check=False,
                        capture_output=True,
                        timeout=3,
                    )
            if completed.returncode == 0:
                plist = plistlib.loads(completed.stdout)
                info["volume_id"] = plist.get("VolumeUUID") or plist.get("DeviceIdentifier") or info["volume_id"]
                info["filesystem"] = (
                    plist.get("FilesystemType")
                    or plist.get("FileSystemPersonality")
                    or plist.get("Type")
                )
                info["protocol"] = (
                    plist.get("BusProtocol")
                    or plist.get("Protocol")
                    or plist.get("Device / Media Name")
                )
                solid = plist.get("SolidState")
                if not isinstance(solid, bool):
                    solid = plist.get("Solid State")
                if isinstance(solid, bool):
                    info["is_ssd"] = solid
                info["source"] = "diskutil"
        except (OSError, subprocess.SubprocessError, plistlib.InvalidFileException, ValueError):
            pass
    elif platform.system() == "Linux":
        try:
            major = os.major(device)
            minor = os.minor(device)
            rotational = Path(f"/sys/dev/block/{major}:{minor}/queue/rotational")
            if rotational.exists():
                info["is_ssd"] = rotational.read_text(encoding="ascii").strip() == "0"
                info["source"] = "sysfs"
        except (OSError, ValueError):
            pass
    filesystem = str(info["filesystem"] or "").lower()
    protocol = str(info["protocol"] or "").lower()
    info["known"] = bool(info["is_ssd"] is True and (filesystem in {"apfs", "hfs+", "ext4", "xfs", "btrfs"} or "nvme" in protocol or "ssd" in protocol))
    return info


def _normalise_volume_info(
    path: Path,
    supplied: Mapping[str, object] | None,
) -> dict[str, object]:
    if supplied is None:
        return collect_volume_info(path)
    info = dict(supplied)
    if "available_bytes" not in info and "free_bytes" in info:
        info["available_bytes"] = info["free_bytes"]
    info.setdefault("path", str(path))
    info.setdefault("known", False)
    return info


def _volume_contract_errors(path: Path, info: Mapping[str, object]) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if info.get("known") is not True:
        errors.append(error("VOLUME_UNKNOWN", "SSD/APFS or equivalent volume identity is unknown"))
    volume_id = info.get("volume_id")
    if not isinstance(volume_id, str) or not volume_id or volume_id.lower() in {"unknown", "none"}:
        errors.append(error("VOLUME_IDENTITY", "volume_id is required for build admission"))
    filesystem = info.get("filesystem")
    protocol = info.get("protocol")
    filesystem_name = str(filesystem or "").strip().lower()
    protocol_name = str(protocol or "").strip().lower()
    supported_filesystems = {"apfs", "hfs+", "ext4", "xfs", "btrfs"}
    if not filesystem_name and not any(name in protocol_name for name in ("nvme", "ssd")):
        errors.append(error("VOLUME_FILESYSTEM", "filesystem or NVMe/SSD protocol is required"))
    elif filesystem_name and filesystem_name not in supported_filesystems and not any(
        name in protocol_name for name in ("nvme", "ssd")
    ):
        errors.append(error("VOLUME_FILESYSTEM", f"unsupported or unknown filesystem: {filesystem}"))
    if info.get("is_ssd") is not True:
        errors.append(error("VOLUME_MEDIA", "volume must be confirmed SSD/NVMe"))
    available = info.get("available_bytes")
    if not isinstance(available, int) or isinstance(available, bool) or available < 0:
        errors.append(error("VOLUME_SPACE", "available volume space is unknown"))
    total = info.get("total_bytes")
    if not isinstance(total, int) or isinstance(total, bool) or total <= 0:
        errors.append(error("VOLUME_TOTAL", "total volume capacity is unknown"))
    free_percent = info.get("free_percent")
    if (
        not isinstance(free_percent, (int, float))
        or isinstance(free_percent, bool)
        or not math.isfinite(float(free_percent))
        or not 0 <= float(free_percent) <= 100
    ):
        errors.append(error("VOLUME_PERCENT", "free_percent must be a number from 0 to 100"))
    supplied_path = info.get("path")
    if supplied_path is not None:
        try:
            if absolute_path(str(supplied_path)) != path:
                errors.append(error("VOLUME_PATH", "volume facts were measured for a different target path"))
        except (TypeError, ValueError):
            errors.append(error("VOLUME_PATH", "volume fact path is invalid"))
    return errors


def preflight_build(
    key: Mapping[str, object] | tuple[Mapping[str, object], bytes, str],
    *,
    cargo_target_dir: os.PathLike[str] | str | None,
    lockfile_path: os.PathLike[str] | str | None,
    estimated_peak_bytes: int,
    roots: ManagedRoots,
    repo_root: os.PathLike[str] | str | None = None,
    command: object | None = None,
    requested_jobs: int | None = None,
    volume: Mapping[str, object] | None = None,
    pressure: str | bool | None = None,
) -> dict[str, object]:
    canonical, _key_bytes, digest = _canonical_key_from_value(key)
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    expected_target = managed_target_dir(canonical, digest, roots)
    supplied_target_value: str | None = None
    if cargo_target_dir is None:
        errors.append(error("TARGET_REQUIRED", "CARGO_TARGET_DIR is required"))
    else:
        supplied_target = absolute_path(cargo_target_dir)
        supplied_target_value = str(supplied_target)
        try:
            validate_managed_path(
                supplied_target,
                roots.cache_root,
                repo_root=repo_root,
                reject_private_tmp=not roots.fixture_mode,
            )
        except BuildContractError as exc:
            errors.append(error("TARGET_PATH", str(exc)))
        if supplied_target != expected_target:
            errors.append(error("TARGET_KEY_MISMATCH", f"CARGO_TARGET_DIR must be {expected_target}"))
    if lockfile_path is None:
        errors.append(error("LOCKFILE_REQUIRED", "lockfile path is required"))
    else:
        lockfile = absolute_path(lockfile_path)
        if is_private_tmp(lockfile):
            errors.append(error("LOCKFILE_PATH", "lockfile may not be under a private temporary root"))
        if repo_root is not None and not path_contains(repo_root, lockfile):
            errors.append(error("LOCKFILE_PATH", "lockfile must be inside repo_root"))
        try:
            lock_hash = sha256_file(lockfile)
            if lock_hash != canonical["lockfile_sha256"]:
                errors.append(error("LOCKFILE_HASH", "lockfile SHA-256 does not match canonical key"))
        except (BuildContractError, OSError) as exc:
            errors.append(error("LOCKFILE", str(exc)))
    selected_command = canonical["commands"] if command is None else command
    try:
        normalised_command = normalise_commands(
            selected_command,
            repo_root=absolute_path(repo_root) if repo_root is not None else None,
            roots=roots,
        )
        if normalised_command != canonical["commands"]:
            errors.append(error("COMMAND_MISMATCH", "preflight command differs from canonical key"))
    except BuildContractError as exc:
        errors.append(error("COMMAND", str(exc)))
    jobs = requested_jobs
    if jobs is None:
        raw_jobs = os.environ.get("CARGO_BUILD_JOBS", "2")
        try:
            jobs = int(raw_jobs)
        except ValueError:
            jobs = -1
    if jobs != 2:
        errors.append(error("CARGO_BUILD_JOBS", "CARGO_BUILD_JOBS must be exactly 2"))
    if canonical.get("environment", {}).get("CARGO_BUILD_JOBS") != "2":  # type: ignore[union-attr]
        errors.append(error("KEY_JOBS", "canonical environment must bind CARGO_BUILD_JOBS=2"))
    if not isinstance(estimated_peak_bytes, int) or estimated_peak_bytes <= 0:
        errors.append(error("PEAK_ESTIMATE", "estimated_peak_bytes must be positive"))
        estimated_peak_bytes = 1
    volume_path = absolute_path(cargo_target_dir or roots.cache_root)
    volume_info = _normalise_volume_info(volume_path, volume)
    errors.extend(_volume_contract_errors(volume_path, volume_info))
    available = volume_info.get("available_bytes")
    if not isinstance(available, int) or isinstance(available, bool):
        errors.append(error("VOLUME_SPACE", "available volume space is unknown"))
        available = -1
    minimum = max(MIN_FREE_BYTES, 2 * estimated_peak_bytes)
    if available < minimum:
        errors.append(error("VOLUME_SPACE", f"available space {available} is below admission minimum {minimum}"))
    pressure_value = pressure if pressure is not None else os.environ.get("TESSERA_SYSTEM_PRESSURE")
    if pressure_value is True or str(pressure_value).lower() in {"critical", "high", "pressure"}:
        errors.append(error("SYSTEM_PRESSURE", "system pressure blocks a new writer"))
    elif pressure_value is None or str(pressure_value).lower() in {"", "unknown"}:
        warnings.append(error("SYSTEM_PRESSURE_UNKNOWN", "system pressure was not independently reported"))
    return {
        "schema_version": PREFLIGHT_SCHEMA,
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "key_sha256": digest,
        "source_revision": canonical["source_revision"],
        "supplied_target_dir": supplied_target_value,
        "target_dir": str(expected_target),
        "lockfile_sha256": canonical["lockfile_sha256"],
        "estimated_peak_bytes": estimated_peak_bytes,
        "minimum_free_bytes": minimum,
        "available_bytes": available,
        "volume": volume_info,
        "cargo_build_jobs": 2,
        "admission": "admitted" if not errors else "rejected",
    }


DEFAULT_GC_POLICY: dict[str, object] = {
    "schema_version": GC_POLICY_SCHEMA,
    "min_free_bytes": GC_MIN_FREE_BYTES,
    "min_free_percent": GC_MIN_FREE_PERCENT,
    "failed_grace_seconds": 7 * 24 * 60 * 60,
    "successful_profiles_per_key": 2,
    "ssd_preferred": True,
    "quarantine_required": True,
}


def _iter_json_files(root: Path, *, max_files: int = 10_000) -> Iterator[Path]:
    if not root.exists():
        return
    count = 0
    pending = [root]
    while pending:
        directory = pending.pop()
        if contains_symlink(directory, directory.parent):
            continue
        try:
            children = sorted(os.scandir(directory), key=lambda item: item.name, reverse=True)
        except OSError:
            continue
        for item in children:
            child = Path(item.path)
            if item.is_symlink():
                continue
            if item.is_dir(follow_symlinks=False):
                pending.append(child)
            elif item.is_file(follow_symlinks=False) and child.suffix.lower() == ".json":
                yield child
                count += 1
                if count >= max_files:
                    return


def _bounded_tree_size(path: Path, *, max_entries: int = 100_000) -> tuple[int, bool]:
    if not path.exists():
        return 0, False
    if path.is_symlink():
        return 0, True
    total = 0
    entries = 0
    pending = [path]
    while pending:
        current = pending.pop()
        try:
            children = list(os.scandir(current)) if current.is_dir() else []
        except OSError:
            return total, True
        for item in children:
            entries += 1
            if entries > max_entries:
                return total, True
            child = Path(item.path)
            if item.is_symlink():
                return total, True
            if item.is_dir(follow_symlinks=False):
                pending.append(child)
            elif item.is_file(follow_symlinks=False):
                try:
                    total += item.stat(follow_symlinks=False).st_size
                except OSError:
                    return total, True
            else:
                return total, True
    return total, False


def _path_has_recovery_marker(path: Path) -> bool:
    markers = {"recovery", "archive", "archives", "recovery-archive"}
    return any(part.lower() in markers or "recovery" in part.lower() for part in path.parts)


def _safe_json(path: Path) -> tuple[dict[str, object] | None, str | None]:
    try:
        parsed = read_json(path)
    except BuildContractError as exc:
        return None, str(exc)
    if not isinstance(parsed, Mapping):
        return None, "JSON root is not an object"
    return dict(parsed), None


def _entry_identity(authority: str, revision: str, profile: str, digest: str) -> str:
    return f"{authority}/{revision}/{profile}/{digest}"


def _reference_text(value: object) -> str:
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError):
        return str(value)


def _reference_matches(entry: Mapping[str, object], reference: object) -> bool:
    identity = str(entry["build_id"])
    digest = str(entry["key_sha256"])
    target = str(entry["path"])
    result = str(entry["result_dir"])
    result_path = str(entry.get("result_path", ""))
    ledger_hash = entry.get("ledger_sha256")
    result_hash = entry.get("result_sha256")
    artifact_ids = {str(item) for item in entry.get("artifact_ids", [])}
    if isinstance(reference, Mapping):
        if reference.get("key_sha256") == digest:
            return True
        if isinstance(ledger_hash, str) and reference.get("ledger_sha256") == ledger_hash:
            return True
        if isinstance(result_hash, str) and reference.get("result_sha256") == result_hash:
            return True
        referenced_artifacts = reference.get("artifact_ids")
        if isinstance(referenced_artifacts, list) and artifact_ids.intersection(
            str(item) for item in referenced_artifacts
        ):
            return True
        reference_authority = reference.get("authority")
        if reference.get("source_revision") == entry["source_revision"] and (
            reference_authority is None or reference_authority == entry["authority"]
        ):
            return True
        for field in ("path", "target_path", "result_path", "ledger_path"):
            field_value = reference.get(field)
            if isinstance(field_value, str) and field_value in {
                target,
                result,
                result_path,
                *[str(item) for item in entry.get("ledger_paths", [])],
            }:
                return True
    text = _reference_text(reference)
    return (
        digest in text
        or identity in text
        or target in text
        or result in text
        or result_path in text
        or (isinstance(ledger_hash, str) and ledger_hash in text)
        or (isinstance(result_hash, str) and result_hash in text)
        or (str(entry["source_revision"]) in text and str(entry["authority"]) in text)
    )


def _flatten_references(value: object, prefix: str = "reference") -> list[tuple[str, object]]:
    if value is None:
        return []
    if isinstance(value, Mapping):
        result: list[tuple[str, object]] = []
        for key, child in value.items():
            result.extend(_flatten_references(child, f"{prefix}:{key}"))
        return result
    if isinstance(value, list):
        result = []
        for index, child in enumerate(value):
            result.extend(_flatten_references(child, f"{prefix}:{index}"))
        return result
    return [(prefix, value)]


def _lease_for_entry(
    lease_path: Path,
    *,
    now: object | None,
    process_checker: Callable[[Mapping[str, object]], object] | None,
) -> tuple[str, str]:
    try:
        lease = read_lease(lease_path)
    except BuildContractError as exc:
        return "uncertain", f"lease unreadable: {exc}"
    return lease_liveness(lease, now=now, checker=process_checker)


def _process_markers(entry_path: Path) -> list[dict[str, object]]:
    markers: list[dict[str, object]] = []
    names = {"process.json", "active-process.json", ".process.json", "process-ref.json"}
    for candidate in entry_path.rglob("*"):
        if not candidate.is_file() or candidate.name.lower() not in names:
            continue
        parsed, parse_error = _safe_json(candidate)
        if parse_error is not None or parsed is None:
            markers.append({"path": str(candidate), "known": False, "reason": parse_error or "invalid"})
            continue
        pid = parsed.get("pid")
        token = parsed.get("process_start_token")
        host = parsed.get("host_id")
        if not isinstance(pid, int) or not isinstance(token, str) or not isinstance(host, str):
            markers.append({"path": str(candidate), "known": False, "reason": "incomplete process identity"})
            continue
        identity = process_identity(pid, expected_host_id=host, expected_start_token=token)
        markers.append({"path": str(candidate), **identity})
    return markers


def _fingerprint_entry(path: Path, *, max_entries: int = 100_000) -> tuple[object, ...]:
    """Fingerprint every entry's metadata without reading target contents."""
    root = absolute_path(path)
    if not os.path.lexists(os.fspath(root)):
        return (str(root), "missing")
    digest = hashlib.sha256()
    count = 0
    total_size = 0
    pending: list[tuple[Path, str]] = [(root, "")]
    while pending:
        current, relative = pending.pop()
        try:
            stat_result = os.lstat(current)
        except OSError:
            return (str(root), "uncertain", count)
        mode = stat_result.st_mode
        if stat.S_ISLNK(mode):
            return (str(root), "symlink", count)
        if stat.S_ISDIR(mode):
            kind = "directory"
        elif stat.S_ISREG(mode):
            kind = "file"
            total_size += stat_result.st_size
        else:
            return (str(root), "special", count)
        digest.update(
            canonical_json_bytes(
                [
                    relative or ".",
                    kind,
                    stat_result.st_dev,
                    stat_result.st_ino,
                    stat_result.st_mode,
                    stat_result.st_mtime_ns,
                    stat_result.st_size,
                ]
            )
            + b"\n"
        )
        count += 1
        if count > max_entries:
            return (str(root), "incomplete", count)
        if kind == "directory":
            try:
                children = sorted(os.scandir(current), key=lambda item: item.name, reverse=True)
            except OSError:
                return (str(root), "uncertain", count)
            for child in children:
                if child.name in {".", ".."}:
                    return (str(root), "unsafe", count)
                child_path = Path(child.path)
                child_relative = child.name if not relative else relative + "/" + child.name
                pending.append((child_path, child_relative))
    return (str(root), "tree", digest.hexdigest(), count, total_size)


def _safe_canonical_json(path: Path) -> tuple[dict[str, object] | None, bytes | None, str | None]:
    try:
        parsed, payload = _canonical_file_bytes(path)
    except BuildContractError as exc:
        return None, None, str(exc)
    return parsed, payload, None


def _identity_directories(
    root: Path,
    *,
    max_entries: int,
) -> tuple[dict[str, tuple[str, str, str, str]], bool]:
    """Discover only the versioned four-part identity layout, without following links."""
    identities: dict[str, tuple[str, str, str, str]] = {}
    uncertain = False
    if not root.exists():
        return identities, False
    if root.is_symlink():
        return identities, True
    try:
        authorities = sorted(os.scandir(root), key=lambda item: item.name)
    except OSError:
        return identities, True
    for authority_item in authorities:
        if authority_item.is_symlink():
            uncertain = True
            continue
        if not authority_item.is_dir(follow_symlinks=False):
            continue
        authority = authority_item.name
        if not SLUG_RE.fullmatch(authority):
            uncertain = True
            continue
        try:
            revisions = sorted(os.scandir(authority_item.path), key=lambda item: item.name)
        except OSError:
            uncertain = True
            continue
        for revision_item in revisions:
            if revision_item.is_symlink():
                uncertain = True
                continue
            if not revision_item.is_dir(follow_symlinks=False):
                continue
            revision = revision_item.name
            if not HEX40_RE.fullmatch(revision) or revision != revision.lower():
                uncertain = True
                continue
            try:
                profiles = sorted(os.scandir(revision_item.path), key=lambda item: item.name)
            except OSError:
                uncertain = True
                continue
            for profile_item in profiles:
                if profile_item.is_symlink():
                    uncertain = True
                    continue
                if not profile_item.is_dir(follow_symlinks=False):
                    continue
                profile = profile_item.name
                if not SLUG_RE.fullmatch(profile):
                    uncertain = True
                    continue
                try:
                    key_dirs = sorted(os.scandir(profile_item.path), key=lambda item: item.name)
                except OSError:
                    uncertain = True
                    continue
                for key_item in key_dirs:
                    if key_item.is_symlink():
                        uncertain = True
                        continue
                    if not key_item.is_dir(follow_symlinks=False):
                        continue
                    digest = key_item.name
                    if not HEX64_RE.fullmatch(digest) or digest != digest.lower():
                        uncertain = True
                        continue
                    identity = _entry_identity(authority, revision, profile, digest)
                    identities[identity] = (authority, revision, profile, digest)
                    if len(identities) >= max_entries:
                        return identities, True
    return identities, uncertain


def _cache_entry(
    cache_root: Path,
    result_root: Path,
    *,
    evidence_root: Path,
    identity: tuple[str, str, str, str],
    now: object | None,
    process_checker: Callable[[Mapping[str, object]], object] | None,
) -> tuple[dict[str, object], bool]:
    authority, revision, profile, digest = identity
    key_dir = cache_root / authority / revision / profile / digest
    target = key_dir / "target"
    result_dir = result_root / authority / revision / profile / digest
    result_path = result_dir / "build-result.json"
    local_uncertain = False
    target_exists = os.path.lexists(os.fspath(target))
    if target_exists and (target.is_symlink() or not target.is_dir()):
        local_uncertain = True

    ledger_paths = [
        path for path in _iter_json_files(result_dir, max_files=100) if "ledger" in path.name.lower()
    ]
    ledger_errors: list[str] = []
    ledger_records: list[dict[str, object]] = []
    ledger_sha256: str | None = None
    ledger_artifact_ids: list[str] = []
    ledger_evidence_refs: list[object] = []
    for ledger_path in ledger_paths:
        parsed, payload, parse_error = _safe_canonical_json(ledger_path)
        if parse_error is not None or parsed is None or payload is None:
            ledger_errors.append(parse_error or "ledger is unreadable")
            continue
        ledger_records.append(parsed)
        if ledger_path.name == "build-ledger.json":
            ledger_sha256 = sha256_bytes(payload)
        artifacts = parsed.get("artifacts")
        if isinstance(artifacts, list):
            ledger_artifact_ids.extend(
                str(item["artifact_id"])
                for item in artifacts
                if isinstance(item, Mapping) and isinstance(item.get("artifact_id"), str)
            )
        refs = parsed.get("evidence_refs")
        if isinstance(refs, list):
            ledger_evidence_refs.extend(refs)

    result_errors: list[str] = []
    result_record: dict[str, object] | None = None
    result_sha256: str | None = None
    if os.path.lexists(os.fspath(result_path)):
        parsed, payload, parse_error = _safe_canonical_json(result_path)
        if parse_error is not None or parsed is None or payload is None:
            result_errors.append(parse_error or "build-result is unreadable")
        else:
            result_record = parsed
            result_sha256 = sha256_bytes(payload)

    selected = next(
        (item for item in ledger_records if item.get("state") is not None),
        result_record,
    )
    state = str(selected.get("state", "unknown")) if selected is not None else "unregistered"
    status = selected.get("status") if selected is not None else None

    key_file = result_dir / "key.json"
    key_file_errors: list[str] = []
    key_file_hash: str | None = None
    if key_file.exists():
        parsed_key, key_payload, parse_error = _safe_canonical_json(key_file)
        if parse_error is not None or parsed_key is None or key_payload is None:
            key_file_errors.append(parse_error or "key.json is unreadable")
        else:
            try:
                key_value, canonical_payload, key_digest = read_key_json(key_file)
                if key_digest != digest or key_value.get("source_revision") != revision:
                    key_file_errors.append("key.json identity does not match cache path")
                key_file_hash = sha256_bytes(canonical_payload)
            except BuildContractError as exc:
                key_file_errors.append(str(exc))

    marker_path = key_dir / REBUILDABLE_MARKER_NAME
    rebuildability_errors = validate_rebuildable_marker(
        marker_path,
        authority=authority,
        source_revision=revision,
        profile_id_value=profile,
        key_sha256=digest,
        key_json_bytes_sha256=key_file_hash,
    )
    if not key_dir.exists():
        rebuildability_errors = ["cache key directory is absent"]

    if target_exists and not local_uncertain:
        size, size_uncertain = _bounded_tree_size(target)
        fingerprint = _fingerprint_entry(target)
    else:
        size, size_uncertain = 0, local_uncertain
        fingerprint = _fingerprint_entry(target)
    markers = _process_markers(key_dir) if key_dir.exists() and key_dir.is_dir() else []
    lease_path = key_dir / "writer.lease.json"
    lease_state = "none"
    lease_reason = ""
    if lease_path.exists():
        lease_state, lease_reason = _lease_for_entry(
            lease_path, now=now, process_checker=process_checker
        )
    recovery = _path_has_recovery_marker(key_dir) or _path_has_recovery_marker(result_dir)
    age_path = target if target_exists else key_dir if key_dir.exists() else result_dir
    try:
        age_seconds = max(0.0, now_seconds(now) - age_path.stat().st_mtime)
    except OSError:
        age_seconds = None
        local_uncertain = True
    entry = {
        "build_id": _entry_identity(authority, revision, profile, digest),
        "authority": authority,
        "source_revision": revision,
        "profile": profile,
        "key_sha256": digest,
        "path": str(target),
        "target_path": str(target),
        "entry_path": str(key_dir),
        "target_exists": target_exists,
        "result_dir": str(result_dir),
        "result_path": str(result_path),
        "result_exists": os.path.lexists(os.fspath(result_path)),
        "ledger_paths": [str(path) for path in ledger_paths],
        "ledger_sha256": ledger_sha256,
        "result_sha256": result_sha256,
        "artifact_ids": sorted(set(ledger_artifact_ids)),
        "ledger_evidence_refs": ledger_evidence_refs,
        "size_bytes": size,
        "state": state,
        "status": status,
        "lease_state": lease_state,
        "lease_reason": lease_reason,
        "process_markers": markers,
        "ledger_errors": ledger_errors,
        "result_errors": result_errors,
        "key_file_errors": key_file_errors,
        "rebuildability_errors": rebuildability_errors,
        "rebuildable": not rebuildability_errors,
        "recovery_archive": recovery,
        "fingerprint": fingerprint,
        "age_seconds": age_seconds,
        "evidence_root": str(evidence_root),
    }
    if target_exists and fingerprint[1] != "tree":
        local_uncertain = True
    local_uncertain = (
        local_uncertain
        or size_uncertain
        or bool(ledger_errors)
        or bool(result_errors)
        or bool(key_file_errors)
        or lease_state == "uncertain"
    )
    return entry, bool(local_uncertain)


def _discover_cache_entries(
    cache_root: Path,
    result_root: Path,
    *,
    evidence_root: Path,
    now: object | None,
    process_checker: Callable[[Mapping[str, object]], object] | None,
    max_entries: int = 10_000,
) -> tuple[list[dict[str, object]], bool]:
    cache_identities, cache_uncertain = _identity_directories(cache_root, max_entries=max_entries)
    result_identities, result_uncertain = _identity_directories(result_root, max_entries=max_entries)
    all_identities = dict(result_identities)
    all_identities.update(cache_identities)
    entries: list[dict[str, object]] = []
    uncertain = cache_uncertain or result_uncertain
    for identity in sorted(all_identities):
        entry, entry_uncertain = _cache_entry(
            cache_root,
            result_root,
            evidence_root=evidence_root,
            identity=all_identities[identity],
            now=now,
            process_checker=process_checker,
        )
        entries.append(entry)
        uncertain = uncertain or entry_uncertain
    return entries, uncertain


def _normalise_gc_policy(policy: Mapping[str, object] | None) -> dict[str, object]:
    result = dict(DEFAULT_GC_POLICY)
    if policy is not None:
        result.update(policy)
    if result.get("schema_version") != GC_POLICY_SCHEMA:
        raise BuildContractError("unsupported GC policy schema")
    for field in ("min_free_bytes", "min_free_percent", "failed_grace_seconds", "successful_profiles_per_key"):
        value = result.get(field)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
            raise BuildContractError(f"invalid GC policy field: {field}")
    if result["successful_profiles_per_key"] < 1:
        raise BuildContractError("successful_profiles_per_key must be positive")
    for field in ("ssd_preferred", "quarantine_required"):
        if not isinstance(result.get(field), bool):
            raise BuildContractError(f"invalid GC policy field: {field}")
    result["min_free_bytes"] = int(result["min_free_bytes"])
    result["failed_grace_seconds"] = int(result["failed_grace_seconds"])
    return result


def _load_reference_file(path: os.PathLike[str] | str) -> object:
    parsed = read_json(path)
    return parsed


def _entry_reference_reasons(
    entry: Mapping[str, object],
    *,
    groups: Mapping[str, object],
    evidence_records: Sequence[tuple[str, object]],
    active_inventory_unknown: bool,
    doctor_ok: bool | None,
    policy: Mapping[str, object],
    now: object | None,
) -> list[str]:
    reasons: set[str] = set()
    for group_name, values in groups.items():
        for label, reference in _flatten_references(values, group_name):
            if group_name == "feat_iced":
                generic_feat_iced = reference is True or (
                    isinstance(reference, str) and reference in {"feat-iced", "feat_iced"}
                )
                if (
                    (
                        generic_feat_iced
                        and "iced" in str(entry.get("authority", "")).lower()
                    )
                    or (
                        not generic_feat_iced
                        and "iced" in str(reference).lower()
                    )
                    or _reference_matches(entry, reference)
                ):
                    reasons.add("feat-iced-root:" + label)
            elif _reference_matches(entry, reference):
                reasons.add(label)
    for label, reference in evidence_records:
        if _reference_matches(entry, reference):
            reasons.add("evidence-reference:" + label)
    for index, reference in enumerate(entry.get("ledger_evidence_refs", [])):
        if _reference_matches(entry, reference):
            reasons.add(f"sealed-evidence-reference:{index}")
    if active_inventory_unknown:
        reasons.add("active-session-inventory-unknown")
    if doctor_ok is not True:
        reasons.add("vws-doctor-not-confirmed")
    if entry.get("recovery_archive"):
        reasons.add("recovery-archive-protected")
    if not entry.get("target_exists", True):
        reasons.add("target-missing")
    if entry.get("rebuildability_errors"):
        reasons.add("rebuildability-unproven")
    if entry.get("key_file_errors"):
        reasons.add("key-file-validation-uncertain")
    if entry.get("result_errors"):
        reasons.add("build-result-validation-uncertain")
    fingerprint = entry.get("fingerprint")
    if entry.get("target_exists") and (
        not isinstance(fingerprint, (tuple, list)) or len(fingerprint) < 2 or fingerprint[1] != "tree"
    ):
        reasons.add("target-fingerprint-uncertain")
    if entry.get("ledger_paths"):
        reasons.add("ledger-present")
        if entry.get("state") == "sealed" and not entry.get("ledger_errors"):
            reasons.add("sealed-ledger-root")
        elif entry.get("ledger_errors"):
            reasons.add("ledger-validation-uncertain")
    if entry.get("result_exists") or os.path.lexists(str(entry["result_path"])):
        reasons.add("build-result-root")
    lease_state = entry.get("lease_state")
    if lease_state == "active":
        reasons.add("active-lease")
    elif lease_state == "uncertain":
        reasons.add("lease-identity-uncertain")
    for marker in entry.get("process_markers", []):
        if not isinstance(marker, Mapping) or marker.get("alive") is not False or marker.get("known") is not True:
            reasons.add("process-identity-uncertain")
        elif marker.get("alive") is True:
            reasons.add("active-process")
    age = entry.get("age_seconds")
    grace = float(policy["failed_grace_seconds"])
    if not isinstance(age, (int, float)) or age < grace:
        reasons.add("grace-period")
    return sorted(reasons)


def _snapshot_map(entries: Sequence[Mapping[str, object]]) -> dict[str, tuple[object, ...]]:
    result: dict[str, tuple[object, ...]] = {}
    for entry in entries:
        fingerprint = entry.get("fingerprint")
        if isinstance(fingerprint, (tuple, list)):
            result[str(entry["build_id"])] = tuple(fingerprint)
    return result


def _active_inventory_unknown(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, Mapping):
        count = value.get("count")
        if isinstance(count, int) and count > 0:
            for field in ("sessions", "paths", "refs", "references", "active"):
                if value.get(field):
                    return _active_inventory_unknown(value[field])
            return True
        return False
    if isinstance(value, list):
        for item in value:
            if isinstance(item, Mapping):
                if not any(
                    item.get(field)
                    for field in ("key_sha256", "source_revision", "path", "target_path", "result_path")
                ):
                    return True
            elif not isinstance(item, str) or not item:
                return True
        return False
    return True


def _root_record(kind: str, value: object, reason: str) -> dict[str, object]:
    return {"kind": kind, "value": value, "reason": reason}


GC_LOCK_FILE = ".gc.namespace.lock"
GC_LOCK_SCHEMA = "tessera/build-gc-lock/v1"


@contextlib.contextmanager
def gc_namespace_lock(
    cache_root: os.PathLike[str] | str,
    *,
    namespace: str = "all",
    now: object | None = None,
) -> Any:
    root = absolute_path(cache_root)
    root.mkdir(parents=True, exist_ok=True)
    if contains_symlink(root, root.parent):
        raise PathContractError(f"GC root is symlinked: {root}")
    path = root / GC_LOCK_FILE
    lock_id = secrets.token_hex(16)
    record = {
        "schema_version": GC_LOCK_SCHEMA,
        "lock_id": lock_id,
        "namespace": namespace,
        "pid": os.getpid(),
        "host_id": host_identity(),
        "process_start_token": current_process_start_token(os.getpid()) or "",
        "acquired_at": timestamp(now),
    }
    if not record["process_start_token"]:
        raise BuildContractError("GC lock process identity is unavailable")
    payload = canonical_json_bytes(record)
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(os.fspath(path), flags, 0o600)
    except FileExistsError as exc:
        raise LeaseBusy(f"GC namespace is already locked: {root}") from exc
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        yield record
    finally:
        with contextlib.suppress(FileNotFoundError):
            current = read_json(path)
            if isinstance(current, Mapping) and current.get("lock_id") == lock_id:
                path.unlink()


def _scan_gc_pair(
    roots: ManagedRoots,
    *,
    now: object | None,
    process_checker: Callable[[Mapping[str, object]], object] | None,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[tuple[str, object]], bool]:
    with gc_namespace_lock(roots.cache_root, now=now):
        first_entries, first_uncertain = _discover_cache_entries(
            roots.cache_root,
            roots.result_root,
            evidence_root=roots.evidence_root,
            now=now,
            process_checker=process_checker,
        )
        evidence_records: list[tuple[str, object]] = []
        evidence_uncertain = False
        for evidence_file in _iter_json_files(roots.evidence_root, max_files=10_000):
            parsed, parse_error = _safe_json(evidence_file)
            label = evidence_file.relative_to(roots.evidence_root).as_posix()
            if parse_error is not None:
                evidence_uncertain = True
                evidence_records.append(
                    (label, {"path": str(evidence_file), "parse_error": parse_error})
                )
            elif parsed is not None:
                evidence_records.append((label, parsed))
        second_entries, second_uncertain = _discover_cache_entries(
            roots.cache_root,
            roots.result_root,
            evidence_root=roots.evidence_root,
            now=now,
            process_checker=process_checker,
        )
    return (
        first_entries,
        second_entries,
        evidence_records,
        bool(first_uncertain or second_uncertain or evidence_uncertain),
    )


def gc_dry_run(
    roots: ManagedRoots | None = None,
    *,
    cache_root: os.PathLike[str] | str | None = None,
    result_root: os.PathLike[str] | str | None = None,
    evidence_root: os.PathLike[str] | str | None = None,
    references: Mapping[str, object] | os.PathLike[str] | str | None = None,
    authority_refs: object | None = None,
    active_sessions: object | None = None,
    feat_iced_refs: object | None = None,
    current_release_refs: object | None = None,
    sbom_refs: object | None = None,
    manual_retained_roots: object | None = None,
    recovery_archives: object | None = None,
    doctor_ok: bool | None = False,
    policy: Mapping[str, object] | None = None,
    now: object | None = None,
    process_checker: Callable[[Mapping[str, object]], object] | None = None,
    allow_production_scan: bool = False,
) -> dict[str, object]:
    """Perform a reference census and return a non-destructive mark-and-sweep plan."""
    default_roots = ManagedRoots.default()
    if roots is None:
        roots = ManagedRoots(
            Path(cache_root) if cache_root is not None else default_roots.cache_root,
            Path(result_root) if result_root is not None else default_roots.result_root,
            Path(evidence_root) if evidence_root is not None else default_roots.evidence_root,
        )
    policy_value = _normalise_gc_policy(policy)
    is_default_scope = roots == default_roots
    if is_default_scope and not allow_production_scan:
        return {
            "schema_version": GC_REPORT_SCHEMA,
            "dry_run": True,
            "ok": False,
            "blocked": True,
            "errors": [error("PRODUCTION_SCAN_DISABLED", "real managed cache scan requires explicit allow_production_scan")],
            "roots": [],
            "entries": [],
            "candidates": [],
            "retained": [],
            "policy": policy_value,
            "vws_doctor_ok": doctor_ok is True,
            "candidate_count": 0,
            "retained_count": 0,
            "candidate_bytes": 0,
        }
    if isinstance(references, (str, os.PathLike)):
        references_value = _load_reference_file(references)
    else:
        references_value = references
    if references_value is not None and not isinstance(references_value, Mapping):
        raise BuildContractError("references must be an object or JSON file")
    refs_map = dict(references_value or {})
    groups: dict[str, object] = {
        "authority_refs": authority_refs if authority_refs is not None else refs_map.get("authority_refs", []),
        "active_sessions": active_sessions if active_sessions is not None else refs_map.get("active_sessions"),
        "feat_iced": feat_iced_refs if feat_iced_refs is not None else refs_map.get("feat_iced", ["feat-iced"]),
        "current_release": current_release_refs if current_release_refs is not None else refs_map.get("current_release", []),
        "sbom": sbom_refs if sbom_refs is not None else refs_map.get("sbom", []),
        "manual_retained": manual_retained_roots if manual_retained_roots is not None else refs_map.get("manual_retained", []),
        "recovery_archive": recovery_archives if recovery_archives is not None else refs_map.get("recovery_archives", []),
    }
    active_value = groups["active_sessions"]
    active_inventory_unknown = _active_inventory_unknown(active_value)
    if isinstance(refs_map.get("active_session_count"), int) and refs_map["active_session_count"] > 0 and active_value is None:
        active_inventory_unknown = True
    root_records: list[dict[str, object]] = [
        _root_record("authority-ref", groups["authority_refs"], "authority refs are retention roots"),
        _root_record("active-session", groups["active_sessions"], "active VWS sessions are retention roots"),
        _root_record("feat-iced", groups["feat_iced"], "feat-iced historical ref is protected"),
        _root_record("current-release", groups["current_release"], "current release is protected"),
        _root_record("sbom", groups["sbom"], "SBOM references are protected"),
        _root_record("manual-retained", groups["manual_retained"], "manual retention roots are protected"),
        _root_record("recovery-archive", groups["recovery_archive"], "recovery archives are never swept"),
    ]
    try:
        first_entries, second_entries, evidence_records, census_uncertain = _scan_gc_pair(
            roots,
            now=now,
            process_checker=process_checker,
        )
    except (OSError, ValueError) as exc:
        return {
            "schema_version": GC_REPORT_SCHEMA,
            "dry_run": True,
            "ok": False,
            "blocked": True,
            "errors": [error("CENSUS", str(exc))],
            "roots": root_records,
            "entries": [],
            "candidates": [],
            "retained": [],
            "policy": policy_value,
            "vws_doctor_ok": doctor_ok is True,
            "candidate_count": 0,
            "retained_count": 0,
            "candidate_bytes": 0,
        }
    first_map = {str(item["build_id"]): item for item in first_entries}
    second_map = {str(item["build_id"]): item for item in second_entries}
    first_fingerprints = _snapshot_map(first_entries)
    second_fingerprints = _snapshot_map(second_entries)
    entries: list[dict[str, object]] = []
    for build_id, entry in sorted(second_map.items()):
        reasons = _entry_reference_reasons(
            entry,
            groups=groups,
            evidence_records=evidence_records,
            active_inventory_unknown=active_inventory_unknown,
            doctor_ok=doctor_ok,
            policy=policy_value,
            now=now,
        )
        if build_id not in first_map or first_fingerprints.get(build_id) != second_fingerprints.get(build_id):
            reasons.append("toctou-rescan-changed")
        if census_uncertain:
            reasons.append("census-uncertain")
        reasons = sorted(set(reasons))
        references_for_entry = [reason for reason in reasons if ":" in reason or "root" in reason or "result" in reason or "ledger" in reason or "evidence" in reason]
        safe = not reasons
        item = dict(entry)
        item.pop("evidence_root", None)
        if isinstance(entry.get("fingerprint"), tuple):
            item["fingerprint"] = list(entry["fingerprint"])
        item["references"] = references_for_entry
        item["retained_reason"] = [] if safe else reasons
        item["safe_to_quarantine"] = safe
        item["candidate"] = safe
        entries.append(item)
    volume = collect_volume_info(roots.cache_root)
    available = volume.get("available_bytes")
    emergency = {
        "available_bytes": available,
        "min_free_bytes": policy_value["min_free_bytes"],
        "min_free_percent": policy_value["min_free_percent"],
        "growth_blocked": not isinstance(available, int)
        or available < int(policy_value["min_free_bytes"])
        or float(volume.get("free_percent", 0.0)) < float(policy_value["min_free_percent"]),
    }
    candidates = [item for item in entries if item["candidate"]]
    retained = [item for item in entries if not item["candidate"]]
    return {
        "schema_version": GC_REPORT_SCHEMA,
        "dry_run": True,
        "ok": True,
        "blocked": False,
        "vws_doctor_ok": doctor_ok is True,
        "roots": root_records,
        "policy": policy_value,
        "volume": volume,
        "emergency": emergency,
        "entries": entries,
        "candidates": candidates,
        "retained": retained,
        "candidate_count": len(candidates),
        "retained_count": len(retained),
        "candidate_bytes": sum(int(item["size_bytes"]) for item in candidates),
        "scanned_cache_root": str(roots.cache_root),
    }


def quarantine_gc_candidates(
    report: Mapping[str, object],
    *,
    roots: ManagedRoots,
    confirm: bool = False,
    quarantine_root: os.PathLike[str] | str | None = None,
) -> list[str]:
    """Move only a previously verified dry-run candidate to quarantine.

    This is intentionally opt-in and never permanently deletes data.
    """
    if not confirm:
        raise BuildContractError("quarantine requires explicit confirmation")
    if report.get("dry_run") is not True or report.get("ok") is not True:
        raise BuildContractError("only a successful dry-run report can be applied")
    if report.get("schema_version") != GC_REPORT_SCHEMA:
        raise BuildContractError("unsupported GC report schema")
    target_root = absolute_path(quarantine_root) if quarantine_root is not None else roots.cache_root / ".quarantine"
    validate_managed_path(
        target_root,
        roots.cache_root,
        reject_private_tmp=not roots.fixture_mode,
    )
    target_root.mkdir(parents=True, exist_ok=True)
    moved: list[str] = []
    with gc_namespace_lock(roots.cache_root):
        for candidate in report.get("candidates", []):
            if not isinstance(candidate, Mapping) or candidate.get("safe_to_quarantine") is not True:
                continue
            try:
                authority = str(candidate["authority"])
                revision = str(candidate["source_revision"])
                profile = str(candidate["profile"])
                digest = str(candidate["key_sha256"])
            except (KeyError, TypeError) as exc:
                raise BuildContractError("GC candidate is missing its canonical identity") from exc
            expected_target = (
                roots.cache_root / authority / revision / profile / digest / "target"
            )
            source = absolute_path(str(candidate.get("target_path", candidate.get("path", ""))))
            if source != expected_target:
                raise PathContractError("GC candidate path does not match its canonical identity")
            validate_managed_path(
                source,
                roots.cache_root,
                allow_missing=False,
                reject_private_tmp=not roots.fixture_mode,
            )
            if _path_has_recovery_marker(source):
                raise PathContractError(f"recovery path cannot be quarantined: {source}")
            recorded_fingerprint = candidate.get("fingerprint")
            if not isinstance(recorded_fingerprint, list) or tuple(recorded_fingerprint) != _fingerprint_entry(source):
                raise BuildContractError(f"candidate changed since dry-run: {source}")
            fresh, uncertain = _cache_entry(
                roots.cache_root,
                roots.result_root,
                evidence_root=roots.evidence_root,
                identity=(authority, revision, profile, digest),
                now=None,
                process_checker=None,
            )
            if (
                uncertain
                or fresh.get("ledger_paths")
                or fresh.get("result_exists")
                or fresh.get("lease_state") != "none"
                or fresh.get("process_markers")
                or fresh.get("rebuildability_errors")
                or fresh.get("fingerprint") != tuple(recorded_fingerprint)
            ):
                raise BuildContractError(f"candidate is no longer safe to quarantine: {source}")
            destination = target_root / (digest + "-" + secrets.token_hex(6))
            os.replace(os.fspath(source), os.fspath(destination))
            moved.append(str(destination))
    return moved
