"""Source identity preflight for future native G0 runs."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from evidence_contract import sha256_bytes, utc_now, write_json


def git(root: Path, *args: str) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(["git", "-C", str(root), *args], check=False, capture_output=True)


def clean_git_native_tree(root: Path) -> str:
    result = git(root, "ls-tree", "-r", "-z", "HEAD", "--", "native")
    if result.returncode != 0:
        raise RuntimeError("cannot read HEAD native tree")
    entries = []
    for item in result.stdout.split(b"\0"):
        if not item:
            continue
        metadata, path = item.split(b"\t", 1)
        mode, kind, object_id = metadata.split()
        entries.append(b" ".join((mode, kind, object_id, path)))
    return sha256_bytes(b"\0".join(sorted(entries)) + b"\0")


def run(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--submodule-policy", default="none")
    args = parser.parse_args(argv)
    root = Path(args.source_root).resolve()
    evidence_root = Path(args.evidence_root).resolve()
    output = Path(args.out)
    document = {"checked_at": utc_now(), "mode": "git", "verdict": "fail", "declared_root": str(root), "evidence_root_outside_source_root": not evidence_root.is_relative_to(root), "git": {}}
    top = git(root, "rev-parse", "--show-toplevel")
    top_level = Path(top.stdout.decode().strip()).resolve() if top.returncode == 0 else None
    git_facts = document["git"]
    git_facts["top_level_equals_declared_root"] = top_level == root
    git_facts["index_clean"] = git(root, "diff", "--cached", "--quiet").returncode == 0
    git_facts["worktree_clean"] = git(root, "diff", "--quiet").returncode == 0
    git_facts["untracked_empty"] = not bool(git(root, "ls-files", "--others", "--exclude-standard").stdout.strip())
    git_facts["submodule_policy"] = args.submodule_policy
    git_facts["submodules_match_policy"] = args.submodule_policy != "none" or not bool(git(root, "submodule", "status", "--recursive").stdout.strip())
    try:
        tree_hash = clean_git_native_tree(root)
        git_facts["head_native_tree_sha256"] = tree_hash
        document["canonical_native_tree_sha256"] = tree_hash
    except RuntimeError as exc:
        git_facts["head_native_tree_sha256"] = None
        document["canonical_native_tree_sha256"] = None
        document["error"] = str(exc)
    if not (root / "native" / "Cargo.toml").is_file():
        document["error"] = "native Cargo workspace is absent; no target build may start"
    hard_failures = [
        not document["evidence_root_outside_source_root"],
        not git_facts["top_level_equals_declared_root"],
        not git_facts["index_clean"],
        not git_facts["worktree_clean"],
        not git_facts["untracked_empty"],
        not git_facts["submodules_match_policy"],
        not bool(git_facts.get("head_native_tree_sha256")),
        not (root / "native" / "Cargo.toml").is_file(),
    ]
    document["verdict"] = "pass" if not any(hard_failures) else "fail"
    write_json(output, document)
    return 0 if document["verdict"] == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1:]))
