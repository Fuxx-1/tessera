import { test } from "node:test";
import assert from "node:assert/strict";
import { findings } from "./public-release-scan.mjs";

test("rejects private paths, credentials and supplied identities without echoing them", () => {
  assert.ok(findings(["", "Users", "example", "source.rs"].join("/")).length);
  assert.ok(findings(["C:", "Users", "example", "source.rs"].join("\\")).length);
  assert.ok(findings("ghp_" + "a".repeat(36)).length);
  assert.ok(findings("secret-person", ["secret-person"]).includes("private identity"));
});
test("permits generic fixtures and keyboard descriptions", () => {
  assert.deepEqual(findings("/private/tmp/payload keyboard step/home/end"), []);
  assert.deepEqual(findings("$HOME/Library/Caches/tessera"), []);
  assert.deepEqual(findings(["", "Users", "runner", "work"].join("/")), []);
  const publicEmail = "583742849@qq.com";
  assert.deepEqual(findings(publicEmail, [publicEmail.split("@")[0]]), []);
});
