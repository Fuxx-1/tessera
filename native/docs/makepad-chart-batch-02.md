# Makepad Chart Batch 02

This dirty-session implementation batch completes the independent native
Makepad chart migration for `heatmap`, `mind-map`, `organization-chart`,
`pie-chart`, `radar-chart`, `sankey-chart`, `treemap`, and `word-cloud`.
Together with batch 01, all fifteen chart routes now resolve through explicit
component-owned widgets in `ChartSurfaceCatalog`.

Each chart owns its public widget, Live declaration, bounded configuration,
local state reducer, native draw path, keyboard and pointer handling, typed
action, and Gallery detail slot/reset wiring. `chart_common` remains a pure
Rust helper for bounded fixtures, validation, sampling, and geometry. The
legacy `TesseraChartSurface`, `ChartKind`, `ChartSurfaceAction`, and
`chart_specialized` production paths were removed; the smoke mapping now
probes only the independent widgets.

Verification on the managed external target used Rust 1.88.0:

- `cargo fmt --check`
- `cargo test --locked -p tessera-makepad -p tessera-gallery` (157 Makepad and
  43 Gallery tests passed)
- `python3 -m unittest native/testkit/tests/test_makepad_component_smoke.py`
  (20 tests passed)

The Makepad component manifest was not changed: all 101 rows remain
`blocked/deferred` with empty case and evidence references. This work has no
sealed same-revision GUI, AX, IME, DPI, performance, or human review artifacts.
It is implementation and runtime-wiring progress only, not visual,
interaction, or product acceptance.
