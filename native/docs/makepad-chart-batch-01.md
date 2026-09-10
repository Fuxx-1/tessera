# Makepad Chart Batch 01

This dirty-session implementation batch moves `funnel-chart` and `gauge-chart`
off the legacy specialized wrapper. Each now has an independent public Makepad
widget, Live declaration, bounded configuration, local state reducer, native
draw path, keyboard and pointer handling, and a component-specific typed
action. Gallery detail slots reset and route each action through its own
component identity.

The shared `chart_common` module contains only Rust data fixtures, validation,
and deterministic geometry planning. It contains no widget, Live, draw, action,
or catalog identity API. The legacy renderer remains only for the eight charts
not yet migrated in this work sequence.

Verification on the managed external target used Rust 1.88.0 with
`cargo fmt --check`, `cargo test --locked -p tessera-makepad` (`142 passed`),
and `cargo test --locked -p tessera-gallery` (`43 passed`). The Makepad manifest
was not changed: all 101 entries remain blocked/deferred with no cases or
evidence references.

This batch has not produced sealed GUI, AX, IME, DPI, performance, or review
artifacts. It is implementation and runtime-wiring progress only, not visual
or interaction acceptance. The next batch migrates heatmap, mind map,
organization chart, pie chart, radar chart, sankey chart, treemap, and word
cloud, then removes the remaining shared chart renderer.
