# Tessera Iced G0 Evidence Schema (v1)

The machine-readable schemas are `native/testkit/schema/evidence-v1.schema.json` and `native/testkit/schema/payload-manifest-v1.schema.json`. `bin/validate-evidence` performs structural and semantic validation. The implementation is deliberately dependency-free and fail-closed; its stable behavior is exercised by `native/testkit/tests/test_contract.py`.

## Record envelope

Each `evidence.json` uses `schema_version: tessera.iced.evidence/v1` and contains:

```json
{
  "run": {"run_id": "RUN-...", "test_id": "T-G0-...", "layer": "L1|L2|L3|L4", "lane": "pr|nightly|rc|manual"},
  "coverage_cell": {"catalog_version": "coverage-g0-v1", "cell_id": "CELL-G0-..."},
  "source": {"identity_kind": "git_commit", "revision": "<40 lowercase hex>", "preflight": {"mode": "git", "verdict": "pass"}},
  "authority": {"catalog_version": "coverage-g0-v1", "catalog_sha256": "<frozen file sha256>", "crosswalk_sha256": "<frozen file sha256>"},
  "applicability": {},
  "execution": {"status": "pass|fail|blocked|inconclusive"},
  "risk": {"findings": []},
  "accepted_limitations": [],
  "runner": {},
  "artifacts": []
}
```

The catalog is the identity authority. The validator derives a cell from the catalog and requires the record's test, scenario, layer, profile, renderer, scale, theme, locale, release level, and assistive technology to match exactly. It rejects fabricated product IDs, including every `PR-G0*` value.

## Acyclic payload bundle

```
RUN-.../
  evidence.json                         # payload
  command.argv.json                     # payload
  environment.json                      # payload
  stdout.log                            # payload
  stderr.log                            # payload
  source-preflight.json                 # payload
  raw/ visual/ profiles/ handback/      # payload when present
  payload-manifest.json                 # excluded envelope
  provenance-attestation.json           # excluded envelope
  validation.json                       # excluded envelope
  signature-envelope.json               # trusted CI/RC only, excluded
  external-registration.json            # trusted CI/RC only, excluded
```

`payload-manifest.json` has no digest field and never names excluded envelopes. Its `payload_files` are safe relative paths, with SHA-256 and media type. `manifest_digest_sha256` is SHA-256 of canonical compact/sorted manifest JSON and appears only in provenance and validation envelopes. This lets the validator recompute every payload hash and digest without a cycle.

`validation.json` is excluded because validation is a post-manifest result. The authoritative gate decision is `validation.evidence_valid`; the immutable `execution.status` remains a factual target result. An invalid successful target therefore contributes `blocked` in the ledger instead of mutating payload bytes after hashing.

## Semantic rules

1. Only implemented clean Git identity is accepted. Archive identity and all archive preflight fields are deliberately **UNSUPPORTED** until a separate secure extraction implementation is delivered.
2. Source preflight must show the external evidence root and a `verdict: pass`; Git checks root, clean state, untracked policy, submodule policy, and equal HEAD/worktree native-tree hashes. The preflight command returns nonzero on every hard failure, and the runner revalidates the full verdict before starting its target.
3. The catalog expands to exactly 216 G0 cells. Its canonical digest and its exact source-file SHA-256, plus the crosswalk's two digests, are code-level locks. The runner copies both authority files into every bundle; their artifact digests are repeated in record, manifest, and provenance envelopes. The ledger rejects any other bytes for `coverage-g0-v1`.
4. Every artifact ID and path is unique/safe, exists in the payload manifest, and has the recorded digest. Required evidence artifacts cannot be omitted.
5. `applicable` requires a null reason and its extension; `not_applicable` requires a non-empty reason. Required metrics may never be N/A. Risks and limitations are never outcome aliases.
6. A visual pass cannot omit changed-pixel (software) or SSIM plus diff-area (hardware), DeltaE, geometry, contrast, mask approval, or structural checks. All limits come from the frozen catalog; records may not supply a threshold. Every visual, sample, mask, and approval ID resolves to a hashed record artifact and its manifest entry.
7. Soak analysis reads the raw time-series artifact and recomputes complete rolling windows, high-water growth, and OLS slope. No interpolation or cross-restart window is allowed.
8. A trusted CI/RC claim needs attestation, signature envelope, external registration, immutable URI/version, and an actual verifier command. `local_development` is always non-release-eligible.
9. A crate-contract record needs exactly three production package names and testkit-free normal/build/release closure. A documentation record needs exactly eleven `DOC-01..DOC-11` items. Each has enum status, RFC3339 review time, the current source revision, and existing valid same-source evidence. `blocked`, missing evidence, revision drift, or ungoverned/expired N/A blocks the record.
10. `evidence_metrics[]` repeats each catalog metric's `evidence_scope` and `required_by_gate`; `satisfied_gates` is forbidden in records and is derived only by the ledger. `shared_rc` accepts only RC lanes; `shared_nightly` accepts only Nightly/RC lanes. Aggregation is keyed by source identity, gate, metric ID, and frozen platform/artifact scope.
11. A retest has `supersedes_record_id`, `retest_ordinal`, and `handback_id`. Only ordinal 1 is allowed; it must use an immutable same-source/same-cell predecessor, start later, and exactly match the predecessor's targeted command. Parallel post-failure passes block the cell.
12. A signal finalization is internally consistent only when `signal` is `SIGINT` or `SIGTERM`, `finalized_by` is `signal_trap`, and `exit_code` is `128 + signal number`; a signal-less result must use `exit_trap`. The runner records signals from the first created run directory onward, does not launch after a recorded pre-spawn signal, and reaps a live target process group before it writes the terminal envelopes. The race fixture's child-ready PID is published by same-directory temporary write followed by `os.replace`, so a reader cannot observe marker existence before a complete PID is available.

## Derived ledger values

`bin/build-ledger` has only these derivations:

| Condition | Ledger value |
| --- | --- |
| no current record for required cell | `missing` |
| structurally invalid record/finalization failure | `blocked` |
| valid current record with execution failure/block | matching non-pass state |
| valid current `pass` | `pass` |
| catalog trend-only cell | `trend_only` |

Any required value other than `pass` makes the G0 aggregate `BLOCKED`. A local testkit pass cannot satisfy the absent native cells, and neither a limitation nor a risk finding can alter this rule.

The ledger additionally derives `shared_gate_aggregation[]`. Each row has `(source_identity, gate, metric_id, scope.kind, scope.key)` and may be `pass` only when a valid same-source contributor exists in the allowed lane. It never trusts a record-provided satisfaction flag. For G0, the shared objects are `MET-G0-STRIPPED-EXECUTABLE-SIZE-01` (30 MiB target, 40 MiB hard limit), `MET-G0-GZIP-EXECUTABLE-TREND-01`, and the two-platform `MET-LOW-SPEC-MATRIX-01` checkpoint; future-only soak and RC distribution metrics do not expand into G0 cells. For G6, `MET-G6-COMPRESSED-DISTRIBUTION-SIZE-01` is a distinct signed compressed distribution object (20 MiB target, 28 MiB hard limit), and future soak aggregation is keyed from the explicit future boundary cellsets. An executable artifact cannot satisfy the G6 distribution metric.
