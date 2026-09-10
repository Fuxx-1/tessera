"""Validate Rust release identity without a Web package or toolchain."""
import os
from pathlib import Path
import re
import subprocess
import tomllib


def validate(root, tag):
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", tag):
        raise ValueError("Invalid Rust version tag")
    if (root / "package.json").exists() or (root / "src").exists():
        raise ValueError("Rust releases must use the Rust-only branch")
    workspace = tomllib.loads((root / "native/Cargo.toml").read_text())
    version = workspace["workspace"]["package"]["version"]
    if tag != "v" + version:
        raise ValueError("Tag/Rust workspace version mismatch")
    for member in workspace["workspace"]["members"]:
        package = tomllib.loads((root / "native" / member / "Cargo.toml").read_text())["package"]
        member_version = package.get("version")
        if member_version != version and member_version != {"workspace": True}:
            raise ValueError("Workspace member version mismatch")
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=root, text=True).strip()
    if git("cat-file", "-t", "refs/tags/" + tag) != "tag":
        raise ValueError("Annotated tag required")
    revision = git("rev-parse", "refs/tags/" + tag + "^{commit}")
    if revision != git("rev-parse", "HEAD"):
        raise ValueError("Tag/checkout mismatch")
    return revision


def main():
    tag = os.environ.get("RELEASE_TAG", "")
    revision = validate(Path.cwd(), tag)
    if output := os.environ.get("GITHUB_OUTPUT"):
        with Path(output).open("a", encoding="utf-8") as stream:
            stream.write(f"tag={tag}\nrevision={revision}\n")
    print(f"Validated Rust {tag} at {revision}")


if __name__ == "__main__":
    main()
