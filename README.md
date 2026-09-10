# Tessera

Tessera is a component system with a native Makepad Gallery and a React library.
It includes 75 base components, 11 business components and 15 charts.

The native application uses Makepad directly. It does not embed a browser or
depend on Iced. The Web library is a separate React implementation; its behavior
and acceptance results do not establish native parity.

## Download

Download platform applications and component libraries from
[GitHub Releases](https://github.com/Fuxx-1/tessera/releases).
macOS builds are DMGs for Apple Silicon and Intel; Linux and Windows builds are
portable archives. Each release includes SHA-256 checksums and platform manifests.

Current releases are previews. The native
[acceptance contract](native/docs/product-acceptance.md) and
[component manifest](native/testkit/makepad-component-manifest-v1.json) retain
blocked results until the required visual, interaction, accessibility and
performance evidence is available. Catalog registration, builds and unit tests
are not GUI acceptance.

## Component Libraries

The release includes a Web npm tarball with ESM, TypeScript declarations,
component CSS and theme tokens, and a native SDK source archive with the locked
Rust workspace. See [library installation and use](docs/component-library.md).

The libraries are distributed through GitHub Releases; this repository does not
automatically publish to npm or crates.io.

## Development

Web requires Bun 1.2.21 or newer:

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run build:library
bun run scan:deps
```

Native requires Rust 1.88.0 and platform graphics development libraries. On
Ubuntu, `bash scripts/install-linux-deps.sh` installs the build prerequisites.
Use an external build cache; local development sessions are managed with
git-vws rather than ordinary Git worktrees.

```sh
export CARGO_TARGET_DIR="$HOME/.cache/tessera/target"
cargo +1.88.0 test --manifest-path native/Cargo.toml --locked --workspace
cargo +1.88.0 run --manifest-path native/Cargo.toml --locked --release -p tessera-gallery
```

The application entry is `native/crates/tessera-gallery/src/main.rs`. Reusable
widgets are in `native/crates/tessera-makepad`; framework-independent state and
catalog types are in `native/crates/tessera-core`.

The Web gallery runs through Vite; browser acceptance uses
`bun run acceptance` and requires Chrome/Chromium. See the script's
`CHROME_PATH`, `ACCEPTANCE_PORT` and `ACCEPTANCE_URL` options.

## Releases

CI checks the Web build, library declarations, dependency boundary, public
identity rules, Rust formatting and native tests. An annotated `v*` tag triggers
multi-platform builds and publishes a preview only after all packaging jobs pass.
See [the release procedure](docs/public-release.md).

Tessera code is MIT licensed. Bundled fonts and upstream dependencies retain
their own licenses; application packages include their notices.
