# ADR-0002: `design/tokens.toml` is the cross-platform token authority

- Status: Accepted and implemented
- Date: 2026-08-19
- Owner: design-system owner
- Related: [UI specification](../ui-spec.md), [architecture](../architecture.md), [complexity ledger](../complexity-ledger.md)

## Context

Tessera previously carried equivalent token values in the Web stylesheet, a TypeScript object, and a Rust `Tokens` table. Those independent copies had already drifted: Web used transparent tertiary and focus values while the native UI contract froze opaque theme values and an explicit focus-gap contract.

## Decision

`design/tokens.toml` is the only hand-authored token source. It contains only currently consumed semantic colors, status triplets, typography, geometry, shadows, and motion constants. The native UI specification wins whenever older Web foundations disagree.

Run the only generation command from the repository root:

```sh
python3 scripts/generate-tokens.py
```

It deterministically projects the TOML source into these owned outputs:

```text
src/styles.css                                  generated token marker block only
src/theme/tokens.ts                             complete generated TypeScript projection
native/crates/tessera-iced/src/tokens.rs        complete generated Rust projection
```

Each projection carries a generated header with the SHA-256 of `design/tokens.toml`. The generator reads TOML structurally, rejects missing or unknown schema fields, emits ASCII for generated content, and never treats an output as an input or fallback source.

Use this non-mutating gate in CI and before review:

```sh
python3 scripts/generate-tokens.py --check
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_generate_tokens.py
```

`--check` exits nonzero when any of the three projections drifts. The focused test covers schema rejection, deterministic output/hash, the Light/Dark text and focus contracts, status foreground/soft-background composition, and the disabled surface contract.

## Consequences

- `src/styles.css` has one delimited generated token block; all CSS outside that marker is user-authored stylesheet content and the generator does not rewrite it.
- `src/theme/tokens.ts` and `native/crates/tessera-iced/src/tokens.rs` no longer contain hand-maintained equivalent token definitions or alternate value paths.
- The generated Rust `Tokens` structure retains existing public fields and adds only schema-backed semantic fields, so existing native callers continue to compile without a CSS or DOM dependency.
- `text_secondary`, `text_tertiary`, `text_quaternary`, `text_disabled`, `accent_text`, `link_text`, `focus_gap`, and `focus_ring` are opaque values. `focus_gap` remains the fixed direct neighbor of the 2 DIP focus ring.
- Disabled UI uses the explicit `text_disabled + surface_muted + border_light` state and is tested against that actual surface. It is not reported as a WCAG inactive-control exemption.

## Dark danger accessibility closure

The previous Dark `danger` triplet was release-blocked because `#f0786f` over `#f0786f24` composited on `#303030` measured only `3.874:1`, and the focused test hid that failure with `expectedFailure`. The revised frozen triplet is `#f0786f / #f0786fb3 / #f0786f08` (`fg / border / bg`). It preserves the restrained foreground red used by danger text, status marks, and filled controls while reducing only the soft wash and strengthening the boundary.

On the actual Dark surface, the soft background composites to `#363232` and the border to `#b7635c`. The foreground measures `4.581:1` on the soft background, `4.790:1` on surface, and `6.444:1` on canvas; the composited border measures `3.099:1` against surface. These are ordinary mandatory assertions in `scripts/test_generate_tokens.py`; there is no expected-failure, skip, xpass, or lowered threshold path. This ADR remains Accepted only while the focused test and all three generated projections pass their non-mutating gates.
