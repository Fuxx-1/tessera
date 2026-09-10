#!/usr/bin/env sh
# Keep Python caches outside the source tree while running this gate's tests.
set -eu
export PYTHONDONTWRITEBYTECODE=1
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 -m unittest discover -s "$script_dir/../tests" -p 'test_*.py' "$@"
