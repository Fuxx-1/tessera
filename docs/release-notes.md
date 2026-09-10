This Rust preview contains the Tessera Makepad Gallery and Native SDK.

- macOS 14+ Apple Silicon and Intel: application DMGs with dependency and font notices.
- Linux x64 (Ubuntu 22.04 or newer): application tarball, requiring a graphical session and system graphics/audio libraries.
- Windows x64: application ZIP.
- `tessera-native-sdk.tar.gz`: Rust workspace, locked Makepad dependency, resources and acceptance contracts.
- `SHA256SUMS` and platform manifests: source revision, lockfile and binary hashes.

Rust is maintained on `main`. The independent React library and browser
Gallery are on `codex/web`, released under `web-v*` tags.

This is a preview. All 101 components are not asserted to have passed visual,
interaction, accessibility, performance or runtime security acceptance. Missing
sealed native evidence remains blocked; CI does not replace GUI verification.

macOS bundles are ad-hoc signed, not Developer ID signed or notarized. Windows
binaries are unsigned. No automatic updater is installed.
