# Tessera Makepad
The native workspace contains three crates:

- `tessera-core`: renderer-independent state, workflow types and component identities.
- `tessera-makepad`: reusable Makepad widgets, themes and foundation.
- `tessera-gallery`: executable Gallery and integration host.

## Build And Test
Use Rust 1.88.0 and an external Cargo target cache. Commands below run from the
repository root. Ubuntu prerequisites are listed in the
[Linux setup script](https://github.com/Fuxx-1/tessera/blob/main/scripts/install-linux-deps.sh).

```sh
export CARGO_TARGET_DIR="$HOME/.cache/tessera/target"
cargo +1.88.0 fmt --manifest-path native/Cargo.toml --all -- --check
cargo +1.88.0 test --manifest-path native/Cargo.toml --locked --workspace
cargo +1.88.0 build --manifest-path native/Cargo.toml --locked --release -p tessera-gallery
```

The focused tests live alongside the Rust implementation. Historical standalone
testkit, migration ledgers and one-off diagnostic tools are retained in Git
history, outside the current source and SDK.

## Run
```sh
"$CARGO_TARGET_DIR/release/tessera-gallery"
"$CARGO_TARGET_DIR/release/tessera-gallery" --component button
"$CARGO_TARGET_DIR/release/tessera-gallery" --compact-qa --dark
```

The Gallery starts at the catalog. Each component has its own detail route and
fixture. The normal window is `1240x800`; `--compact-qa` selects `840x600`.
The [font resource](docs/makepad-fonts.md) and sidebar icon are embedded in the
binary. Launching the package requires no source checkout or resource download.

Gallery runs a compiled widget graph. It rejects Makepad `--hot`, Studio
connections and stdin-loop mode before creating the application. Source changes
require a rebuild. Theme switching reuses the Light/Dark graphs.

## Release And Acceptance
The [release workflow](https://github.com/Fuxx-1/tessera/blob/main/.github/workflows/release.yml) builds macOS ARM64/Intel,
Linux x64 and Windows x64 packages plus the Native SDK from an annotated `v*`
tag. [Release instructions](https://github.com/Fuxx-1/tessera/blob/main/docs/public-release.md) cover versions, hashes,
caches and signing. CI previews use ad-hoc macOS signatures without notarization;
Windows binaries are unsigned.

[Product acceptance](docs/product-acceptance.md) remains blocked where sealed
component evidence is missing. Removing historical tooling does not change that
decision. Visual inspection, physical keyboard interaction, IME, accessibility
and platform performance must be assessed against the actual release binary.
