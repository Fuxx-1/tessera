"""Derive, never hand-edit, the G0 coverage ledger."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from evidence_contract import (
    boundary_cells,
    expected_cells,
    load_json,
    source_identity,
    utc_now,
    validate_authority_files,
    validate_catalog,
    validate_evidence,
    write_json,
)


def collect_records(root: Path, catalog: dict[str, Any], crosswalk: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    entries: list[dict[str, Any]] = []
    index: dict[str, dict[str, Any]] = {}
    if not root.exists():
        return entries, index
    for evidence_path in sorted(root.rglob("evidence.json")):
        try:
            record = load_json(evidence_path)
        except (OSError, json.JSONDecodeError):
            continue
        entry = {
            "record": record,
            "run_dir": evidence_path.parent,
            "immutable": (evidence_path.parent / "payload-manifest.json").is_file() and (evidence_path.parent / "provenance-attestation.json").is_file(),
            "valid": None,
        }
        entries.append(entry)
        record_id = record.get("record_id") if isinstance(record, dict) else None
        if isinstance(record_id, str) and record_id not in index:
            index[record_id] = entry
        elif isinstance(record_id, str):
            entry["duplicate_record_id"] = True
            index[record_id]["duplicate_record_id"] = True

    # Documentation records can only cite already independently validated evidence.
    for entry in entries:
        record = entry["record"]
        if record.get("run", {}).get("test_id") == "T-G0-020":
            continue
        result = validate_evidence(record, catalog, crosswalk, entry["run_dir"], index)
        entry["valid"] = result["evidence_valid"] and not entry.get("duplicate_record_id", False)
        entry["validation"] = result
    for entry in entries:
        if entry["record"].get("run", {}).get("test_id") != "T-G0-020":
            continue
        result = validate_evidence(entry["record"], catalog, crosswalk, entry["run_dir"], index)
        entry["valid"] = result["evidence_valid"] and not entry.get("duplicate_record_id", False)
        entry["validation"] = result
    return entries, index


def select_current(entries: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str]:
    """Select an immutable root or its one permitted targeted retest."""
    if not entries:
        return None, "missing"
    roots = [entry for entry in entries if entry["record"].get("retest_ordinal") == 0]
    retests = [entry for entry in entries if entry["record"].get("retest_ordinal") == 1]
    if len(roots) != 1 or len(retests) > 1 or any(not entry.get("valid") for entry in entries):
        return None, "blocked"
    root = roots[0]
    if not retests:
        return root, root["record"].get("execution", {}).get("status", "blocked")
    retest = retests[0]
    if retest["record"].get("supersedes_record_id") != root["record"].get("record_id"):
        return None, "blocked"
    return retest, retest["record"].get("execution", {}).get("status", "blocked")


def expected_shared_keys(catalog: dict[str, Any], gate: str) -> list[tuple[str, str, str]]:
    cells = expected_cells(catalog)
    if gate != "G0":
        cells.extend(boundary_cells(catalog))
    keys: set[tuple[str, str, str]] = set()
    for definition in catalog.get("metric_definitions", []):
        if definition.get("evidence_scope") == "scene_local" or gate not in definition.get("required_by_gate", []):
            continue
        metric_id = definition["id"]
        if definition.get("aggregation_scope") == "artifact":
            keys.add((metric_id, "artifact", definition["scope_key"]))
        else:
            for cell in cells:
                if metric_id in cell.get("metric_ids", []):
                    keys.add((metric_id, "platform", cell["platform_profile_id"]))
    return sorted(keys)


def aggregate_shared_metrics(entries: list[dict[str, Any]], catalog: dict[str, Any], gate: str, identity: str | None) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for metric_id, scope_kind, scope_key in expected_shared_keys(catalog, gate):
        contributors: list[str] = []
        for entry in entries:
            record = entry["record"]
            if not entry.get("valid") or source_identity(record.get("source", {})) != identity:
                continue
            for metric in record.get("evidence_metrics", []):
                if not isinstance(metric, dict) or metric.get("metric_id") != metric_id:
                    continue
                scope = metric.get("metric_scope", {})
                if metric.get("applicability", {}).get("state") == "applicable" and scope.get("kind") == scope_kind and scope.get("key") == scope_key:
                    contributors.append(record["record_id"])
        results.append(
            {
                "source_identity": identity,
                "gate": gate,
                "metric_id": metric_id,
                "scope": {"kind": scope_kind, "key": scope_key},
                "contributor_record_ids": sorted(set(contributors)),
                "satisfied_gates": [gate] if contributors else [],
                "status": "pass" if contributors else "missing",
            }
        )
    return results


def run(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", required=True)
    parser.add_argument("--crosswalk", required=True)
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--gate", choices=[f"G{index}" for index in range(7)], default="G0")
    args = parser.parse_args(argv)
    catalog_path = Path(args.catalog)
    crosswalk_path = Path(args.crosswalk)
    catalog = load_json(catalog_path)
    crosswalk = load_json(crosswalk_path)
    catalog_errors = validate_authority_files(catalog_path, crosswalk_path) + validate_catalog(catalog, crosswalk)
    cells = expected_cells(catalog)
    entries, _index = collect_records(Path(args.evidence_root), catalog, crosswalk)

    identities = sorted({source_identity(entry["record"].get("source", {})) for entry in entries if source_identity(entry["record"].get("source", {}))})
    selected_identity = identities[0] if len(identities) == 1 else None
    rows = []
    for cell in cells:
        if cell["gate_class"] == "trend_only":
            status = "trend_only"
        elif selected_identity is None and identities:
            status = "blocked"
        else:
            matching = [entry for entry in entries if source_identity(entry["record"].get("source", {})) == selected_identity and entry["record"].get("coverage_cell", {}).get("cell_id") == cell["cell_id"]]
            _current, status = select_current(matching)
        rows.append({"cell_id": cell["cell_id"], "test_id": cell["test_id"], "scenario_id": cell["scenario_id"], "platform_profile_id": cell["platform_profile_id"], "layer": cell["layer"], "status": status})
    shared = aggregate_shared_metrics(entries, catalog, args.gate, selected_identity)
    counts = Counter(row["status"] for row in rows)
    shared_pass = all(item["status"] == "pass" for item in shared)
    aggregate = "PASS" if not catalog_errors and len(identities) == 1 and counts.get("missing", 0) == 0 and all(row["status"] in {"pass", "trend_only"} for row in rows) and shared_pass else "BLOCKED"
    write_json(
        Path(args.out),
        {
            "schema_version": "tessera.iced.ledger/v1",
            "catalog_version": catalog["catalog_version"],
            "gate": args.gate,
            "source_identity": selected_identity,
            "aggregate_status": aggregate,
            "catalog_errors": catalog_errors,
            "counts": dict(sorted(counts.items())),
            "shared_gate_aggregation": shared,
            "cells": rows,
        },
    )
    return 0 if not catalog_errors else 2


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1:]))
