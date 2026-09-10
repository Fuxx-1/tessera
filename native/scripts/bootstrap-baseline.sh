#!/usr/bin/env bash
# Establish or verify the one-time G0 source baseline without touching source files.
set -euo pipefail

readonly EXPECTED_FILES=(
  package.json
  bun.lock
  index.html
  README.md
  load.md
  design.md
  iced-plan.md
  .gitignore
)
readonly EXPECTED_DIRECTORIES=(src public design scripts)
readonly RETAINED_SENTINELS=(
  package.json
  bun.lock
  README.md
  load.md
  design.md
  iced-plan.md
  src/App.tsx
  public/image-demo-architecture.svg
  design/README.md
  scripts/acceptance.mjs
)
readonly IGNORED_PROBES=(
  node_modules/__baseline_probe
  dist/__baseline_probe
  tmp/__baseline_probe
  tmp-repro/__baseline_probe
  .tmp-render-audit/__baseline_probe
  .tessera-evidence/__baseline_probe
  evidence/__baseline_probe
  target/__baseline_probe
  native/target/__baseline_probe
  coverage/__baseline_probe
  tsconfig.tsbuildinfo
  .DS_Store
  '}))'
)

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 64
}

usage() {
  cat >&2 <<'EOF'
Usage: bootstrap-baseline.sh --target /absolute/path/to/tessera

The target must be the Tessera source root, contain the supplied .gitignore,
and be an absolute path. The script never deletes or overwrites source files.
EOF
  exit 64
}

sha256_stdin() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
  else
    die 'Neither sha256sum nor shasum is available.'
  fi
}

manifest_hash() {
  git -C "$TARGET" ls-files -s -z | sha256_stdin
}

validate_source_layout() {
  local path

  for path in "${EXPECTED_FILES[@]}"; do
    [[ -f "$TARGET/$path" ]] || die "Missing required regular file: $TARGET/$path"
  done

  for path in "${EXPECTED_DIRECTORIES[@]}"; do
    [[ -d "$TARGET/$path" ]] || die "Missing required directory: $TARGET/$path"
  done
}

check_ignore_policy() {
  local path

  for path in "${IGNORED_PROBES[@]}"; do
    git -C "$TARGET" check-ignore --no-index -q -- "$path" ||
      die ".gitignore must exclude $path"
  done

  for path in "${RETAINED_SENTINELS[@]}"; do
    if git -C "$TARGET" check-ignore --no-index -q -- "$path"; then
      die ".gitignore must retain $path"
    fi
  done
}

require_clean_existing_repository() {
  git -C "$TARGET" rev-parse --verify HEAD >/dev/null 2>&1 ||
    die 'Existing Git repository has no committed HEAD; refusing to create or amend it.'

  git -C "$TARGET" diff --quiet ||
    die 'Existing Git repository has unstaged changes; commit or stash them before verification.'
  git -C "$TARGET" diff --cached --quiet ||
    die 'Existing Git repository has staged changes; commit or unstage them before verification.'

  if [[ -n "$(git -C "$TARGET" ls-files --others --exclude-standard)" ]]; then
    die 'Existing Git repository has untracked, nonignored files; commit or remove them before verification.'
  fi
}

verify_tracked_sentinels() {
  local path

  for path in "${RETAINED_SENTINELS[@]}"; do
    git -C "$TARGET" ls-files --error-unmatch -- "$path" >/dev/null 2>&1 ||
      die "Required retained source is not tracked: $path"
  done
}

print_result() {
  local mode="$1"
  local revision hash count

  revision="$(git -C "$TARGET" rev-parse --verify HEAD)"
  hash="$(manifest_hash)"
  count="$(git -C "$TARGET" ls-files | wc -l | tr -d '[:space:]')"

  printf 'baseline_status=%s\n' "$mode"
  printf 'target=%s\n' "$TARGET"
  printf 'revision=%s\n' "$revision"
  printf 'source_manifest_sha256=%s\n' "$hash"
  printf 'tracked_file_count=%s\n' "$count"
}

if [[ "$#" -ne 2 || "$1" != '--target' ]]; then
  usage
fi

case "$2" in
  /*) ;;
  *) die 'Target path must be absolute.' ;;
esac

[[ -d "$2" ]] || die "Target directory does not exist: $2"
TARGET="$(cd -P -- "$2" && pwd -P)"
[[ "$TARGET" != '/' ]] || die 'Refusing to operate on the filesystem root.'

command -v git >/dev/null 2>&1 || die 'git is required.'
validate_source_layout

if REPOSITORY_TOPLEVEL="$(git -C "$TARGET" rev-parse --show-toplevel 2>/dev/null)"; then
  REPOSITORY_TOPLEVEL="$(cd -P -- "$REPOSITORY_TOPLEVEL" && pwd -P)"
  [[ "$REPOSITORY_TOPLEVEL" == "$TARGET" ]] ||
    die "Target is nested in another Git work tree: $REPOSITORY_TOPLEVEL"

  check_ignore_policy
  require_clean_existing_repository
  verify_tracked_sentinels
  print_result 'verified-existing-git'
  exit 0
fi

if [[ -e "$TARGET/.git" || -L "$TARGET/.git" ]]; then
  die 'Git metadata exists but is not a usable work tree; refusing to replace it.'
fi

git init --quiet --initial-branch=main "$TARGET"
check_ignore_policy
git -C "$TARGET" add --all
if git -C "$TARGET" diff --cached --quiet; then
  die 'No nonignored files were eligible for the initial baseline commit.'
fi
git -C "$TARGET" \
  -c user.name='Tessera Baseline Bootstrap' \
  -c user.email='tessera-baseline@localhost.invalid' \
  commit --quiet --no-gpg-sign -m 'chore: establish G0 source baseline'

verify_tracked_sentinels
require_clean_existing_repository
print_result 'created-initial-git'
