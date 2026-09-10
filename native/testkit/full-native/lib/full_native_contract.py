"""Fail-closed contracts for the 101-component full-native program.

This module deliberately depends only on the Python standard library.  It
validates source declarations, generates deterministic scene manifests, and
checks capture geometry supplied by a real GUI harness.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "tessera.full-native.coverage/v1"
SCENE_SCHEMA_VERSION = "tessera.full-native.scenes/v1"
CAPTURE_SCHEMA_VERSION = "tessera.full-native.capture/v2"
EXPECTED_CATEGORY_COUNTS = {"Base": 75, "Business": 11, "Charts": 15}
ALLOWED_GEOMETRY_EXCEPTIONS = {"focus_visual", "overlay_shadow", "scroll_content"}
CACHE_ARTIFACT_DIRS = {"target", "tmp", "cache", "__pycache__"}
FORBIDDEN_SOURCE_PATTERNS = {
    "FORBIDDEN_GENERIC_FALLBACK": re.compile(r"\bGenericFallback\b"),
    "FORBIDDEN_DEFERRED": re.compile(r"\bDeferred\b"),
    "FORBIDDEN_RECOMPOSE": re.compile(r"\bRecompose\b"),
    "FORBIDDEN_WEBVIEW": re.compile(r"\bWebView\b"),
    "FORBIDDEN_CHROMIUM": re.compile(r"\bChromium\b"),
    # Raw HTML may be displayed as inert source text. Only an actual renderer
    # entry point is forbidden; banning the word itself would hide valid tests.
    "FORBIDDEN_HTML_RENDERER": re.compile(r"\b(?:HtmlRenderer|HtmlView|render_html|html::render)\b"),
}
CATALOG_ENTRY = re.compile(
    r"ComponentMeta\s*\{\s*id:\s*\"(?P<id>[a-z0-9-]+)\",\s*"
    r"name:\s*\"(?P<name>[^\"]+)\",\s*"
    r"category:\s*ComponentCategory::(?P<category>Base|Business|Charts),\s*"
    r"group:\s*\"(?P<group>[^\"]+)\",\s*\}",
    re.DOTALL,
)
REGISTRY_TUPLE = re.compile(
    r"\(\s*(?P<variant>[A-Z][A-Za-z0-9]*)\s*,\s*"
    r"\"(?P<id>[a-z0-9-]+)\"\s*,\s*"
    r"\"(?P<name>[^\"]+)\"\s*,\s*"
    r"(?P<category>Base|Business|Charts)\s*,\s*"
    r"(?P<group>[A-Z][A-Za-z0-9]*)\s*,\s*"
    r"\"[^\"]*\"\s*\)",
    re.DOTALL,
)
TYPED_ID_ENUM = re.compile(r"pub\s+enum\s+ComponentId\s*\{(?P<body>.*?)\}", re.DOTALL)
TYPED_ID_VARIANT = re.compile(r"^\s*(?P<variant>[A-Z][A-Za-z0-9]*)\s*,", re.MULTILINE)
TYPED_ID_STRING = re.compile(r"ComponentId::(?P<variant>[A-Z][A-Za-z0-9]*)\s*=>\s*\"(?P<id>[a-z0-9-]+)\"")
EXAMPLE_REGISTRY_ENTRY = re.compile(
    r"\(\s*(?P<state>[A-Z][A-Za-z0-9]*)\s*,\s*"
    r"(?P<id>[A-Z][A-Za-z0-9]*)\s*,\s*"
    r"(?P<target>[a-z][a-z0-9_]*::[a-z][a-z0-9_]*)\s*\)",
    re.DOTALL,
)
DETAIL_ROUTE_STATE = re.compile(r"struct\s+DetailRoute\s*\{(?P<body>.*?)\}", re.DOTALL)

MOTION_COMPONENTS = {
    "border-beam",
    "carousel",
    "progress",
    "skeleton",
    "spin",
    "tour",
    "line-chart",
    "bar-chart",
    "pie-chart",
    "area-chart",
    "sparkline",
    "scatter-chart",
    "radar-chart",
    "heatmap",
    "treemap",
    "funnel-chart",
    "gauge-chart",
    "sankey-chart",
    "organization-chart",
    "mind-map",
    "word-cloud",
}
OVERLAY_COMPONENTS = {
    "auto-complete",
    "cascader",
    "color-picker",
    "command-palette",
    "date-picker",
    "drawer",
    "dropdown",
    "mentions",
    "message",
    "modal",
    "notification",
    "popover",
    "popconfirm",
    "select",
    "time-picker",
    "tooltip",
    "tour",
    "tree-select",
}


def issue(code: str, message: str, **facts: Any) -> dict[str, Any]:
    return {"code": code, "message": message, "facts": facts}


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json(value)).hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_catalog(catalog_path: Path) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    if not catalog_path.is_file():
        return [], [issue("CATALOG_MISSING", "native catalog.rs is missing", path=str(catalog_path))]
    text = catalog_path.read_text(encoding="utf-8")
    entries = [match.groupdict() for match in CATALOG_ENTRY.finditer(text)]
    if not entries:
        entries = [
            {"id": item["id"], "name": item["name"], "category": item["category"], "group": re.sub(r"(?<=[a-z])(?=[A-Z])", " ", item["group"])}
            for item in REGISTRY_TUPLE.finditer(text)
        ]
    errors: list[dict[str, Any]] = []
    counts = Counter(entry["id"] for entry in entries)
    for component_id, count in sorted(counts.items()):
        if count != 1:
            errors.append(issue("REGISTRY_DUPLICATE_ID", "catalog ID must occur exactly once", component_id=component_id, count=count))
    category_counts = Counter(entry["category"] for entry in entries)
    expected_count = len(entries)
    if expected_count == 101 and dict(category_counts) != EXPECTED_CATEGORY_COUNTS:
        errors.append(issue("REGISTRY_CATEGORY_COUNTS", "101-component catalog category totals are frozen", actual=dict(category_counts), expected=EXPECTED_CATEGORY_COUNTS))
    return entries, errors


def source_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*.rs") if path.is_file()) if root.is_dir() else []


def cache_artifacts(repo_root: Path) -> list[str]:
    """Build output and interpreter caches are never evidence inputs."""
    found: list[str] = []
    if not repo_root.is_dir():
        return found
    for path in repo_root.rglob("*"):
        if path.is_dir() and path.name in CACHE_ARTIFACT_DIRS:
            found.append(path.relative_to(repo_root).as_posix())
    return sorted(found)


def rust_without_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return re.sub(r"//[^\n]*", "", text)


def has_real_rust_body(path: Path) -> bool:
    body = rust_without_comments(path.read_text(encoding="utf-8"))
    return bool(re.search(r"\b(?:pub\s+)?(?:fn|struct|enum|type|impl|const)\b", body))


def module_segment(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def component_paths(repo_root: Path, entry: dict[str, str]) -> tuple[Path, Path, Path]:
    # F7 is one physical implementation group despite its five catalog display groups.
    group = "charts" if entry["category"] == "Charts" else module_segment(entry["group"])
    component = module_segment(entry["id"])
    module = repo_root / "native/crates/tessera-iced/src/components" / group / f"{component}.rs"
    example = repo_root / "native/crates/tessera-gallery/src/examples" / group / component / "mod.rs"
    return module, example, example.with_name("integration.rs")


def parse_typed_catalog(catalog_path: Path) -> tuple[dict[str, str], list[dict[str, Any]]]:
    """Return frozen ID -> ComponentId variant from the catalog's typed source."""
    text = catalog_path.read_text(encoding="utf-8") if catalog_path.is_file() else ""
    macro_pairs = [(match.group("id"), match.group("variant")) for match in REGISTRY_TUPLE.finditer(text)]
    if macro_pairs:
        mapping = dict(macro_pairs)
        errors: list[dict[str, Any]] = []
        if len(mapping) != len(macro_pairs):
            errors.append(issue("TYPED_CATALOG_MAPPING", "component_registry! must map each ID to one unique ComponentId variant"))
        return mapping, errors
    enum_match = TYPED_ID_ENUM.search(text)
    if enum_match is None:
        return {}, [issue("TYPED_CATALOG_MISSING", "catalog must define the strong ComponentId enum")]
    variants = set(TYPED_ID_VARIANT.findall(enum_match.group("body")))
    pairs = [(match.group("id"), match.group("variant")) for match in TYPED_ID_STRING.finditer(text)]
    mapping: dict[str, str] = {}
    errors: list[dict[str, Any]] = []
    for component_id, variant in pairs:
        if component_id in mapping or variant not in variants:
            errors.append(issue("TYPED_CATALOG_MAPPING", "ComponentId string mapping must be one-to-one and use an enum variant", component_id=component_id, variant=variant))
        else:
            mapping[component_id] = variant
    if set(mapping.values()) != variants:
        errors.append(issue("TYPED_CATALOG_EXHAUSTIVENESS", "every ComponentId variant must map to one frozen string ID", variant_count=len(variants), mapped_variants=len(set(mapping.values()))))
    return mapping, errors


def is_real_iced_renderer(path: Path) -> bool:
    """A reducer-only module is not a completed native component."""
    body = rust_without_comments(path.read_text(encoding="utf-8"))
    iced_view = re.search(r"\b(?:pub\s+)?fn\s+(?:view|render)\b[\s\S]{0,500}?->\s*(?:iced::)?Element\b", body)
    canvas_renderer = re.search(r"\bimpl\b[\s\S]{0,300}\b(?:canvas::)?Program\b", body) and re.search(r"\bfn\s+draw\b", body)
    return bool(iced_view or canvas_renderer)


def example_dispatch_entries(path: Path) -> dict[str, list[str]]:
    """Read the only source of typed DetailState construction arms."""
    if not path.is_file():
        return {}
    targets: dict[str, list[str]] = defaultdict(list)
    for match in EXAMPLE_REGISTRY_ENTRY.finditer(rust_without_comments(path.read_text(encoding="utf-8"))):
        targets[match.group("id")].append(match.group("target"))
    return targets


def validate_detail_ownership(component_detail: Path, main: Path) -> list[dict[str, Any]]:
    """The Gallery has one detail state and one entry path, not a second route table."""
    errors: list[dict[str, Any]] = []
    detail_body = rust_without_comments(component_detail.read_text(encoding="utf-8")) if component_detail.is_file() else ""
    detail_struct = DETAIL_ROUTE_STATE.search(detail_body)
    if detail_struct is None or re.sub(r"\s+", "", detail_struct.group("body")) != "state:DetailState,":
        errors.append(issue("DETAIL_STATE_OWNERSHIP", "component_detail::DetailRoute must retain only DetailState"))
    required_detail_facts = ("for spec in COMPONENTS", "DetailRoute::new(spec.id)", "every_catalog_id_constructs_a_typed_detail_route")
    if not all(fact in detail_body for fact in required_detail_facts):
        errors.append(issue("DETAIL_CATALOG_CONSTRUCTION_TEST_MISSING", "component_detail must test construction for every catalog ID"))
    main_body = rust_without_comments(main.read_text(encoding="utf-8")) if main.is_file() else ""
    required_main_facts = ("Message::OpenComponent(id)", "component_detail::DetailRoute::new(id)", "app.component_detail = Some(route)")
    if not all(fact in main_body for fact in required_main_facts):
        errors.append(issue("MAIN_DETAIL_ENTRY_MISSING", "main.rs must enter a typed detail route from OpenComponent"))
    return errors


def rel(path: Path, repo_root: Path) -> str:
    return path.resolve().relative_to(repo_root.resolve()).as_posix()


def load_frozen_registry(path: Path) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    if not path.is_file():
        return [], [issue("FROZEN_REGISTRY_MISSING", "frozen registry is missing", path=str(path))]
    document = load_json(path)
    components = document.get("components") if isinstance(document, dict) else None
    if not isinstance(components, list):
        return [], [issue("FROZEN_REGISTRY_SHAPE", "frozen registry must contain a components array")]
    normalized: list[dict[str, str]] = []
    errors: list[dict[str, Any]] = []
    for item in components:
        if not isinstance(item, dict) or not all(isinstance(item.get(key), str) for key in ("id", "name", "category", "group")):
            errors.append(issue("FROZEN_REGISTRY_ENTRY", "frozen component entry is malformed", entry=item))
            continue
        normalized.append({key: item[key] for key in ("id", "name", "category", "group")})
    counts = Counter(item["id"] for item in normalized)
    if len(normalized) == 101:
        if dict(Counter(item["category"] for item in normalized)) != EXPECTED_CATEGORY_COUNTS:
            errors.append(issue("FROZEN_CATEGORY_COUNTS", "frozen 101-component totals are invalid", actual=dict(Counter(item["category"] for item in normalized))))
    for component_id, count in counts.items():
        if count != 1:
            errors.append(issue("FROZEN_DUPLICATE_ID", "frozen ID must occur once", component_id=component_id, count=count))
    return normalized, errors


def frozen_registry_document(catalog: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "schema_version": "tessera.full-native.registry/v1",
        "component_count": len(catalog),
        "category_counts": dict(sorted(Counter(entry["category"] for entry in catalog).items())),
        "components": catalog,
    }


def validate_coverage(repo_root: Path, frozen_path: Path, scene_path: Path | None = None) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    catalog, errors = parse_catalog(repo_root / "native/crates/tessera-core/src/catalog.rs")
    frozen, frozen_errors = load_frozen_registry(frozen_path)
    errors.extend(frozen_errors)
    frozen_by_id = {entry["id"]: entry for entry in frozen}
    if catalog != frozen:
        errors.append(issue("FROZEN_REGISTRY_DRIFT", "catalog must exactly equal the frozen 101 registry", catalog_sha256=sha256(catalog), frozen_sha256=sha256(frozen)))
    catalog_path = repo_root / "native/crates/tessera-core/src/catalog.rs"
    typed_ids, typed_errors = parse_typed_catalog(catalog_path)
    errors.extend(typed_errors)
    if set(typed_ids) != set(frozen_by_id):
        errors.append(issue("TYPED_CATALOG_ID_SET", "strong ComponentId mapping must equal frozen registry IDs", actual_count=len(typed_ids), expected_count=len(frozen_by_id)))
    examples_dispatcher = repo_root / "native/crates/tessera-gallery/src/examples/dispatch.rs"
    component_detail = repo_root / "native/crates/tessera-gallery/src/component_detail/mod.rs"
    main = repo_root / "native/crates/tessera-gallery/src/main.rs"
    example_targets = example_dispatch_entries(examples_dispatcher)
    errors.extend(validate_detail_ownership(component_detail, main))
    statuses: list[dict[str, Any]] = []

    for component_id in sorted(frozen_by_id):
        entry = frozen_by_id[component_id]
        module, example, integration = component_paths(repo_root, entry)
        status: dict[str, Any] = {"id": component_id, "component_module": rel(module, repo_root), "example_module": rel(example, repo_root), "integration": rel(integration, repo_root), "dispatcher": rel(examples_dispatcher, repo_root), "detail_host": rel(component_detail, repo_root), "entry_host": rel(main, repo_root), "errors": []}
        if not module.is_file():
            status["errors"].append("COMPONENT_MODULE_MISSING")
            errors.append(issue("COMPONENT_MODULE_MISSING", "fixed component module is missing", component_id=component_id, path=status["component_module"]))
        elif not has_real_rust_body(module):
            status["errors"].append("COMPONENT_MODULE_EMPTY")
            errors.append(issue("COMPONENT_MODULE_EMPTY", "component module must contain Rust behavior", component_id=component_id, path=status["component_module"]))
        elif not is_real_iced_renderer(module):
            status["errors"].append("COMPONENT_RENDERER_MISSING")
            errors.append(issue("COMPONENT_RENDERER_MISSING", "component must expose an Iced Element view or drawable Canvas renderer", component_id=component_id, path=status["component_module"]))
        if not example.is_file():
            status["errors"].append("EXAMPLE_MODULE_MISSING")
            errors.append(issue("EXAMPLE_MODULE_MISSING", "fixed example module is missing", component_id=component_id, path=status["example_module"]))
        elif not has_real_rust_body(example):
            status["errors"].append("EXAMPLE_MODULE_EMPTY")
            errors.append(issue("EXAMPLE_MODULE_EMPTY", "example module must contain Rust behavior", component_id=component_id, path=status["example_module"]))
        if not integration.is_file():
            status["errors"].append("INTEGRATION_MISSING")
            errors.append(issue("INTEGRATION_MISSING", "example needs fixed sibling integration.rs", component_id=component_id, path=status["integration"]))
        else:
            if not has_real_rust_body(integration):
                status["errors"].append("INTEGRATION_EMPTY")
                errors.append(issue("INTEGRATION_EMPTY", "integration.rs must contain compileable Rust source", component_id=component_id, path=status["integration"]))
            else:
                example_body = rust_without_comments(example.read_text(encoding="utf-8")) if example.is_file() else ""
                same_origin_facts = ("mod integration;", 'include_str!("integration.rs")', "integration::view")
                if not all(fact in example_body for fact in same_origin_facts):
                    status["errors"].append("INTEGRATION_NOT_SAME_ORIGIN")
                    errors.append(issue("INTEGRATION_NOT_SAME_ORIGIN", "sibling integration must be compiled, rendered, and shown as its example's code", component_id=component_id, path=status["example_module"]))
        if example.is_file() and not re.search(r"\bmod\s+integration\s*;", rust_without_comments(example.read_text(encoding="utf-8"))):
            status["errors"].append("INTEGRATION_NOT_COMPILED_WITH_EXAMPLE")
            errors.append(issue("INTEGRATION_NOT_COMPILED_WITH_EXAMPLE", "example must compile its fixed sibling integration module", component_id=component_id, path=status["example_module"]))
        variant = typed_ids.get(component_id)
        physical_group = "charts" if entry["category"] == "Charts" else module_segment(entry["group"])
        expected_target = f"{physical_group}::{module_segment(component_id)}"
        actual = example_targets.get(variant or "", [])
        if len(actual) != 1:
            status["errors"].append("EXAMPLE_DISPATCH_CARDINALITY")
            errors.append(issue("EXAMPLE_DISPATCH_CARDINALITY", "examples/dispatch.rs must have exactly one typed DetailState constructor arm", component_id=component_id, variant=variant, count=len(actual)))
        elif actual[0] != expected_target:
            status["errors"].append("EXAMPLE_DISPATCH_TARGET")
            errors.append(issue("EXAMPLE_DISPATCH_TARGET", "dispatcher constructor arm must reference the fixed example module", component_id=component_id, expected=expected_target, actual=actual[0]))
        statuses.append(status)

    for crate_root in (repo_root / "native/crates/tessera-core/src", repo_root / "native/crates/tessera-iced/src", repo_root / "native/crates/tessera-gallery/src"):
        for source in source_files(crate_root):
            text = rust_without_comments(source.read_text(encoding="utf-8"))
            for code, pattern in FORBIDDEN_SOURCE_PATTERNS.items():
                if pattern.search(text):
                    errors.append(issue(code, "forbidden Web or incomplete completion path in native source", path=rel(source, repo_root), pattern=pattern.pattern))

    cache_paths = cache_artifacts(repo_root)
    if cache_paths:
        errors.append(issue("CACHE_ARTIFACT_PRESENT", "target/tmp/cache/__pycache__ artifacts must be removed before evidence", paths=cache_paths))

    scene_counts: dict[str, int] = {}
    if scene_path is not None:
        if not scene_path.is_file():
            errors.append(issue("SCENE_MANIFEST_MISSING", "scene manifest is missing", path=str(scene_path)))
        else:
            scene_document = load_json(scene_path)
            scene_errors = validate_scene_manifest(scene_document, frozen)
            errors.extend(scene_errors)
            scene_counts = dict(scene_document.get("counts", {})) if isinstance(scene_document, dict) else {}

    return {
        "schema_version": SCHEMA_VERSION,
        "verdict": "pass" if not errors else "blocked",
        "registry": {"count": len(catalog), "category_counts": dict(sorted(Counter(entry["category"] for entry in catalog).items())), "ids": [entry["id"] for entry in catalog]},
        "frozen_registry_sha256": sha256(frozen),
        "scene_counts": scene_counts,
        "cache_artifacts": cache_paths,
        "components": statuses,
        "errors": errors,
    }


def scenario(component_id: str, suffix: str, suite: str, **details: Any) -> dict[str, Any]:
    return {"id": f"FN-{component_id}-{suffix}", "component_id": component_id, "suite": suite, **details}


def generate_scene_manifest(registry: list[dict[str, str]]) -> dict[str, Any]:
    cases: list[dict[str, Any]] = []
    for entry in registry:
        component_id = entry["id"]
        for theme, width, height in (("light", 1240, 800), ("dark", 1240, 800), ("light", 840, 600), ("dark", 840, 600)):
            cases.append(scenario(component_id, f"{theme[0].upper()}-{width}", "base_visual", theme=theme, viewport={"width": width, "height": height}, required_artifacts=["png", "geometry", "evidence"], assertions=["nonblank_pixels", "text_visible", "focus_visible", "no_page_horizontal_overflow", "layout_in_bounds"]))
        cases.append(scenario(component_id, "LONG", "long_text", theme="light", viewport={"width": 840, "height": 600}, fixture="cjk-emoji-2048-url-4096-paragraph-wide-numeric-column", required_artifacts=["png", "geometry", "evidence"], assertions=["local_code_scroll_only", "full_value_reachable", "no_page_horizontal_overflow", "no_overlap"]))
        cases.append(scenario(component_id, "KEY", "keyboard_focus", theme="light", viewport={"width": 840, "height": 600}, required_artifacts=["png", "geometry", "evidence", "keyboard_trace", "ax_tree"], required_keys=["Tab", "Shift+Tab", "Enter", "Space", "Arrow", "Home", "End", "Escape"], input_origin="platform_injected_or_physical", assertions=["visual_reading_order", "visible_focus", "back_focus_restored", "overlay_escape_returns_focus", "ax_tree_exposes_internal_controls", "tab_enters_sidebar", "enter_activates_catalog_tile"]))
        cases.append(scenario(component_id, "STATIC", "motion_static", theme="light", viewport={"width": 1240, "height": 800}, required_artifacts=["evidence"], assertions=["frame_requests_per_second=0", "no_polling", "no_permanent_redraw"]))
    for component_id in sorted(MOTION_COMPONENTS.intersection({entry["id"] for entry in registry})):
        cases.append(scenario(component_id, "MOTION", "motion_lifecycle", required_artifacts=["evidence"], lifecycle=["start", "active", "deadline_idle", "route_change_idle", "blur_idle", "minimized_idle", "reduced_motion_idle"], assertions=["frames_only_while_visible_active", "deadline_cancels_subscription", "reduced_motion_immediate_final_state"]))
    for component_id in sorted(OVERLAY_COMPONENTS.intersection({entry["id"] for entry in registry})):
        cases.append(scenario(component_id, "OVERLAY", "overlay", theme="light", viewport={"width": 840, "height": 600}, required_artifacts=["png", "geometry", "evidence", "keyboard_trace"], placements=["top", "right", "bottom", "left", "four_corners"], assertions=["overlay_in_safe_area", "overlay_internal_scroll", "escape_returns_opener_focus"]))
    for entry in registry:
        if entry["category"] == "Charts":
            component_id = entry["id"]
            cases.append(scenario(component_id, "DATA-10K", "chart_capacity", required_artifacts=["png", "geometry", "evidence"], data_points=10000, assertions=["bounded_sampling_or_geometry", "exact_value_fallback", "no_sync_full_scan_in_pointer_path"]))
            cases.append(scenario(component_id, "CACHE", "chart_cache", required_artifacts=["evidence"], cache_key_fields=["data_revision", "logical_size", "dpi", "theme", "interaction_state"], cache_limits_mib={"soft": 4, "hard": 8}, assertions=["invalidates_on_all_key_changes", "released_on_route_exit"]))
    counts = Counter(case["suite"] for case in cases)
    return {"schema_version": SCENE_SCHEMA_VERSION, "registry_sha256": sha256(registry), "component_count": len(registry), "counts": dict(sorted(counts.items())), "scenes": cases}


def validate_scene_manifest(document: Any, registry: list[dict[str, str]]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    if not isinstance(document, dict) or document.get("schema_version") != SCENE_SCHEMA_VERSION:
        return [issue("SCENE_SCHEMA", "scene manifest schema version is invalid")]
    scenes = document.get("scenes")
    if not isinstance(scenes, list):
        return [issue("SCENE_SHAPE", "scene manifest needs a scenes array")]
    ids = {entry["id"] for entry in registry}
    scene_ids = [scene.get("id") for scene in scenes if isinstance(scene, dict)]
    for scene_id, count in Counter(scene_ids).items():
        if not isinstance(scene_id, str) or count != 1:
            errors.append(issue("SCENE_DUPLICATE_ID", "scene IDs must be unique and nonempty", scene_id=scene_id, count=count))
    by_suite = Counter(scene.get("suite") for scene in scenes if isinstance(scene, dict))
    expected_suites = {"base_visual": len(ids) * 4, "long_text": len(ids), "keyboard_focus": len(ids), "motion_static": len(ids)}
    for suite, expected in expected_suites.items():
        if by_suite[suite] != expected:
            errors.append(issue("SCENE_SUITE_COUNT", "scene suite count is frozen", suite=suite, actual=by_suite[suite], expected=expected))
    chart_ids = {entry["id"] for entry in registry if entry["category"] == "Charts"}
    for suite in ("chart_capacity", "chart_cache"):
        if by_suite[suite] != len(chart_ids):
            errors.append(issue("SCENE_CHART_COUNT", "each chart needs a 10k-data and cache scene", suite=suite, actual=by_suite[suite], expected=len(chart_ids)))
    motion_ids = set(MOTION_COMPONENTS).intersection(ids)
    if by_suite["motion_lifecycle"] != len(motion_ids):
        errors.append(issue("SCENE_MOTION_COUNT", "each motion component needs one bounded lifecycle scene", actual=by_suite["motion_lifecycle"], expected=len(motion_ids)))
    for scene in scenes:
        if not isinstance(scene, dict):
            errors.append(issue("SCENE_ENTRY", "scene must be an object", scene=scene))
        elif scene.get("component_id") not in ids:
            errors.append(issue("SCENE_UNKNOWN_COMPONENT", "scene component is outside frozen registry", component_id=scene.get("component_id")))
    return errors


def rect_valid(rect: Any) -> bool:
    return isinstance(rect, dict) and all(isinstance(rect.get(key), (int, float)) and math.isfinite(float(rect[key])) for key in ("x", "y", "width", "height")) and rect["width"] >= 0 and rect["height"] >= 0


def rect_within(inner: dict[str, float], outer: dict[str, float], tolerance: float = 1.0) -> bool:
    return inner["x"] >= outer["x"] - tolerance and inner["y"] >= outer["y"] - tolerance and inner["x"] + inner["width"] <= outer["x"] + outer["width"] + tolerance and inner["y"] + inner["height"] <= outer["y"] + outer["height"] + tolerance


def validate_geometry(document: Any) -> list[dict[str, Any]]:
    if not isinstance(document, dict):
        return [issue("GEOMETRY_SHAPE", "geometry must be an object")]
    viewport = document.get("viewport")
    scroll_extent = document.get("page_scroll_extent")
    surfaces = document.get("surfaces")
    errors: list[dict[str, Any]] = []
    if not rect_valid(viewport) or not rect_valid(scroll_extent):
        return [issue("GEOMETRY_PAGE_RECT", "viewport and page scroll extent must be finite nonnegative rects")]
    if scroll_extent["width"] > viewport["width"] + 1.0:
        errors.append(issue("PAGE_HORIZONTAL_OVERFLOW", "page scroll extent exceeds viewport width", viewport_width=viewport["width"], scroll_width=scroll_extent["width"]))
    if not isinstance(surfaces, list) or not surfaces:
        return errors + [issue("GEOMETRY_SURFACES", "geometry requires at least one surface")]
    for surface in surfaces:
        if not isinstance(surface, dict) or not rect_valid(surface.get("outer_rect")) or not rect_valid(surface.get("content_rect")):
            errors.append(issue("GEOMETRY_SURFACE_RECT", "surface needs finite outer and content rects", surface=surface))
            continue
        outer = surface["outer_rect"]
        content = surface["content_rect"]
        if not rect_within(content, outer):
            errors.append(issue("GEOMETRY_CONTENT_OUT_OF_BOUNDS", "surface content exceeds outer rect", surface=surface.get("id")))
        for child in surface.get("children", []):
            if not isinstance(child, dict) or not rect_valid(child.get("layout_rect")):
                errors.append(issue("GEOMETRY_CHILD_RECT", "child needs a finite layout rect", surface=surface.get("id")))
                continue
            exception = child.get("exception_kind")
            if exception is not None and exception not in ALLOWED_GEOMETRY_EXCEPTIONS:
                errors.append(issue("GEOMETRY_EXCEPTION_KIND", "geometry exception is not allowed", exception_kind=exception))
            if exception not in ALLOWED_GEOMETRY_EXCEPTIONS and not rect_within(child["layout_rect"], content):
                errors.append(issue("GEOMETRY_CHILD_OUT_OF_BOUNDS", "normal child layout exceeds its content rect", surface=surface.get("id"), child=child.get("id")))
            hit_rect = child.get("hit_rect")
            if hit_rect is not None and (not rect_valid(hit_rect) or hit_rect["width"] == 0 or hit_rect["height"] == 0 or not rect_within(hit_rect, content)):
                errors.append(issue("GEOMETRY_HIT_RECT", "hit rect must be nonzero and remain inside its surface", surface=surface.get("id"), child=child.get("id")))
    return errors


def validate_ax_and_keyboard(evidence: Any, scene: dict[str, Any]) -> list[dict[str, Any]]:
    """Reject state-only accessibility claims; require observable platform evidence."""
    if not isinstance(evidence, dict):
        return [issue("EVIDENCE_SHAPE", "capture evidence must be an object")]
    errors: list[dict[str, Any]] = []
    if evidence.get("capture_kind") != "gui":
        errors.append(issue("EVIDENCE_NOT_GUI", "GUI evidence is required; state-only evidence is not accepted"))
    if scene.get("suite") != "keyboard_focus":
        return errors
    trace = evidence.get("keyboard_trace")
    snapshot = evidence.get("ax_snapshot")
    if not isinstance(trace, dict) or trace.get("input_origin") not in {"platform_injected", "physical"}:
        errors.append(issue("KEYBOARD_NOT_REAL_INPUT", "keyboard trace must declare platform-injected or physical input"))
    elif not trace.get("tab_entered_sidebar") or not trace.get("enter_activated_catalog_tile"):
        errors.append(issue("KEYBOARD_NAVIGATION_UNREACHABLE", "real Tab must enter the sidebar and Enter must activate a catalog tile"))
    if trace.get("ime") != "observed":
        errors.append(issue("IME_EVIDENCE_BLOCKED", "keyboard_focus acceptance requires an observed IME bridge; CGEvent Unicode is insufficient"))
    if not isinstance(snapshot, dict):
        errors.append(issue("AX_SNAPSHOT_MISSING", "keyboard scenario needs an AX tree snapshot"))
        return errors
    nodes = snapshot.get("nodes")
    if not isinstance(nodes, list):
        errors.append(issue("AX_TREE_SHAPE", "AX snapshot needs a node array"))
        return errors
    internal_roles = {"button", "checkbox", "combobox", "link", "menuitem", "radio", "slider", "tab", "textbox", "treeitem"}
    visible_interactive = [node for node in nodes if isinstance(node, dict) and node.get("visible") is True and node.get("role") in internal_roles]
    sidebar_nodes = [node for node in nodes if isinstance(node, dict) and node.get("landmark") == "sidebar" and node.get("visible") is True]
    if not visible_interactive:
        errors.append(issue("AX_INTERNAL_CONTROLS_MISSING", "AX tree exposes no visible internal interactive controls"))
    if not sidebar_nodes:
        errors.append(issue("AX_SIDEBAR_MISSING", "AX tree does not expose a visible sidebar landmark"))
    if isinstance(trace, dict) and trace.get("focused_ax_id") not in {node.get("id") for node in visible_interactive}:
        errors.append(issue("AX_FOCUS_TARGET_MISSING", "keyboard trace focus target must identify a visible AX control"))
    return errors
