> Public snapshot: local machine paths were redacted. Historical records are not acceptance evidence for this public revision.

# G0 Environment and Source Baseline

## Scope and Provenance

This is the G0 reproducibility baseline for the planned Tessera Iced expansion. It records the existing Web source only; it does not create a Rust workspace, migrate a component, or claim a native performance or platform result.

The audited source is `$HOME/Data/User/Project/tessera`, inspected read-only on 2026-08-17. At audit time it was not a Git work tree (`git -C <source> rev-parse --is-inside-work-tree` exited 128). The bootstrap payload must be copied into the intended project root before running the bootstrap script; this task does not modify the source directory.

Traceability inputs retained in the baseline:

- `src/`, `public/`, `design/`, and `scripts/`.
- Root build and source configuration: `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, and `index.html`.
- Product and design context: `README.md`, `load.md`, `design.md`, `iced-plan.md`, and the complete `design/` hierarchy.
- This root `.gitignore`, `native/docs/environment.md`, and `native/scripts/bootstrap-baseline.sh`.

`iced-plan.md` is the Iced planning source and its audited SHA-256 was `df159af9bf67df08e923e8ffdaaa3bb61a83dba5d2901d4496b34bd351424bee`. `bun.lock` is retained as the Web dependency lock and its audited SHA-256 was `e9dbda78bb6a70a64305a018d162c81d176db9fb7fbbac898bc27447d1c5de0c`.

## Exclusion Policy

The baseline deliberately excludes only rebuildable, local, or evidentiary material. The supplied root `.gitignore` excludes:

- Dependency and build output: `node_modules/`, `dist/`, Vite/cache/test output, TypeScript build info, native `target/`, profile data, and benchmark results.
- Existing temporary/evidence roots: `tmp/`, `tmp-*`, `.tmp-*`, `.tessera-evidence/`, `evidence/`, `artifacts/`, and `screenshots/`.
- Local environment values and system metadata: `.env*`, `.DS_Store`, AppleDouble files, `Thumbs.db`, and `Desktop.ini`.
- The audited zero-byte malformed temporary filename `}))`.

No source item is deleted or rewritten. Current scripts may reference temporary acceptance harnesses under `tmp/` or `tmp-repro/`; those are intentionally excluded as regeneration/evidence material. A later owner must recreate any such harness before relying on its corresponding optional smoke command.

The planner's root inventory was approximately 435 MB: `node_modules` about 231 MB, `tmp` about 163 MB, `dist` about 5.9 MB, and `.tessera-evidence` about 26 MB, with `.tmp-render-audit`, `tmp-empty-harness`, `tmp-icon-button-evidence`, `tmp-repro`, `tsconfig.tsbuildinfo`, `.DS_Store`, and `}))` also present. These facts justify the exclusion policy; they are not a claim about the size of a future native deliverable.

## Toolchain and Machine Facts

Observed on the audit machine:

| Item | Fact |
| --- | --- |
| OS | macOS 26.5.1 (build 25F80), arm64 |
| Hardware | MacBook Pro `Mac16,8`, Apple M4 Pro, 14 CPU cores, 48 GB memory |
| Source volume | `/dev/disk3s5`, 995 GB total, 826 GB used, 130 GB available (87% used) |
| Git | 2.48.1 |
| Rust compiler | `rustc 1.93.1 (01f6ddf75 2026-02-11)` |
| Cargo | `cargo 1.93.1 (083ac5135 2025-12-15)` |
| Planned Iced baseline | `iced 0.14.0`; MSRV Rust 1.88, per `iced-plan.md` |

The M4 Pro/48 GB machine and its free-space snapshot are observations only. They must not be extrapolated into low-configuration release gates. Per the plan, the G0 low-end evidence still has to come from the specified MacBook Air M1/8 GiB/SSD and Windows i5-8250U/8 GiB/UHD 620/NVMe baselines. Rust 1.93.1 is an available development candidate, while Rust 1.88 remains the package MSRV until G0 records a deliberate toolchain decision.

## Bootstrap Contract

Run from an explicit absolute target only:

```bash
native/scripts/bootstrap-baseline.sh --target /absolute/path/to/tessera
```

The script validates the expected Tessera root markers and `.gitignore` before changing anything. If no Git metadata exists and the target is not nested in another repository, it initializes `main`, stages only nonignored files, and creates one `chore: establish G0 source baseline` revision. It prints `revision`, `source_manifest_sha256`, and the tracked file count.

If Git already exists at the target root, the script performs validation only: it does not initialize, stage, commit, reset, checkout, delete, or overwrite source files. It requires a committed, clean repository and reports the existing revision and manifest hash. A wrong, relative, missing, incomplete, nested, or dirty target fails before a baseline can be declared valid.

The manifest hash is SHA-256 over Git's NUL-delimited tracked-file manifest (`git ls-files -s -z`), making it tied to tracked paths, modes, and blobs. The revision remains the authoritative content identity; retain both values in G0 evidence.
