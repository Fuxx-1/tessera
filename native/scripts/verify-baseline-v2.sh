#!/usr/bin/env bash
# Verify the supplemental G0 content-addressed manifest contract without touching source files.
set -euo pipefail
export LC_ALL=C

readonly EXPECTED_FILES=(
  package.json
  bun.lock
  tsconfig.json
  vite.config.ts
  index.html
  README.md
  load.md
  design.md
  iced-plan.md
  .gitignore
  native/docs/environment.md
  native/docs/baseline-run.md
  native/scripts/bootstrap-baseline.sh
  native/scripts/verify-baseline-v2.sh
)
readonly EXPECTED_DIRECTORIES=(src public design scripts native native/docs native/scripts)
readonly RETAINED_SENTINELS=(
  package.json
  bun.lock
  tsconfig.json
  vite.config.ts
  README.md
  load.md
  design.md
  iced-plan.md
  src/App.tsx
  public/image-demo-architecture.svg
  design/README.md
  scripts/acceptance.mjs
  native/docs/environment.md
  native/docs/baseline-run.md
  native/scripts/bootstrap-baseline.sh
  native/scripts/verify-baseline-v2.sh
)
readonly RETAINED_IGNORE_PROBES=(
  native/testkit/prototype.py
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
  cache/__g0_probe
  .app/__g0_probe
  coverage/__baseline_probe
  tsconfig.tsbuildinfo
  .DS_Store
  '}))'
  native/testkit/__pycache__/baseline.cache
  native/testkit/prototype.pyc
  native/testkit/prototype.pyo
  native/testkit/prototype.pyd
  fonts/x.woff2
)
readonly MANIFEST_ALGORITHM='sha256'
readonly MANIFEST_VERSION='2'
readonly MANIFEST_FORMAT='tessera-source-manifest-v2'

TARGET=''
TEMP_DIR=''
TMP_PARENT=''
CHECK_GIT_DIR=''
BOOTSTRAP_MARKER=''

cleanup() {
  local status=$?

  trap - EXIT HUP INT TERM

  if [[ -n "$TEMP_DIR" && -n "$TMP_PARENT" && -d "$TEMP_DIR" && "$TEMP_DIR" == "$TMP_PARENT/tessera-baseline-precheck."* ]]; then
    rm -rf -- "$TEMP_DIR" || :
  fi

  # This marker is written only after the target was proven to have no .git.
  # Never remove metadata unless the marker proves this run owns it.
  if [[ "$status" -ne 0 && -n "$BOOTSTRAP_MARKER" && -f "$BOOTSTRAP_MARKER" && "$BOOTSTRAP_MARKER" == "$TARGET/.git/.tessera-baseline-bootstrap."* ]]; then
    rm -rf -- "$TARGET/.git" || :
  fi

  exit "$status"
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 64
}

usage() {
  cat >&2 <<'EOF'
Usage: verify-baseline-v2.sh --target /absolute/path/to/tessera

The target must be the Tessera source root, contain the required historical
provenance and v2 records, and be an absolute path. The script never deletes
or overwrites source files. For a target without Git metadata it may establish
the initial baseline only after the full preflight passes.
EOF
  exit 64
}

require_sha256_tool() {
  command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 ||
    die 'Neither sha256sum nor shasum is available.'
}

sha256_stdin() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  else
    shasum -a 256 | awk '{print $1}'
  fi
}

# The v2 stream is deliberately independent of Git's object-id algorithm.
# Each record is raw Git path bytes, mode, decimal blob length, and SHA-256 of
# blob bytes, with every field NUL-terminated. The object ID below is only a
# transient handle for reading blob bytes; it is never included in the stream.
manifest_v2_hash() {
  local entry metadata path mode object stage size blob_hash
  local i j
  local -a paths=()
  local -a modes=()
  local -a objects=()

  while IFS= read -r -d '' entry; do
    [[ "$entry" == *$'\t'* ]] || die 'Malformed Git index entry while building manifest v2.'
    metadata="${entry%%$'\t'*}"
    path="${entry#*$'\t'}"
    IFS=' ' read -r mode object stage <<< "$metadata"
    [[ -n "$mode" && -n "$object" && "$stage" == '0' ]] ||
      die 'Manifest v2 requires ordinary stage-0 tracked files.'
    paths+=("$path")
    modes+=("$mode")
    objects+=("$object")
  done < <(git -C "$TARGET" ls-files -s -z)

  ((${#paths[@]} > 0)) || die 'No tracked files were available for manifest v2.'

  # Git index order is normally path order, but sort explicitly in the C locale.
  for ((i = 1; i < ${#paths[@]}; i++)); do
    path="${paths[i]}"
    mode="${modes[i]}"
    object="${objects[i]}"
    j=$((i - 1))
    while ((j >= 0)) && [[ "${paths[j]}" > "$path" ]]; do
      paths[j + 1]="${paths[j]}"
      modes[j + 1]="${modes[j]}"
      objects[j + 1]="${objects[j]}"
      j=$((j - 1))
    done
    paths[j + 1]="$path"
    modes[j + 1]="$mode"
    objects[j + 1]="$object"
  done

  {
    printf '%s\0' "$MANIFEST_FORMAT"
    for ((i = 0; i < ${#paths[@]}; i++)); do
      size="$(git -C "$TARGET" cat-file -s "${objects[i]}")" ||
        die "Unable to read blob length for: ${paths[i]}"
      [[ "$size" =~ ^[0-9]+$ ]] ||
        die "Invalid blob length for: ${paths[i]}"
      blob_hash="$(git -C "$TARGET" cat-file blob "${objects[i]}" | sha256_stdin)" ||
        die "Unable to hash blob bytes for: ${paths[i]}"
      [[ "$blob_hash" =~ ^[0-9a-f]{64}$ ]] ||
        die "Invalid blob SHA-256 for: ${paths[i]}"
      printf '%s\0%s\0%s\0%s\0' "${paths[i]}" "${modes[i]}" "$size" "$blob_hash"
    done
  } | sha256_stdin
}

validate_source_layout() {
  local path

  for path in "${EXPECTED_FILES[@]}"; do
    [[ -f "$TARGET/$path" ]] || die "Missing required regular file: $TARGET/$path"
  done

  for path in "${EXPECTED_DIRECTORIES[@]}"; do
    [[ -d "$TARGET/$path" ]] || die "Missing required directory: $TARGET/$path"
  done

  [[ -s "$TARGET/native/docs/environment.md" ]] ||
    die 'Missing required nonempty provenance record: native/docs/environment.md'
}

git_check_ignore() {
  local path="$1"

  if [[ -n "$CHECK_GIT_DIR" ]]; then
    GIT_DIR="$CHECK_GIT_DIR" GIT_WORK_TREE="$TARGET" git check-ignore --no-index -q -- "$path"
  else
    git -C "$TARGET" check-ignore --no-index -q -- "$path"
  fi
}

check_ignore_policy() {
  local path

  for path in "${IGNORED_PROBES[@]}"; do
    if ! git_check_ignore "$path"; then
      die ".gitignore must exclude $path"
    fi
  done

  for path in "${RETAINED_SENTINELS[@]}"; do
    if git_check_ignore "$path"; then
      die ".gitignore must retain $path"
    fi
  done

  for path in "${RETAINED_IGNORE_PROBES[@]}"; do
    if git_check_ignore "$path"; then
      die ".gitignore must retain source path pattern: $path"
    fi
  done
}

precheck_ignore_policy_without_target_git() {
  local candidate

  # TESSERA_TMPDIR makes test placement explicit. TMPDIR and TEMP preserve
  # native POSIX and Windows shell conventions; /tmp is the final fallback.
  candidate="${TESSERA_TMPDIR:-${TMPDIR:-${TEMP:-/tmp}}}"
  [[ -d "$candidate" ]] || die "Temporary root does not exist: $candidate"
  TMP_PARENT="$(cd -P -- "$candidate" && pwd -P)"
  case "$TMP_PARENT" in
    "$TARGET"|"$TARGET"/*) die 'Temporary root must be outside the target directory.' ;;
  esac

  TEMP_DIR="$(mktemp -d "$TMP_PARENT/tessera-baseline-precheck.XXXXXX")" ||
    die "Unable to create a precheck directory under $TMP_PARENT"
  git init --quiet "$TEMP_DIR/repository" || die 'Unable to initialize isolated Git metadata for precheck.'
  CHECK_GIT_DIR="$TEMP_DIR/repository/.git"
  [[ -d "$CHECK_GIT_DIR" ]] || die 'Isolated Git metadata was not created for precheck.'

  check_ignore_policy
  CHECK_GIT_DIR=''
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
  local revision hash count object_format

  revision="$(git -C "$TARGET" rev-parse --verify HEAD)"
  hash="$(manifest_v2_hash)"
  count="$(git -C "$TARGET" ls-files | wc -l | tr -d '[:space:]')"
  object_format="$(git -C "$TARGET" rev-parse --show-object-format)"

  printf 'baseline_status=%s\n' "$mode"
  printf 'target=%s\n' "$TARGET"
  printf 'revision=%s\n' "$revision"
  printf 'git_object_format=%s\n' "$object_format"
  printf 'source_manifest_algorithm=%s\n' "$MANIFEST_ALGORITHM"
  printf 'source_manifest_version=%s\n' "$MANIFEST_VERSION"
  printf 'source_manifest_sha256=%s\n' "$hash"
  printf 'tracked_file_count=%s\n' "$count"
}

initialize_new_repository() {
  mkdir "$TARGET/.git" || die 'Unable to reserve new Git metadata directory.'
  BOOTSTRAP_MARKER="$TARGET/.git/.tessera-baseline-bootstrap.$$.${RANDOM}"
  (umask 077; : > "$BOOTSTRAP_MARKER") || die 'Unable to mark newly created Git metadata directory.'

  git init --quiet --initial-branch=main "$TARGET"
  [[ -f "$BOOTSTRAP_MARKER" ]] || die 'Git initialization removed the ownership marker; refusing to continue.'

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

  rm -f -- "$BOOTSTRAP_MARKER" || die 'Unable to remove Git ownership marker.'
  BOOTSTRAP_MARKER=''
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
require_sha256_tool
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

# Validate every source and ignore-policy condition before creating target/.git.
precheck_ignore_policy_without_target_git
initialize_new_repository
