from __future__ import annotations

import copy
import ctypes
import inspect
import importlib
import json
import os
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

TESTKIT = Path(__file__).resolve().parents[1]
if not (TESTKIT / "lib").is_dir():
    TESTKIT = Path(os.environ.get("TESSERA_TESTKIT_ROOT", TESTKIT))
NATIVE = TESTKIT.parent
sys.path.insert(0, str(TESTKIT / "lib"))

from build_ledger import aggregate_shared_metrics, expected_shared_keys, select_current  # noqa: E402
from evidence_contract import (  # noqa: E402
    MANIFEST_VERSION,
    analyze_soak,
    canonical_json_bytes,
    expected_cells,
    load_json,
    minimal_record,
    sha256_bytes,
    sha256_file,
    validate_authority_files,
    validate_catalog,
    validate_crate_contract,
    validate_dod,
    validate_evidence_metrics,
    validate_evidence,
    validate_retest,
    validate_soak,
    validate_source,
    validate_visual,
    write_local_provenance,
    write_payload_manifest,
    write_json,
)

RUN_EVIDENCE_LIB = importlib.import_module("run_evidence")
EVIDENCE_CONTRACT_LIB = importlib.import_module("evidence_contract")

CATALOG_PATH = TESTKIT / "catalog" / "coverage-g0-v1.json"
CROSSWALK_PATH = TESTKIT / "catalog" / "crosswalk-g0-v1.json"
RUNNER_PATH = TESTKIT / "bin" / "run-evidence"
PREFLIGHT_PATH = TESTKIT / "bin" / "preflight-source"
FROZEN_MAX_CAPTURE_BYTES = 4 * 1024 * 1024
G0_ACTIVE_CELL_COUNT = 216
CREATE_SUSPENDED = 0x00000004
EXTENDED_STARTUPINFO_PRESENT = 0x00080000
PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002
ERROR_INSUFFICIENT_BUFFER = 122
WAIT_OBJECT_0 = 0
WAIT_TIMEOUT = 0x00000102
WAIT_FAILED = 0xFFFFFFFF
ERROR_ACCESS_DENIED = 5
ERROR_INVALID_HANDLE = 6
WINDOWS_X64_ABI_PRIVATE_NAMES: dict[str, tuple[str, ...]] = {
    "SECURITY_ATTRIBUTES": ("_WinSecurityAttributes",),
    "STARTUPINFOW": ("_WinStartupInfo",),
    "STARTUPINFOEXW": ("_WinStartupInfoEx",),
    "PROCESS_INFORMATION": ("_WinProcessInformation",),
    "JOBOBJECT_BASIC_LIMIT_INFORMATION": (
        "_WinJobObjectBasicLimitInformation",
        "_WinBasicLimitInformation",
    ),
    "JOBOBJECT_EXTENDED_LIMIT_INFORMATION": (
        "_WinJobObjectExtendedLimitInformation",
        "_WinExtendedLimitInformation",
    ),
    "UNICODE_STRING": ("_WinUnicodeString",),
    "OBJECT_ATTRIBUTES": ("_WinObjectAttributes",),
    "FILE_ATTRIBUTE_TAG_INFO": ("_WinFileAttributeTagInfo",),
    "FILE_ID_INFO": ("_WinFileIdInfo",),
    "FILE_DIRECTORY_INFORMATION": ("_WinFileDirectoryInformation",),
    "FILE_RENAME_INFO": ("_WinFileRenameInfo",),
}


def ctypes_int(value: object) -> int:
    if hasattr(value, "value"):
        value = getattr(value, "value")
    return int(value or 0)


def ctypes_structure_target(value: object) -> object:
    target = getattr(value, "_obj", None)
    if target is not None:
        return target
    try:
        return value.contents  # type: ignore[attr-defined]
    except AttributeError:
        return value


def startup_standard_handle(startup_info: object, field_name: str) -> int | None:
    target = ctypes_structure_target(startup_info)
    candidates = (target, getattr(target, "StartupInfo", None))
    for candidate in candidates:
        if candidate is not None and hasattr(candidate, field_name):
            return ctypes_int(getattr(candidate, field_name))
    return None


def set_ctypes_pointer_value(pointer: object, value: int) -> None:
    target = getattr(pointer, "_obj", None)
    if target is not None and hasattr(target, "value"):
        target.value = value
        return
    try:
        contents = pointer.contents  # type: ignore[attr-defined]
    except AttributeError:
        return
    if hasattr(contents, "value"):
        contents.value = value


def set_process_information(pointer: object, process_handle: int, thread_handle: int) -> None:
    target = getattr(pointer, "_obj", None)
    if target is None:
        try:
            target = pointer.contents  # type: ignore[attr-defined]
        except AttributeError:
            target = pointer
    for field, value in (
        ("hProcess", process_handle),
        ("hThread", thread_handle),
        ("dwProcessId", 4242),
        ("dwThreadId", 4243),
    ):
        if hasattr(target, field):
            setattr(target, field, value)


def call_index(calls: list[tuple[str, object]], name: str, handle: int | None = None) -> int:
    for index, call in enumerate(calls):
        if call[0] != name:
            continue
        if handle is None or (len(call) > 1 and call[1] == handle):
            return index
    raise AssertionError(f"missing call {name!r} handle={handle!r}; calls={calls!r}")


def result_errors(result: object) -> list[dict[str, str]]:
    errors: object
    if isinstance(result, list):
        errors = result
    elif isinstance(result, dict):
        errors = result.get("errors", [])
    elif hasattr(result, "errors"):
        errors = getattr(result, "errors")
    else:
        raise AssertionError(f"structured helper result must expose errors, got {type(result).__name__}: {result!r}")
    if not isinstance(errors, list):
        raise AssertionError(f"errors must be a list, got {errors!r}")
    return [item for item in errors if isinstance(item, dict) and isinstance(item.get("code"), str)]


def result_error_codes(result: object) -> set[str]:
    return {item["code"] for item in result_errors(result)}


def self_owned_posix_group_alive(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
    except ProcessLookupError:
        return False
    return True


def cleanup_self_owned_posix_process(process: subprocess.Popen[bytes]) -> None:
    try:
        if process.poll() is None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=2)
    finally:
        for stream in (process.stdout, process.stderr):
            if stream is not None:
                stream.close()


def ctypes_wide_text(value: object) -> str:
    if isinstance(value, str):
        return value
    nested_value = getattr(value, "value", None)
    if isinstance(nested_value, str):
        return nested_value
    return str(value)


def production_ctypes_structure(module: object, semantic_name: str) -> type[ctypes.Structure]:
    private_names = WINDOWS_X64_ABI_PRIVATE_NAMES[semantic_name]
    for private_name in private_names:
        value = getattr(module, private_name, None)
        if isinstance(value, type) and issubclass(value, ctypes.Structure):
            return value
    module_name = getattr(module, "__name__", repr(module))
    raise AssertionError(
        f"{module_name} must retain an existing private ctypes definition for {semantic_name}; tried {private_names!r}"
    )


def production_ctypes_field_offset(structure: type[ctypes.Structure], field_name: str) -> int:
    field = getattr(structure, field_name, None)
    if field is not None and hasattr(field, "offset"):
        return int(field.offset)
    for definition in getattr(structure, "_fields_", ()):
        if len(definition) < 2:
            continue
        parent_name, parent_type = definition[:2]
        if not isinstance(parent_type, type) or not issubclass(parent_type, ctypes.Structure):
            continue
        nested = getattr(parent_type, field_name, None)
        parent = getattr(structure, parent_name, None)
        if nested is not None and parent is not None and hasattr(nested, "offset") and hasattr(parent, "offset"):
            return int(parent.offset) + int(nested.offset)
    raise AssertionError(f"{structure.__name__} must expose field {field_name!r} for ABI auditing")


class FakeSink:
    def __init__(self) -> None:
        self.chunks: list[object] = []
        self.overflow = False

    def append(self, data: object) -> bool:
        self.chunks.append(data)
        return False

    def write(self, data: object) -> int:
        self.chunks.append(data)
        try:
            return len(data)  # type: ignore[arg-type]
        except TypeError:
            return 0

    def flush(self) -> None:
        return None


class CleanupProbeKey:
    def __init__(self, fileobj: object) -> None:
        self.fileobj = fileobj


class CleanupProbeStream:
    def __init__(self, label: str) -> None:
        self.label = label
        self.close_calls = 0

    def close(self) -> None:
        self.close_calls += 1
        raise OSError(f"injected {self.label} stream close cleanup failure")


class CleanupProbeSelector:
    """Selector double that enters cleanup through a real production error path."""

    def __init__(self, label: str, *, fail_get_map_during_cleanup: bool = False, fail_cleanup_operations: bool = False) -> None:
        self.label = label
        self.fail_get_map_during_cleanup = fail_get_map_during_cleanup
        self.fail_cleanup_operations = fail_cleanup_operations
        self.cleanup_started = False
        self.close_calls = 0
        self.unregister_attempts: list[object] = []
        self.faulting_streams: list[CleanupProbeStream] = []
        self._map: dict[int, CleanupProbeKey] = {}

    def register(self, stream: object, _events: object, data: object = None) -> CleanupProbeKey:
        fileobj: object = stream
        if self.fail_cleanup_operations:
            faulting_stream = CleanupProbeStream(f"{self.label} {data}")
            self.faulting_streams.append(faulting_stream)
            fileobj = faulting_stream
        key = CleanupProbeKey(fileobj)
        self._map[id(stream)] = key
        return key

    def get_map(self) -> dict[int, CleanupProbeKey]:
        if self.fail_get_map_during_cleanup and self.cleanup_started:
            raise OSError(f"injected {self.label} selector get_map cleanup failure")
        return self._map

    def select(self, timeout: object = None) -> list[object]:
        del timeout
        self.cleanup_started = True
        raise OSError(f"injected {self.label} selector select failure")

    def unregister(self, fileobj: object) -> None:
        self.unregister_attempts.append(fileobj)
        if self.fail_cleanup_operations:
            raise OSError(f"injected {self.label} selector unregister cleanup failure")
        for identity, key in tuple(self._map.items()):
            if key.fileobj is fileobj:
                self._map.pop(identity)
                return

    def close(self) -> None:
        self.close_calls += 1
        if self.fail_cleanup_operations:
            raise OSError(f"injected {self.label} selector close cleanup failure")


class FaultingTrustedSink:
    def __init__(self, label: str) -> None:
        self.label = label
        self.close_calls = 0
        self.writes: list[bytes] = []

    def write(self, data: bytes) -> int:
        self.writes.append(data)
        return len(data)

    def close(self) -> None:
        self.close_calls += 1
        raise OSError(f"injected {self.label} sink close cleanup failure")


def invoke_windows_helper(
    helper: object,
    argv: list[str],
    fake_kernel32: "FakeWindowsKernel32",
    *,
    include_sinks: bool,
) -> object:
    if not callable(helper):
        raise AssertionError(f"Windows helper must be callable, got {helper!r}")
    signature = inspect.signature(helper)
    parameters = signature.parameters
    accepts_kwargs = any(parameter.kind == inspect.Parameter.VAR_KEYWORD for parameter in parameters.values())
    self_or_command_consumed = False
    args: list[object] = []
    kwargs: dict[str, object] = {}
    command_names = ("argv", "command", "command_argv", "target", "target_argv", "verifier", "verifier_argv")

    for command_name in command_names:
        parameter = parameters.get(command_name)
        if parameter is not None and parameter.kind != inspect.Parameter.POSITIONAL_ONLY:
            kwargs[command_name] = argv
            self_or_command_consumed = True
            break

    for name, parameter in parameters.items():
        if parameter.kind == inspect.Parameter.VAR_KEYWORD:
            continue
        if parameter.kind == inspect.Parameter.VAR_POSITIONAL:
            continue
        if name == "self":
            continue
        if not self_or_command_consumed and parameter.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD):
            args.append(argv)
            self_or_command_consumed = True

    def add_keyword(name: str, value: object, *, required: bool = False) -> None:
        if accepts_kwargs or name in parameters:
            kwargs[name] = value
            return
        if required:
            raise AssertionError(f"{name} keyword injection is required for host-independent Windows lifecycle tests; signature={signature}")

    add_keyword("kernel32", fake_kernel32, required=True)
    add_keyword("timeout_seconds", 1)
    add_keyword("output_limit_bytes", 64)
    if include_sinks:
        add_keyword("stdout_sink", FakeSink())
        add_keyword("stderr_sink", FakeSink())
        add_keyword("signal_received", lambda: False)
    return helper(*args, **kwargs)


class FakeWindowsKernel32:
    def __init__(
        self,
        *,
        assign_success: bool = False,
        resume_success: bool = True,
        resume_error: int = 31,
        wait_results: tuple[int, ...] = (),
        wait_failed_error: int = ERROR_INVALID_HANDLE,
        close_fail_handles: tuple[int, ...] = (),
        close_error: int = ERROR_INVALID_HANDLE,
    ) -> None:
        self.assign_success = assign_success
        self.resume_success = resume_success
        self.resume_error = resume_error
        self.wait_results = list(wait_results)
        self.wait_failed_error = wait_failed_error
        self.close_fail_handles = set(close_fail_handles)
        self.close_error = close_error
        self.calls: list[tuple[str, object]] = []
        self.wait_states: list[int] = []
        self.close_failures: list[int] = []
        self.handle_lists: list[tuple[int, ...]] = []
        self.created_pipe_handles: set[int] = set()
        self.pipe_read_handles: set[int] = set()
        self.pipe_write_handles: set[int] = set()
        self.handle_information: dict[int, tuple[int, int]] = {}
        self.create_process_flags = 0
        self.create_process_inherit_handles: bool | None = None
        self.create_process_stdin_handle: int | None = None
        self.create_process_startup_type: type[object] | None = None
        self.create_process_information_type: type[object] | None = None
        self.job_handle = 0x7100
        self.process_handle = 0x7200
        self.thread_handle = 0x7300
        self.nul_stdin_handle = 0x7400
        self.next_handle = 0x8000
        self.last_error = 0
        self.assign_observations: list[tuple[int, int, int]] = []
        self.resume_observations: list[tuple[int, int, int]] = []

    def new_pipe_handle(self, end: str) -> int:
        handle = self.next_handle
        self.next_handle += 1
        self.created_pipe_handles.add(handle)
        if end == "read":
            self.pipe_read_handles.add(handle)
        elif end == "write":
            self.pipe_write_handles.add(handle)
        else:
            raise AssertionError(f"unexpected pipe end {end!r}")
        return handle

    def GetLastError(self) -> int:
        return self.last_error

    def SetLastError(self, error: object) -> None:
        self.last_error = ctypes_int(error)

    def CreateJobObjectW(self, *_args: object) -> int:
        self.calls.append(("CreateJobObjectW", self.job_handle))
        return self.job_handle

    def SetInformationJobObject(self, *_args: object) -> int:
        self.calls.append(("SetInformationJobObject", self.job_handle))
        return 1

    def CreatePipe(self, read_pointer: object, write_pointer: object, *_args: object) -> int:
        read_handle = self.new_pipe_handle("read")
        write_handle = self.new_pipe_handle("write")
        set_ctypes_pointer_value(read_pointer, read_handle)
        set_ctypes_pointer_value(write_pointer, write_handle)
        self.calls.append(("CreatePipe", (read_handle, write_handle)))
        return 1

    def CreateFileW(self, *args: object, **kwargs: object) -> int:
        file_name = kwargs.get("lpFileName", kwargs.get("file_name", args[0] if args else ""))
        desired_access = kwargs.get("dwDesiredAccess", kwargs.get("desired_access", args[1] if len(args) > 1 else 0))
        share_mode = kwargs.get("dwShareMode", kwargs.get("share_mode", args[2] if len(args) > 2 else 0))
        creation_disposition = kwargs.get(
            "dwCreationDisposition", kwargs.get("creation_disposition", args[4] if len(args) > 4 else 0)
        )
        flags_and_attributes = kwargs.get(
            "dwFlagsAndAttributes", kwargs.get("flags_and_attributes", args[5] if len(args) > 5 else 0)
        )
        details = (
            ctypes_wide_text(file_name),
            ctypes_int(desired_access),
            ctypes_int(share_mode),
            ctypes_int(creation_disposition),
            ctypes_int(flags_and_attributes),
        )
        self.calls.append(("CreateFileW", details))
        if details[0] != "NUL":
            self.last_error = 2
            return 0
        return self.nul_stdin_handle

    def SetHandleInformation(self, handle: object, mask: object, flags: object) -> int:
        handle_value = ctypes_int(handle)
        details = (handle_value, ctypes_int(mask), ctypes_int(flags))
        self.handle_information[handle_value] = details[1:]
        self.calls.append(("SetHandleInformation", details))
        return 1

    def InitializeProcThreadAttributeList(self, attribute_list: object, _count: object, _flags: object, size_pointer: object) -> int:
        if not attribute_list:
            set_ctypes_pointer_value(size_pointer, 64)
            self.last_error = ERROR_INSUFFICIENT_BUFFER
            self.calls.append(("InitializeProcThreadAttributeList:size", 64))
            return 0
        self.calls.append(("InitializeProcThreadAttributeList:init", 64))
        return 1

    def UpdateProcThreadAttribute(
        self,
        _attribute_list: object,
        _flags: object,
        attribute: object,
        value: object,
        size: object,
        *_args: object,
    ) -> int:
        handles: tuple[int, ...] = ()
        count = ctypes_int(size) // ctypes.sizeof(ctypes.c_void_p)
        if 0 < count <= 8:
            try:
                array_type = ctypes.c_void_p * count
                array = ctypes.cast(value, ctypes.POINTER(array_type)).contents
                handles = tuple(int(item or 0) for item in array)
            except (TypeError, ValueError):
                handles = ()
        self.handle_lists.append(handles)
        self.calls.append(("UpdateProcThreadAttribute", (ctypes_int(attribute), handles)))
        return 1

    def DeleteProcThreadAttributeList(self, *_args: object) -> None:
        self.calls.append(("DeleteProcThreadAttributeList", 0))

    def CreateProcessW(self, *args: object, **kwargs: object) -> int:
        flags = ctypes_int(kwargs.get("creation_flags", args[5] if len(args) > 5 else 0))
        inherit_handles = bool(kwargs.get("inherit_handles", args[4] if len(args) > 4 else False))
        startup_info = kwargs.get(
            "lpStartupInfo",
            kwargs.get("startup_info_ex", kwargs.get("startup_info", args[8] if len(args) > 8 else None)),
        )
        process_information = kwargs.get("process_information", args[9] if len(args) > 9 else None)
        self.create_process_flags = flags
        self.create_process_inherit_handles = inherit_handles
        self.create_process_stdin_handle = startup_standard_handle(startup_info, "hStdInput")
        self.create_process_startup_type = type(ctypes_structure_target(startup_info))
        self.create_process_information_type = type(ctypes_structure_target(process_information))
        if process_information is not None:
            set_process_information(process_information, self.process_handle, self.thread_handle)
        self.calls.append(("CreateProcessW", flags))
        return 1

    def AssignProcessToJobObject(self, job_handle: object, process_handle: object) -> int:
        job_handle_value = ctypes_int(job_handle)
        process_handle_value = ctypes_int(process_handle)
        self.calls.append(("AssignProcessToJobObject", (job_handle_value, process_handle_value)))
        if self.assign_success:
            result = 1
        else:
            self.last_error = ERROR_ACCESS_DENIED
            result = 0
        self.assign_observations.append((job_handle_value, process_handle_value, result))
        return result

    def ResumeThread(self, thread_handle: object) -> int:
        thread_handle_value = ctypes_int(thread_handle)
        self.calls.append(("ResumeThread", thread_handle_value))
        if not self.resume_success:
            self.last_error = self.resume_error
            result = 0xFFFFFFFF
        else:
            result = 1
        self.resume_observations.append((thread_handle_value, result, self.last_error))
        return result

    def TerminateJobObject(self, job_handle: object, exit_code: object) -> int:
        self.calls.append(("TerminateJobObject", (ctypes_int(job_handle), ctypes_int(exit_code))))
        return 1

    def TerminateProcess(self, process_handle: object, exit_code: object) -> int:
        self.calls.append(("TerminateProcess", (ctypes_int(process_handle), ctypes_int(exit_code))))
        return 1

    def WaitForSingleObject(self, process_handle: object, timeout_ms: object) -> int:
        self.calls.append(("WaitForSingleObject", (ctypes_int(process_handle), ctypes_int(timeout_ms))))
        state = self.wait_results.pop(0) if self.wait_results else WAIT_OBJECT_0
        self.wait_states.append(state)
        if state == WAIT_FAILED:
            self.last_error = self.wait_failed_error
        return state

    def CloseHandle(self, handle: object) -> int:
        handle_value = ctypes_int(handle)
        self.calls.append(("CloseHandle", handle_value))
        if handle_value in self.close_fail_handles:
            self.close_failures.append(handle_value)
            self.last_error = self.close_error
            return 0
        return 1

    def GetExitCodeProcess(self, _process_handle: object, exit_code_pointer: object) -> int:
        set_ctypes_pointer_value(exit_code_pointer, 1)
        self.calls.append(("GetExitCodeProcess", 1))
        return 1

    def CancelIoEx(self, handle: object, _overlapped: object = None) -> int:
        self.calls.append(("CancelIoEx", ctypes_int(handle)))
        return 1


def assert_windows_restricted_inheritance(
    test_case: unittest.TestCase,
    fake: FakeWindowsKernel32,
    *,
    require_nul_stdin: bool,
) -> None:
    handle_list_updates = [
        (index, call[1][1])
        for index, call in enumerate(fake.calls)
        if call[0] == "UpdateProcThreadAttribute" and call[1][0] == PROC_THREAD_ATTRIBUTE_HANDLE_LIST
    ]
    test_case.assertEqual(len(handle_list_updates), 1, fake.calls)
    update_index, handles = handle_list_updates[0]

    inherited = set(handles)
    allowed = set(fake.pipe_write_handles)
    forbidden = fake.pipe_read_handles | {
        fake.job_handle,
        fake.process_handle,
        fake.thread_handle,
    }
    if require_nul_stdin:
        create_file_calls = [
            (index, call[1]) for index, call in enumerate(fake.calls) if call[0] == "CreateFileW"
        ]
        test_case.assertEqual(len(create_file_calls), 1, fake.calls)
        create_file_index, create_file_details = create_file_calls[0]
        test_case.assertIsInstance(create_file_details, tuple)
        test_case.assertEqual(create_file_details[0], "NUL", fake.calls)
        test_case.assertNotIn(fake.nul_stdin_handle, fake.created_pipe_handles)

        nul_handle_information = [
            index
            for index, call in enumerate(fake.calls)
            if call[0] == "SetHandleInformation" and call[1][0] == fake.nul_stdin_handle
        ]
        test_case.assertTrue(nul_handle_information, f"NUL stdin must be made inheritable: {fake.calls!r}")
        test_case.assertLess(create_file_index, min(nul_handle_information), fake.calls)
        nul_mask, nul_flags = fake.handle_information[fake.nul_stdin_handle]
        test_case.assertEqual(nul_mask & 1, 1, f"NUL stdin must use HANDLE_FLAG_INHERIT as the SetHandleInformation mask: {fake.calls!r}")
        test_case.assertEqual(nul_flags & 1, 1, f"NUL stdin must be marked HANDLE_FLAG_INHERIT: {fake.calls!r}")
        test_case.assertLess(create_file_index, update_index, fake.calls)
        test_case.assertLess(max(nul_handle_information), update_index, fake.calls)
        test_case.assertEqual(fake.create_process_stdin_handle, fake.nul_stdin_handle, fake.calls)
        allowed.add(fake.nul_stdin_handle)
    else:
        test_case.assertEqual(fake.create_process_stdin_handle, 0, f"trusted verifier hStdInput must be None: {fake.calls!r}")
        forbidden.add(fake.nul_stdin_handle)

    test_case.assertEqual(len(fake.pipe_read_handles), 2, fake.calls)
    test_case.assertEqual(len(fake.pipe_write_handles), 2, fake.calls)
    expected_description = "stdout/stderr writes plus NUL stdin" if require_nul_stdin else "stdout/stderr writes only"
    test_case.assertEqual(inherited, allowed, f"restricted inherited handles must be {expected_description}: {fake.calls!r}")
    test_case.assertTrue(inherited.isdisjoint(forbidden), f"read, job, process, and thread handles must never be inherited: {fake.calls!r}")
    test_case.assertEqual(len(handles), len(inherited), f"restricted handle list must not contain duplicate handles: {fake.calls!r}")


class EvidenceContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = load_json(CATALOG_PATH)
        self.crosswalk = load_json(CROSSWALK_PATH)

    def runner_command(self, directory: Path, target: list[str], template: dict[str, object] | None = None, extra_args: list[str] | None = None) -> tuple[list[str], Path]:
        template = template or minimal_record(self.catalog)
        template_path = directory / "template.json"
        preflight_path = directory / "preflight.json"
        write_json(template_path, template)
        write_json(preflight_path, template["source"]["preflight"])
        evidence_root = directory / "evidence"
        command = [
            sys.executable, str(RUNNER_PATH), "--catalog", str(CATALOG_PATH), "--crosswalk", str(CROSSWALK_PATH),
            "--evidence-root", str(evidence_root), "--run-id", template["run"]["run_id"], "--template", str(template_path),
            "--source-preflight", str(preflight_path), "--renderer", "not_applicable", "--", *target,
        ]
        if extra_args:
            command[-len(target) - 1:-len(target) - 1] = extra_args
        return command, evidence_root / template["run"]["run_id"]

    def invoke_runner(self, directory: Path, target: list[str], template: dict[str, object] | None = None) -> tuple[subprocess.CompletedProcess[str], Path]:
        command, bundle = self.runner_command(directory, target, template)
        return subprocess.run(command, text=True, capture_output=True, check=False), bundle

    def wait_for_path(self, path: Path, process: subprocess.Popen[str]) -> None:
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if path.exists():
                return
            if process.poll() is not None:
                _stdout, stderr = process.communicate()
                self.fail(f"runner exited before creating {path}: {stderr}")
            time.sleep(0.005)
        self.fail(f"timed out waiting for controlled marker {path}")

    def assert_signal_bundle(self, bundle: Path, signum: signal.Signals) -> None:
        record = load_json(bundle / "evidence.json")
        manifest = load_json(bundle / "payload-manifest.json")
        provenance = load_json(bundle / "provenance-attestation.json")
        validation = load_json(bundle / "validation.json")
        self.assertEqual(record["runner"]["finalized_by"], "signal_trap")
        self.assertEqual(record["runner"]["signal"], signum.name)
        self.assertEqual(record["runner"]["exit_code"], 128 + signum)
        self.assertEqual(record["execution"]["status"], "fail")
        self.assertTrue((bundle / "handback" / f"HB-{record['run']['run_id']}.json").is_file())
        self.assertIn("evidence.json", {entry["path"] for entry in manifest["payload_files"]})
        self.assertEqual(provenance["authority"], manifest["authority"])
        self.assertTrue(validation["evidence_valid"], validation["errors"])
        self.assertTrue(validate_evidence(record, self.catalog, self.crosswalk, bundle)["evidence_valid"])

    def add_artifact(self, record: dict[str, object], root: Path, artifact_id: str) -> None:
        path = root / f"{artifact_id}.json"
        write_json(path, {"artifact_id": artifact_id})
        record.setdefault("artifacts", []).append({"artifact_id": artifact_id, "path": path.name, "sha256": sha256_file(path)})  # type: ignore[union-attr]

    def visual_record(self, test_id: str, root: Path) -> dict[str, object]:
        record = minimal_record(self.catalog, test_id)
        record["execution"] = {"status": "pass"}
        record["applicability"]["visual"] = {"state": "applicable", "reason": None}
        ids = ("A", "B", "C", "D", "E", "F", "FG", "BG", "MASK", "APPROVAL")
        for artifact_id in ids:
            self.add_artifact(record, root, artifact_id)
        authority = self.catalog["authority"]["visual"]["software" if record["coverage_cell"]["renderer"] == "tiny-skia" else "hardware"]
        metrics: dict[str, object] = {
            "delta_e_2000": {"value": 2.0, "sample_artifact_id": "E"},
            "dimension_error_dip": {"max_abs": 0.5, "expected_artifact_id": "F"},
            "contrast": [{"foreground_sample_id": "FG", "background_sample_id": "BG", "ratio": 4.5, "calculation_version": "wcag-2.2", "kind": "text"}],
        }
        if record["coverage_cell"]["renderer"] == "tiny-skia":
            metrics["changed_pixel_ratio"] = {"value": 0.0004}
        else:
            metrics["ssim"] = {"value": 0.996}
            metrics["diff_area_ratio"] = {"value": 0.001}
        record["visual"] = {
            "baseline_artifact_id": "A", "candidate_artifact_id": "B", "heatmap_artifact_id": "C", "comparison_artifact_id": "D",
            "comparator": {"name": "frozen-comparator", "version": "1"},
            "capture": {"system_scale": record["coverage_cell"]["system_scale"], "ui_scale": record["coverage_cell"]["ui_scale"]},
            "metrics": metrics,
            "mask": {"artifact_id": "MASK", "approved_mask_artifact_id": "APPROVAL", "config_sha256": authority["mask_config_sha256"], "masked_area_ratio": 0.001, "reviewer": "visual-owner", "reviewed_at": "2026-08-17T00:00:00Z", "status": "approved"},
            "structural_checks": {"zero_clipping": "pass", "zero_overlap": "pass", "visible_focus": "pass", "no_text_occlusion": "pass"},
            "metadata": {"visual_workflow_id": "VIS-G0-SENTINEL", "evidence_refs": [{"record_id": record["record_id"], "source_identity": record["source"]["revision"]}]},
        }
        return record

    def metric_entry(self, metric_id: str, record: dict[str, object], root: Path) -> dict[str, object]:
        definition = next(item for item in self.catalog["metric_definitions"] if item["id"] == metric_id)
        scope: dict[str, object] = {"kind": definition["aggregation_scope"], "key": definition.get("scope_key", record["coverage_cell"]["platform_profile_id"])}
        if scope["kind"] == "artifact":
            artifact_id = f"ART-{metric_id}"
            self.add_artifact(record, root, artifact_id)
            scope["artifact_id"] = artifact_id
        return {
            "metric_id": metric_id,
            "evidence_scope": definition["evidence_scope"],
            "required_by_gate": definition["required_by_gate"],
            "metric_scope": scope,
            "applicability": {"state": "applicable", "reason": None},
            "evidence_refs": [{"record_id": record["record_id"], "source_identity": record["source"]["revision"]}],
        }

    def test_authority_locks_count_canonical_and_exact_bytes(self) -> None:
        self.assertEqual(validate_catalog(self.catalog, self.crosswalk), [])
        self.assertEqual(len(expected_cells(self.catalog)), 216)
        self.assertEqual(validate_authority_files(CATALOG_PATH, CROSSWALK_PATH), [])
        reduced = copy.deepcopy(self.catalog)
        reduced["matrix_sets"][2]["dimensions"]["system_scale"].pop()
        codes = {item["code"] for item in validate_catalog(reduced, self.crosswalk)}
        self.assertIn("AUTHORITY_CATALOG_DIGEST", codes)
        with tempfile.TemporaryDirectory() as temporary:
            changed = Path(temporary) / "coverage-g0-v1.json"
            changed.write_bytes(CATALOG_PATH.read_bytes() + b"\n")
            self.assertIn("AUTHORITY_CATALOG_DIGEST", {item["code"] for item in validate_authority_files(changed, CROSSWALK_PATH)})

    def test_payload_tree_denies_generated_caches_and_large_binaries(self) -> None:
        forbidden_parts = {"__pycache__", "target", "tmp", "cache"}
        violations: list[str] = []
        for path in NATIVE.rglob("*"):
            relative = path.relative_to(NATIVE)
            if any(part in forbidden_parts for part in relative.parts):
                violations.append(relative.as_posix())
            elif path.is_file() and (path.suffix in {".pyc", ".pyo"} or path.stat().st_size > 5 * 1024 * 1024):
                violations.append(relative.as_posix())
        self.assertEqual(violations, [])

    def test_runner_copies_authority_and_finalizes_success_and_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            success, bundle = self.invoke_runner(directory / "success", [sys.executable, "-c", "print('ok')"])
            self.assertEqual(success.returncode, 0, success.stderr)
            record = load_json(bundle / "evidence.json")
            manifest = load_json(bundle / "payload-manifest.json")
            provenance = load_json(bundle / "provenance-attestation.json")
            self.assertEqual(record["authority"]["catalog_sha256"], manifest["authority"]["catalog_sha256"])
            self.assertEqual(manifest["authority"], provenance["authority"])
            self.assertTrue((bundle / "authority" / "coverage-g0-v1.json").is_file())
            self.assertTrue(load_json(bundle / "validation.json")["evidence_valid"])

            failure, failure_bundle = self.invoke_runner(directory / "failure", [sys.executable, "-c", "import sys; sys.exit(7)"])
            self.assertEqual(failure.returncode, 7)
            self.assertEqual(load_json(failure_bundle / "evidence.json")["execution"]["status"], "fail")
            self.assertTrue((failure_bundle / "handback").is_dir())

    def test_runner_finalizes_signal_before_spawn_for_twenty_races(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for iteration in range(20):
                directory = root / f"before-spawn-{iteration:02d}"
                ready = directory / "spawn-ready"
                release = directory / "spawn-release"
                target_started = directory / "target-started"
                target = [sys.executable, "-c", f"from pathlib import Path; Path({str(target_started)!r}).write_text('started', encoding='utf-8')"]
                command, bundle = self.runner_command(
                    directory,
                    target,
                    extra_args=["--test-spawn-ready-marker", str(ready), "--test-spawn-release-marker", str(release)],
                )
                process = subprocess.Popen(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                self.wait_for_path(ready, process)
                process.send_signal(signal.SIGTERM)
                _stdout, stderr = process.communicate(timeout=5)
                self.assertEqual(process.returncode, 128 + signal.SIGTERM, stderr)
                self.assertFalse(target_started.exists(), f"race {iteration} started a target after SIGTERM")
                self.assert_signal_bundle(bundle, signal.SIGTERM)

    def test_runner_finalizes_signal_during_child_and_reaps_process(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            runs: list[tuple[int, subprocess.Popen[str], Path, int]] = []
            for iteration in range(20):
                directory = root / f"during-child-{iteration:02d}"
                child_ready = directory / "child-ready"
                target_script = "\n".join(
                    (
                        "from pathlib import Path",
                        "import os",
                        "import time",
                        f"marker = Path({str(child_ready)!r})",
                        "temporary = marker.with_name(f'.{marker.name}.{os.getpid()}.tmp')",
                        "temporary.write_text(str(os.getpid()), encoding='utf-8')",
                        "os.replace(temporary, marker)",
                        "time.sleep(30)",
                    )
                )
                target = [
                    sys.executable,
                    "-c",
                    target_script,
                ]
                command, bundle = self.runner_command(directory, target)
                process = subprocess.Popen(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                self.wait_for_path(child_ready, process)
                child_pid = int(child_ready.read_text(encoding="utf-8"))
                runs.append((iteration, process, bundle, child_pid))

            for _iteration, process, _bundle, _child_pid in runs:
                process.send_signal(signal.SIGTERM)

            for iteration, process, bundle, child_pid in runs:
                _stdout, stderr = process.communicate(timeout=5)
                self.assertEqual(process.returncode, 128 + signal.SIGTERM, stderr)
                self.assert_signal_bundle(bundle, signal.SIGTERM)
                if os.name == "posix":
                    with self.assertRaises(ProcessLookupError, msg=f"race {iteration} orphaned child {child_pid}"):
                        os.kill(child_pid, 0)

    def test_signal_finalization_rejects_inconsistent_exit(self) -> None:
        record = minimal_record(self.catalog)
        record["runner"]["signal"] = "SIGTERM"
        record["runner"]["finalized_by"] = "signal_trap"
        record["runner"]["exit_code"] = 0
        # The negative probe targets the signal/exit invariant without a bundle.
        result = validate_evidence(record, self.catalog, self.crosswalk, Path("/nonexistent"))
        self.assertIn("RUNNER_SIGNAL", {item["code"] for item in result["errors"]})

    def test_archive_is_unsupported_and_preflight_hard_fails(self) -> None:
        source = copy.deepcopy(minimal_record(self.catalog)["source"])
        source["identity_kind"] = "source_archive_sha256"
        source["revision"] = None
        errors: list[dict[str, str]] = []
        validate_source(source, errors)
        self.assertIn("SOURCE_ARCHIVE_UNSUPPORTED", {item["code"] for item in errors})
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "source"
            root.mkdir()
            output = Path(temporary) / "preflight.json"
            result = subprocess.run([sys.executable, str(PREFLIGHT_PATH), "--source-root", str(root), "--evidence-root", str(Path(temporary) / "evidence"), "--out", str(output)], check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(load_json(output)["verdict"], "fail")

    def test_visual_uses_frozen_thresholds_and_resolved_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            software = self.visual_record("T-G0-017", root)
            errors: list[dict[str, str]] = []
            validate_visual(software, self.catalog, errors)
            self.assertEqual(errors, [])
            software["visual"]["metrics"]["delta_e_2000"]["threshold"] = 99
            errors = []
            validate_visual(software, self.catalog, errors)
            self.assertIn("VISUAL_SELF_THRESHOLD", {item["code"] for item in errors})
            software["visual"]["metrics"]["delta_e_2000"].pop("threshold")
            software["visual"]["candidate_artifact_id"] = "missing"
            errors = []
            validate_visual(software, self.catalog, errors)
            self.assertIn("VISUAL_ARTIFACT", {item["code"] for item in errors})
            hardware = self.visual_record("T-G0-007", root)
            hardware["visual"]["metrics"]["ssim"]["value"] = 0.99
            errors = []
            validate_visual(hardware, self.catalog, errors)
            self.assertIn("VISUAL_SSIM", {item["code"] for item in errors})

    def test_shared_metrics_reject_na_wrong_lane_and_self_satisfaction(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            record = minimal_record(self.catalog, "T-G0-008")
            record["run"]["lane"] = "nightly"
            root = Path(temporary)
            record["evidence_metrics"] = [self.metric_entry(metric_id, record, root) for metric_id in record["coverage_cell"]["metric_ids"]]
            errors: list[dict[str, str]] = []
            validate_evidence_metrics(record, self.catalog, record["coverage_cell"], errors)
            self.assertEqual(errors, [])
            record["evidence_metrics"][0]["applicability"] = {"state": "not_applicable", "reason": "not collected"}
            record["evidence_metrics"][0]["evidence_refs"] = []
            errors = []
            validate_evidence_metrics(record, self.catalog, record["coverage_cell"], errors)
            self.assertIn("METRIC_REQUIRED_NA", {item["code"] for item in errors})
            record["evidence_metrics"][0]["applicability"] = {"state": "applicable", "reason": None}
            record["evidence_metrics"][0]["evidence_refs"] = [{"record_id": record["record_id"], "source_identity": record["source"]["revision"]}]
            record["evidence_metrics"][0]["satisfied_gates"] = ["G0"]
            errors = []
            validate_evidence_metrics(record, self.catalog, record["coverage_cell"], errors)
            self.assertIn("METRIC_DERIVED_GATES", {item["code"] for item in errors})
            rc_metric = self.metric_entry("MET-G6-COMPRESSED-DISTRIBUTION-SIZE-01", record, root)
            record["evidence_metrics"].append(rc_metric)
            errors = []
            validate_evidence_metrics(record, self.catalog, record["coverage_cell"], errors)
            self.assertIn("METRIC_LANE", {item["code"] for item in errors})

    def test_g0_and_g6_package_objects_are_distinct(self) -> None:
        g0 = {metric_id for metric_id, _kind, _key in expected_shared_keys(self.catalog, "G0")}
        g6 = {metric_id for metric_id, _kind, _key in expected_shared_keys(self.catalog, "G6")}
        self.assertIn("MET-G0-STRIPPED-EXECUTABLE-SIZE-01", g0)
        self.assertIn("MET-G0-GZIP-EXECUTABLE-TREND-01", g0)
        self.assertNotIn("MET-G6-COMPRESSED-DISTRIBUTION-SIZE-01", g0)
        self.assertNotIn("MET-SOAK-8H-01", g0)
        self.assertNotIn("MET-SOAK-24H-01", g0)
        self.assertIn("MET-G6-COMPRESSED-DISTRIBUTION-SIZE-01", g6)
        self.assertNotIn("MET-G0-STRIPPED-EXECUTABLE-SIZE-01", g6)
        future_sets = self.catalog.get("future_non_required_cellsets", [])
        self.assertEqual({item["id"] for item in future_sets}, {"CELLSET-G0-L4-MAC-SOAK", "CELLSET-G0-L4-WIN-SOAK"})
        self.assertIn(("MET-SOAK-8H-01", "platform", "PLAT-MAC-M1-8G"), expected_shared_keys(self.catalog, "G6"))
        self.assertIn(("MET-SOAK-24H-01", "platform", "PLAT-WIN-I5-8250U-8G"), expected_shared_keys(self.catalog, "G6"))
        record = minimal_record(self.catalog, "T-G0-018")
        record["evidence_metrics"] = [{"metric_id": "MET-SOAK-24H-01", "applicability": {"state": "not_applicable", "reason": "not collected"}}]
        aggregate = aggregate_shared_metrics([{"record": record, "valid": True}], self.catalog, "G6", record["source"]["revision"])
        status = {item["metric_id"]: item["status"] for item in aggregate}
        self.assertEqual(status["MET-SOAK-24H-01"], "missing")

    def test_dod_requires_enum_rfc3339_same_source_valid_evidence_and_governance(self) -> None:
        record = minimal_record(self.catalog, "T-G0-020")
        evidence_id = "EV-RUN-20260817T000001Z-b9c797d8-002-T-G0-010"
        linked = minimal_record(self.catalog)
        linked["record_id"] = evidence_id
        index = {evidence_id: {"record": linked, "valid": True, "immutable": True}}
        items = [{"item_id": f"DOC-{number:02d}", "owner": "docs-owner", "status": "pass", "evidence_record_ids": [evidence_id], "source_revision": record["source"]["revision"], "reviewed_at": "2026-08-17T00:00:00Z"} for number in range(1, 12)]
        errors: list[dict[str, str]] = []
        validate_dod({"items": items}, record, index, errors)
        self.assertEqual(errors, [])
        items[0]["status"] = "banana"
        items[0]["reviewed_at"] = "invalid"
        errors = []
        validate_dod({"items": items}, record, index, errors)
        self.assertTrue({"DOD_STATUS", "DOD_TIMESTAMP"}.issubset({item["code"] for item in errors}))
        items[0]["status"] = "not_applicable"
        items[0]["reviewed_at"] = "2026-08-17T00:00:00Z"
        errors = []
        validate_dod({"items": items}, record, index, errors)
        self.assertIn("DOD_LIMITATION", {item["code"] for item in errors})

    def test_retest_chain_selects_only_one_legal_targeted_successor(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            predecessor = minimal_record(self.catalog)
            predecessor["execution"] = {"status": "fail"}
            predecessor_dir = root / "predecessor"
            (predecessor_dir / "handback").mkdir(parents=True)
            write_json(predecessor_dir / "handback" / "HB-RUN-20260817T000000Z-b9c797d8-001.json", {"handback_id": "HB-RUN-20260817T000000Z-b9c797d8-001", "cell_id": predecessor["coverage_cell"]["cell_id"], "targeted_retest_argv": ["target", "--focused"]})
            successor = copy.deepcopy(predecessor)
            successor["run"] = dict(successor["run"], run_id="RUN-20260817T000001Z-b9c797d8-002", started_at="2026-08-17T00:00:01Z", finished_at="2026-08-17T00:00:02Z")
            successor["record_id"] = "EV-RUN-20260817T000001Z-b9c797d8-002-T-G0-010"
            successor["execution"] = {"status": "pass"}
            successor["retest_ordinal"] = 1
            successor["supersedes_record_id"] = predecessor["record_id"]
            successor["handback_id"] = "HB-RUN-20260817T000000Z-b9c797d8-001"
            successor_dir = root / "successor"
            successor_dir.mkdir()
            write_json(successor_dir / "command.argv.json", {"argv": ["target", "--focused"]})
            index = {
                predecessor["record_id"]: {"record": predecessor, "run_dir": predecessor_dir, "immutable": True, "valid": True},
                successor["record_id"]: {"record": successor, "run_dir": successor_dir, "immutable": True, "valid": True},
            }
            errors: list[dict[str, str]] = []
            validate_retest(successor, index, errors)
            self.assertEqual(errors, [])
            current, status = select_current([index[predecessor["record_id"]], index[successor["record_id"]]])
            self.assertEqual(current["record"]["record_id"], successor["record_id"])
            self.assertEqual(status, "pass")
            parallel = copy.deepcopy(index[successor["record_id"]])
            parallel["record"] = copy.deepcopy(successor)
            parallel["record"]["record_id"] = "EV-RUN-20260817T000002Z-b9c797d8-003-T-G0-010"
            self.assertEqual(select_current([index[predecessor["record_id"]], index[successor["record_id"]], parallel])[1], "blocked")

    def test_soak_and_crate_contract_regressions_remain_closed(self) -> None:
        origin = datetime(2026, 8, 17, tzinfo=timezone.utc)
        raw = {"sessions": [{"session_id": "S-1", "restart_boundary": False, "samples": [{"sample_id": f"S-{index}", "timestamp": (origin + timedelta(seconds=index * 300)).isoformat().replace("+00:00", "Z"), "rss_mib": 100 + index * 0.125} for index in range(97)]}]}
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            raw_path = directory / "raw.json"
            write_json(raw_path, raw)
            computed = analyze_soak(raw)
            record = minimal_record(self.catalog, "T-G0-018")
            record["artifacts"] = [{"artifact_id": "ART-raw", "path": "raw.json", "sha256": sha256_file(raw_path)}]
            record["soak"] = {"raw_timeseries_artifact_id": "ART-raw", "sample_interval_seconds": 300, "worst_growth_mib": computed["worst_growth_mib"], "worst_ols_slope_mib_per_hour": computed["worst_ols_slope_mib_per_hour"], "limits": {"growth_mib": 20, "slope_mib_per_hour": 1}}
            errors: list[dict[str, str]] = []
            validate_soak(record, directory, errors)
            self.assertIn("SOAK_LIMIT", {item["code"] for item in errors})
        errors = []
        validate_crate_contract({"production_packages": ["tessera-core", "tessera-iced", "tessera-gallery", "fourth"], "normal_build_closure": ["native/testkit"], "release_contents": ["testkit/bin"], "metadata_artifact_id": "M", "tree_artifact_id": "T", "package_artifact_id": "P"}, errors)
        self.assertTrue({"CRATE_PRODUCTION_SET", "CRATE_TESTKIT_DEP", "CRATE_TESTKIT_RELEASE"}.issubset({item["code"] for item in errors}))

    def attach_payload_bytes(self, record: dict[str, object], root: Path, artifact_id: str, relative: str, payload: bytes) -> None:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        record.setdefault("artifacts", []).append({"artifact_id": artifact_id, "path": relative, "sha256": sha256_file(path)})  # type: ignore[union-attr]

    def attach_standard_runner_artifacts(self, record: dict[str, object], root: Path) -> None:
        self.attach_payload_bytes(record, root, "ART-command", "command.argv.json", b'{"argv":[]}\n')
        self.attach_payload_bytes(record, root, "ART-environment", "environment.json", b'{"variables":[]}\n')
        self.attach_payload_bytes(record, root, "ART-stdout", "stdout.log", b"")
        self.attach_payload_bytes(record, root, "ART-stderr", "stderr.log", b"")
        write_json(root / "source-preflight.json", record["source"]["preflight"])  # type: ignore[index]
        record["artifacts"].append({"artifact_id": "ART-source-preflight", "path": "source-preflight.json", "sha256": sha256_file(root / "source-preflight.json")})  # type: ignore[index,union-attr]
        authority_root = root / "authority"
        authority_root.mkdir(parents=True, exist_ok=True)
        catalog_copy = authority_root / "coverage-g0-v1.json"
        crosswalk_copy = authority_root / "crosswalk-g0-v1.json"
        catalog_copy.write_bytes(CATALOG_PATH.read_bytes())
        crosswalk_copy.write_bytes(CROSSWALK_PATH.read_bytes())
        record["artifacts"].extend(  # type: ignore[index,union-attr]
            [
                {"artifact_id": "ART-authority-catalog", "path": "authority/coverage-g0-v1.json", "sha256": sha256_file(catalog_copy)},
                {"artifact_id": "ART-authority-crosswalk", "path": "authority/crosswalk-g0-v1.json", "sha256": sha256_file(crosswalk_copy)},
            ]
        )

    def finalize_bundle(self, record: dict[str, object], root: Path) -> None:
        write_json(root / "evidence.json", record)
        _manifest, digest = write_payload_manifest(root, record["run"]["run_id"], record["authority"])  # type: ignore[index]
        write_local_provenance(root, digest, record["authority"])  # type: ignore[index]

    def write_delivered_manifest(self, record: dict[str, object], root: Path) -> None:
        expected_authority = {
            "catalog_version": "coverage-g0-v1",
            "catalog_sha256": record["authority"]["catalog_sha256"],  # type: ignore[index]
            "crosswalk_sha256": record["authority"]["crosswalk_sha256"],  # type: ignore[index]
        }
        paths = {"evidence.json"} | {item["path"] for item in record["artifacts"]}  # type: ignore[index]
        payload_files = []
        for relative in sorted(paths):
            if relative == "evidence.json":
                digest = sha256_file(root / relative)
            else:
                artifact = next(item for item in record["artifacts"] if item["path"] == relative)  # type: ignore[index]
                digest = artifact["sha256"]
            payload_files.append({"path": relative, "media_type": "application/octet-stream", "sha256": digest})
        manifest = {"schema_version": MANIFEST_VERSION, "run_id": record["run"]["run_id"], "authority": expected_authority, "payload_files": payload_files}  # type: ignore[index]
        write_json(root / "payload-manifest.json", manifest)
        write_local_provenance(root, sha256_bytes(canonical_json_bytes(manifest)), record["authority"])  # type: ignore[index]

    def validate_bundle_codes(self, record: dict[str, object], root: Path) -> set[str]:
        return {item["code"] for item in validate_evidence(record, self.catalog, self.crosswalk, root)["errors"]}

    def bounded_group_run(
        self,
        command: list[str],
        timeout: float,
        *,
        env: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        process = subprocess.Popen(
            command,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            start_new_session=(os.name == "posix"),
        )
        try:
            stdout, stderr = process.communicate(timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            if os.name == "posix":
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            else:
                process.kill()
            stdout, stderr = process.communicate(timeout=2)
            self.fail(
                f"hard timeout after {timeout}s for self-owned probe; "
                f"stdout={stdout or exc.output!r} stderr={stderr or exc.stderr!r}"
            )
        return subprocess.CompletedProcess(command, process.returncode, stdout, stderr)

    def bundle_operation_probe(
        self,
        root: Path,
        relative: str,
        operation: str,
        *,
        fail_on_read: bool = False,
        timeout: float = 2.0,
    ) -> dict[str, object]:
        operation_code = (
            f"result = ec.read_bundle_file(Path({str(root)!r}), {relative!r}, 1024)"
            if operation == "read"
            else f"result = ec.sha256_bundle_file(Path({str(root)!r}), {relative!r})"
        )
        read_patch = (
            "def fail_read(*args, **kwargs):\n"
            "    raise RuntimeError('READ_CALLED')\n"
            "ec.os.read = fail_read\n"
            if fail_on_read
            else ""
        )
        indented_read_patch = "\n".join(f"    {line}" for line in read_patch.splitlines())
        script = (
            "import json, sys\n"
            "from pathlib import Path\n"
            f"sys.path.insert(0, {str(TESTKIT / 'lib')!r})\n"
            "try:\n"
            "    import evidence_contract as ec\n"
            f"{indented_read_patch}\n"
            f"    {operation_code}\n"
            "except Exception as exc:\n"
            "    print(json.dumps({'ok': False, 'type': type(exc).__name__, 'code': getattr(exc, 'code', None), 'message': str(exc)}))\n"
            "else:\n"
            "    print(json.dumps({'ok': True, 'result_type': type(result).__name__}))\n"
        )
        result = self.bounded_group_run([sys.executable, "-c", script], timeout)
        self.assertEqual(result.returncode, 0, result.stderr)
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            self.fail(f"bundle probe did not emit JSON: {result.stdout!r}; {exc}")

    def required_semantic_limit(self, role: str) -> tuple[str, int]:
        if role == "file":
            name_tokens = (("HASH", "FILE", "BYTES"), ("ARTIFACT", "FILE", "BYTES"), ("BUNDLE", "FILE", "BYTES"))
        elif role == "aggregate":
            name_tokens = (("HASH", "AGGREGATE", "BYTES"), ("HASH", "TOTAL", "BYTES"), ("BUNDLE", "TOTAL", "BYTES"), ("BUNDLE", "BYTES"))
        elif role == "trusted_timeout":
            name_tokens = (("TRUSTED", "TIMEOUT", "SECONDS"),)
        elif role == "trusted_output":
            name_tokens = (("TRUSTED", "OUTPUT", "BYTES"), ("TRUSTED", "CAPTURE", "BYTES"))
        else:
            raise AssertionError(f"unknown semantic limit role: {role}")
        modules = (EVIDENCE_CONTRACT_LIB, RUN_EVIDENCE_LIB)
        candidates: list[tuple[str, int]] = []
        for module in modules:
            for name in dir(module):
                if not name.startswith("MAX_") and not name.startswith("TRUSTED_"):
                    continue
                upper = name.upper()
                if not any(all(token in upper for token in tokens) for tokens in name_tokens):
                    continue
                value = getattr(module, name)
                if isinstance(value, int) and value > 0:
                    candidates.append((name, value))
        deduplicated = list(dict.fromkeys(candidates))
        self.assertEqual(
            len(deduplicated),
            1,
            f"production must export exactly one unambiguous {role} limit; observed {deduplicated}",
        )
        return deduplicated[0]

    def frozen_runner_limit(self, name: str, expected: int) -> int:
        self.assertTrue(hasattr(RUN_EVIDENCE_LIB, name), f"{name} must be exported as a production contract")
        observed = getattr(RUN_EVIDENCE_LIB, name)
        self.assertIsInstance(observed, int, f"{name} must be an integer production contract")
        self.assertEqual(observed, expected, f"{name} must stay frozen unless the test owner updates this contract")
        return observed

    def legal_run_id(self, ordinal: int) -> str:
        second_of_day = ordinal % 86400
        hour = second_of_day // 3600
        minute = (second_of_day % 3600) // 60
        second = second_of_day % 60
        return f"RUN-20260817T{hour:02d}{minute:02d}{second:02d}Z-b9c797d8-{ordinal % 1000:03d}"

    def prior_visit_limit(self) -> int | None:
        if getattr(RUN_EVIDENCE_LIB, "DIRECT_PRIOR_RECORD_LOOKUP", False) is True:
            return None
        self.assertTrue(
            hasattr(RUN_EVIDENCE_LIB, "MAX_PRIOR_BUNDLE_VISITS"),
            "runner must either use DIRECT_PRIOR_RECORD_LOOKUP or export MAX_PRIOR_BUNDLE_VISITS",
        )
        observed = getattr(RUN_EVIDENCE_LIB, "MAX_PRIOR_BUNDLE_VISITS")
        self.assertIsInstance(observed, int, "MAX_PRIOR_BUNDLE_VISITS must be an integer production contract")
        self.assertGreaterEqual(observed, G0_ACTIVE_CELL_COUNT)
        return observed

    def symlink_or_skip(self, source: Path, link: Path) -> None:
        if not hasattr(os, "symlink"):
            self.skipTest("symlink is unavailable on this platform")
        try:
            os.symlink(source, link)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"symlink creation is unavailable: {exc}")

    def test_runner_refuses_stdout_stderr_symlink_poisoning(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = root / "runner"
            ready = directory / "spawn-ready"
            release = directory / "spawn-release"
            outside_stdout = root / "outside-stdout.txt"
            outside_stderr = root / "outside-stderr.txt"
            outside_stdout.write_text("stdout-sentinel", encoding="utf-8")
            outside_stderr.write_text("stderr-sentinel", encoding="utf-8")
            symlink_probe = root / "symlink-probe"
            self.symlink_or_skip(outside_stdout, symlink_probe)
            symlink_probe.unlink()
            target = [sys.executable, "-c", "import sys; sys.stdout.write('target stdout'); sys.stderr.write('target stderr')"]
            command, bundle = self.runner_command(
                directory,
                target,
                extra_args=["--test-spawn-ready-marker", str(ready), "--test-spawn-release-marker", str(release)],
            )
            process = subprocess.Popen(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            try:
                self.wait_for_path(ready, process)
                self.symlink_or_skip(outside_stdout, bundle / "stdout.log")
                self.symlink_or_skip(outside_stderr, bundle / "stderr.log")
                release.write_text("go\n", encoding="utf-8")
                _stdout, stderr = process.communicate(timeout=5)
            finally:
                if process.poll() is None:
                    process.kill()
                    process.communicate(timeout=5)
            self.assertEqual(outside_stdout.read_text(encoding="utf-8"), "stdout-sentinel")
            self.assertEqual(outside_stderr.read_text(encoding="utf-8"), "stderr-sentinel")
            self.assertTrue((bundle / "stdout.log").is_symlink(), "runner must not replace a poisoned stdout symlink")
            self.assertTrue((bundle / "stderr.log").is_symlink(), "runner must not replace a poisoned stderr symlink")
            self.assertNotIn("Traceback", stderr)
            self.assertNotEqual(process.returncode, 0, stderr)
            self.assertTrue((bundle / "validation.json").is_file(), "runner must finalize a fail-closed poisoning handback bundle")
            record = load_json(bundle / "evidence.json")
            self.assertEqual(record["execution"]["status"], "fail")
            self.assertTrue((bundle / "handback" / f"HB-{record['run']['run_id']}.json").is_file())
            codes = {item["code"] for item in load_json(bundle / "validation.json").get("errors", [])}
            self.assertIn("RUNNER_STDIO_SYMLINK", codes)
            self.assertNotIn("RUNNER_POLICY", codes)

    def test_manifest_builder_rejects_symlink_payload_entries(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            run_dir = root / "bundle"
            run_dir.mkdir()
            outside = root / "outside.txt"
            outside.write_text("outside payload\n", encoding="utf-8")
            write_json(run_dir / "evidence.json", minimal_record(self.catalog))
            self.symlink_or_skip(outside, run_dir / "linked.txt")
            with self.assertRaisesRegex((OSError, RuntimeError, ValueError), "MANIFEST_SYMLINK"):
                write_payload_manifest(run_dir, "RUN-20260817T000000Z-b9c797d8-001")

    def test_validator_rejects_delivered_symlink_manifest_without_builder(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            run_dir = root / "bundle"
            run_dir.mkdir()
            outside = root / "outside.txt"
            outside.write_text("outside payload\n", encoding="utf-8")
            record = minimal_record(self.catalog)
            self.attach_standard_runner_artifacts(record, run_dir)
            stdout_artifact = next(item for item in record["artifacts"] if item["artifact_id"] == "ART-stdout")
            (run_dir / stdout_artifact["path"]).unlink()
            self.symlink_or_skip(outside, run_dir / stdout_artifact["path"])
            stdout_artifact["sha256"] = sha256_file(outside)
            write_json(run_dir / "evidence.json", record)
            self.write_delivered_manifest(record, run_dir)
            codes = self.validate_bundle_codes(record, run_dir)
            self.assertIn("ARTIFACT_SYMLINK", codes)
            self.assertIn("MANIFEST_SYMLINK", codes)
            self.assertNotIn("ARTIFACT_FILE", codes)

    def test_validator_rejects_path_escape_symlink_escape_and_nonregular_without_builder(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            run_dir = root / "bundle"
            run_dir.mkdir()
            outside = root / "outside-artifact.txt"
            outside.write_text("outside artifact\n", encoding="utf-8")
            record = minimal_record(self.catalog)
            self.attach_standard_runner_artifacts(record, run_dir)
            self.symlink_or_skip(outside, run_dir / "escape-link.txt")
            (run_dir / "not-regular").mkdir()
            record["artifacts"].extend(
                [
                    {"artifact_id": "ART-path-escape", "path": "../outside-artifact.txt", "sha256": sha256_file(outside)},
                    {"artifact_id": "ART-symlink-escape", "path": "escape-link.txt", "sha256": sha256_file(outside)},
                    {"artifact_id": "ART-nonregular", "path": "not-regular", "sha256": "0" * 64},
                ]
            )
            write_json(run_dir / "evidence.json", record)
            self.write_delivered_manifest(record, run_dir)
            codes = self.validate_bundle_codes(record, run_dir)
            self.assertIn("ARTIFACT_PATH", codes)
            self.assertIn("MANIFEST_PATH", codes)
            self.assertIn("ARTIFACT_SYMLINK", codes)
            self.assertIn("ARTIFACT_NONREGULAR", codes)
            self.assertIn("MANIFEST_SYMLINK", codes)
            self.assertIn("MANIFEST_NONREGULAR", codes)
            self.assertNotIn("ARTIFACT_FILE", codes)

    def soak_record(self, directory: Path, raw: dict[str, object], interval_seconds: int) -> dict[str, object]:
        raw_path = directory / "raw.json"
        write_json(raw_path, raw)
        record = minimal_record(self.catalog, "T-G0-018")
        record["artifacts"] = [{"artifact_id": "ART-raw", "path": "raw.json", "sha256": sha256_file(raw_path)}]
        record["soak"] = {
            "raw_timeseries_artifact_id": "ART-raw",
            "sample_interval_seconds": interval_seconds,
            "worst_growth_mib": 0.0,
            "worst_ols_slope_mib_per_hour": 0.0,
            "limits": {"growth_mib": 20, "slope_mib_per_hour": 1},
        }
        return record

    def soak_raw(self, offsets: list[int], rss_step: float = 0.01) -> dict[str, object]:
        origin = datetime(2026, 8, 17, tzinfo=timezone.utc)
        return {
            "sessions": [
                {
                    "session_id": "S-1",
                    "restart_boundary": False,
                    "samples": [
                        {
                            "sample_id": f"S-{index:03d}",
                            "timestamp": (origin + timedelta(seconds=offset)).isoformat().replace("+00:00", "Z"),
                            "rss_mib": 100 + index * rss_step,
                        }
                        for index, offset in enumerate(offsets)
                    ],
                }
            ]
        }

    def assert_soak_rejects(self, raw: dict[str, object], expected_code: str, interval_seconds: int = 300) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            record = self.soak_record(directory, raw, interval_seconds)
            errors: list[dict[str, str]] = []
            validate_soak(record, directory, errors)
            self.assertIn(expected_code, {item["code"] for item in errors})

    def test_soak_requires_positive_interval_and_monotonic_unique_timestamps(self) -> None:
        self.assert_soak_rejects(self.soak_raw([0] * 97), "SOAK_INTERVAL", interval_seconds=0)
        duplicate_offsets = [index * 300 for index in range(97)]
        duplicate_offsets[12] = duplicate_offsets[11]
        self.assert_soak_rejects(self.soak_raw(duplicate_offsets), "SOAK_DUPLICATE_TIMESTAMP")
        backward_offsets = [index * 300 for index in range(97)]
        backward_offsets[12] = backward_offsets[11] - 60
        self.assert_soak_rejects(self.soak_raw(backward_offsets), "SOAK_BACKWARD_TIMESTAMP")

    def test_soak_accepts_exact_97_samples_spanning_8h(self) -> None:
        raw = self.soak_raw([index * 300 for index in range(97)], rss_step=0.005)
        computed = analyze_soak(raw)
        self.assertEqual(len(computed["complete_windows"]), 1)
        self.assertEqual(len(computed["complete_windows"][0]["sample_ids"]), 97)
        self.assertEqual(computed["complete_windows"][0]["end"], "2026-08-17T08:00:00Z")
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            record = self.soak_record(directory, raw, 300)
            record["soak"]["worst_growth_mib"] = computed["worst_growth_mib"]
            record["soak"]["worst_ols_slope_mib_per_hour"] = computed["worst_ols_slope_mib_per_hour"]
            errors: list[dict[str, str]] = []
            validate_soak(record, directory, errors)
            self.assertEqual(errors, [])

    def test_runner_caps_stdout_stderr_and_marks_overflow(self) -> None:
        output_cap_bytes = self.frozen_runner_limit("MAX_CAPTURE_BYTES", FROZEN_MAX_CAPTURE_BYTES)
        script = (
            "import sys\n"
            f"sys.stdout.write('O' * ({output_cap_bytes} + 1))\n"
            f"sys.stderr.write('E' * ({output_cap_bytes} + 1))\n"
        )
        with tempfile.TemporaryDirectory() as temporary:
            command, bundle = self.runner_command(Path(temporary), [sys.executable, "-c", script])
            result = subprocess.run(command, text=True, capture_output=True, check=False, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertLessEqual((bundle / "stdout.log").stat().st_size, output_cap_bytes)
            self.assertLessEqual((bundle / "stderr.log").stat().st_size, output_cap_bytes)
            record = load_json(bundle / "evidence.json")
            validation = load_json(bundle / "validation.json")
            self.assertEqual(record["execution"]["status"], "fail")
            self.assertTrue((bundle / "handback" / f"HB-{record['run']['run_id']}.json").is_file())
            self.assertNotIn("Traceback", result.stderr)
            self.assertIn("RUNNER_OUTPUT_LIMIT", {item["code"] for item in validation["errors"]})
            self.assertNotIn("RUNNER_POLICY", {item["code"] for item in validation["errors"]})

    def create_prior_bundle(self, evidence_root: Path, ordinal: int, record: dict[str, object] | None = None) -> tuple[str, Path]:
        run_id = self.legal_run_id(200 + ordinal)
        prior_dir = evidence_root / run_id
        prior_dir.mkdir(parents=True)
        prior = record or minimal_record(self.catalog)
        prior["run"]["run_id"] = run_id  # type: ignore[index]
        prior["run"]["finished_at"] = "2026-08-17T00:00:00Z"  # type: ignore[index]
        prior["record_id"] = f"EV-{run_id}-{prior['run']['test_id']}"  # type: ignore[index]
        write_json(prior_dir / "evidence.json", prior)
        write_json(prior_dir / "validation.json", {"evidence_valid": True})
        (prior_dir / "payload-manifest.json").write_text("{}\n", encoding="utf-8")
        (prior_dir / "provenance-attestation.json").write_text("{}\n", encoding="utf-8")
        return prior["record_id"], prior_dir  # type: ignore[index]

    def test_initial_runner_does_not_scan_prior_bundles(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            evidence_root = root / "evidence"
            poison = evidence_root / self.legal_run_id(900)
            poison.mkdir(parents=True)
            (poison / "evidence.json").write_text("{not-json", encoding="utf-8")
            (poison / "validation.json").write_text("{not-json", encoding="utf-8")

            template = minimal_record(self.catalog)
            template_path = root / "template.json"
            preflight_path = root / "preflight.json"
            write_json(template_path, template)
            write_json(preflight_path, template["source"]["preflight"])
            command = [
                sys.executable,
                str(RUNNER_PATH),
                "--catalog",
                str(CATALOG_PATH),
                "--crosswalk",
                str(CROSSWALK_PATH),
                "--evidence-root",
                str(evidence_root),
                "--run-id",
                template["run"]["run_id"],
                "--template",
                str(template_path),
                "--source-preflight",
                str(preflight_path),
                "--renderer",
                "not_applicable",
                "--",
                sys.executable,
                "-c",
                "print('ok')",
            ]
            result = subprocess.run(command, text=True, capture_output=True, check=False, timeout=10)
            bundle = evidence_root / template["run"]["run_id"]
            validation = load_json(bundle / "validation.json")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(validation["evidence_valid"], validation["errors"])

    def test_retest_runner_uses_direct_supersedes_lookup_or_fails_closed_at_visit_limit(self) -> None:
        max_visits = self.prior_visit_limit()
        visit_count = (max_visits + 1) if max_visits is not None else 3
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            evidence_root = root / "evidence"
            predecessor = minimal_record(self.catalog)
            predecessor["execution"] = {"status": "fail"}
            predecessor_record_id, predecessor_dir = self.create_prior_bundle(evidence_root, 0, predecessor)
            predecessor_run_id = predecessor_record_id.removeprefix("EV-").removesuffix("-T-G0-010")
            (predecessor_dir / "handback").mkdir()
            write_json(
                predecessor_dir / "handback" / f"HB-{predecessor_run_id}.json",
                {"handback_id": f"HB-{predecessor_run_id}", "cell_id": predecessor["coverage_cell"]["cell_id"], "targeted_retest_argv": [sys.executable, "-c", "print('ok')"]},
            )
            for index in range(1, visit_count):
                self.create_prior_bundle(evidence_root, index)

            template = copy.deepcopy(predecessor)
            template["run"]["run_id"] = "RUN-20260817T120000Z-b9c797d8-001"
            template["run"]["started_at"] = "2026-08-17T12:00:00Z"
            template_path = root / "template.json"
            preflight_path = root / "preflight.json"
            write_json(template_path, template)
            write_json(preflight_path, template["source"]["preflight"])
            target = [sys.executable, "-c", "print('ok')"]
            command = [
                sys.executable,
                str(RUNNER_PATH),
                "--catalog",
                str(CATALOG_PATH),
                "--crosswalk",
                str(CROSSWALK_PATH),
                "--evidence-root",
                str(evidence_root),
                "--run-id",
                template["run"]["run_id"],
                "--template",
                str(template_path),
                "--source-preflight",
                str(preflight_path),
                "--renderer",
                "not_applicable",
                "--supersedes-record-id",
                predecessor_record_id,
                "--handback-id",
                f"HB-{predecessor_run_id}",
                "--",
                *target,
            ]
            result = subprocess.run(command, text=True, capture_output=True, check=False, timeout=10)
            bundle = evidence_root / template["run"]["run_id"]
            validation = load_json(bundle / "validation.json")
            codes = {item["code"] for item in validation["errors"]}
            if max_visits is None:
                self.assertEqual(result.returncode, 0, validation["errors"])
                self.assertTrue(validation["evidence_valid"], validation["errors"])
            else:
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("RUNNER_PRIOR_INDEX_LIMIT", codes)
                self.assertNotIn("RUNNER_POLICY", codes)

    def test_runner_reaps_child_that_inherits_output_pipes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            child_marker = Path(temporary) / "pipe-child.json"
            child_script = (
                "import json, os, sys, time\n"
                f"open({str(child_marker)!r}, 'w', encoding='utf-8').write(json.dumps({{'pid': os.getpid(), 'pgid': os.getpgrp()}}))\n"
                "print('child-ready', flush=True)\n"
                "time.sleep(30)\n"
            )
            script = (
                "import subprocess, sys\n"
                f"subprocess.Popen([sys.executable, '-c', {child_script!r}])\n"
                "print('parent-exit', flush=True)\n"
            )
            command, bundle = self.runner_command(Path(temporary), [sys.executable, "-c", script])
            process = subprocess.Popen(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            try:
                stdout, stderr = process.communicate(timeout=5)
                result_returncode = process.returncode
            except subprocess.TimeoutExpired:
                if child_marker.is_file():
                    child = load_json(child_marker)
                    if os.name == "posix":
                        try:
                            os.killpg(int(child["pgid"]), signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                else:
                    process.kill()
                stdout, stderr = process.communicate(timeout=5)
                result_returncode = process.returncode
            finally:
                if child_marker.is_file() and os.name == "posix":
                    child = load_json(child_marker)
                    try:
                        os.kill(int(child["pid"]), 0)
                    except ProcessLookupError:
                        pass
                    else:
                        try:
                            os.killpg(int(child["pgid"]), signal.SIGKILL)
                        except ProcessLookupError:
                            pass
            self.assertNotIn("Traceback", stderr)
            self.assertNotEqual(result_returncode, 0, stdout)
            validation = load_json(bundle / "validation.json")
            codes = {item["code"] for item in validation["errors"]}
            self.assertIn("RUNNER_PIPE_DESCENDANT", codes)
            record = load_json(bundle / "evidence.json")
            self.assertEqual(record["execution"]["status"], "fail")
            self.assertTrue((bundle / "handback" / f"HB-{record['run']['run_id']}.json").is_file())

    def test_retest_predecessor_must_exist_before_target_spawn(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            evidence_root = root / "evidence"
            current_run_id = "RUN-20260817T120001Z-b9c797d8-101"
            predecessor_run_id = "RUN-20260817T000001Z-b9c797d8-201"
            predecessor_record_id = f"EV-{predecessor_run_id}-T-G0-010"
            handback_id = f"HB-{predecessor_run_id}"
            target_started = root / "target-started"
            predecessor_record = copy.deepcopy(minimal_record(self.catalog))
            predecessor_record["run"]["run_id"] = predecessor_run_id
            predecessor_record["run"]["finished_at"] = "2026-08-17T00:00:00Z"
            predecessor_record["record_id"] = predecessor_record_id
            predecessor_record["execution"] = {"status": "fail"}
            target_script_path = root / "forge_predecessor.py"
            forged_handback = {
                "handback_id": handback_id,
                "cell_id": predecessor_record["coverage_cell"]["cell_id"],
                "targeted_retest_argv": [sys.executable, str(target_script_path)],
            }
            target_script_path.write_text(
                "import json\n"
                "from pathlib import Path\n"
                f"root = Path({str(evidence_root)!r})\n"
                f"bundle = root / {predecessor_run_id!r}\n"
                "bundle.mkdir(parents=True, exist_ok=True)\n"
                f"(bundle / 'evidence.json').write_text({json.dumps(predecessor_record, sort_keys=True, separators=(',', ':'))!r} + '\\n', encoding='utf-8')\n"
                f"(bundle / 'validation.json').write_text({json.dumps({'evidence_valid': True}, sort_keys=True, separators=(',', ':'))!r} + '\\n', encoding='utf-8')\n"
                f"(bundle / 'payload-manifest.json').write_text('{{}}\\n', encoding='utf-8')\n"
                f"(bundle / 'provenance-attestation.json').write_text('{{}}\\n', encoding='utf-8')\n"
                "(bundle / 'handback').mkdir()\n"
                f"(bundle / 'handback' / {handback_id + '.json'!r}).write_text({json.dumps(forged_handback, sort_keys=True, separators=(',', ':'))!r} + '\\n', encoding='utf-8')\n"
                f"Path({str(target_started)!r}).write_text('started', encoding='utf-8')\n"
                ,
                encoding="utf-8",
            )
            template = minimal_record(self.catalog)
            template_path = root / "template.json"
            preflight_path = root / "preflight.json"
            write_json(template_path, template)
            write_json(preflight_path, template["source"]["preflight"])
            command = [
                sys.executable,
                str(RUNNER_PATH),
                "--catalog",
                str(CATALOG_PATH),
                "--crosswalk",
                str(CROSSWALK_PATH),
                "--evidence-root",
                str(evidence_root),
                "--run-id",
                current_run_id,
                "--template",
                str(template_path),
                "--source-preflight",
                str(preflight_path),
                "--renderer",
                "not_applicable",
                "--supersedes-record-id",
                predecessor_record_id,
                "--handback-id",
                handback_id,
                "--",
                sys.executable,
                str(target_script_path),
            ]
            result = self.bounded_group_run(command, 8)
            bundle = evidence_root / current_run_id
            self.assertFalse(target_started.exists(), "missing predecessor must fail before target spawn")
            self.assertNotEqual(result.returncode, 0, result.stderr)
            self.assertTrue((bundle / "validation.json").is_file())
            validation = load_json(bundle / "validation.json")
            self.assertFalse(validation.get("evidence_valid") is True)
            self.assertIn("RUNNER_PREDECESSOR_MISSING", {item["code"] for item in validation.get("errors", [])})

    def test_preexisting_retest_predecessor_remains_legal(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            evidence_root = root / "evidence"
            predecessor = minimal_record(self.catalog)
            predecessor["execution"] = {"status": "fail"}
            predecessor_record_id, predecessor_dir = self.create_prior_bundle(evidence_root, 0, predecessor)
            predecessor_run_id = predecessor_record_id.removeprefix("EV-").removesuffix("-T-G0-010")
            (predecessor_dir / "handback").mkdir()
            write_json(
                predecessor_dir / "handback" / f"HB-{predecessor_run_id}.json",
                {
                    "handback_id": f"HB-{predecessor_run_id}",
                    "cell_id": predecessor["coverage_cell"]["cell_id"],
                    "targeted_retest_argv": [sys.executable, "-c", "print('legal retest')"],
                },
            )
            template = copy.deepcopy(predecessor)
            current_run_id = "RUN-20260817T120002Z-b9c797d8-102"
            template["run"]["run_id"] = current_run_id
            template_path = root / "template.json"
            preflight_path = root / "preflight.json"
            write_json(template_path, template)
            write_json(preflight_path, template["source"]["preflight"])
            command = [
                sys.executable,
                str(RUNNER_PATH),
                "--catalog",
                str(CATALOG_PATH),
                "--crosswalk",
                str(CROSSWALK_PATH),
                "--evidence-root",
                str(evidence_root),
                "--run-id",
                current_run_id,
                "--template",
                str(template_path),
                "--source-preflight",
                str(preflight_path),
                "--renderer",
                "not_applicable",
                "--supersedes-record-id",
                predecessor_record_id,
                "--handback-id",
                f"HB-{predecessor_run_id}",
                "--",
                sys.executable,
                "-c",
                "print('legal retest')",
            ]
            result = self.bounded_group_run(command, 8)
            bundle = evidence_root / current_run_id
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(load_json(bundle / "validation.json")["evidence_valid"])

    def test_bundle_nonregular_entries_are_bounded_and_stable(self) -> None:
        if not hasattr(os, "mkfifo"):
            self.skipTest("FIFO probes require POSIX mkfifo")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "bundle"
            root.mkdir()
            cases: list[tuple[str, str]] = []
            fifo = root / "fifo"
            os.mkfifo(fifo)
            cases.append(("fifo", "fifo"))
            directory = root / "directory"
            directory.mkdir()
            cases.append(("directory", "directory"))
            socket_path = root / "socket"
            unix_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                try:
                    unix_socket.bind(str(socket_path))
                except OSError:
                    pass
                else:
                    cases.append(("socket", "socket"))
                device = root / "device"
                if hasattr(os, "mknod") and hasattr(os, "makedev"):
                    try:
                        os.mknod(device, stat.S_IFCHR | 0o600, os.makedev(1, 3))
                    except (OSError, PermissionError):
                        pass
                    else:
                        cases.append(("device", "device"))
                for _kind, relative in cases:
                    for operation in ("read", "sha256"):
                        payload = self.bundle_operation_probe(root, relative, operation, timeout=2)
                        self.assertFalse(payload.get("ok"), f"{operation} unexpectedly accepted {relative}: {payload}")
                        self.assertEqual(payload.get("code"), "BUNDLE_NONREGULAR", payload)
            finally:
                unix_socket.close()

    def test_runner_fifo_capture_fails_closed_with_handback(self) -> None:
        if not hasattr(os, "mkfifo"):
            self.skipTest("runner FIFO capture probe requires POSIX mkfifo")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = root / "runner"
            template = minimal_record(self.catalog)
            fifo_path = directory / "evidence" / template["run"]["run_id"] / "stdout.log"
            command, bundle = self.runner_command(
                directory,
                [
                    sys.executable,
                    "-c",
                    f"import os; os.mkfifo({str(fifo_path)!r})",
                ],
                template,
            )
            result = self.bounded_group_run(command, 5)
            self.assertNotEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("Traceback", result.stderr)
            self.assertTrue((bundle / "validation.json").is_file())
            record = load_json(bundle / "evidence.json")
            self.assertEqual(record["execution"]["status"], "fail")
            self.assertTrue((bundle / "handback" / f"HB-{record['run']['run_id']}.json").is_file())
            codes = {item["code"] for item in load_json(bundle / "validation.json").get("errors", [])}
            self.assertIn("RUNNER_CAPTURE_PUBLISH", codes)
            self.assertNotIn("RUNNER_POLICY", codes)

    def test_bundle_parent_and_leaf_symlinks_have_stable_codes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "bundle"
            bundle.mkdir()
            outside = root / "outside"
            outside.mkdir()
            (outside / "payload.txt").write_text("outside\n", encoding="utf-8")
            self.symlink_or_skip(outside, bundle / "parent-link")
            self.symlink_or_skip(outside / "payload.txt", bundle / "leaf-link")
            for relative in ("parent-link/payload.txt", "leaf-link"):
                payload = self.bundle_operation_probe(bundle, relative, "sha256")
                self.assertFalse(payload.get("ok"), payload)
                self.assertEqual(payload.get("code"), "BUNDLE_SYMLINK", payload)
            ordinary_parent = bundle / "parent-file"
            ordinary_parent.write_text("not a directory\n", encoding="utf-8")
            payload = self.bundle_operation_probe(bundle, "parent-file/payload.txt", "sha256")
            self.assertFalse(payload.get("ok"), payload)
            self.assertEqual(payload.get("code"), "BUNDLE_NONREGULAR", payload)

    def test_bundle_hash_double_budget_rejects_before_large_reads(self) -> None:
        file_name, file_limit = self.required_semantic_limit("file")
        aggregate_name, aggregate_limit = self.required_semantic_limit("aggregate")
        self.assertGreater(file_limit, 0, file_name)
        self.assertGreaterEqual(aggregate_limit, file_limit, f"{aggregate_name} must cover at least one file")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "bundle"
            root.mkdir()
            oversized = root / "oversized.bin"
            oversized.touch()
            os.truncate(oversized, file_limit + 1)
            payload = self.bundle_operation_probe(root, "oversized.bin", "sha256", fail_on_read=True)
            self.assertFalse(payload.get("ok"), payload)
            self.assertNotEqual(payload.get("type"), "RuntimeError", payload)
            self.assertEqual(payload.get("code"), "HASH_FILE_LIMIT", payload)

            aggregate_root = Path(temporary) / "aggregate-bundle"
            aggregate_root.mkdir()
            first_size = max(1, min(file_limit, aggregate_limit))
            second_size = max(1, min(file_limit, aggregate_limit - first_size + 1))
            if first_size + second_size <= aggregate_limit:
                second_size = file_limit
            first = aggregate_root / "part-a.bin"
            second = aggregate_root / "part-b.bin"
            first.touch()
            second.touch()
            os.truncate(first, first_size)
            os.truncate(second, second_size)
            with self.assertRaises((OSError, ValueError, RuntimeError)) as builder_error:
                EVIDENCE_CONTRACT_LIB.write_payload_manifest(aggregate_root, "RUN-20260817T000000Z-b9c797d8-001")
            self.assertIn("MANIFEST_HASH_LIMIT", str(builder_error.exception))

            record = minimal_record(self.catalog)
            record["artifacts"] = [
                {"artifact_id": "ART-a", "path": "part-a.bin", "sha256": "0" * 64},
                {"artifact_id": "ART-b", "path": "part-b.bin", "sha256": "0" * 64},
            ]
            manifest = {
                "schema_version": MANIFEST_VERSION,
                "run_id": record["run"]["run_id"],
                "authority": {
                    "catalog_version": "coverage-g0-v1",
                    "catalog_sha256": record["authority"]["catalog_sha256"],
                    "crosswalk_sha256": record["authority"]["crosswalk_sha256"],
                },
                "payload_files": [
                    {"path": "evidence.json", "media_type": "application/json", "sha256": "0" * 64},
                    {"path": "part-a.bin", "media_type": "application/octet-stream", "sha256": "0" * 64},
                    {"path": "part-b.bin", "media_type": "application/octet-stream", "sha256": "0" * 64},
                ],
            }
            write_json(aggregate_root / "evidence.json", record)
            write_json(aggregate_root / "payload-manifest.json", manifest)
            write_json(
                aggregate_root / "provenance-attestation.json",
                {
                    "mode": "local_development",
                    "release_eligible": False,
                    "manifest_digest_sha256": sha256_bytes(canonical_json_bytes(manifest)),
                    "authority": manifest["authority"],
                },
            )
            validation = validate_evidence(record, self.catalog, self.crosswalk, aggregate_root)
            codes = {item["code"] for item in validation["errors"]}
            self.assertFalse(validation["evidence_valid"])
            self.assertIn("ARTIFACT_HASH_LIMIT", codes)
            self.assertIn("MANIFEST_HASH_LIMIT", codes)

    def trusted_bundle(self, root: Path) -> dict[str, object]:
        bundle = root / "trusted"
        bundle.mkdir()
        record = minimal_record(self.catalog)
        self.attach_standard_runner_artifacts(record, bundle)
        write_json(bundle / "evidence.json", record)
        self.write_delivered_manifest(record, bundle)
        manifest = load_json(bundle / "payload-manifest.json")
        write_json(bundle / "signature-envelope.json", {"signature": "fixture"})
        write_json(bundle / "external-registration.json", {"registration": "fixture"})
        write_json(
            bundle / "provenance-attestation.json",
            {
                "mode": "trusted_ci",
                "release_eligible": False,
                "manifest_digest_sha256": sha256_bytes(canonical_json_bytes(manifest)),
                "authority": manifest["authority"],
                "workflow": "fixture",
                "trusted_timestamp": "2026-08-17T00:00:00Z",
                "immutable_object": "fixture-object",
                "signer_identity": "fixture-signer",
                "external_registration_id": "fixture-registration",
            },
        )
        return record

    def test_trusted_verifier_timeout_is_bounded_and_structured(self) -> None:
        timeout_name, _timeout_limit = self.required_semantic_limit("trusted_timeout")
        output_name, _output_limit = self.required_semantic_limit("trusted_output")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            record = self.trusted_bundle(root)
            hang = root / "hang_verifier.py"
            hang.write_text("import time; time.sleep(30)\n", encoding="utf-8")
            env = os.environ.copy()
            env["TESSERA_TRUSTED_VERIFY_COMMAND"] = f"{sys.executable} {hang}"
            script = (
                "import json, sys\n"
                f"sys.path.insert(0, {str(TESTKIT / 'lib')!r})\n"
                "import evidence_contract as ec\n"
                f"setattr(ec, {timeout_name!r}, 1)\n"
                f"setattr(ec, {output_name!r}, 64)\n"
                f"record = ec.load_json(Path({str(root / 'trusted' / 'evidence.json')!r}))\n"
                f"result = ec.validate_evidence(record, ec.load_json(Path({str(CATALOG_PATH)!r})), ec.load_json(Path({str(CROSSWALK_PATH)!r})), Path({str(root / 'trusted')!r}))\n"
                "print(json.dumps(result))\n"
            )
            command = [sys.executable, "-c", "from pathlib import Path\n" + script]
            result = self.bounded_group_run(command, 3, env=env)
            self.assertNotIn("Traceback", result.stderr)
            document = json.loads(result.stdout)
            self.assertFalse(document["evidence_valid"])
            codes = {item["code"] for item in document["errors"]}
            self.assertIn("TRUSTED_VERIFIER_TIMEOUT", codes)
            self.assertNotIn("TRUSTED_VERIFIER", codes)

    def test_trusted_verifier_output_cap_is_bounded_and_structured(self) -> None:
        timeout_name, _timeout_limit = self.required_semantic_limit("trusted_timeout")
        output_name, _output_limit = self.required_semantic_limit("trusted_output")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            record = self.trusted_bundle(root)
            noisy = root / "noisy_verifier.py"
            noisy.write_text(
                "import sys\n"
                "sys.stdout.write('O' * 65)\n"
                "sys.stderr.write('E' * 65)\n"
                "sys.exit(0)\n",
                encoding="utf-8",
            )
            env = os.environ.copy()
            env["TESSERA_TRUSTED_VERIFY_COMMAND"] = f"{sys.executable} {noisy}"
            script = (
                "import json, sys\n"
                f"sys.path.insert(0, {str(TESTKIT / 'lib')!r})\n"
                "import evidence_contract as ec\n"
                f"setattr(ec, {timeout_name!r}, 1)\n"
                f"setattr(ec, {output_name!r}, 64)\n"
                f"record = ec.load_json(Path({str(root / 'trusted' / 'evidence.json')!r}))\n"
                f"result = ec.validate_evidence(record, ec.load_json(Path({str(CATALOG_PATH)!r})), ec.load_json(Path({str(CROSSWALK_PATH)!r})), Path({str(root / 'trusted')!r}))\n"
                "print(json.dumps(result))\n"
            )
            result = self.bounded_group_run([sys.executable, "-c", "from pathlib import Path\n" + script], 3, env=env)
            self.assertNotIn("Traceback", result.stderr)
            document = json.loads(result.stdout)
            self.assertFalse(document["evidence_valid"])
            codes = {item["code"] for item in document["errors"]}
            self.assertIn("TRUSTED_VERIFIER_OUTPUT_LIMIT", codes)
            self.assertNotIn("TRUSTED_VERIFIER", codes)

    def test_bundle_root_entry_traversal_is_bounded(self) -> None:
        self.assertTrue(hasattr(EVIDENCE_CONTRACT_LIB, "MAX_BUNDLE_ENTRIES"), "MAX_BUNDLE_ENTRIES must be a production contract")
        limit = getattr(EVIDENCE_CONTRACT_LIB, "MAX_BUNDLE_ENTRIES")
        self.assertIsInstance(limit, int)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "bundle"
            root.mkdir()
            for index in range(limit + 1):
                (root / f"entry-{index:05d}").write_bytes(b"x")
            script = (
                "import json, sys\n"
                "from pathlib import Path\n"
                f"sys.path.insert(0, {str(TESTKIT / 'lib')!r})\n"
                "import evidence_contract as ec\n"
                "try:\n"
                f"    list(ec.iter_bundle_relative_files(Path({str(root)!r})))\n"
                "except Exception as exc:\n"
                "    print(json.dumps({'code': getattr(exc, 'code', None), 'message': str(exc)}))\n"
                "else:\n"
                "    print(json.dumps({'code': None}))\n"
            )
            result = self.bounded_group_run([sys.executable, "-c", script], 5)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["code"], "BUNDLE_ENTRY_LIMIT", payload)

    def assert_windows_ctypes_layout(
        self,
        module: object,
        structure_name: str,
        *,
        size: int | None,
        offsets: dict[str, int],
    ) -> None:
        structure = production_ctypes_structure(module, structure_name)
        if size is not None:
            self.assertEqual(
                ctypes.sizeof(structure),
                size,
                f"{getattr(module, '__name__', module)}.{structure.__name__} must retain its Win32 x64 ABI size",
            )
        for field_name, expected_offset in offsets.items():
            self.assertEqual(
                production_ctypes_field_offset(structure, field_name),
                expected_offset,
                f"{getattr(module, '__name__', module)}.{structure.__name__}.{field_name} has the wrong Win32 x64 ABI offset",
            )

    def assert_windows_create_process_uses_canonical_dtos(self, fake: FakeWindowsKernel32, helper_name: str) -> None:
        self.assertIs(
            fake.create_process_startup_type,
            EVIDENCE_CONTRACT_LIB._WinStartupInfoEx,
            f"{helper_name} CreateProcessW must receive the canonical StartupInfoEx DTO",
        )
        self.assertIs(
            fake.create_process_information_type,
            EVIDENCE_CONTRACT_LIB._WinProcessInformation,
            f"{helper_name} CreateProcessW must receive the canonical ProcessInformation DTO",
        )

    def assert_windows_launch_helper_uses_canonical_dtos(
        self,
        helper_name: str,
        helper: object,
        *,
        include_sinks: bool,
        launch_code: str,
    ) -> None:
        fake = FakeWindowsKernel32(assign_success=False)
        result = invoke_windows_helper(
            helper,
            [sys.executable, "-B", "-c", "print('canonical DTO probe')"],
            fake,
            include_sinks=include_sinks,
        )
        self.assertIn(launch_code, result_error_codes(result), (helper_name, result_errors(result), fake.calls))
        self.assert_windows_create_process_uses_canonical_dtos(fake, helper_name)

    def test_windows_x64_ctypes_abi_layouts_are_production_definitions(self) -> None:
        for structure_name, size, offsets in (
            ("SECURITY_ATTRIBUTES", 24, {"nLength": 0, "lpSecurityDescriptor": 8, "bInheritHandle": 16}),
            ("STARTUPINFOW", 104, {"cb": 0, "lpReserved": 8, "dwX": 32, "dwFlags": 60, "wShowWindow": 64, "lpReserved2": 72, "hStdInput": 80, "hStdError": 96}),
            ("STARTUPINFOEXW", 112, {"lpAttributeList": 104}),
            ("PROCESS_INFORMATION", 24, {"dwProcessId": 16, "dwThreadId": 20}),
            ("JOBOBJECT_BASIC_LIMIT_INFORMATION", 64, {"LimitFlags": 16, "MinimumWorkingSetSize": 24, "ActiveProcessLimit": 40, "Affinity": 48, "SchedulingClass": 60}),
            ("JOBOBJECT_EXTENDED_LIMIT_INFORMATION", 144, {"IoInfo": 64, "ProcessMemoryLimit": 112, "PeakJobMemoryUsed": 136}),
        ):
            with self.subTest(module="run_evidence", structure=structure_name):
                self.assert_windows_ctypes_layout(RUN_EVIDENCE_LIB, structure_name, size=size, offsets=offsets)

        for structure_name, size, offsets in (
            ("UNICODE_STRING", 16, {}),
            ("OBJECT_ATTRIBUTES", 48, {}),
            ("FILE_ATTRIBUTE_TAG_INFO", 8, {}),
            ("FILE_ID_INFO", 24, {}),
            ("FILE_DIRECTORY_INFORMATION", 64, {"FileNameLength": 60}),
            ("FILE_RENAME_INFO", None, {"FileName": 20}),
        ):
            with self.subTest(module="evidence_contract", structure=structure_name):
                self.assert_windows_ctypes_layout(EVIDENCE_CONTRACT_LIB, structure_name, size=size, offsets=offsets)

    def test_windows_launch_helpers_use_canonical_ctypes_dtos_at_runtime(self) -> None:
        helpers = (
            ("untrusted", RUN_EVIDENCE_LIB.communicate_windows_target, True, "RUNNER_WINDOWS_LAUNCH"),
            ("trusted", EVIDENCE_CONTRACT_LIB._run_trusted_verifier_windows, False, "TRUSTED_VERIFIER_START"),
        )
        for helper_name, helper, include_sinks, launch_code in helpers:
            with self.subTest(helper=helper_name):
                self.assert_windows_launch_helper_uses_canonical_dtos(
                    helper_name,
                    helper,
                    include_sinks=include_sinks,
                    launch_code=launch_code,
                )

    def test_windows_launch_dto_identity_rejects_same_layout_alias_subclasses(self) -> None:
        canonical_startup = EVIDENCE_CONTRACT_LIB._WinStartupInfoEx
        canonical_process = EVIDENCE_CONTRACT_LIB._WinProcessInformation

        class LocalStartupInfoEx(canonical_startup):
            pass

        class LocalProcessInformation(canonical_process):
            pass

        indirect_startup_alias = LocalStartupInfoEx
        indirect_process_alias = LocalProcessInformation
        self.assertEqual(ctypes.sizeof(indirect_startup_alias), ctypes.sizeof(canonical_startup))
        self.assertEqual(ctypes.sizeof(indirect_process_alias), ctypes.sizeof(canonical_process))
        self.assertIsNot(indirect_startup_alias, canonical_startup)
        self.assertIsNot(indirect_process_alias, canonical_process)

        scenarios = (
            ("untrusted-local-alias", RUN_EVIDENCE_LIB, RUN_EVIDENCE_LIB.communicate_windows_target, True, "RUNNER_WINDOWS_LAUNCH"),
            ("trusted-canonical-symbol", EVIDENCE_CONTRACT_LIB, EVIDENCE_CONTRACT_LIB._run_trusted_verifier_windows, False, "TRUSTED_VERIFIER_START"),
        )
        for scenario_name, owner_module, helper, include_sinks, launch_code in scenarios:
            with self.subTest(scenario=scenario_name):
                original_startup = owner_module._WinStartupInfoEx
                original_process = owner_module._WinProcessInformation
                fake = FakeWindowsKernel32(assign_success=False)
                try:
                    owner_module._WinStartupInfoEx = indirect_startup_alias
                    owner_module._WinProcessInformation = indirect_process_alias
                    result = invoke_windows_helper(
                        helper,
                        [sys.executable, "-B", "-c", "print('same layout alias probe')"],
                        fake,
                        include_sinks=include_sinks,
                    )
                finally:
                    owner_module._WinStartupInfoEx = original_startup
                    owner_module._WinProcessInformation = original_process

                self.assertIn(launch_code, result_error_codes(result), (scenario_name, result_errors(result), fake.calls))
                self.assertIs(fake.create_process_startup_type, indirect_startup_alias, fake.calls)
                self.assertIs(fake.create_process_information_type, indirect_process_alias, fake.calls)
                with self.assertRaises(AssertionError, msg=f"{scenario_name} must reject a same-layout StartupInfoEx alias"):
                    self.assert_windows_create_process_uses_canonical_dtos(fake, scenario_name)

    def test_windows_rename_info_buffer_uses_filename_field_offset(self) -> None:
        self.assertTrue(hasattr(EVIDENCE_CONTRACT_LIB, "_windows_rename_relative"), "Windows rename helper must be auditable")
        self.assertTrue(hasattr(EVIDENCE_CONTRACT_LIB, "_windows_kernel32"), "Windows kernel32 hook must be auditable")
        expected_offset = 20
        encoded_name = "final.txt".encode("utf-16-le")
        expected_size = expected_offset + len(encoded_name)
        expected_root = 0x123456789ABCDEF0
        expected_flags = getattr(EVIDENCE_CONTRACT_LIB, "_WIN_FILE_RENAME_FLAG_REPLACE_IF_EXISTS")

        class FakeKernel32:
            def __init__(self) -> None:
                self.calls: list[tuple[int, int, bytes]] = []

            def SetFileInformationByHandle(self, _handle: object, info_class: object, payload: object, size: object) -> int:
                observed_size = int(getattr(size, "value", size))
                self.calls.append((int(getattr(info_class, "value", info_class)), observed_size, ctypes.string_at(payload, observed_size)))
                return 1

        fake = FakeKernel32()
        original = EVIDENCE_CONTRACT_LIB._windows_kernel32
        try:
            EVIDENCE_CONTRACT_LIB._windows_kernel32 = lambda: fake
            EVIDENCE_CONTRACT_LIB._windows_rename_relative(0x1111, expected_root, "final.txt")
        finally:
            EVIDENCE_CONTRACT_LIB._windows_kernel32 = original

        self.assertEqual(len(fake.calls), 1)
        _info_class, observed_size, payload = fake.calls[0]
        self.assertEqual(observed_size, expected_size)
        self.assertEqual(int.from_bytes(payload[0:4], "little"), expected_flags)
        self.assertEqual(int.from_bytes(payload[8:16], "little"), expected_root)
        self.assertEqual(int.from_bytes(payload[16:20], "little"), len(encoded_name))
        self.assertEqual(payload[expected_offset:expected_offset + len(encoded_name)], encoded_name)

    def test_trusted_verifier_pipe_descendant_cannot_keep_validator_process_alive(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            child_pid = root / "trusted-verifier-child.pid"
            verifier = root / "verifier_pipe_descendant.py"
            verifier.write_text(
                "import subprocess, sys\n"
                "from pathlib import Path\n"
                f"child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'], stdout=sys.stdout, stderr=sys.stderr)\n"
                f"Path({str(child_pid)!r}).write_text(str(child.pid), encoding='utf-8')\n",
                encoding="utf-8",
            )
            probe = (
                "import json, sys, threading\n"
                f"sys.path.insert(0, {str(TESTKIT / 'lib')!r})\n"
                "import evidence_contract as ec\n"
                "ec.TRUSTED_VERIFIER_TIMEOUT_SECONDS = 1\n"
                "ec.TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS = 0.2\n"
                f"errors = ec.run_trusted_verifier([sys.executable, {str(verifier)!r}])\n"
                "alive = [thread.name for thread in threading.enumerate() if thread is not threading.main_thread() and thread.is_alive()]\n"
                "print(json.dumps({'errors': errors, 'alive_threads': alive}), flush=True)\n"
            )
            process = subprocess.Popen(
                [sys.executable, "-c", probe],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=(os.name == "posix"),
            )
            try:
                stdout, stderr = process.communicate(timeout=4)
                timed_out = False
            except subprocess.TimeoutExpired:
                timed_out = True
                if os.name == "posix":
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                else:
                    process.kill()
                stdout, stderr = process.communicate(timeout=2)
            finally:
                if child_pid.is_file():
                    try:
                        os.kill(int(child_pid.read_text(encoding="utf-8")), signal.SIGKILL)
                    except (OSError, ProcessLookupError, ValueError):
                        pass

            self.assertFalse(timed_out, f"trusted verifier pipe descendant prevented natural process exit; stdout={stdout!r} stderr={stderr!r}")
            self.assertNotIn("Traceback", stderr)
            document = json.loads(stdout)
            codes = {item["code"] for item in document["errors"]}
            self.assertIn("TRUSTED_VERIFIER_PIPE", codes)
            self.assertNotIn("TRUSTED_VERIFIER", codes)
            self.assertEqual(document["alive_threads"], [])

    def test_trusted_verifier_sigterm_ignoring_descendant_is_reaped_before_return(self) -> None:
        if os.name != "posix":
            self.skipTest("SIGTERM-ignoring process-group probe is POSIX-only")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            child_info = root / "trusted-verifier-child.json"
            child = root / "sigterm_ignoring_child.py"
            verifier = root / "verifier_pipe_descendant.py"
            child.write_text(
                "import json, os, signal, sys, time\n"
                "from pathlib import Path\n"
                "signal.signal(signal.SIGTERM, signal.SIG_IGN)\n"
                f"Path({str(child_info)!r}).write_text(json.dumps({{'pid': os.getpid(), 'pgid': os.getpgrp()}}), encoding='utf-8')\n"
                "sys.stdout.write('descendant-ready\\n')\n"
                "sys.stdout.flush()\n"
                "time.sleep(30)\n",
                encoding="utf-8",
            )
            verifier.write_text(
                "import subprocess, sys, time\n"
                "from pathlib import Path\n"
                f"child_info = Path({str(child_info)!r})\n"
                f"subprocess.Popen([sys.executable, {str(child)!r}], stdout=sys.stdout, stderr=sys.stderr)\n"
                "deadline = time.monotonic() + 2\n"
                "while time.monotonic() < deadline and not child_info.is_file():\n"
                "    time.sleep(0.01)\n",
                encoding="utf-8",
            )
            probe = (
                "import json, os, signal, sys, threading, time\n"
                "from pathlib import Path\n"
                f"sys.path.insert(0, {str(TESTKIT / 'lib')!r})\n"
                "import evidence_contract as ec\n"
                "ec.TRUSTED_VERIFIER_TIMEOUT_SECONDS = 1\n"
                "ec.TRUSTED_VERIFIER_TERMINATION_GRACE_SECONDS = 0.2\n"
                "def pid_alive(pid):\n"
                "    try:\n"
                "        os.kill(pid, 0)\n"
                "    except ProcessLookupError:\n"
                "        return False\n"
                "    return True\n"
                "def group_alive(pgid):\n"
                "    try:\n"
                "        os.killpg(pgid, 0)\n"
                "    except ProcessLookupError:\n"
                "        return False\n"
                "    return True\n"
                f"errors = ec.run_trusted_verifier([sys.executable, {str(verifier)!r}])\n"
                f"info_path = Path({str(child_info)!r})\n"
                "info = json.loads(info_path.read_text(encoding='utf-8')) if info_path.is_file() else None\n"
                "deadline = time.monotonic() + 1.5\n"
                "while info and time.monotonic() < deadline and (pid_alive(int(info['pid'])) or group_alive(int(info['pgid']))):\n"
                "    time.sleep(0.02)\n"
                "alive = [thread.name for thread in threading.enumerate() if thread is not threading.main_thread() and thread.is_alive()]\n"
                "print(json.dumps({'errors': errors, 'alive_threads': alive, 'child_info': info, 'child_alive_after_return': bool(info and pid_alive(int(info['pid']))), 'group_alive_after_return': bool(info and group_alive(int(info['pgid'])))}), flush=True)\n"
            )
            process = subprocess.Popen(
                [sys.executable, "-B", "-c", probe],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=os.environ | {"PYTHONDONTWRITEBYTECODE": "1"},
                start_new_session=True,
            )
            try:
                stdout, stderr = process.communicate(timeout=5)
                timed_out = False
            except subprocess.TimeoutExpired:
                timed_out = True
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                stdout, stderr = process.communicate(timeout=2)
            finally:
                if child_info.is_file():
                    try:
                        os.kill(int(load_json(child_info)["pid"]), signal.SIGKILL)
                    except (OSError, ProcessLookupError, ValueError):
                        pass

            self.assertFalse(timed_out, f"trusted verifier descendant kept outer Python alive; stdout={stdout!r} stderr={stderr!r}")
            self.assertEqual(process.returncode, 0, stderr)
            self.assertNotIn("Traceback", stderr)
            document = json.loads(stdout)
            self.assertIsNotNone(document["child_info"], "probe must create the SIGTERM-ignoring descendant before verifier exit")
            codes = {item["code"] for item in document["errors"]}
            self.assertIn("TRUSTED_VERIFIER_PIPE", codes)
            self.assertNotIn("TRUSTED_VERIFIER", codes)
            self.assertEqual(document["alive_threads"], [])
            self.assertFalse(document["child_alive_after_return"], document)
            self.assertFalse(document["group_alive_after_return"], document)

    def test_windows_trusted_verifier_launch_is_suspended_assigned_before_resume(self) -> None:
        helper = getattr(EVIDENCE_CONTRACT_LIB, "_run_trusted_verifier_windows", None)
        self.assertTrue(callable(helper), "_run_trusted_verifier_windows must be an auditable host-independent helper")
        fake = FakeWindowsKernel32(assign_success=False)
        original_popen = subprocess.Popen

        def forbidden_popen(*_args: object, **_kwargs: object) -> object:
            raise AssertionError("Windows trusted verifier must not use ordinary subprocess.Popen before Job assignment")

        try:
            subprocess.Popen = forbidden_popen  # type: ignore[assignment]
            if hasattr(EVIDENCE_CONTRACT_LIB, "subprocess"):
                EVIDENCE_CONTRACT_LIB.subprocess.Popen = forbidden_popen
            result = invoke_windows_helper(
                helper,
                [sys.executable, "-c", "print('trusted')"],
                fake,
                include_sinks=False,
            )
        finally:
            subprocess.Popen = original_popen  # type: ignore[assignment]
            if hasattr(EVIDENCE_CONTRACT_LIB, "subprocess"):
                EVIDENCE_CONTRACT_LIB.subprocess.Popen = original_popen

        codes = result_error_codes(result)
        self.assertIn("TRUSTED_VERIFIER_START", codes)
        self.assertNotIn("TRUSTED_VERIFIER", codes)
        self.assertLess(call_index(fake.calls, "CreateJobObjectW"), call_index(fake.calls, "CreateProcessW"))
        self.assertLess(call_index(fake.calls, "SetInformationJobObject"), call_index(fake.calls, "CreateProcessW"))
        self.assertLess(call_index(fake.calls, "UpdateProcThreadAttribute"), call_index(fake.calls, "CreateProcessW"))
        create_index = call_index(fake.calls, "CreateProcessW")
        assign_index = call_index(fake.calls, "AssignProcessToJobObject")
        self.assertGreater(assign_index, create_index, fake.calls)
        self.assertNotIn("ResumeThread", [call[0] for call in fake.calls])
        self.assertTrue(fake.create_process_flags & CREATE_SUSPENDED, fake.calls)
        self.assertTrue(fake.create_process_flags & EXTENDED_STARTUPINFO_PRESENT, fake.calls)
        self.assertIs(fake.create_process_inherit_handles, True)
        self.assertTrue(
            any(call[0] == "UpdateProcThreadAttribute" and call[1][0] == PROC_THREAD_ATTRIBUTE_HANDLE_LIST for call in fake.calls),
            f"CreateProcessW must receive PROC_THREAD_ATTRIBUTE_HANDLE_LIST: {fake.calls!r}",
        )
        assert_windows_restricted_inheritance(self, fake, require_nul_stdin=False)
        terminate_index = next(index for index, call in enumerate(fake.calls) if call[0] == "TerminateProcess" and call[1][0] == fake.process_handle)
        wait_index = next(index for index, call in enumerate(fake.calls) if call[0] == "WaitForSingleObject" and call[1][0] == fake.process_handle)
        close_index = call_index(fake.calls, "CloseHandle", fake.process_handle)
        wait_timeout = fake.calls[wait_index][1][1]
        self.assertLess(assign_index, terminate_index, fake.calls)
        self.assertLess(terminate_index, close_index, fake.calls)
        self.assertLess(wait_index, close_index, fake.calls)
        self.assertGreaterEqual(wait_timeout, 0)
        self.assertLessEqual(wait_timeout, 2000)

    def test_windows_untrusted_target_assign_failure_terminates_before_close(self) -> None:
        helper = getattr(RUN_EVIDENCE_LIB, "communicate_windows_target", None)
        self.assertTrue(callable(helper), "communicate_windows_target must be an auditable host-independent Windows helper")
        fake = FakeWindowsKernel32(assign_success=False)
        original_popen = subprocess.Popen

        def forbidden_popen(*_args: object, **_kwargs: object) -> object:
            raise AssertionError("Windows target launch must use CreateProcessW with suspended pre-Job assignment")

        try:
            subprocess.Popen = forbidden_popen  # type: ignore[assignment]
            if hasattr(RUN_EVIDENCE_LIB, "subprocess"):
                RUN_EVIDENCE_LIB.subprocess.Popen = forbidden_popen
            result = invoke_windows_helper(
                helper,
                [sys.executable, "-c", "print('target')"],
                fake,
                include_sinks=True,
            )
        finally:
            subprocess.Popen = original_popen  # type: ignore[assignment]
            if hasattr(RUN_EVIDENCE_LIB, "subprocess"):
                RUN_EVIDENCE_LIB.subprocess.Popen = original_popen

        codes = result_error_codes(result)
        self.assertIn("RUNNER_WINDOWS_LAUNCH", codes)
        self.assertNotIn("RUNNER_POLICY", codes)
        self.assertNotIn("RUNNER_WINDOWS_LIFECYCLE_UNCONFIRMED", codes)
        self.assertLess(call_index(fake.calls, "CreateJobObjectW"), call_index(fake.calls, "CreateProcessW"))
        self.assertLess(call_index(fake.calls, "UpdateProcThreadAttribute"), call_index(fake.calls, "CreateProcessW"))
        create_index = call_index(fake.calls, "CreateProcessW")
        assign_index = call_index(fake.calls, "AssignProcessToJobObject")
        self.assertGreater(assign_index, create_index, fake.calls)
        self.assertNotIn("ResumeThread", [call[0] for call in fake.calls])
        self.assertTrue(fake.create_process_flags & CREATE_SUSPENDED, fake.calls)
        self.assertTrue(fake.create_process_flags & EXTENDED_STARTUPINFO_PRESENT, fake.calls)
        self.assertIs(fake.create_process_inherit_handles, True)
        self.assertTrue(
            any(call[0] == "UpdateProcThreadAttribute" and call[1][0] == PROC_THREAD_ATTRIBUTE_HANDLE_LIST for call in fake.calls),
            f"CreateProcessW must receive PROC_THREAD_ATTRIBUTE_HANDLE_LIST: {fake.calls!r}",
        )
        assert_windows_restricted_inheritance(self, fake, require_nul_stdin=True)
        terminate_index = next(index for index, call in enumerate(fake.calls) if call[0] == "TerminateProcess" and call[1][0] == fake.process_handle)
        wait_index = next(index for index, call in enumerate(fake.calls) if call[0] == "WaitForSingleObject" and call[1][0] == fake.process_handle)
        close_index = call_index(fake.calls, "CloseHandle", fake.process_handle)
        wait_timeout = fake.calls[wait_index][1][1]
        self.assertLess(assign_index, terminate_index, fake.calls)
        self.assertLess(terminate_index, close_index, fake.calls)
        self.assertLess(wait_index, close_index, fake.calls)
        self.assertGreaterEqual(wait_timeout, 0)
        self.assertLessEqual(wait_timeout, 2000)

    def test_posix_target_selector_setup_failure_reaps_before_return(self) -> None:
        if os.name != "posix":
            self.skipTest("post-spawn process-group cleanup probe is POSIX-only")
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "selector_setup_target.py"
            target.write_text("import time\ntime.sleep(20)\n", encoding="utf-8")
            process = subprocess.Popen(
                [sys.executable, "-B", str(target)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                env=os.environ | {"PYTHONDONTWRITEBYTECODE": "1"},
            )
            original_selector = RUN_EVIDENCE_LIB.selectors.DefaultSelector
            initial_threads = set(threading.enumerate())
            result: object | None = None
            raised: BaseException | None = None

            def injected_selector() -> object:
                raise OSError("injected selector setup failure")

            try:
                RUN_EVIDENCE_LIB.selectors.DefaultSelector = injected_selector
                try:
                    result = RUN_EVIDENCE_LIB.communicate_posix_target(
                        process,
                        FakeSink(),
                        FakeSink(),
                        lambda: None,
                        1,
                    )
                except BaseException as exc:
                    raised = exc
                finally:
                    RUN_EVIDENCE_LIB.selectors.DefaultSelector = original_selector
                target_alive = process.poll() is None
                group_alive = self_owned_posix_group_alive(process.pid)
                streams_closed = all(stream is None or stream.closed for stream in (process.stdout, process.stderr))
                new_threads = [
                    thread.name
                    for thread in threading.enumerate()
                    if thread not in initial_threads and thread.is_alive()
                ]
            finally:
                cleanup_self_owned_posix_process(process)

        self.assertIsNone(raised, f"post-spawn selector setup failure must not escape raw: {raised!r}")
        self.assertIsNotNone(result)
        codes = result_error_codes(result)
        self.assertTrue(codes, "post-spawn selector setup failure must be reported structurally")
        if target_alive or group_alive:
            self.assertIn("RUNNER_LIFECYCLE_UNCERTAIN", codes)
        self.assertFalse(target_alive, "target PID survived communicate_posix_target return")
        self.assertFalse(group_alive, "target process group survived communicate_posix_target return")
        self.assertTrue(streams_closed, "target stdout/stderr must be closed before return")
        self.assertEqual(new_threads, [], "target cleanup must not leave helper threads alive")

    def test_trusted_verifier_selector_setup_failure_reaps_before_return(self) -> None:
        if os.name != "posix":
            self.skipTest("post-spawn trusted verifier cleanup probe is POSIX-only")
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "trusted_selector_setup_target.py"
            target.write_text("import time\ntime.sleep(20)\n", encoding="utf-8")
            original_selector = EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector
            original_popen = EVIDENCE_CONTRACT_LIB.subprocess.Popen
            initial_threads = set(threading.enumerate())
            launched: list[subprocess.Popen[bytes]] = []
            result: object | None = None
            raised: BaseException | None = None

            def injected_selector() -> object:
                raise OSError("injected selector setup failure")

            def tracking_popen(*args: object, **kwargs: object) -> subprocess.Popen[bytes]:
                process = original_popen(*args, **kwargs)
                launched.append(process)
                return process

            try:
                EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector = injected_selector
                EVIDENCE_CONTRACT_LIB.subprocess.Popen = tracking_popen
                try:
                    result = EVIDENCE_CONTRACT_LIB._run_trusted_verifier_posix([sys.executable, "-B", str(target)])
                except BaseException as exc:
                    raised = exc
                finally:
                    EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector = original_selector
                    EVIDENCE_CONTRACT_LIB.subprocess.Popen = original_popen
                process = launched[0] if launched else None
                target_alive = bool(process is not None and process.poll() is None)
                group_alive = bool(process is not None and self_owned_posix_group_alive(process.pid))
                streams_closed = bool(
                    process is not None and all(stream is None or stream.closed for stream in (process.stdout, process.stderr))
                )
                new_threads = [
                    thread.name
                    for thread in threading.enumerate()
                    if thread not in initial_threads and thread.is_alive()
                ]
            finally:
                for process in launched:
                    cleanup_self_owned_posix_process(process)

        self.assertEqual(len(launched), 1, "trusted verifier probe must observe the post-Popen target")
        self.assertIsNone(raised, f"post-spawn selector setup failure must not escape raw: {raised!r}")
        self.assertIsNotNone(result)
        codes = result_error_codes(result)
        self.assertTrue(codes, "trusted post-spawn selector setup failure must be reported structurally")
        if target_alive or group_alive:
            self.assertTrue(
                any("LIFECYCLE" in code or code == "TRUSTED_VERIFIER_PIPE" for code in codes),
                codes,
            )
        self.assertFalse(target_alive, "trusted verifier PID survived _run_trusted_verifier_posix return")
        self.assertFalse(group_alive, "trusted verifier process group survived _run_trusted_verifier_posix return")
        self.assertTrue(streams_closed, "trusted verifier stdout/stderr must be closed before return")
        self.assertEqual(new_threads, [], "trusted verifier cleanup must not leave helper threads alive")

    def test_posix_target_failed_group_signal_returns_bounded_lifecycle_uncertainty(self) -> None:
        if os.name != "posix":
            self.skipTest("failed POSIX process-group signal probe is platform-specific")
        timeout_seconds = 1
        bounded_return_seconds = (
            timeout_seconds
            + float(RUN_EVIDENCE_LIB.TERMINATION_GRACE_SECONDS)
            + float(RUN_EVIDENCE_LIB.PIPE_SEVER_GRACE_SECONDS)
            + 1.0
        )
        with tempfile.TemporaryDirectory() as temporary:
            process = subprocess.Popen(
                [sys.executable, "-B", "-c", "import time; time.sleep(20)"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                env=os.environ | {"PYTHONDONTWRITEBYTECODE": "1"},
            )
            stdout_sink = RUN_EVIDENCE_LIB.CaptureSink()
            stderr_sink = RUN_EVIDENCE_LIB.CaptureSink()
            original_send = RUN_EVIDENCE_LIB._send_posix_group
            outcome: dict[str, object] = {}
            worker_started = False
            returned = False
            elapsed = 0.0

            def failed_send(_process: object, _signum: object) -> bool:
                return False

            def invoke() -> None:
                try:
                    outcome["result"] = RUN_EVIDENCE_LIB.communicate_posix_target(
                        process,
                        stdout_sink,
                        stderr_sink,
                        lambda: None,
                        timeout_seconds,
                    )
                except BaseException as exc:
                    outcome["exception"] = exc

            worker = threading.Thread(target=invoke, name="tessera-posix-failed-group-signal", daemon=True)
            started = time.monotonic()
            try:
                RUN_EVIDENCE_LIB._send_posix_group = failed_send
                worker.start()
                worker_started = True
                worker.join(timeout=bounded_return_seconds)
                returned = not worker.is_alive()
                elapsed = time.monotonic() - started
            finally:
                RUN_EVIDENCE_LIB._send_posix_group = original_send
                cleanup_self_owned_posix_process(process)
                if worker_started:
                    worker.join(timeout=3)
                stdout_sink.close()
                stderr_sink.close()

        self.assertTrue(
            returned,
            f"failed POSIX TERM/KILL must return within {bounded_return_seconds:.2f}s; outcome={outcome!r}",
        )
        self.assertFalse(worker.is_alive(), "fixture cleanup must not leave a target-lifecycle helper thread")
        self.assertLessEqual(elapsed, bounded_return_seconds, outcome)
        self.assertNotIn("exception", outcome, f"failed POSIX TERM/KILL must not escape raw: {outcome!r}")
        result = outcome.get("result")
        self.assertIsNotNone(result)
        codes = result_error_codes(result)
        self.assertIn("TARGET_TIMEOUT", codes)
        self.assertIn("RUNNER_LIFECYCLE_UNCERTAIN", codes)
        self.assertFalse(getattr(result, "capture_terminal", True), result)

    def test_posix_target_cleanup_get_map_failure_is_structured_and_reaped(self) -> None:
        if os.name != "posix":
            self.skipTest("POSIX target selector cleanup probe is platform-specific")
        selector = CleanupProbeSelector("target", fail_get_map_during_cleanup=True)
        with tempfile.TemporaryDirectory() as temporary:
            process = subprocess.Popen(
                [sys.executable, "-B", "-c", "import time; time.sleep(20)"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                env=os.environ | {"PYTHONDONTWRITEBYTECODE": "1"},
            )
            stdout_sink = RUN_EVIDENCE_LIB.CaptureSink()
            stderr_sink = RUN_EVIDENCE_LIB.CaptureSink()
            original_selector = RUN_EVIDENCE_LIB.selectors.DefaultSelector
            initial_threads = set(threading.enumerate())
            result: object | None = None
            raised: BaseException | None = None
            try:
                RUN_EVIDENCE_LIB.selectors.DefaultSelector = lambda: selector
                try:
                    result = RUN_EVIDENCE_LIB.communicate_posix_target(
                        process,
                        stdout_sink,
                        stderr_sink,
                        lambda: None,
                        1,
                    )
                except BaseException as exc:
                    raised = exc
                finally:
                    RUN_EVIDENCE_LIB.selectors.DefaultSelector = original_selector
                target_alive = process.poll() is None
                group_alive = self_owned_posix_group_alive(process.pid)
                streams_closed = all(stream is None or stream.closed for stream in (process.stdout, process.stderr))
                new_threads = [
                    thread.name
                    for thread in threading.enumerate()
                    if thread not in initial_threads and thread.is_alive()
                ]
            finally:
                cleanup_self_owned_posix_process(process)
                stdout_sink.close()
                stderr_sink.close()

        self.assertIsNone(raised, f"target selector cleanup get_map failure must not escape raw: {raised!r}")
        self.assertIsNotNone(result)
        codes = result_error_codes(result)
        self.assertIn("RUNNER_START", codes)
        self.assertIn("RUNNER_LIFECYCLE_UNCERTAIN", codes)
        self.assertFalse(getattr(result, "capture_terminal", True), result)
        self.assertGreaterEqual(selector.close_calls, 1, "target selector close must still be attempted after get_map failure")
        self.assertFalse(target_alive, "target PID survived selector cleanup failure return")
        self.assertFalse(group_alive, "target process group survived selector cleanup failure return")
        self.assertTrue(streams_closed, "target stdout/stderr must be closed after selector cleanup failure")
        self.assertEqual(new_threads, [], "target selector cleanup must not leave helper threads alive")

    def test_trusted_verifier_cleanup_get_map_failure_is_structured_and_reaped(self) -> None:
        if os.name != "posix":
            self.skipTest("POSIX trusted selector cleanup probe is platform-specific")
        selector = CleanupProbeSelector("trusted", fail_get_map_during_cleanup=True)
        with tempfile.TemporaryDirectory():
            launched: list[subprocess.Popen[bytes]] = []
            created_sinks: list[object] = []
            original_selector = EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector
            original_popen = EVIDENCE_CONTRACT_LIB.subprocess.Popen
            original_temporary_file = EVIDENCE_CONTRACT_LIB.tempfile.TemporaryFile
            initial_threads = set(threading.enumerate())
            result: object | None = None
            raised: BaseException | None = None

            def tracking_popen(*args: object, **kwargs: object) -> subprocess.Popen[bytes]:
                process = original_popen(*args, **kwargs)
                launched.append(process)
                return process

            def tracking_temporary_file(*args: object, **kwargs: object) -> object:
                sink = original_temporary_file(*args, **kwargs)
                created_sinks.append(sink)
                return sink

            try:
                EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector = lambda: selector
                EVIDENCE_CONTRACT_LIB.subprocess.Popen = tracking_popen
                EVIDENCE_CONTRACT_LIB.tempfile.TemporaryFile = tracking_temporary_file
                try:
                    result = EVIDENCE_CONTRACT_LIB._run_trusted_verifier_posix(
                        [sys.executable, "-B", "-c", "import time; time.sleep(20)"]
                    )
                except BaseException as exc:
                    raised = exc
                finally:
                    EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector = original_selector
                    EVIDENCE_CONTRACT_LIB.subprocess.Popen = original_popen
                    EVIDENCE_CONTRACT_LIB.tempfile.TemporaryFile = original_temporary_file
                process = launched[0] if launched else None
                target_alive = bool(process is not None and process.poll() is None)
                group_alive = bool(process is not None and self_owned_posix_group_alive(process.pid))
                streams_closed = bool(
                    process is not None and all(stream is None or stream.closed for stream in (process.stdout, process.stderr))
                )
                sinks_closed = all(bool(getattr(sink, "closed", False)) for sink in created_sinks)
                new_threads = [
                    thread.name
                    for thread in threading.enumerate()
                    if thread not in initial_threads and thread.is_alive()
                ]
            finally:
                for process in launched:
                    cleanup_self_owned_posix_process(process)
                for sink in created_sinks:
                    if not bool(getattr(sink, "closed", True)):
                        sink.close()  # type: ignore[union-attr]

        self.assertEqual(len(launched), 1, "trusted selector cleanup probe must observe the post-Popen verifier")
        self.assertIsNone(raised, f"trusted selector cleanup get_map failure must not escape raw: {raised!r}")
        self.assertIsNotNone(result)
        codes = result_error_codes(result)
        self.assertIn("TRUSTED_VERIFIER_START", codes)
        self.assertIn("TRUSTED_VERIFIER_PIPE", codes)
        self.assertGreaterEqual(selector.close_calls, 1, "trusted selector close must still be attempted after get_map failure")
        self.assertFalse(target_alive, "trusted verifier PID survived selector cleanup failure return")
        self.assertFalse(group_alive, "trusted verifier process group survived selector cleanup failure return")
        self.assertTrue(streams_closed, "trusted verifier stdout/stderr must be closed after selector cleanup failure")
        self.assertTrue(sinks_closed, "trusted verifier capture sinks must be closed after selector cleanup failure")
        self.assertEqual(new_threads, [], "trusted selector cleanup must not leave helper threads alive")

    def test_posix_target_cleanup_close_failures_are_structured_and_do_not_stop_cleanup(self) -> None:
        if os.name != "posix":
            self.skipTest("POSIX target cleanup failure probe is platform-specific")
        selector = CleanupProbeSelector("target", fail_cleanup_operations=True)
        with tempfile.TemporaryDirectory() as temporary:
            process = subprocess.Popen(
                [sys.executable, "-B", "-c", "import time; time.sleep(20)"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                env=os.environ | {"PYTHONDONTWRITEBYTECODE": "1"},
            )
            stdout_sink = RUN_EVIDENCE_LIB.CaptureSink()
            stderr_sink = RUN_EVIDENCE_LIB.CaptureSink()
            original_selector = RUN_EVIDENCE_LIB.selectors.DefaultSelector
            result: object | None = None
            raised: BaseException | None = None
            try:
                RUN_EVIDENCE_LIB.selectors.DefaultSelector = lambda: selector
                try:
                    result = RUN_EVIDENCE_LIB.communicate_posix_target(
                        process,
                        stdout_sink,
                        stderr_sink,
                        lambda: None,
                        1,
                    )
                except BaseException as exc:
                    raised = exc
                finally:
                    RUN_EVIDENCE_LIB.selectors.DefaultSelector = original_selector
                target_alive = process.poll() is None
                group_alive = self_owned_posix_group_alive(process.pid)
                streams_closed = all(stream is None or stream.closed for stream in (process.stdout, process.stderr))
            finally:
                cleanup_self_owned_posix_process(process)
                stdout_sink.close()
                stderr_sink.close()

        self.assertIsNone(raised, f"target cleanup close failures must not escape raw: {raised!r}")
        self.assertIsNotNone(result)
        errors = result_errors(result)
        codes = {error["code"] for error in errors}
        messages = [str(error.get("message", "")) for error in errors]
        self.assertIn("RUNNER_START", codes)
        self.assertIn("RUNNER_LIFECYCLE_UNCERTAIN", codes)
        self.assertFalse(getattr(result, "capture_terminal", True), result)
        for marker in (
            "injected target selector unregister cleanup failure",
            "injected target stdout stream close cleanup failure",
            "injected target stderr stream close cleanup failure",
            "injected target selector close cleanup failure",
        ):
            self.assertTrue(any(marker in message for message in messages), (marker, errors))
        self.assertEqual(len(selector.faulting_streams), 2)
        self.assertGreaterEqual(len(selector.unregister_attempts), len(selector.faulting_streams))
        self.assertTrue(all(stream.close_calls >= 1 for stream in selector.faulting_streams))
        self.assertGreaterEqual(selector.close_calls, 1)
        self.assertFalse(target_alive, "target PID survived cleanup close failures")
        self.assertFalse(group_alive, "target process group survived cleanup close failures")
        self.assertTrue(streams_closed, "target stdout/stderr cleanup must continue after close failures")

    def test_trusted_verifier_cleanup_close_failures_are_structured_and_do_not_stop_cleanup(self) -> None:
        if os.name != "posix":
            self.skipTest("POSIX trusted cleanup failure probe is platform-specific")
        selector = CleanupProbeSelector("trusted", fail_cleanup_operations=True)
        with tempfile.TemporaryDirectory():
            launched: list[subprocess.Popen[bytes]] = []
            faulting_sinks: list[FaultingTrustedSink] = []
            original_selector = EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector
            original_popen = EVIDENCE_CONTRACT_LIB.subprocess.Popen
            original_temporary_file = EVIDENCE_CONTRACT_LIB.tempfile.TemporaryFile
            result: object | None = None
            raised: BaseException | None = None

            def tracking_popen(*args: object, **kwargs: object) -> subprocess.Popen[bytes]:
                process = original_popen(*args, **kwargs)
                launched.append(process)
                return process

            def faulting_temporary_file(*_args: object, **_kwargs: object) -> FaultingTrustedSink:
                labels = ("trusted stdout", "trusted stderr")
                label = labels[len(faulting_sinks)] if len(faulting_sinks) < len(labels) else f"trusted sink {len(faulting_sinks)}"
                sink = FaultingTrustedSink(label)
                faulting_sinks.append(sink)
                return sink

            try:
                EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector = lambda: selector
                EVIDENCE_CONTRACT_LIB.subprocess.Popen = tracking_popen
                EVIDENCE_CONTRACT_LIB.tempfile.TemporaryFile = faulting_temporary_file
                try:
                    result = EVIDENCE_CONTRACT_LIB._run_trusted_verifier_posix(
                        [sys.executable, "-B", "-c", "import time; time.sleep(20)"]
                    )
                except BaseException as exc:
                    raised = exc
                finally:
                    EVIDENCE_CONTRACT_LIB.selectors.DefaultSelector = original_selector
                    EVIDENCE_CONTRACT_LIB.subprocess.Popen = original_popen
                    EVIDENCE_CONTRACT_LIB.tempfile.TemporaryFile = original_temporary_file
                process = launched[0] if launched else None
                target_alive = bool(process is not None and process.poll() is None)
                group_alive = bool(process is not None and self_owned_posix_group_alive(process.pid))
                streams_closed = bool(
                    process is not None and all(stream is None or stream.closed for stream in (process.stdout, process.stderr))
                )
            finally:
                for process in launched:
                    cleanup_self_owned_posix_process(process)

        self.assertEqual(len(launched), 1, "trusted cleanup failure probe must observe the post-Popen verifier")
        self.assertIsNone(raised, f"trusted cleanup close failures must not escape raw: {raised!r}")
        self.assertIsNotNone(result)
        errors = result_errors(result)
        codes = {error["code"] for error in errors}
        messages = [str(error.get("message", "")) for error in errors]
        self.assertIn("TRUSTED_VERIFIER_START", codes)
        self.assertIn("TRUSTED_VERIFIER_PIPE", codes)
        for marker in (
            "injected trusted selector unregister cleanup failure",
            "injected trusted stdout stream close cleanup failure",
            "injected trusted stderr stream close cleanup failure",
            "injected trusted selector close cleanup failure",
            "injected trusted stdout sink close cleanup failure",
            "injected trusted stderr sink close cleanup failure",
        ):
            self.assertTrue(any(marker in message for message in messages), (marker, errors))
        self.assertEqual(len(selector.faulting_streams), 2)
        self.assertGreaterEqual(len(selector.unregister_attempts), len(selector.faulting_streams))
        self.assertTrue(all(stream.close_calls >= 1 for stream in selector.faulting_streams))
        self.assertGreaterEqual(selector.close_calls, 1)
        self.assertEqual(len(faulting_sinks), 2)
        self.assertTrue(all(sink.close_calls >= 1 for sink in faulting_sinks))
        self.assertFalse(target_alive, "trusted verifier PID survived cleanup close failures")
        self.assertFalse(group_alive, "trusted verifier process group survived cleanup close failures")
        self.assertTrue(streams_closed, "trusted stdout/stderr cleanup must continue after close failures")

    def test_untrusted_posix_target_stdin_is_closed(self) -> None:
        if os.name != "posix":
            self.skipTest("untrusted POSIX stdin isolation is platform-specific")
        sentinel = "HB52_CONTROLLED_PARENT_STDIN"
        target = [
            sys.executable,
            "-B",
            "-c",
            "import sys\n"
            "data = sys.stdin.buffer.read(128)\n"
            "sys.stdout.write('TARGET_STDIN_EOF\\n' if not data else 'TARGET_STDIN=' + data.decode('utf-8', 'replace'))\n",
        ]
        with tempfile.TemporaryDirectory() as temporary:
            command, bundle = self.runner_command(Path(temporary), target)
            command.insert(1, "-B")
            result = subprocess.run(
                command,
                input=f"{sentinel}\\n",
                text=True,
                capture_output=True,
                check=False,
                timeout=10,
                env=os.environ | {"PYTHONDONTWRITEBYTECODE": "1"},
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("Traceback", result.stderr)
            record = load_json(bundle / "evidence.json")
            captured_stdout = (bundle / "stdout.log").read_text(encoding="utf-8")
            self.assertEqual(record["execution"]["status"], "pass")
            self.assertIn("TARGET_STDIN_EOF", captured_stdout)
            self.assertNotIn(sentinel, captured_stdout)

    def test_windows_cleanup_failures_are_structured_and_preserve_errors(self) -> None:
        helpers = (
            ("trusted", getattr(EVIDENCE_CONTRACT_LIB, "_run_trusted_verifier_windows", None), False, "TRUSTED_VERIFIER_START"),
            ("untrusted", getattr(RUN_EVIDENCE_LIB, "communicate_windows_target", None), True, "RUNNER_WINDOWS_LAUNCH"),
        )
        scenarios = (
            ("wait_timeout", (WAIT_TIMEOUT,), (), None),
            ("wait_failed", (WAIT_FAILED,), (), ERROR_INVALID_HANDLE),
            ("close_handle_false", (), (0x7100,), ERROR_INVALID_HANDLE),
        )
        for helper_name, helper, include_sinks, launch_code in helpers:
            self.assertTrue(callable(helper), f"{helper_name} Windows helper must be auditable")
            for scenario_name, wait_results, close_fail_handles, cleanup_error in scenarios:
                with self.subTest(helper=helper_name, scenario=scenario_name):
                    fake = FakeWindowsKernel32(
                        assign_success=False,
                        wait_results=wait_results,
                        close_fail_handles=close_fail_handles,
                    )
                    try:
                        result = invoke_windows_helper(
                            helper,
                            [sys.executable, "-B", "-c", "print('cleanup probe')"],
                            fake,
                            include_sinks=include_sinks,
                        )
                    except OSError as exc:
                        self.fail(f"{helper_name} must not leak a raw cleanup OSError: {exc!r}")

                    errors = result_errors(result)
                    codes = {error["code"] for error in errors}
                    messages = [str(error.get("message", "")) for error in errors]
                    self.assertIn(launch_code, codes, errors)
                    self.assertTrue(
                        any(str(ERROR_ACCESS_DENIED) in message for message in messages),
                        f"{helper_name} must preserve the original launch last-error: {errors!r}",
                    )
                    self.assertTrue(
                        any(
                            "LIFECYCLE" in error["code"]
                            or error["code"] == "TRUSTED_VERIFIER_PIPE"
                            or "lifecycle" in str(error.get("message", "")).lower()
                            or "uncertain" in str(error.get("message", "")).lower()
                            for error in errors
                        ),
                        f"{helper_name} must represent unconfirmed cleanup structurally: {errors!r}",
                    )
                    if wait_results:
                        self.assertIn(wait_results[0], fake.wait_states, fake.calls)
                    if cleanup_error is not None:
                        self.assertTrue(
                            any(str(cleanup_error) in message for message in messages),
                            f"{helper_name} must preserve cleanup last-error {cleanup_error}: {errors!r}",
                        )
                    if close_fail_handles:
                        self.assertEqual(fake.close_failures, list(close_fail_handles), fake.calls)

            with self.subTest(helper=helper_name, scenario="assigned_resume_close_failure"):
                fake = FakeWindowsKernel32(
                    assign_success=True,
                    resume_success=False,
                    resume_error=31,
                    wait_results=(WAIT_TIMEOUT, WAIT_TIMEOUT, WAIT_TIMEOUT, WAIT_TIMEOUT),
                    close_fail_handles=(0x7100,),
                )
                try:
                    result = invoke_windows_helper(
                        helper,
                        [sys.executable, "-B", "-c", "print('assigned resume cleanup probe')"],
                        fake,
                        include_sinks=include_sinks,
                    )
                except OSError as exc:
                    self.fail(f"{helper_name} must not leak a raw ResumeThread cleanup OSError: {exc!r}")

                errors = result_errors(result)
                launch_messages = [
                    str(error.get("message", "")) for error in errors if error["code"] == launch_code
                ]
                lifecycle_errors = [
                    error
                    for error in errors
                    if error["code"] == "TRUSTED_VERIFIER_PIPE" or error["code"] == "RUNNER_LIFECYCLE_UNCERTAIN"
                ]
                lifecycle_messages = [str(error.get("message", "")) for error in lifecycle_errors]
                assign_index = call_index(fake.calls, "AssignProcessToJobObject")
                resume_index = call_index(fake.calls, "ResumeThread", fake.thread_handle)
                self.assertEqual(
                    fake.assign_observations,
                    [(fake.job_handle, fake.process_handle, 1)],
                    f"{helper_name} must observe a successful AssignProcessToJobObject call before ResumeThread: {fake.calls!r}",
                )
                self.assertGreater(
                    resume_index,
                    assign_index,
                    f"{helper_name} must call ResumeThread only after successful Job assignment: {fake.calls!r}",
                )
                self.assertEqual(
                    fake.resume_observations,
                    [(fake.thread_handle, 0xFFFFFFFF, 31)],
                    f"{helper_name} must surface the fake ResumeThread failure transaction, not a hard-coded message: {fake.calls!r}",
                )
                self.assertTrue(
                    any("[Errno 31] ResumeThread failed" in message for message in launch_messages),
                    f"{helper_name} must retain ResumeThread error 31 in its launch error: {errors!r}",
                )
                self.assertTrue(
                    any(
                        "process" in message.lower() and "did not signal before bounded wait" in message
                        for message in lifecycle_messages
                    ),
                    f"{helper_name} must structure process wait timeout uncertainty: {errors!r}",
                )
                self.assertTrue(
                    any(
                        "Job Object" in message and "did not signal before bounded wait" in message
                        for message in lifecycle_messages
                    ),
                    f"{helper_name} must structure Job wait timeout uncertainty: {errors!r}",
                )
                self.assertTrue(
                    any(
                        "cannot close Job Object handle: [Errno 6] CloseHandle failed" in message
                        for message in lifecycle_messages
                    ),
                    f"{helper_name} must retain Job close error 6 structurally: {errors!r}",
                )
                self.assertTrue(
                    any(
                        call[0] == "TerminateJobObject" and call[1] == (fake.job_handle, 1)
                        for call in fake.calls
                    ),
                    f"{helper_name} must terminate the assigned Job Object after ResumeThread failure: {fake.calls!r}",
                )
                wait_calls = [call for call in fake.calls if call[0] == "WaitForSingleObject"]
                timed_out_handles = {
                    call[1][0]
                    for call, state in zip(wait_calls, fake.wait_states)
                    if state == WAIT_TIMEOUT
                }
                self.assertIn(fake.process_handle, timed_out_handles, fake.calls)
                self.assertIn(fake.job_handle, timed_out_handles, fake.calls)
                self.assertEqual(fake.close_failures, [fake.job_handle], fake.calls)


if __name__ == "__main__":
    unittest.main(verbosity=2)
