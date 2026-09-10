import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./validate-release.mjs", import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "tessera-web-release-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", ["-c", "user.name=Fuxx-1",
    "-c", "user.email=583742849@qq.com", ...args], { cwd: root, encoding: "utf8" });
  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "1.2.3" }));
  git("init", "--quiet"); git("add", "."); git("commit", "--quiet", "-m", "fixture");
  git("tag", "-a", "web-v1.2.3", "-m", "fixture");
  return { root, git, validate: (tag = "web-v1.2.3") =>
    spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8",
      env: { ...process.env, RELEASE_TAG: tag, GITHUB_OUTPUT: join(root, "output") } }) };
}
test("Web-only release needs no Rust manifest", t => {
  const result = fixture(t).validate();
  assert.equal(result.status, 0, result.stderr);
});
test("rejects Rust tags and version mismatch", t => {
  const { git, validate } = fixture(t);
  assert.match(validate("v1.2.3").stderr, /Invalid Web version tag/);
  git("tag", "-a", "web-v9.0.0", "-m", "fixture");
  assert.match(validate("web-v9.0.0").stderr, /package version mismatch/);
});
test("rejects a mixed implementation tree", t => {
  const { root, validate } = fixture(t);
  mkdirSync(join(root, "native"));
  assert.match(validate().stderr, /Web-only/);
});
test("rejects lightweight tags", t => {
  const { git, validate } = fixture(t);
  git("tag", "-d", "web-v1.2.3"); git("tag", "web-v1.2.3");
  assert.match(validate().stderr, /Annotated tag required/);
});
test("rejects tag from a different checkout", t => {
  const { git, validate } = fixture(t);
  git("commit", "--allow-empty", "--quiet", "-m", "next");
  assert.match(validate().stderr, /checkout mismatch/);
});
