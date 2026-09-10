# Tessera
Tessera is a Rust component system built directly on Makepad, with a native
Gallery, 75 base components, 11 business components and 15 charts.
The default `main` branch contains the Makepad application and Native SDK.
The independent React implementation lives on
[codex/web](https://github.com/Fuxx-1/tessera/tree/codex/web).

## Download
Download macOS Apple Silicon/Intel DMGs, Windows/Linux x64 applications and the
Native SDK from [GitHub Releases](https://github.com/Fuxx-1/tessera/releases).
Rust releases use `v*` tags. Web releases use `web-v*` tags.
Historical `v0.1.0` and `v0.1.1` previews contain both implementations.

Releases remain previews. [Component acceptance](native/docs/product-acceptance.md)
remains blocked where visual, interaction, accessibility and performance evidence
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

The workspace stays under `native/` to preserve Cargo paths:

- `tessera-core`: shared state models and component identities.
- `tessera-makepad`: reusable Makepad widgets, themes and foundation.
- `tessera-gallery`: application entry and component integration examples.

Rust source includes its focused unit and integration tests. Embedded font and
icon assets, their licenses, macOS bundle metadata and current Makepad usage
documents are included. `scripts/` contains the release validator, packager,
privacy scanner, their regression tests and Linux build setup.
`native/scripts/` contains only the pinned font resource generator.
Python 3.11+ and Node support these development and release tools; they are
not required to run the packaged application.

See [Native SDK use](docs/component-library.md),
[native development](native/README.md) and [release procedure](docs/public-release.md).
Historical design, migration, diagnostic and evidence tooling remains available
in [Git history](https://github.com/Fuxx-1/tessera/tree/b34327a63b61291e9c12175c30f62dd33f977e5e);
it is not part of the current application or SDK.

Tessera is MIT licensed. Bundled fonts and upstream dependencies retain their
own licenses and notices.
