# Tessera Makepad foundation

Reusable Makepad widget, foundation, and security library for the Tessera
native workspace. The crate is a normal member of `native/Cargo.toml` and does
not own an application entry point.

Exported areas:

- `foundation`: theme tokens, geometry and scale math, input/focus state, and
  the typed overlay host boundary.
- `components`: the component catalog, concrete native widget surfaces and
  shell used by the Gallery.
- `security`: bounded text refusal helpers for unsafe Markdown-like input.
- `makepad_widgets`: the pinned upstream API re-export used by the Gallery
  application host.

The sole production application host is
`native/crates/tessera-gallery/src/main.rs`, which owns the `app_main!(App)`
entry and the `App` implementation. This crate intentionally has no nested
workspace, crate-local lockfile, binary target, or `app_main!` invocation.

Run Cargo with an out-of-tree target directory, for example:

```sh
CARGO_TARGET_DIR="$HOME/Library/Caches/tessera/builds/<authority>/<revision>/<profile>/<key>/target" \
  CARGO_BUILD_JOBS=2 cargo test --manifest-path native/Cargo.toml -p tessera-makepad --locked
```
