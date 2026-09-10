> Public snapshot: local machine paths were redacted. Historical records are not acceptance evidence for this public revision.

# Tessera Makepad Integration Log

Date: 2026-08-26

## Authority And Session

- Authority: `$HOME/Data/User/Project/.tessera-vws/tessera-authority.git`.
- Integration session: `makepad-integration-20260826`.
- Integration worktree: `$HOME/.git-vws/sessions/<session>/worktree`.
- Target branch: `work/makepad-integration-20260826`.
- Session base before integration: `5988d0f3fe44af20e5abc90900784cbaed4debaa`.
- `git-vws doctor` result before edits: `recovery_required=false`, `findings=0`, 36 retained items.

All native production integration commands and edits for this pass are limited to the session worktree above. No regular `git worktree`, main checkout edits, VWS metadata edits, VWS cleanup, or project-local Cargo target directories are used.

## Published Authority Refs

Relevant refs observed from the VWS authority before edits:

| ref | commit | disposition |
| --- | --- | --- |
| `main` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` | integration base |
| `work/makepad-exec-foundation-20260826` | `8e0e8ed2d33bd76cf2654122f18d491d4dc2da29` | published; merge/cherry-pick source |
| `work/makepad-exec-gallery-20260826` | `11a1224611ebfbceaeb05d823fd616af5fae6e8e` | published; merge/cherry-pick source |
| `work/makepad-exec-security-20260826` | `892733195d517f7615ae80bea08d3b930dc79b38` | published; merge/cherry-pick source |
| `work/makepad-exec-build-20260826` | `c8de11df5ff24228ac91b0b96c974391baf5c959` | published; no-commit integration source |
| `work/makepad-exec-plan-20260826` | `9b31816979311ae83ea184128f81e0c095fc6e4b` | published authority plan facts; read-only input for this pass |
| `work/makepad-m0-spike-20260826` | `80a9f7a7bf182c8a1043497b52032d281eb35748` | published M0 source fact; not production crate |
| `work/makepad-m0-evidence-20260826` | `a6ac16df3987a44fe83a0ea63577fdf22426c0e8` | published evidence contract; true runtime bundle still missing |
| `work/makepad-m0-integration-20260826` | `fec598c04f166989afeac8f06574a7ce5472f702` | published M0 integration report; remains `BLOCKED` |
| `audit/makepad-ax-20260826` | `e39c56e206dcf02004eb4ac5575750a7f3106f26` | read-only audit input; AX remains `BLOCKED` |
| `audit/makepad-ui-20260826` | `e4f71580453bac2c19a6c961edac73f8d510bcaa` | read-only audit input; UI/mobile remains `BLOCKED` |
| `audit/makepad-perf-20260826` | `c7b81ce082722124b0a1dd21a506970e9a814377` | read-only audit input; performance remains `BLOCKED` |
| `audit/makepad-security-20260826` | `69d94d980e14a20085a0855512e6f127e6204a68` | read-only audit input; security remains `BLOCKED` until runtime proof |
| `audit/makepad-test-20260826` | `68cfdb15f0ee726f6701faaa92268a68681ca243` | read-only audit input; contract mechanics do not prove runtime GUI |
| `audit/makepad-platform-20260826` | `45d3632a39e803a3e8798c76ad7f025804e36738` | read-only audit input; mobile/platform remains `BLOCKED` |

## Pending Sessions

The following active sessions were present without matching published authority refs at the start of this pass and are treated as pending handback inputs, not merge sources:

| session | target | base |
| --- | --- | --- |
| `makepad-exec-architecture-20260826` | `work/makepad-exec-architecture-20260826` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` |
| `makepad-exec-build-20260826` | `work/makepad-exec-build-20260826` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` |
| `makepad-exec-contract-20260826` | `work/makepad-exec-contract-20260826` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` |
| `makepad-exec-evidence-20260826` | `work/makepad-exec-evidence-20260826` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` |
| `makepad-m1-architecture-20260826` | `work/makepad-m1-architecture-20260826` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` |
| `makepad-m1-product-ui-20260826` | `work/makepad-m1-product-ui-20260826` | `5988d0f3fe44af20e5abc90900784cbaed4debaa` |

This integration pass does not assume content from those sessions exists in authority. The production hard cut therefore focuses on the already-published foundation, gallery, and security inputs, plus local root wiring needed to compile and validate the Makepad production graph.

## Integration Decisions

Integration audit: the no-commit sequence was foundation 8e0e8ed2d33bd76cf2654122f18d491d4dc2da29, gallery 11a1224611ebfbceaeb05d823fd616af5fae6e8e, security 892733195d517f7615ae80bea08d3b930dc79b38, core bf2297243914bc82a3d31b4c2edfe8e135a482b9, component manifest 98beae1bd71dcb4d564b292b0d4945d844eb2774, and evidence runner 3ae69c4972c9343482971defeeebe8f99c5eacaa. The earlier plan handback a848974b3bb76d871d2c31c59afce59d4d06aaa5 and final authority plan facts 9b31816979311ae83ea184128f81e0c095fc6e4b were read-only and were not cherry-picked because makepad-plan.md is outside this integration write set; the temporary conflict was resolved by retaining the session baseline.

The only production app entry is native/crates/tessera-gallery/src/main.rs, which invokes app_main!(App). The App implementation is hosted by gallery and imports reusable foundation, component, and security modules from tessera-makepad. tessera-makepad has no binary target, nested workspace, crate-local lockfile, or app entry. The old pending-only gallery binary is deleted.

The exact Makepad allowlist is makepad-widgets 2.0.0 from git revision 8b5caf41e1de9b93d396bedc379e16f601509503, with upstream default features empty, plus local tessera-core, tessera-makepad, and tessera-gallery at workspace version 0.1.0. This is the immediate successor to the M0 pin and only corrects the CoreMedia Boolean binding required to compile on Intel macOS. The locked upstream closure contains the precise chain makepad-network 1.0.0 -> makepad-script 1.0.0 -> makepad-html 1.0.0, and also makepad-script-std 1.0.0 through makepad-platform; these are allowed only as pinned upstream implementation dependencies. No Tessera production path accepts user or remote bytes as Live, Script, HTML, DOM, SVG, or shader input, and no Tessera module calls network, remote control, file, process, or dynamic resource APIs. This is static and negative-contract coverage only: mechanical hard-cut passes, while M1 runtime security remains NO-GO pending an explicit allowlist, reviewed call graph, and trusted runtime negative probes.

The reusable shell currently has fixed Live colors. App theme cycling updates typed status text but does not change the rendered palette. Light/Dark visual rendering is explicitly BLOCKED in this integration; no theme-support claim is made from labels. GUI, AX, IME, mobile, DPI, and performance evidence remain blocked.

- `tessera-core` stays renderer-independent and remains the only business state source.
- `tessera-makepad` is integrated as the only native UI/renderer library. It must not own a binary target, crate-local workspace, crate-local lockfile, or `app_main!` entry.
- `tessera-gallery` is integrated as the only Makepad app host and validation entry. Its pending-only binary is not accepted as the final production entry.
- The production workspace must resolve only `tessera-core`, `tessera-makepad`, and `tessera-gallery`.
- `tessera-iced` may remain on disk only as historical material until deletion evidence is complete; it must not be a workspace member, path dependency, dev dependency, build dependency, binary entry, or package input.
- Makepad upstream dependency closure currently includes `makepad-html`, `makepad-script`, and `makepad-network`. Unless a feature/fork cut removes them, this pass records an explicit allowlist boundary and keeps security as `NO-GO` for runtime release until the contract proves user or remote bytes cannot reach ScriptVm, HTML rendering, or network/file/process capability.
