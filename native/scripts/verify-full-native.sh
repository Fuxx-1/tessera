#!/usr/bin/env sh
# Full-native coverage gate. It only writes the requested machine manifest.
set -eu
export PYTHONDONTWRITEBYTECODE=1

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
exec python3 "$repo_root/native/testkit/full-native/bin/validate-coverage.py" --repo-root "$repo_root" "$@"
