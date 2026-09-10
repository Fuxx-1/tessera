# Tessera Component Libraries

The Web release is an ESM React library with TypeScript declarations, component
styles, and theme tokens. Install the downloaded tarball with your package manager.
React 19 and React DOM 19 are peer dependencies.

```tsx
import { Button, Input, LineChart } from "@fuxx-1/tessera";
import "@fuxx-1/tessera/tokens.css";
import "@fuxx-1/tessera/components.css";
```

The native SDK release contains the Rust workspace, locked Makepad revision, core
contracts, widget library, and Gallery integration examples. Point your Cargo
dependency at the extracted `native/crates/tessera-makepad` directory, or use:

```toml
[dependencies]
tessera-makepad = { git = "https://github.com/Fuxx-1/tessera", tag = "v0.1.0" }
tessera-core = { git = "https://github.com/Fuxx-1/tessera", tag = "v0.1.0" }
```

Native hosts call `tessera_makepad::script_mod` during trusted UI registration.
The Makepad library has no application binary; `tessera-gallery` is the example
host. The SDK is source distribution, not a stable C ABI or a crates.io publication.

These are preview components. Native product acceptance remains blocked pending
the per-component visual, interaction, accessibility and performance evidence in
`native/docs/product-acceptance.md`. Build success is not GUI acceptance.
