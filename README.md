# Tessera
Tessera is a Rust component system built directly on Makepad, with a native
Gallery, 75 base components, 11 business components and 15 charts.
The default `main` branch contains the Rust implementation. The independent
React implementation lives on [codex/web](https://github.com/Fuxx-1/tessera/tree/codex/web).

## Download
Download macOS Apple Silicon/Intel DMGs, Windows/Linux x64 applications and the
Native SDK from [GitHub Releases](https://github.com/Fuxx-1/tessera/releases).
Rust releases use `v*` tags. Web releases use `web-v*` tags.
The historical `v0.1.0` and `v0.1.1` previews contain both implementations.

Releases remain previews. [Component acceptance](native/docs/product-acceptance.md)
and the [manifest](native/testkit/makepad-component-manifest-v1.json) remain
blocked where sealed visual, interaction, accessibility and performance evidence
is missing. Builds and unit tests do not establish GUI acceptance.

## Develop
Use Rust 1.88.0. Ubuntu build prerequisites are installed with
`bash scripts/install-linux-deps.sh`. Use git-vws for local development
sessions and keep build output in an external cache.

```sh
export CARGO_TARGET_DIR="$HOME/.cache/tessera/target"
cargo +1.88.0 test --manifest-path native/Cargo.toml --locked --workspace
cargo +1.88.0 run --manifest-path native/Cargo.toml --locked --release -p tessera-gallery
```

The three-crate workspace stays under `native/` so existing Cargo paths remain
valid: `tessera-core` owns shared models, `tessera-makepad` exports widgets,
and `tessera-gallery` is the application entry. Rust builds do not require
React, Bun, Vite or a Web checkout. Python 3.11+ and Node are used for release
validation and privacy scanning, not for application rendering.

See [Native SDK use](docs/component-library.md), [native development](native/README.md)
and [release procedure](docs/public-release.md). Design documents under `design/`
are a branch-local reference; changes are ported explicitly between branches.

Tessera is MIT licensed. Bundled fonts and upstream dependencies retain their
own licenses and notices.
