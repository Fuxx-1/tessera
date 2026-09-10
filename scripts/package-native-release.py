"""Package a CI-built application without exporting local provenance or build logs."""
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import tarfile
import tempfile
import zipfile

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def git_blob_sha(path, cwd=None):
    return hashlib.sha256(
        subprocess.check_output(["git", "show", "HEAD:" + path], cwd=cwd)
    ).hexdigest()

def archive_info(info):
    info.uid = info.gid = 0
    info.uname = info.gname = ""
    return info

def write_windows_archive(bundle, output):
    # Registry license files can retain epoch timestamps, outside ZIP's range.
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, strict_timestamps=False) as archive:
        for path in sorted(bundle.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(bundle.parent))

def main():
    platform = os.environ["RELEASE_PLATFORM"]
    tag = os.environ["RELEASE_TAG"]
    if platform not in {"macos-arm64", "macos-x64", "linux-x64", "windows-x64"}:
        raise ValueError("Unknown release platform")
    version = json.loads(Path("package.json").read_text())["version"]
    if tag != "v" + version:
        raise ValueError("Version mismatch")
    target = Path(os.environ["CARGO_TARGET_DIR"]).resolve()
    root = Path.cwd().resolve()
    if target.is_relative_to(root):
        raise ValueError("Source-tree build targets are forbidden")
    exe = "tessera-gallery" + (".exe" if platform == "windows-x64" else "")
    binary = target / "release" / exe
    output = root / "release-assets"
    output.mkdir(exist_ok=True)
    stem = "tessera-makepad-" + platform
    with tempfile.TemporaryDirectory(prefix="tessera-package-") as temp:
        stage = Path(temp)
        bundle = stage / "Tessera Makepad.app" if platform.startswith("macos") else stage / stem
        executable_dir = bundle / "Contents/MacOS" if platform.startswith("macos") else bundle
        resources = bundle / "Contents/Resources" if platform.startswith("macos") else bundle
        executable_dir.mkdir(parents=True)
        notices = resources / "Notices"
        notices.mkdir(parents=True)
        packaged = executable_dir / exe
        shutil.copy2(binary, packaged)
        packaged.chmod(0o755)
        shutil.copy2("LICENSE", notices / "LICENSE-Tessera")
        shutil.copy2("native/crates/tessera-gallery/resources/fonts/LICENSE-LXGW-XiHei.md", notices)
        shutil.copy2("native/docs/makepad-fonts.md", notices)
        metadata = json.loads(run("cargo", "metadata", "--manifest-path", "native/Cargo.toml", "--locked", "--format-version", "1"))
        dependencies = []
        for package in metadata["packages"]:
            if package["id"] in metadata["workspace_members"]:
                continue
            dependency = Path(package["manifest_path"]).parent
            dependencies.append({"name": package["name"], "version": package["version"], "license": package["license"]})
            candidates = set(dependency.glob("LICENSE*")) | set(dependency.glob("COPYING*")) | set(dependency.glob("NOTICE*"))
            if package["name"] == "makepad-widgets":
                candidates |= set(dependency.glob("resources/**/LICENSE*"))
                candidates |= set(dependency.glob("resources/**/*OFL*"))
                candidates |= set(dependency.glob("resources/**/*LICENSE*"))
            # Some git workspace crates inherit the upstream repository license.
            if not candidates and package["source"] and package["source"].startswith("git+"):
                for parent in list(dependency.parents)[:4]:
                    candidates |= set(parent.glob("LICENSE*"))
                    if candidates:
                        break
            for index, path in enumerate(sorted(candidates)):
                if path.is_file():
                    name = package["name"] + "-" + package["version"] + "-" + str(index) + "-" + path.name
                    shutil.copy2(path, notices / name)
        (notices / "dependencies.json").write_text(json.dumps(dependencies, indent=2) + "\n")
        if platform.startswith("macos"):
            with Path("native/macos/Info.plist").open("rb") as stream:
                plist = plistlib.load(stream)
            plist["CFBundleShortVersionString"] = version
            plist["CFBundleVersion"] = version
            with (bundle / "Contents/Info.plist").open("wb") as stream:
                plistlib.dump(plist, stream)
            (bundle / "Contents/PkgInfo").write_bytes(b"APPL????")
            subprocess.run(["codesign", "--force", "--sign", "-", "--timestamp=none", str(packaged)], check=True)
            subprocess.run(["codesign", "--force", "--sign", "-", "--timestamp=none", str(bundle)], check=True)
            subprocess.run(["codesign", "--verify", "--deep", "--strict", str(bundle)], check=True)
        # Scan unpacked bytes, not just compressed archives.
        subprocess.run(["node", "scripts/public-release-scan.mjs", "--dir", str(bundle)], check=True)
        manifest = {
            "schema_version": 1, "tag": tag, "platform": platform,
            "source_revision": run("git", "rev-parse", "HEAD"),
            # The release source is the checked-out commit, never its platform-specific
            # line-ending conversion in a runner worktree.
            "cargo_lock_sha256": git_blob_sha("native/Cargo.lock"),
            "binary_sha256": sha(packaged),
            "rustc": run("rustc", "--version"),
            "profile": "release-opt2-thin-lto",
            "signing": "adhoc-not-notarized" if platform.startswith("macos") else "unsigned",
            "gui_acceptance": "not-asserted",
        }
        (output / (stem + ".json")).write_text(json.dumps(manifest, indent=2) + "\n")
        if platform.startswith("macos"):
            (stage / "Applications").symlink_to("/Applications")
            dmg = output / (stem + ".dmg")
            subprocess.run(["hdiutil", "create", "-quiet", "-format", "UDZO", "-volname", "Tessera Makepad", "-srcfolder", str(stage), str(dmg)], check=True)
            subprocess.run(["hdiutil", "verify", str(dmg)], check=True)
        elif platform == "windows-x64":
            write_windows_archive(bundle, output / (stem + ".zip"))
        else:
            with tarfile.open(output / (stem + ".tar.gz"), "w:gz") as archive:
                archive.add(bundle, arcname=stem, filter=archive_info)
    print("Packaged " + platform + " at " + manifest["source_revision"])

if __name__ == "__main__":
    main()
