import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { pathToFileURL } from "node:url";

const rules = [
  ["private home path", /(?:\/(?:Users|home)\/|[A-Za-z]:\\Users\\)[A-Za-z0-9_.-]+[\\/]/],
  ["private session", /\.git-vws[\\/]sessions[\\/]session-[a-f0-9]{16,}/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub credential", /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/],
  ["AWS credential", /AKIA[A-Z0-9]{16}/],
];

export function findings(source, denied = []) {
  // GitHub-hosted runner paths identify disposable infrastructure, not a person.
  const publicSource = source.replace(/\/(?:Users|home)\/runner\//g, "/builder/")
    .replace(/[A-Za-z]:\\Users\\runneradmin\\/g, "/builder/");
  const result = rules.filter(([, pattern]) => pattern.test(publicSource)).map(([label]) => label);
  for (const value of denied.filter(Boolean)) {
    const privateSource = source.replaceAll("583742849@qq.com", "approved-public-email");
    if (privateSource.toLowerCase().includes(value.toLowerCase())) result.push("private identity");
  }
  return result;
}

export function scanDirectory(root, denied = []) {
  let count = 0;
  const failures = [];
  function visit(dir) {
    for (const name of readdirSync(dir)) {
      if (name === ".git") continue;
      const file = join(dir, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error("Unexpected symlink: " + relative(root, file));
      if (stat.isDirectory()) visit(file);
      else {
        count++;
        const issues = findings(readFileSync(file).toString("utf8"), denied);
        if (issues.length) failures.push(relative(root, file) + ": " + issues.join(", "));
      }
    }
  }
  visit(root);
  return { count, failures };
}

function main() {
  const args = process.argv.slice(2);
  const denied = (process.env.TESSERA_PRIVATE_IDENTIFIERS ?? "").split("\n");
  let result;
  if (args[0] === "--dir") {
    if (!args[1]) throw new Error("--dir requires a directory");
    result = scanDirectory(resolve(args[1]), denied);
  } else if (args[0] === "--tree") {
    if (!args[1]) throw new Error("--tree requires a revision");
    const entries = execFileSync("git", ["ls-tree", "-r", "-z", args[1]], { encoding: "utf8" }).split("\0").filter(Boolean);
    result = { count: entries.length, failures: [] };
    for (const entry of entries) {
      const [header, file] = entry.split("\t");
      const [mode, type, hash] = header.split(" ");
      if (!["100644", "100755"].includes(mode) || type !== "blob") throw new Error("Unexpected public tree entry");
      const source = execFileSync("git", ["cat-file", "blob", hash], { maxBuffer: 32 * 1024 * 1024 });
      const issues = findings(file + "\n" + source.toString("utf8"), denied);
      if (issues.length) result.failures.push(file + ": " + issues.join(", "));
    }
  } else {
    const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
    result = { count: files.length, failures: [] };
    for (const file of files) {
      const issues = findings(readFileSync(file).toString("utf8"), denied);
      if (issues.length) result.failures.push(file + ": " + issues.join(", "));
    }
  }
  if (args.includes("--history")) {
    const records = execFileSync("git", ["log", "--all", "--format=%an <%ae>%x00%cn <%ce>%x00%B%x00"], { encoding: "utf8" }).trim().split("\0\n").filter(Boolean);
    const identity = "Fuxx-1 <583742849@qq.com>";
    for (const record of records) {
      const [author, committer, message] = record.replace(/^\n/, "").split("\0");
      if (author !== identity || committer !== identity) result.failures.push("Unexpected public commit identity");
      if (!message?.trim() || findings(message, denied).length) result.failures.push("Unsafe or empty commit message");
    }
    const tags = execFileSync("git", ["for-each-ref", "--format=%(taggername) <%(taggeremail:trim)>", "refs/tags"], { encoding: "utf8" }).trim();
    if (tags && tags.split("\n").some(tag => tag !== identity)) result.failures.push("Unexpected annotated tag identity");
    const tagMessages = execFileSync("git", ["for-each-ref", "--format=%(contents)", "refs/tags"], { encoding: "utf8" });
    if (findings(tagMessages, denied).length) result.failures.push("Unsafe annotated tag message");
  }
  if (result.failures.length) {
    console.error("Public release safety scan failed:\n" + result.failures.join("\n"));
    process.exitCode = 1;
  } else console.log("Public release safety scan passed (" + result.count + " files).");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
