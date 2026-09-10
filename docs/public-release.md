# Public release procedure

The public repository starts from a reviewed source snapshot. Private VWS
history, Git notes and retained recovery sessions are not uploaded or rewritten.
The publication object store is a bare Git repository with no additional
editable checkout. All source edits remain in the authorized VWS session.

The initial public commit has no parent. Subsequent public commits descend only
from the public branch. Commit author, committer and annotated tagger are
`Fuxx-1 <583742849@qq.com>`, as explicitly selected by the maintainer.
Private machine paths and all other local identities are excluded. Historical
documents with redacted machine paths are marked as such and are not runtime
evidence for the public source revision.

Run Web build/library checks, Rust formatting/tests and the public scanner before
export. `scripts/export-public-snapshot.mjs` writes a selected, scanned tree to a
separate bare object store without staging or committing the private worktree.
It excludes abandoned Iced source, historical spikes and local planning/output.
It never pushes refs. Its optional private-identifier deny list is supplied
locally via `TESSERA_PRIVATE_IDENTIFIERS`, never committed to source.

Review the exported commit and run the scanner with `--history`. Push only
`main`, then create and push an annotated version tag whose version matches
both `package.json` and `native/Cargo.toml`. Never push private refs, notes,
`--all` or `--mirror`.

Release jobs check out the validated tag's exact commit. They build macOS arm64
and x64 DMGs, Linux x64 and Windows x64 archives, an installable Web tarball, and
the native SDK source archive. Cargo target caches are outside the checkout and
keyed by platform, toolchain and lockfile; Bun dependency downloads are cached.
CI uses disposable GitHub-hosted checkouts, not local VWS session storage.

Makepad is pinned to `8b5caf41e1de9b93d396bedc379e16f601509503`, the immediate
successor of the previous pin. Its only changes correct the CoreMedia Boolean
binding and sample-attachments call for Intel macOS. Historical M0 security
records retain their original revision; they are not evidence for this update.
Windows ZIP creation clamps out-of-range file timestamps to ZIP's supported
1980-2107 range without changing source files or license contents. Packaging
regressions run on every native release platform.

The archive scanner checks unpacked application bytes and notices before
packaging. Platform manifests contain source revision, Cargo lockfile digest,
packaged binary digest, compiler version and signing status. They contain no
local session path, original author identity or raw build log. SHA256SUMS uses
asset basenames so it can be verified after download.

This preview pipeline does not upgrade native component acceptance. It does not
install a resident helper or updater, upload local GUI evidence, publish to npm
or crates.io, or claim signing/notarization that has not happened.

After publication, confirm all platform jobs succeeded, every expected asset
exists and checksums match downloaded assets. On a packaging failure the publish
job remains blocked. Fix source in a new public commit and use a new tag after
a release has been published; never silently replace a released binary. To stop
distribution of a faulty preview, mark the release withdrawn with a clear
reason and publish a corrected version. Previously downloaded portable packages
can be removed without migrating user data.
