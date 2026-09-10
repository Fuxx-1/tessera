# LEGACY: Tessera Iced Full-Native Product Acceptance

> This document is historical Iced acceptance material. It is not the Makepad product
> acceptance authority. Use `native/docs/product-acceptance.md` and the Makepad manifest for the
> current native path.

Status: `FROZEN_REQUIREMENTS / NOT_ACCEPTED`
Date: 2026-08-19
Owner: Product expert
Write scope: this file only

## 1. Purpose, truth source, and current conclusion

This is the acceptance contract for implementing every one of the 101 entries in the Web
registry as an Iced-native product capability. It is not a directory mapping and it is not an
implementation status report. The normative input is `src/docs/componentRegistry.ts`; names,
category membership, and the 101-entry count are cross-checked against
`native/crates/tessera-core/src/catalog.rs`. Product, rendering, state, capacity, platform, and
evidence limits are inherited from `iced-plan.md`.

The current gallery maps all 101 registry IDs, but it does not yet satisfy this contract: a tile
is not a clickable independent component detail page, and a generic control showcase is not a
runnable implementation of each component. Therefore every entry below is currently
`NOT_ACCEPTED`. Neither `Ready`, `Recompose`, `Deferred`, a Web `production` flag, a catalog
tile, a screenshot, nor a documentation-only page may be used as a completion claim.

The native implementation is a sibling renderer. It must use Rust/Iced `Element`, typed state,
typed messages, `Task`, Canvas/path rendering where applicable, and the native Overlay Host. It
must not use WebView, Chromium, HTML, JSX, DOM, CSS, SVG DOM, or a copied Web runtime state.

## 2. Global acceptance contract for every detail page

For every table row, the Gallery must expose a unique logical destination
`ComponentDetail(ComponentId)` reached by pointer click and `Enter` from the component catalog.
The detail page must have a visible heading, a Back action, a stable component ID, and an
independent state fixture. Back returns focus to the originating catalog tile; a direct startup
fixture for that ID is also required for deterministic review. No entry may share a catch-all
detail page or borrow another component's demo.

Each detail page must contain all of the following at the same native revision as the component:

1. A runnable native demonstration with user-driven state changes. A static mock, an image, or a
   disabled-only preview fails.
2. A compile-checked integration sample showing the public Rust import, typed configuration or
   builder, controlled value/state, `Message` mapping, `update` handling, and the `Element`
   returned to a host. The sample must be extracted from, or compiled alongside, the demo; it may
   not be pseudocode or a second implementation.
3. A state-and-boundary panel naming supported states, unsupported behavior, capacity limits,
   failure recovery, and the evidence IDs still required. `N/A` is permitted only when a Web
   mechanism has no desktop meaning; the panel must name the native replacement and its
   equivalent visible effect.
4. A visible "integration code" action that shows source with horizontal scrolling for
   unbreakable tokens, line wrapping for prose, and keyboard-copy through the External Action
   Broker. Clipboard denial or write failure remains visible and does not imply copy success.

All pages are reviewed at Light and Dark, `1240x800`, `840x600`, system scale
`100/125/150/200%`, and application scale `1.0/1.25/1.5`. The required review string contains
CJK, emoji, a 2,048-character unbroken URL-like token, a 4,096-character paragraph, and a
numeric column wider than the content region. Text must wrap, ellipsize only with a focusable
full-value disclosure, or use local horizontal scrolling; it must never overlap, clip silently,
resize surrounding controls, or hide the focus ring.

Every interactive demo is keyboard-operable with a visible focus location. `Tab` and
`Shift+Tab` follow visual reading order; `Enter`/`Space` invoke the focused command; `Escape`
closes only the current overlay and returns focus; arrow/Home/End semantics are specified below
where relevant. IME preedit and committed CJK text must not be treated as duplicate input.
Disabled controls neither mutate state nor emit actions. Async content uses exactly
`Loading | Refreshing | Ready(T) | Empty | Failed(E)` with a cancellable generation; stale
completion is ignored.

No permanent subscription, polling loop, or redraw is allowed. An animation can request frames
only while it is both visible and active, pauses when unfocused/minimized, and reduces to an
immediate final state under reduced motion. This applies especially to Carousel, Skeleton, Spin,
BorderBeam, tour transitions, charts, and any loading decoration.

## 3. Status notation, capacities, and N/A rule

`N` means a direct native product implementation. `R` means the Web mechanism is not applicable
on desktop and is recomposed as the explicitly stated native equivalent. `R` is still required
work and is accepted only when the equivalent effect is runnable, documented, and evidenced.
There is no `Deferred` completion state in this contract.

State shorthand used in the matrix: `D` disabled/read-only where meaningful; `E` empty/zero
result; `X` recoverable failure; `L` loading/refreshing; `T` long or unbreakable text; `V` large
data or input bound. A dash means the state has no meaningful independent product state, not
that it was skipped; the row names the required equivalent instead.

Unless a row defines a stricter limit, simple collections are capped at 500 rendered items; Tree
uses 800 visible nodes before `VirtualTree`; Table/List large-data work uses a virtual provider.
DataGrid/VirtualList/VirtualTree must remain `O(visible + overscan)`, with 8--64 row overscan,
stable IDs, fixed row height, and no full-data work in input, scroll, layout, or view. DataGrid's
acceptance boundary is 1,000,000 logical rows x 50 columns from 256-row asynchronous pages.
Images, SVG, Markdown, URLs, clipboard, drag-and-drop, and external actions retain the security
limits in `iced-plan.md`; an invalid or over-limit input must remain a visible, recoverable error.

## 4. Completion and machine verification

An individual row may become `ACCEPTED` only when its independent detail route, runnable demo,
compiled integration sample, state/boundary panel, applicable state matrix, keyboard trace,
Light/Dark and two-window visual evidence, scale/text evidence, capacity/failure evidence,
security evidence, and applicable platform evidence all point to one native revision. All gates
in `iced-plan.md` remain release gates; an accepted component does not grant platform GA.

The table is the machine-readable inventory: the first column is the sole occurrence of each
acceptance ID. Its 101 rows must be exact and unique. A CI check may use:

```sh
doc=native/docs/full-native/product-acceptance.md
test "$(rg --no-filename -o 'TICED-PA-BASE-[0-9]{3}' "$doc" | wc -l | tr -d ' ')" = 75
test "$(rg --no-filename -o 'TICED-PA-BIZ-[0-9]{3}' "$doc" | wc -l | tr -d ' ')" = 11
test "$(rg --no-filename -o 'TICED-PA-CHART-[0-9]{3}' "$doc" | wc -l | tr -d ' ')" = 15
test "$(rg --no-filename -o 'TICED-PA-(BASE|BIZ|CHART)-[0-9]{3}' "$doc" | sort | uniq | wc -l | tr -d ' ')" = 101
test "$(rg --no-filename -o 'TICED-PA-(BASE|BIZ|CHART)-[0-9]{3}' "$doc" | sort | uniq -d | wc -l | tr -d ' ')" = 0
```

| Category | Registry count | Required native detail pages | Completion rule |
| --- | ---: | ---: | --- |
| Base | 75 | 75 | Every row below is independently accepted; foundation entries have a runnable host/configuration fixture. |
| Business | 11 | 11 | Every composition has a native workflow fixture; no business behavior is hidden in a generic base demo. |
| Charts | 15 | 15 | Every chart has Canvas/native-path output, exact-value fallback, hit/focus behavior where interactive, and sampled/over-limit behavior. |
| Total | 101 | 101 | Zero duplicate IDs, zero missing registry IDs, zero `Deferred`, and all 101 rows accepted. |

## 5. Base components (75)

| Acceptance ID | Registry ID / form | Frozen native definition and minimum behavior | Required runnable effect, integration code, and keyboard path | States and boundaries |
| --- | --- | --- | --- | --- |
| `TICED-PA-BASE-001` | `button` / N | Typed command button with primary, secondary, ghost, and danger variants; emits once per activation. | Demo invokes and records each variant; sample maps `Button::on_press` to host `Message`; Tab then Enter/Space activates. | D ignores input; X is host action failure feedback; T labels ellipsize with full disclosure; V has one action, not a menu. |
| `TICED-PA-BASE-002` | `float-button` / R | Shell-pinned quick action with stable edge offsets, safe-area avoidance, and no CSS fixed positioning. | Demo pins an add action while content scrolls; sample shows overlay-host slot; Tab/Enter invokes and Escape never hides it. | D remains visible but inert; X is action failure; T uses tooltip/disclosure; V caps the stack at 5 then exposes an overflow menu. |
| `TICED-PA-BASE-003` | `icon` / N | Named, sized native vector/raster icon with semantic label when actionable or status-bearing. | Demo changes size/color/status; sample uses typed icon ID, no arbitrary SVG string; labeled icon button is keyboard-invocable. | D inherits owner state; E is a deterministic missing-icon fallback; X records asset failure; T is label only; V has bounded icon cache. |
| `TICED-PA-BASE-004` | `typography` / N | Tokenized headings, body, code, keyboard mark, link-like action, ellipsis, and copyable text. | Demo switches each role and reveals full ellipsized text; sample binds token role and copy action; Tab reaches disclosure/copy. | D applies only to action text; E is empty placeholder; X is clipboard failure; T exercises CJK/URL; V caps syntax-free text layout cache at 8,000 entries. |
| `TICED-PA-BASE-005` | `divider` / N | Horizontal/vertical semantic visual separator with optional readable label. | Demo changes direction and label; sample shows layout composition; no tab stop unless labeled control is interactive. | D/E/X/L are N/A visual states; T label wraps without crossing rule; V is bounded by parent layout, never a scrolling data owner. |
| `TICED-PA-BASE-006` | `flex` / N | Native row/column layout with gap, alignment, wrap, and shrink priorities. | Demo changes axis and wrap at both windows; sample shows typed layout builder; keyboard follows rendered order. | D/E/X/L are child-owned; T forces wrapping/shrinking; V caps child measurement to visible/virtualized owner, never eagerly lays out unbounded children. |
| `TICED-PA-BASE-007` | `grid` / N | Deterministic desktop grid with explicit tracks, gaps, spans, and min/max constraints. | Demo changes columns and span; sample declares tracks rather than CSS grid; Tab order follows row-major reading order. | D/E/X/L are child-owned; T exercises min-content overflow; V caps displayed cards at 500 unless a virtual owner supplies rows. |
| `TICED-PA-BASE-008` | `layout` / N | Application page skeleton for header, side rail/drawer, content, and footer. | Demo switches 1240 shell to 840 rail/drawer; sample wires child regions; keyboard can reach all visible regions. | D is region action state; E is empty content region; X is content failure; T scrolls content only; V delegates datasets to virtual children. |
| `TICED-PA-BASE-009` | `masonry` / R | Native measured-column masonry layout; no CSS columns. | Demo lays out unequal cards and reflows on width change; sample exposes item measurement and placement; keyboard order follows source order, not visual zigzag. | D/E/X/L are item-owned; T changes item height safely; V max 500 measured cards, then requires paged/virtual composition. |
| `TICED-PA-BASE-010` | `space` / N | Token-based fixed or flex spacer that cannot become an invisible action target. | Demo toggles 4pt gap values; sample uses `Space`/token, no magic pixels; no keyboard focus. | D/E/X/L/T are N/A; V is bounded by parent layout and cannot create unbounded fill recursion. |
| `TICED-PA-BASE-011` | `splitter` / N | Two-pane resizer with min/max, persisted logical ratio, pointer drag, and keyboard resize. | Demo drags and uses arrow keys after focus; sample maps ratio change; Home/End snap to bounds and Escape cancels active drag. | D locks divider; E/X/L are child-owned; T preserves each pane minimum; V has exactly two panes in MVP, nested layouts are explicit composition. |
| `TICED-PA-BASE-012` | `anchor` / R | Scroll-container section navigator with native section IDs and active-location indication, not URL hashes. | Demo jumps to long-page sections; sample maps section target; Up/Down moves anchor items, Enter scrolls, focus remains reachable. | D disables unavailable target; E shows no sections; X shows missing target/retry; T truncates labels with disclosure; V supports 200 sections then searchable list. |
| `TICED-PA-BASE-013` | `breadcrumb` / N | Hierarchical path with selectable ancestors and current non-actionable endpoint. | Demo navigates two ancestors; sample maps path IDs; Left/Right moves items and Enter activates eligible ancestor. | D locks ancestor; E is root-only path; X is navigation failure; T collapses middle path into keyboard menu; V shows first/current plus overflow after 5 levels. |
| `TICED-PA-BASE-014` | `dropdown` / R | Trigger plus native overlay action menu managed solely by Overlay Host. | Demo opens at each window edge and flips placement; sample maps trigger/action; Enter/Space opens, arrows navigate, Escape closes/returns focus. | D trigger/items inert; E shows disabled "No actions" row; X action failure stays visible; T wraps menu labels; V caps 100 actions then filters. |
| `TICED-PA-BASE-015` | `menu` / N | Vertical/horizontal navigation and grouped command menu with selected state and submenus. | Demo includes group, disabled item, submenu; sample maps selected ID; arrows/Home/End navigate, Right opens submenu, Escape returns. | D item inert; E shows no destinations; X routes action error; T horizontal menu exposes overflow; V virtual/filter after 200 items. |
| `TICED-PA-BASE-016` | `pagination` / N | Controlled current page, page size, next/previous, direct page entry, and total result semantics. | Demo changes page and size; sample maps `PageChanged`; Left/Right and Home/End navigate; input commits with Enter. | D at first/last; E total zero shows page 0 of 0; X preserves current page/retry; T numeric labels do not resize; V supports 64-bit total without materializing pages. |
| `TICED-PA-BASE-017` | `steps` / N | Read-only or navigable workflow steps with waiting, active, complete, error, and disabled stages. | Demo advances/retries an error stage; sample maps step ID; arrows move focus, Enter only activates permitted stage. | D locked stages inert; E shows no steps; X error stage exposes reason; T wraps descriptions; V shows 100 steps in scrollable/compact form. |
| `TICED-PA-BASE-018` | `tabs` / N | Controlled single-selected content panels with lazy panel mounting and overflow management. | Demo changes panels and preserves per-panel state; sample maps selected ID; Left/Right/Home/End select, Ctrl+PageUp/PageDown optional. | D tab is skipped; E selected panel empty; X panel failure/retry; T truncates labels with full label access; V overflow/focus menu after 12 tabs. |
| `TICED-PA-BASE-019` | `auto-complete` / R | Controlled input plus asynchronous native candidate overlay with generation-safe filtering. | Demo types, loads, selects, and clears a candidate; sample maps query/selection; Down opens list, arrows navigate, Enter commits, Escape closes. | D read-only/inert; E "No matches" retains query; X retry keeps text; T supports IME/URL input; V renders 50 candidates with paging/virtual list beyond. |
| `TICED-PA-BASE-020` | `cascader` / R | Hierarchical path selector with lazy child loading and native multi-column overlay. | Demo drills three levels and clears path; sample maps stable node IDs; arrows traverse, Right opens child, Left returns, Enter selects. | D nodes inert; E no choices; X child-load retry in place; T path wraps/discloses; V uses async children and 800 visible-node VirtualTree. |
| `TICED-PA-BASE-021` | `checkbox` / N | Controlled binary or indeterminate selection with label and group semantics. | Demo toggles single, group, indeterminate; sample maps `bool`/tri-state; Space toggles, arrows move radio-like group only when configured. | D does not change; E group empty; X host validation message; T label wraps outside hit target; V group virtualizes after 500 options. |
| `TICED-PA-BASE-022` | `color-picker` / R | Typed color value with swatch, accessible channels/hex entry, alpha, and native overlay palette. | Demo edits hex and channels; sample maps parsed color; arrows adjust focused channel, Enter commits, Escape restores pre-open value. | D/read-only shown; E unset color uses explicit token; X invalid hex retained with error; T applies to label; V palette limited to 256 named swatches. |
| `TICED-PA-BASE-023` | `date-picker` / R | Locale-aware single-date picker with month grid, min/max, disabled dates, and typed input. | Demo navigates month and rejects blocked date; sample maps `Option<Date>`; arrows traverse days, PageUp/Down months, Enter commits, Escape cancels. | D/read-only distinct; E unset date; X invalid/out-of-range keeps draft; T localizes label; V month grid is fixed 42 cells, ranges are provider-backed. |
| `TICED-PA-BASE-024` | `form` / N | Field/label/help/error layout and controlled validation/submission coordinator, never DOM form emulation. | Demo validates two fields then submits/retries; sample uses `Pristine|Checking|Valid|Invalid`; Enter submits only when valid, Escape never discards silently. | D/read-only field states; E no fields shows configuration empty; X preserves all values/errors; T wraps help/errors; V forms over 100 fields require sectioning/lazy mounting. |
| `TICED-PA-BASE-025` | `input` / N | Controlled single-line text field with prefix/suffix actions, selection, IME, clear, and validation. | Demo edits CJK, clear, and error; sample maps value/change; standard editing shortcuts, Enter submits host intent, Escape clears selection/overlay only. | D/read-only distinct; E empty value; X retains invalid draft; T horizontal scroll plus full value; V input max is host-declared and rejects over-limit paste visibly. |
| `TICED-PA-BASE-026` | `input-number` / N | Locale-neutral typed numeric editor with parse draft, min/max/step, increment controls, and precision. | Demo enters invalid number then steps bounds; sample maps draft/value; Up/Down step, PageUp/Down larger step, Enter commits. | D/read-only distinct; E unset number; X preserves raw draft; T applies to helper/unit; V uses bounded decimal representation, no float drift or unbounded digits. |
| `TICED-PA-BASE-027` | `mentions` / R | Text editor with trigger-aware asynchronous suggestion overlay and atomic mention tokens. | Demo types trigger, picks a person, removes token; sample maps text and mention IDs; arrows/Enter select, Escape closes suggestions without deleting draft. | D/read-only distinct; E no match; X retry retains trigger text; T supports 4,096 chars; V caps 50 suggestions and 100 mention tokens per editor. |
| `TICED-PA-BASE-028` | `radio` / N | Controlled mutually exclusive option group with one stable selected value. | Demo changes selection; sample maps typed enum; arrows move and select within group, Space selects focused item. | D option skipped/inert; E no options; X validation message; T labels wrap; V virtual/filter after 500 options. |
| `TICED-PA-BASE-029` | `rate` / N | Discrete rating with optional half steps, clear behavior, and readable numeric value. | Demo pointer and keyboard rating; sample maps score; Left/Right adjusts, Home/End bounds, Space clears only when allowed. | D inert; E unset rating; X host validation; T helper wraps; V max 10 displayed symbols, larger scales use numeric editor. |
| `TICED-PA-BASE-030` | `select` / R | Controlled single-value native overlay list with search, clear, and stable option IDs. | Demo filters/selects/clears; sample maps value; Enter/Space opens, arrows navigate, Enter commits, Escape returns focus. | D/read-only distinct; E no options/no match; X provider retry keeps selection; T values disclose; V virtual/filter after 200 options. |
| `TICED-PA-BASE-031` | `slider` / N | Controlled scalar or range slider with min/max/step, pointer drag, and exact numeric companion. | Demo adjusts scalar/range; sample maps value; arrows step, PageUp/Down larger step, Home/End bounds, Escape cancels drag. | D inert; E is N/A because range required; X invalid configuration visible; T labels wrap; V uses arithmetic values, no rendered tick list above 100. |
| `TICED-PA-BASE-032` | `switch` / N | Immediate controlled boolean control, not a deferred submit checkbox. | Demo toggles and records optimistic failure rollback; sample maps changed state; Space toggles. | D inert; E is N/A boolean; X shows rollback/retry; T label wraps; V is one state, groups use virtual list. |
| `TICED-PA-BASE-033` | `time-picker` / R | Typed time-of-day editor with hour/minute/second step, bounds, and native overlay columns. | Demo picks 09:30:15 and rejects invalid time; sample maps time; arrows adjust unit, PageUp/Down changes larger unit, Enter commits. | D/read-only distinct; E unset time; X raw invalid draft retained; T helper wraps; V fixed 24x60x60 domain, no eager 86,400-row list. |
| `TICED-PA-BASE-034` | `transfer` / N | Two controlled collections with search, selectable/disabled items, move one/all, and stable IDs. | Demo selects, transfers, bulk moves, and reports partial failure; sample maps source/target selection; arrows navigate, Space selects, Enter moves. | D items remain visible; E either pane empty; X preserves both collections/selection; T wraps labels; V virtualizes both panes beyond 500, no duplicate IDs. |
| `TICED-PA-BASE-035` | `tree-select` / R | Selectable hierarchical overlay with optional multi-check and lazy children. | Demo expands, searches, selects, clears; sample maps `NodeId` selection; arrows traverse, Right/Left expand/collapse, Space checks, Enter commits. | D nodes inert; E no nodes/no result; X retry subtree; T path disclosure; V 800 visible nodes then VirtualTree/async provider. |
| `TICED-PA-BASE-036` | `upload` / R | User-initiated file selection/drop staging with typed validation, queue, remove/retry, and brokered external access. | Demo rejects type/size and retries a failed file; sample maps file metadata/status; Enter opens broker picker, Delete removes focused item. | D blocks picker/drop; E empty queue; X preserves failed row/retry; T filename truncates with disclosure; V max 32 files/128 MiB declared total, no recursive folders. |
| `TICED-PA-BASE-037` | `avatar` / N | Image/initials/object identity visual with deterministic fallback and accessible owner label. | Demo shows image, initials, and failed image; sample uses bounded asset handle; keyboard applies only when avatar is a link/action. | D action owner inert; E unknown identity fallback; X fallback shown; T full label disclosure; V avatar cache obeys global image budget. |
| `TICED-PA-BASE-038` | `badge` / N | Count, dot, or semantic status badge attached to an owner without obscuring it. | Demo changes count/status/overflow; sample maps count/status; focus remains on owner, not decorative badge. | D inherits owner; E zero count hides or shows configured zero; X is host status; T status label readable; V caps display at `99+` while exact count remains accessible. |
| `TICED-PA-BASE-039` | `calendar` / N | Month/date grid display with events, selected day, navigation, and accessible date labels. | Demo selects day and changes month; sample maps event provider; arrows navigate days, PageUp/Down months, Enter opens event. | D blocked dates inert; E no events still shows dates; X provider retry; T event title clips/discloses; V month grid fixed, per-day events show first 3 plus overflow. |
| `TICED-PA-BASE-040` | `card` / N | Bounded content surface with header, body, optional actions, loading and error composition. | Demo uses action/header/footer and collapses content; sample composes slots; keyboard reaches only supplied actions. | D action state; E empty body has explicit placeholder; X inline retry; T body wraps; V card is not a virtual container, cap nested preview rows at 20. |
| `TICED-PA-BASE-041` | `carousel` / R | Native paged content viewer with explicit navigation; autoplay is optional and activity-scoped. | Demo manually changes slides and toggles active-only autoplay; sample maps slide index; Left/Right navigate, Space pauses/resumes, Escape stops autoplay. | D unavailable arrows inert; E no slides; X failed slide retry; T caption wraps; V max 50 slides, lazy-load one neighbor, zero timer when paused/hidden. |
| `TICED-PA-BASE-042` | `collapse` / N | Expandable grouped panels with controlled open IDs and optional single-open mode. | Demo toggles panels and preserves child state; sample maps open set; Enter/Space toggles, arrows move headers. | D locked header; E no panels; X child failure remains in panel; T header wraps; V 100 panels then filter/virtualized owner. |
| `TICED-PA-BASE-043` | `descriptions` / N | Labeled key-value details with column policy, status/action values, and readable empty values. | Demo changes columns and copy action; sample maps fields; Tab reaches value actions, not plain labels. | D action cells inert; E no fields; X field-load retry; T wraps value or horizontal code scroll; V 100 fields requires sections/lazy rendering. |
| `TICED-PA-BASE-044` | `empty` / N | Reusable no-data/no-result/no-permission state with optional recovery action. | Demo switches reason and retry/create action; sample maps reason/action; Tab/Enter invokes action. | D action inert; E is its primary state; X is not substituted for empty; T message wraps; V is one state, never renders an unbounded explanation. |
| `TICED-PA-BASE-045` | `image` / N | Bounded native image display with loading, decode failure, preview overlay, alt/label, and fit modes. | Demo loads, fails, previews, and closes; sample uses asset broker handle; Enter opens preview, Escape closes/restores focus. | D preview action inert; E missing source placeholder; X decode error/retry; T caption wraps; V input <=32 MiB/16 MP/8192 edge and decoded cache <=64 MiB. |
| `TICED-PA-BASE-046` | `list` / N | Uniform item list with headers, actions, selection, and controlled loading/empty/error composition. | Demo selects/action a row and retries provider; sample maps stable IDs; arrows move selection, Enter invokes row action. | D row/action inert; E no rows; X retry preserves query; T wraps metadata; V 500 direct rows then VirtualList with fixed height. |
| `TICED-PA-BASE-047` | `popover` / R | Non-modal contextual native overlay with placement, flip, dismiss, and focus-safe interactive content. | Demo opens at all edges and closes; sample maps Overlay Host request; Enter/Space opens, Escape/outside close, focus returns to trigger. | D trigger inert; E minimal no-content card; X body retry; T wraps within max width; V cap content to 20 rows or use Drawer/Modal. |
| `TICED-PA-BASE-048` | `qr-code` / N | Deterministic QR bitmap/path from bounded payload with contrast/quiet-zone validation and copy/export broker actions. | Demo changes payload and shows invalid payload; sample maps payload/error; Tab reaches actions, Enter exports/copies. | D actions inert; E empty payload state; X encode/export failure; T full payload disclosure; V payload <=2,953 bytes, never attempts an unbounded code. |
| `TICED-PA-BASE-049` | `segmented` / N | Compact mutually exclusive choice control with stable values and no hidden mode change. | Demo changes density/mode; sample maps enum; Left/Right selects, Home/End bounds. | D segment skipped/inert; E no options; X configuration error; T labels overflow to menu; V maximum 8 visible segments. |
| `TICED-PA-BASE-050` | `statistic` / N | Formatted key metric with unit, precision, delta/status, and semantic text fallback. | Demo changes value, trend, loading/error; sample maps value/status; keyboard applies to optional action only. | D action state; E unavailable value shown explicitly; X error/retry; T unit/label wrap; V arbitrary precision formatted with bounded display length. |
| `TICED-PA-BASE-051` | `table` / N | Fixed-row-height structured table with column config, horizontal scroll, row identity, and composable selection/sort slots. | Demo scrolls wide columns and selects a row; sample maps columns/rows; arrows navigate cells/rows, Enter row action, Home/End bounds. | D cells/actions inert; E no rows; X provider retry preserves columns; T cell disclosure/local scroll; V 500 direct rows, otherwise DataGrid provider contract. |
| `TICED-PA-BASE-052` | `tag` / N | Compact category/status label with optional removable action and accessible full value. | Demo changes semantic color/removes tag; sample maps typed status; Tab/Enter reaches remove only. | D remove inert; E no tags; X is host action error; T truncates/discloses; V 50 visible tags then summary/overflow. |
| `TICED-PA-BASE-053` | `timeline` / N | Ordered event list with time, status, details, and optional action slots. | Demo renders success/warning/error events; sample maps event IDs; arrows move action targets. | D actions inert; E no events; X event-load retry; T wraps details; V 500 events then VirtualList/group paging. |
| `TICED-PA-BASE-054` | `tooltip` / R | Short non-interactive native hover/focus label from Overlay Host; never the sole label for a control. | Demo shows on focus and boundary flip; sample maps tooltip text; focus opens after delay, Escape closes, no trapped focus. | D may explain disabled reason on focus; E no tooltip; X N/A; T wraps to max width; V one tooltip per trigger, no bulk list. |
| `TICED-PA-BASE-055` | `tour` / R | Modal guided sequence using Overlay Host spotlight equivalent, step state, skip/next/back, and focus control. | Demo completes/skips/restarts; sample maps step IDs; Enter next, Left/Right back/next, Escape exits and returns focus. | D unavailable step skipped with reason; E no eligible steps; X target missing recovers/skips; T wraps copy; V max 20 steps, no background polling. |
| `TICED-PA-BASE-056` | `tree` / N | Stable-ID expandable hierarchy with selection, lazy child loading, and incremental visible sequence. | Demo expands/collapses/selects and retries subtree; sample maps `NodeId`; arrows traverse, Right/Left expand/collapse, Home/End bounds. | D node inert; E no root; X subtree retry; T label disclosure; V 800 visible direct nodes then VirtualTree, no full tree rescan. |
| `TICED-PA-BASE-057` | `alert` / N | Inline semantic notice with title, details, optional close/retry, and non-modal priority. | Demo shows success/warning/error then dismisses/restores; sample maps severity/visibility; Tab reaches actions, Escape dismisses only if closable. | D close/action inert; E is N/A; X may contain error state; T wraps; V max 5 stacked inline alerts per region. |
| `TICED-PA-BASE-058` | `drawer` / R | Edge-origin temporary panel from Overlay Host with modal/non-modal policy, focus trap when modal, and close restore. | Demo opens left/right at 840 and 1240; sample maps open state; Escape closes, Tab traps modal content. | D opener inert; E empty body state; X body retry; T body scrolls; V body uses virtual children, not an unbounded drawer list. |
| `TICED-PA-BASE-059` | `message` / R | Ephemeral non-blocking global notice queue with explicit user/task creation and bounded lifetime. | Demo creates success/error message and dismisses; sample calls host feedback broker; keyboard reaches close when focused. | D not applicable to message; E empty queue; X is a message severity; T wraps/expands; V max 3 visible, queue max 20, timer active only while message visible. |
| `TICED-PA-BASE-060` | `modal` / R | Blocking native dialog with labelled content, focus trap, explicit completion/cancel, and opener restoration. | Demo validates then confirms/cancels; sample maps modal result; Escape cancels only if allowed, Enter confirms safe default. | D confirm inert; E empty body explicit; X preserves dialog data/retry; T scrolls body; V use virtualized body and max one modal stack. |
| `TICED-PA-BASE-061` | `notification` / R | Rich edge notification with title/body/actions, queue policy, user dismissal, and no background polling. | Demo action/retry/close notification; sample maps feedback request; Tab reaches actions, Escape closes focused notification. | D action inert; E empty queue; X is failure notification; T body wraps; V max 3 visible/20 queued, active timer only for visible expiry. |
| `TICED-PA-BASE-062` | `popconfirm` / R | Small anchored confirmation for reversible short actions; escalates to Modal for complex/long content. | Demo confirms/cancels dangerous action; sample maps confirm result; Enter confirms only explicit focused button, Escape cancels/returns focus. | D confirmation unavailable; E N/A; X action failure reported after close/reopen path; T beyond 2 lines requires Modal; V one confirmation only. |
| `TICED-PA-BASE-063` | `progress` / N | Determinate/indeterminate progress with status, label, and exact value text. | Demo increments, fails, retries, and completes; sample maps progress state; keyboard applies to optional cancel/retry. | D actions inert; E unknown total is indeterminate; X failure state; T label wraps; V values use bounded 0--100 display with exact source units in text. |
| `TICED-PA-BASE-064` | `result` / N | Full-area terminal success/warning/error/empty outcome with recovery actions. | Demo switches outcomes and invokes next action; sample maps result kind; Tab/Enter reaches actions. | D action inert; E is explicit no-result kind; X error kind with retry; T wraps description; V avoids embedding large diagnostic logs, links to CodeBlock/detail. |
| `TICED-PA-BASE-065` | `skeleton` / N | Structural loading placeholder matching expected layout, with reduced-motion static rendering. | Demo toggles active/static and replaces with content; sample maps loading state; no required keyboard target. | D/E/X are owner states; L is primary; T mirrors line widths without overflowing; V cap visible skeleton rows to viewport/overscan, animation only while active. |
| `TICED-PA-BASE-066` | `spin` / N | Local/global loading indicator with readable label and optional cancel, not a permanent process loop. | Demo starts/completes/fails an explicit task; sample maps async state; Tab reaches cancel, Escape cancels only when safe. | D cancel inert; E N/A; X task error/retry; T label wraps; V one indicator per loading region, frames only during active visibility. |
| `TICED-PA-BASE-067` | `watermark` / R | Native paint-layer ownership/review/environment marking clipped to an explicit content region. | Demo toggles text/opacity/rotation over content; sample maps paint configuration; no focus unless associated controls exist. | D is configuration owner; E no mark means layer absent; X invalid config fallback; T tiles safely; V bounded cached path/texture, no per-frame layout. |
| `TICED-PA-BASE-068` | `util` / R | Typed foundation utilities for IDs, safe URL policy, clipboard/action broker, text truncation, and controlled media parsing; not a CSS helper bag. | Demo invokes URL validation, copy failure, and safe parsing result; sample calls typed utility API; keyboard path belongs to owning action. | D N/A; E typed absent value; X returns structured error; T validates 8 KiB URL/long text policy; V all parsers enforce `iced-plan.md` input bounds. |
| `TICED-PA-BASE-069` | `affix` / R | Scroll-container pinned region with native offset/visibility behavior, replacing browser scroll/fixed semantics. | Demo pins filter controls during inner scroll; sample maps scroll/offset state; Tab reaches pinned controls in logical order. | D child-owned; E hidden/absent region; X target missing resets safely; T does not cover content; V one pinned region per scroll container in MVP. |
| `TICED-PA-BASE-070` | `app` / R | Native application host that owns shell state, feedback/overlay hosts, task broker, focus root, and routing. | Demo routes to a component detail and returns focus; sample shows root `Application` state/message composition; Cmd/Ctrl+K reaches command palette. | D feature policy disables actions; E empty route state; X root error/recovery; T shell scroll strategy; V owns bounded routes/task queues, never component data copies. |
| `TICED-PA-BASE-071` | `border-beam` / R | Optional native paint decoration around a region with reduced-motion static fallback and no semantic dependency. | Demo starts/stops only while selected/visible; sample maps decoration state; no keyboard target. | D owner state; E decoration absent; X renderer fallback static border; T N/A; V one path per visible region and zero frames while inactive. |
| `TICED-PA-BASE-072` | `config-provider` / R | Typed application configuration for token theme, locale, density, direction policy, and defaults, replacing React context. | Demo switches Light/Dark/density/locale and updates child tokens; sample constructs typed config at host root; keyboard reaches controls. | D policy locks changes; E uses explicit defaults; X invalid config rejected with error; T locale text verifies wrapping; V one immutable snapshot per update, no per-widget context clone. |
| `TICED-PA-BASE-073` | `textarea` / N | Controlled multiline plain-text editor with selection, IME, count, scrolling, and host validation; no rich-text promise. | Demo edits CJK/emoji, count/error, and recovery; sample maps text/change; standard multiline shortcuts, Tab behavior explicitly host-configured. | D/read-only distinct; E empty text; X retains draft; T is primary, supports 80,000 chars with viewport layout; V rejects over declared cap visibly. |
| `TICED-PA-BASE-074` | `icon-button` / N | Fixed-size icon-only command button with mandatory accessible label, tooltip, and clear disabled state. | Demo triggers labelled icon actions; sample maps icon and message; Tab/Enter/Space invoke. | D inert; E missing icon fallback; X host action failure; T label in tooltip/disclosure; V no multi-action content, use Toolbar/Menu. |
| `TICED-PA-BASE-075` | `toolbar` / N | Dense command row with primary/secondary/overflow actions and a stable keyboard order. | Demo resizes to overflow then executes an item; sample maps actions/overflow; arrows navigate roving group, Enter/Space invokes, Escape closes overflow. | D actions inert; E no actions state; X action retry feedback; T labels overflow/disclose; V 12 visible actions then native overflow menu. |

## 6. Business components (11)

| Acceptance ID | Registry ID / form | Frozen native definition and minimum behavior | Required runnable effect, integration code, and keyboard path | States and boundaries |
| --- | --- | --- | --- | --- |
| `TICED-PA-BIZ-001` | `metric-card` / N | Single metric summary with value, delta, semantic status, optional native chart slot, and readable fallback. | Demo changes metric/loading/error/empty; sample wires `MetricCard` and optional chart `Element`; Tab reaches action only. | D action inert; E unavailable metric; X retry/error; T labels wrap; V one metric/card and bounded chart slot, not dashboard virtualization. |
| `TICED-PA-BIZ-002` | `mini-chart-card` / N | Compact MetricCard plus Sparkline trend, status and precise textual summary. | Demo updates trend and opens detail action; sample composes native metric/sparkline; keyboard reaches detail. | D detail inert; E no samples with numeric fallback; X chart failure preserves metric; T wraps; V samples downsample to 160 points. |
| `TICED-PA-BIZ-003` | `data-toolbar` / N | Search, active filter count, result count, actions, and data state for a host-owned data set. | Demo searches, clears, opens filter, and invokes bulk action; sample maps query/filter/action; Ctrl/Cmd+F optional, Tab order follows visual controls. | D actions reflect selection; E zero results retains controls; X retry retains query/filter; T uses overflow; V 12 actions then menu, no data ownership. |
| `TICED-PA-BIZ-004` | `filter-panel` / N | Structured host-controlled filter fields with active count, apply/reset, validation, and async result state. | Demo applies/reset filters and shows invalid field; sample maps filter model; Enter applies valid form, Escape closes overlay only. | D field/action inert; E no available filters; X preserves filters/retry; T field labels/errors wrap; V 100 fields require groups/lazy panels. |
| `TICED-PA-BIZ-005` | `property-list` / N | Object property summary with typed key/value/status, copy/action slots, and accessible full values. | Demo copies a value and reports clipboard denial; sample maps fields/actions; Tab reaches actions. | D action inert; E no properties; X field failure/retry; T wraps or scrolls code-like value; V 100 items then section/paging. |
| `TICED-PA-BIZ-006` | `status-timeline` / N | Workflow/status events with current state, failed step, timestamps, metadata, and recovery action slots. | Demo advances, fails, and retries a stage; sample maps status events; arrows navigate actions. | D action inert; E no history; X provider failure; T details wrap; V 500 events then virtual/grouped timeline. |
| `TICED-PA-BIZ-007` | `command-palette` / R | Global native command search dialog with permissions, async results, execution state, audit event, and focus return. | Demo opens by Cmd/Ctrl+K, filters, executes, handles empty/error/denied; sample maps command provider and result; arrows/Home/End, Enter, Escape are mandatory. | D/denied commands remain readable/inert; E no results; X/timeout retry keeps query; T wraps labels; V 200 local commands then incremental async search, no stale execution. |
| `TICED-PA-BIZ-008` | `code-block` / N | Plain, non-executing code/text viewer with optional line numbers, copy, controlled horizontal scroll, and load/error states. | Demo copies, scrolls long token, loads/fails; sample maps `CodeBlock` text/status; Tab reaches copy, arrows scroll only focused viewport. | D copy inert; E no code; X load/copy failure; T uses local horizontal scroll; V 80,000 chars with viewport/line virtualization beyond. |
| `TICED-PA-BIZ-009` | `markdown-editor` / R | Plain Markdown source editor plus native safe preview; raw HTML is dropped and Mermaid is an explicit bounded child state. | Demo edits, previews, rejects unsafe/over-limit source; sample maps source and parse task; Ctrl/Cmd+Enter previews, Tab remains predictable. | D/read-only distinct; E empty doc; X parse error retains source; T supports 80,000 chars; V no WebView/HTML, block rendering/lazy preview required. |
| `TICED-PA-BIZ-010` | `mermaid-svg-viewer` / R | Native restricted diagram viewer from validated Mermaid IR/controlled bitmap or paths, with pan/zoom/fit and no DOM SVG. | Demo pans, zooms, fits, rejects unsafe/large source; sample maps safe result; +/- zoom, 0 fit, arrows pan, Escape exits overlay. | D controls inert; E no diagram; X parse/render error/retry; T source handled by CodeBlock; V <=8 blocks, <=12,000 chars/block, <=260 statements; bounded worker only. |
| `TICED-PA-BIZ-011` | `mobile-preview-frame` / R | Desktop-native device-viewport simulator with supplied native child fixture, device chrome, and independent inner scroll; no iframe/cross-origin page. | Demo changes device size and scrolls preview; sample composes native child `Element`; Tab enters/exits child in order. | D controls inert; E no child placeholder; X child failure state; T scrolls inside preview; V only supplied native fixtures, one preview at a time. |

## 7. Chart components (15)

All chart rows require native Canvas/path rendering or controlled native bitmaps, a visible legend/value
table fallback, deterministic color/token use, Loading/Empty/Failed/over-limit presentation, and
no SVG DOM. Pointer hit testing must not be the only route to an exact value: when a chart exposes
selection, arrows move the current datum/series and Enter invokes its declared action.

| Acceptance ID | Registry ID / form | Frozen native definition and minimum behavior | Required runnable effect, integration code, and keyboard path | States and boundaries |
| --- | --- | --- | --- | --- |
| `TICED-PA-CHART-001` | `line-chart` / R | Single/multi-series continuous trend chart with axes, missing values, sampling, focus datum, and value table. | Demo changes series, selects a datum, shows exact value; sample maps typed series/Canvas; arrows move datum, Tab reaches fallback table. | D action inert; E no points; X data error/retry; T legend labels disclose; V downsample to 160 points/series with original aggregate metadata. |
| `TICED-PA-CHART-002` | `bar-chart` / R | Categorical signed-value bar chart with repeated-label disambiguation and horizontal overflow policy. | Demo handles positive/negative/repeated labels; sample maps categories; arrows select bar, Enter action. | D action inert; E no bars; X error/retry; T labels wrap/rotate only if still readable; V 160 bars then aggregate/paged data table. |
| `TICED-PA-CHART-003` | `pie-chart` / R | Proportion chart for positive categories with total, legend, Other aggregation, and exact table. | Demo selects slice and groups tail into Other; sample maps slices; arrows select slices, Enter action. | D action inert; E no positive values; X error/retry; T legend disclosure; V max 40 explicit slices then Other, invalid negatives surfaced as X. |
| `TICED-PA-CHART-004` | `area-chart` / R | Single/multi-series area trend with baseline, missing-data gaps, sampling, and value fallback. | Demo toggles series and datum focus; sample maps area model/Canvas; arrows move current datum. | D action inert; E no samples; X error/retry; T legend handling; V total sample budget 160, stacked/interval claims require separate future contract. |
| `TICED-PA-CHART-005` | `sparkline` / R | Compact trend glyph with explicit current/min/max textual summary, not a full analytical chart. | Demo changes small trend and opens associated metric; sample maps samples; keyboard reaches summary/detail action. | D action inert; E no samples; X fallback to metric/error; T summary wraps; V <=160 sampled points, no axes or dense hit targets. |
| `TICED-PA-CHART-006` | `scatter-chart` / R | Two-variable point distribution with exact-value table, selected point, and bounded point rendering. | Demo selects an outlier and opens table row; sample maps points/Canvas; arrows navigate points in stable order. | D action inert; E no points; X error/retry; T labels/table disclosure; V max 2,000 direct points then aggregate/bin with table provider. |
| `TICED-PA-CHART-007` | `radar-chart` / R | 3--12 dimension profile comparison with legend, normalized scale, and exact value table. | Demo changes profile/series and selects dimension; sample maps axes/series; arrows move dimension/series. | D action inert; E no valid dimensions; X configuration error; T labels disclose; V <=12 dimensions and <=12 series, no heterogeneous-scale claim. |
| `TICED-PA-CHART-008` | `heatmap` / R | Matrix color scale with row/column labels, selected cell, legend, and table fallback. | Demo moves focus between cells and reads value; sample maps matrix/Canvas; arrows traverse cells, Enter action. | D action inert; E no cells; X malformed matrix error; T header disclosure; V <=30x30/900 cells, aggregate/virtual grid beyond. |
| `TICED-PA-CHART-009` | `treemap` / R | Hierarchical proportional rectangles with deterministic layout, Other aggregation, selected node, and table fallback. | Demo selects a node and changes depth; sample maps hierarchy/Canvas; arrows navigate deterministic visible order. | D action inert; E no positive nodes; X invalid hierarchy; T labels disclose; V <=120 explicit nodes, rest aggregated as Other; drill-down needs separate contract. |
| `TICED-PA-CHART-010` | `funnel-chart` / R | Ordered conversion stages with relative-first and relative-previous percentages plus exact table. | Demo changes stage/dropoff and selects a stage; sample maps stage model; arrows select stage, Enter action. | D action inert; E no stages; X invalid/negative data; T labels wrap; V <=40 stages, no multi-funnel comparison claim. |
| `TICED-PA-CHART-011` | `gauge-chart` / R | Single metric range/threshold gauge with clear current value, threshold labels, and text fallback. | Demo crosses thresholds and changes range; sample maps gauge config; arrows adjust demo input, detail action keyboard-reachable. | D action inert; E unavailable value; X invalid range; T labels disclose; V one pointer/metric only, not Progress or multi-gauge dashboard. |
| `TICED-PA-CHART-012` | `sankey-chart` / R | Directed flow diagram with explicit layered layout, links/nodes, selection, and table fallback. | Demo selects node/link and rejects cycle/over-limit model; sample maps graph/Canvas; arrows traverse stable node/link order. | D action inert; E no flow; X cyclic/invalid graph; T labels disclose; V <=120 nodes/180 links, no general crossing-minimization or cyclic layout. |
| `TICED-PA-CHART-013` | `organization-chart` / R | Expandable tree relationship chart with connector paths, visible-node window, pan/zoom, and list fallback. | Demo collapses a manager, pans/zooms/fits; sample maps `NodeId` tree/Canvas; arrows traverse tree, +/- zoom, 0 fit. | D node actions inert; E no root; X invalid tree; T card labels wrap/disclose; V <=120 normalized nodes/8 levels, search is separate enhancement. |
| `TICED-PA-CHART-014` | `mind-map` / R | Center-out hierarchy visual with controlled collapse, deterministic radial layout, pan/zoom, and outline fallback. | Demo expands/collapses, pans/zooms/fits; sample maps tree/Canvas; arrows traverse outline, +/- zoom, 0 fit. | D node inert; E no root; X invalid/deep tree; T labels disclose; V <=120 nodes/6 levels, no free drag or infinite canvas claim. |
| `TICED-PA-CHART-015` | `word-cloud` / R | Deterministic weighted keyword layout with exact ranked list fallback; no stochastic perpetual layout. | Demo changes weights and selects word/list entry; sample maps words/seed; arrows move ranked list selection, Enter action. | D action inert; E no words; X invalid weights/layout fallback; T word disclosure; V default 36, hard max 80 words; no rotation, mask, animation, or thousand-word claim. |

## 8. Cross-row blocking rules and handoff

The following always block the affected row and prevent `ACCEPTED`: a non-clickable catalog entry;
missing independent detail fixture; a demo that is static, Web-backed, or shared in place of the
component; code that does not compile with the demo; an undeclared state or capacity behavior;
keyboard/focus failure; text clipping/overlap at either required window; unbounded work; a
permanent tick; a WebView/HTML/SVG-DOM fallback; or platform/security evidence represented as
completed without actual evidence.

`N/A` review must record the removed Web mechanism, the native equivalent, its visible effect,
focus behavior, boundaries, evidence, risk owner, compensating control, review gate, and expiry.
It cannot remove an item from the 101-row count, reduce its required detail page, or convert
unimplemented work into completion. The expected recompositions are native routing/overlay/paint
layers/application configuration and native Canvas/controlled-safe-media paths; they are product
requirements, not waivers.

Delivery handoff for an implementation owner is one row at a time: update its independent native
status and artifact references, run the declared detail fixture in Light/Dark at both required
window sizes, provide keyboard and boundary traces, then request the single targeted acceptance
retest. This document is frozen unless a registry entry or an explicit product decision changes.
