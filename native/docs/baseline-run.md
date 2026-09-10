# G0 Baseline Run Record: Repository Replay Contract

## Scope and Historical Boundary

This record covers the repository-facing G0 reproducibility additions:

- `native/docs/baseline-run.md` (this record)
- `native/scripts/verify-baseline-v2.sh` (mode `100755`)
- one append-only `.gitignore` block applied by the integration owner

It is not a native implementation and does not claim an iced workspace, native performance, renderer, platform, IME, DPI, AccessKit, accessibility, low-configuration, or cross-platform result.

The frozen source baseline remains exactly:

- `source_baseline_revision: b9c797d8dcd8ed044bd6a4f5bc479bfe52296810`
- `source_baseline_manifest_sha256: b4dfd2064e8d30cd24f72f1347ece2ef525c5f0673796035cb4415f1ae866c0a`
- `source_tracked_file_count: 487`

At preparation time, `TESSERA_SOURCE_ROOT` identified the Tessera source repository root at that revision with no staged, unstaged, or nonignored untracked files. The existing historical records are source-owned and retained unchanged:

- `native/docs/environment.md`, SHA-256 `bcf1373335d94258c7471f912d0cdacbf0f828416d7723d00cebd61d23db7a18`
- `native/scripts/bootstrap-baseline.sh`, SHA-256 `2c9b6afb285939430a79a816e52c6eca2ed4e1f435c7ec5e432bf5a3af0a47cf`

`native/docs/environment.md` is immutable historical provenance. Its recorded inspection boundary is not a current user replay path, configuration value, or source path to sanitize or replace. Any differing bytes at that path remain out of scope for this record and require owner adjudication.

## Repository Addition Contract

The two repository additions above were absent from the frozen source baseline. During mechanical integration, any byte or mode conflict at either path is a stop condition; do not overwrite or merge it.

`native/scripts/verify-baseline-v2.sh` is a supplemental, non-conflicting v2 verifier. It never replaces or mutates `native/scripts/bootstrap-baseline.sh`; the historical v1 verifier remains a retained sentinel. The v2 verifier requires both historical files as retained sentinels and computes a content-addressed, NUL-framed v2 manifest from tracked paths, modes, blob lengths, and SHA-256 blob content. Git object IDs are read only as transient blob handles, so equivalent SHA-1 and SHA-256 repositories produce the same v2 digest.

The verifier SHA-256 is `d5e97e42213a7d455a7f1760540e365eedfcac336a4574dddc7fdf090762d6fc`.

The verifier resolves its isolated precheck root in this cross-platform order:

1. `TESSERA_TMPDIR` when explicitly set for the test.
2. `TMPDIR` when supplied by the host.
3. `TEMP` when supplied by the host shell.
4. The system temporary directory fallback used by the script.

The selected temporary root must exist and be outside `TESSERA_SOURCE_ROOT`. A retained-source replay fixture may be used for verification evidence, but it is not the source baseline or a future integration revision.

## Append-Only `.gitignore` Contract

`.gitignore` is a merge target, not a copied file. The external integration manifest carries one `G` record for `.gitignore` with:

- target base SHA-256 `b6432c9a2ba65720552830b5a4e2b6f973c75b2f5c372fcbbe2e3080e8a34828`
- append block SHA-256 `ff06910b4ffb814e489392525bbbac570cb96865285198ca64f9e2265acec03b`
- expected one-append result SHA-256 `a072510aeeb618fa39157e4f7044d7219d01135f987f3228c57e84e5f559c9ee`

The append block adds exclusions for root `cache/`, root `.app/`, Python bytecode, and font binaries. Apply that block once only when the target base digest matches the manifest record. Existing `.gitignore` lines and comments must remain byte-for-byte unchanged. The historical malformed-filename rule remains source-owned; this record neither deletes nor normalizes it.

## Replay Command

Run from the final repository root after the mechanical integration commit has been created and the worktree is clean:

```bash
TESSERA_SOURCE_ROOT="$(pwd -P)"
: "${TESSERA_G0_WORK_ROOT:?set TESSERA_G0_WORK_ROOT to an absolute directory outside the repository}"
mkdir -p "$TESSERA_G0_WORK_ROOT/tmp"
TESSERA_TMPDIR="$TESSERA_G0_WORK_ROOT/tmp" \
  "$TESSERA_SOURCE_ROOT/native/scripts/verify-baseline-v2.sh" --target "$TESSERA_SOURCE_ROOT"
```

For an existing clean Git target, the verifier validates without staging, committing, resetting, checking out, deleting, or overwriting source files. For a retained-source fixture without Git metadata, it validates all markers and ignore probes in isolated Git metadata before it initializes the fixture's own `main` baseline. The test-only forced post-init fault path removes only verifier-owned target Git metadata that carries its private marker.

## Evidence Boundary

Out-of-tree integration and replay reports may record command outputs, file counts, byte counts, source-tree hashes, and temporary evidence roots. Those reports are audit artifacts and are not tracked source. This record preserves the historical v1 revision, v1 manifest, and 487-file count. A later integration commit must be recorded only in an out-of-tree integration log, not backfilled into tracked evidence.
