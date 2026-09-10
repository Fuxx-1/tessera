Tessera's first public preview includes the native Makepad Gallery and reusable Web and native component libraries.

- macOS 14+ Apple Silicon and Intel: DMG with the application and bundled font notices.
- Linux x64 (Ubuntu 22.04 or newer): application tarball. Requires a graphical session and system X11/Wayland, EGL/OpenGL and audio libraries.
- Windows x64: application ZIP.
- Web: install the `fuxx-1-tessera-*.tgz` package with npm, Bun or pnpm. Includes ESM, TypeScript declarations, component CSS and theme tokens.
- Native: `tessera-native-sdk.tar.gz` includes the Rust workspace, locked Makepad dependency, resources and acceptance contracts.
- `SHA256SUMS` covers all assets; platform manifests record the source revision, lockfile hash and binary hash.

This is a preview, not a claim that all 101 components have passed visual, interaction, accessibility or performance acceptance. The native acceptance manifest remains blocked where sealed runtime evidence is missing. CI builds and Rust tests do not replace GUI verification.

macOS bundles are ad-hoc signed, not Developer ID signed or notarized; Windows binaries are not Authenticode signed. The operating system may require explicit approval to open them. No automatic updater is installed.

