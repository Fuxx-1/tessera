"""Single-run, fail-closed G0 evidence finalizer."""

from __future__ import annotations

import argparse
import copy
import ctypes
import json
import os
import re
import selectors
import signal
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from evidence_contract import (
    BOOL,
    DWORD,
    HANDLE,
    PVOID,
    PWSTR,
    SIZE_T,
    ULONG_PTR,
    WIN32_ENUM,
    BundlePathError,
    DIRECT_PRIOR_RECORD_LOOKUP,
    FROZEN_CATALOG_FILE_SHA256,
    FROZEN_CROSSWALK_FILE_SHA256,
    HashBudget,
    MAX_JSON_BYTES,
    MAX_PRIOR_RECORD_BYTES,
    RUN_RE,
    VALIDATOR_VERSION,
    _WIN_CREATE_SUSPENDED,
    _WIN_ERROR_BROKEN_PIPE,
    _WIN_ERROR_NOT_FOUND,
    _WIN_ERROR_OPERATION_ABORTED,
    _WIN_EXTENDED_STARTUPINFO_PRESENT,
    _WIN_FILE_SHARE_READ,
    _WIN_FILE_SHARE_WRITE,
    _WIN_GENERIC_READ,
    _WIN_HANDLE_FLAG_INHERIT,
    _WIN_INFINITE,
    _WIN_JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
    _WIN_JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    _WIN_OPEN_EXISTING,
    _WIN_PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
    _WIN_STARTF_USESTDHANDLES,
    _WIN_WAIT_OBJECT_0,
    _WIN_WAIT_TIMEOUT,
    _WinJobObjectBasicLimitInformation as _WinBasicLimitInformation,
    _WinJobObjectExtendedLimitInformation as _WinExtendedLimitInformation,
    _WinIoCounters,
    _WinProcessInformation,
    _WinSecurityAttributes,
    _WinStartupInfo,
    _WinStartupInfoEx,
    artifact_media_type,
    bundle_file,
    create_secure_bundle,
    load_bundle_json,
    load_json,
    read_limited,
    sha256_bundle_file,
    source_identity,
    utc_now,
    validate_authority_files,
    validate_evidence,
    validate_source,
    write_json,
    write_local_provenance,
    write_payload_manifest,
    write_validation,
)


SECRET_RE = re.compile(r"(?:SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE_KEY|API_KEY)", re.IGNORECASE)
TRAPPED_SIGNALS = (signal.SIGINT, signal.SIGTERM)
MAX_CAPTURE_BYTES = 4 * 1024 * 1024
OUTPUT_READ_CHUNK_BYTES = 64 * 1024
NON_SOAK_DEFAULT_TARGET_TIMEOUT_SECONDS = 1800
NON_SOAK_MAX_TARGET_TIMEOUT_SECONDS = 7200
G0_SOAK_DEFAULT_TARGET_TIMEOUT_SECONDS = 32400
G0_SOAK_MAX_TARGET_TIMEOUT_SECONDS = 32400
SOAK_REQUIRED_WINDOW_SECONDS = 28800
SOAK_SETUP_GRACE_SECONDS = 300
DEFAULT_TARGET_TIMEOUT_SECONDS = NON_SOAK_DEFAULT_TARGET_TIMEOUT_SECONDS
MAX_TARGET_TIMEOUT_SECONDS = G0_SOAK_MAX_TARGET_TIMEOUT_SECONDS
TERMINATION_GRACE_SECONDS = 2.0
POST_EXIT_DRAIN_SECONDS = 1.0
PIPE_SEVER_GRACE_SECONDS = 1.0
DIRECT_PRIOR_RECORD_LOOKUP = True


@dataclass
class TargetResult:
    exit_code: int = 125
    errors: list[dict[str, str]] = field(default_factory=list)
    capture_terminal: bool = True


class CaptureSink:
    """An unlinked, runner-owned sink. Target code never receives this handle."""

    def __init__(self) -> None:
        self._file = tempfile.TemporaryFile(mode="w+b")
        os.set_inheritable(self._file.fileno(), False)
        self.size = 0
        self.overflow = False

    def append(self, chunk: bytes) -> bool:
        remaining = MAX_CAPTURE_BYTES - self.size
        if remaining <= 0:
            self.overflow = True
            return True
        accepted = chunk[:remaining]
        if accepted:
            self._file.write(accepted)
            self.size += len(accepted)
        if len(accepted) != len(chunk):
            self.overflow = True
        return self.overflow

    def payload(self) -> bytes:
        self._file.flush()
        os.fsync(self._file.fileno())
        self._file.seek(0)
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = self._file.read(min(OUTPUT_READ_CHUNK_BYTES, MAX_CAPTURE_BYTES + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_CAPTURE_BYTES:
                raise RuntimeError("runner capture sink exceeded its fixed bound")
        return b"".join(chunks)

    def close(self) -> None:
        self._file.close()


def runner_error(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def parse_arguments(argv: list[str]) -> tuple[argparse.Namespace, list[str]]:
    if "--" not in argv:
        raise SystemExit("run-evidence requires '-- <target argv...>'")
    marker = argv.index("--")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", required=True)
    parser.add_argument("--crosswalk", required=True)
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--template", required=True)
    parser.add_argument("--source-preflight", required=True)
    parser.add_argument("--source-root")
    parser.add_argument("--renderer", required=True)
    parser.add_argument("--evidence-metrics", help="JSON array of per-metric evidence scope/gate/applicability results")
    parser.add_argument("--visual-metadata", help="JSON metadata with same-source visual evidence references")
    parser.add_argument("--supersedes-record-id", help="immutable predecessor record for the one permitted targeted retest")
    parser.add_argument("--handback-id", help="predecessor handback packet approving the targeted retest")
    parser.add_argument("--target-timeout-seconds", type=int, help="authority-bounded wall-clock target timeout")
    parser.add_argument("--force-validation-failure", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--test-spawn-ready-marker", help=argparse.SUPPRESS)
    parser.add_argument("--test-spawn-release-marker", help=argparse.SUPPRESS)
    args = parser.parse_args(argv[:marker])
    target = argv[marker + 1 :]
    if not target:
        parser.error("target argv is required after '--'")
    if not RUN_RE.fullmatch(args.run_id):
        parser.error("run-id must use RUN-YYYYMMDDTHHMMSSZ-<source8>-<seq>")
    if args.target_timeout_seconds is not None and args.target_timeout_seconds <= 0:
        parser.error("target timeout must be positive")
    return args, target


def captured_environment() -> dict[str, Any]:
    accepted = sorted(key for key in os.environ if key in {"PATH", "LANG", "LC_ALL", "RUSTUP_TOOLCHAIN", "CARGO_HOME"} or key.startswith("TESSERA_"))
    values = []
    for key in accepted:
        secret = bool(SECRET_RE.search(key))
        values.append({"name": key, "value": "<redacted>" if secret else os.environ[key], "redacted": secret})
    return {"schema_version": "tessera.iced.environment/v1", "variables": values}


def append_artifact(record: dict[str, Any], artifact_id: str, path: Path, run_dir: Path, required: bool = True, hash_budget: HashBudget | None = None) -> None:
    relative = path.relative_to(run_dir).as_posix()
    artifact_path = bundle_file(run_dir, relative)
    record.setdefault("artifacts", []).append(
        {
            "artifact_id": artifact_id,
            "path": relative,
            "media_type": artifact_media_type(artifact_path),
            "sha256": sha256_bundle_file(run_dir, relative, budget=hash_budget),
            "required_for_verdict": required,
        }
    )


def handback(record: dict[str, Any], run_dir: Path, target_argv: list[str]) -> Path:
    location = run_dir / "handback" / f"HB-{record['run']['run_id']}.json"
    write_json(
        location,
        {
            "handback_id": f"HB-{record['run']['run_id']}",
            "owner": "release/infra or mapped test owner",
            "gate": "G0",
            "requirement_ids": record["coverage_cell"]["test_requirement_ids"],
            "cell_id": record["coverage_cell"]["cell_id"],
            "factual_scope": "target did not produce a passing execution result",
            "smallest_corrective_action": "repair the observed failing command or unavailable environment",
            "targeted_retest_argv": target_argv,
            "required_follow_up_artifacts": ["stdout.log", "stderr.log", "validation.json"],
        },
        run_dir,
    )
    return location


def command_requires_release(record: dict[str, Any]) -> bool:
    return record.get("coverage_cell", {}).get("layer") in {"L3", "L4"} or record.get("run", {}).get("kind") in {"visual", "hardware", "performance", "soak"}


def renderer_features(target: list[str]) -> set[str]:
    values: list[str] = []
    for index, value in enumerate(target):
        if value == "--features" and index + 1 < len(target):
            values.append(target[index + 1])
        elif value.startswith("--features="):
            values.append(value.split("=", 1)[1])
    tokens = {token.strip() for value in values for token in re.split(r"[ ,]+", value) if token.strip()}
    return {token for token in tokens if token in {"renderer-wgpu", "renderer-tiny-skia"}}


def is_soak_record(record: dict[str, Any]) -> bool:
    return record.get("run", {}).get("kind") == "soak" or record.get("applicability", {}).get("soak", {}).get("state") == "applicable"


def configured_timeout(record: dict[str, Any], requested: int | None) -> int:
    soak = is_soak_record(record)
    default = G0_SOAK_DEFAULT_TARGET_TIMEOUT_SECONDS if soak else NON_SOAK_DEFAULT_TARGET_TIMEOUT_SECONDS
    maximum = G0_SOAK_MAX_TARGET_TIMEOUT_SECONDS if soak else NON_SOAK_MAX_TARGET_TIMEOUT_SECONDS
    timeout = default if requested is None else requested
    if timeout > maximum:
        raise ValueError(f"configured timeout {timeout} exceeds authority maximum {maximum}")
    if soak and timeout < SOAK_REQUIRED_WINDOW_SECONDS + SOAK_SETUP_GRACE_SECONDS:
        raise ValueError(
            f"G0 soak timeout {timeout} is below the required {SOAK_REQUIRED_WINDOW_SECONDS + SOAK_SETUP_GRACE_SECONDS} seconds"
        )
    return timeout


def _send_posix_group(process: subprocess.Popen[bytes], signum: int) -> bool:
    try:
        os.killpg(process.pid, signum)
        return True
    except ProcessLookupError:
        return True
    except Exception:
        return False


def _posix_target_group_exists(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False
    except Exception:
        return True


def _wait_posix_target_group_gone(pgid: int, timeout_seconds: float) -> bool:
    try:
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            if not _posix_target_group_exists(pgid):
                return True
            time.sleep(0.02)
        return not _posix_target_group_exists(pgid)
    except Exception:
        return False


def _reap_posix_target_group(process: subprocess.Popen[bytes]) -> bool:
    """Terminate the session created for one target and prove its group disappeared."""
    pgid = process.pid
    if _send_posix_group(process, signal.SIGTERM) and _wait_posix_target_group_gone(pgid, TERMINATION_GRACE_SECONDS):
        try:
            process.wait(timeout=PIPE_SEVER_GRACE_SECONDS)
            return True
        except Exception:
            pass
    if not _send_posix_group(process, signal.SIGKILL):
        return False
    if not _wait_posix_target_group_gone(pgid, PIPE_SEVER_GRACE_SECONDS):
        return False
    try:
        process.wait(timeout=PIPE_SEVER_GRACE_SECONDS)
        return True
    except Exception:
        return False


def _close_selector_stream(
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


def communicate_posix_target(
    process: subprocess.Popen[bytes],
    stdout_sink: CaptureSink,
    stderr_sink: CaptureSink,
    signal_received: Callable[[], int | None],
    timeout_seconds: int,
) -> TargetResult:
    result = TargetResult()
    selector: selectors.BaseSelector | None = None
    streams = {"stdout": process.stdout, "stderr": process.stderr}
    sinks = {"stdout": stdout_sink, "stderr": stderr_sink}
    started = time.monotonic()
    termination_started: float | None = None
    termination_deadline: float | None = None
    post_exit_deadline: float | None = None
    terminating = False
    killed = False
    cleanup_exhausted = False
    timeout_reported = False
    pipe_descendant_reported = False
    lifecycle_messages: list[str] = []

    def report_lifecycle(message: str) -> None:
        result.capture_terminal = False
        if message not in lifecycle_messages:
            lifecycle_messages.append(message)

    def flush_lifecycle() -> None:
        if lifecycle_messages:
            result.errors.append(runner_error("RUNNER_LIFECYCLE_UNCERTAIN", "; ".join(lifecycle_messages)))

    def send_group(signum: int) -> bool:
        if _send_posix_group(process, signum):
            return True
        report_lifecycle(f"cannot signal target process group with signal {signum}")
        return False

    def begin_termination(reason_signal: int) -> None:
        nonlocal terminating, termination_started, termination_deadline
        if not terminating:
            terminating = True
            termination_started = time.monotonic()
            termination_deadline = termination_started + TERMINATION_GRACE_SECONDS + PIPE_SEVER_GRACE_SECONDS
            send_group(reason_signal)

    def close_target_stream(selector_for_stream: selectors.BaseSelector | None, stream: Any, label: str) -> None:
        failures: list[str] = []
        if not _close_selector_stream(selector_for_stream, stream, failures):
            detail = "; ".join(failures) if failures else "unknown cleanup failure"
            report_lifecycle(f"cannot close target {label} capture stream: {detail}")

    def selector_entries() -> list[Any] | None:
        if selector is None:
            return []
        try:
            return list(selector.get_map().values())
        except Exception as exc:
            report_lifecycle(f"cannot inspect target capture selector lifecycle: {exc}")
            return None

    def close_capture_setup() -> None:
        nonlocal selector
        if selector is not None:
            keys: list[Any] = []
            try:
                keys = list(selector.get_map().values())
            except Exception as exc:
                report_lifecycle(f"cannot inspect target capture selector during cleanup: {exc}")
            for key in keys:
                try:
                    stream = key.fileobj
                except Exception as exc:
                    report_lifecycle(f"cannot inspect target capture stream during cleanup: {exc}")
                    continue
                try:
                    label = str(key.data)
                except Exception:
                    label = "registered"
                close_target_stream(selector, stream, label)
            for label, stream in streams.items():
                if stream is not None:
                    close_target_stream(None, stream, label)
            try:
                selector.close()
            except Exception as exc:
                report_lifecycle(f"cannot close target capture selector: {exc}")
            selector = None
        else:
            for label, stream in streams.items():
                if stream is not None:
                    close_target_stream(None, stream, label)

    try:
        selector = selectors.DefaultSelector()
        for label, stream in streams.items():
            if stream is None:
                continue
            os.set_inheritable(stream.fileno(), False)
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, label)
        while True:
            entries = selector_entries()
            if entries is None:
                begin_termination(signal.SIGTERM)
                break
            if not entries and process.poll() is not None:
                break
            now = time.monotonic()
            received = signal_received()
            if received is not None:
                begin_termination(received)
            if now - started >= timeout_seconds and not timeout_reported:
                timeout_reported = True
                result.errors.append(runner_error("TARGET_TIMEOUT", f"target exceeded {timeout_seconds}-second wall-clock timeout"))
                begin_termination(signal.SIGTERM)
            if stdout_sink.overflow or stderr_sink.overflow:
                if not any(error["code"] == "RUNNER_OUTPUT_LIMIT" for error in result.errors):
                    result.errors.append(runner_error("RUNNER_OUTPUT_LIMIT", f"stdout/stderr capture exceeds {MAX_CAPTURE_BYTES} bytes"))
                begin_termination(signal.SIGTERM)
            if terminating and not killed and termination_started is not None and now - termination_started >= TERMINATION_GRACE_SECONDS:
                send_group(signal.SIGKILL)
                killed = True
            if terminating and termination_deadline is not None and now >= termination_deadline:
                if not killed:
                    send_group(signal.SIGKILL)
                    killed = True
                if process.poll() is None or _posix_target_group_exists(process.pid):
                    report_lifecycle("process group did not terminate before bounded cleanup deadline")
                cleanup_exhausted = True
                close_capture_setup()
                break
            if process.poll() is not None and post_exit_deadline is None and entries:
                post_exit_deadline = now + POST_EXIT_DRAIN_SECONDS
            if post_exit_deadline is not None and now >= post_exit_deadline and entries:
                if not pipe_descendant_reported:
                    result.errors.append(
                        runner_error(
                            "RUNNER_PIPE_DESCENDANT",
                            "target exited while a descendant retained an inherited output pipe",
                        )
                    )
                    pipe_descendant_reported = True
                send_group(signal.SIGKILL)
                sever_deadline = time.monotonic() + PIPE_SEVER_GRACE_SECONDS
                if termination_deadline is not None:
                    sever_deadline = min(sever_deadline, termination_deadline)
                while time.monotonic() < sever_deadline:
                    remaining_entries = selector_entries()
                    if not remaining_entries:
                        break
                    for key, _mask in selector.select(timeout=min(0.05, max(0.0, sever_deadline - time.monotonic()))):
                        stream = key.fileobj
                        label = str(key.data)
                        try:
                            chunk = os.read(stream.fileno(), OUTPUT_READ_CHUNK_BYTES)
                        except BlockingIOError:
                            continue
                        if not chunk:
                            close_target_stream(selector, stream, label)
                            continue
                        sinks[label].append(chunk)
                remaining_entries = selector_entries()
                if remaining_entries is not None:
                    for key in remaining_entries:
                        close_target_stream(selector, key.fileobj, str(key.data))
                break
            select_timeout = 0.05
            if termination_deadline is not None:
                select_timeout = min(select_timeout, max(0.0, termination_deadline - time.monotonic()))
            for key, _mask in selector.select(timeout=select_timeout):
                stream = key.fileobj
                label = str(key.data)
                try:
                    chunk = os.read(stream.fileno(), OUTPUT_READ_CHUNK_BYTES)
                except BlockingIOError:
                    continue
                if not chunk:
                    close_target_stream(selector, stream, label)
                    continue
                sinks[label].append(chunk)
        if cleanup_exhausted:
            try:
                process.wait(timeout=0)
            except (OSError, subprocess.TimeoutExpired):
                pass
        elif process.poll() is None:
            try:
                process.wait(timeout=PIPE_SEVER_GRACE_SECONDS)
            except (OSError, subprocess.TimeoutExpired):
                if not _reap_posix_target_group(process):
                    report_lifecycle("process group did not terminate after bounded cleanup")
        if not cleanup_exhausted and _posix_target_group_exists(process.pid) and not _reap_posix_target_group(process):
            report_lifecycle("process group remained after target completion")
    except Exception as exc:
        result.errors.append(runner_error("RUNNER_START", f"cannot initialize target capture lifecycle: {exc}"))
        result.capture_terminal = False
        close_capture_setup()
        if not _reap_posix_target_group(process):
            report_lifecycle("process group did not terminate after capture setup failure")
    finally:
        close_capture_setup()
        flush_lifecycle()

    if timeout_reported:
        result.exit_code = 124
    elif process.returncode is not None:
        result.exit_code = process.returncode
    else:
        result.exit_code = 125
    return result


def _windows_kernel32() -> Any:
    if os.name != "nt":
        raise RuntimeError("Windows Job Object path is unavailable on this platform")
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CloseHandle.argtypes = [HANDLE]
    kernel32.CloseHandle.restype = BOOL
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
    kernel32.WaitForSingleObject.argtypes = [HANDLE, DWORD]
    kernel32.WaitForSingleObject.restype = DWORD
    kernel32.TerminateJobObject.argtypes = [HANDLE, DWORD]
    kernel32.TerminateJobObject.restype = BOOL
    kernel32.TerminateProcess.argtypes = [HANDLE, DWORD]
    kernel32.TerminateProcess.restype = BOOL
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
    kernel32.AssignProcessToJobObject.argtypes = [HANDLE, HANDLE]
    kernel32.AssignProcessToJobObject.restype = BOOL
    kernel32.ResumeThread.argtypes = [HANDLE]
    kernel32.ResumeThread.restype = DWORD
    kernel32.GetExitCodeProcess.argtypes = [HANDLE, ctypes.POINTER(DWORD)]
    kernel32.GetExitCodeProcess.restype = BOOL
    return kernel32


def _windows_last_error(kernel32: Any | None = None) -> int:
    if kernel32 is not None and hasattr(kernel32, "GetLastError"):
        try:
            return int(kernel32.GetLastError())
        except Exception:
            pass
    get_last_error = getattr(ctypes, "get_last_error", None)
    return int(get_last_error()) if get_last_error is not None else 0


def _windows_close(handle: int | None, kernel32: Any | None = None) -> None:
    if handle:
        kernel32 = kernel32 or _windows_kernel32()
        if not kernel32.CloseHandle(HANDLE(handle)):
            raise OSError(_windows_last_error(kernel32), "CloseHandle failed")


def _windows_create_pipe(kernel32: Any | None = None) -> tuple[int, int]:
    kernel32 = kernel32 or _windows_kernel32()
    attributes = _WinSecurityAttributes(ctypes.sizeof(_WinSecurityAttributes), None, 1)
    read_handle = HANDLE()
    write_handle = HANDLE()
    if not kernel32.CreatePipe(ctypes.byref(read_handle), ctypes.byref(write_handle), ctypes.byref(attributes), DWORD(0)):
        raise OSError(_windows_last_error(kernel32), "CreatePipe failed")
    try:
        if not kernel32.SetHandleInformation(read_handle, DWORD(_WIN_HANDLE_FLAG_INHERIT), DWORD(0)):
            raise OSError(_windows_last_error(kernel32), "SetHandleInformation failed")
        if not kernel32.SetHandleInformation(write_handle, DWORD(_WIN_HANDLE_FLAG_INHERIT), DWORD(_WIN_HANDLE_FLAG_INHERIT)):
            raise OSError(_windows_last_error(kernel32), "SetHandleInformation failed")
        return int(read_handle.value), int(write_handle.value)
    except Exception:
        _windows_close(int(read_handle.value) if read_handle.value else None, kernel32)
        _windows_close(int(write_handle.value) if write_handle.value else None, kernel32)
        raise


def _windows_pipe_reader(
    handle: int,
    sink: CaptureSink,
    reader_errors: list[dict[str, str]],
    severed: threading.Event,
    kernel32: Any | None = None,
) -> None:
    kernel32 = kernel32 or _windows_kernel32()
    buffer = ctypes.create_string_buffer(OUTPUT_READ_CHUNK_BYTES)
    while True:
        read = DWORD()
        if not kernel32.ReadFile(HANDLE(handle), buffer, DWORD(len(buffer)), ctypes.byref(read), None):
            error = _windows_last_error(kernel32)
            if error == _WIN_ERROR_BROKEN_PIPE or (error == _WIN_ERROR_OPERATION_ABORTED and severed.is_set()):
                return
            reader_errors.append(runner_error("RUNNER_PIPE_READ", f"ReadFile failed: {error}"))
            return
        if read.value == 0:
            return
        sink.append(buffer.raw[: int(read.value)])


def _windows_create_nul_stdin(kernel32: Any | None = None) -> int:
    kernel32 = kernel32 or _windows_kernel32()
    handle = kernel32.CreateFileW(
        "NUL",
        DWORD(_WIN_GENERIC_READ),
        DWORD(_WIN_FILE_SHARE_READ | _WIN_FILE_SHARE_WRITE),
        None,
        DWORD(_WIN_OPEN_EXISTING),
        DWORD(0),
        None,
    )
    invalid = HANDLE(-1).value
    if handle in {None, invalid}:
        raise OSError(_windows_last_error(kernel32), "CreateFileW(NUL) failed")
    result = int(handle)
    try:
        if not kernel32.SetHandleInformation(
            HANDLE(result),
            DWORD(_WIN_HANDLE_FLAG_INHERIT),
            DWORD(_WIN_HANDLE_FLAG_INHERIT),
        ):
            raise OSError(_windows_last_error(kernel32), "SetHandleInformation(NUL) failed")
        return result
    except Exception:
        _windows_close(result, kernel32)
        raise


def _windows_create_handle_list(kernel32: Any, handles: tuple[int, int, int]) -> tuple[Any, PVOID]:
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


def _windows_sever_read_handle(handle: int | None, kernel32: Any | None = None) -> None:
    if handle is None:
        return
    kernel32 = kernel32 or _windows_kernel32()
    if not kernel32.CancelIoEx(HANDLE(handle), None):
        error = _windows_last_error(kernel32)
        if error != _WIN_ERROR_NOT_FOUND:
            raise OSError(error, "CancelIoEx failed")
    _windows_close(handle, kernel32)


def _windows_create_job(kernel32: Any | None = None) -> int:
    kernel32 = kernel32 or _windows_kernel32()
    handle = kernel32.CreateJobObjectW(None, None)
    if not handle:
        raise OSError(_windows_last_error(kernel32), "CreateJobObjectW failed")
    job = int(handle)
    try:
        limits = _WinExtendedLimitInformation()
        # Intentionally only KILL_ON_JOB_CLOSE: neither breakaway flag is set.
        limits.BasicLimitInformation.LimitFlags = _WIN_JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not kernel32.SetInformationJobObject(
            HANDLE(job),
            WIN32_ENUM(_WIN_JOB_OBJECT_EXTENDED_LIMIT_INFORMATION),
            ctypes.byref(limits),
            DWORD(ctypes.sizeof(limits)),
        ):
            raise OSError(_windows_last_error(kernel32), "SetInformationJobObject failed")
        if not kernel32.SetHandleInformation(HANDLE(job), DWORD(_WIN_HANDLE_FLAG_INHERIT), DWORD(0)):
            raise OSError(_windows_last_error(kernel32), "SetHandleInformation(job) failed")
        return job
    except Exception:
        _windows_close(job, kernel32)
        raise


def _windows_wait(handle: int, timeout_seconds: float, kernel32: Any | None = None) -> int:
    milliseconds = _WIN_INFINITE if timeout_seconds < 0 else min(int(timeout_seconds * 1000), _WIN_INFINITE - 1)
    return int((kernel32 or _windows_kernel32()).WaitForSingleObject(HANDLE(handle), DWORD(milliseconds)))


def _windows_terminate_job(job: int, kernel32: Any | None = None) -> None:
    kernel32 = kernel32 or _windows_kernel32()
    if not kernel32.TerminateJobObject(HANDLE(job), DWORD(1)):
        raise OSError(_windows_last_error(kernel32), "TerminateJobObject failed")


def _windows_terminate_process(process_handle: int | None, kernel32: Any | None = None) -> None:
    if process_handle is None:
        return
    kernel32 = kernel32 or _windows_kernel32()
    if not kernel32.TerminateProcess(HANDLE(process_handle), DWORD(1)):
        raise OSError(_windows_last_error(kernel32), "TerminateProcess failed")


def _windows_lifecycle_uncertain(result: TargetResult, message: str) -> None:
    result.errors.append(runner_error("RUNNER_LIFECYCLE_UNCERTAIN", message))
    result.capture_terminal = False


def _windows_wait_for_termination(
    result: TargetResult,
    handle: int | None,
    label: str,
    timeout_seconds: float,
    kernel32: Any,
) -> bool:
    if handle is None:
        return True
    try:
        state = _windows_wait(handle, timeout_seconds, kernel32)
    except OSError as exc:
        _windows_lifecycle_uncertain(result, f"cannot wait for {label} termination: {exc}")
        return False
    if state == _WIN_WAIT_OBJECT_0:
        return True
    if state == _WIN_WAIT_TIMEOUT:
        _windows_lifecycle_uncertain(result, f"lifecycle uncertainty: {label} did not signal before bounded wait")
        return False
    if state == 0xFFFFFFFF:
        _windows_lifecycle_uncertain(
            result,
            f"lifecycle uncertainty: WaitForSingleObject({label}) failed: {_windows_last_error(kernel32)}",
        )
        return False
    _windows_lifecycle_uncertain(result, f"lifecycle uncertainty: WaitForSingleObject({label}) returned {state}")
    return False


def communicate_windows_target(
    target: list[str],
    stdout_sink: CaptureSink,
    stderr_sink: CaptureSink,
    signal_received: Callable[[], int | None],
    timeout_seconds: int,
    *,
    kernel32: Any | None = None,
) -> TargetResult:
    kernel32 = kernel32 or _windows_kernel32()
    job: int | None = None
    process_handle: int | None = None
    thread_handle: int | None = None
    stdin_handle: int | None = None
    stdout_read: int | None = None
    stdout_write: int | None = None
    stderr_read: int | None = None
    stderr_write: int | None = None
    attribute_list: PVOID | None = None
    attribute_storage: Any = None
    result = TargetResult()
    readers: list[threading.Thread] = []
    reader_errors: list[dict[str, str]] = []
    pipes_severed = threading.Event()
    terminated = False
    timeout_reported = False
    overflow_reported = False
    process_exited_at: float | None = None
    assigned_to_job = False
    try:
        job = _windows_create_job(kernel32)
        stdin_handle = _windows_create_nul_stdin(kernel32)
        stdout_read, stdout_write = _windows_create_pipe(kernel32)
        stderr_read, stderr_write = _windows_create_pipe(kernel32)
        startup = _WinStartupInfoEx()
        startup.StartupInfo.cb = ctypes.sizeof(_WinStartupInfoEx)
        startup.StartupInfo.dwFlags = _WIN_STARTF_USESTDHANDLES
        startup.StartupInfo.hStdInput = HANDLE(stdin_handle)
        startup.StartupInfo.hStdOutput = HANDLE(stdout_write)
        startup.StartupInfo.hStdError = HANDLE(stderr_write)
        attribute_storage, attribute_list = _windows_create_handle_list(kernel32, (stdin_handle, stdout_write, stderr_write))
        startup.lpAttributeList = attribute_list
        process_info = _WinProcessInformation()
        command = ctypes.create_unicode_buffer(subprocess.list2cmdline(target))
        try:
            if not kernel32.CreateProcessW(
                None,
                command,
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
        finally:
            if attribute_list is not None:
                kernel32.DeleteProcThreadAttributeList(attribute_list)
                attribute_list = None
        process_handle = int(process_info.hProcess)
        thread_handle = int(process_info.hThread)
        if not kernel32.AssignProcessToJobObject(HANDLE(job), HANDLE(process_handle)):
            raise OSError(_windows_last_error(kernel32), "AssignProcessToJobObject failed")
        assigned_to_job = True
        resume_result = kernel32.ResumeThread(HANDLE(thread_handle))
        if resume_result == 0xFFFFFFFF:
            raise OSError(_windows_last_error(kernel32), "ResumeThread failed")
        _windows_close(thread_handle, kernel32)
        thread_handle = None
        _windows_close(stdin_handle, kernel32)
        stdin_handle = None
        _windows_close(stdout_write, kernel32)
        stdout_write = None
        _windows_close(stderr_write, kernel32)
        stderr_write = None
        readers = [
            threading.Thread(target=_windows_pipe_reader, args=(stdout_read, stdout_sink, reader_errors, pipes_severed, kernel32), name="tessera-stdout-reader"),
            threading.Thread(target=_windows_pipe_reader, args=(stderr_read, stderr_sink, reader_errors, pipes_severed, kernel32), name="tessera-stderr-reader"),
        ]
        for reader in readers:
            reader.start()
        started = time.monotonic()
        while True:
            now = time.monotonic()
            received = signal_received()
            if received is not None and not terminated:
                _windows_terminate_job(job, kernel32)
                terminated = True
            if now - started >= timeout_seconds and not timeout_reported:
                result.errors.append(runner_error("TARGET_TIMEOUT", f"target exceeded {timeout_seconds}-second wall-clock timeout"))
                timeout_reported = True
                _windows_terminate_job(job, kernel32)
                terminated = True
            if (stdout_sink.overflow or stderr_sink.overflow) and not overflow_reported:
                result.errors.append(runner_error("RUNNER_OUTPUT_LIMIT", f"stdout/stderr capture exceeds {MAX_CAPTURE_BYTES} bytes"))
                overflow_reported = True
                _windows_terminate_job(job, kernel32)
                terminated = True
            state = _windows_wait(process_handle, 0.05, kernel32)
            if state == _WIN_WAIT_OBJECT_0:
                if process_exited_at is None:
                    process_exited_at = now
                if _windows_wait(job, 0.0, kernel32) == _WIN_WAIT_OBJECT_0:
                    break
                if now - process_exited_at >= POST_EXIT_DRAIN_SECONDS:
                    result.errors.append(
                        runner_error(
                            "RUNNER_PIPE_DESCENDANT",
                            "target exited while a Job Object process retained an inherited output pipe",
                        )
                    )
                    _windows_terminate_job(job, kernel32)
                    terminated = True
                    if _windows_wait(job, PIPE_SEVER_GRACE_SECONDS, kernel32) != _WIN_WAIT_OBJECT_0:
                        result.errors.append(runner_error("RUNNER_LIFECYCLE_UNCERTAIN", "Job Object did not terminate after bounded cleanup"))
                    break
            elif state != _WIN_WAIT_TIMEOUT:
                result.errors.append(runner_error("RUNNER_WAIT", f"WaitForSingleObject(process) returned {state}"))
                _windows_terminate_job(job, kernel32)
                terminated = True
                break
        if process_handle is not None:
            exit_code = DWORD()
            if kernel32.GetExitCodeProcess(HANDLE(process_handle), ctypes.byref(exit_code)):
                result.exit_code = 124 if timeout_reported else int(exit_code.value)
    except (OSError, RuntimeError) as exc:
        result.errors.append(runner_error("RUNNER_WINDOWS_LAUNCH", str(exc)))
        if process_handle is not None and not assigned_to_job:
            try:
                _windows_terminate_process(process_handle, kernel32)
            except OSError as terminate_error:
                _windows_lifecycle_uncertain(result, f"cannot terminate raw suspended process after launch failure: {terminate_error}")
            else:
                _windows_wait_for_termination(
                    result,
                    process_handle,
                    "raw suspended process after launch failure",
                    PIPE_SEVER_GRACE_SECONDS,
                    kernel32,
                )
        elif job is not None:
            try:
                _windows_terminate_job(job, kernel32)
            except OSError as terminate_error:
                _windows_lifecycle_uncertain(result, f"cannot terminate Job Object after launch failure: {terminate_error}")
            else:
                _windows_wait_for_termination(
                    result,
                    process_handle,
                    "Job Object process after launch failure",
                    PIPE_SEVER_GRACE_SECONDS,
                    kernel32,
                )
                _windows_wait_for_termination(
                    result,
                    job,
                    "Job Object after launch failure",
                    PIPE_SEVER_GRACE_SECONDS,
                    kernel32,
                )
    finally:
        if attribute_list is not None:
            try:
                kernel32.DeleteProcThreadAttributeList(attribute_list)
            except OSError as exc:
                _windows_lifecycle_uncertain(result, f"cannot delete process attribute list: {exc}")
        if job is not None and process_handle is not None:
            _windows_wait_for_termination(result, process_handle, "process before handle close", PIPE_SEVER_GRACE_SECONDS, kernel32)
            _windows_wait_for_termination(result, job, "Job Object before handle close", PIPE_SEVER_GRACE_SECONDS, kernel32)
        pipes_severed.set()
        try:
            _windows_sever_read_handle(stdout_read, kernel32)
        except OSError as exc:
            result.errors.append(runner_error("RUNNER_PIPE_SEVER", f"cannot sever stdout pipe: {exc}"))
        stdout_read = None
        try:
            _windows_sever_read_handle(stderr_read, kernel32)
        except OSError as exc:
            result.errors.append(runner_error("RUNNER_PIPE_SEVER", f"cannot sever stderr pipe: {exc}"))
        stderr_read = None
        for reader in readers:
            reader.join(timeout=PIPE_SEVER_GRACE_SECONDS)
            if reader.is_alive():
                result.errors.append(runner_error("RUNNER_LIFECYCLE_UNCERTAIN", "Windows pipe reader did not join after handle sever"))
                result.capture_terminal = False
        result.errors.extend(reader_errors)
        if reader_errors:
            result.capture_terminal = False
        for label, handle in (
            ("stdin", stdin_handle),
            ("stdout write", stdout_write),
            ("stderr write", stderr_write),
            ("thread", thread_handle),
            ("process", process_handle),
            ("Job Object", job),
        ):
            if handle is not None:
                try:
                    _windows_close(handle, kernel32)
                except OSError as exc:
                    _windows_lifecycle_uncertain(result, f"cannot close {label} handle: {exc}")
        attribute_storage = None
    return result


def wait_for_test_spawn_release(args: argparse.Namespace, signal_received: Callable[[], int | None]) -> str | None:
    """Test-only deterministic barrier for pre-spawn signal and output-poisoning checks."""
    if not args.test_spawn_ready_marker and not args.test_spawn_release_marker:
        return None
    if not args.test_spawn_ready_marker or not args.test_spawn_release_marker:
        return "test spawn barrier requires both marker paths"
    ready = Path(args.test_spawn_ready_marker)
    release = Path(args.test_spawn_release_marker)
    ready.parent.mkdir(parents=True, exist_ok=True)
    ready.write_text("ready\n", encoding="utf-8")
    deadline = time.monotonic() + 5.0
    while signal_received() is None and not _marker_present(release) and time.monotonic() < deadline:
        time.sleep(0.005)
    if signal_received() is not None or _marker_present(release):
        return None
    return "test spawn barrier timed out waiting for release"


def _marker_present(path: Path) -> bool:
    try:
        os.lstat(path)
        return True
    except FileNotFoundError:
        return False


def _predecessor_run_id(record_id: str) -> str | None:
    if not record_id.startswith("EV-") or "-T-G0-" not in record_id:
        return None
    candidate = record_id[3:].rsplit("-T-G0-", 1)[0]
    return candidate if RUN_RE.fullmatch(candidate) else None


def prior_record_index(root: Path, current_record: dict[str, Any], current_run_dir: Path) -> dict[str, dict[str, Any]]:
    """Initial runs return immediately; retests open only their named predecessor."""
    index: dict[str, dict[str, Any]] = {
        current_record["record_id"]: {"record": current_record, "run_dir": current_run_dir, "immutable": False, "valid": None}
    }
    supersedes = current_record.get("supersedes_record_id")
    if not isinstance(supersedes, str):
        return index
    predecessor_run_id = _predecessor_run_id(supersedes)
    if predecessor_run_id is None:
        return index
    bundle = root / predecessor_run_id
    try:
        bundle_file(bundle, "payload-manifest.json")
        bundle_file(bundle, "provenance-attestation.json")
        bundle_file(bundle, "evidence.json")
        bundle_file(bundle, "validation.json")
        record = load_bundle_json(bundle, "evidence.json", MAX_PRIOR_RECORD_BYTES)
        validation = load_bundle_json(bundle, "validation.json", MAX_PRIOR_RECORD_BYTES)
    except (OSError, ValueError, json.JSONDecodeError):
        return index
    if isinstance(record, dict) and record.get("record_id") == supersedes and isinstance(validation, dict):
        index[supersedes] = {
            "record": record,
            "run_dir": bundle,
            "immutable": True,
            "valid": validation.get("evidence_valid") is True,
        }
    return index


def prelaunch_prior_record_index(root: Path, current_record: dict[str, Any], current_run_dir: Path, target_argv: list[str]) -> tuple[dict[str, dict[str, Any]], list[dict[str, str]]]:
    """Build the only retest predecessor snapshot before untrusted target code starts."""
    index: dict[str, dict[str, Any]] = {
        current_record["record_id"]: {
            "record": current_record,
            "run_dir": current_run_dir,
            "immutable": False,
            "valid": None,
            "command_argv": list(target_argv),
        }
    }
    errors: list[dict[str, str]] = []
    supersedes = current_record.get("supersedes_record_id")
    handback_id = current_record.get("handback_id")
    if not isinstance(supersedes, str):
        return index, errors
    if not isinstance(handback_id, str):
        return index, [runner_error("RUNNER_RETEST_INPUT", "a retest requires a predecessor record and handback ID")]
    predecessor_run_id = _predecessor_run_id(supersedes)
    if predecessor_run_id is None:
        return index, [runner_error("RUNNER_PREDECESSOR_ID", "supersedes_record_id does not encode a legal predecessor run")]
    bundle = root / predecessor_run_id
    try:
        predecessor = load_bundle_json(bundle, "evidence.json", MAX_PRIOR_RECORD_BYTES)
        validation = load_bundle_json(bundle, "validation.json", MAX_PRIOR_RECORD_BYTES)
        manifest = load_bundle_json(bundle, "payload-manifest.json", MAX_PRIOR_RECORD_BYTES)
        provenance = load_bundle_json(bundle, "provenance-attestation.json", MAX_PRIOR_RECORD_BYTES)
        handback_packet = load_bundle_json(bundle, f"handback/{handback_id}.json", MAX_PRIOR_RECORD_BYTES)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return index, [runner_error("RUNNER_PREDECESSOR_MISSING", f"cannot read complete predecessor snapshot before target launch: {exc}")]
    if not isinstance(predecessor, dict) or predecessor.get("record_id") != supersedes:
        errors.append(runner_error("RUNNER_PREDECESSOR_IDENTITY", "predecessor evidence identity does not match supersedes_record_id"))
    if not isinstance(validation, dict) or validation.get("evidence_valid") is not True:
        errors.append(runner_error("RUNNER_PREDECESSOR_VALIDATION", "predecessor validation is absent or not true"))
    if not isinstance(manifest, dict) or not isinstance(provenance, dict):
        errors.append(runner_error("RUNNER_PREDECESSOR_ENVELOPE", "predecessor manifest and provenance must be JSON objects"))
    if predecessor.get("retest_ordinal") != 0 or predecessor.get("supersedes_record_id") is not None:
        errors.append(runner_error("RUNNER_PREDECESSOR_RETEST", "predecessor must be the original non-retest record"))
    if (
        source_identity(predecessor.get("source", {})) != source_identity(current_record.get("source", {}))
        or predecessor.get("coverage_cell", {}).get("cell_id") != current_record.get("coverage_cell", {}).get("cell_id")
        or predecessor.get("run", {}).get("test_id") != current_record.get("run", {}).get("test_id")
    ):
        errors.append(runner_error("RUNNER_PREDECESSOR_SCOPE", "predecessor source, cell, and test must match the retest"))
    if not isinstance(handback_packet, dict) or handback_packet.get("handback_id") != handback_id:
        errors.append(runner_error("RUNNER_PREDECESSOR_HANDBACK", "predecessor handback packet is absent or mismatched"))
    elif handback_packet.get("cell_id") != current_record.get("coverage_cell", {}).get("cell_id") or handback_packet.get("targeted_retest_argv") != target_argv:
        errors.append(runner_error("RUNNER_PREDECESSOR_TARGETED", "predecessor handback does not approve this target argv and cell"))
    if errors:
        return index, errors
    index[supersedes] = {
        "record": copy.deepcopy(predecessor),
        "run_dir": bundle,
        "immutable": True,
        "valid": True,
        "prelaunch_verified": True,
        "validation": copy.deepcopy(validation),
        "manifest": copy.deepcopy(manifest),
        "provenance": copy.deepcopy(provenance),
        "handback": copy.deepcopy(handback_packet),
    }
    return index, []


def _lexically_within(root: Path, possible_parent: Path) -> bool:
    try:
        return os.path.commonpath([os.path.abspath(os.fspath(root)), os.path.abspath(os.fspath(possible_parent))]) == os.path.abspath(os.fspath(possible_parent))
    except ValueError:
        return False


def _publish_capture_bytes(payload: bytes, destination: Path, run_dir: Path) -> dict[str, str] | None:
    try:
        from evidence_contract import atomic_write_bytes

        atomic_write_bytes(destination, payload, run_dir)
        return None
    except BundlePathError as exc:
        if destination.name in {"stdout.log", "stderr.log"} and exc.code == "BUNDLE_SYMLINK":
            code = "RUNNER_STDIO_SYMLINK"
        else:
            code = "RUNNER_CAPTURE_PUBLISH"
        return runner_error(code, f"cannot publish {destination.name}: {exc}")
    except (OSError, RuntimeError) as exc:
        return runner_error("RUNNER_CAPTURE_PUBLISH", f"cannot publish {destination.name}: {exc}")


def _publish_capture(sink: CaptureSink, destination: Path, run_dir: Path) -> dict[str, str] | None:
    try:
        payload = sink.payload()
    except RuntimeError as exc:
        return runner_error("RUNNER_CAPTURE_PUBLISH", f"cannot publish {destination.name}: {exc}")
    return _publish_capture_bytes(payload, destination, run_dir)


def _append_artifacts(
    record: dict[str, Any],
    run_dir: Path,
    entries: tuple[tuple[str, Path], ...],
    runner_errors: list[dict[str, str]],
    hash_budget: HashBudget | None = None,
) -> None:
    for artifact_id, path in entries:
        try:
            append_artifact(record, artifact_id, path, run_dir, hash_budget=hash_budget)
        except (OSError, ValueError) as exc:
            runner_errors.append(runner_error("RUNNER_ARTIFACT_PUBLISH", f"cannot attest {artifact_id}: {exc}"))


def run(argv: list[str]) -> int:
    args, target = parse_arguments(argv)
    catalog_path = Path(args.catalog)
    crosswalk_path = Path(args.crosswalk)
    authority_errors = validate_authority_files(catalog_path, crosswalk_path)
    if authority_errors:
        raise SystemExit("; ".join(error["message"] for error in authority_errors))
    catalog = load_json(catalog_path)
    crosswalk = load_json(crosswalk_path)
    template = copy.deepcopy(load_json(Path(args.template)))
    preflight = load_json(Path(args.source_preflight))
    root = Path(os.path.abspath(os.fspath(args.evidence_root)))
    if args.source_root and _lexically_within(root, Path(args.source_root)):
        raise SystemExit("evidence-root must be outside source-root")
    run_dir = create_secure_bundle(root, args.run_id)

    signal_received: int | None = None

    def receive_signal(signum: int, _frame: Any) -> None:
        nonlocal signal_received
        if signal_received is None:
            signal_received = signum

    old_int = signal.signal(signal.SIGINT, receive_signal)
    old_term = signal.signal(signal.SIGTERM, receive_signal)
    stdout_sink = CaptureSink()
    stderr_sink = CaptureSink()
    try:
        record = template
        record["run"]["run_id"] = args.run_id
        record["run"]["started_at"] = utc_now()
        record["record_id"] = f"EV-{args.run_id}-{record['run']['test_id']}"
        record["source"]["preflight"] = preflight
        record["authority"] = {
            "catalog_version": "coverage-g0-v1",
            "catalog_sha256": FROZEN_CATALOG_FILE_SHA256,
            "crosswalk_sha256": FROZEN_CROSSWALK_FILE_SHA256,
            "catalog_artifact_id": "ART-authority-catalog",
            "crosswalk_artifact_id": "ART-authority-crosswalk",
        }
        record["runner"]["runner_version"] = VALIDATOR_VERSION
        record["runner"]["bundle_created_before_target"] = True
        record["runner"]["finalization_once"] = True
        record["runner"]["finalized_by"] = "exit_trap"
        record["artifacts"] = []
        record["supersedes_record_id"] = args.supersedes_record_id
        record["retest_ordinal"] = 1 if args.supersedes_record_id else 0
        record["handback_id"] = args.handback_id

        authority_catalog = run_dir / "authority" / "coverage-g0-v1.json"
        authority_crosswalk = run_dir / "authority" / "crosswalk-g0-v1.json"
        command_path = run_dir / "command.argv.json"
        environment_path = run_dir / "environment.json"
        preflight_path = run_dir / "source-preflight.json"
        stdout_path = run_dir / "stdout.log"
        stderr_path = run_dir / "stderr.log"
        from evidence_contract import atomic_write_bytes

        atomic_write_bytes(authority_catalog, read_limited(catalog_path, MAX_JSON_BYTES), run_dir)
        atomic_write_bytes(authority_crosswalk, read_limited(crosswalk_path, MAX_JSON_BYTES), run_dir)
        write_json(command_path, {"argv": target}, run_dir)
        write_json(environment_path, captured_environment(), run_dir)
        write_json(preflight_path, preflight, run_dir)

        runner_errors: list[dict[str, str]] = []
        if bool(args.supersedes_record_id) != bool(args.handback_id):
            runner_errors.append(runner_error("RUNNER_RETEST_INPUT", "a retest requires both predecessor record and handback IDs"))
        if args.evidence_metrics:
            try:
                record["evidence_metrics"] = load_json(Path(args.evidence_metrics))
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                runner_errors.append(runner_error("RUNNER_INPUT", f"cannot load evidence metrics: {exc}"))
        if args.visual_metadata:
            try:
                if not isinstance(record.get("visual"), dict):
                    raise ValueError("visual metadata was supplied for a non-visual evidence template")
                record["visual"]["metadata"] = load_json(Path(args.visual_metadata))
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                runner_errors.append(runner_error("RUNNER_INPUT", f"cannot load visual metadata: {exc}"))
        preflight_errors: list[dict[str, str]] = []
        validate_source(record.get("source", {}), preflight_errors)
        for error in preflight_errors:
            runner_errors.append(runner_error("RUNNER_PREFLIGHT", error["message"]))
        if command_requires_release(record) and ("--release" not in target or "--locked" not in target):
            runner_errors.append(runner_error("RUNNER_RELEASE_FLAGS", "release/locked flags are required for visual, hardware, performance, and soak cells"))
        features = renderer_features(target)
        if args.renderer == "not_applicable" and command_requires_release(record):
            runner_errors.append(runner_error("RUNNER_RENDERER", "release evidence requires exactly one renderer"))
        if len(features) > 1:
            runner_errors.append(runner_error("RUNNER_RENDERER", "target argv names multiple renderer features"))
        if command_requires_release(record) and len(features) != 1:
            runner_errors.append(runner_error("RUNNER_RENDERER", "release target must select exactly one renderer feature"))
        try:
            timeout_seconds = configured_timeout(record, args.target_timeout_seconds)
        except ValueError as exc:
            timeout_seconds = DEFAULT_TARGET_TIMEOUT_SECONDS
            runner_errors.append(runner_error("TARGET_TIMEOUT_POLICY", str(exc)))
        record_index, prelaunch_errors = prelaunch_prior_record_index(root, record, run_dir, target)
        runner_errors.extend(prelaunch_errors)

        observed_exit = 125
        capture_terminal = True
        barrier_error = wait_for_test_spawn_release(args, lambda: signal_received) if not runner_errors else None
        if barrier_error:
            runner_errors.append(runner_error("RUNNER_SPAWN_BARRIER", barrier_error))
        elif signal_received is not None:
            observed_exit = 128 + signal_received
        elif not runner_errors:
            try:
                if os.name == "nt":
                    target_result = communicate_windows_target(target, stdout_sink, stderr_sink, lambda: signal_received, timeout_seconds)
                else:
                    process = subprocess.Popen(
                        target,
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        start_new_session=True,
                        close_fds=True,
                    )
                    target_result = communicate_posix_target(process, stdout_sink, stderr_sink, lambda: signal_received, timeout_seconds)
                observed_exit = target_result.exit_code
                capture_terminal = target_result.capture_terminal
                runner_errors.extend(target_result.errors)
            except OSError as exc:
                runner_errors.append(runner_error("RUNNER_START", f"runner could not start target: {exc}"))
                observed_exit = 125

        if capture_terminal:
            publish_errors = (
                _publish_capture(stdout_sink, stdout_path, run_dir),
                _publish_capture(stderr_sink, stderr_path, run_dir),
            )
        else:
            publish_errors = (
                _publish_capture_bytes(b"", stdout_path, run_dir),
                _publish_capture_bytes(b"runner capture lifecycle was not terminal; target output withheld\n", stderr_path, run_dir),
            )
        for publish_error in publish_errors:
            if publish_error is not None:
                runner_errors.append(publish_error)

        finalization_hash_budget = HashBudget()
        _append_artifacts(
            record,
            run_dir,
            (
                ("ART-command", command_path),
                ("ART-environment", environment_path),
                ("ART-stdout", stdout_path),
                ("ART-stderr", stderr_path),
                ("ART-source-preflight", preflight_path),
                ("ART-authority-catalog", authority_catalog),
                ("ART-authority-crosswalk", authority_crosswalk),
            ),
            runner_errors,
            finalization_hash_budget,
        )

        target_exit = 128 + signal_received if signal_received is not None else observed_exit
        record["runner"]["signal"] = signal.Signals(signal_received).name if signal_received is not None else None
        record["runner"]["finalized_by"] = "signal_trap" if signal_received is not None else "exit_trap"
        record["runner"]["exit_code"] = target_exit
        record["run"]["finished_at"] = utc_now()
        record["execution"]["status"] = "pass" if target_exit == 0 and not runner_errors else "fail"
        if record["execution"]["status"] != "pass":
            try:
                _append_artifacts(record, run_dir, (("ART-handback", handback(record, run_dir, target)),), runner_errors, finalization_hash_budget)
            except (OSError, ValueError) as exc:
                runner_errors.append(runner_error("RUNNER_HANDBACK", f"cannot write handback: {exc}"))
        write_json(run_dir / "evidence.json", record, run_dir)

        manifest_error: dict[str, str] | None = None
        try:
            _manifest, digest = write_payload_manifest(run_dir, args.run_id, record["authority"], finalization_hash_budget)
            write_local_provenance(run_dir, digest, record["authority"])
        except (OSError, ValueError) as exc:
            code = "MANIFEST_SYMLINK" if "MANIFEST_SYMLINK" in str(exc) else "RUNNER_MANIFEST"
            manifest_error = runner_error(code, f"cannot create a complete payload manifest: {exc}")
            runner_errors.append(manifest_error)
            if record["execution"]["status"] == "pass":
                record["execution"]["status"] = "fail"
                _append_artifacts(record, run_dir, (("ART-handback", handback(record, run_dir, target)),), runner_errors, finalization_hash_budget)
                write_json(run_dir / "evidence.json", record, run_dir)

        if manifest_error is None:
            validation = validate_evidence(record, catalog, crosswalk, run_dir, record_index)
        else:
            validation = {"validator_version": VALIDATOR_VERSION, "evidence_valid": False, "errors": [manifest_error]}
        if runner_errors:
            validation["errors"].extend(runner_errors)
            validation["evidence_valid"] = False
        if args.force_validation_failure:
            validation["errors"].append(runner_error("RUNNER_FORCED", "test-only forced validation failure"))
            validation["evidence_valid"] = False
        write_validation(run_dir, validation)
        return target_exit if target_exit != 0 else (0 if validation["evidence_valid"] else 125)
    finally:
        stdout_sink.close()
        stderr_sink.close()
        signal.signal(signal.SIGINT, old_int)
        signal.signal(signal.SIGTERM, old_term)


def main(argv: list[str]) -> int:
    try:
        return run(argv)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"run-evidence failed closed: {exc}", file=sys.stderr)
        return 125


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
