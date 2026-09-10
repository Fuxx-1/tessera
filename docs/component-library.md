# Tessera Web Library
Download `fuxx-1-tessera-*.tgz` from a `web-v*`
[GitHub Release](https://github.com/Fuxx-1/tessera/releases), then install it:

```sh
npm install ./fuxx-1-tessera-0.1.1.tgz react@19 react-dom@19
```

The existing combined `v0.1.1` preview also contains this package. The Web
version remains 0.1.1 at the branch split; subsequent releases version independently.

```tsx
import { Button, Input, LineChart } from "@fuxx-1/tessera";
import "@fuxx-1/tessera/tokens.css";
import "@fuxx-1/tessera/components.css";
```

The package provides ESM, TypeScript declarations, styles and tokens.
React 19 and React DOM 19 are peer dependencies. The separate
`tessera-web-gallery.tar.gz` contains a static Gallery to serve with an HTTP server.

This pipeline publishes GitHub assets, not npm packages. Web build success does
not establish visual or interaction acceptance.
The Rust SDK is maintained on [main](https://github.com/Fuxx-1/tessera).
