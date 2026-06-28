# DEF-026 implementation notes

## Decisions made during implementation

### Shared effect factory placement
The `when (effect) {...}` dispatch extracted to `internal fun createEffectView(...)` as a top-level
function in `FxHostedView.kt`. `FxFillView` stays private to that file; the factory can reference
it there and expose an `internal` symbol. `FxScrollView.kt` in the same package calls
`createEffectView(context, tile.effect, tile.intensity)` with `materialConfig = null` — material
tiles in a scroll context use the null-config path (no `MaterialConfig` Record crosses for tiles).

### No `material` tile in scroll tile dispatch
iOS `FxScrollRootView.tileContent` only handles `"fill"` and curated shader ids; unrecognised
effects return `FxEmptyView`. The shared factory includes `"material"` but passes `null`
for `materialConfig`, matching what the `FxScrollView` can see — no `MaterialConfig` crosses
for tiles.

### Tile-set rebuild key
Rebuild guard uses `List<Pair<String, Double>>` of `(effect, height)` — not intensity. An
intensity change is a live-push via `FxEffectView.setIntensity`; height or effect-id change
rebuilds. This mirrors the iOS note: "remounting resets the shader clock."

### Axis-change rebuilds the container
iOS simply mutates `scrollProps.axis` and SwiftUI diffs. Android needs a different container
class (`ScrollView` vs `HorizontalScrollView`), so axis change rebuilds. The rebuild guard
checks both axis and tile-set key.

### Position tracking
Tile positions are computed mathematically from `tile.height` * density (not queried from
`child.top` after layout). This avoids a post-layout dependency and matches the tile-column
padding/spacing constants exactly. PADDING_DP = 16, SPACING_DP = 16 (matching iOS `.padding(16)`
and `LazyVStack/HStack(spacing: 16)`).

### Horizontal scroll tile dimensions
`FxScrollTile.height` is the extent along the scroll axis (the spec wording). For horizontal
tiles, `height` becomes the tile's width and `MATCH_PARENT` fills the cross-axis height —
matching the iOS HStack behavior where `maxWidth: .infinity` fills what's available.

### Initial transition call
`applyScrollTransition(0)` is called at the end of `buildScrollContainer` (offset 0, tiles
at top). Because the container is not yet laid out at this point, `viewportSize` will be 0 and
the call is a no-op. The real initial call fires from `onLayout` → `applyScrollTransition(currentScrollOffset())`.

### pausePresentationLoop fan-out
Added `internal fun pause()` and `internal fun resume()` to `FxShaderView` (thin wrappers over
`stopLoop()`/`startLoop()`). `FxScrollView` iterates `tileViews.filterIsInstance<FxShaderView>`.
FxFillView has no loop to pause — only shader tiles need explicit pause.

### select.ts — no change needed
The new Android rung `{ via:'native', target:'effect', requires:{ os:21, substrate:'hosted' } }`
travels the existing select.ts path identically to the iOS rung. DEF-014 noted this; confirmed
by reading select.ts — no `substrate` gate outside the `wantInteractive`/`fx`-interaction path.

### Events on FxScrollView module registration
Declared `Events("onFxLoad", "onFxError")` to match the spec example and forward-compatibility
with tile error/load surfacing. No dispatch wired yet (tile views manage their own events
internally); the registration is non-breaking.

### Scrollbars
Hidden (`isVerticalScrollBarEnabled = false` / `isHorizontalScrollBarEnabled = false`) — the
decorative content does not need a scrollbar indicator. No explicit iOS precedent here; this
is a presentational choice.

## Deviations from spec

None so far.
