# Makepad Component Smoke

`native/testkit/makepad_component_smoke.py` exercises the native Gallery's
101 catalog routes through Makepad's built-in `--remote` HTTP protocol. It is
intended to catch startup, selection, surface wiring, click-dispatch, theme and
shutdown regressions without retaining hundreds of screenshots or creating an
unbounded Cargo target directory.

It is deliberately not a sealed product-acceptance runner. A successful smoke
report proves only the checks listed below. It does not change a component's
status in `makepad-component-manifest-v1.json`, does not generate evidence
records, and does not satisfy GUI visual review, accessibility, IME, mobile,
DPI, security, performance or soak gates.

## Runtime Checks

For every requested component and theme, the runner:

1. launches the exact release binary with `--component=<slug>` and a bounded
   `--viewport=<width>x<height>`, or launches a macOS `.app` through
   LaunchServices using `open -n`;
2. verifies that Makepad exposes exactly one window at that viewport;
3. verifies the rendered category metadata ends in the requested component
   slug, then verifies the visible `component_surface`, `surface_status` and
   resolved theme status;
4. requires a connected route to expose its declared concrete Makepad widget,
   while recording an unconnected route as explicit `route_fallback`; the latter
   is a route smoke result only and never a component implementation pass;
5. injects a real pointer click into `Run sample` for connected routes and
   requires the resulting status to contain the selected component and a run
   count. Blocked routes must retain a blocked action status;
6. rejects remote logs containing Makepad error lines; and
7. finishes every process with `/gq`, retaining no remote captures unless
   `--capture` was explicitly requested.

The default mode creates only `smoke-report.json`. `/gq` necessarily creates a
short-lived Makepad PNG while it exits; the runner removes that process-owned
temporary directory unless `--capture` is set. Reports belong outside the
source tree, normally under `~/Library/Application Support/Tessera/evidence`.

`--app` validates the bundle's `Info.plist` and declared executable, starts
each case through macOS LaunchServices, binds the process PID reported by the
local Makepad endpoint, and exits through `/quit` without capture artifacts.
It is the required mode for an installable `.app` or mounted DMG smoke run.
`--capture` is intentionally rejected with `--app`, because it would couple
the installability gate to transient screenshot directories.

## Example

```sh
BIN="$HOME/Library/Caches/tessera/builds/tessera-makepad-dmg-startup-20260827/current/target/release/tessera-gallery"
OUT="$HOME/Library/Application Support/Tessera/evidence/78e5d62a91c48e2e02d34845c7825eca26a4949f/SMOKE-<UTC>"

python3 -B native/testkit/makepad_component_smoke.py \
  --binary "$BIN" \
  --out "$OUT" \
  --themes light,dark \
  --viewport 1240x800
```

For an app bundle or mounted DMG, use the same contract through LaunchServices:

```sh
APP="/Volumes/Tessera Makepad/Tessera Makepad.app"
OUT="$HOME/Library/Application Support/Tessera/evidence/78e5d62a91c48e2e02d34845c7825eca26a4949f/APP-SMOKE-<UTC>"

python3 -B native/testkit/makepad_component_smoke.py \
  --app "$APP" \
  --out "$OUT" \
  --themes light,dark \
  --viewport 1240x800
```

Use `--limit 1` while changing the runner, `--capture` only for a bounded
visual-debug run, and `--require-product-acceptance` only in a release gate.
The latter must fail until the manifest is fully verified with sealed evidence.

## Interpretation

`smoke_passed=202/202` is not `101/101 accepted`: it only means both light and
dark smoke runs completed for every catalog route. The report's
`surface_check_modes` field separately counts concrete native surfaces and
route fallbacks. `product_acceptance` remains `blocked` whenever the manifest
is not fully verified or a smoke run fails. This separation prevents catalog
entries, route startup and blocked surfaces from being misrepresented as
production component acceptance.
