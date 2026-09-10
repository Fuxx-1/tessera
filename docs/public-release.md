# Rust Releases
The public history descends from the reviewed public snapshot. Private VWS
sessions, local identities, notes and build logs are not exported. Commit authors,
committers and annotated taggers use `Fuxx-1 <583742849@qq.com>`.
Run the public scanner before pushing. Push explicit branch or tag refs only;
never push private refs with `--all` or `--mirror`.

The default `main` branch owns Rust/Makepad. `codex/web` owns React/Vite.
Both descend from `80efe4e8578a4f6373bc402b76b140c595934132` (`v0.1.1`),
which remains the final combined release baseline. Their current trees,
versions, lockfiles, CI and release jobs are independent. Do not merge entire
implementation branches into one another; port selected shared changes explicitly.
Existing tags and published assets are immutable.

Local edits use git-vws, with build caches outside source. Retained recovery
sessions stay untouched. The publication bare object store has no editable
checkout. It can accept reviewed branch-specific source snapshots without
staging the private session's unrelated changes.

`native/Cargo.toml` is the Rust version authority. Keep each workspace crate
and `native/Cargo.lock` aligned. An annotated `vX.Y.Z` tag must match the
workspace version and exact checkout. The validator rejects Web tags and a
mixed Web/Rust tree; `package.json` is not an input.

`Rust CI` runs on pushes and pull requests targeting `main`. It validates
public identity, release regressions, Rust formatting and workspace tests.
`Rust Release` runs from an annotated `v*` tag, or via workflow dispatch on
`main` with that existing tag. It builds macOS ARM64/Intel, Linux x64 and
Windows x64 applications and packages the Native SDK. No Web build is involved.

Cargo targets are external and cached by platform, Rust 1.88.0 and lockfile.
Makepad remains pinned to `8b5caf41e1de9b93d396bedc379e16f601509503`.
ZIP timestamps are clamped to the format's supported range. Platform manifests
hash the committed `native/Cargo.lock` blob, independent of checkout line
endings, and record source revision, compiler, binary digest and signing status.
The lockfile is pinned to LF through `.gitattributes`.

All packaging jobs must pass before the Preview is published. Check downloaded
assets against `SHA256SUMS` and their manifests. macOS is ad-hoc signed without
notarization; Windows is unsigned. CI does not upgrade component acceptance or
runtime security claims, install an updater or publish to crates.io.
After a published release fails verification, fix in a new commit and release a
new tag; never silently replace its binaries.

Web uses `web-v*` tags on
[codex/web](https://github.com/Fuxx-1/tessera/tree/codex/web) and has no effect
on Rust versioning or releases.
