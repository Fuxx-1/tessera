# Tessera Native SDK
The Native SDK contains the Rust workspace, pinned Makepad dependency, core
models, widgets, resources and Gallery integration examples.
It is distributed as `tessera-native-sdk.tar.gz` in Rust `v*` releases.

Use a released tag or point Cargo to the extracted
`native/crates/tessera-makepad` directory:

```toml
[dependencies]
tessera-makepad = { git = "https://github.com/Fuxx-1/tessera", tag = "v0.1.1" }
tessera-core = { git = "https://github.com/Fuxx-1/tessera", tag = "v0.1.1" }
```

Hosts call `tessera_makepad::script_mod` during trusted UI registration.
`tessera-makepad` has no application binary; `tessera-gallery` is the example
host. This SDK is source distribution, not a stable C ABI or crates.io publication.

Native acceptance remains blocked where per-component visual, interaction,
accessibility and performance evidence is missing. See
[native acceptance](../native/docs/product-acceptance.md).

The React library is maintained and released independently from
[codex/web](https://github.com/Fuxx-1/tessera/tree/codex/web).
