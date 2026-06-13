# U8-002 — headless evidence (the coexistence harness)

The recognizer is frozen; this task ships an **example-only** harness so the maintainer can
run the device matrix. `packages/` native code is untouched.

## Proof commands (all green, 2026-06-13)

- `example/`: `bunx tsc --noEmit` → exit 0.
- `packages/` (freeze check): `bunx tsc --noEmit` → 0 · `bun run build` → 0 ·
  `bun run lint` (biome) → 0 · `bun run swift:lint` → 0.
- `git status --porcelain packages/` → empty (zero changes under `packages/`).

## What shipped (files + versions)

Peers added to `example/package.json` via `expo install` (SDK 56 compatible pins):

- `react-native-gesture-handler` `~2.31.1` (resolved 2.31.2)
- `react-native-reanimated` `4.3.1`
- `react-native-worklets` `0.8.3` (reanimated 4's worklet runtime + Babel plugin)
- `react-native-pager-view` `8.0.1`
- `@gorhom/bottom-sheet` `^5.2.14`

Wiring:

- `example/app/_layout.tsx` — root wrapped in `GestureHandlerRootView` (flex: 1, outermost).
- `example/babel.config.js` — `react-native-worklets/plugin` added (last in the list; this is
  Reanimated 4's plugin path — `react-native-reanimated/plugin` just re-exports it).
- `example/screens/coexistence.tsx` — the screen (new).
- Registered like the sibling screens: `coexistence` added to `DemoScreen` and the `U8-002`
  `TASKS` row in `example/data/tasks.ts`, plus the `case` in `example/app/(tasks)/[taskId].tsx`.

## Screen layout

A fixed **semantic press log** sits at the top (newest first, timestamped to the millisecond).
Below it, a vertical `ScrollView` holds the sections; the bottom-sheet is an overlay sibling
anchored to the bottom with a floating caption pinned above its collapsed handle.

Every surface logs only the four semantic events — `PressIn` / `PressOut` / `Press` /
`LongPress` — with the tap coordinate. A clean **cancel** reads as `PressIn` then `PressOut`
with **no** `Press`. Handlers are wired in every mode, so a silent log under `passive` /
`controlled` is a live proof, not missing wiring.

## Matrix group → section → gesture to perform

The seven scope groups map to the on-screen sections (group 3 is the bottom-sheet overlay):

| Group | Section header | Gesture to perform | Expected log |
|---|---|---|---|
| 1 · native scroller | `1 · native horizontal ScrollView` | (a) tap the surface; (b) press + horizontal drag; (c) press, hold still, release | (a) one `Press`; (b) `PressIn`/`PressOut`, **no** `Press`, list scrolls; (c) `PressIn`→`PressOut`→`Press` |
| 2 · pager | `2 · react-native-pager-view` | still tap a page; then press + horizontal swipe | tap → `Press`; swipe → page changes, `PressIn`/`PressOut`, **no** `Press` |
| 3 · bottom-sheet | floating `3 · @gorhom/bottom-sheet` + the sheet | drag the sheet up from its content; then tap the content without dragging | drag → sheet moves, `PressIn`/`PressOut`, **no** `Press` (clean cancel); tap → `Press`, sheet still |
| 4 · RNGH pan | `4 · RNGH GestureDetector(Pan)` | press, then pan past slop | `rngh-pan · ACTIVATED` line, then surface cancels (`PressOut`, no `Press`); a still tap → `Press` |
| 5 · passive | `5 · passive mode inside a ScrollView` | drag across the surface | pointer uniform follows the finger natively, scroll works, **log stays silent** (no semantics) |
| 6 · controlled | `6 · controlled mode inside a ScrollView` | tap / drag the surface | **log stays silent** — the scroller owns the gesture, zero double-handling |
| 7 · nested | `7 · nested fx surfaces` | tap the inner surface; tap the outer ring | observe whether `nested·INNER` alone logs or `nested·OUTER` too (policy is **observed** here, not decided) |

The load-bearing row is the cancel path (groups 1b, 2-swipe, 3-drag, 4-pan): exactly one
`PressIn`/`PressOut` pair with no `Press` the instant the ancestor claims.

## Caveats for the device build

- These peers carry native code — the maintainer must **rebuild the dev client**
  (`expo prebuild` + `expo run:ios` / `expo run:android`, or an EAS dev build). A JS reload is
  not enough; gesture-handler, reanimated/worklets, and pager-view autolink at build time.
- The Reanimated Babel plugin (`react-native-worklets/plugin`) requires a **Metro cache clear**
  on first run (`expo start -c`).
- `GestureHandlerRootView` is already wired at the app root; no per-screen setup needed.
- The bottom-sheet uses a plain `BottomSheet` (not `BottomSheetModal`), so no
  `BottomSheetModalProvider` is required — only the root `GestureHandlerRootView`.

## Out of scope (not built — deferred)

The `simultaneousWithExternalGesture` / `NativeGesture` "developer wants both" binding and
drag/tilt axis-aware claiming. No `packages/` native edit. If a matrix row needs a recognizer
change to pass, that is a U8-001 rework — flag it, do not patch `packages/`.
