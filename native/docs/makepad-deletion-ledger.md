# Makepad Hard-Cut Deletion Ledger

Date: 2026-08-26

## Scope

This ledger tracks the production cut from Iced to Makepad for the native workspace. It distinguishes removal from the production dependency graph from physical deletion of historical files.

## Production Graph Deletions

| item | action in this pass | evidence required |
| --- | --- | --- |
| `native/Cargo.toml` workspace membership for `crates/tessera-iced` | remove from production workspace | `cargo metadata --locked` workspace members contain only `tessera-core`, `tessera-makepad`, `tessera-gallery` |
| `native/Cargo.toml` `iced` workspace dependency | remove from production graph | `cargo tree --locked` has no `iced` packages |
| `native/Cargo.toml` `tessera-iced` workspace dependency | remove from production graph | no package depends on `tessera-iced` |
| `native/crates/tessera-gallery` Iced binary entry | replace with Makepad gallery `app_main!` host | source and metadata show `tessera-gallery` depends on `tessera-makepad`, not `tessera-iced` |
| `native/crates/tessera-makepad` crate-local `[workspace]` | remove | crate is a normal member of root `native/Cargo.toml` |
| `native/crates/tessera-makepad/Cargo.lock` | delete after integration | only root `native/Cargo.lock` remains authoritative for production |
| `native/crates/tessera-makepad/src/main.rs` | delete after moving the app host to gallery | only `tessera-gallery` owns `app_main!` |

## Physical File Deletions Deferred

| item | current disposition | reason |
| --- | --- | --- |
| `native/crates/tessera-iced/**` | deferred | deletion requires complete dependency graph, source denylist, lockfile, package artifact, SBOM, and release evidence gates |
| Iced historical spikes and docs | deferred | historical refs remain valid rollback/audit inputs and are outside this integration write set |
| Iced-only scripts/package paths | deferred | production graph removal is in scope; full release packaging cleanup needs the M5 artifact gate |

## Security And Evidence Status

The Makepad dependency closure includes the precise upstream chain `makepad-network 1.0.0 -> makepad-script 1.0.0 -> makepad-html 1.0.0`, plus `makepad-script-std 1.0.0`, `makepad-svg 1.0.0`, and `makepad-live-reload-core 1.0.0` through pinned `makepad-widgets`/`makepad-platform` implementation paths. This pass may allow them only as pinned upstream implementation dependencies; no product feature may expose HTML, Script, JavaScript, WebView, DOM, arbitrary network, file, process, shader, or runtime Live input. Mechanical hard-cut checks pass, but M1 runtime security remains `NO-GO` until an explicit package/version/feature allowlist, reviewed call graph, and trusted runtime negative probes prove the boundary.

GUI, AX, IME, DPI, mobile, and performance gates remain blocked unless sealed evidence is produced under the versioned evidence contract. Static checks, source review, and successful Cargo commands are mechanical evidence only.

Gallery source deletions in this pass:

- native/crates/tessera-gallery/src/component_detail/**
- native/crates/tessera-gallery/src/examples/**
- native/crates/tessera-gallery/src/integration_tests.rs
- native/crates/tessera-gallery/src/pending.rs
- the former Iced native/crates/tessera-gallery/src/main.rs entry
- native/crates/tessera-gallery/src/bin/tessera_makepad_gallery.rs pending-only text entry

The historical implementation is retained and independently readable from the feat-iced history, including the former Gallery component_detail, examples/dispatch.rs, and tessera-iced/src/lib.rs paths. The replacement is the single Makepad host at native/crates/tessera-gallery/src/main.rs with its App implementation in src/app.rs. The historical native/crates/tessera-iced tree remains deferred on disk and is not a production workspace member or dependency.

The Makepad shell palette is currently fixed in the reusable widget definition. Light/Dark visual rendering is consequently BLOCKED and is not a completed acceptance claim.
