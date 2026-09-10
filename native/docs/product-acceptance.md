# Tessera Makepad Product Acceptance

Status: `FROZEN_REQUIREMENTS / BLOCKED`
Authority: Makepad only
Scope: the 101 entries in `native/testkit/makepad-component-manifest-v1.json`

This is the canonical product-acceptance contract for the native Makepad path. The Iced
document under `native/docs/full-native/product-acceptance.md` is historical and is not an
authority for Makepad implementation or release decisions.

## Acceptance identity

Every `ComponentId` is one independent acceptance row. The row identity is the catalog slug,
and the only valid destination is `ComponentDetail(ComponentId)`. A catalog tile, a shared shell,
a generic preview, a state-only reducer test, or a scene manifest is not a component
implementation and cannot close a row.

Each row must bind all of the following to one source revision and one managed release binary:

1. A real Makepad widget and component-owned state/event/draw path at
   `native/crates/tessera-makepad/src/components/<id_snake>.rs`.
2. A Gallery detail route, independent fixture reset, Back action, opener-focus return, and a
   compile-checked integration sample at `native/crates/tessera-gallery/src/`.
3. A bounded evidence cell at
   `native/testkit/makepad-evidence-runner/fixtures/components/<id>.json` and a corresponding
   matrix entry. The smoke runner may report startup and dispatch only; it never creates product
   evidence or changes manifest status.
4. One manifest row with `strategy=native-direct` or `native-recompose`, `status=verified`, at
   least one case ID, and sealed evidence references. Until every item is sealed, the row stays
   `blocked` or `planned`.

`native-direct` means the behavior is implemented by a native Makepad widget. `native-recompose`
means a Web-only mechanism is replaced by a named native equivalent, such as an anchored overlay,
bounded text viewer, or native Canvas surface. It is still a real implementation and is not a
fallback exemption.

## Required evidence

The evidence runner must capture real GUI output from the release binary. Synthetic screenshots,
route-only records, copied source text, and reducer-only results are rejected. Each applicable row
must include metadata, PNG, physical geometry, performance sidecar, evidence review, and keyboard
or accessibility trace, all sealed under the same revision, binary digest, build ledger, and VWS
session identity.

The visual matrix covers Light and Dark at `1240x800` and `840x600`, with system scale
`100/125/150/200%` and application scale `1.0/1.25/1.5` where supported. Review includes overflow,
CJK and emoji text, an unbroken URL-like token, long prose, disabled/read-only/error/loading/
empty/recovery states, visible focus, reading order, and mobile viewport boundaries where claimed.

Interactive rows require platform-injected `Tab`, `Shift+Tab`, `Enter`, `Space`, arrow,
`Home`, `End`, and `Escape` behavior as applicable. Text entry additionally requires CJK IME
preedit/commit/undo and selection evidence. Overlay rows require typed placement, collision policy,
focus trap, Escape/outside/explicit close, and opener-focus restoration. Animated rows require
visible-active frame bounds, hidden/minimized idle, reduced-motion behavior, and a bounded soak.
Chart and large-data rows require bounded input, visible plus overscan complexity, deterministic
selection, exact textual fallback, and raw performance samples.

## Security and release gates

User, remote, clipboard, file, and network bytes must remain outside ScriptVm, HTML, DOM, raw SVG,
shader, and dynamic-resource paths. External effects use the typed action broker and explicit
allowlist. Plain text, URLs, images, uploads, Markdown, Mermaid, and chart labels are validated
before layout or rendering; denial and over-limit states remain visible and recoverable.

The managed target is content-addressed under the configured Tessera cache. Source-tree `target`,
temporary `/tmp` targets, ordinary Git worktrees, mixed lockfiles, and mismatched evidence roots
invalidate the release gate. `cargo check` or a successful smoke run proves build/startup only;
it never upgrades a row to `verified`.

## Current decision

The inventory currently contains 101 `blocked/deferred` rows and no sealed GUI evidence. This is
intentional fail-closed state. Product acceptance remains blocked until rows are completed one at
a time and independently reviewed. No static source check may be reported as visual, interaction,
accessibility, performance, or release acceptance.
