# Tessera Web
Tessera Web is an independent React component library and browser Gallery,
covering base components, business components and charts. This `codex/web`
branch contains Web source, tests and releases.
The default [main branch](https://github.com/Fuxx-1/tessera) contains Rust/Makepad.

## Develop
Use Bun 1.2.21 or newer:

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run build:library
bun run scan:deps
```

No Rust toolchain or Native SDK is needed. Local development sessions use
git-vws. Browser acceptance runs with `bun run acceptance` and requires
Chrome/Chromium; see `CHROME_PATH`, `ACCEPTANCE_PORT` and `ACCEPTANCE_URL`
in the acceptance script. Build checks do not establish browser acceptance.

Design tokens come from `design/tokens.toml`. With Python 3.11+:

```sh
python3 scripts/generate-tokens.py --check
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_generate_tokens.py
```

The generator only writes Web CSS and TypeScript. The design documents are
branch-local; shared changes are ported explicitly.

## Download And Release
[GitHub Releases](https://github.com/Fuxx-1/tessera/releases) with `web-v*` tags
contain an installable React library tarball and a static browser Gallery.
The library includes ESM, TypeScript declarations, CSS and tokens. See
[library installation](docs/component-library.md) and [release procedure](docs/public-release.md).

Rust `v*` releases are separate. Historical `v0.1.0` and `v0.1.1` previews
contain both implementations and remain available. Web releases do not build
or claim acceptance for the Rust application.

Tessera is MIT licensed. Upstream dependencies retain their own licenses.
