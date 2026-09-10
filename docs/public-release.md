# Web Releases
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

`package.json` is the Web version authority; `bun.lock` owns Web dependencies.
Annotated tags use `web-vX.Y.Z`. The validator checks the exact tag/checkout
and package version, rejects Rust `v*` tags and refuses a tree containing
`native/`. It never reads a Cargo manifest.

`Web CI` runs on pushes and pull requests targeting `codex/web`, checks the
Gallery/library builds, dependency boundary, token generation, release
regressions and public identity. Bun downloads are cached by the lockfile.

`Web Release` runs on `web-v*` tags. For a manual run, select `codex/web`
as the workflow ref and supply an existing annotated Web tag. All jobs check out
the validated tag's exact commit. Assets are the installable Web component
library, static Gallery archive and `SHA256SUMS`. No Rust toolchain, native
application build, DMG or Native SDK is part of this workflow.

Check package exports, version and downloaded SHA256 values before considering
publication complete. This pipeline does not deploy a website or publish to npm.
Browser visual and interaction acceptance remains a separate requirement.
Use a new tag for any correction to an already published version.

The default [main branch](https://github.com/Fuxx-1/tessera) publishes Rust
applications and the Native SDK with independent `v*` tags.
