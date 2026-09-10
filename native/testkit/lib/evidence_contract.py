"""Dependency-free validator primitives for the private Tessera G0 testkit."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
import errno
import re
import selectors
import signal
import shlex
import stat
import subprocess
import tempfile
import threading
import time
import ctypes
import ntpath
from datetime import datetime, timezone
from pathlib import Path
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any, Iterable, Iterator

EVIDENCE_VERSION = "tessera.iced.evidence/v1"
MANIFEST_VERSION = "tessera.iced.payload-manifest/v1"
VALIDATOR_VERSION = "g0-evidence-validator/1.2.0"
FROZEN_CATALOG_CELL_COUNT = 216
FROZEN_CATALOG_FILE_SHA256 = "2ee04acdea8419b2c7ea307fd8e496ba84289a04049cb3d0dd809970cbc8e02f"
FROZEN_CROSSWALK_FILE_SHA256 = "e20793783fa0fa476087baa10c39a49f11c8857b5cc7f9ae6803fae10a90de5c"
FROZEN_CATALOG_CANONICAL_SHA256 = "0ab17a23012f43e378b80d1375bf34787ac5083d59a51f0baff081fea79d1798"
FROZEN_CROSSWALK_CANONICAL_SHA256 = "64ef91efbac009b1ae8df2116eaa173aadc56a93f8400fc41a768acfd1ccbd25"
EXCLUDED_ENVELOPES = {
    "payload-manifest.json",
    "validation.json",
    "provenance-attestation.json",
    "signature-envelope.json",
    "external-registration.json",
}
HASH_RE = re.compile(r"^[a-f0-9]{64}$")
RUN_RE = re.compile(r"^RUN-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}-[0-9]{3}$")
SECRET_KEY_RE = re.compile(r"(?:SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE_KEY|API_KEY)", re.IGNORECASE)
EXECUTION_STATUSES = {"pass", "fail", "blocked", "inconclusive"}
DOD_STATUSES = {"pass", "blocked", "not_applicable"}
APPLICABILITY_KEYS = ("visual", "performance", "fault", "soak", "screen_reader")
METRIC_SCOPES = {"scene_local", "shared_nightly", "shared_rc"}
CELL_DIMENSIONS = (
    "layer",
    "platform_profile_id",
    "renderer",
    "system_scale",
    "ui_scale",
    "theme",
    "locale",
    "assistive_tech",
)
RECORD_ID_RE = re.compile(r"^EV-RUN-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}-[0-9]{3}-T-G0-[0-9]{3}$")
MAX_JSON_BYTES = 8 * 1024 * 1024
MAX_PRIOR_RECORD_BYTES = 2 * 1024 * 1024
MAX_PRIOR_BUNDLE_VISITS = 512
MAX_PRIOR_LOOKUP_VISITED_ENTRIES = MAX_PRIOR_BUNDLE_VISITS
MAX_BUNDLE_ENTRIES = 8192
MAX_BUNDLE_DEPTH = 32
MAX_HASH_FILE_BYTES = 8 * 1024 * 1024
MAX_HASH_AGGREGATE_BYTES = 12 * 1024 * 1024
HASH_READ_CHUNK_BYTES = 1024 * 1024
TRUSTED_VERIFIER_TIMEOUT_SECONDS = 30
TRUSTED_VERIFIER_CAPTURE_BYTES = 1024 * 1024
TRUSTED_VERIFIER_READ_CHUNK_BYTES = 64 * 1024
TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS = 2.0
TRUSTED_VERIFIER_POST_EXIT_PIPE_SECONDS = 0.25
SOAK_INTERVAL_SECONDS = 300
SOAK_SAMPLE_JITTER_SECONDS = 15
SOAK_WINDOW_SAMPLES = 97
SOAK_WINDOW_SECONDS = (SOAK_WINDOW_SAMPLES - 1) * SOAK_INTERVAL_SECONDS
MAX_SOAK_RAW_BYTES = 2 * 1024 * 1024
MAX_SOAK_SESSIONS = 8
MAX_SOAK_SAMPLES = 512
DIRECT_PRIOR_RECORD_LOOKUP = True
if os.name == "nt":
    import msvcrt


class BundlePathError(ValueError):
    """A bounded filesystem check failed without following an untrusted path."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code


class SoakValidationError(ValueError):
    """A raw soak series violates a stable, caller-visible evidence contract."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class HashBudget:
    """Per-stage digest budget with fd-identity caching."""

    def __init__(self, per_file_bytes: int = MAX_HASH_FILE_BYTES, aggregate_bytes: int = MAX_HASH_AGGREGATE_BYTES) -> None:
        if per_file_bytes <= 0 or aggregate_bytes <= 0:
            raise ValueError("hash budgets must be positive")
        self.per_file_bytes = per_file_bytes
        self.aggregate_bytes = aggregate_bytes
        self._used_bytes = 0
        self._cache: dict[tuple[Any, ...], tuple[str, int]] = {}

    @property
    def used_bytes(self) -> int:
        return self._used_bytes

    def digest_fd(self, fd: int, label: str, cache_hint: tuple[Any, ...] | None = None, max_bytes: int | None = None) -> str:
        metadata = os.fstat(fd)
        if not stat.S_ISREG(metadata.st_mode):
            raise BundlePathError("BUNDLE_NONREGULAR", f"cannot hash non-regular file: {label}")
        effective_file_limit = self.per_file_bytes if max_bytes is None else min(self.per_file_bytes, max_bytes)
        if metadata.st_size > effective_file_limit:
            raise BundlePathError("HASH_FILE_LIMIT", f"{label} exceeds {effective_file_limit} byte hash limit")
        identity = (
            getattr(metadata, "st_dev", None),
            getattr(metadata, "st_ino", None),
            metadata.st_size,
            getattr(metadata, "st_mtime_ns", None),
            cache_hint,
        )
        cached = self._cache.get(identity)
        if cached is not None:
            return cached[0]
        if self._used_bytes + metadata.st_size > self.aggregate_bytes:
            raise BundlePathError("HASH_AGGREGATE_LIMIT", f"hash stage exceeds {self.aggregate_bytes} byte aggregate limit")
        self._used_bytes += metadata.st_size
        digest = hashlib.sha256()
        total = 0
        while True:
            chunk = os.read(fd, min(HASH_READ_CHUNK_BYTES, effective_file_limit + 1 - total))
            if not chunk:
                break
            total += len(chunk)
            if total > effective_file_limit:
                raise BundlePathError("HASH_FILE_LIMIT", f"{label} exceeds {effective_file_limit} byte hash limit while reading")
            if total > metadata.st_size:
                raise BundlePathError("HASH_FILE_MUTATED", f"{label} grew while hashing")
            digest.update(chunk)
        if total != metadata.st_size:
            raise BundlePathError("HASH_FILE_MUTATED", f"{label} changed while hashing")
        value = digest.hexdigest()
        self._cache[identity] = (value, metadata.st_size)
        return value


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path, max_bytes: int = MAX_HASH_FILE_BYTES, budget: HashBudget | None = None) -> str:
    fd = _open_regular_path_fd(path)
    owned_budget = budget or HashBudget(per_file_bytes=max_bytes, aggregate_bytes=max(max_bytes, MAX_HASH_AGGREGATE_BYTES))
    try:
        return owned_budget.digest_fd(fd, os.fspath(path), (os.path.abspath(os.fspath(path)),), max_bytes)
    finally:
        os.close(fd)


def load_json(path: Path, max_bytes: int = MAX_JSON_BYTES) -> Any:
    payload = read_limited(path, max_bytes)
    return json.loads(payload.decode("utf-8"))


def source_identity(source: dict[str, Any]) -> str | None:
    revision = source.get("revision") if isinstance(source, dict) else None
    return revision if isinstance(revision, str) and re.fullmatch(r"[a-f0-9]{40}", revision) else None


def authority_digests(catalog: dict[str, Any], crosswalk: dict[str, Any]) -> dict[str, str]:
    return {
        "catalog_sha256": sha256_bytes(canonical_json_bytes(catalog)),
        "crosswalk_sha256": sha256_bytes(canonical_json_bytes(crosswalk)),
    }


def validate_authority_files(catalog_path: Path, crosswalk_path: Path) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    try:
        catalog_matches = sha256_file(catalog_path) == FROZEN_CATALOG_FILE_SHA256
    except (OSError, ValueError):
        catalog_matches = False
    if not catalog_matches:
        errors.append(issue("AUTHORITY_CATALOG_DIGEST", "catalog bytes do not match the frozen authority"))
    try:
        crosswalk_matches = sha256_file(crosswalk_path) == FROZEN_CROSSWALK_FILE_SHA256
    except (OSError, ValueError):
        crosswalk_matches = False
    if not crosswalk_matches:
        errors.append(issue("AUTHORITY_CROSSWALK_DIGEST", "crosswalk bytes do not match the frozen authority"))
    return errors


def read_limited(path: Path, max_bytes: int) -> bytes:
    if max_bytes <= 0:
        raise ValueError("read limit must be positive")
    fd = _open_regular_path_fd(path)
    try:
        metadata = os.fstat(fd)
        if metadata.st_size > max_bytes:
            raise ValueError(f"file exceeds {max_bytes} byte read limit: {path}")
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = os.read(fd, min(1024 * 1024, max_bytes + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > max_bytes:
                raise ValueError(f"file exceeds {max_bytes} byte read limit: {path}")
        return b"".join(chunks)
    finally:
        os.close(fd)


_O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
_O_NONBLOCK = getattr(os, "O_NONBLOCK", 0)

# Win32 scalar aliases are deliberately independent of the host C ABI.  In
# particular, macOS `c_ulong` is 64 bits while Windows DWORD and ULONG are
# always 32 bits, including on Windows x64.
DWORD = ctypes.c_uint32
ULONG = ctypes.c_uint32
BOOL = ctypes.c_int32
WORD = ctypes.c_uint16
LARGE_INTEGER = ctypes.c_int64
ULONGLONG = ctypes.c_uint64
SIZE_T = ctypes.c_size_t
ULONG_PTR = ctypes.c_size_t
HANDLE = ctypes.c_void_p
PVOID = ctypes.c_void_p
PWSTR = ctypes.c_wchar_p
BYTE = ctypes.c_ubyte
BOOLEAN = ctypes.c_ubyte
NTSTATUS = ctypes.c_int32
WIN32_ENUM = ctypes.c_int32
_WIN_FILE_ATTRIBUTE_DIRECTORY = 0x00000010
_WIN_FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400
_WIN_FILE_SHARE_READ = 0x00000001
_WIN_FILE_SHARE_WRITE = 0x00000002
_WIN_FILE_OPEN = 0x00000001
_WIN_FILE_CREATE = 0x00000002
_WIN_FILE_OPEN_IF = 0x00000003
_WIN_FILE_DIRECTORY_FILE = 0x00000001
_WIN_FILE_NON_DIRECTORY_FILE = 0x00000040
_WIN_FILE_SYNCHRONOUS_IO_NONALERT = 0x00000020
_WIN_FILE_OPEN_REPARSE_POINT = 0x00200000
_WIN_FILE_LIST_DIRECTORY = 0x00000001
_WIN_FILE_READ_DATA = 0x00000001
_WIN_FILE_WRITE_DATA = 0x00000002
_WIN_FILE_ADD_FILE = 0x00000002
_WIN_FILE_ADD_SUBDIRECTORY = 0x00000004
_WIN_FILE_READ_ATTRIBUTES = 0x00000080
_WIN_DELETE = 0x00010000
_WIN_SYNCHRONIZE = 0x00100000
_WIN_OBJ_CASE_INSENSITIVE = 0x00000040
_WIN_FILE_ATTRIBUTE_TAG_INFO = 9
_WIN_FILE_ID_INFO = 18
_WIN_FILE_RENAME_INFO = 3
_WIN_FILE_RENAME_INFO_EX = 22
_WIN_FILE_RENAME_FLAG_REPLACE_IF_EXISTS = 0x00000001
_WIN_GENERIC_READ = 0x80000000
_WIN_OPEN_EXISTING = 3
_WIN_FILE_FLAG_BACKUP_SEMANTICS = 0x02000000
_WIN_STATUS_OBJECT_NAME_NOT_FOUND = 0xC0000034
_WIN_STATUS_OBJECT_PATH_NOT_FOUND = 0xC000003A
_WIN_STATUS_NO_MORE_FILES = 0x80000006
_WINDOWS_IDENTITIES: dict[int, tuple[int, bytes]] = {}
_WIN_JOB_OBJECT_EXTENDED_LIMIT_INFORMATION = 9
_WIN_JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000
_WIN_HANDLE_FLAG_INHERIT = 0x00000001
_WIN_STARTF_USESTDHANDLES = 0x00000100
_WIN_CREATE_SUSPENDED = 0x00000004
_WIN_EXTENDED_STARTUPINFO_PRESENT = 0x00080000
_WIN_WAIT_OBJECT_0 = 0x00000000
_WIN_WAIT_TIMEOUT = 0x00000102
_WIN_INFINITE = 0xFFFFFFFF
_WIN_ERROR_BROKEN_PIPE = 109
_WIN_ERROR_OPERATION_ABORTED = 995
_WIN_ERROR_NOT_FOUND = 1168
_WIN_PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002


class _WinIoCounters(ctypes.Structure):
    _fields_ = [
        ("ReadOperationCount", ULONGLONG),
        ("WriteOperationCount", ULONGLONG),
        ("OtherOperationCount", ULONGLONG),
        ("ReadTransferCount", ULONGLONG),
        ("WriteTransferCount", ULONGLONG),
        ("OtherTransferCount", ULONGLONG),
    ]


class _WinJobObjectBasicLimitInformation(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", LARGE_INTEGER),
        ("PerJobUserTimeLimit", LARGE_INTEGER),
        ("LimitFlags", DWORD),
        ("MinimumWorkingSetSize", SIZE_T),
        ("MaximumWorkingSetSize", SIZE_T),
        ("ActiveProcessLimit", DWORD),
        ("Affinity", ULONG_PTR),
        ("PriorityClass", DWORD),
        ("SchedulingClass", DWORD),
    ]


class _WinJobObjectExtendedLimitInformation(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", _WinJobObjectBasicLimitInformation),
        ("IoInfo", _WinIoCounters),
        ("ProcessMemoryLimit", SIZE_T),
        ("JobMemoryLimit", SIZE_T),
        ("PeakProcessMemoryUsed", SIZE_T),
        ("PeakJobMemoryUsed", SIZE_T),
    ]


class _WinSecurityAttributes(ctypes.Structure):
    _fields_ = [("nLength", DWORD), ("lpSecurityDescriptor", PVOID), ("bInheritHandle", BOOL)]


class _WinStartupInfo(ctypes.Structure):
    _fields_ = [
        ("cb", DWORD),
        ("lpReserved", PWSTR),
        ("lpDesktop", PWSTR),
        ("lpTitle", PWSTR),
        ("dwX", DWORD),
        ("dwY", DWORD),
        ("dwXSize", DWORD),
        ("dwYSize", DWORD),
        ("dwXCountChars", DWORD),
        ("dwYCountChars", DWORD),
        ("dwFillAttribute", DWORD),
        ("dwFlags", DWORD),
        ("wShowWindow", WORD),
        ("cbReserved2", WORD),
        ("lpReserved2", PVOID),
        ("hStdInput", HANDLE),
        ("hStdOutput", HANDLE),
        ("hStdError", HANDLE),
    ]


class _WinProcessInformation(ctypes.Structure):
    _fields_ = [("hProcess", HANDLE), ("hThread", HANDLE), ("dwProcessId", DWORD), ("dwThreadId", DWORD)]


class _WinStartupInfoEx(ctypes.Structure):
    _fields_ = [("StartupInfo", _WinStartupInfo), ("lpAttributeList", PVOID)]


class _WindowsNtStatusError(OSError):
    def __init__(self, status: int, operation: str) -> None:
        super().__init__(f"{operation} failed with NTSTATUS 0x{status & 0xFFFFFFFF:08x}")
        self.status = status & 0xFFFFFFFF


class _WinUnicodeString(ctypes.Structure):
    _fields_ = [
        ("Length", WORD),
        ("MaximumLength", WORD),
        ("Buffer", PWSTR),
    ]


class _WinObjectAttributes(ctypes.Structure):
    _fields_ = [
        ("Length", ULONG),
        ("RootDirectory", HANDLE),
        ("ObjectName", ctypes.POINTER(_WinUnicodeString)),
        ("Attributes", ULONG),
        ("SecurityDescriptor", PVOID),
        ("SecurityQualityOfService", PVOID),
    ]


class _WinIoStatusValue(ctypes.Union):
    _fields_ = [("Status", NTSTATUS), ("Pointer", PVOID)]


class _WinIoStatusBlock(ctypes.Structure):
    _fields_ = [("Status", _WinIoStatusValue), ("Information", ULONG_PTR)]


class _WinFileAttributeTagInfo(ctypes.Structure):
    _fields_ = [("FileAttributes", DWORD), ("ReparseTag", DWORD)]


class _WinFileIdInfo(ctypes.Structure):
    _fields_ = [("VolumeSerialNumber", ULONGLONG), ("FileId", BYTE * 16)]


class _WinFileDirectoryInformation(ctypes.Structure):
    _fields_ = [
        ("NextEntryOffset", ULONG),
        ("FileIndex", ULONG),
        ("CreationTime", LARGE_INTEGER),
        ("LastAccessTime", LARGE_INTEGER),
        ("LastWriteTime", LARGE_INTEGER),
        ("ChangeTime", LARGE_INTEGER),
        ("EndOfFile", LARGE_INTEGER),
        ("AllocationSize", LARGE_INTEGER),
        ("FileAttributes", ULONG),
        ("FileNameLength", ULONG),
    ]


class _WinFileRenameInfo(ctypes.Structure):
    _fields_ = [
        ("Flags", DWORD),
        ("RootDirectory", HANDLE),
        ("FileNameLength", DWORD),
        ("FileName", WORD * 1),
    ]


_WIN_FILE_RENAME_INFO_FILENAME_OFFSET = _WinFileRenameInfo.FileName.offset


def _set_non_inheritable(fd: int) -> None:
    try:
        os.set_inheritable(fd, False)
    except OSError as exc:
        raise BundlePathError("FD_CLOEXEC", f"cannot mark descriptor non-inheritable: {exc}") from exc


def _normalize_posix_open_error(exc: OSError, context: str) -> BundlePathError:
    if exc.errno in {errno.ELOOP, getattr(errno, "EMLINK", -1)}:
        return BundlePathError("BUNDLE_SYMLINK", f"symlink is not allowed while opening {context}")
    if exc.errno == errno.ENOTDIR:
        return BundlePathError("BUNDLE_NONREGULAR", f"non-directory component is not allowed while opening {context}")
    return BundlePathError("BUNDLE_OPEN", f"cannot open {context}: {exc}")


def _classify_posix_child_after_open_error(parent_fd: int, name: str, context: str, exc: OSError, require_directory: bool) -> BundlePathError:
    if exc.errno in {errno.ELOOP, getattr(errno, "EMLINK", -1)}:
        return BundlePathError("BUNDLE_SYMLINK", f"symlink is not allowed while opening {context}")
    classify_errnos = {
        errno.ENOTDIR,
        errno.EISDIR,
        getattr(errno, "ENXIO", -1),
        getattr(errno, "EOPNOTSUPP", -1),
        getattr(errno, "ENODEV", -1),
    }
    if exc.errno in classify_errnos:
        try:
            metadata = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        except FileNotFoundError:
            return BundlePathError("BUNDLE_OPEN", f"cannot open {context}: {exc}")
        except OSError:
            return _normalize_posix_open_error(exc, context)
        if stat.S_ISLNK(metadata.st_mode):
            return BundlePathError("BUNDLE_SYMLINK", f"symlink is not allowed while opening {context}")
        if require_directory:
            if not stat.S_ISDIR(metadata.st_mode):
                return BundlePathError("BUNDLE_NONREGULAR", f"non-directory component is not allowed while opening {context}")
        elif not stat.S_ISREG(metadata.st_mode):
            return BundlePathError("BUNDLE_NONREGULAR", f"non-regular path is not allowed while opening {context}")
    return _normalize_posix_open_error(exc, context)


def _posix_dir_flags() -> int:
    if os.name != "posix" or not hasattr(os, "O_NOFOLLOW") or not hasattr(os, "O_DIRECTORY"):
        raise BundlePathError("PLATFORM_NOFOLLOW", "POSIX O_NOFOLLOW and O_DIRECTORY are unavailable")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | _O_CLOEXEC


def _posix_file_flags(write: bool = False, create: bool = False, exclusive: bool = False) -> int:
    if os.name != "posix" or not hasattr(os, "O_NOFOLLOW"):
        raise BundlePathError("PLATFORM_NOFOLLOW", "POSIX O_NOFOLLOW is unavailable")
    flags = (os.O_WRONLY if write else os.O_RDONLY) | os.O_NOFOLLOW | _O_CLOEXEC | _O_NONBLOCK
    if create:
        flags |= os.O_CREAT
    if exclusive:
        flags |= os.O_EXCL
    return flags


def _posix_absolute_components(path: Path) -> tuple[str, ...]:
    lexical = os.path.abspath(os.fspath(path))
    # macOS exposes /var as a system-owned alias to /private/var. Normalize
    # only that fixed kernel/bootstrap alias before the no-follow walk; all
    # runner-controlled components below it are still opened with O_NOFOLLOW.
    if lexical == "/var" or lexical.startswith("/var/"):
        try:
            target = os.readlink("/var")
        except OSError:
            target = ""
        if target in {"private/var", "/private/var"}:
            lexical = "/private/var" + lexical[4:]
    pure = PurePosixPath(lexical)
    if not pure.is_absolute():
        raise BundlePathError("BUNDLE_PATH", f"path is not absolute after lexical normalization: {path}")
    return tuple(part for part in pure.parts if part != "/")


def _open_child_dir_fd(parent_fd: int, name: str) -> int:
    if name in {"", ".", ".."} or "/" in name or "\x00" in name:
        raise BundlePathError("BUNDLE_PATH", f"unsafe directory component: {name!r}")
    try:
        fd = os.open(name, _posix_dir_flags(), dir_fd=parent_fd)
    except FileNotFoundError:
        raise
    except OSError as exc:
        raise _classify_posix_child_after_open_error(parent_fd, name, name, exc, require_directory=True) from exc
    try:
        _set_non_inheritable(fd)
        metadata = os.fstat(fd)
        if not stat.S_ISDIR(metadata.st_mode):
            raise BundlePathError("BUNDLE_NONREGULAR", f"bundle parent is not a directory: {name}")
        return fd
    except Exception:
        os.close(fd)
        raise


def _open_posix_directory_path(path: Path, create: bool = False) -> int:
    current_fd = os.open("/", _posix_dir_flags())
    try:
        _set_non_inheritable(current_fd)
        for component in _posix_absolute_components(path):
            try:
                next_fd = _open_child_dir_fd(current_fd, component)
            except FileNotFoundError:
                if not create:
                    raise
                os.mkdir(component, 0o700, dir_fd=current_fd)
                next_fd = _open_child_dir_fd(current_fd, component)
            os.close(current_fd)
            current_fd = next_fd
        return current_fd
    except Exception:
        os.close(current_fd)
        raise


def _open_posix_regular_path_fd(path: Path) -> int:
    lexical = os.path.abspath(os.fspath(path))
    parent_text, leaf = os.path.split(lexical)
    if leaf in {"", ".", ".."}:
        raise BundlePathError("BUNDLE_PATH", f"regular file path has no safe leaf: {path}")
    parent_fd = _open_posix_directory_path(Path(parent_text))
    try:
        try:
            fd = os.open(leaf, _posix_file_flags(), dir_fd=parent_fd)
        except OSError as exc:
            raise _classify_posix_child_after_open_error(parent_fd, leaf, leaf, exc, require_directory=False) from exc
        try:
            _set_non_inheritable(fd)
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise BundlePathError("BUNDLE_NONREGULAR", f"non-regular path is not allowed: {path}")
            return fd
        except Exception:
            os.close(fd)
            raise
    finally:
        os.close(parent_fd)


def _windows_kernel32() -> Any:
    if os.name != "nt":
        raise BundlePathError("PLATFORM_WINDOWS_API", "Windows filesystem primitives are unavailable on this platform")
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CloseHandle.argtypes = [HANDLE]
    kernel32.CloseHandle.restype = BOOL
    kernel32.CreateFileW.argtypes = [
        PWSTR,
        DWORD,
        DWORD,
        PVOID,
        DWORD,
        DWORD,
        HANDLE,
    ]
    kernel32.CreateFileW.restype = HANDLE
    kernel32.GetFileInformationByHandleEx.argtypes = [
        HANDLE,
        WIN32_ENUM,
        PVOID,
        DWORD,
    ]
    kernel32.GetFileInformationByHandleEx.restype = BOOL
    kernel32.WriteFile.argtypes = [
        HANDLE,
        PVOID,
        DWORD,
        ctypes.POINTER(DWORD),
        PVOID,
    ]
    kernel32.WriteFile.restype = BOOL
    kernel32.FlushFileBuffers.argtypes = [HANDLE]
    kernel32.FlushFileBuffers.restype = BOOL
    kernel32.SetFileInformationByHandle.argtypes = [
        HANDLE,
        WIN32_ENUM,
        PVOID,
        DWORD,
    ]
    kernel32.SetFileInformationByHandle.restype = BOOL
    return kernel32


def _windows_last_error(kernel32: Any | None = None) -> int:
    if kernel32 is not None and hasattr(kernel32, "GetLastError"):
        try:
            return int(kernel32.GetLastError())
        except Exception:
            pass
    get_last_error = getattr(ctypes, "get_last_error", None)
    return int(get_last_error()) if get_last_error is not None else 0


def _windows_ntdll() -> Any:
    if os.name != "nt":
        raise BundlePathError("PLATFORM_WINDOWS_API", "Windows NT primitives are unavailable on this platform")
    ntdll = ctypes.WinDLL("ntdll", use_last_error=True)
    ntdll.NtCreateFile.argtypes = [
        ctypes.POINTER(HANDLE),
        ULONG,
        ctypes.POINTER(_WinObjectAttributes),
        ctypes.POINTER(_WinIoStatusBlock),
        PVOID,
        ULONG,
        ULONG,
        ULONG,
        ULONG,
        PVOID,
        ULONG,
    ]
    ntdll.NtCreateFile.restype = NTSTATUS
    ntdll.NtQueryDirectoryFile.argtypes = [
        HANDLE,
        HANDLE,
        PVOID,
        PVOID,
        ctypes.POINTER(_WinIoStatusBlock),
        PVOID,
        ULONG,
        WIN32_ENUM,
        BOOLEAN,
        PVOID,
        BOOLEAN,
    ]
    ntdll.NtQueryDirectoryFile.restype = NTSTATUS
    return ntdll


def _windows_close(handle: int | None, kernel32: Any | None = None) -> None:
    if not handle:
        return
    kernel32 = kernel32 or _windows_kernel32()
    if not kernel32.CloseHandle(HANDLE(handle)):
        raise OSError(_windows_last_error(kernel32), "CloseHandle failed")
    _WINDOWS_IDENTITIES.pop(handle, None)


def _windows_validate_handle(handle: int, require_directory: bool | None) -> tuple[int, bytes]:
    kernel32 = _windows_kernel32()
    tag = _WinFileAttributeTagInfo()
    if not kernel32.GetFileInformationByHandleEx(
        HANDLE(handle),
        WIN32_ENUM(_WIN_FILE_ATTRIBUTE_TAG_INFO),
        ctypes.byref(tag),
        ctypes.sizeof(tag),
    ):
        raise BundlePathError("WINDOWS_ATTRIBUTE_TAG", f"GetFileInformationByHandleEx(FileAttributeTagInfo) failed: {_windows_last_error(kernel32)}")
    if tag.FileAttributes & _WIN_FILE_ATTRIBUTE_REPARSE_POINT:
        raise BundlePathError("BUNDLE_SYMLINK", "Windows reparse point is not allowed")
    is_directory = bool(tag.FileAttributes & _WIN_FILE_ATTRIBUTE_DIRECTORY)
    if require_directory is True and not is_directory:
        raise BundlePathError("BUNDLE_NONREGULAR", "directory handle is required")
    if require_directory is False and is_directory:
        raise BundlePathError("BUNDLE_NONREGULAR", "regular file handle is required")
    identity = _WinFileIdInfo()
    if not kernel32.GetFileInformationByHandleEx(
        HANDLE(handle),
        WIN32_ENUM(_WIN_FILE_ID_INFO),
        ctypes.byref(identity),
        ctypes.sizeof(identity),
    ):
        raise BundlePathError("WINDOWS_FILE_ID", f"GetFileInformationByHandleEx(FileIdInfo) failed: {_windows_last_error(kernel32)}")
    result = (int(identity.VolumeSerialNumber), bytes(identity.FileId))
    _WINDOWS_IDENTITIES[handle] = result
    return result


def _windows_split_absolute(path: Path) -> tuple[str, tuple[str, ...]]:
    raw = os.path.abspath(os.fspath(path)).replace("/", "\\")
    drive, tail = ntpath.splitdrive(raw)
    if raw.startswith("\\\\") or not drive or not tail.startswith("\\"):
        raise BundlePathError("WINDOWS_PATH_ROOT", f"only local absolute drive paths are supported: {path}")
    parts = tuple(part for part in tail.split("\\") if part)
    if any(part in {".", ".."} or "\x00" in part for part in parts):
        raise BundlePathError("BUNDLE_PATH", f"unsafe Windows path component: {path}")
    return drive.upper(), parts


def _windows_open_anchor(drive: str) -> int:
    kernel32 = _windows_kernel32()
    anchor = f"\\\\?\\{drive}\\"
    handle = kernel32.CreateFileW(
        PWSTR(anchor),
        DWORD(_WIN_GENERIC_READ),
        DWORD(_WIN_FILE_SHARE_READ | _WIN_FILE_SHARE_WRITE),
        None,
        DWORD(_WIN_OPEN_EXISTING),
        DWORD(_WIN_FILE_FLAG_BACKUP_SEMANTICS | _WIN_FILE_OPEN_REPARSE_POINT),
        None,
    )
    invalid = HANDLE(-1).value
    if handle in {None, invalid}:
        raise BundlePathError("WINDOWS_ROOT_OPEN", f"CreateFileW failed for drive root: {_windows_last_error(kernel32)}")
    result = int(handle)
    try:
        _windows_validate_handle(result, True)
        return result
    except Exception:
        _windows_close(result)
        raise


def _windows_nt_create_relative(
    parent_handle: int,
    name: str,
    desired_access: int,
    disposition: int,
    options: int,
) -> int:
    if not name or name in {".", ".."} or "\\" in name or "/" in name or "\x00" in name:
        raise BundlePathError("BUNDLE_PATH", f"unsafe Windows component: {name!r}")
    ntdll = _windows_ntdll()
    buffer = ctypes.create_unicode_buffer(name)
    unicode_name = _WinUnicodeString(len(name) * 2, (len(name) + 1) * 2, ctypes.cast(buffer, PWSTR))
    attributes = _WinObjectAttributes(
        ctypes.sizeof(_WinObjectAttributes),
        HANDLE(parent_handle),
        ctypes.pointer(unicode_name),
        _WIN_OBJ_CASE_INSENSITIVE,
        None,
        None,
    )
    status = _WinIoStatusBlock()
    handle = HANDLE()
    result = ntdll.NtCreateFile(
        ctypes.byref(handle),
        ULONG(desired_access),
        ctypes.byref(attributes),
        ctypes.byref(status),
        None,
        ULONG(0),
        ULONG(_WIN_FILE_SHARE_READ | _WIN_FILE_SHARE_WRITE),
        ULONG(disposition),
        ULONG(options),
        None,
        ULONG(0),
    )
    if result != 0:
        raise _WindowsNtStatusError(int(result), "NtCreateFile")
    if not handle.value:
        raise BundlePathError("WINDOWS_NT_OPEN", "NtCreateFile returned a null handle")
    return int(handle.value)


def _windows_open_relative_directory(parent_handle: int, name: str, create: bool = False, writable: bool = False) -> int:
    access = _WIN_FILE_LIST_DIRECTORY | _WIN_FILE_READ_ATTRIBUTES | _WIN_SYNCHRONIZE
    if create:
        access |= _WIN_FILE_ADD_SUBDIRECTORY
    if writable:
        access |= _WIN_FILE_ADD_FILE | _WIN_FILE_ADD_SUBDIRECTORY
    handle = _windows_nt_create_relative(
        parent_handle,
        name,
        access,
        _WIN_FILE_OPEN_IF if create else _WIN_FILE_OPEN,
        _WIN_FILE_DIRECTORY_FILE | _WIN_FILE_OPEN_REPARSE_POINT | _WIN_FILE_SYNCHRONOUS_IO_NONALERT,
    )
    try:
        _windows_validate_handle(handle, True)
        return handle
    except Exception:
        _windows_close(handle)
        raise


def _windows_open_relative_regular(parent_handle: int, name: str, write: bool = False, create: bool = False) -> int:
    access = _WIN_FILE_READ_ATTRIBUTES | _WIN_SYNCHRONIZE | (_WIN_FILE_WRITE_DATA | _WIN_DELETE if write else _WIN_FILE_READ_DATA)
    handle = _windows_nt_create_relative(
        parent_handle,
        name,
        access,
        _WIN_FILE_CREATE if create else _WIN_FILE_OPEN,
        _WIN_FILE_NON_DIRECTORY_FILE | _WIN_FILE_OPEN_REPARSE_POINT | _WIN_FILE_SYNCHRONOUS_IO_NONALERT,
    )
    try:
        _windows_validate_handle(handle, False)
        return handle
    except Exception:
        _windows_close(handle)
        raise


def _windows_open_directory_path(path: Path, create: bool = False, writable: bool = False) -> int:
    drive, parts = _windows_split_absolute(path)
    current_handle = _windows_open_anchor(drive)
    try:
        for index, part in enumerate(parts):
            next_handle = _windows_open_relative_directory(
                current_handle,
                part,
                create=create,
                writable=writable and index == len(parts) - 1,
            )
            _windows_close(current_handle)
            current_handle = next_handle
        return current_handle
    except Exception:
        _windows_close(current_handle)
        raise


def _windows_open_regular_path_fd(path: Path) -> int:
    lexical = Path(os.path.abspath(os.fspath(path)))
    parent_handle = _windows_open_directory_path(lexical.parent)
    handle: int | None = None
    try:
        handle = _windows_open_relative_regular(parent_handle, lexical.name)
        fd = msvcrt.open_osfhandle(handle, os.O_RDONLY | getattr(os, "O_BINARY", 0))
        handle = None
        _set_non_inheritable(fd)
        return fd
    finally:
        if handle is not None:
            _windows_close(handle)
        _windows_close(parent_handle)


def _windows_open_bundle_file_fd(run_dir: Path, relative: str) -> int:
    parts = PurePosixPath(relative).parts
    current_handle = _windows_open_directory_path(run_dir)
    handle: int | None = None
    try:
        for part in parts[:-1]:
            next_handle = _windows_open_relative_directory(current_handle, part)
            _windows_close(current_handle)
            current_handle = next_handle
        handle = _windows_open_relative_regular(current_handle, parts[-1])
        fd = msvcrt.open_osfhandle(handle, os.O_RDONLY | getattr(os, "O_BINARY", 0))
        handle = None
        _set_non_inheritable(fd)
        return fd
    finally:
        if handle is not None:
            _windows_close(handle)
        _windows_close(current_handle)


def _open_regular_path_fd(path: Path) -> int:
    return _windows_open_regular_path_fd(path) if os.name == "nt" else _open_posix_regular_path_fd(path)


def _open_bundle_root_fd(run_dir: Path) -> int:
    if os.name == "nt":
        raise BundlePathError("PLATFORM_FD", "Windows bundles use HANDLE traversal, not POSIX directory descriptors")
    return _open_posix_directory_path(run_dir)


def _open_bundle_file_fd(run_dir: Path, relative: str) -> int:
    if not safe_relative_path(relative):
        raise BundlePathError("BUNDLE_PATH", f"unsafe artifact path: {relative}")
    if os.name == "nt":
        return _windows_open_bundle_file_fd(run_dir, relative)
    parts = PurePosixPath(relative).parts
    current_fd = _open_bundle_root_fd(run_dir)
    try:
        for part in parts[:-1]:
            next_fd = _open_child_dir_fd(current_fd, part)
            os.close(current_fd)
            current_fd = next_fd
        try:
            fd = os.open(parts[-1], _posix_file_flags(), dir_fd=current_fd)
        except OSError as exc:
            raise _classify_posix_child_after_open_error(current_fd, parts[-1], parts[-1], exc, require_directory=False) from exc
        try:
            _set_non_inheritable(fd)
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise BundlePathError("BUNDLE_NONREGULAR", f"bundle artifact is non-regular: {relative}")
            return fd
        except Exception:
            os.close(fd)
            raise
    finally:
        os.close(current_fd)


def read_bundle_file(run_dir: Path, relative: str, max_bytes: int) -> bytes:
    if max_bytes <= 0:
        raise ValueError("read limit must be positive")
    fd = _open_bundle_file_fd(run_dir, relative)
    try:
        metadata = os.fstat(fd)
        if metadata.st_size > max_bytes:
            raise ValueError(f"file exceeds {max_bytes} byte read limit: {relative}")
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = os.read(fd, min(1024 * 1024, max_bytes + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > max_bytes:
                raise ValueError(f"file exceeds {max_bytes} byte read limit: {relative}")
        return b"".join(chunks)
    finally:
        os.close(fd)


def load_bundle_json(run_dir: Path, relative: str, max_bytes: int = MAX_JSON_BYTES) -> Any:
    return json.loads(read_bundle_file(run_dir, relative, max_bytes).decode("utf-8"))


def sha256_bundle_file(run_dir: Path, relative: str, max_bytes: int = MAX_HASH_FILE_BYTES, budget: HashBudget | None = None) -> str:
    fd = _open_bundle_file_fd(run_dir, relative)
    owned_budget = budget or HashBudget(per_file_bytes=max_bytes, aggregate_bytes=max(max_bytes, MAX_HASH_AGGREGATE_BYTES))
    try:
        return owned_budget.digest_fd(fd, relative, (os.path.abspath(os.fspath(run_dir)), relative), max_bytes)
    finally:
        os.close(fd)


def _write_all_fd(fd: int, payload: bytes) -> None:
    offset = 0
    while offset < len(payload):
        written = os.write(fd, payload[offset:])
        if written <= 0:
            raise OSError("short write to evidence artifact")
        offset += written


def _open_bundle_parent_fd_for_write(run_dir: Path, relative: str) -> tuple[int, str]:
    if not safe_relative_path(relative):
        raise BundlePathError("BUNDLE_PATH", f"unsafe run-bundle path: {relative}")
    parts = PurePosixPath(relative).parts
    current_fd = _open_bundle_root_fd(run_dir)
    try:
        for part in parts[:-1]:
            try:
                next_fd = _open_child_dir_fd(current_fd, part)
            except FileNotFoundError:
                os.mkdir(part, 0o700, dir_fd=current_fd)
                next_fd = _open_child_dir_fd(current_fd, part)
            os.close(current_fd)
            current_fd = next_fd
        return current_fd, parts[-1]
    except Exception:
        os.close(current_fd)
        raise


def _verify_destination_regular_or_absent(parent_fd: int, leaf: str) -> None:
    try:
        fd = os.open(leaf, _posix_file_flags(), dir_fd=parent_fd)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise _classify_posix_child_after_open_error(parent_fd, leaf, leaf, exc, require_directory=False) from exc
    try:
        _set_non_inheritable(fd)
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise BundlePathError("BUNDLE_NONREGULAR", f"runner-owned destination is non-regular: {leaf}")
    finally:
        os.close(fd)


def _relative_for_write(path: Path, run_dir: Path) -> str:
    try:
        relative = path.relative_to(run_dir).as_posix()
    except ValueError as exc:
        raise BundlePathError("BUNDLE_PATH", f"path escapes run bundle: {path}") from exc
    if not safe_relative_path(relative):
        raise BundlePathError("BUNDLE_PATH", f"unsafe run-bundle path: {relative}")
    return relative


def _windows_write_all(handle: int, payload: bytes) -> None:
    kernel32 = _windows_kernel32()
    buffer = ctypes.create_string_buffer(payload)
    offset = 0
    while offset < len(payload):
        written = DWORD()
        if not kernel32.WriteFile(
            HANDLE(handle),
            ctypes.byref(buffer, offset),
            DWORD(len(payload) - offset),
            ctypes.byref(written),
            None,
        ):
            raise BundlePathError("WINDOWS_WRITE", f"WriteFile failed: {_windows_last_error(kernel32)}")
        if written.value == 0:
            raise BundlePathError("WINDOWS_WRITE", "WriteFile reported a zero-byte write")
        offset += int(written.value)


def _windows_flush(handle: int) -> None:
    kernel32 = _windows_kernel32()
    if not kernel32.FlushFileBuffers(HANDLE(handle)):
        raise BundlePathError("WINDOWS_FLUSH", f"FlushFileBuffers failed: {_windows_last_error(kernel32)}")


def _windows_open_existing_regular(parent_handle: int, leaf: str) -> int | None:
    try:
        return _windows_open_relative_regular(parent_handle, leaf)
    except _WindowsNtStatusError as exc:
        if exc.status in {_WIN_STATUS_OBJECT_NAME_NOT_FOUND, _WIN_STATUS_OBJECT_PATH_NOT_FOUND}:
            return None
        raise


def _windows_rename_relative(source_handle: int, parent_handle: int, leaf: str) -> None:
    kernel32 = _windows_kernel32()
    encoded = leaf.encode("utf-16-le")
    payload_size = _WIN_FILE_RENAME_INFO_FILENAME_OFFSET + len(encoded)
    payload = (ctypes.c_byte * payload_size)()
    header = ctypes.cast(payload, ctypes.POINTER(_WinFileRenameInfo)).contents
    header.Flags = _WIN_FILE_RENAME_FLAG_REPLACE_IF_EXISTS
    header.RootDirectory = HANDLE(parent_handle)
    header.FileNameLength = len(encoded)
    ctypes.memmove(ctypes.addressof(payload) + _WIN_FILE_RENAME_INFO_FILENAME_OFFSET, encoded, len(encoded))
    if kernel32.SetFileInformationByHandle(
        HANDLE(source_handle),
        WIN32_ENUM(_WIN_FILE_RENAME_INFO_EX),
        ctypes.byref(payload),
        DWORD(payload_size),
    ):
        return
    if kernel32.SetFileInformationByHandle(
        HANDLE(source_handle),
        WIN32_ENUM(_WIN_FILE_RENAME_INFO),
        ctypes.byref(payload),
        DWORD(payload_size),
    ):
        return
    raise BundlePathError("WINDOWS_RENAME", f"relative replace failed: {_windows_last_error(kernel32)}")


def _windows_atomic_write(parent_handle: int, leaf: str, payload: bytes) -> None:
    existing = _windows_open_existing_regular(parent_handle, leaf)
    if existing is not None:
        _windows_close(existing)
    temporary = f".{leaf}.tmp-{time_token()}"
    temporary_handle: int | None = None
    try:
        temporary_handle = _windows_open_relative_regular(parent_handle, temporary, write=True, create=True)
        temporary_identity = _WINDOWS_IDENTITIES.get(temporary_handle)
        if temporary_identity is None:
            raise BundlePathError("WINDOWS_FILE_ID", "temporary file identity was not recorded")
        _windows_write_all(temporary_handle, payload)
        _windows_flush(temporary_handle)
        _windows_rename_relative(temporary_handle, parent_handle, leaf)
        published = _windows_open_relative_regular(parent_handle, leaf)
        try:
            if _WINDOWS_IDENTITIES.get(published) != temporary_identity:
                raise BundlePathError("WINDOWS_REPLACE_RACE", "published file identity differs from the flushed temporary file")
        finally:
            _windows_close(published)
        _windows_close(temporary_handle)
        temporary_handle = None
        try:
            _windows_flush(parent_handle)
        except BundlePathError:
            # Windows does not guarantee FlushFileBuffers support for directory handles.
            pass
    finally:
        if temporary_handle is not None:
            _windows_close(temporary_handle)


def atomic_write_bytes(path: Path, payload: bytes, run_dir: Path | None = None) -> None:
    if os.name == "nt":
        if run_dir is None:
            parent_handle = _windows_open_directory_path(path.parent, writable=True)
            try:
                _windows_atomic_write(parent_handle, path.name, payload)
            finally:
                _windows_close(parent_handle)
            return
        relative = _relative_for_write(path, run_dir)
        parent_handle, leaf = _windows_open_bundle_parent_handle_for_write(run_dir, relative)
        try:
            _windows_atomic_write(parent_handle, leaf, payload)
        finally:
            _windows_close(parent_handle)
        return
    if run_dir is None:
        lexical = Path(os.path.abspath(os.fspath(path)))
        parent_fd = _open_posix_directory_path(lexical.parent, create=True)
        temporary = f".{lexical.name}.tmp-{os.getpid()}-{time_token()}"
        temporary_created = False
        try:
            fd = os.open(temporary, _posix_file_flags(write=True, create=True, exclusive=True), 0o600, dir_fd=parent_fd)
            temporary_created = True
            try:
                _set_non_inheritable(fd)
                _write_all_fd(fd, payload)
                os.fsync(fd)
            finally:
                os.close(fd)
            _verify_destination_regular_or_absent(parent_fd, lexical.name)
            os.replace(temporary, lexical.name, src_dir_fd=parent_fd, dst_dir_fd=parent_fd)
            temporary_created = False
            try:
                os.fsync(parent_fd)
            except OSError:
                pass
        finally:
            if temporary_created:
                try:
                    os.unlink(temporary, dir_fd=parent_fd)
                except FileNotFoundError:
                    pass
            os.close(parent_fd)
        return
    relative = _relative_for_write(path, run_dir)
    parent_fd, leaf = _open_bundle_parent_fd_for_write(run_dir, relative)
    temporary = f".{leaf}.tmp-{os.getpid()}-{time_token()}"
    temp_created = False
    try:
        temp_fd = os.open(temporary, _posix_file_flags(write=True, create=True, exclusive=True), 0o600, dir_fd=parent_fd)
        temp_created = True
        try:
            _set_non_inheritable(temp_fd)
            _write_all_fd(temp_fd, payload)
            os.fsync(temp_fd)
            if not stat.S_ISREG(os.fstat(temp_fd).st_mode):
                raise BundlePathError("BUNDLE_NONREGULAR", f"temporary destination is non-regular: {temporary}")
        finally:
            os.close(temp_fd)
        _verify_destination_regular_or_absent(parent_fd, leaf)
        os.replace(temporary, leaf, src_dir_fd=parent_fd, dst_dir_fd=parent_fd)
        temp_created = False
        _verify_destination_regular_or_absent(parent_fd, leaf)
        try:
            os.fsync(parent_fd)
        except OSError:
            pass
    finally:
        if temp_created:
            try:
                os.unlink(temporary, dir_fd=parent_fd)
            except FileNotFoundError:
                pass
        os.close(parent_fd)


def time_token() -> str:
    return f"{os.getpid():x}{time.monotonic_ns():x}"


def _validate_bundle_relative_path(run_dir: Path, relative: str) -> Path:
    fd = _open_bundle_file_fd(run_dir, relative)
    try:
        return run_dir.joinpath(*PurePosixPath(relative).parts)
    finally:
        os.close(fd)


def _iter_bundle_relative_files_from_fd(directory_fd: int, prefix: tuple[str, ...], counter: list[int]) -> Iterator[str]:
    if len(prefix) > MAX_BUNDLE_DEPTH:
        raise BundlePathError("BUNDLE_DEPTH_LIMIT", "run bundle directory depth exceeds limit")
    with os.scandir(directory_fd) as entries:
        for entry in entries:
            name = entry.name
            counter[0] += 1
            if counter[0] > MAX_BUNDLE_ENTRIES:
                raise BundlePathError("BUNDLE_ENTRY_LIMIT", "run bundle entry count exceeds limit")
            if "/" in name or "\x00" in name or name in {"", ".", ".."}:
                raise BundlePathError("BUNDLE_PATH", "run bundle contains an unsafe entry name")
            metadata = entry.stat(follow_symlinks=False)
            relative_parts = (*prefix, name)
            relative = "/".join(relative_parts)
            if stat.S_ISLNK(metadata.st_mode):
                raise BundlePathError("BUNDLE_SYMLINK", f"run bundle contains a symlink: {relative}")
            if stat.S_ISDIR(metadata.st_mode):
                child_fd = _open_child_dir_fd(directory_fd, name)
                try:
                    yield from _iter_bundle_relative_files_from_fd(child_fd, relative_parts, counter)
                finally:
                    os.close(child_fd)
            elif stat.S_ISREG(metadata.st_mode):
                yield relative
            else:
                raise BundlePathError("BUNDLE_NONREGULAR", f"run bundle contains a non-regular path: {relative}")


def _windows_query_directory(directory_handle: int) -> Iterator[tuple[str, int]]:
    ntdll = _windows_ntdll()
    buffer = (ctypes.c_byte * (64 * 1024))()
    status = _WinIoStatusBlock()
    restart_scan = True
    while True:
        result = ntdll.NtQueryDirectoryFile(
            HANDLE(directory_handle),
            None,
            None,
            None,
            ctypes.byref(status),
            ctypes.byref(buffer),
            ULONG(ctypes.sizeof(buffer)),
            WIN32_ENUM(1),
            BOOLEAN(0),
            None,
            BOOLEAN(1 if restart_scan else 0),
        )
        normalized = int(result) & 0xFFFFFFFF
        if normalized == _WIN_STATUS_NO_MORE_FILES:
            return
        if result != 0:
            raise BundlePathError("WINDOWS_ENUMERATION", f"NtQueryDirectoryFile failed with NTSTATUS 0x{normalized:08x}")
        restart_scan = False
        offset = 0
        while True:
            header = _WinFileDirectoryInformation.from_buffer_copy(buffer, offset)
            name_start = offset + ctypes.sizeof(_WinFileDirectoryInformation)
            name_end = name_start + int(header.FileNameLength)
            name = bytes(buffer[name_start:name_end]).decode("utf-16-le")
            if name not in {".", ".."}:
                yield name, int(header.FileAttributes)
            if header.NextEntryOffset == 0:
                break
            offset += int(header.NextEntryOffset)


def _windows_iter_bundle_relative_files(
    directory_handle: int,
    prefix: tuple[str, ...],
    counter: list[int],
) -> Iterator[str]:
    if len(prefix) > MAX_BUNDLE_DEPTH:
        raise BundlePathError("BUNDLE_DEPTH_LIMIT", "run bundle directory depth exceeds limit")
    for name, attributes in _windows_query_directory(directory_handle):
        counter[0] += 1
        if counter[0] > MAX_BUNDLE_ENTRIES:
            raise BundlePathError("BUNDLE_ENTRY_LIMIT", "run bundle entry count exceeds limit")
        if "\\" in name or "/" in name or "\x00" in name or name in {"", ".", ".."}:
            raise BundlePathError("BUNDLE_PATH", "run bundle contains an unsafe Windows entry name")
        relative_parts = (*prefix, name)
        relative = "/".join(relative_parts)
        if attributes & _WIN_FILE_ATTRIBUTE_REPARSE_POINT:
            raise BundlePathError("BUNDLE_SYMLINK", f"run bundle contains a reparse point: {relative}")
        if attributes & _WIN_FILE_ATTRIBUTE_DIRECTORY:
            child_handle = _windows_open_relative_directory(directory_handle, name)
            try:
                yield from _windows_iter_bundle_relative_files(child_handle, relative_parts, counter)
            finally:
                _windows_close(child_handle)
        else:
            file_handle = _windows_open_relative_regular(directory_handle, name)
            _windows_close(file_handle)
            yield relative


def iter_bundle_relative_files(run_dir: Path) -> Iterator[str]:
    if os.name == "nt":
        root_handle = _windows_open_directory_path(run_dir)
        try:
            yield from _windows_iter_bundle_relative_files(root_handle, (), [0])
        finally:
            _windows_close(root_handle)
        return
    root_fd = _open_bundle_root_fd(run_dir)
    try:
        yield from _iter_bundle_relative_files_from_fd(root_fd, (), [0])
    finally:
        os.close(root_fd)


def iter_bundle_files(run_dir: Path) -> Iterator[Path]:
    root = _validated_bundle_root(run_dir)
    for relative in iter_bundle_relative_files(run_dir):
        yield root / relative


def bundle_file(run_dir: Path, relative: str) -> Path:
    if not safe_relative_path(relative):
        raise BundlePathError("BUNDLE_PATH", f"unsafe artifact path: {relative}")
    return _validate_bundle_relative_path(run_dir, relative)


def _validated_bundle_root(run_dir: Path) -> Path:
    if os.name == "nt":
        handle = _windows_open_directory_path(run_dir)
        _windows_close(handle)
        return run_dir
    fd = _open_posix_directory_path(run_dir)
    os.close(fd)
    return run_dir


def _windows_open_bundle_parent_handle_for_write(run_dir: Path, relative: str) -> tuple[int, str]:
    parts = PurePosixPath(relative).parts
    current_handle = _windows_open_directory_path(run_dir, writable=True)
    try:
        for index, part in enumerate(parts[:-1]):
            next_handle = _windows_open_relative_directory(
                current_handle,
                part,
                create=True,
                writable=index == len(parts) - 2,
            )
            _windows_close(current_handle)
            current_handle = next_handle
        return current_handle, parts[-1]
    except Exception:
        _windows_close(current_handle)
        raise


def create_secure_bundle(evidence_root: Path, run_id: str) -> Path:
    if not RUN_RE.fullmatch(run_id):
        raise BundlePathError("RUN_ID", "run bundle ID is invalid")
    if os.name == "nt":
        root_handle = _windows_open_directory_path(evidence_root, create=True)
        created_handle: int | None = None
        try:
            created_handle = _windows_nt_create_relative(
                root_handle,
                run_id,
                _WIN_FILE_LIST_DIRECTORY | _WIN_FILE_READ_ATTRIBUTES | _WIN_SYNCHRONIZE,
                _WIN_FILE_CREATE,
                _WIN_FILE_DIRECTORY_FILE | _WIN_FILE_OPEN_REPARSE_POINT | _WIN_FILE_SYNCHRONOUS_IO_NONALERT,
            )
            _windows_validate_handle(created_handle, True)
        finally:
            if created_handle is not None:
                _windows_close(created_handle)
            _windows_close(root_handle)
    else:
        root_fd = _open_posix_directory_path(evidence_root, create=True)
        try:
            os.mkdir(run_id, 0o700, dir_fd=root_fd)
            child_fd = _open_child_dir_fd(root_fd, run_id)
            os.close(child_fd)
        finally:
            os.close(root_fd)
    return evidence_root / run_id


def write_json(path: Path, value: Any, run_dir: Path | None = None) -> None:
    atomic_write_bytes(path, canonical_json_bytes(value) + b"\n", run_dir)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def issue(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def safe_relative_path(value: str) -> bool:
    if not value or "\x00" in value or "\\" in value:
        return False
    posix_path = PurePosixPath(value)
    windows_path = PureWindowsPath(value)
    return (
        value != "."
        and not posix_path.is_absolute()
        and not windows_path.is_absolute()
        and windows_path.drive == ""
        and ".." not in posix_path.parts
        and all(part not in {"", "."} for part in posix_path.parts)
    )




def artifact_media_type(path: Path) -> str:
    if path.suffix == ".json":
        return "application/json"
    if path.suffix == ".txt":
        return "text/plain"
    if path.suffix == ".log":
        return "text/plain"
    if path.suffix == ".png":
        return "image/png"
    return "application/octet-stream"


def unique_ids(items: Iterable[dict[str, Any]], key: str, errors: list[dict[str, str]], code: str) -> set[str]:
    seen: set[str] = set()
    for item in items:
        value = item.get(key)
        if not isinstance(value, str) or not value:
            errors.append(issue(code, f"missing {key}"))
        elif value in seen:
            errors.append(issue(code, f"duplicate {key}: {value}"))
        else:
            seen.add(value)
    return seen


def edge_tuple(edge: dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        str(edge.get("product_requirement_id")),
        str(edge.get("test_requirement_id")),
        str(edge.get("test_id")),
        str(edge.get("scenario_id")),
    )


def slug(value: Any) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", str(value)).strip("-")



def future_boundary_sets(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    return [item for item in catalog.get("future_non_required_cellsets", []) if isinstance(item, dict)]


def future_boundary_tests(catalog: dict[str, Any]) -> set[str]:
    return {test_id for item in future_boundary_sets(catalog) for test_id in item.get("test_ids", []) if isinstance(test_id, str)}


def boundary_cells(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    saved = catalog.get("matrix_sets", [])
    try:
        catalog["matrix_sets"] = future_boundary_sets(catalog)
        return expected_cells(catalog)
    finally:
        catalog["matrix_sets"] = saved

def expected_cells(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    tests = {item["id"]: item for item in catalog["tests"]}
    profiles = {item["id"]: item for item in catalog["platform_profiles"]}
    requirements_by_test: dict[str, list[dict[str, Any]]] = {}
    for requirement in catalog["test_requirements"]:
        requirements_by_test.setdefault(requirement["test_id"], []).append(requirement)

    result: list[dict[str, Any]] = []
    for matrix_set in catalog["matrix_sets"]:
        dimensions = matrix_set["dimensions"]
        values = [dimensions[name] for name in CELL_DIMENSIONS]
        for test_id in matrix_set["test_ids"]:
            scenario_id = tests[test_id]["scenario_id"]
            requirements = requirements_by_test.get(test_id, [])
            product_ids = sorted({product for requirement in requirements for product in requirement["product_requirement_ids"]})
            requirement_ids = sorted(requirement["id"] for requirement in requirements)
            for combo in itertools.product(*values):
                values_by_name = dict(zip(CELL_DIMENSIONS, combo, strict=True))
                profile = profiles[values_by_name["platform_profile_id"]]
                identity = "|".join([matrix_set["id"], test_id, scenario_id] + [str(values_by_name[name]) for name in CELL_DIMENSIONS])
                result.append(
                    {
                        "catalog_version": catalog["catalog_version"],
                        "cell_id": "CELL-G0-" + sha256_bytes(identity.encode("utf-8"))[:16],
                        "matrix_set_id": matrix_set["id"],
                        "product_requirement_ids": product_ids,
                        "test_requirement_ids": requirement_ids,
                        "test_id": test_id,
                        "scenario_id": scenario_id,
                        "layer": values_by_name["layer"],
                        "platform_profile_id": values_by_name["platform_profile_id"],
                        "renderer": values_by_name["renderer"],
                        "system_scale": values_by_name["system_scale"],
                        "ui_scale": values_by_name["ui_scale"],
                        "theme": values_by_name["theme"],
                        "locale": values_by_name["locale"],
                        "release_level": profile["release_level"],
                        "assistive_tech": values_by_name["assistive_tech"],
                        "gate_class": profile["gate_class"],
                        "metric_ids": list(matrix_set.get("metric_ids", [])),
                    }
                )
    return result


def validate_catalog(catalog: dict[str, Any], crosswalk: dict[str, Any]) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if catalog.get("schema_version") != "tessera.iced.coverage/v1" or catalog.get("catalog_version") != "coverage-g0-v1":
        errors.append(issue("CATALOG_VERSION", "unsupported catalog identity"))
        return errors
    digests = authority_digests(catalog, crosswalk)
    if digests["catalog_sha256"] != FROZEN_CATALOG_CANONICAL_SHA256:
        errors.append(issue("AUTHORITY_CATALOG_DIGEST", "catalog content does not match the frozen authority"))
    if digests["crosswalk_sha256"] != FROZEN_CROSSWALK_CANONICAL_SHA256:
        errors.append(issue("AUTHORITY_CROSSWALK_DIGEST", "crosswalk content does not match the frozen authority"))
    if catalog.get("authority", {}).get("expanded_cell_count") != FROZEN_CATALOG_CELL_COUNT:
        errors.append(issue("CATALOG_CELL_COUNT", "catalog authority must declare the frozen 216-cell matrix"))
    products = unique_ids(catalog.get("product_requirements", []), "id", errors, "CATALOG_PRODUCT")
    requirements = unique_ids(catalog.get("test_requirements", []), "id", errors, "CATALOG_REQUIREMENT")
    tests = unique_ids(catalog.get("tests", []), "id", errors, "CATALOG_TEST")
    scenarios = unique_ids(catalog.get("tests", []), "scenario_id", errors, "CATALOG_SCENARIO")
    profiles = unique_ids(catalog.get("platform_profiles", []), "id", errors, "CATALOG_PROFILE")
    metric_ids = unique_ids(catalog.get("metric_definitions", []), "id", errors, "CATALOG_METRIC")
    metric_by_id = {item["id"]: item for item in catalog.get("metric_definitions", []) if item.get("id") in metric_ids}
    active_matrix_ids = {item.get("id") for item in catalog.get("matrix_sets", [])}

    for product in products:
        if product.startswith("PR-G0"):
            errors.append(issue("FAKE_PRODUCT_ID", f"forbidden product identifier {product}"))
    test_by_id = {item["id"]: item for item in catalog.get("tests", []) if item.get("id") in tests}
    for requirement in catalog.get("test_requirements", []):
        if requirement.get("test_id") not in tests:
            errors.append(issue("CATALOG_ORPHAN", f"requirement {requirement.get('id')} references unknown test"))
        for product in requirement.get("product_requirement_ids", []):
            if product not in products:
                errors.append(issue("CATALOG_ORPHAN", f"requirement {requirement.get('id')} references unknown product {product}"))
            if str(product).startswith("PR-G0"):
                errors.append(issue("FAKE_PRODUCT_ID", f"forbidden product identifier {product}"))
    for matrix_set in catalog.get("matrix_sets", []):
        if not matrix_set.get("id") or not matrix_set.get("test_ids"):
            errors.append(issue("CATALOG_MATRIX", "matrix set requires id and test_ids"))
            continue
        for test_id in matrix_set["test_ids"]:
            if test_id not in tests:
                errors.append(issue("CATALOG_ORPHAN", f"matrix references unknown test {test_id}"))
        dimensions = matrix_set.get("dimensions", {})
        for name in CELL_DIMENSIONS:
            if not isinstance(dimensions.get(name), list) or not dimensions[name]:
                errors.append(issue("CATALOG_MATRIX", f"{matrix_set.get('id')} has no values for {name}"))
        for profile in dimensions.get("platform_profile_id", []):
            if profile not in profiles:
                errors.append(issue("CATALOG_ORPHAN", f"matrix references unknown profile {profile}"))
        for metric_id in matrix_set.get("metric_ids", []):
            if metric_id not in metric_ids:
                errors.append(issue("CATALOG_ORPHAN", f"matrix references unknown metric {metric_id}"))
            elif "G0" not in metric_by_id.get(metric_id, {}).get("required_by_gate", []):
                errors.append(issue("CATALOG_FUTURE_METRIC_IN_G0", f"{matrix_set.get('id')} contains future-only metric {metric_id}"))
    for matrix_set in future_boundary_sets(catalog):
        boundary = matrix_set.get("future_gate_boundary", {})
        if matrix_set.get("id") in active_matrix_ids or boundary.get("status") != "future_non_required" or "G0" not in boundary.get("not_required_by_gate", []):
            errors.append(issue("CATALOG_FUTURE_BOUNDARY", "future boundary cellsets must be explicit non-required records outside the active G0 matrix"))
        for test_id in matrix_set.get("test_ids", []):
            if test_id not in tests:
                errors.append(issue("CATALOG_ORPHAN", f"future boundary references unknown test {test_id}"))
        dimensions = matrix_set.get("dimensions", {})
        for name in CELL_DIMENSIONS:
            if not isinstance(dimensions.get(name), list) or not dimensions[name]:
                errors.append(issue("CATALOG_FUTURE_BOUNDARY", f"{matrix_set.get('id')} has no values for {name}"))
        for metric_id in matrix_set.get("metric_ids", []):
            metric = metric_by_id.get(metric_id)
            if metric_id not in metric_ids:
                errors.append(issue("CATALOG_ORPHAN", f"future boundary references unknown metric {metric_id}"))
            elif "G0" in metric.get("required_by_gate", []):
                errors.append(issue("CATALOG_FUTURE_BOUNDARY", f"future boundary {matrix_set.get('id')} contains a G0 metric {metric_id}"))
    for metric in catalog.get("metric_definitions", []):
        if metric.get("evidence_scope") not in METRIC_SCOPES or not isinstance(metric.get("required_by_gate"), list) or not metric["required_by_gate"]:
            errors.append(issue("CATALOG_METRIC", f"metric {metric.get('id')} lacks scope or gate applicability"))
        if metric.get("evidence_scope") == "scene_local":
            continue
        if metric.get("aggregation_scope") not in {"platform", "artifact"}:
            errors.append(issue("CATALOG_METRIC", f"shared metric {metric.get('id')} lacks aggregation scope"))
        if metric.get("aggregation_scope") == "artifact" and not isinstance(metric.get("scope_key"), str):
            errors.append(issue("CATALOG_METRIC", f"artifact metric {metric.get('id')} lacks frozen scope key"))
    for test_id, test in test_by_id.items():
        if test["scenario_id"] not in scenarios:
            errors.append(issue("CATALOG_ORPHAN", f"unknown scenario for {test_id}"))

    forward = [edge_tuple(edge) for edge in crosswalk.get("forward_edges", [])]
    reverse = [edge_tuple(edge) for edge in crosswalk.get("reverse_edges", [])]
    if len(forward) != len(set(forward)) or len(reverse) != len(set(reverse)):
        errors.append(issue("XWALK_DUPLICATE", "crosswalk contains duplicate edge"))
    if set(forward) != set(reverse):
        errors.append(issue("XWALK_REVERSE", "forward and reverse crosswalk edges differ"))
    expected_edges: set[tuple[str, str, str, str]] = set()
    for requirement in catalog.get("test_requirements", []):
        test = test_by_id.get(requirement.get("test_id"))
        if not test:
            continue
        for product in requirement.get("product_requirement_ids", []):
            expected_edges.add((product, requirement["id"], requirement["test_id"], test["scenario_id"]))
    if set(forward) != expected_edges:
        errors.append(issue("XWALK_ORPHAN", "crosswalk is missing, inventing, or misrouting catalog edge"))
    chart_edges = [edge for edge in crosswalk.get("deferred_visual_edges", []) if edge.get("visual_workflow_id") == "VIS-CHART-01"]
    if len(chart_edges) != 1:
        errors.append(issue("XWALK_DEFERRED", "VIS-CHART-01 needs exactly one deferred crosswalk"))
    elif chart_edges[0].get("product_requirement_id") != "P1-W4-01" or chart_edges[0].get("required_by_gate") != ["G4", "G6"] or chart_edges[0].get("status") != "deferred_not_g0":
        errors.append(issue("XWALK_DEFERRED", "VIS-CHART-01 must map to P1-W4-01 at G4/G6 only"))

    try:
        cells = expected_cells(catalog)
        cell_ids = [cell["cell_id"] for cell in cells]
        if len(cell_ids) != len(set(cell_ids)):
            errors.append(issue("CATALOG_CELL_DUPLICATE", "expanded coverage cell IDs collide"))
        if len(cells) != FROZEN_CATALOG_CELL_COUNT:
            errors.append(issue("CATALOG_CELL_COUNT", "expanded coverage matrix is not the frozen 216 cells"))
        required_profiles = {"PLAT-MAC-M1-8G", "PLAT-WIN-I5-8250U-8G"}
        seen_required = {cell["platform_profile_id"] for cell in cells if cell["gate_class"] == "required"}
        if not required_profiles.issubset(seen_required):
            errors.append(issue("CATALOG_LOW_SPEC", "both frozen low-spec GA profiles must have required cells"))
        covered_tests = {cell["test_id"] for cell in cells}
        uncovered = tests - covered_tests
        if uncovered - future_boundary_tests(catalog):
            errors.append(issue("CATALOG_ORPHAN", "every non-future test must expand to at least one coverage cell"))
    except (KeyError, TypeError) as exc:
        errors.append(issue("CATALOG_MATRIX", f"cannot expand matrix: {exc}"))
    return errors


def validate_source(source: dict[str, Any], errors: list[dict[str, str]]) -> None:
    identity = source.get("identity_kind")
    revision = source.get("revision")
    if identity == "git_commit":
        if not isinstance(revision, str) or not re.fullmatch(r"[a-f0-9]{40}", revision):
            errors.append(issue("SOURCE_IDENTITY", "git source requires a full revision"))
    else:
        errors.append(issue("SOURCE_ARCHIVE_UNSUPPORTED", "only implemented clean Git identity is accepted"))
    for key in ("workspace_manifest_sha256", "cargo_lock_sha256", "canonical_native_tree_sha256"):
        value = source.get(key)
        if not isinstance(value, str) or not HASH_RE.fullmatch(value):
            errors.append(issue("SOURCE_HASH", f"invalid {key}"))
    preflight = source.get("preflight")
    if not isinstance(preflight, dict) or not preflight.get("evidence_root_outside_source_root"):
        errors.append(issue("EVIDENCE_IN_SOURCE", "source preflight must place evidence outside source root"))
        return
    if preflight.get("mode") != "git" or preflight.get("verdict") != "pass":
        errors.append(issue("SOURCE_PREFLIGHT", "source preflight must be a passing Git preflight"))
        return
    mode = preflight.get("mode")
    if mode == "git":
        git = preflight.get("git", {})
        if not git.get("top_level_equals_declared_root"):
            errors.append(issue("SOURCE_TOPLEVEL", "Git top-level differs from declared root"))
        if not git.get("index_clean") or not git.get("worktree_clean"):
            errors.append(issue("SOURCE_DIRTY_INDEX", "Git index/worktree is dirty"))
        if not git.get("untracked_empty"):
            errors.append(issue("SOURCE_UNTRACKED", "Git source has untracked files"))
        if not git.get("submodules_match_policy"):
            errors.append(issue("SOURCE_SUBMODULE", "Git submodule policy does not match"))
        if git.get("head_native_tree_sha256") != source.get("canonical_native_tree_sha256"):
            errors.append(issue("SOURCE_TREE_MISMATCH", "HEAD and actual native tree hashes differ"))
    else:
        errors.append(issue("SOURCE_PREFLIGHT", "unknown source preflight mode"))


def validate_applicability(record: dict[str, Any], errors: list[dict[str, str]]) -> None:
    applicability = record.get("applicability")
    if not isinstance(applicability, dict):
        errors.append(issue("APPLICABILITY", "applicability must be an object"))
        return
    extensions = {"visual": "visual", "performance": "performance", "fault": "fault", "soak": "soak"}
    for key in APPLICABILITY_KEYS:
        entry = applicability.get(key)
        if not isinstance(entry, dict) or entry.get("state") not in {"applicable", "not_applicable"}:
            errors.append(issue("APPLICABILITY", f"invalid applicability for {key}"))
            continue
        state, reason = entry["state"], entry.get("reason")
        if state == "applicable" and reason is not None:
            errors.append(issue("APPLICABILITY_REASON", f"{key} applicable reason must be null"))
        if state == "not_applicable" and (not isinstance(reason, str) or not reason.strip()):
            errors.append(issue("APPLICABILITY_REASON", f"{key} not_applicable needs reason"))
        if key in extensions:
            extension = record.get(extensions[key])
            if state == "applicable" and not isinstance(extension, dict):
                errors.append(issue("APPLICABILITY_EXTENSION", f"{key} requires extension"))
            if state == "not_applicable" and extension is not None:
                errors.append(issue("APPLICABILITY_EXTENSION", f"{key} extension must be null when not applicable"))


def validate_limitations(record: dict[str, Any], errors: list[dict[str, str]]) -> None:
    for limitation in record.get("accepted_limitations", []):
        required = ("limitation_id", "approver", "scope", "compensating_control", "expires_at", "platform_downgrade", "reason")
        if any(not limitation.get(key) for key in required):
            errors.append(issue("LIMITATION_FIELDS", "accepted limitation is incomplete"))
            continue
        if limitation.get("platform_downgrade") not in {"GA to Beta", "GA to Preview"}:
            errors.append(issue("LIMITATION_DOWNGRADE", "limitation must downgrade GA scope"))
        try:
            if parse_timestamp(limitation["expires_at"]) <= datetime.now(timezone.utc):
                errors.append(issue("LIMITATION_EXPIRED", "limitation expiry is in the past"))
        except (TypeError, ValueError):
            errors.append(issue("LIMITATION_EXPIRY", "limitation expiry is invalid"))
        if record.get("coverage_cell", {}).get("gate_class") == "required" and record.get("coverage_cell", {}).get("release_level") == "GA":
            errors.append(issue("LIMITATION_GA", "limitation cannot satisfy a required GA cell"))


def validate_visual(record: dict[str, Any], catalog: dict[str, Any], errors: list[dict[str, str]]) -> None:
    visual = record.get("visual")
    if not isinstance(visual, dict):
        return
    required = ("baseline_artifact_id", "candidate_artifact_id", "heatmap_artifact_id", "comparison_artifact_id", "comparator", "capture", "metrics", "mask", "structural_checks", "metadata")
    if any(key not in visual for key in required):
        errors.append(issue("VISUAL_REQUIRED", "visual evidence misses required field"))
        return
    cell = record["coverage_cell"]
    authority_kind = "software" if cell.get("renderer") == "tiny-skia" else "hardware"
    authority = catalog.get("authority", {}).get("visual", {}).get(authority_kind, {})
    if not authority:
        errors.append(issue("VISUAL_AUTHORITY", "catalog has no frozen visual authority for the renderer"))
        return
    artifacts = {item.get("artifact_id"): item for item in record.get("artifacts", []) if isinstance(item, dict)}

    def require_artifact(artifact_id: Any, field: str) -> None:
        artifact = artifacts.get(artifact_id)
        if not isinstance(artifact_id, str) or not artifact or not HASH_RE.fullmatch(str(artifact.get("sha256", ""))):
            errors.append(issue("VISUAL_ARTIFACT", f"{field} does not resolve to a hashed record artifact"))

    for field in ("baseline_artifact_id", "candidate_artifact_id", "heatmap_artifact_id", "comparison_artifact_id"):
        require_artifact(visual.get(field), field)
    capture = visual["capture"]
    if capture.get("system_scale") != cell.get("system_scale") or capture.get("ui_scale") != cell.get("ui_scale"):
        errors.append(issue("VISUAL_SCALE", "visual capture scale differs from catalog cell"))
    metrics = visual["metrics"]
    delta = metrics.get("delta_e_2000", {})
    dimensions = metrics.get("dimension_error_dip", {})
    contrast = metrics.get("contrast")
    if not isinstance(delta.get("sample_artifact_id"), str) or "value" not in delta:
        errors.append(issue("VISUAL_REQUIRED", "DeltaE samples are missing"))
    elif "threshold" in delta:
        errors.append(issue("VISUAL_SELF_THRESHOLD", "DeltaE threshold is catalog authority, not record input"))
    elif record["execution"]["status"] == "pass" and float(delta["value"]) > float(authority["delta_e_2000_max"]):
        errors.append(issue("VISUAL_DELTAE", "DeltaE exceeds threshold"))
    require_artifact(delta.get("sample_artifact_id"), "delta_e_2000.sample_artifact_id")
    if not isinstance(dimensions.get("expected_artifact_id"), str) or "max_abs" not in dimensions:
        errors.append(issue("VISUAL_REQUIRED", "DIP dimensions are missing"))
    elif "threshold" in dimensions:
        errors.append(issue("VISUAL_SELF_THRESHOLD", "DIP threshold is catalog authority, not record input"))
    elif record["execution"]["status"] == "pass" and float(dimensions["max_abs"]) > float(authority["dimension_error_dip_max"]):
        errors.append(issue("VISUAL_DIMENSION", "DIP error exceeds threshold"))
    require_artifact(dimensions.get("expected_artifact_id"), "dimension_error_dip.expected_artifact_id")
    if authority_kind == "software":
        changed = metrics.get("changed_pixel_ratio", {})
        if "value" not in changed:
            errors.append(issue("VISUAL_REQUIRED", "software visual evidence requires changed-pixel ratio"))
        elif "threshold" in changed:
            errors.append(issue("VISUAL_SELF_THRESHOLD", "changed-pixel threshold is catalog authority, not record input"))
        elif record["execution"]["status"] == "pass" and float(changed["value"]) > float(authority["changed_pixel_ratio_max"]):
            errors.append(issue("VISUAL_CHANGED_PIXEL", "changed-pixel ratio exceeds threshold"))
    else:
        ssim = metrics.get("ssim", {})
        diff_area = metrics.get("diff_area_ratio", {})
        if "value" not in ssim or "value" not in diff_area:
            errors.append(issue("VISUAL_REQUIRED", "hardware visual evidence requires SSIM and diff area"))
        else:
            if "threshold" in ssim or "threshold" in diff_area:
                errors.append(issue("VISUAL_SELF_THRESHOLD", "hardware thresholds are catalog authority, not record input"))
            if record["execution"]["status"] == "pass" and float(ssim["value"]) < float(authority["ssim_min"]):
                errors.append(issue("VISUAL_SSIM", "SSIM is below threshold"))
            if record["execution"]["status"] == "pass" and float(diff_area["value"]) > float(authority["diff_area_ratio_max"]):
                errors.append(issue("VISUAL_DIFF_AREA", "diff area exceeds threshold"))
    if not isinstance(contrast, list) or not contrast:
        errors.append(issue("VISUAL_REQUIRED", "contrast samples are missing"))
    else:
        for sample in contrast:
            if not all(key in sample for key in ("foreground_sample_id", "background_sample_id", "ratio", "calculation_version", "kind")):
                errors.append(issue("VISUAL_REQUIRED", "contrast sample is incomplete"))
                continue
            if "threshold" in sample:
                errors.append(issue("VISUAL_SELF_THRESHOLD", "contrast threshold is catalog authority, not record input"))
            require_artifact(sample.get("foreground_sample_id"), "contrast.foreground_sample_id")
            require_artifact(sample.get("background_sample_id"), "contrast.background_sample_id")
            minimum = authority["text_contrast_min"] if sample.get("kind") == "text" else authority["large_text_and_non_text_contrast_min"]
            if sample.get("kind") not in {"text", "large_text", "non_text"}:
                errors.append(issue("VISUAL_CONTRAST", "contrast kind is invalid"))
            elif record["execution"]["status"] == "pass" and float(sample["ratio"]) < float(minimum):
                errors.append(issue("VISUAL_CONTRAST", "contrast is below threshold"))
    mask = visual["mask"]
    if not isinstance(mask, dict) or not all(mask.get(key) is not None for key in ("artifact_id", "approved_mask_artifact_id", "config_sha256", "masked_area_ratio", "reviewer", "reviewed_at")):
        errors.append(issue("VISUAL_REQUIRED", "mask evidence is incomplete"))
    elif "allowed_area_ratio" in mask or mask.get("status") != "approved" or mask.get("config_sha256") != authority["mask_config_sha256"] or float(mask["masked_area_ratio"]) > float(authority["mask_area_ratio_max"]):
        errors.append(issue("VISUAL_MASK", "mask is unreviewed or exceeds approved area"))
    require_artifact(mask.get("artifact_id") if isinstance(mask, dict) else None, "mask.artifact_id")
    require_artifact(mask.get("approved_mask_artifact_id") if isinstance(mask, dict) else None, "mask.approved_mask_artifact_id")
    structural = visual["structural_checks"]
    if not isinstance(structural, dict) or any(structural.get(key) != "pass" for key in ("zero_clipping", "zero_overlap", "visible_focus", "no_text_occlusion")):
        errors.append(issue("VISUAL_STRUCTURAL", "structural visual check did not pass"))
    metadata = visual["metadata"]
    source_identity = record.get("source", {}).get("revision") or record.get("source", {}).get("archive_sha256")
    refs = metadata.get("evidence_refs") if isinstance(metadata, dict) else None
    if not isinstance(metadata, dict) or not isinstance(metadata.get("visual_workflow_id"), str) or not isinstance(refs, list) or not refs:
        errors.append(issue("VISUAL_METADATA", "visual metadata requires workflow ID and evidence references"))
    else:
        seen_refs: set[str] = set()
        for reference in refs:
            record_id = reference.get("record_id") if isinstance(reference, dict) else None
            if not isinstance(record_id, str) or not record_id.startswith("EV-") or record_id in seen_refs or reference.get("source_identity") != source_identity:
                errors.append(issue("VISUAL_METADATA", "visual evidence references must be unique and use the same source identity"))
            elif record_id:
                seen_refs.add(record_id)


def validate_evidence_metrics(record: dict[str, Any], catalog: dict[str, Any], expected_cell: dict[str, Any] | None, errors: list[dict[str, str]]) -> None:
    entries = record.get("evidence_metrics")
    if not isinstance(entries, list):
        errors.append(issue("METRIC_REQUIRED", "evidence_metrics must be an array"))
        return
    definitions = {item["id"]: item for item in catalog.get("metric_definitions", [])}
    expected_ids = set(expected_cell.get("metric_ids", [])) if expected_cell else set()
    actual_ids: set[str] = set()
    visual_cell = expected_cell is not None and expected_cell.get("layer") in {"L3", "L4"} and expected_cell.get("test_id") in {"T-G0-006", "T-G0-007", "T-G0-017"}
    identity = source_identity(record.get("source", {}))
    artifacts = {item.get("artifact_id"): item for item in record.get("artifacts", []) if isinstance(item, dict)}
    for entry in entries:
        if not isinstance(entry, dict):
            errors.append(issue("METRIC_REQUIRED", "metric result must be an object"))
            continue
        metric_id = entry.get("metric_id")
        definition = definitions.get(metric_id)
        if not definition or metric_id in actual_ids:
            errors.append(issue("METRIC_UNKNOWN", "metric is unknown or duplicated"))
            continue
        actual_ids.add(metric_id)
        if entry.get("evidence_scope") != definition["evidence_scope"] or entry.get("required_by_gate") != definition["required_by_gate"]:
            errors.append(issue("METRIC_CONTRACT", f"metric {metric_id} scope or gates differ from catalog"))
        if "satisfied_gates" in entry:
            errors.append(issue("METRIC_DERIVED_GATES", f"metric {metric_id} may not self-report satisfied gates"))
        if visual_cell and (definition["evidence_scope"] != "scene_local" or entry.get("evidence_scope") != "scene_local"):
            errors.append(issue("METRIC_SCOPE", "visual PR sidecar may not copy shared-lane metrics"))
        if definition["evidence_scope"] == "shared_rc" and record.get("run", {}).get("lane") != "rc":
            errors.append(issue("METRIC_LANE", f"shared_rc metric {metric_id} requires an RC lane"))
        if definition["evidence_scope"] == "shared_nightly" and record.get("run", {}).get("lane") not in {"nightly", "rc"}:
            errors.append(issue("METRIC_LANE", f"shared_nightly metric {metric_id} requires Nightly or RC lane"))
        if definition["evidence_scope"] != "scene_local":
            scope = entry.get("metric_scope")
            expected_kind = definition.get("aggregation_scope")
            if not isinstance(scope, dict) or scope.get("kind") != expected_kind:
                errors.append(issue("METRIC_SCOPE", f"shared metric {metric_id} has no frozen aggregation scope"))
            elif expected_kind == "platform" and scope.get("key") != record.get("coverage_cell", {}).get("platform_profile_id"):
                errors.append(issue("METRIC_SCOPE", f"platform metric {metric_id} must use the cell platform authority"))
            elif expected_kind == "artifact":
                artifact = artifacts.get(scope.get("artifact_id"))
                if scope.get("key") != definition.get("scope_key") or not artifact or not HASH_RE.fullmatch(str(artifact.get("sha256", ""))):
                    errors.append(issue("METRIC_SCOPE", f"artifact metric {metric_id} must resolve its frozen artifact scope"))
        applicability = entry.get("applicability")
        if not isinstance(applicability, dict) or applicability.get("state") not in {"applicable", "not_applicable"}:
            errors.append(issue("METRIC_APPLICABILITY", f"metric {metric_id} has no applicability state"))
            continue
        references = entry.get("evidence_refs", [])
        if applicability["state"] == "applicable":
            if applicability.get("reason") is not None or not isinstance(references, list) or not references:
                errors.append(issue("METRIC_APPLICABILITY", f"applicable metric {metric_id} needs evidence references and null reason"))
            for reference in references if isinstance(references, list) else []:
                if not isinstance(reference, dict) or not RECORD_ID_RE.fullmatch(str(reference.get("record_id", ""))) or reference.get("source_identity") != identity:
                    errors.append(issue("METRIC_REFERENCE", f"metric {metric_id} reference has different source identity"))
        else:
            if not isinstance(applicability.get("reason"), str) or not applicability["reason"].strip() or references:
                errors.append(issue("METRIC_APPLICABILITY", f"not_applicable metric {metric_id} needs reason and no evidence reference"))
            if metric_id in expected_ids:
                errors.append(issue("METRIC_REQUIRED_NA", f"required metric {metric_id} cannot be not_applicable"))
    if not expected_ids.issubset(actual_ids):
        errors.append(issue("METRIC_REQUIRED", "coverage cell is missing required metric result"))
    if visual_cell and any(definitions[metric_id]["evidence_scope"] != "scene_local" for metric_id in actual_ids if metric_id in definitions):
        errors.append(issue("METRIC_SCOPE", "visual scene-local evidence contains shared metric"))


def analyze_soak(raw: dict[str, Any], interval_seconds: int = 300) -> dict[str, Any]:
    if not isinstance(interval_seconds, int) or isinstance(interval_seconds, bool) or interval_seconds <= 0 or interval_seconds != SOAK_INTERVAL_SECONDS:
        raise SoakValidationError("SOAK_INTERVAL", "soak sampling interval must be exactly 300 positive seconds")
    windows: list[dict[str, Any]] = []
    sessions = raw.get("sessions", [])
    if not isinstance(sessions, list):
        raise SoakValidationError("SOAK_SESSIONS", "soak sessions must be an array")
    if not sessions or len(sessions) > MAX_SOAK_SESSIONS:
        raise SoakValidationError("SOAK_SESSION_LIMIT", f"soak session count must be between 1 and {MAX_SOAK_SESSIONS}")
    has_restart = len(sessions) > 1 or any(bool(session.get("restart_boundary")) for session in sessions)
    seen_session_ids: set[str] = set()
    seen_sample_ids: set[str] = set()
    total_samples = 0
    for session in sessions:
        if not isinstance(session, dict):
            raise SoakValidationError("SOAK_SESSIONS", "each soak session must be an object")
        session_id = session.get("session_id")
        if not isinstance(session_id, str) or not session_id:
            raise SoakValidationError("SOAK_SESSION_ID", "soak session IDs must be non-empty strings")
        if session_id in seen_session_ids:
            raise SoakValidationError("SOAK_DUPLICATE_SESSION_ID", f"duplicate soak session ID: {session_id}")
        seen_session_ids.add(session_id)
        samples = session.get("samples", [])
        if not isinstance(samples, list):
            raise SoakValidationError("SOAK_SAMPLES", "soak samples must be an array")
        total_samples += len(samples)
        if total_samples > MAX_SOAK_SAMPLES:
            raise SoakValidationError("SOAK_SAMPLE_LIMIT", f"raw soak series exceeds {MAX_SOAK_SAMPLES} samples")
        parsed: list[tuple[datetime, float, str]] = []
        for sample in samples:
            if not isinstance(sample, dict):
                raise SoakValidationError("SOAK_SAMPLE", "soak samples must be objects")
            try:
                timestamp = parse_timestamp(str(sample["timestamp"]))
            except (KeyError, TypeError, ValueError) as exc:
                raise SoakValidationError("SOAK_TIMESTAMP", "soak timestamp is invalid") from exc
            if timestamp.tzinfo is None or timestamp.utcoffset() is None:
                raise SoakValidationError("SOAK_TIMESTAMP", "soak timestamps must include a timezone")
            try:
                rss = float(sample["rss_mib"])
            except (KeyError, TypeError, ValueError) as exc:
                raise SoakValidationError("SOAK_RSS", "soak RSS value is invalid") from exc
            if not math.isfinite(rss):
                raise SoakValidationError("SOAK_RSS", "soak RSS values must be finite")
            sample_id = sample.get("sample_id")
            if not isinstance(sample_id, str) or not sample_id:
                raise SoakValidationError("SOAK_SAMPLE_ID", "soak sample IDs must be non-empty strings")
            if sample_id in seen_sample_ids:
                raise SoakValidationError("SOAK_DUPLICATE_SAMPLE_ID", f"duplicate soak sample ID: {sample_id}")
            seen_sample_ids.add(sample_id)
            parsed.append((timestamp, rss, sample_id))
        for index in range(1, len(parsed)):
            delta = (parsed[index][0] - parsed[index - 1][0]).total_seconds()
            if delta == 0:
                raise SoakValidationError("SOAK_DUPLICATE_TIMESTAMP", "soak timestamps must be unique")
            if delta < 0:
                raise SoakValidationError("SOAK_BACKWARD_TIMESTAMP", "soak timestamps must be strictly increasing")
            if not (SOAK_INTERVAL_SECONDS - SOAK_SAMPLE_JITTER_SECONDS <= delta <= SOAK_INTERVAL_SECONDS + SOAK_SAMPLE_JITTER_SECONDS):
                raise SoakValidationError("SOAK_CADENCE", "soak timestamps must remain within the bounded 300-second cadence")
        for start in range(0, max(0, len(parsed) - SOAK_WINDOW_SAMPLES + 1)):
            candidate = parsed[start : start + SOAK_WINDOW_SAMPLES]
            origin = candidate[0][0]
            complete = True
            for index, (timestamp, _rss, _sample_id) in enumerate(candidate):
                scheduled = origin.timestamp() + index * interval_seconds
                if abs(timestamp.timestamp() - scheduled) > SOAK_SAMPLE_JITTER_SECONDS:
                    complete = False
                    break
            if not complete:
                continue
            span_seconds = (candidate[-1][0] - candidate[0][0]).total_seconds()
            if span_seconds < SOAK_WINDOW_SECONDS:
                continue
            rss = [item[1] for item in candidate]
            hours = [(item[0].timestamp() - origin.timestamp()) / 3600.0 for item in candidate]
            mean_t = sum(hours) / len(hours)
            mean_rss = sum(rss) / len(rss)
            denominator = sum((value - mean_t) ** 2 for value in hours)
            slope = 0.0 if denominator == 0 else sum((hours[index] - mean_t) * (rss[index] - mean_rss) for index in range(len(hours))) / denominator
            windows.append(
                {
                    "session_id": session.get("session_id"),
                    "start": candidate[0][0].isoformat().replace("+00:00", "Z"),
                    "end": candidate[-1][0].isoformat().replace("+00:00", "Z"),
                    "sample_ids": [item[2] for item in candidate],
                    "growth_mib": max(rss) - rss[0],
                    "end_growth_mib": rss[-1] - rss[0],
                    "ols_slope_mib_per_hour": slope,
                    "span_seconds": span_seconds,
                }
            )
    return {
        "complete_windows": windows,
        "worst_growth_mib": max((window["growth_mib"] for window in windows), default=None),
        "worst_ols_slope_mib_per_hour": max((window["ols_slope_mib_per_hour"] for window in windows), default=None),
        "has_restart": has_restart,
    }


def validate_soak(record: dict[str, Any], run_dir: Path, errors: list[dict[str, str]]) -> None:
    soak = record.get("soak")
    if not isinstance(soak, dict):
        return
    artifacts = {item.get("artifact_id"): item for item in record.get("artifacts", [])}
    artifact = artifacts.get(soak.get("raw_timeseries_artifact_id"))
    if not artifact:
        errors.append(issue("SOAK_RAW", "raw soak series artifact is missing"))
        return
    try:
        raw = load_bundle_json(run_dir, str(artifact["path"]), MAX_SOAK_RAW_BYTES)
        computed = analyze_soak(raw, int(soak.get("sample_interval_seconds", 300)))
    except SoakValidationError as exc:
        errors.append(issue(exc.code, str(exc)))
        return
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        errors.append(issue("SOAK_RAW", f"cannot read raw soak series: {exc}"))
        return
    if not computed["complete_windows"]:
        code = "SOAK_NO_STITCH" if computed["has_restart"] else "SOAK_NO_COMPLETE_WINDOW"
        errors.append(issue(code, "no valid complete 8-hour window"))
        return
    if soak.get("worst_growth_mib") != computed["worst_growth_mib"] or soak.get("worst_ols_slope_mib_per_hour") != computed["worst_ols_slope_mib_per_hour"]:
        errors.append(issue("SOAK_RECOMPUTE", "reported soak worst metrics do not match raw data"))
    limits = soak.get("limits", {"growth_mib": 20.0, "slope_mib_per_hour": 1.0})
    if computed["worst_growth_mib"] > float(limits["growth_mib"]) or computed["worst_ols_slope_mib_per_hour"] > float(limits["slope_mib_per_hour"]):
        errors.append(issue("SOAK_LIMIT", "worst complete window exceeds soak limit"))


def validate_dod(dod: dict[str, Any] | None, record: dict[str, Any], record_index: dict[str, dict[str, Any]], errors: list[dict[str, str]]) -> None:
    if not isinstance(dod, dict):
        errors.append(issue("DOD_REQUIRED", "documentation DoD is required"))
        return
    items = dod.get("items", [])
    expected = {f"DOC-{index:02d}" for index in range(1, 12)}
    ids = {item.get("item_id") for item in items if isinstance(item, dict)}
    if len(items) != 11 or ids != expected:
        errors.append(issue("DOD_ITEMS", "DoD must contain DOC-01 through DOC-11 exactly once"))
    identity = source_identity(record.get("source", {}))
    limitations = {item.get("limitation_id"): item for item in record.get("accepted_limitations", []) if isinstance(item, dict)}
    for item in items:
        if not isinstance(item, dict) or not item.get("owner") or not item.get("status") or not item.get("evidence_record_ids") or not item.get("reviewed_at"):
            errors.append(issue("DOD_LINKS", "each DoD item needs owner, status, evidence links, and review time"))
            continue
        if item.get("status") not in DOD_STATUSES:
            errors.append(issue("DOD_STATUS", "DoD status is not in the frozen enum"))
        try:
            parse_timestamp(item["reviewed_at"])
        except (TypeError, ValueError):
            errors.append(issue("DOD_TIMESTAMP", "DoD reviewed_at must be RFC3339"))
        if item.get("source_revision") != identity:
            errors.append(issue("DOD_SOURCE", "DoD item source_revision must match the record Git revision"))
        evidence_ids = item.get("evidence_record_ids")
        if not isinstance(evidence_ids, list) or not evidence_ids:
            errors.append(issue("DOD_EVIDENCE", "DoD item needs one or more evidence IDs"))
        else:
            for evidence_id in evidence_ids:
                linked = record_index.get(evidence_id) if isinstance(evidence_id, str) else None
                linked_record = linked.get("record") if isinstance(linked, dict) else None
                if not RECORD_ID_RE.fullmatch(str(evidence_id)) or not linked_record or not linked.get("valid") or source_identity(linked_record.get("source", {})) != identity:
                    errors.append(issue("DOD_EVIDENCE", "DoD evidence must exist, validate, and share the source revision"))
                    break
        if item.get("status") == "blocked":
            errors.append(issue("DOD_BLOCKED", "a blocked DoD item blocks the documentation contract"))
        if item.get("status") == "not_applicable":
            limitation = limitations.get(item.get("limitation_id"))
            if not limitation or not str(limitation.get("scope", "")).startswith(str(item.get("item_id", ""))):
                errors.append(issue("DOD_LIMITATION", "N/A DoD item lacks a matching governed limitation"))
            else:
                try:
                    if parse_timestamp(str(limitation.get("expires_at"))) <= datetime.now(timezone.utc):
                        errors.append(issue("DOD_LIMITATION", "N/A DoD limitation is expired"))
                except (TypeError, ValueError):
                    errors.append(issue("DOD_LIMITATION", "N/A DoD limitation has invalid expiry"))


def validate_crate_contract(contract: dict[str, Any] | None, errors: list[dict[str, str]]) -> None:
    if not isinstance(contract, dict):
        errors.append(issue("CRATE_REQUIRED", "crate contract is required"))
        return
    expected = ["tessera-core", "tessera-gallery", "tessera-iced"]
    if sorted(contract.get("production_packages", [])) != expected:
        errors.append(issue("CRATE_PRODUCTION_SET", "production package set is not exactly the required three"))
    normal_build = "\n".join(contract.get("normal_build_closure", []))
    if "native/testkit" in normal_build or "test-support" in normal_build:
        errors.append(issue("CRATE_TESTKIT_DEP", "testkit enters normal/build dependency closure"))
    release = "\n".join(contract.get("release_contents", []))
    if "native/testkit" in release or "testkit/bin" in release:
        errors.append(issue("CRATE_TESTKIT_RELEASE", "testkit enters release package"))
    for key in ("metadata_artifact_id", "tree_artifact_id", "package_artifact_id"):
        if not contract.get(key):
            errors.append(issue("CRATE_ARTIFACT", f"crate contract lacks {key}"))


def validate_retest(record: dict[str, Any], record_index: dict[str, dict[str, Any]], errors: list[dict[str, str]], require_prelaunch_snapshot: bool = False) -> None:
    ordinal = record.get("retest_ordinal")
    supersedes = record.get("supersedes_record_id")
    handback_id = record.get("handback_id")
    if ordinal == 0:
        if supersedes is not None or handback_id is not None:
            errors.append(issue("RETEST_ROOT", "initial record may not name a predecessor or handback"))
        return
    if ordinal != 1 or not isinstance(supersedes, str) or not isinstance(handback_id, str):
        errors.append(issue("RETEST_FIELDS", "only one targeted retest with predecessor and handback is allowed"))
        return
    predecessor_entry = record_index.get(supersedes)
    predecessor = predecessor_entry.get("record") if isinstance(predecessor_entry, dict) else None
    if not predecessor or not predecessor_entry.get("immutable"):
        errors.append(issue("RETEST_PREDECESSOR", "retest predecessor must exist in an immutable bundle"))
        return
    if require_prelaunch_snapshot and predecessor_entry.get("prelaunch_verified") is not True:
        errors.append(issue("RETEST_PRELAUNCH", "retest predecessor must be verified before target launch"))
        return
    if predecessor.get("retest_ordinal") != 0 or predecessor.get("supersedes_record_id") is not None:
        errors.append(issue("RETEST_ORDINAL", "a retest may supersede only the original record"))
    if source_identity(predecessor.get("source", {})) != source_identity(record.get("source", {})) or predecessor.get("coverage_cell", {}).get("cell_id") != record.get("coverage_cell", {}).get("cell_id"):
        errors.append(issue("RETEST_SCOPE", "retest must share source identity and coverage cell with its predecessor"))
    try:
        if parse_timestamp(str(record.get("run", {}).get("started_at"))) <= parse_timestamp(str(predecessor.get("run", {}).get("finished_at"))):
            errors.append(issue("RETEST_TIME", "retest must begin after predecessor completion"))
    except (TypeError, ValueError):
        errors.append(issue("RETEST_TIME", "retest timestamps must be RFC3339 and ordered"))
    bundle = predecessor_entry.get("run_dir")
    handback_path = None
    handback = predecessor_entry.get("handback") if isinstance(predecessor_entry.get("handback"), dict) else None
    if handback is None and bundle and not require_prelaunch_snapshot:
        try:
            handback_path = bundle_file(Path(bundle), f"handback/{handback_id}.json")
        except ValueError:
            handback_path = None
        try:
            handback = load_json(handback_path) if handback_path else None
        except (OSError, json.JSONDecodeError):
            handback = None
    if not isinstance(handback, dict) or handback.get("handback_id") != handback_id:
        errors.append(issue("RETEST_HANDBACK", "retest must reference the predecessor handback packet"))
    else:
        current_entry = record_index.get(record.get("record_id"), {})
        actual_argv = current_entry.get("command_argv") if isinstance(current_entry, dict) else None
        if actual_argv is None and not require_prelaunch_snapshot:
            try:
                command_root = Path(current_entry.get("run_dir", "")) if isinstance(current_entry, dict) else Path("")
                actual_argv = load_json(bundle_file(command_root, "command.argv.json")).get("argv")
            except (OSError, ValueError, json.JSONDecodeError, AttributeError):
                actual_argv = None
        if handback.get("cell_id") != record.get("coverage_cell", {}).get("cell_id") or handback.get("targeted_retest_argv") != actual_argv:
            errors.append(issue("RETEST_TARGETED", "retest command or target scope differs from approved handback"))


def _bundle_error_code(error: Exception, prefix: str, fallback: str) -> str:
    if isinstance(error, BundlePathError):
        if error.code == "BUNDLE_SYMLINK":
            return f"{prefix}_SYMLINK"
        if error.code == "BUNDLE_NONREGULAR":
            return f"{prefix}_NONREGULAR"
        if error.code in {"BUNDLE_PATH", "BUNDLE_DEPTH_LIMIT", "BUNDLE_ENTRY_LIMIT"}:
            return f"{prefix}_PATH"
        if error.code in {"HASH_FILE_LIMIT", "HASH_AGGREGATE_LIMIT", "HASH_FILE_MUTATED"}:
            return f"{prefix}_HASH_LIMIT"
    return fallback


def _trusted_posix_group_exists(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False
    except Exception:
        return True


def _trusted_posix_wait_group_gone(pgid: int, timeout_seconds: float) -> bool:
    try:
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            if not _trusted_posix_group_exists(pgid):
                return True
            time.sleep(0.02)
        return not _trusted_posix_group_exists(pgid)
    except Exception:
        return False


def _terminate_trusted_verifier(process: subprocess.Popen[bytes]) -> bool:
    if os.name == "posix":
        pgid = process.pid
        term_sent = True
        try:
            os.killpg(pgid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        except Exception:
            term_sent = False
        try:
            process.wait(timeout=0.05)
        except subprocess.TimeoutExpired:
            pass
        except Exception:
            term_sent = False
        if term_sent and _trusted_posix_wait_group_gone(pgid, TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS):
            try:
                process.wait(timeout=TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
                return True
            except Exception:
                return False
        kill_sent = True
        try:
            os.killpg(pgid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        except Exception:
            kill_sent = False
        try:
            process.wait(timeout=TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            pass
        except Exception:
            kill_sent = False
        return term_sent and kill_sent and _trusted_posix_wait_group_gone(pgid, TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
    else:
        try:
            process.terminate()
        except Exception:
            pass
        try:
            process.wait(timeout=TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
            return True
        except subprocess.TimeoutExpired:
            pass
        except Exception:
            return False
        try:
            process.kill()
        except Exception:
            pass
        try:
            process.wait(timeout=TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            return False
        except Exception:
            return False
        return True


def _trusted_close_selector_stream(
    selector: selectors.BaseSelector | None,
    stream: Any,
    failures: list[str] | None = None,
) -> bool:
    closed = True
    try:
        if selector is not None:
            selector.unregister(stream)
    except Exception as exc:
        closed = False
        if failures is not None:
            failures.append(str(exc))
    try:
        stream.close()
    except Exception as exc:
        closed = False
        if failures is not None:
            failures.append(str(exc))
    return closed


def _run_trusted_verifier_posix(command: list[str]) -> list[dict[str, str]]:
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
            close_fds=True,
        )
    except OSError as exc:
        return [issue("TRUSTED_VERIFIER_START", f"cannot start trusted provenance verifier: {exc}")]
    selector: selectors.BaseSelector | None = None
    totals = {"stdout": 0, "stderr": 0}
    sinks: dict[str, Any] = {}
    timed_out = False
    output_limited = False
    pipe_descendant = False
    lifecycle_uncertain = False
    lifecycle_messages: list[str] = []
    start_error: Exception | None = None

    def mark_lifecycle(message: str) -> None:
        nonlocal lifecycle_uncertain
        lifecycle_uncertain = True
        if message not in lifecycle_messages:
            lifecycle_messages.append(message)

    def close_trusted_stream(selector_for_stream: selectors.BaseSelector | None, stream: Any, label: str) -> None:
        failures: list[str] = []
        if not _trusted_close_selector_stream(selector_for_stream, stream, failures):
            detail = "; ".join(failures) if failures else "unknown cleanup failure"
            mark_lifecycle(f"cannot close trusted verifier {label} capture stream: {detail}")

    def close_capture_setup() -> None:
        nonlocal selector
        if selector is not None:
            keys: list[Any] = []
            try:
                keys = list(selector.get_map().values())
            except Exception as exc:
                mark_lifecycle(f"cannot inspect trusted verifier capture selector during cleanup: {exc}")
            for key in keys:
                try:
                    stream = key.fileobj
                except Exception as exc:
                    mark_lifecycle(f"cannot inspect trusted verifier capture stream during cleanup: {exc}")
                    continue
                try:
                    label = str(key.data)
                except Exception:
                    label = "registered"
                close_trusted_stream(selector, stream, label)
            for label, stream in (("stdout", process.stdout), ("stderr", process.stderr)):
                if stream is not None:
                    close_trusted_stream(None, stream, label)
            try:
                selector.close()
            except Exception as exc:
                mark_lifecycle(f"cannot close trusted verifier capture selector: {exc}")
            selector = None
        else:
            for label, stream in (("stdout", process.stdout), ("stderr", process.stderr)):
                if stream is not None:
                    close_trusted_stream(None, stream, label)
        for label, sink in list(sinks.items()):
            try:
                sink.close()
            except Exception as exc:
                mark_lifecycle(f"cannot close trusted verifier {label} sink: {exc}")
        sinks.clear()

    try:
        selector = selectors.DefaultSelector()
        sinks = {"stdout": tempfile.TemporaryFile(mode="w+b"), "stderr": tempfile.TemporaryFile(mode="w+b")}
        for label, stream in (("stdout", process.stdout), ("stderr", process.stderr)):
            if stream is None:
                continue
            os.set_inheritable(stream.fileno(), False)
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, label)
        deadline = time.monotonic() + TRUSTED_VERIFIER_TIMEOUT_SECONDS
        post_exit_deadline: float | None = None
        while selector.get_map() or process.poll() is None:
            now = time.monotonic()
            if now >= deadline:
                timed_out = True
                if not _terminate_trusted_verifier(process):
                    mark_lifecycle("trusted provenance verifier process group did not disappear after bounded cleanup")
                break
            if process.poll() is not None and selector.get_map() and post_exit_deadline is None:
                post_exit_deadline = now + TRUSTED_VERIFIER_POST_EXIT_PIPE_SECONDS
            if post_exit_deadline is not None and now >= post_exit_deadline and selector.get_map():
                pipe_descendant = True
                if not _terminate_trusted_verifier(process):
                    mark_lifecycle("trusted provenance verifier process group did not disappear after bounded cleanup")
                break
            for key, _mask in selector.select(timeout=0.02):
                stream = key.fileobj
                label = str(key.data)
                try:
                    chunk = os.read(stream.fileno(), TRUSTED_VERIFIER_READ_CHUNK_BYTES)
                except BlockingIOError:
                    continue
                except OSError:
                    close_trusted_stream(selector, stream, label)
                    continue
                if not chunk:
                    close_trusted_stream(selector, stream, label)
                    continue
                remaining = TRUSTED_VERIFIER_CAPTURE_BYTES - totals[label]
                if remaining > 0:
                    accepted = chunk[:remaining]
                    sinks[label].write(accepted)
                    totals[label] += len(accepted)
                if len(chunk) > remaining:
                    output_limited = True
                    if not _terminate_trusted_verifier(process):
                        mark_lifecycle("trusted provenance verifier process group did not disappear after bounded cleanup")
                    break
            if output_limited:
                break
        if timed_out or output_limited or pipe_descendant:
            drain_deadline = time.monotonic() + TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS
            while selector.get_map() and time.monotonic() < drain_deadline:
                for key, _mask in selector.select(timeout=0.02):
                    stream = key.fileobj
                    try:
                        chunk = os.read(stream.fileno(), TRUSTED_VERIFIER_READ_CHUNK_BYTES)
                    except (BlockingIOError, OSError):
                        chunk = b""
                    if not chunk:
                        close_trusted_stream(selector, stream, str(key.data))
            for key in list(selector.get_map().values()):
                close_trusted_stream(selector, key.fileobj, str(key.data))
        try:
            process.wait(timeout=TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            if not _terminate_trusted_verifier(process):
                mark_lifecycle("trusted provenance verifier process group did not disappear after bounded cleanup")
        except Exception as exc:
            mark_lifecycle(f"cannot wait for trusted provenance verifier: {exc}")
    except Exception as exc:
        start_error = exc
        close_capture_setup()
        if not _terminate_trusted_verifier(process):
            mark_lifecycle("trusted provenance verifier process group did not disappear after setup failure")
    finally:
        close_capture_setup()

    errors: list[dict[str, str]] = []
    if start_error is not None:
        errors.append(issue("TRUSTED_VERIFIER_START", f"cannot initialize trusted provenance verifier lifecycle: {start_error}"))
    if timed_out:
        errors.append(issue("TRUSTED_VERIFIER_TIMEOUT", f"trusted provenance verifier exceeded {TRUSTED_VERIFIER_TIMEOUT_SECONDS} seconds"))
    if output_limited:
        errors.append(issue("TRUSTED_VERIFIER_OUTPUT_LIMIT", f"trusted provenance verifier output exceeds {TRUSTED_VERIFIER_CAPTURE_BYTES} bytes per stream"))
    if pipe_descendant:
        errors.append(issue("TRUSTED_VERIFIER_PIPE", "trusted provenance verifier exited before its output pipes reached EOF"))
    if start_error is None and not timed_out and not output_limited and not pipe_descendant and process.returncode != 0:
        errors.append(issue("TRUSTED_VERIFIER", "trusted provenance verifier rejected envelope"))
    if lifecycle_uncertain:
        detail = "; ".join(lifecycle_messages) if lifecycle_messages else "trusted provenance verifier cleanup could not be confirmed"
        errors.append(issue("TRUSTED_VERIFIER_PIPE", f"lifecycle uncertainty: {detail}"))
    return errors


def _trusted_windows_kernel32() -> Any:
    kernel32 = _windows_kernel32()
    kernel32.CreatePipe.argtypes = [
        ctypes.POINTER(HANDLE),
        ctypes.POINTER(HANDLE),
        ctypes.POINTER(_WinSecurityAttributes),
        DWORD,
    ]
    kernel32.CreatePipe.restype = BOOL
    kernel32.SetHandleInformation.argtypes = [HANDLE, DWORD, DWORD]
    kernel32.SetHandleInformation.restype = BOOL
    kernel32.ReadFile.argtypes = [
        HANDLE,
        PVOID,
        DWORD,
        ctypes.POINTER(DWORD),
        PVOID,
    ]
    kernel32.ReadFile.restype = BOOL
    kernel32.CancelIoEx.argtypes = [HANDLE, PVOID]
    kernel32.CancelIoEx.restype = BOOL
    kernel32.CreateJobObjectW.argtypes = [PVOID, PWSTR]
    kernel32.CreateJobObjectW.restype = HANDLE
    kernel32.SetInformationJobObject.argtypes = [HANDLE, WIN32_ENUM, PVOID, DWORD]
    kernel32.SetInformationJobObject.restype = BOOL
    kernel32.AssignProcessToJobObject.argtypes = [HANDLE, HANDLE]
    kernel32.AssignProcessToJobObject.restype = BOOL
    kernel32.TerminateJobObject.argtypes = [HANDLE, DWORD]
    kernel32.TerminateJobObject.restype = BOOL
    kernel32.TerminateProcess.argtypes = [HANDLE, DWORD]
    kernel32.TerminateProcess.restype = BOOL
    kernel32.WaitForSingleObject.argtypes = [HANDLE, DWORD]
    kernel32.WaitForSingleObject.restype = DWORD
    kernel32.InitializeProcThreadAttributeList.argtypes = [
        PVOID,
        DWORD,
        DWORD,
        ctypes.POINTER(SIZE_T),
    ]
    kernel32.InitializeProcThreadAttributeList.restype = BOOL
    kernel32.UpdateProcThreadAttribute.argtypes = [
        PVOID,
        DWORD,
        ULONG_PTR,
        PVOID,
        SIZE_T,
        PVOID,
        ctypes.POINTER(SIZE_T),
    ]
    kernel32.UpdateProcThreadAttribute.restype = BOOL
    kernel32.DeleteProcThreadAttributeList.argtypes = [PVOID]
    kernel32.DeleteProcThreadAttributeList.restype = None
    kernel32.CreateProcessW.argtypes = [
        PWSTR,
        PWSTR,
        PVOID,
        PVOID,
        BOOL,
        DWORD,
        PVOID,
        PWSTR,
        PVOID,
        ctypes.POINTER(_WinProcessInformation),
    ]
    kernel32.CreateProcessW.restype = BOOL
    kernel32.ResumeThread.argtypes = [HANDLE]
    kernel32.ResumeThread.restype = DWORD
    kernel32.GetExitCodeProcess.argtypes = [HANDLE, ctypes.POINTER(DWORD)]
    kernel32.GetExitCodeProcess.restype = BOOL
    return kernel32


def _trusted_windows_create_job(kernel32: Any | None = None) -> int:
    kernel32 = kernel32 or _trusted_windows_kernel32()
    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        raise OSError(_windows_last_error(kernel32), "CreateJobObjectW failed")
    limits = _WinJobObjectExtendedLimitInformation()
    limits.BasicLimitInformation.LimitFlags = _WIN_JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not kernel32.SetInformationJobObject(
        HANDLE(job),
        WIN32_ENUM(_WIN_JOB_OBJECT_EXTENDED_LIMIT_INFORMATION),
        ctypes.byref(limits),
        DWORD(ctypes.sizeof(limits)),
    ):
        error = _windows_last_error(kernel32)
        _windows_close(job, kernel32)
        raise OSError(error, "SetInformationJobObject failed")
    return int(job)


def _trusted_windows_terminate_job(job: int | None, kernel32: Any | None = None) -> None:
    if job is None:
        return
    kernel32 = kernel32 or _trusted_windows_kernel32()
    if not kernel32.TerminateJobObject(HANDLE(job), DWORD(1)):
        raise OSError(_windows_last_error(kernel32), "TerminateJobObject failed")


def _trusted_windows_wait(handle: int, timeout_seconds: float, kernel32: Any | None = None) -> int:
    milliseconds = _WIN_INFINITE if timeout_seconds < 0 else min(int(timeout_seconds * 1000), _WIN_INFINITE - 1)
    return int((kernel32 or _trusted_windows_kernel32()).WaitForSingleObject(HANDLE(handle), DWORD(milliseconds)))


def _trusted_windows_terminate_process(process_handle: int | None, kernel32: Any | None = None) -> None:
    if process_handle is None:
        return
    kernel32 = kernel32 or _trusted_windows_kernel32()
    if not kernel32.TerminateProcess(HANDLE(process_handle), DWORD(1)):
        raise OSError(_windows_last_error(kernel32), "TerminateProcess failed")


def _trusted_windows_lifecycle_issue(errors: list[dict[str, str]], message: str) -> None:
    errors.append(issue("TRUSTED_VERIFIER_PIPE", f"lifecycle uncertainty: {message}"))


def _trusted_windows_wait_for_termination(
    errors: list[dict[str, str]],
    handle: int | None,
    label: str,
    timeout_seconds: float,
    kernel32: Any,
) -> bool:
    if handle is None:
        return True
    try:
        state = _trusted_windows_wait(handle, timeout_seconds, kernel32)
    except OSError as exc:
        _trusted_windows_lifecycle_issue(errors, f"cannot wait for {label}: {exc}")
        return False
    if state == _WIN_WAIT_OBJECT_0:
        return True
    if state == _WIN_WAIT_TIMEOUT:
        _trusted_windows_lifecycle_issue(errors, f"{label} did not signal before bounded wait")
        return False
    if state == 0xFFFFFFFF:
        _trusted_windows_lifecycle_issue(
            errors,
            f"WaitForSingleObject({label}) failed: {_windows_last_error(kernel32)}",
        )
        return False
    _trusted_windows_lifecycle_issue(errors, f"WaitForSingleObject({label}) returned {state}")
    return False


def _trusted_windows_close_for_cleanup(
    errors: list[dict[str, str]],
    label: str,
    handle: int | None,
    kernel32: Any,
) -> None:
    if handle is None:
        return
    try:
        _windows_close(handle, kernel32)
    except OSError as exc:
        _trusted_windows_lifecycle_issue(errors, f"cannot close {label} handle: {exc}")


def _trusted_windows_exit_code(process_handle: int, kernel32: Any | None = None) -> int:
    kernel32 = kernel32 or _trusted_windows_kernel32()
    value = DWORD()
    if not kernel32.GetExitCodeProcess(HANDLE(process_handle), ctypes.byref(value)):
        raise OSError(_windows_last_error(kernel32), "GetExitCodeProcess failed")
    return int(value.value)


def _trusted_windows_create_pipe(kernel32: Any | None = None) -> tuple[int, int]:
    kernel32 = kernel32 or _trusted_windows_kernel32()
    attributes = _WinSecurityAttributes(ctypes.sizeof(_WinSecurityAttributes), None, 1)
    read_handle = HANDLE()
    write_handle = HANDLE()
    if not kernel32.CreatePipe(ctypes.byref(read_handle), ctypes.byref(write_handle), ctypes.byref(attributes), DWORD(0)):
        raise OSError(_windows_last_error(kernel32), "CreatePipe failed")
    try:
        if not kernel32.SetHandleInformation(read_handle, DWORD(_WIN_HANDLE_FLAG_INHERIT), DWORD(0)):
            raise OSError(_windows_last_error(kernel32), "SetHandleInformation(read) failed")
        if not kernel32.SetHandleInformation(write_handle, DWORD(_WIN_HANDLE_FLAG_INHERIT), DWORD(_WIN_HANDLE_FLAG_INHERIT)):
            raise OSError(_windows_last_error(kernel32), "SetHandleInformation(write) failed")
        return int(read_handle.value), int(write_handle.value)
    except Exception:
        _windows_close(int(read_handle.value) if read_handle.value else None, kernel32)
        _windows_close(int(write_handle.value) if write_handle.value else None, kernel32)
        raise


def _trusted_windows_create_handle_list(kernel32: Any, handles: tuple[int, int]) -> tuple[Any, PVOID]:
    size = SIZE_T()
    kernel32.InitializeProcThreadAttributeList(None, DWORD(1), DWORD(0), ctypes.byref(size))
    if size.value == 0:
        raise OSError(_windows_last_error(kernel32), "InitializeProcThreadAttributeList size query failed")
    storage = ctypes.create_string_buffer(size.value)
    attribute_list = ctypes.cast(storage, PVOID)
    if not kernel32.InitializeProcThreadAttributeList(attribute_list, DWORD(1), DWORD(0), ctypes.byref(size)):
        raise OSError(_windows_last_error(kernel32), "InitializeProcThreadAttributeList failed")
    handle_array = (HANDLE * len(handles))(*(HANDLE(handle) for handle in handles))
    if not kernel32.UpdateProcThreadAttribute(
        attribute_list,
        DWORD(0),
        ULONG_PTR(_WIN_PROC_THREAD_ATTRIBUTE_HANDLE_LIST),
        ctypes.cast(handle_array, PVOID),
        ctypes.sizeof(handle_array),
        None,
        None,
    ):
        kernel32.DeleteProcThreadAttributeList(attribute_list)
        raise OSError(_windows_last_error(kernel32), "UpdateProcThreadAttribute(handle list) failed")
    return (storage, handle_array), attribute_list


def _trusted_windows_sever_read_handle(handle: int | None, kernel32: Any | None = None) -> None:
    if handle is None:
        return
    kernel32 = kernel32 or _trusted_windows_kernel32()
    if not kernel32.CancelIoEx(HANDLE(handle), None):
        error = _windows_last_error(kernel32)
        if error != _WIN_ERROR_NOT_FOUND:
            raise OSError(error, "CancelIoEx failed")
    _windows_close(handle, kernel32)


def _trusted_windows_pipe_reader(
    handle: int,
    sink: Any,
    label: str,
    overflow: threading.Event,
    reader_errors: list[dict[str, str]],
    severed: threading.Event,
    kernel32: Any | None = None,
) -> None:
    kernel32 = kernel32 or _trusted_windows_kernel32()
    buffer = ctypes.create_string_buffer(TRUSTED_VERIFIER_READ_CHUNK_BYTES)
    total = 0
    while True:
        read = DWORD()
        if not kernel32.ReadFile(HANDLE(handle), buffer, DWORD(len(buffer)), ctypes.byref(read), None):
            error = _windows_last_error(kernel32)
            if error == _WIN_ERROR_BROKEN_PIPE or (error == _WIN_ERROR_OPERATION_ABORTED and severed.is_set()):
                return
            reader_errors.append(issue("TRUSTED_VERIFIER_PIPE", f"cannot read trusted verifier {label}: {error}"))
            return
        if read.value == 0:
            return
        chunk = buffer.raw[: int(read.value)]
        remaining = TRUSTED_VERIFIER_CAPTURE_BYTES - total
        if remaining > 0:
            accepted = chunk[:remaining]
            if accepted:
                sink.write(accepted)
                total += len(accepted)
        if len(chunk) > remaining:
            overflow.set()
            return


def _run_trusted_verifier_windows(command: list[str], *, kernel32: Any | None = None) -> list[dict[str, str]]:
    kernel32 = kernel32 or _trusted_windows_kernel32()
    job: int | None = None
    process_handle: int | None = None
    thread_handle: int | None = None
    stdout_read: int | None = None
    stdout_write: int | None = None
    stderr_read: int | None = None
    stderr_write: int | None = None
    attribute_list: PVOID | None = None
    attribute_storage: Any = None
    assigned = False
    severed = threading.Event()
    overflow = threading.Event()
    reader_errors: list[dict[str, str]] = []
    readers: list[threading.Thread] = []
    stdout_sink = tempfile.TemporaryFile(mode="w+b")
    stderr_sink = tempfile.TemporaryFile(mode="w+b")
    result_issues: list[dict[str, str]] = []
    try:
        try:
            job = _trusted_windows_create_job(kernel32)
            stdout_read, stdout_write = _trusted_windows_create_pipe(kernel32)
            stderr_read, stderr_write = _trusted_windows_create_pipe(kernel32)
            startup = _WinStartupInfoEx()
            startup.StartupInfo.cb = ctypes.sizeof(_WinStartupInfoEx)
            startup.StartupInfo.dwFlags = _WIN_STARTF_USESTDHANDLES
            startup.StartupInfo.hStdInput = None
            startup.StartupInfo.hStdOutput = HANDLE(stdout_write)
            startup.StartupInfo.hStdError = HANDLE(stderr_write)
            attribute_storage, attribute_list = _trusted_windows_create_handle_list(kernel32, (stdout_write, stderr_write))
            startup.lpAttributeList = attribute_list
            process_info = _WinProcessInformation()
            command_line = ctypes.create_unicode_buffer(subprocess.list2cmdline(command))
            if not kernel32.CreateProcessW(
                None,
                command_line,
                None,
                None,
                BOOL(1),
                DWORD(_WIN_CREATE_SUSPENDED | _WIN_EXTENDED_STARTUPINFO_PRESENT),
                None,
                None,
                ctypes.byref(startup),
                ctypes.byref(process_info),
            ):
                raise OSError(_windows_last_error(kernel32), "CreateProcessW failed")
            process_handle = int(process_info.hProcess)
            thread_handle = int(process_info.hThread)
            if not kernel32.AssignProcessToJobObject(HANDLE(job), HANDLE(process_handle)):
                raise OSError(_windows_last_error(kernel32), "AssignProcessToJobObject failed")
            assigned = True
            resumed_value = kernel32.ResumeThread(HANDLE(thread_handle))
            if resumed_value == 0xFFFFFFFF:
                raise OSError(_windows_last_error(kernel32), "ResumeThread failed")
        except OSError as exc:
            result_issues.append(issue("TRUSTED_VERIFIER_START", f"cannot start trusted provenance verifier: {exc}"))
            if process_handle is not None and not assigned:
                try:
                    _trusted_windows_terminate_process(process_handle, kernel32)
                except OSError as terminate_error:
                    _trusted_windows_lifecycle_issue(
                        result_issues,
                        f"cannot terminate raw suspended verifier after launch failure: {terminate_error}",
                    )
                else:
                    _trusted_windows_wait_for_termination(
                        result_issues,
                        process_handle,
                        "raw suspended verifier after launch failure",
                        TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                        kernel32,
                    )
            elif job is not None and assigned:
                try:
                    _trusted_windows_terminate_job(job, kernel32)
                except OSError as terminate_error:
                    _trusted_windows_lifecycle_issue(
                        result_issues,
                        f"cannot terminate verifier Job Object after launch failure: {terminate_error}",
                    )
                else:
                    _trusted_windows_wait_for_termination(
                        result_issues,
                        process_handle,
                        "verifier process after launch failure",
                        TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                        kernel32,
                    )
                    _trusted_windows_wait_for_termination(
                        result_issues,
                        job,
                        "verifier Job Object after launch failure",
                        TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                        kernel32,
                    )
            return result_issues
        finally:
            if attribute_list is not None:
                kernel32.DeleteProcThreadAttributeList(attribute_list)
                attribute_list = None
        _windows_close(thread_handle, kernel32)
        thread_handle = None
        _windows_close(stdout_write, kernel32)
        stdout_write = None
        _windows_close(stderr_write, kernel32)
        stderr_write = None
        readers = [
            threading.Thread(target=_trusted_windows_pipe_reader, args=(stdout_read, stdout_sink, "stdout", overflow, reader_errors, severed, kernel32), daemon=True),
            threading.Thread(target=_trusted_windows_pipe_reader, args=(stderr_read, stderr_sink, "stderr", overflow, reader_errors, severed, kernel32), daemon=True),
        ]
        for reader in readers:
            reader.start()
        deadline = time.monotonic() + TRUSTED_VERIFIER_TIMEOUT_SECONDS
        timed_out = False
        output_limited = False
        pipe_descendant = False
        while True:
            if overflow.is_set():
                output_limited = True
                _trusted_windows_terminate_job(job, kernel32)
                break
            if time.monotonic() >= deadline:
                timed_out = True
                _trusted_windows_terminate_job(job, kernel32)
                break
            state = _trusted_windows_wait(process_handle, 0.02, kernel32)
            if state == _WIN_WAIT_OBJECT_0:
                for reader in readers:
                    reader.join(timeout=TRUSTED_VERIFIER_POST_EXIT_PIPE_SECONDS)
                if any(reader.is_alive() for reader in readers):
                    pipe_descendant = True
                    _trusted_windows_terminate_job(job, kernel32)
                break
            if state != _WIN_WAIT_TIMEOUT:
                _trusted_windows_terminate_job(job, kernel32)
                result_issues.append(issue("TRUSTED_VERIFIER_PIPE", f"trusted provenance verifier wait returned {state}"))
                return result_issues
        if timed_out or output_limited or pipe_descendant:
            _trusted_windows_wait_for_termination(
                result_issues,
                job,
                "trusted verifier Job Object after bounded cleanup",
                TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                kernel32,
            )
        severed.set()
        for handle_name, handle in (("stdout", stdout_read), ("stderr", stderr_read)):
            try:
                _trusted_windows_sever_read_handle(handle, kernel32)
            except OSError as exc:
                reader_errors.append(issue("TRUSTED_VERIFIER_PIPE", f"cannot sever trusted verifier {handle_name}: {exc}"))
        stdout_read = None
        stderr_read = None
        for reader in readers:
            reader.join(timeout=TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS)
            if reader.is_alive():
                reader_errors.append(issue("TRUSTED_VERIFIER_PIPE", "trusted provenance verifier pipe reader did not finish"))
        if reader_errors:
            result_issues.extend(reader_errors)
            return result_issues
        if result_issues:
            return result_issues
        if timed_out:
            result_issues.append(issue("TRUSTED_VERIFIER_TIMEOUT", f"trusted provenance verifier exceeded {TRUSTED_VERIFIER_TIMEOUT_SECONDS} seconds"))
            return result_issues
        if output_limited:
            result_issues.append(issue("TRUSTED_VERIFIER_OUTPUT_LIMIT", f"trusted provenance verifier output exceeds {TRUSTED_VERIFIER_CAPTURE_BYTES} bytes per stream"))
            return result_issues
        if pipe_descendant:
            result_issues.append(issue("TRUSTED_VERIFIER_PIPE", "trusted provenance verifier exited before its output pipes reached EOF"))
            return result_issues
        if _trusted_windows_exit_code(process_handle, kernel32) != 0:
            result_issues.append(issue("TRUSTED_VERIFIER", "trusted provenance verifier rejected envelope"))
        return result_issues
    except OSError as exc:
        _trusted_windows_lifecycle_issue(result_issues, f"trusted verifier lifecycle failed: {exc}")
        if job is not None:
            try:
                _trusted_windows_terminate_job(job, kernel32)
            except OSError as terminate_error:
                _trusted_windows_lifecycle_issue(result_issues, f"cannot terminate verifier Job Object: {terminate_error}")
            else:
                _trusted_windows_wait_for_termination(
                    result_issues,
                    process_handle,
                    "verifier process after lifecycle failure",
                    TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                    kernel32,
                )
                _trusted_windows_wait_for_termination(
                    result_issues,
                    job,
                    "verifier Job Object after lifecycle failure",
                    TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                    kernel32,
                )
        return result_issues
    finally:
        severed.set()
        for handle in (stdout_read, stderr_read):
            if handle is not None:
                try:
                    _trusted_windows_sever_read_handle(handle, kernel32)
                except OSError as exc:
                    _trusted_windows_lifecycle_issue(result_issues, f"cannot sever trusted verifier read handle: {exc}")
        if job is not None and process_handle is not None:
            _trusted_windows_wait_for_termination(
                result_issues,
                process_handle,
                "verifier process before handle close",
                TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                kernel32,
            )
            _trusted_windows_wait_for_termination(
                result_issues,
                job,
                "verifier Job Object before handle close",
                TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS,
                kernel32,
            )
        for label, handle in (
            ("stdout write", stdout_write),
            ("stderr write", stderr_write),
            ("thread", thread_handle),
            ("process", process_handle),
            ("Job Object", job),
        ):
            _trusted_windows_close_for_cleanup(result_issues, label, handle, kernel32)
        for label, sink in (("stdout", stdout_sink), ("stderr", stderr_sink)):
            try:
                sink.close()
            except OSError as exc:
                _trusted_windows_lifecycle_issue(result_issues, f"cannot close trusted verifier {label} sink: {exc}")
        attribute_storage = None


def run_trusted_verifier(command: list[str]) -> list[dict[str, str]]:
    if not command:
        return [issue("TRUSTED_VERIFIER", "trusted provenance verifier command is empty")]
    if os.name == "posix":
        return _run_trusted_verifier_posix(command)
    if os.name == "nt":
        return _run_trusted_verifier_windows(command)
    return [issue("TRUSTED_VERIFIER_START", "trusted verifier is unsupported on this platform")]


def validate_manifest(record: dict[str, Any], run_dir: Path, errors: list[dict[str, str]], hash_budget: HashBudget | None = None) -> None:
    hash_budget = hash_budget or HashBudget()
    try:
        manifest_path = bundle_file(run_dir, "payload-manifest.json")
        provenance_path = bundle_file(run_dir, "provenance-attestation.json")
    except (OSError, ValueError) as exc:
        errors.append(issue(_bundle_error_code(exc, "MANIFEST", "MANIFEST_REQUIRED"), "payload manifest and provenance are required"))
        return
    try:
        manifest = load_json(manifest_path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        errors.append(issue("MANIFEST_PARSE", f"cannot parse payload manifest: {exc}"))
        return
    if manifest.get("schema_version") != MANIFEST_VERSION or manifest.get("run_id") != record.get("run", {}).get("run_id"):
        errors.append(issue("MANIFEST_IDENTITY", "manifest identity does not match evidence"))
    if "manifest_digest_sha256" in manifest:
        errors.append(issue("MANIFEST_DIGEST_CYCLE", "manifest must not contain its own digest"))
    authority = record.get("authority")
    expected_authority = {
        "catalog_version": "coverage-g0-v1",
        "catalog_sha256": FROZEN_CATALOG_FILE_SHA256,
        "crosswalk_sha256": FROZEN_CROSSWALK_FILE_SHA256,
    }
    if not isinstance(authority, dict) or any(authority.get(key) != value for key, value in expected_authority.items()):
        errors.append(issue("AUTHORITY_RECORD", "record does not bind the frozen catalog and crosswalk digests"))
    if manifest.get("authority") != expected_authority:
        errors.append(issue("AUTHORITY_MANIFEST", "manifest does not bind the frozen catalog and crosswalk digests"))
    entries = manifest.get("payload_files")
    if not isinstance(entries, list) or not entries:
        errors.append(issue("MANIFEST_REQUIRED", "manifest must list payload files"))
        return
    paths: set[str] = set()
    for entry in entries:
        value = entry.get("path") if isinstance(entry, dict) else None
        if not isinstance(value, str) or not safe_relative_path(value):
            errors.append(issue("MANIFEST_PATH", "manifest contains unsafe path"))
            continue
        if value in EXCLUDED_ENVELOPES:
            errors.append(issue("MANIFEST_EXCLUDED_ENTRY", f"excluded envelope appears in manifest: {value}"))
        if value in paths:
            errors.append(issue("MANIFEST_PATH", f"duplicate manifest path {value}"))
        paths.add(value)
        try:
            bundle_file(run_dir, value)
        except ValueError as exc:
            errors.append(issue(_bundle_error_code(exc, "MANIFEST", "MANIFEST_FILE"), f"invalid payload file {value}: {exc}"))
            continue
        try:
            digest = sha256_bundle_file(run_dir, value, budget=hash_budget)
        except (OSError, ValueError) as exc:
            errors.append(issue(_bundle_error_code(exc, "MANIFEST", "MANIFEST_FILE"), f"cannot hash payload file {value}: {exc}"))
            continue
        if entry.get("sha256") != digest:
            errors.append(issue("MANIFEST_HASH", f"payload hash mismatch for {value}"))
    expected_paths = {"evidence.json"} | {item.get("path") for item in record.get("artifacts", []) if isinstance(item, dict)}
    if paths != expected_paths:
        errors.append(issue("MANIFEST_COVERAGE", "manifest paths must be evidence plus exactly its artifact paths"))
    entry_by_path = {entry.get("path"): entry for entry in entries if isinstance(entry, dict)}
    for artifact in record.get("artifacts", []):
        if isinstance(artifact, dict) and entry_by_path.get(artifact.get("path"), {}).get("sha256") != artifact.get("sha256"):
            errors.append(issue("ARTIFACT_MANIFEST", "artifact digest differs from manifest digest"))
    if isinstance(authority, dict):
        for artifact_id, expected_digest in ((authority.get("catalog_artifact_id"), FROZEN_CATALOG_FILE_SHA256), (authority.get("crosswalk_artifact_id"), FROZEN_CROSSWALK_FILE_SHA256)):
            artifact = next((item for item in record.get("artifacts", []) if isinstance(item, dict) and item.get("artifact_id") == artifact_id), None)
            if not artifact or artifact.get("sha256") != expected_digest:
                errors.append(issue("AUTHORITY_ARTIFACT", "authority copy is absent or has the wrong digest"))
    digest = sha256_bytes(canonical_json_bytes(manifest))
    try:
        provenance = load_json(provenance_path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        errors.append(issue("PROVENANCE_PARSE", f"cannot parse provenance: {exc}"))
        return
    if provenance.get("manifest_digest_sha256") != digest:
        errors.append(issue("MANIFEST_DIGEST", "provenance digest differs from canonical manifest"))
    if provenance.get("authority") != expected_authority:
        errors.append(issue("AUTHORITY_PROVENANCE", "provenance does not bind the frozen catalog and crosswalk digests"))
    mode = provenance.get("mode")
    if mode == "local_development":
        if provenance.get("release_eligible") is not False or record.get("run", {}).get("lane") == "rc":
            errors.append(issue("LOCAL_RELEASE_CLAIM", "local evidence cannot claim release eligibility or RC lane"))
    elif mode in {"trusted_ci", "rc"}:
        required = ("workflow", "trusted_timestamp", "immutable_object", "signer_identity", "external_registration_id")
        trusted_envelopes_present = True
        try:
            bundle_file(run_dir, "signature-envelope.json")
            bundle_file(run_dir, "external-registration.json")
        except ValueError:
            trusted_envelopes_present = False
        if any(not provenance.get(key) for key in required) or not trusted_envelopes_present:
            errors.append(issue("TRUSTED_PROVENANCE", "trusted run lacks required provenance envelope"))
        verifier = os.environ.get("TESSERA_TRUSTED_VERIFY_COMMAND")
        if not verifier:
            errors.append(issue("TRUSTED_VERIFIER", "trusted evidence requires configured verifier command"))
        else:
            try:
                command = shlex.split(verifier) + [str(bundle_file(run_dir, "signature-envelope.json")), str(provenance_path), str(bundle_file(run_dir, "external-registration.json"))]
            except ValueError as exc:
                errors.append(issue("TRUSTED_VERIFIER_COMMAND", f"trusted provenance verifier command is invalid: {exc}"))
            else:
                errors.extend(run_trusted_verifier(command))
    else:
        errors.append(issue("PROVENANCE_MODE", "provenance mode is invalid"))


def validate_evidence(record: dict[str, Any], catalog: dict[str, Any], crosswalk: dict[str, Any], run_dir: Path, record_index: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    errors = validate_catalog(catalog, crosswalk)
    record_index = record_index or {}
    hash_budget = HashBudget()
    if not isinstance(record, dict) or record.get("schema_version") != EVIDENCE_VERSION:
        errors.append(issue("EVIDENCE_VERSION", "unsupported evidence schema version"))
        return {"validator_version": VALIDATOR_VERSION, "evidence_valid": False, "errors": errors}
    required = ("record_id", "run", "coverage_cell", "source", "authority", "applicability", "execution", "risk", "accepted_limitations", "runner", "artifacts", "supersedes_record_id", "retest_ordinal", "handback_id")
    for key in required:
        if key not in record:
            errors.append(issue("EVIDENCE_REQUIRED", f"missing top-level field {key}"))
    run = record.get("run", {})
    if not isinstance(run, dict) or not RUN_RE.fullmatch(str(run.get("run_id", ""))):
        errors.append(issue("RUN_ID", "run_id is invalid"))
    if run.get("milestone") != "G0" or run.get("layer") not in {"L1", "L2", "L3", "L4"}:
        errors.append(issue("RUN_SCOPE", "run must declare G0 and a valid layer"))
    execution = record.get("execution", {})
    if execution.get("status") not in EXECUTION_STATUSES:
        errors.append(issue("EXECUTION_STATUS", "execution status is invalid or ledger-derived"))
    cells = {cell["cell_id"]: cell for cell in expected_cells(catalog)}
    cell = record.get("coverage_cell", {})
    expected = cells.get(cell.get("cell_id"))
    if not expected:
        errors.append(issue("CELL_UNKNOWN", "evidence does not reference a registered coverage cell"))
    else:
        for key in ("catalog_version", "product_requirement_ids", "test_requirement_ids", "test_id", "scenario_id", "layer", "platform_profile_id", "renderer", "system_scale", "ui_scale", "theme", "locale", "release_level", "assistive_tech", "gate_class", "metric_ids"):
            if cell.get(key) != expected.get(key):
                errors.append(issue("CELL_MISMATCH", f"coverage cell {key} differs from catalog"))
        if run.get("test_id") != expected["test_id"] or run.get("layer") != expected["layer"]:
            errors.append(issue("CELL_MISMATCH", "run test/layer differs from catalog cell"))
    validate_source(record.get("source", {}), errors)
    validate_applicability(record, errors)
    if not isinstance(record.get("risk", {}).get("findings"), list):
        errors.append(issue("RISK_MODEL", "risk findings must be independent list"))
    validate_limitations(record, errors)
    artifacts = record.get("artifacts", [])
    artifact_ids = unique_ids(artifacts if isinstance(artifacts, list) else [], "artifact_id", errors, "ARTIFACT_ID")
    for artifact in artifacts if isinstance(artifacts, list) else []:
        if not safe_relative_path(str(artifact.get("path", ""))):
            errors.append(issue("ARTIFACT_PATH", "artifact path is unsafe"))
        if not HASH_RE.fullmatch(str(artifact.get("sha256", ""))):
            errors.append(issue("ARTIFACT_HASH", "artifact SHA-256 is invalid"))
        try:
            artifact_path = bundle_file(run_dir, str(artifact.get("path", "")))
        except ValueError as exc:
            errors.append(issue(_bundle_error_code(exc, "ARTIFACT", "ARTIFACT_FILE"), f"artifact path is not a regular in-bundle file: {exc}"))
            continue
        try:
            digest = sha256_bundle_file(run_dir, str(artifact.get("path", "")), budget=hash_budget)
        except (OSError, ValueError) as exc:
            errors.append(issue(_bundle_error_code(exc, "ARTIFACT", "ARTIFACT_FILE"), f"cannot hash artifact: {exc}"))
            continue
        if artifact.get("sha256") != digest:
            errors.append(issue("ARTIFACT_HASH", "artifact bytes do not match its record digest"))
        if artifact.get("artifact_id") == "ART-environment":
            try:
                environment = load_bundle_json(run_dir, str(artifact["path"]))
                for entry in environment.get("variables", []):
                    if SECRET_KEY_RE.search(str(entry.get("name", ""))) and (entry.get("redacted") is not True or entry.get("value") != "<redacted>"):
                        errors.append(issue("SECRET_LEAK", "captured environment exposes secret-like variable"))
            except (OSError, ValueError, json.JSONDecodeError, KeyError, TypeError):
                errors.append(issue("ENVIRONMENT_ARTIFACT", "captured environment artifact is unreadable"))
    runner = record.get("runner", {})
    runner_fields = ("runner_path", "runner_version", "bundle_created_before_target", "argv_artifact_id", "environment_artifact_id", "stdout_artifact_id", "stderr_artifact_id", "exit_code", "signal", "finalized_by", "finalization_once")
    if not isinstance(runner, dict) or any(key not in runner for key in runner_fields):
        errors.append(issue("RUNNER_REQUIRED", "runner facts are incomplete"))
    else:
        if runner.get("runner_path") != "native/testkit/bin/run-evidence" or not runner.get("bundle_created_before_target") or not runner.get("finalization_once"):
            errors.append(issue("RUNNER_CONTRACT", "runner did not meet frozen finalization contract"))
        for artifact_id in (runner.get("argv_artifact_id"), runner.get("environment_artifact_id"), runner.get("stdout_artifact_id"), runner.get("stderr_artifact_id")):
            if artifact_id not in artifact_ids:
                errors.append(issue("RUNNER_ARTIFACT", "runner capture artifact is absent"))
        if runner.get("exit_code") not in (0, None) and execution.get("status") == "pass":
            errors.append(issue("RUNNER_EXIT", "nonzero target exit cannot be pass"))
        signal_name = runner.get("signal")
        expected_signal_exit = {"SIGINT": 128 + signal.SIGINT, "SIGTERM": 128 + signal.SIGTERM}
        if signal_name is None:
            if runner.get("finalized_by") != "exit_trap":
                errors.append(issue("RUNNER_SIGNAL", "signal-less runner result must use exit_trap"))
        elif signal_name not in expected_signal_exit or runner.get("finalized_by") != "signal_trap" or runner.get("exit_code") != expected_signal_exit[signal_name]:
            errors.append(issue("RUNNER_SIGNAL", "signal runner result has inconsistent signal, exit code, or finalizer"))
    validate_retest(record, record_index, errors, require_prelaunch_snapshot=True)
    if record.get("applicability", {}).get("visual", {}).get("state") == "applicable":
        validate_visual(record, catalog, errors)
    validate_evidence_metrics(record, catalog, expected, errors)
    if record.get("applicability", {}).get("soak", {}).get("state") == "applicable":
        validate_soak(record, run_dir, errors)
    if run.get("test_id") == "T-G0-019":
        validate_crate_contract(record.get("crate_contract"), errors)
    if run.get("test_id") == "T-G0-020":
        validate_dod(record.get("documentation_dod"), record, record_index, errors)
    validate_manifest(record, run_dir, errors, hash_budget)
    return {"validator_version": VALIDATOR_VERSION, "evidence_valid": not errors, "errors": errors}


def write_payload_manifest(run_dir: Path, run_id: str, authority: dict[str, Any] | None = None, hash_budget: HashBudget | None = None) -> tuple[dict[str, Any], str]:
    payload_files: list[dict[str, str]] = []
    hash_budget = hash_budget or HashBudget()
    try:
        for relative in sorted(iter_bundle_relative_files(run_dir)):
            if relative in EXCLUDED_ENVELOPES:
                continue
            payload_files.append({"path": relative, "media_type": artifact_media_type(Path(relative)), "sha256": sha256_bundle_file(run_dir, relative, budget=hash_budget)})
    except (OSError, ValueError) as exc:
        code = _bundle_error_code(exc, "MANIFEST", "MANIFEST_FILE")
        raise ValueError(f"{code}: cannot build payload manifest: {exc}") from exc
    if authority is None:
        try:
            authority = load_json(bundle_file(run_dir, "evidence.json")).get("authority")
        except (OSError, json.JSONDecodeError, AttributeError):
            authority = None
    manifest_authority = {key: authority.get(key) for key in ("catalog_version", "catalog_sha256", "crosswalk_sha256")} if isinstance(authority, dict) else None
    manifest = {"schema_version": MANIFEST_VERSION, "run_id": run_id, "authority": manifest_authority, "payload_files": payload_files}
    write_json(run_dir / "payload-manifest.json", manifest, run_dir)
    return manifest, sha256_bytes(canonical_json_bytes(manifest))


def write_local_provenance(run_dir: Path, digest: str, authority: dict[str, Any] | None = None) -> None:
    if authority is None:
        try:
            authority = load_json(bundle_file(run_dir, "evidence.json")).get("authority")
        except (OSError, json.JSONDecodeError, AttributeError):
            authority = None
    provenance_authority = {key: authority.get(key) for key in ("catalog_version", "catalog_sha256", "crosswalk_sha256")} if isinstance(authority, dict) else None
    write_json(
        run_dir / "provenance-attestation.json",
        {
            "mode": "local_development",
            "release_eligible": False,
            "manifest_digest_sha256": digest,
            "authority": provenance_authority,
            "workflow": None,
            "trusted_timestamp": None,
            "immutable_object": None,
            "signer_identity": None,
            "external_registration_id": None,
        },
        run_dir,
    )


def write_validation(run_dir: Path, validation: dict[str, Any]) -> None:
    document = {
        "schema_version": "tessera.iced.validation/v1",
        "validated_at": utc_now(),
        "validator_version": validation["validator_version"],
        "evidence_valid": validation["evidence_valid"],
        "errors": validation["errors"],
        "release_eligible": False,
    }
    write_json(run_dir / "validation.json", document, run_dir)


def minimal_record(catalog: dict[str, Any], test_id: str = "T-G0-010") -> dict[str, Any]:
    cell = next(item for item in [*expected_cells(catalog), *boundary_cells(catalog)] if item["test_id"] == test_id)
    run_id = "RUN-20260817T000000Z-b9c797d8-001"
    return {
        "schema_version": EVIDENCE_VERSION,
        "record_id": f"EV-{run_id}-{test_id}",
        "run": {"run_id": run_id, "test_id": test_id, "kind": "documentation", "layer": cell["layer"], "milestone": "G0", "lane": "manual", "started_at": "2026-08-17T00:00:00Z", "finished_at": "2026-08-17T00:00:00Z"},
        "coverage_cell": cell,
        "source": {
            "identity_kind": "git_commit",
            "repository_label": "tessera",
            "revision": "b9c797d8dcd8ed044bd6a4f5bc479bfe52296810",
            "workspace_manifest_sha256": "0" * 64,
            "cargo_lock_sha256": "1" * 64,
            "canonical_native_tree_sha256": "2" * 64,
            "preflight": {
                "mode": "git",
                "verdict": "pass",
                "declared_root": "/logical/tessera",
                "evidence_root_outside_source_root": True,
                "git": {"top_level_equals_declared_root": True, "index_clean": True, "worktree_clean": True, "untracked_empty": True, "submodule_policy": "none", "submodules_match_policy": True, "head_native_tree_sha256": "2" * 64},
            },
        },
        "authority": {"catalog_version": "coverage-g0-v1", "catalog_sha256": FROZEN_CATALOG_FILE_SHA256, "crosswalk_sha256": FROZEN_CROSSWALK_FILE_SHA256, "catalog_artifact_id": "ART-authority-catalog", "crosswalk_artifact_id": "ART-authority-crosswalk"},
        "applicability": {key: {"state": "not_applicable", "reason": "contract fixture has no native implementation"} for key in APPLICABILITY_KEYS},
        "execution": {"status": "blocked"},
        "risk": {"findings": []},
        "accepted_limitations": [],
        "runner": {"runner_path": "native/testkit/bin/run-evidence", "runner_version": VALIDATOR_VERSION, "bundle_created_before_target": True, "argv_artifact_id": "ART-command", "environment_artifact_id": "ART-environment", "stdout_artifact_id": "ART-stdout", "stderr_artifact_id": "ART-stderr", "exit_code": 0, "signal": None, "finalized_by": "exit_trap", "finalization_once": True},
        "artifacts": [],
        "evidence_metrics": [],
        "supersedes_record_id": None,
        "retest_ordinal": 0,
        "handback_id": None,
        "visual": None,
        "performance": None,
        "fault": None,
        "soak": None,
        "documentation_dod": None,
        "crate_contract": None,
    }
