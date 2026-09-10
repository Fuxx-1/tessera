import { cpSync, readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync("package.json", "utf8"));
const styles = readFileSync("src/styles.css", "utf8");
const tokenEnd = styles.indexOf("/* @generated end: tessera design tokens */");
if (tokenEnd < 0) throw new Error("Missing generated token boundary");
writeFileSync("dist-library/tokens.css", styles.slice(0, tokenEnd));
const manifest = {
  name: "@fuxx-1/tessera",
  version: source.version,
  type: "module",
  license: "MIT",
  repository: "github:Fuxx-1/tessera",
  exports: {
    ".": { types: "./types/library.d.ts", import: "./index.js" },
    "./components.css": "./components.css",
    "./tokens.css": "./tokens.css",
  },
  sideEffects: ["**/*.css"],
  peerDependencies: { react: "^19.1.0", "react-dom": "^19.1.0" },
  dependencies: Object.fromEntries(["dompurify", "markdown-it", "mermaid"].map(name => [name, source.dependencies[name]])),
};
writeFileSync("dist-library/package.json", JSON.stringify(manifest, null, 2) + "\n");
cpSync("LICENSE", "dist-library/LICENSE");
cpSync("docs/component-library.md", "dist-library/README.md");
