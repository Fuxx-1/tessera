"""Fail-closed Makepad Safe IR and input-boundary validation.

The validator checks JSON contract fixtures. It does not parse full Markdown or
Mermaid syntax, launch Makepad, fetch resources, or prove runtime behavior.
"""

from __future__ import annotations

import argparse
import errno
import fnmatch
import html
import json
import math
import os
import re
import stat
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from urllib.parse import unquote, urlsplit


POLICY_SCHEMA_VERSION = "tessera.makepad.security.policy/v1"
ENVELOPE_SCHEMA_VERSION = "tessera.makepad.security.fixture/v1"
VALIDATOR_VERSION = "makepad-security-validator/1.0.0"
DEFAULT_POLICY_PATH = Path(__file__).resolve().parents[1] / "policy-v1.json"
MAX_FIXTURE_BYTES = 1024 * 1024
READ_CHUNK_BYTES = 64 * 1024
HTTP_SCHEMES = {"http", "https"}
URL_RE = re.compile(r"!?\[[^\]\n]{0,2048}\]\(([^)\n]{1,8192})\)")
TAG_RE = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")
EVENT_ATTR_RE = re.compile(r"\bon[a-zA-Z]+\s*=")
SCHEME_PREFIX_RE = re.compile(r"^\s*([A-Za-z][A-Za-z0-9+.-]{0,64})\s*:")
SAFE_TOKEN_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
NONCE_RE = re.compile(r"^[a-f0-9]{16,128}$")

EXECUTABLE_PATTERNS: tuple[tuple[str, str, re.Pattern[str]], ...] = (
    ("HTML_TAG", "raw HTML tags are not accepted", TAG_RE),
    ("HTML_COMMENT", "HTML comments are not accepted", re.compile(r"<!--", re.IGNORECASE)),
    ("DOM_INPUT", "DOM or JSX constructs are not accepted", re.compile(r"\b(document|window|HTMLElement|NodeList|querySelector|jsx)\b", re.IGNORECASE)),
    ("JS_INPUT", "JavaScript constructs are not accepted", re.compile(r"(```\s*(?:js|javascript)\b|\beval\s*\(|\bFunction\s*\(|<\s*script\b)", re.IGNORECASE)),
    ("EVENT_HANDLER", "event handler attributes are not accepted", EVENT_ATTR_RE),
    ("LIVE_INPUT", "Makepad Live input is not accepted", re.compile(r"\b(live_design!|live\s*\{|LiveValue|LiveChange|live_reload)(?=\W|$)", re.IGNORECASE)),
    ("SCRIPT_INPUT", "Makepad Script input is not accepted", re.compile(r"\b(script_mod!|script\s*\{|ScriptVm|runsplash|Splash::set_text|eval_with_append_source|makepad-script)(?=\W|$)", re.IGNORECASE)),
    ("RAW_SVG", "raw SVG is not accepted", re.compile(r"<\s*/?\s*svg\b|raw_svg|makepad-svg", re.IGNORECASE)),
    ("FOREIGN_OBJECT", "SVG foreignObject is not accepted", re.compile(r"foreign\s*object|foreignObject", re.IGNORECASE)),
    ("SHADER_INPUT", "user-controlled shader input is not accepted", re.compile(r"\b(shader|draw_shader|pixel\s*\(|vertex\s*\(|wgsl|glsl)\b", re.IGNORECASE)),
)


@dataclass(frozen=True)
class Issue:
    code: str
    message: str
    path: str

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message, "path": self.path}


class ContractError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def issue(code: str, message: str, path: str = "$") -> Issue:
    return Issue(code, message, path)


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _file_flags() -> int:
    return os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)


def read_limited(path: Path, max_bytes: int = MAX_FIXTURE_BYTES) -> bytes:
    if max_bytes <= 0:
        raise ContractError("READ_LIMIT", "read limit must be positive")
    try:
        fd = os.open(path, _file_flags())
    except OSError as exc:
        if exc.errno == errno.ELOOP:
            raise ContractError("SYMLINK_ESCAPE", f"refusing symlink fixture path: {path}") from exc
        raise
    try:
        metadata = os.fstat(fd)
        if not stat.S_ISREG(metadata.st_mode):
            raise ContractError("PATH_NONREGULAR", f"fixture path is not a regular file: {path}")
        if metadata.st_size > max_bytes:
            raise ContractError("PAYLOAD_OVERSIZED", f"fixture exceeds {max_bytes} bytes: {path}")
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = os.read(fd, min(READ_CHUNK_BYTES, max_bytes + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > max_bytes:
                raise ContractError("PAYLOAD_OVERSIZED", f"fixture exceeds {max_bytes} bytes: {path}")
        if total != metadata.st_size:
            raise ContractError("PAYLOAD_MUTATED", f"fixture changed while reading: {path}")
        return b"".join(chunks)
    finally:
        os.close(fd)


def load_json_file(path: Path, max_bytes: int = MAX_FIXTURE_BYTES) -> Any:
    try:
        return json.loads(read_limited(path, max_bytes).decode("utf-8"))
    except ContractError:
        raise
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ContractError("JSON_PARSE", f"invalid JSON in {path}: {exc}") from exc


def load_policy(path: Path = DEFAULT_POLICY_PATH) -> dict[str, Any]:
    value = load_json_file(path)
    if not isinstance(value, dict):
        raise ContractError("POLICY_SHAPE", "policy root must be an object")
    if value.get("schema_version") != POLICY_SCHEMA_VERSION:
        raise ContractError("POLICY_VERSION", "unsupported policy schema version")
    return value


def _limits(policy: dict[str, Any]) -> dict[str, int]:
    raw = policy.get("limits", {})
    if not isinstance(raw, dict):
        raise ContractError("POLICY_LIMITS", "policy limits must be an object")
    result: dict[str, int] = {}
    for key, value in raw.items():
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ContractError("POLICY_LIMITS", f"invalid limit {key!r}")
        result[key] = value
    return result


def _append(issues: list[Issue], code: str, message: str, path: str = "$") -> None:
    issues.append(issue(code, message, path))


def decode_entities(value: str) -> str:
    decoded = value
    for _ in range(4):
        next_value = html.unescape(decoded)
        if next_value == decoded:
            return decoded
        decoded = next_value
    return decoded


def decoded_variants(value: str) -> tuple[str, ...]:
    entity_decoded = decode_entities(value)
    percent_decoded = unquote(entity_decoded, errors="replace")
    if percent_decoded == entity_decoded:
        return (value, entity_decoded)
    return (value, entity_decoded, percent_decoded)


def byte_len(value: str) -> int:
    return len(value.encode("utf-8"))


def as_bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None


def as_int(value: Any) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def as_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number):
        return None
    return number


def _walk(value: Any, path: str = "$") -> Iterable[tuple[str, Any]]:
    yield path, value
    if isinstance(value, dict):
        for key, child in value.items():
            yield from _walk(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _walk(child, f"{path}[{index}]")


def _validate_schema(envelope: dict[str, Any], issues: list[Issue]) -> None:
    if envelope.get("schema_version") != ENVELOPE_SCHEMA_VERSION:
        _append(issues, "SCHEMA_VERSION", "unsupported fixture schema version", "$.schema_version")
    operation = envelope.get("operation")
    if operation not in {"markdown_to_safe_ir", "mermaid_to_safe_ir", "broker_action", "runtime_boundary"}:
        _append(issues, "OPERATION", "operation must be a known security boundary", "$.operation")
    case_id = envelope.get("case_id")
    if not isinstance(case_id, str) or not SAFE_TOKEN_RE.fullmatch(case_id):
        _append(issues, "CASE_ID", "case_id must be a stable ASCII token", "$.case_id")


def _validate_trust_boundary(envelope: dict[str, Any], issues: list[Issue]) -> None:
    boundary = envelope.get("trust_boundary")
    if not isinstance(boundary, dict):
        _append(issues, "TRUST_BOUNDARY", "trust_boundary must be present", "$.trust_boundary")
        return
    source = boundary.get("source")
    if source not in {"user", "remote_document", "plugin", "clipboard", "drag_drop", "file", "network", "repo_static"}:
        _append(issues, "TRUST_SOURCE", "source must identify the trust boundary", "$.trust_boundary.source")
    for key in ("may_use_dom", "may_execute_js", "may_create_live", "may_execute_script", "may_accept_raw_svg", "may_accept_shader"):
        if boundary.get(key) is not False:
            _append(issues, "BOUNDARY_CAPABILITY", f"{key} must be false for untrusted input", f"$.trust_boundary.{key}")


def _validate_task(envelope: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> None:
    task = envelope.get("task")
    if not isinstance(task, dict):
        _append(issues, "TASK", "task metadata must be present", "$.task")
        return
    generation = as_int(task.get("generation"))
    active_generation = as_int(task.get("active_generation"))
    if generation is None or active_generation is None:
        _append(issues, "GENERATION", "generation and active_generation must be integers", "$.task")
    elif generation != active_generation:
        _append(issues, "GENERATION_STALE", "stale generation results must be discarded", "$.task.generation")
    deadline_ms = as_int(task.get("deadline_ms"))
    elapsed_ms = as_int(task.get("elapsed_ms"))
    max_deadline = limits.get("task_deadline_ms", 3500)
    if deadline_ms is None or deadline_ms <= 0 or deadline_ms > max_deadline:
        _append(issues, "TASK_DEADLINE_LIMIT", f"deadline must be 1..{max_deadline} ms", "$.task.deadline_ms")
    if elapsed_ms is None or elapsed_ms < 0:
        _append(issues, "TASK_ELAPSED", "elapsed_ms must be a non-negative integer", "$.task.elapsed_ms")
    elif deadline_ms is not None and elapsed_ms > deadline_ms:
        _append(issues, "TASK_TIMED_OUT", "elapsed time exceeded the deadline", "$.task.elapsed_ms")
    if task.get("timed_out") is True:
        _append(issues, "TASK_TIMED_OUT", "timed-out parser work must fail closed", "$.task.timed_out")
    if task.get("cancelled") is True:
        _append(issues, "TASK_CANCELLED", "cancelled parser work must fail closed", "$.task.cancelled")


def _validate_runtime(envelope: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> None:
    runtime = envelope.get("runtime_constraints")
    if not isinstance(runtime, dict):
        _append(issues, "RUNTIME_CONSTRAINTS", "runtime_constraints must be present", "$.runtime_constraints")
        return
    operations = as_int(runtime.get("ui_thread_sync_io_operations"))
    sync_bytes = as_int(runtime.get("ui_thread_sync_io_bytes"))
    outside_broker = as_int(runtime.get("external_actions_outside_broker"))
    if operations != limits.get("ui_thread_sync_io_operations", 0):
        _append(issues, "UI_THREAD_SYNC_IO", "UI thread synchronous I/O operation count must be zero", "$.runtime_constraints.ui_thread_sync_io_operations")
    if sync_bytes != limits.get("ui_thread_sync_io_bytes", 0):
        _append(issues, "UI_THREAD_SYNC_IO", "UI thread synchronous I/O byte count must be zero", "$.runtime_constraints.ui_thread_sync_io_bytes")
    if outside_broker != 0:
        _append(issues, "EXTERNAL_ACTION_OUTSIDE_BROKER", "external actions must cross the typed broker", "$.runtime_constraints.external_actions_outside_broker")
    forbidden = runtime.get("forbidden_runtime_paths", [])
    if isinstance(forbidden, list):
        for index, value in enumerate(forbidden):
            if value:
                _append(issues, "FORBIDDEN_RUNTIME_PATH", "forbidden Makepad runtime path is reachable", f"$.runtime_constraints.forbidden_runtime_paths[{index}]")
    else:
        _append(issues, "RUNTIME_CONSTRAINTS", "forbidden_runtime_paths must be a list", "$.runtime_constraints.forbidden_runtime_paths")


def _validate_input(envelope: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> str:
    operation = envelope.get("operation")
    payload = envelope.get("input")
    if not isinstance(payload, dict):
        _append(issues, "INPUT", "input must be present", "$.input")
        return ""
    text = payload.get("text")
    if not isinstance(text, str):
        _append(issues, "INPUT_TEXT", "input.text must be a string", "$.input.text")
        return ""
    media_type = payload.get("media_type")
    expected_media_type = "text/markdown" if operation == "markdown_to_safe_ir" else "text/vnd.tessera.mermaid" if operation == "mermaid_to_safe_ir" else "application/vnd.tessera.action+json"
    if operation in {"markdown_to_safe_ir", "mermaid_to_safe_ir"} and media_type != expected_media_type:
        _append(issues, "MEDIA_TYPE", f"media_type must be {expected_media_type}", "$.input.media_type")
    declared_length = payload.get("declared_byte_length")
    actual_length = byte_len(text)
    if declared_length is not None and declared_length != actual_length:
        _append(issues, "SOURCE_LENGTH_MISMATCH", "declared_byte_length must match UTF-8 bytes", "$.input.declared_byte_length")
    max_bytes = limits.get("markdown_source_bytes", 80000)
    if operation == "mermaid_to_safe_ir":
        max_bytes = limits.get("mermaid_source_bytes", 12000)
    if actual_length > max_bytes:
        _append(issues, "SOURCE_TOO_LARGE", f"source exceeds {max_bytes} bytes", "$.input.text")
    for variant in decoded_variants(text):
        for code, message, pattern in EXECUTABLE_PATTERNS:
            if pattern.search(variant):
                _append(issues, code, message, "$.input.text")
    if re.search(r"!\[[^\]\n]{0,2048}\]\(", text):
        _append(issues, "REMOTE_RESOURCE", "Markdown image/resource references are not accepted", "$.input.text")
    for index, target in enumerate(_markdown_urls(text)):
        _validate_url(target, limits, issues, f"$.input.links[{index}]")
    return text


def _markdown_urls(text: str) -> list[str]:
    urls: list[str] = []
    for match in URL_RE.finditer(text):
        full = match.group(0)
        if full.startswith("!"):
            continue
        target = match.group(1).strip()
        if " " in target:
            target = target.split(" ", 1)[0]
        urls.append(target)
    return urls


def _validate_url(raw_url: Any, limits: dict[str, int], issues: list[Issue], path: str) -> None:
    if not isinstance(raw_url, str) or raw_url == "":
        _append(issues, "URL_SHAPE", "URL must be a non-empty string", path)
        return
    if byte_len(raw_url) > limits.get("url_bytes", 8192):
        _append(issues, "URL_TOO_LARGE", "URL exceeds the byte limit", path)
        return
    entity_decoded = decode_entities(raw_url)
    percent_decoded = unquote(entity_decoded, errors="replace")
    for name, value in (("raw", raw_url), ("entity_decoded", entity_decoded), ("percent_decoded", percent_decoded)):
        if any(ord(character) < 32 or ord(character) == 127 for character in value):
            _append(issues, "URL_CONTROL", f"URL contains control characters after {name} normalization", path)
        if any(character.isspace() for character in value):
            _append(issues, "URL_WHITESPACE", f"URL contains whitespace after {name} normalization", path)
        if "\\" in value:
            _append(issues, "URL_BACKSLASH", f"URL contains backslash after {name} normalization", path)
    if entity_decoded != raw_url and SCHEME_PREFIX_RE.match(entity_decoded):
        _append(issues, "URL_ENTITY_ENCODED_SCHEME", "URL scheme must not be hidden behind HTML entities", path)
    raw_scheme = SCHEME_PREFIX_RE.match(raw_url)
    decoded_scheme = SCHEME_PREFIX_RE.match(percent_decoded)
    if raw_scheme and raw_scheme.group(1).lower() != percent_decoded.split(":", 1)[0].lower():
        _append(issues, "URL_PERCENT_ENCODED_SCHEME", "URL scheme must not be percent-obfuscated", path)
    normalized = percent_decoded
    if normalized.startswith("//"):
        _append(issues, "URL_PROTOCOL_RELATIVE", "protocol-relative URLs are not accepted", path)
        return
    parsed = urlsplit(normalized)
    if not parsed.scheme:
        _append(issues, "URL_RELATIVE", "relative URLs are not accepted at the external-action boundary", path)
        return
    if decoded_scheme and decoded_scheme.group(1).lower() not in HTTP_SCHEMES:
        _append(issues, "URL_SCHEME", "only http and https schemes are accepted", path)
    if parsed.scheme.lower() not in HTTP_SCHEMES:
        _append(issues, "URL_SCHEME", "only http and https schemes are accepted", path)
    if not parsed.netloc or parsed.hostname in {None, ""}:
        _append(issues, "URL_EMPTY_HOST", "URL host must be present", path)
    if parsed.username is not None or parsed.password is not None or "@" in parsed.netloc.rsplit("]", 1)[-1]:
        _append(issues, "URL_CREDENTIALS", "URL credentials are not accepted", path)


def _validate_safe_ir(envelope: dict[str, Any], policy: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> None:
    operation = envelope.get("operation")
    if operation not in {"markdown_to_safe_ir", "mermaid_to_safe_ir"}:
        return
    ir = envelope.get("safe_ir")
    if not isinstance(ir, dict):
        _append(issues, "SAFE_IR", "safe_ir must be present for parser operations", "$.safe_ir")
        return
    safe_policy = policy.get("safe_ir", {})
    allowed_kinds = set(safe_policy.get("allowed_kinds", [])) if isinstance(safe_policy, dict) else set()
    kind = ir.get("kind")
    if kind not in allowed_kinds:
        _append(issues, "SAFE_IR_KIND", "safe_ir.kind is not allowed", "$.safe_ir.kind")
    forbidden_keys = {str(key).lower() for key in safe_policy.get("forbidden_keys", [])} if isinstance(safe_policy, dict) else set()
    for path, value in _walk(ir, "$.safe_ir"):
        if isinstance(value, dict):
            for key in value:
                if key.lower() in forbidden_keys:
                    _append(issues, "SAFE_IR_FORBIDDEN_KEY", f"safe_ir key {key!r} is forbidden", f"{path}.{key}")
        elif isinstance(value, str):
            for variant in decoded_variants(value):
                for code, message, pattern in EXECUTABLE_PATTERNS:
                    if pattern.search(variant):
                        _append(issues, code, message, path)
    node_count = as_int(ir.get("node_count"))
    max_depth = as_int(ir.get("max_depth"))
    if node_count is None or node_count < 0:
        _append(issues, "SAFE_IR_NODE_COUNT", "safe_ir.node_count must be a non-negative integer", "$.safe_ir.node_count")
    else:
        limit = limits.get("mermaid_statements", 260) if operation == "mermaid_to_safe_ir" else limits.get("markdown_nodes", 4096)
        if node_count > limit:
            _append(issues, "SAFE_IR_NODE_LIMIT", f"safe_ir.node_count exceeds {limit}", "$.safe_ir.node_count")
    if max_depth is None or max_depth < 0:
        _append(issues, "SAFE_IR_DEPTH", "safe_ir.max_depth must be a non-negative integer", "$.safe_ir.max_depth")
    elif max_depth > limits.get("safe_ir_depth", 64):
        _append(issues, "SAFE_IR_DEPTH_LIMIT", "safe_ir.max_depth exceeds the policy limit", "$.safe_ir.max_depth")
    links = ir.get("links", [])
    if not isinstance(links, list):
        _append(issues, "SAFE_IR_LINKS", "safe_ir.links must be a list", "$.safe_ir.links")
    else:
        for index, target in enumerate(links):
            _validate_url(target, limits, issues, f"$.safe_ir.links[{index}]")
    _validate_resource_counters(ir.get("resource_counters", {}), limits, issues)
    if operation == "mermaid_to_safe_ir":
        _validate_mermaid_ir(ir, limits, issues)


def _validate_resource_counters(counters: Any, limits: dict[str, int], issues: list[Issue]) -> None:
    if counters in ({}, None):
        return
    if not isinstance(counters, dict):
        _append(issues, "RESOURCE_COUNTERS", "resource_counters must be an object", "$.safe_ir.resource_counters")
        return
    checks = (
        ("svg_bytes", "svg_source_bytes", "SVG_SOURCE_LIMIT"),
        ("svg_nodes", "svg_nodes", "SVG_NODE_LIMIT"),
        ("svg_path_commands", "svg_path_commands", "SVG_PATH_COMMAND_LIMIT"),
        ("svg_depth", "svg_depth", "SVG_DEPTH_LIMIT"),
        ("mermaid_blocks", "mermaid_blocks", "MERMAID_BLOCK_LIMIT"),
        ("mermaid_statements", "mermaid_statements", "MERMAID_STATEMENT_LIMIT"),
        ("worker_rss_mib", "worker_rss_mib", "WORKER_RSS_LIMIT"),
    )
    for key, limit_key, code in checks:
        value = as_number(counters.get(key, 0))
        if value is None or value < 0:
            _append(issues, "RESOURCE_COUNTER", f"{key} must be finite and non-negative", f"$.safe_ir.resource_counters.{key}")
            continue
        if value > limits.get(limit_key, 0):
            _append(issues, code, f"{key} exceeds {limits.get(limit_key, 0)}", f"$.safe_ir.resource_counters.{key}")
    for key in ("raw_svg_count", "external_resource_count", "shader_count", "script_count", "dom_node_count"):
        value = as_int(counters.get(key, 0))
        if value is None or value < 0:
            _append(issues, "RESOURCE_COUNTER", f"{key} must be a non-negative integer", f"$.safe_ir.resource_counters.{key}")
        elif value != 0:
            _append(issues, "FORBIDDEN_RESOURCE", f"{key} must be zero", f"$.safe_ir.resource_counters.{key}")


def _validate_mermaid_ir(ir: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> None:
    edge_count = as_int(ir.get("edge_count", 0))
    if edge_count is None or edge_count < 0:
        _append(issues, "MERMAID_EDGE_COUNT", "safe_ir.edge_count must be non-negative", "$.safe_ir.edge_count")
    elif edge_count > limits.get("mermaid_statements", 260):
        _append(issues, "MERMAID_STATEMENT_LIMIT", "edge count exceeds mermaid statement limit", "$.safe_ir.edge_count")
    edges = ir.get("edges", [])
    if not isinstance(edges, list):
        _append(issues, "MERMAID_EDGES", "safe_ir.edges must be a list", "$.safe_ir.edges")
        return
    for index, edge in enumerate(edges):
        path = f"$.safe_ir.edges[{index}]"
        if not isinstance(edge, dict):
            _append(issues, "MERMAID_EDGE", "edge must be an object", path)
            continue
        if "raw_path" in edge or "path" in edge or "d" in edge:
            _append(issues, "MERMAID_RAW_PATH", "Mermaid IR must not carry raw SVG path data", path)
        curve = edge.get("curve")
        if not isinstance(curve, dict):
            _append(issues, "MERMAID_CURVE", "edge.curve must be an object", f"{path}.curve")
            continue
        curve_type = curve.get("type")
        if curve_type not in {"cubic_bezier", "line"}:
            _append(issues, "MERMAID_CURVE_TYPE", "curve type must be line or controlled cubic_bezier", f"{path}.curve.type")
        controls = curve.get("control_points", [])
        if controls is None:
            controls = []
        if not isinstance(controls, list):
            _append(issues, "MERMAID_CURVE_CONTROLS", "control_points must be a list", f"{path}.curve.control_points")
            controls = []
        elif len(controls) > limits.get("curve_control_points_per_edge", 2):
            _append(issues, "MERMAID_CURVE_CONTROL_LIMIT", "too many curve control points", f"{path}.curve.control_points")
        if curve_type == "line" and len(controls) != 0:
            _append(issues, "MERMAID_CURVE_CONTROLS", "line curves must not carry control points", f"{path}.curve.control_points")
        if curve_type == "cubic_bezier" and len(controls) != 2:
            _append(issues, "MERMAID_CURVE_CONTROLS", "cubic_bezier curves must carry exactly two control points", f"{path}.curve.control_points")
        for label in ("start", "end"):
            _validate_point(curve.get(label), limits, issues, f"{path}.curve.{label}")
        for control_index, point in enumerate(controls):
            _validate_point(point, limits, issues, f"{path}.curve.control_points[{control_index}]")


def _validate_point(value: Any, limits: dict[str, int], issues: list[Issue], path: str) -> None:
    if not isinstance(value, dict):
        _append(issues, "POINT", "point must be an object", path)
        return
    for axis in ("x", "y"):
        number = as_number(value.get(axis))
        if number is None:
            _append(issues, "POINT_COORDINATE", "point coordinate must be finite", f"{path}.{axis}")
        elif abs(number) > limits.get("curve_coordinate_abs", 4096):
            _append(issues, "POINT_COORDINATE_LIMIT", "point coordinate exceeds the absolute limit", f"{path}.{axis}")


def _validate_resources(envelope: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> None:
    resources = envelope.get("resources", [])
    if not isinstance(resources, list):
        _append(issues, "RESOURCES", "resources must be a list", "$.resources")
        return
    for index, resource in enumerate(resources):
        path = f"$.resources[{index}]"
        if not isinstance(resource, dict):
            _append(issues, "RESOURCE", "resource must be an object", path)
            continue
        kind = resource.get("kind")
        if kind not in {"inline_text", "none"}:
            _append(issues, "RESOURCE_KIND", "only inline_text or none resources are accepted before a broker exists", f"{path}.kind")
        relpath = resource.get("path")
        if relpath is not None:
            _validate_relative_path(relpath, issues, f"{path}.path")
        url = resource.get("url")
        if url is not None:
            _validate_url(url, limits, issues, f"{path}.url")
            _append(issues, "REMOTE_RESOURCE", "resources must not load remote URLs in the parser path", f"{path}.url")


def _validate_relative_path(value: Any, issues: list[Issue], path: str) -> None:
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        _append(issues, "PATH_SHAPE", "path must be a non-empty POSIX relative path", path)
        return
    parsed = PurePosixPath(value)
    if parsed.is_absolute() or any(part in {"", ".", ".."} for part in parsed.parts):
        _append(issues, "PATH_TRAVERSAL", "path traversal and absolute paths are not accepted", path)


def _validate_broker(envelope: dict[str, Any], policy: dict[str, Any], limits: dict[str, int], issues: list[Issue]) -> None:
    requests = envelope.get("broker_requests", [])
    if not isinstance(requests, list):
        _append(issues, "BROKER_REQUESTS", "broker_requests must be a list", "$.broker_requests")
        return
    broker_policy = policy.get("broker", {})
    allowed = set(broker_policy.get("allowed_actions", ["open_url"])) if isinstance(broker_policy, dict) else {"open_url"}
    audience = broker_policy.get("audience", "tessera.makepad.external-action-broker") if isinstance(broker_policy, dict) else "tessera.makepad.external-action-broker"
    seen_nonces = set()
    for index, request in enumerate(requests):
        path = f"$.broker_requests[{index}]"
        if not isinstance(request, dict):
            _append(issues, "BROKER_REQUEST", "broker request must be an object", path)
            continue
        action = request.get("action")
        if action not in allowed:
            _append(issues, "BROKER_ACTION", "broker action is not in the allowlist", f"{path}.action")
        if action == "open_url":
            _validate_url(request.get("url"), limits, issues, f"{path}.url")
        else:
            if "url" in request:
                _validate_url(request.get("url"), limits, issues, f"{path}.url")
        if request.get("audience") != audience:
            _append(issues, "BROKER_AUDIENCE", "broker request audience mismatch", f"{path}.audience")
        gesture = request.get("user_gesture")
        if not isinstance(gesture, dict):
            _append(issues, "BROKER_GESTURE", "broker request must carry a user gesture", f"{path}.user_gesture")
        else:
            if not isinstance(gesture.get("id"), str) or not SAFE_TOKEN_RE.fullmatch(gesture.get("id", "")):
                _append(issues, "BROKER_GESTURE", "gesture id must be a stable token", f"{path}.user_gesture.id")
            if gesture.get("kind") not in {"click", "keyboard", "touch"}:
                _append(issues, "BROKER_GESTURE", "gesture kind must be explicit", f"{path}.user_gesture.kind")
        capability = request.get("capability")
        if not isinstance(capability, dict):
            _append(issues, "BROKER_CAPABILITY", "broker request must carry a one-time capability", f"{path}.capability")
            continue
        if capability.get("kind") != action:
            _append(issues, "BROKER_CAPABILITY", "capability kind must match the action", f"{path}.capability.kind")
        if capability.get("audience") != audience:
            _append(issues, "BROKER_AUDIENCE", "capability audience mismatch", f"{path}.capability.audience")
        if capability.get("one_time") is not True:
            _append(issues, "BROKER_ONE_TIME", "capability must be one-time", f"{path}.capability.one_time")
        ttl_ms = as_int(capability.get("ttl_ms"))
        if ttl_ms is None or ttl_ms <= 0 or ttl_ms > limits.get("broker_ttl_ms", 30000):
            _append(issues, "BROKER_TTL", "capability TTL exceeds the broker limit", f"{path}.capability.ttl_ms")
        nonce = capability.get("nonce")
        if not isinstance(nonce, str) or not NONCE_RE.fullmatch(nonce):
            _append(issues, "BROKER_NONCE", "capability nonce must be unpredictable hex", f"{path}.capability.nonce")
        elif nonce in seen_nonces:
            _append(issues, "BROKER_REPLAY", "capability nonce is reused in this envelope", f"{path}.capability.nonce")
        else:
            seen_nonces.add(nonce)
        if request.get("replayed") is True:
            _append(issues, "BROKER_REPLAY", "replayed broker actions must fail closed", f"{path}.replayed")
        history = request.get("replay_nonce_history", [])
        if isinstance(history, list) and isinstance(nonce, str) and nonce in history:
            _append(issues, "BROKER_REPLAY", "capability nonce already appears in replay history", f"{path}.replay_nonce_history")


def validate_envelope(envelope: Any, policy: dict[str, Any] | None = None) -> dict[str, Any]:
    if policy is None:
        policy = load_policy()
    issues: list[Issue] = []
    if not isinstance(envelope, dict):
        return {"schema_version": ENVELOPE_SCHEMA_VERSION, "validator_version": VALIDATOR_VERSION, "verdict": "BLOCKED", "errors": [issue("ENVELOPE", "fixture root must be an object").as_dict()]}
    try:
        canonical_json_bytes(envelope)
    except (TypeError, ValueError) as exc:
        return {"schema_version": ENVELOPE_SCHEMA_VERSION, "validator_version": VALIDATOR_VERSION, "case_id": envelope.get("case_id"), "verdict": "BLOCKED", "errors": [issue("JSON_CANONICAL", f"fixture must be canonicalizable JSON: {exc}").as_dict()]}
    limits = _limits(policy)
    _validate_schema(envelope, issues)
    _validate_trust_boundary(envelope, issues)
    _validate_task(envelope, limits, issues)
    _validate_runtime(envelope, limits, issues)
    _validate_input(envelope, limits, issues)
    _validate_safe_ir(envelope, policy, limits, issues)
    _validate_resources(envelope, limits, issues)
    _validate_broker(envelope, policy, limits, issues)
    errors = [entry.as_dict() for entry in issues]
    return {
        "schema_version": ENVELOPE_SCHEMA_VERSION,
        "validator_version": VALIDATOR_VERSION,
        "case_id": envelope.get("case_id"),
        "verdict": "BLOCKED" if errors else "PASS",
        "errors": errors,
    }


def validate_fixture_path(path: Path, policy: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        envelope = load_json_file(path)
        return validate_envelope(envelope, policy)
    except ContractError as exc:
        return {
            "schema_version": ENVELOPE_SCHEMA_VERSION,
            "validator_version": VALIDATOR_VERSION,
            "case_id": None,
            "verdict": "BLOCKED",
            "errors": [issue(exc.code, str(exc), "$").as_dict()],
        }
    except OSError as exc:
        return {
            "schema_version": ENVELOPE_SCHEMA_VERSION,
            "validator_version": VALIDATOR_VERSION,
            "case_id": None,
            "verdict": "BLOCKED",
            "errors": [issue("PATH_OPEN", f"cannot open fixture: {exc}", "$").as_dict()],
        }


def expectation_errors(envelope: dict[str, Any], result: dict[str, Any]) -> list[str]:
    expected = envelope.get("expect")
    if not isinstance(expected, dict):
        return ["missing expect object"]
    problems: list[str] = []
    expected_verdict = expected.get("verdict")
    if expected_verdict not in {"PASS", "BLOCKED"}:
        problems.append("expect.verdict must be PASS or BLOCKED")
    elif result.get("verdict") != expected_verdict:
        problems.append(f"verdict {result.get('verdict')} != expected {expected_verdict}")
    actual_codes = {error.get("code") for error in result.get("errors", []) if isinstance(error, dict)}
    for code in expected.get("codes", []):
        if code not in actual_codes:
            problems.append(f"missing expected code {code}")
    unexpected = set(expected.get("forbid_codes", [])) & actual_codes
    if unexpected:
        problems.append(f"unexpected forbidden codes {sorted(unexpected)}")
    return problems


def discover_fixtures(directory: Path) -> list[Path]:
    return sorted(path for path in directory.rglob("*.json") if path.is_file())

def _rust_code_without_literals(source: str) -> str:
    """Keep code tokens while removing strings and comments from a Rust file."""
    result: list[str] = []
    index = 0
    in_string = False
    while index < len(source):
        if source.startswith("//", index) and not in_string:
            end = source.find("\n", index)
            index = len(source) if end == -1 else end
            result.append("\n")
            continue
        if source.startswith("/*", index) and not in_string:
            end = source.find("*/", index + 2)
            index = len(source) if end == -1 else end + 2
            result.append(" " )
            continue
        character = source[index]
        if in_string:
            if character == "\\":
                index += 2
            elif character == '"':
                in_string = False
                index += 1
            else:
                index += 1
            result.append(" " )
            continue
        if character == '"':
            in_string = True
            result.append(" " )
            index += 1
            continue
        result.append(character)
        index += 1
    return "".join(result)

def validate_static_source(policy: dict[str, Any], repository: Path) -> dict[str, Any]:
    """Validate the repository-audited Makepad registration surface."""
    contract = policy.get("static_source_allowlist")
    if not isinstance(contract, dict):
        return {"verdict": "BLOCKED", "errors": [issue("STATIC_POLICY", "static_source_allowlist is missing").as_dict()]}
    errors: list[Issue] = []
    production_paths: list[Path] = []
    for pattern in contract.get("production_globs", []):
        if not isinstance(pattern, str):
            _append(errors, "STATIC_POLICY", "production glob must be a string")
            continue
        production_paths.extend(path for path in repository.glob(pattern) if path.is_file())
    unique_paths = sorted(set(production_paths))
    relative_sources = {path.relative_to(repository).as_posix(): path for path in unique_paths}
    production_text: dict[str, str] = {}
    production_code: dict[str, str] = {}
    for relative, path in relative_sources.items():
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            _append(errors, "STATIC_READ", f"cannot read production source: {exc}", relative)
            continue
        production_text[relative] = source
        production_code[relative] = _rust_code_without_literals(source) if relative.endswith(".rs") else source
    allowed_symbols = contract.get("allowed_symbols", [])
    if not isinstance(allowed_symbols, list):
        _append(errors, "STATIC_POLICY", "allowed_symbols must be a list")
        allowed_symbols = []
    allowed_counts: dict[str, int] = {}
    for entry in allowed_symbols:
        if not isinstance(entry, dict):
            _append(errors, "STATIC_POLICY", "allowlist entry must be an object")
            continue
        relative = entry.get("path")
        path_glob = entry.get("path_glob")
        symbol = entry.get("symbol")
        expected = entry.get("expected_count")
        if (not isinstance(relative, str) and not isinstance(path_glob, str)) or (
            isinstance(relative, str) and isinstance(path_glob, str)
        ) or not isinstance(symbol, str) or not isinstance(expected, int):
            _append(errors, "STATIC_POLICY", "allowlist entry requires exactly one of path/path_glob, symbol, expected_count")
            continue
        if isinstance(path_glob, str):
            matched = {
                path: source
                for path, source in production_code.items()
                if fnmatch.fnmatch(path, path_glob)
            }
            if not matched:
                _append(errors, "STATIC_PATH", "allowlisted source glob matches no production files", path_glob)
                continue
            actual = sum(source.count(symbol) for source in matched.values())
            error_path = path_glob
        else:
            assert isinstance(relative, str)
            source = production_code.get(relative)
            if source is None:
                _append(errors, "STATIC_PATH", "allowlisted source is absent from production globs", relative)
                continue
            actual = source.count(symbol)
            error_path = relative
        if actual != expected:
            _append(errors, "STATIC_SYMBOL_COUNT", f"{symbol!r} occurs {actual} times, expected {expected}", error_path)
        allowed_counts[symbol] = allowed_counts.get(symbol, 0) + expected
    for symbol, expected in allowed_counts.items():
        actual = sum(source.count(symbol) for source in production_code.values())
        if actual != expected:
            _append(errors, "STATIC_SYMBOL_PATH", f"{symbol!r} has {actual} production occurrences, expected {expected}")
    forbidden = contract.get("forbidden_production_symbols", [])
    if not isinstance(forbidden, list):
        _append(errors, "STATIC_POLICY", "forbidden_production_symbols must be a list")
        forbidden = []
    for relative, source in production_code.items():
        for symbol in forbidden:
            if isinstance(symbol, str) and symbol in source:
                _append(errors, "FORBIDDEN_PRODUCTION_SYMBOL", f"forbidden production symbol {symbol!r} is present", relative)
    literals = contract.get("negative_literal_allowlist", [])
    if not isinstance(literals, list):
        _append(errors, "STATIC_POLICY", "negative_literal_allowlist must be a list")
        literals = []
    allowed_literal_paths = {entry.get("path") for entry in literals if isinstance(entry, dict) and isinstance(entry.get("path"), str)}
    for relative, source in production_text.items():
        if "javascript:" in source and relative not in allowed_literal_paths:
            _append(errors, "FORBIDDEN_PRODUCTION_LITERAL", "javascript: is outside the declared reject-scheme allowlist", relative)
    return {
        "verdict": "PASS" if not errors else "BLOCKED",
        "policy_version": contract.get("version"),
        "production_files": list(relative_sources),
        "errors": [entry.as_dict() for entry in errors],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Tessera Makepad Safe IR/input-boundary fixtures")
    parser.add_argument("fixtures", nargs="*", type=Path)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY_PATH)
    parser.add_argument("--fixtures-dir", type=Path)
    parser.add_argument("--source-root", type=Path, help="repository root for static source allowlist validation")
    parser.add_argument("--check-expectations", action="store_true")
    args = parser.parse_args(argv)

    try:
        policy = load_policy(args.policy)
    except ContractError as exc:
        print(json.dumps({"verdict": "BLOCKED", "errors": [issue(exc.code, str(exc)).as_dict()]}, indent=2), file=sys.stderr)
        return 2
    if args.source_root is not None:
        result = validate_static_source(policy, args.source_root.resolve())
        print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
        return 0 if result["verdict"] == "PASS" else 1

    fixture_paths = list(args.fixtures)
    if args.fixtures_dir is not None:
        fixture_paths.extend(discover_fixtures(args.fixtures_dir))
    if not fixture_paths:
        parser.error("provide fixture paths or --fixtures-dir")

    results = []
    expectation_failures: list[dict[str, Any]] = []
    blocked_without_expectation_mode = False
    for path in fixture_paths:
        result = validate_fixture_path(path, policy)
        record = {"path": os.fspath(path), **result}
        if args.check_expectations:
            try:
                envelope = load_json_file(path)
                if isinstance(envelope, dict):
                    problems = expectation_errors(envelope, result)
                else:
                    problems = ["fixture root must be an object"]
            except Exception as exc:  # noqa: BLE001 - CLI must return structured failure for bad fixtures.
                problems = [str(exc)]
            if problems:
                expectation_failures.append({"path": os.fspath(path), "problems": problems})
        elif result["verdict"] != "PASS":
            blocked_without_expectation_mode = True
        results.append(record)

    summary = {
        "schema_version": ENVELOPE_SCHEMA_VERSION,
        "validator_version": VALIDATOR_VERSION,
        "policy": os.fspath(args.policy),
        "checked": len(results),
        "results": results,
        "expectation_failures": expectation_failures,
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=2))
    if expectation_failures:
        return 1
    if blocked_without_expectation_mode:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
