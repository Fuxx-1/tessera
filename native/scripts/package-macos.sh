#!/bin/sh
set -eu

# Package a managed Makepad release binary as a signed .app and DMG.
# The script never creates a Cargo target in the source tree.

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
NATIVE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd -P)
REPO_DIR=$(CDPATH= cd -- "$NATIVE_DIR/.." && pwd -P)
RESULTS_ROOT="$HOME/Library/Application Support/Tessera/build-results"
CACHE_ROOT="$HOME/Library/Caches/tessera/builds"

APP_NAME="Tessera Makepad.app"
DMG_NAME="Tessera Makepad.dmg"
BUNDLE_ID="dev.tessera.makepad"
EXECUTABLE_NAME="tessera-gallery"

BINARY_INPUT=""
BINARY_SOURCE_REVISION=""
SOURCE_REVISION=""
PACKAGE_DIR_INPUT=""
SIGNING_IDENTITY=""
BUILD_KEY="${TESSERA_BUILD_KEY:-}"
VWS_SESSION="${TESSERA_VWS_SESSION:-}"
BUILD_COMMAND="${TESSERA_BUILD_COMMAND:-}"
RUST_TOOLCHAIN="${TESSERA_RUST_TOOLCHAIN:-1.88.0}"
MAKE_DMG=1
ALLOW_ADHOC=0

die() {
  printf 'package-macos: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: native/scripts/package-macos.sh --binary <release-binary> [options]

Packages the supplied Makepad release binary into a signed macOS application
bundle and, by default, a compressed DMG. Long-lived output is restricted to
~/Library/Application Support/Tessera/build-results.

Options:
  --binary <path>                 Release tessera-gallery Mach-O to package.
  --source-revision <sha>         Source revision represented by this package.
  --binary-source-revision <sha>  Revision that produced the binary.
  --build-key <key>               Managed build key that produced the binary.
  --session <worktree>            Existing VWS worktree used for the build.
  --build-command <command>       Exact managed Cargo build command.
  --rust-toolchain <version>      Rust toolchain used to build (default: 1.88.0).
  --package-dir <path>            Managed output directory.
  --signing-identity <identity>   Developer ID Application identity.
  --allow-adhoc                   Permit a local-only ad-hoc package.
  --no-dmg                        Produce only the .app bundle.
  --dmg                           Produce the DMG (the default).
  -h, --help                      Show this help.

The release binary must be a regular Mach-O below
~/Library/Caches/tessera/builds. When --binary is omitted, CARGO_TARGET_DIR
may point at that managed target root. Source-tree targets are rejected.
EOF
}

is_revision() {
  printf '%s\n' "$1" | awk 'length($0) == 40 && $0 !~ /[^0-9a-fA-F]/ { exit 0 } { exit 1 }'
}

absolute_path() {
  input=$1
  case "$input" in
    /*) candidate=$input ;;
    *) candidate="$PWD/$input" ;;
  esac
  parent=$(CDPATH= cd -- "$(dirname -- "$candidate")" 2>/dev/null && pwd -P) \
    || die "parent directory does not exist: $input"
  printf '%s/%s\n' "$parent" "$(basename -- "$candidate")"
}

managed_path() {
  candidate=$1
  root=$2
  case "$candidate/" in
    "$root/"*) ;;
    *) die "path is outside the managed root $root: $candidate" ;;
  esac
}

json_quote() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$1" <<'PY'
import json
import sys

print(json.dumps(sys.argv[1]))
PY
  elif [ -x /usr/bin/ruby ]; then
    /usr/bin/ruby -rjson -e 'puts JSON.generate(ARGV.fetch(0))' "$1"
  else
    die "cannot encode package provenance without python3 or /usr/bin/ruby"
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --binary)
      [ "$#" -ge 2 ] || die "--binary requires a path"
      BINARY_INPUT=$2
      shift 2
      ;;
    --source-revision)
      [ "$#" -ge 2 ] || die "--source-revision requires a SHA"
      SOURCE_REVISION=$2
      shift 2
      ;;
    --binary-source-revision)
      [ "$#" -ge 2 ] || die "--binary-source-revision requires a SHA"
      BINARY_SOURCE_REVISION=$2
      shift 2
      ;;
    --build-key)
      [ "$#" -ge 2 ] || die "--build-key requires a value"
      BUILD_KEY=$2
      shift 2
      ;;
    --session)
      [ "$#" -ge 2 ] || die "--session requires an absolute VWS worktree path"
      VWS_SESSION=$2
      shift 2
      ;;
    --build-command)
      [ "$#" -ge 2 ] || die "--build-command requires the exact Cargo build command"
      BUILD_COMMAND=$2
      shift 2
      ;;
    --rust-toolchain)
      [ "$#" -ge 2 ] || die "--rust-toolchain requires a version"
      RUST_TOOLCHAIN=$2
      shift 2
      ;;
    --package-dir)
      [ "$#" -ge 2 ] || die "--package-dir requires a path"
      PACKAGE_DIR_INPUT=$2
      shift 2
      ;;
    --signing-identity)
      [ "$#" -ge 2 ] || die "--signing-identity requires an identity"
      SIGNING_IDENTITY=$2
      shift 2
      ;;
    --allow-adhoc)
      ALLOW_ADHOC=1
      shift
      ;;
    --no-dmg)
      MAKE_DMG=0
      shift
      ;;
    --dmg)
      MAKE_DMG=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

if [ -z "$SOURCE_REVISION" ]; then
  SOURCE_REVISION=$(git -C "$REPO_DIR" rev-parse --verify HEAD 2>/dev/null) \
    || die "cannot determine source revision; pass --source-revision"
fi
is_revision "$SOURCE_REVISION" || die "source revision must be a 40-character hexadecimal SHA"
SOURCE_REVISION=$(printf '%s' "$SOURCE_REVISION" | tr '[:upper:]' '[:lower:]')
WORKTREE_REVISION=$(git -C "$REPO_DIR" rev-parse --verify HEAD) \
  || die "cannot read the current source-tree revision"
[ "$SOURCE_REVISION" = "$WORKTREE_REVISION" ] \
  || die "source revision must match the current source tree: $WORKTREE_REVISION"

if [ -z "$BINARY_SOURCE_REVISION" ]; then
  BINARY_SOURCE_REVISION=$SOURCE_REVISION
fi
is_revision "$BINARY_SOURCE_REVISION" \
  || die "binary source revision must be a 40-character hexadecimal SHA"
BINARY_SOURCE_REVISION=$(printf '%s' "$BINARY_SOURCE_REVISION" | tr '[:upper:]' '[:lower:]')

[ -n "$BUILD_KEY" ] || die "--build-key (or TESSERA_BUILD_KEY) is required for build provenance"
[ -n "$BUILD_COMMAND" ] || die "--build-command (or TESSERA_BUILD_COMMAND) is required for build provenance"
case "$VWS_SESSION" in
  /*) ;;
  *) die "--session (or TESSERA_VWS_SESSION) must be an absolute VWS worktree path" ;;
esac
VWS_SESSION=$(CDPATH= cd -- "$VWS_SESSION" 2>/dev/null && pwd -P) \
  || die "VWS worktree does not exist: $VWS_SESSION"
[ "$VWS_SESSION" = "$REPO_DIR" ] \
  || die "VWS worktree must be this packaging source tree: $REPO_DIR"
case "$RUST_TOOLCHAIN" in
  1.88.0) ;;
  *) die "--rust-toolchain must be 1.88.0 for the managed macOS build" ;;
esac
RUSTC_VERSION=$(rustup run "$RUST_TOOLCHAIN" rustc --version) \
  || die "Rust toolchain $RUST_TOOLCHAIN is unavailable"
case "$RUSTC_VERSION" in
  "rustc 1.88.0 "*|"rustc 1.88.0") ;;
  *) die "Rust toolchain $RUST_TOOLCHAIN did not resolve to rustc 1.88.0: $RUSTC_VERSION" ;;
esac

if [ -z "$BINARY_INPUT" ]; then
  [ -n "${CARGO_TARGET_DIR:-}" ] \
    || die "pass --binary or set CARGO_TARGET_DIR to a managed release target"
  case "$CARGO_TARGET_DIR" in
    /*) TARGET_DIR=$CARGO_TARGET_DIR ;;
    *) die "CARGO_TARGET_DIR must be an absolute managed path" ;;
  esac
  TARGET_DIR=$(CDPATH= cd -- "$TARGET_DIR" 2>/dev/null && pwd -P) \
    || die "CARGO_TARGET_DIR does not exist: $CARGO_TARGET_DIR"
  managed_path "$TARGET_DIR" "$CACHE_ROOT"
  BINARY_INPUT="$TARGET_DIR/release/$EXECUTABLE_NAME"
fi
BINARY_PATH=$(absolute_path "$BINARY_INPUT")
[ -f "$BINARY_PATH" ] || die "release binary does not exist: $BINARY_PATH"
[ ! -L "$BINARY_PATH" ] || die "release binary must not be a symlink: $BINARY_PATH"
managed_path "$BINARY_PATH" "$CACHE_ROOT"
TARGET_DIR=$(CDPATH= cd -- "$(dirname -- "$(dirname -- "$BINARY_PATH")")" && pwd -P)
managed_path "$TARGET_DIR" "$CACHE_ROOT"
LOCKFILE_PATH="$NATIVE_DIR/Cargo.lock"
[ -f "$LOCKFILE_PATH" ] || die "missing Cargo lockfile: $LOCKFILE_PATH"
LOCKFILE_SHA256=$(/usr/bin/shasum -a 256 "$LOCKFILE_PATH" | awk '{print $1}')
BUILD_COMMAND_SHA256=$(printf '%s' "$BUILD_COMMAND" | /usr/bin/shasum -a 256 | awk '{print $1}')

case "$BINARY_PATH" in
  "$NATIVE_DIR/target/"*|"$REPO_DIR/target/"*)
    die "source-tree Cargo targets are not allowed: $BINARY_PATH"
    ;;
esac

if [ -z "$SIGNING_IDENTITY" ]; then
  SIGNING_IDENTITY=$(/usr/bin/security find-identity -v -p codesigning 2>/dev/null \
    | awk -F '"' '/Developer ID Application/ { print $2; exit }')
fi

SIGNING_MODE="developer-id"
if [ -z "$SIGNING_IDENTITY" ]; then
  if [ "$ALLOW_ADHOC" -ne 1 ]; then
    die "no Developer ID Application identity is available; pass --signing-identity or explicitly use --allow-adhoc for a local-only package"
  fi
  SIGNING_IDENTITY="-"
  SIGNING_MODE="adhoc"
fi

FILE_KIND=$(/usr/bin/file -b "$BINARY_PATH")
case "$FILE_KIND" in
  *"Mach-O"*) ;;
  *) die "release binary is not Mach-O: $FILE_KIND" ;;
esac

ARCHES=$(/usr/bin/lipo -archs "$BINARY_PATH" 2>/dev/null || true)
[ -n "$ARCHES" ] || die "cannot read Mach-O architectures"
HOST_ARCH=$(uname -m)
case " $ARCHES " in
  *" $HOST_ARCH "*) ;;
  *) die "binary architectures ($ARCHES) do not include host architecture $HOST_ARCH" ;;
esac

BINARY_SHA256=$(/usr/bin/shasum -a 256 "$BINARY_PATH" | awk '{print $1}')
BINARY_SIZE=$(/usr/bin/stat -f '%z' "$BINARY_PATH")
PLIST_SOURCE="$NATIVE_DIR/macos/Info.plist"
[ -f "$PLIST_SOURCE" ] || die "missing bundle metadata: $PLIST_SOURCE"
/usr/bin/plutil -lint "$PLIST_SOURCE" >/dev/null \
  || die "invalid bundle metadata: $PLIST_SOURCE"
PLIST_BUNDLE_ID=$(/usr/bin/plutil -extract CFBundleIdentifier raw -o - "$PLIST_SOURCE")
PLIST_EXECUTABLE=$(/usr/bin/plutil -extract CFBundleExecutable raw -o - "$PLIST_SOURCE")
[ "$PLIST_BUNDLE_ID" = "$BUNDLE_ID" ] \
  || die "Info.plist bundle identifier must be $BUNDLE_ID"
[ "$PLIST_EXECUTABLE" = "$EXECUTABLE_NAME" ] \
  || die "Info.plist executable must be $EXECUTABLE_NAME"

mkdir -p "$RESULTS_ROOT"
RESULTS_ROOT=$(CDPATH= cd -- "$RESULTS_ROOT" && pwd -P)
if [ -z "$PACKAGE_DIR_INPUT" ]; then
  PACKAGE_DIR="$RESULTS_ROOT/tessera-makepad-package/$SOURCE_REVISION/darwin-$HOST_ARCH/$BINARY_SHA256"
else
  PACKAGE_DIR=$(absolute_path "$PACKAGE_DIR_INPUT")
fi
managed_path "$PACKAGE_DIR" "$RESULTS_ROOT"
PACKAGE_PARENT=$(dirname -- "$PACKAGE_DIR")
mkdir -p "$PACKAGE_PARENT"
[ ! -e "$PACKAGE_DIR" ] || die "refusing to overwrite existing package directory: $PACKAGE_DIR"

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/tessera-makepad-package.XXXXXX")
PACKAGE_STAGE=$(mktemp -d "${PACKAGE_DIR}.staging.XXXXXX")
cleanup() {
  rc=$?
  trap - EXIT HUP INT TERM
  rm -rf "$STAGE"
  rm -rf "$PACKAGE_STAGE"
  exit "$rc"
}
trap cleanup EXIT HUP INT TERM

# Include tracked changes and content-addressed untracked files so an artifact
# cannot silently claim a clean HEAD while being built from a dirty worktree.
SOURCE_STATUS="$STAGE/source-tree-status.txt"
SOURCE_TREE_MATERIAL="$STAGE/source-tree-material.txt"
git -C "$REPO_DIR" status --porcelain=v1 --untracked-files=all > "$SOURCE_STATUS"
SOURCE_TREE_STATUS_SHA256=$(/usr/bin/shasum -a 256 "$SOURCE_STATUS" | awk '{print $1}')
if [ -s "$SOURCE_STATUS" ]; then
  SOURCE_TREE_STATE="dirty"
else
  SOURCE_TREE_STATE="clean"
fi
UNTRACKED_PATHS=$(git -C "$REPO_DIR" ls-files --others --exclude-standard)
{
  printf 'tessera-source-tree/v1\n'
  printf 'head %s\n' "$WORKTREE_REVISION"
  printf 'status\n'
  cat "$SOURCE_STATUS"
  printf 'tracked-diff\n'
  git -C "$REPO_DIR" diff --binary --no-ext-diff --no-renames HEAD
  printf 'untracked-object-hashes\n'
  if [ -n "$UNTRACKED_PATHS" ]; then
    while IFS= read -r untracked_path; do
      [ -n "$untracked_path" ] || continue
      untracked_hash=$(git -C "$REPO_DIR" hash-object -- "$untracked_path")
      printf '%s %s\n' "$untracked_hash" "$untracked_path"
    done <<EOF
$UNTRACKED_PATHS
EOF
  fi
} > "$SOURCE_TREE_MATERIAL"
SOURCE_TREE_DIGEST_SHA256=$(/usr/bin/shasum -a 256 "$SOURCE_TREE_MATERIAL" | awk '{print $1}')

APP_STAGE="$STAGE/$APP_NAME"
mkdir -p "$APP_STAGE/Contents/MacOS" "$APP_STAGE/Contents/Resources"
cp "$BINARY_PATH" "$APP_STAGE/Contents/MacOS/$EXECUTABLE_NAME"
cp "$PLIST_SOURCE" "$APP_STAGE/Contents/Info.plist"
mkdir -p "$APP_STAGE/Contents/Resources/Notices"
cp "$REPO_DIR/native/crates/tessera-gallery/resources/fonts/LICENSE-LXGW-XiHei.md" \
  "$APP_STAGE/Contents/Resources/Notices/LICENSE-LXGW-XiHei.md"
cp "$REPO_DIR/native/docs/makepad-fonts.md" \
  "$APP_STAGE/Contents/Resources/Notices/makepad-fonts.md"
printf 'APPL????' > "$APP_STAGE/Contents/PkgInfo"
chmod 755 "$APP_STAGE/Contents/MacOS/$EXECUTABLE_NAME"

/usr/bin/plutil -lint "$APP_STAGE/Contents/Info.plist" >/dev/null
if [ "$SIGNING_MODE" = "adhoc" ]; then
  /usr/bin/codesign --force --sign - --timestamp=none \
    "$APP_STAGE/Contents/MacOS/$EXECUTABLE_NAME" >/dev/null
  /usr/bin/codesign --force --sign - --timestamp=none "$APP_STAGE" >/dev/null
else
  /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" --options runtime \
    --timestamp "$APP_STAGE/Contents/MacOS/$EXECUTABLE_NAME" >/dev/null
  /usr/bin/codesign --force --sign "$SIGNING_IDENTITY" --options runtime \
    --timestamp "$APP_STAGE" >/dev/null
fi
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_STAGE" >/dev/null \
  || die "application signature verification failed"
PACKAGED_BINARY_SHA256=$(/usr/bin/shasum -a 256 "$APP_STAGE/Contents/MacOS/$EXECUTABLE_NAME" | awk '{print $1}')
PACKAGED_BINARY_SIZE=$(/usr/bin/stat -f '%z' "$APP_STAGE/Contents/MacOS/$EXECUTABLE_NAME")

APP_STAGE_PATH="$PACKAGE_STAGE/$APP_NAME"
DMG_STAGE_PATH="$PACKAGE_STAGE/$DMG_NAME"
MANIFEST_PATH="$PACKAGE_STAGE/package-manifest.json"
mv "$APP_STAGE" "$APP_STAGE_PATH"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_STAGE_PATH" >/dev/null \
  || die "final application signature verification failed"

DMG_SHA256=""
DMG_SIZE=""
if [ "$MAKE_DMG" -eq 1 ]; then
  DMG_ROOT="$STAGE/dmg-root"
  mkdir -p "$DMG_ROOT"
  /usr/bin/ditto "$APP_STAGE_PATH" "$DMG_ROOT/$APP_NAME"
  ln -s /Applications "$DMG_ROOT/Applications"
  DMG_STAGED="$STAGE/$DMG_NAME"
  /usr/bin/hdiutil create -quiet -ov -format UDZO \
    -imagekey zlib-level=9 -volname "Tessera Makepad" \
    -srcfolder "$DMG_ROOT" "$DMG_STAGED"
  /usr/bin/hdiutil verify "$DMG_STAGED" >/dev/null \
    || die "DMG verification failed"
  mv "$DMG_STAGED" "$DMG_STAGE_PATH"
  DMG_SHA256=$(/usr/bin/shasum -a 256 "$DMG_STAGE_PATH" | awk '{print $1}')
  DMG_SIZE=$(/usr/bin/stat -f '%z' "$DMG_STAGE_PATH")
fi

CREATED_AT=$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')
MANIFEST_TMP="$STAGE/package-manifest.json"
BUILD_KEY_JSON=$(json_quote "$BUILD_KEY")
VWS_SESSION_JSON=$(json_quote "$VWS_SESSION")
BUILD_COMMAND_JSON=$(json_quote "$BUILD_COMMAND")
TARGET_DIR_JSON=$(json_quote "$TARGET_DIR")
RUSTC_VERSION_JSON=$(json_quote "$RUSTC_VERSION")
if [ "$MAKE_DMG" -eq 1 ]; then
  DMG_JSON="\"$DMG_NAME\""
  DMG_SHA_JSON="\"$DMG_SHA256\""
  DMG_SIZE_JSON=$DMG_SIZE
else
  DMG_JSON=null
  DMG_SHA_JSON=null
  DMG_SIZE_JSON=null
fi
{
  printf '{\n'
  printf '  "schema_version": "tessera/macos-package/v1",\n'
  printf '  "product": "Tessera Makepad",\n'
  printf '  "bundle_identifier": "%s",\n' "$BUNDLE_ID"
  printf '  "source_revision": "%s",\n' "$SOURCE_REVISION"
  printf '  "binary_source_revision": "%s",\n' "$BINARY_SOURCE_REVISION"
  printf '  "source_tree": {"state": "%s", "digest_sha256": "%s", "status_sha256": "%s"},\n' \
    "$SOURCE_TREE_STATE" "$SOURCE_TREE_DIGEST_SHA256" "$SOURCE_TREE_STATUS_SHA256"
  printf '  "cargo_lock": {"path": "native/Cargo.lock", "sha256": "%s"},\n' "$LOCKFILE_SHA256"
  printf '  "build": {"key": %s, "target_dir": %s, "rust_toolchain": "%s", "rustc_version": %s, "command": %s, "command_sha256": "%s"},\n' \
    "$BUILD_KEY_JSON" "$TARGET_DIR_JSON" "$RUST_TOOLCHAIN" "$RUSTC_VERSION_JSON" "$BUILD_COMMAND_JSON" "$BUILD_COMMAND_SHA256"
  printf '  "vws_session": %s,\n' "$VWS_SESSION_JSON"
  printf '  "host": "darwin-%s",\n' "$HOST_ARCH"
  printf '  "architectures": "%s",\n' "$ARCHES"
  printf '  "backend": "makepad-metal",\n'
  printf '  "signing": "%s",\n' "$SIGNING_MODE"
  printf '  "signing_identity": %s,\n' \
    "$(if [ "$SIGNING_MODE" = "adhoc" ]; then printf 'null'; else printf '"%s"' "$SIGNING_IDENTITY"; fi)"
  printf '  "notarized": false,\n'
  printf '  "distribution_ready": false,\n'
  printf '  "gatekeeper_assessment": "blocked_notarization",\n'
  printf '  "input_binary": {"name": "%s", "sha256": "%s", "size_bytes": %s},\n' \
    "$EXECUTABLE_NAME" "$BINARY_SHA256" "$BINARY_SIZE"
  printf '  "bundle_executable": {"name": "%s", "sha256": "%s", "size_bytes": %s},\n' \
    "$EXECUTABLE_NAME" "$PACKAGED_BINARY_SHA256" "$PACKAGED_BINARY_SIZE"
  printf '  "app": "%s",\n' "$APP_NAME"
  printf '  "dmg": %s,\n' "$DMG_JSON"
  printf '  "dmg_sha256": %s,\n' "$DMG_SHA_JSON"
  printf '  "dmg_size_bytes": %s,\n' "$DMG_SIZE_JSON"
  printf '  "created_at": "%s"\n' "$CREATED_AT"
  printf '}\n'
} > "$MANIFEST_TMP"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$MANIFEST_TMP" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as manifest:
    json.load(manifest)
PY
elif [ -x /usr/bin/ruby ]; then
  /usr/bin/ruby -rjson -e 'JSON.parse(File.read(ARGV.fetch(0)))' "$MANIFEST_TMP"
else
  die "cannot validate generated package manifest: python3 or /usr/bin/ruby is required"
fi
mv "$MANIFEST_TMP" "$MANIFEST_PATH"
PACKAGE_MANIFEST_SHA256=$(/usr/bin/shasum -a 256 "$MANIFEST_PATH" | awk '{print $1}')

BUILD_RESULT_TMP="$STAGE/build-result.json"
BUILD_RESULT_PATH="$PACKAGE_STAGE/build-result.json"
{
  printf '{\n'
  printf '  "schema_version": "tessera/macos-build-result/v1",\n'
  printf '  "source": {\n'
  printf '    "revision": "%s",\n' "$SOURCE_REVISION"
  printf '    "tree": {"state": "%s", "digest_sha256": "%s", "status_sha256": "%s"},\n' \
    "$SOURCE_TREE_STATE" "$SOURCE_TREE_DIGEST_SHA256" "$SOURCE_TREE_STATUS_SHA256"
  printf '    "cargo_lock": {"path": "native/Cargo.lock", "sha256": "%s"},\n' "$LOCKFILE_SHA256"
  printf '    "vws_session": %s\n' "$VWS_SESSION_JSON"
  printf '  },\n'
  printf '  "build": {\n'
  printf '    "key": %s,\n' "$BUILD_KEY_JSON"
  printf '    "target_dir": %s,\n' "$TARGET_DIR_JSON"
  printf '    "cargo_build_jobs": "2",\n'
  printf '    "rust": {"toolchain": "%s", "version": %s},\n' "$RUST_TOOLCHAIN" "$RUSTC_VERSION_JSON"
  printf '    "command": %s,\n' "$BUILD_COMMAND_JSON"
  printf '    "command_sha256": "%s"\n' "$BUILD_COMMAND_SHA256"
  printf '  },\n'
  printf '  "package_manifest": {"name": "package-manifest.json", "sha256": "%s"},\n' "$PACKAGE_MANIFEST_SHA256"
  printf '  "artifacts": {\n'
  printf '    "input_binary": {"name": "%s", "sha256": "%s", "size_bytes": %s},\n' \
    "$EXECUTABLE_NAME" "$BINARY_SHA256" "$BINARY_SIZE"
  printf '    "bundle_executable": {"name": "%s", "sha256": "%s", "size_bytes": %s},\n' \
    "$EXECUTABLE_NAME" "$PACKAGED_BINARY_SHA256" "$PACKAGED_BINARY_SIZE"
  printf '    "dmg": {"name": %s, "sha256": %s, "size_bytes": %s}\n' \
    "$DMG_JSON" "$DMG_SHA_JSON" "$DMG_SIZE_JSON"
  printf '  },\n'
  printf '  "created_at": "%s"\n' "$CREATED_AT"
  printf '}\n'
} > "$BUILD_RESULT_TMP"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$BUILD_RESULT_TMP" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as result:
    json.load(result)
PY
elif [ -x /usr/bin/ruby ]; then
  /usr/bin/ruby -rjson -e 'JSON.parse(File.read(ARGV.fetch(0)))' "$BUILD_RESULT_TMP"
else
  die "cannot validate generated build result: python3 or /usr/bin/ruby is required"
fi
mv "$BUILD_RESULT_TMP" "$BUILD_RESULT_PATH"

mv "$PACKAGE_STAGE" "$PACKAGE_DIR"
APP_PATH="$PACKAGE_DIR/$APP_NAME"
DMG_PATH="$PACKAGE_DIR/$DMG_NAME"
MANIFEST_PATH="$PACKAGE_DIR/package-manifest.json"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_PATH" >/dev/null \
  || die "published application signature verification failed"

printf 'app=%s\n' "$APP_PATH"
if [ "$MAKE_DMG" -eq 1 ]; then
  printf 'dmg=%s\n' "$DMG_PATH"
fi
printf 'manifest=%s\n' "$MANIFEST_PATH"
printf 'build_result=%s\n' "$PACKAGE_DIR/build-result.json"
