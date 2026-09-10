# Tessera Iced G0 Test Strategy (Evidence Repair v6)

**Status:** G0 evidence-contract traceability closure. This is a test-infrastructure deliverable, not native implementation evidence. It does not close G0, certify a renderer, prove a low-spec result, or authorize release.

## Scope and decisions

This strategy replaces the two design-candidate documents only for the repaired test/evidence contract. It applies to the frozen source identity in `native/testkit/baseline/source-baseline.json` and to later G0 runs. It has no authority to change the read-only Tessera source tree.

- Evidence has four non-substitutable layers: L1 pure Rust, L2 iced interaction, L3 deterministic software visual, and L4 declared physical hardware.
- `PLAT-MAC-M1-8G` and `PLAT-WIN-I5-8250U-8G` are the only G0 GA performance/platform authorities. A M4 Pro, VM, cloud runner, or unidentified device is `trend_only`; it cannot fill a required cell.
- One required cell is a specific `test -> scenario -> layer -> profile -> renderer -> system scale -> UI scale -> theme -> locale -> assistive-tech` tuple. The versioned catalog, not a handwritten summary, is the source of the required set. `coverage-g0-v1` is frozen at 216 G0 cells by a code-level count, canonical SHA-256, and exact-file SHA-256 lock; its crosswalk has the same digest lock.
- Product IDs are only canonical IDs from the product contract (`P0-*` / `P1-*`). There is no `PR-G0*` namespace. G0 infrastructure controls are traced through the owning canonical product requirement, most commonly `P1-W0-01`.
- `native/testkit` is private, non-production tooling. It must not become a fourth production crate, a normal/build dependency of `tessera-core`, `tessera-iced`, or `tessera-gallery`, or public product API.

## Frozen G0 matrix

`native/testkit/catalog/coverage-g0-v1.json` expands to **216 required G0 cells**:

| Set | Cells | Required authority |
| --- | ---: | --- |
| L1 contract/build/supply-chain controls | 10 | logical/tooling only |
| L2 interaction/handback/DoD controls | 4 | logical/testkit adapter |
| L3 software visual and visual-metric sentinels | 96 | deterministic software profile; 4 system x 3 UI scale x 2 themes x 2 locales |
| L4 macOS/Windows visual sentinel | 96 | M1/8 GiB Metal and i5-8250U/8 GiB DX12, same scale/theme/locale matrix |
| L4 renderer/input/fault/perf probes | 10 | five named G0 probes on each low-spec GA profile; soak is future-only |

Every expanded G0 cell is required unless its catalog `gate_class` is explicitly `trend_only`; no record from a trend profile can substitute for one of the 216. `T-G0-018/REQ-G0-SOAK-01` is retained as a future non-required boundary for G4/G6 soak, not a G0 required cell. A missing record is ledger state `missing`, not an execution outcome. With no valid passing record, the ledger is `BLOCKED`.

## State model

The record models three separate questions:

| Dimension | Values | Meaning |
| --- | --- | --- |
| Applicability | `applicable`, `not_applicable(reason)` | Whether a check belongs to this cell. |
| Execution | `pass`, `fail`, `blocked`, `inconclusive` | What actually happened during the run. |
| Risk | independent findings | Observed risk and owner; it never changes the execution value. |

`missing`, `pending`, and `trend_only` are derived by `bin/build-ledger`, never written into `execution.status`. An accepted limitation needs an approver, scope, compensating control, non-expired expiry, factual reason, and a real GA-to-Beta/Preview downgrade. It records scope only and cannot satisfy a GA hard cell.

## Source and provenance

Before a target command, `bin/preflight-source` must produce a source-preflight JSON record with `mode=git` and `verdict=pass`. Git requires the declared root to be the Git top-level, clean index/worktree/untracked state, approved submodule policy, and matching HEAD/worktree native-tree identity. Every hard preflight failure returns nonzero. Archive identity and archive preflight are **UNSUPPORTED** until separately implemented with secure extraction; neither may be self-reported. Evidence root, capture files, and temporary build evidence must be outside the source root.

`run-evidence` validates authority bytes before a target starts, copies the exact catalog/crosswalk into the bundle, and emits their SHA-256 values in evidence, manifest, and provenance. `payload-manifest.json` lists payload files and their hashes but excludes itself, `validation.json`, `provenance-attestation.json`, `signature-envelope.json`, and `external-registration.json`. Its SHA-256 is over `canonical-json-v1` bytes (UTF-8, sorted object keys, retained array order, compact JSON). The digest is stored only in excluded envelopes, so it has no self-reference.

Local runs have `mode=local_development` and `release_eligible=false`. Trusted CI and RC require a verified attestation/signature, workflow/run/job, trusted timestamp, immutable object URI/version, and external registration. This prototype rejects trusted claims without a configured verification command; it never treats a self-contained hash as trusted provenance.

## Single runner contract

All evidence-producing commands use:

```bash
native/testkit/bin/run-evidence \
  --catalog native/testkit/catalog/coverage-g0-v1.json \
  --evidence-root /outside/the/source/evidence \
  --run-id RUN-20260817T000000Z-b9c797d8-001 \
  --template case.json \
  --source-preflight source-preflight.json \
  -- python3 -m pytest
```

The runner installs `INT`/`TERM` trapping immediately after it creates the run directory. A signal recorded before spawn prevents target launch; the spawn check and `Popen` handle assignment are protected as one signal-masked critical section. After a target is live, the main path uses bounded `communicate()` polling, stops the target process group outside the signal handler, and escalates to a bounded group kill before finalization. The handler itself only records the first signal, avoiding reentrant `Popen` wait-lock access. The signal-race fixture publishes its child-ready PID atomically by writing a same-directory temporary marker and replacing it into place, so marker existence never exposes an empty PID. The runner captures argv/stdout/stderr/exit and finalizes exactly once after normal exit, failure, `INT`, or `TERM`; a signal record uses `finalized_by=signal_trap`, `signal=SIGINT|SIGTERM`, and `exit_code=128+signal`. It writes a handback packet for a non-pass target, calculates the payload manifest, writes local provenance, and invokes the validator even after target failure. A finalization or validation failure blocks ledger contribution; it never becomes a pass.

The runner rejects a missing preflight, evidence inside the declared source root, a non-locked target, a debug visual/hardware/performance/soak target, and zero or multiple renderer features. A runner result is still only a record: it does not close a missing platform cell.

## Visual, soak, crate, and documentation controls

- Visual evidence requires baseline/candidate/heatmap/comparison artifacts, changed-pixel comparison (`<=0.05%`) for software or SSIM (`>=0.995`) plus diff area (`<=0.2%`) for hardware, DeltaE2000 (`<=3`), key dimension error in DIP (`<=1`), contrast samples (text `>=4.5:1`, large text/non-text focus `>=3:1`), and a reviewed bounded mask. All thresholds, mask config SHA-256, and maximum mask area come from frozen catalog authority, never a record. Every visual/sample/mask/approval ID must resolve to a record artifact whose hash is in the manifest. Scale metadata must match the catalog cell. Structural clipping, overlap, hidden focus, and text occlusion must each pass.
- Soak uses 300-second samples. A complete 8-hour window has 97 samples at offsets 0 through 28,800 seconds, each within 15 seconds and with no gap above 330 seconds. Every complete rolling window computes high-water RSS growth and OLS slope in MiB/hour; the maxima decide the result. Gaps, clock rollback, crash, or restart end a session and may not be stitched. Nightly needs at least 8 hours; RC uses `--duration 24h` and preserves every complete window.
- `T-G0-019` consumes locked Cargo metadata, normal/build dependency closure, and release-package inspection. It requires exactly `tessera-core`, `tessera-iced`, and `tessera-gallery` as production packages and rejects testkit in normal/build/release closure.
- `T-G0-020` requires exactly `DOC-01` through `DOC-11`; each has enum status, RFC3339 review time, the candidate source revision, and existing valid same-source evidence IDs. A `blocked` item, missing evidence, revision drift, or N/A without a complete unexpired matching limitation blocks the record.

## Metric Scope and Shared Evidence (B-04)

Every catalog metric has an immutable `evidence_scope` and `required_by_gate` list. Each evidence record carries `evidence_metrics`; a metric result repeats those catalog values, records `applicable | not_applicable(reason)`, and references same-source evidence records. `not_applicable` has a reason and zero satisfied gates. It never converts a G6 hard obligation into a pass.

PR visual sidecars are scene-local only. The visual sets require pixel delta, DeltaE, DIP geometry, contrast, mask, and structural metrics that apply to that scene. `visual.metadata.evidence_refs` is an array, so a visual result may link several evidence records, but every reference must use the candidate's revision/archive identity. The runner accepts these through `--evidence-metrics` and `--visual-metadata` and the validator rejects a visual sidecar that carries a shared metric.

The following are independent shared evidence, not fields copied into every visual case: `MET-SOAK-8H-01`, `MET-SOAK-24H-01`, `MET-G6-COMPRESSED-DISTRIBUTION-SIZE-01`, `MET-INSTALL-ROLLBACK-01`, `MET-GPU-RESOURCE-01`, and `MET-LOW-SPEC-MATRIX-01`. Their scopes are `shared_nightly` or `shared_rc`; only metrics with `G0` in `required_by_gate` may appear in expanded G0 cells. Soak and RC distribution metrics remain explicit future boundaries and cannot make G0 pass or fail.

`VIS-CHART-01` is explicitly deferred: it maps only to canonical `P1-W4-01` at G4 and G6. It is not a G0 product requirement, not a substitute for a G0 visual cell, and has no evidence in this payload.

## Current result and handback

The source baseline is known, but no native workspace, `Cargo.lock`, CI identity, renderer artifact, low-spec physical run, screen-reader observation, visual capture, or future 8/24-hour soak evidence exists in this task. The initial ledger is therefore **BLOCKED**. The testkit self-tests verify the contract implementation only; they are not evidence for Tessera native gates.

Required next owners are: release/infra for a native workspace, locked toolchain, CI identity, and trusted artifact store; platform owners for the two low-spec machines and assistive-technology probes; `tessera-iced`/Gallery owners for renderer, capture, input, and visual scenarios. Each non-pass run must retain its immutable handback packet and permit one targeted retest linked to, never overwriting, the prior run.
