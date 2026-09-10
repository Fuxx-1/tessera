import { execFileSync } from "node:child_process";
import { readFileSync, appendFileSync } from "node:fs";
const tag = process.env.RELEASE_TAG ?? "";
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) throw new Error("Invalid version tag");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("cat-file", "-t", "refs/tags/" + tag) !== "tag") throw new Error("Annotated tag required");
const revision = git("rev-parse", "refs/tags/" + tag + "^{commit}");
if (revision !== git("rev-parse", "HEAD")) throw new Error("Tag/checkout mismatch");
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const native = readFileSync("native/Cargo.toml", "utf8").match(/^version = "([^"]+)"/m)?.[1];
if (tag !== "v" + version || native !== version) throw new Error("Tag/package/native version mismatch");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "tag=" + tag + "\nrevision=" + revision + "\n");
console.log("Validated " + tag + " at " + revision);

