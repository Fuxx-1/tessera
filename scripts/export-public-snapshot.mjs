import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { findings } from "./public-release-scan.mjs";

const destination = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !destination.endsWith(".git")) throw new Error("Pass an external bare publication store ending in .git");
const root = process.cwd();
if (destination === root || destination.startsWith(root + "/")) throw new Error("Publication store must be outside the source session");
const excluded = ["output/", "native/crates/tessera-iced/", "native/spikes/"];
const excludedFiles = new Set(["load.md", "makepad-plan.md"]);
const denied = (process.env.TESSERA_PRIVATE_IDENTIFIERS ?? "").split("\n").filter(Boolean);
const files = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {encoding:"utf8"}).split("\0").filter(Boolean))].sort();
const blobs = [];
const redacted = [];
for (const file of files) {
  if (excluded.some(prefix => file.startsWith(prefix)) || excludedFiles.has(file) || !existsSync(file)) continue;
  const stat = lstatSync(file);
  if (!stat.isFile()) throw new Error("Only regular source files may be exported: " + file);
  let bytes = readFileSync(file);
  if (file.endsWith(".md")) {
    const original = bytes.toString("utf8");
    const clean = original.replaceAll(homedir(), "$HOME")
      .replace(/\.git-vws\/sessions\/session-[a-f0-9]+\.root\/worktree/g, ".git-vws/sessions/<session>/worktree");
    if (clean !== original) {
      bytes = Buffer.from("> Public snapshot: local machine paths were redacted. Historical records are not acceptance evidence for this public revision.\n\n" + clean);
      redacted.push(file);
    }
  }
  const issues = findings(file + "\n" + bytes.toString("utf8"), denied);
  if (issues.length) throw new Error(file + ": " + issues.join(", "));
  blobs.push({file, bytes, mode: stat.mode & 0o111 ? "100755" : "100644"});
}
// Only immutable Git objects and a temporary index are written; no extra source checkout.
if (!existsSync(destination)) execFileSync("git", ["init", "--bare", "--initial-branch=main", destination], {stdio:"pipe"});
const temporary = mkdtempSync(join(tmpdir(), "tessera-public-index-"));
const env = {...process.env, GIT_DIR: destination, GIT_INDEX_FILE: join(temporary, "index"),
  GIT_AUTHOR_NAME: "Fuxx-1", GIT_AUTHOR_EMAIL: "583742849@qq.com",
  GIT_COMMITTER_NAME: "Fuxx-1", GIT_COMMITTER_EMAIL: "583742849@qq.com"};
delete env.GIT_WORK_TREE;
const git = (args, input) => execFileSync("git", args, {env, input, encoding:"utf8", maxBuffer:32*1024*1024}).trim();
try {
  if (git(["rev-parse", "--is-bare-repository"]) !== "true") throw new Error("Not a bare publication store");
  let previous;
  try { previous = git(["rev-parse", "--verify", "refs/heads/main"]); } catch {}
  const parent = process.env.TESSERA_FRESH_PUBLIC_HISTORY === "1" ? undefined : previous;
  const entries = blobs.map(({file,bytes,mode}) => mode + " " + git(["hash-object", "-w", "--stdin"], bytes) + "\t" + file + "\0");
  git(["update-index", "-z", "--index-info"], entries.join(""));
  const tree = git(["write-tree"]);
  const message = parent ? "Prepare portable preview release packages" : "Initial public Tessera preview";
  if (parent && git(["rev-parse", parent + "^{tree}"]) === tree) {
    console.log(JSON.stringify({commit:parent, tree, files:blobs.length, redacted, unchanged:true}, null, 2));
  } else {
    const commit = git(["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", message]);
    git(["update-ref", "refs/heads/main", commit, previous ?? "0".repeat(40)]);
    console.log(JSON.stringify({commit, tree, files:blobs.length, redacted,
      parent:parent ?? null, previous:previous ?? null, fresh:!parent}, null, 2));
  }
} finally {
  rmSync(temporary, {recursive:true});
}
