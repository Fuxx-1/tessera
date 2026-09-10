# Full-native test gate

This directory owns the development-stage gate for the frozen 101-component
native contract. It does not change production crates or announce acceptance.

`frozen-registry-v1.json` is a test authority snapshot of the typed catalog.
Production identity comes only from `ComponentId` and its catalog mapping. The
validator derives fixed paths from each catalog row:

```text
tessera-iced/src/components/<group_snake>/<id_snake>.rs
tessera-gallery/src/examples/<group_snake>/<id_snake>/mod.rs
tessera-gallery/src/examples/<group_snake>/<id_snake>/integration.rs
```

`examples/dispatch.rs` must have one `example_registry!` construction entry per
`ComponentId`. `component_detail/mod.rs` owns only `DetailState` and proves all
catalog IDs construct; `main.rs` owns entry into that detail state. The catalog
display groups for all 15 Charts map to the single F7 `charts/` source group. A
component is not covered by a reducer-only file: it needs a real Iced `Element`
view or a drawable Canvas renderer. No private marker comments, `route.rs`, or
second production identity table are accepted.

Run the source gate with:

```sh
native/scripts/verify-full-native.sh --out /tmp/full-native-coverage.json
```

Run the gate's tests without creating source-tree bytecode with:

```sh
native/testkit/full-native/bin/test-full-native.sh -q
```

The command writes a machine-readable manifest and returns `2` while any source
or evidence gate is blocked. The current source is expected to remain blocked
during implementation.

The scene manifest contains 404 base visual cases (`101 x 4`), 101 long-text
cases, 101 keyboard/AX cases, motion lifecycle cases, overlay edge cases, and
chart 10k-data/cache cases. Keyboard cases require real physical or
platform-injected input, an AX tree with visible sidebar/internal controls, Tab
entry into the sidebar, and Enter activation of a catalog tile. State-only
claims cannot satisfy these cases.

`run-scenes.py` requires an absolute executable GUI capture hook. Without one it
returns `GUI_CAPTURE_HOOK_MISSING`, writes only a blocked JSON result, and never
creates a synthetic screenshot. A hook must write per-scene
`capture-result.json` using `tessera.full-native.capture/v1`, with a real PNG,
geometry JSON, revisioned evidence, and (for keyboard cases) AX/keyboard facts.

## macOS visual capture hook

`bin/capture-macos.sh` is the project-local macOS hook for the visual portion
of the contract. It never builds Gallery. The coordinating build task supplies
an existing absolute release executable through `TESSERA_GALLERY_BIN`; a
missing or non-executable path returns a blocked result. The hook translates a
visual scene into the existing deterministic startup arguments:

| Scene fact | Gallery argument |
| --- | --- |
| `component_id` | `--component <catalog-slug>` |
| `theme=dark` | `--dark` |
| `1240x800` | `--rail-qa` |
| `840x600` | `--compact-qa` |

The Swift harness locates the launched process's real layer-zero `CGWindowID`,
requiring a nontransparent rectangle that intersects the main display, takes
the PNG with `/usr/sbin/screencapture -l<window-id> -o`, and derives `surfaces`
only from contiguous opaque fills in that real PNG. The screen capture bounds
are not emitted as an internal surface. `geometry.json` uses physical PNG
pixels. Its `page_scroll_extent` means the observed visible page frame; the
hook does not claim an inaccessible off-screen scroll extent.

Gallery is launched with `posix_spawn` and `POSIX_SPAWN_SETPGROUP`; capture
continues only after `getpgid(pid) == pid`, and cleanup terminates that exact
group. A launch, window, permission, or capture failure writes a blocked result
with request and diagnostic provenance. `run-scenes.py` records that as
`CAPTURE_HOOK_BLOCKED`; it never dereferences absent evidence or treats the
blocked record as a capture.

Before every injected mouse-down, mouse-up, key-down, and key-up event, the
hook reactivates Gallery as needed and requires bounded consecutive observations
of the expected Gallery PID as the frontmost active application and the same
on-screen `CGWindowID`. Foreground interference exhausts the bounded retries
without sending the next event, and the blocked result records the expected and
last observed PID/window diagnostics.

When `TESSERA_GALLERY_APP` is supplied, the hook also requires the adjacent
`package-manifest.json` and `build-result.json`. It checks the app executable
hash against both files and binds the capture result and evidence to the dirty
or clean source-tree digest, Cargo lockfile hash, Rust toolchain, managed build
key/target/command, VWS session, and package/build-result hashes. Missing or
inconsistent package provenance is a blocked capture, not a fallback to an
unbound binary.

Run the first real Button visual capture with an external output directory:

```sh
capture="$PWD/native/testkit/full-native/bin/capture-macos.sh"
gallery=/absolute/path/to/tessera-gallery
TESSERA_GALLERY_BIN="$gallery" python3 native/testkit/full-native/bin/run-scenes.py \
  --capture-hook "$capture" \
  --out-dir /tmp/tessera-button-capture \
  --only FN-button-L-1240
```

Use the coordinating task's already-built release executable:

```sh
TESSERA_GALLERY_BIN=/absolute/path/to/tessera-gallery \
  "$PWD/native/testkit/full-native/bin/capture-macos.sh" \
  --scene /absolute/path/to/scene.json --out-dir /tmp/tessera-capture
```

The hook verifies a decodable, nonuniform PNG before it writes `captured` and
records the release binary SHA-256 as the evidence revision. `run-scenes.py`
requires every requested assertion to have an `observed` GUI fact; an explicit
`blocked` fact cannot be mistaken for acceptance. This hook does not claim
keyboard input, AX tree facts, focus visibility, performance, or off-screen
scroll geometry. Those unsupported observations remain `blocked` in
`evidence.assertion_facts` / `blocked_capabilities`; a keyboard/AX scene is
therefore intentionally not an acceptance result until a real macOS platform
injection and AX implementation exists. Failed launch, window discovery,
capture permission, PNG decode, or pixel geometry writes a blocked result and
exits nonzero. It never synthesizes a PNG or substitutes a window rectangle for
an internal surface.
