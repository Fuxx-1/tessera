# Tessera Makepad

Tessera Makepad is the native sibling of the Tessera Web component library. The production workspace
contains exactly three crates:

- `tessera-core`: renderer-independent state, workflow types, and invariants.
- `tessera-makepad`: semantic tokens, themes, security boundaries, and reusable Makepad components.
- `tessera-gallery`: the executable component workspace and integration host.

## Run

```sh
cd native
cargo run --locked -p tessera-gallery
```

The app starts at `1240x800` logical pixels and supports resizing down to `840x600`. It has no
permanent subscription, timer, polling loop, or synchronous file access in the update/view path.

The Components page renders the complete 101-entry Web registry inventory: Base 75, Business 11,
and Charts 15. The current Makepad manifest records all 101 entries as `blocked` until each has a
real native implementation, route, and sealed runtime evidence; the inventory preview is not
presented as native parity.

### Frozen Runtime

Gallery runs a compiled widget graph. It rejects Makepad `--hot`, a resolved Studio connection,
and stdin-loop mode before creating the application. Source changes require a rebuild and restart.
Normal theme switching reuses two rooted theme graphs and preserves runtime input/selection state;
the local `--remote` diagnostic input/capture interface is unchanged.

The pinned Makepad animator keeps an unrooted target object across LiveEdit. External DSL reload is
therefore unsupported, not fixed by retaining an unbounded history of old templates. Enabling it
requires an upstream ownership fix and repeated reload/animation/GC regression coverage.

## Verify

```sh
cd native
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked --offline
cargo build --release --locked --offline -p tessera-gallery
```

## Package macOS

```sh
native/scripts/package-macos.sh --binary "$HOME/Library/Caches/tessera/builds/<authority>/<revision>/<profile>/<key>/target/release/tessera-gallery" --source-revision "$(git rev-parse HEAD)" --binary-source-revision "<binary-source-revision>" --build-key "<key>" --session "<vws-session>/worktree" --build-command "CARGO_BUILD_JOBS=2 CARGO_TARGET_DIR=<managed-target> rustup run 1.88.0 cargo build --manifest-path native/Cargo.toml --locked --release -p tessera-gallery" --rust-toolchain 1.88.0 --signing-identity "Developer ID Application: Example, Inc. (TEAMID)" --dmg
```

The script requires a Developer ID Application identity for a distributable package and writes a
verified compressed `Tessera Makepad.dmg` below `~/Library/Application Support/Tessera/build-results/`.
The binary must come from a sealed managed release target; source-tree `native/target` paths are
rejected. Each package also writes `build-result.json`, binding the source-tree
digest and dirty state, lockfile, Rust toolchain, managed target/build command,
VWS session, package manifest, and input/bundle/DMG hashes. Notarization and
staple verification remain separate release gates.

For a local-only test package, pass `--allow-adhoc`. It is intentionally marked
`distribution_ready: false`; macOS Gatekeeper will reject it when launched from a quarantined
download until the user explicitly approves it or removes quarantine after review.

## Visual QA modes

The release binary accepts startup-only flags for deterministic window review:

```sh
"$HOME/Library/Caches/tessera/builds/<authority>/<revision>/<profile>/<key>/target/release/tessera-gallery" --compact-qa
"$HOME/Library/Caches/tessera/builds/<authority>/<revision>/<profile>/<key>/target/release/tessera-gallery" --compact-qa --dark
```

`--compact-qa` starts at the declared minimum `840x600` size. These flags do not add a timer,
subscription, or runtime file access.

## Interaction contract

- Every editable value is controlled by application state.
- Navigation, selection, completion, filtering, theme, density, and demo controls are interactive.
- Light and dark themes share the same semantic token structure.
- The renderer is Makepad with the macOS Metal backend in the release package.
- The static window stays event-driven. Background work must enter through bounded `Task` values.
