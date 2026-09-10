# Tessera Makepad Product Acceptance
Status: `BLOCKED` for all 101 components until individually supported by
reviewed runtime evidence.

The inventory is defined by `ComponentId` in
[`tessera-core/src/catalog.rs`](../crates/tessera-core/src/catalog.rs).
It contains Base 75, Business 11 and Charts 15. This document is the current
Makepad acceptance contract; inventory registration and build success do not
establish product acceptance.

## Per-Component Requirements
Each component requires a real Makepad widget, its own Gallery detail route,
fixture reset, state and boundary behavior, and a compile-checked integration
example. Evidence must identify the exact source revision, release binary and
Cargo lockfile hashes, platform, renderer, font, scale and commands used.

Review real Light/Dark output at `1240x800` and `840x600`, plus supported
system and application scales. Record screenshots, physical geometry, review
results and scene-local performance measurements. Check long CJK/emoji text,
unbroken tokens, overflow, focus visibility, disabled/read-only/loading/error/
empty states and recovery.

Interaction evidence must come from real platform input. Cover Tab/Shift+Tab,
Enter/Space, navigation keys and Escape where applicable. Text entry also
requires CJK IME composition, commit, undo and selection. Overlays require
placement, collision handling, closing policy and opener focus restoration.
Animated components require bounded active work, hidden/minimized idle and
reduced-motion behavior. Charts and large collections require bounded rendering,
deterministic selection and exact text or table fallback.

Untrusted text, URLs, files, clipboard content, Markdown, Mermaid and chart
data require explicit validation and visible denial/recovery. Trusted UI
registration through Makepad's script API does not authorize arbitrary user
content as executable UI. Runtime security acceptance requires separate evidence.

## Current Decision
No complete sealed per-component GUI acceptance is asserted for this branch.
All 101 components remain blocked for product acceptance until reviewed one by
one. State-only tests, generated scenes, route smoke results and static scans
cannot upgrade a component to verified.

Historical manifests and verification tools are available at
[the pre-cleanup revision](https://github.com/Fuxx-1/tessera/tree/b34327a63b61291e9c12175c30f62dd33f977e5e/native/testkit).
They are archived engineering records, not evidence for the current source
revision. Removing them from the active tree does not resolve their pending
GUI, accessibility, performance or security findings.

Release CI verifies source identity, packaging and Rust tests. The published
platform manifest records `gui_acceptance: not-asserted`. Preview publication
must preserve this distinction.
