#!/usr/bin/env sh
# Hand an already-built release Gallery to the macOS-only GUI harness.
# Capture must never trigger a release build: the release artifact is owned by
# the coordinating build task and is supplied explicitly through the env var.
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ "$(uname -s)" != "Darwin" ]; then
    echo "capture-macos.sh requires macOS" >&2
    exit 64
fi

gallery_bin=${TESSERA_GALLERY_BIN:-}
case "$gallery_bin" in
    /*) ;;
    *)
        echo "TESSERA_GALLERY_BIN must name the coordinating task's absolute release executable; capture never builds Gallery" >&2
        exit 64
        ;;
esac
if [ ! -x "$gallery_bin" ]; then
    echo "TESSERA_GALLERY_BIN is not executable: $gallery_bin" >&2
    exit 66
fi

gallery_app=${TESSERA_GALLERY_APP:-}
if [ -n "$gallery_app" ]; then
    case "$gallery_app" in
        /*) ;;
        *)
            echo "TESSERA_GALLERY_APP must name an absolute managed .app bundle" >&2
            exit 64
            ;;
    esac
    if [ ! -d "$gallery_app" ] || [ "${gallery_app##*.}" != "app" ]; then
        echo "TESSERA_GALLERY_APP must name an existing .app bundle: $gallery_app" >&2
        exit 66
    fi
    bundled_bin="$gallery_app/Contents/MacOS/tessera-gallery"
    if [ ! -x "$bundled_bin" ]; then
        echo "TESSERA_GALLERY_APP does not contain an executable tessera-gallery: $gallery_app" >&2
        exit 66
    fi
    if [ "$(cd -- "$(dirname -- "$gallery_bin")" && pwd -P)/$(basename -- "$gallery_bin")" != "$(cd -- "$(dirname -- "$bundled_bin")" && pwd -P)/$(basename -- "$bundled_bin")" ]; then
        echo "TESSERA_GALLERY_BIN must be the executable inside TESSERA_GALLERY_APP" >&2
        exit 64
    fi
    exec /usr/bin/swift "$script_dir/capture-macos.swift" --gallery "$gallery_bin" --gallery-app "$gallery_app" "$@"
fi

exec /usr/bin/swift "$script_dir/capture-macos.swift" --gallery "$gallery_bin" "$@"
