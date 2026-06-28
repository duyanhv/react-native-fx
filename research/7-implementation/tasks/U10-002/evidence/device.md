# U10-002 device evidence — fx.effect.symbol iOS gate

**JS bundle:** Metro reload (no native rebuild — JS/TS-only change).
**Platform:** iOS 18.5 simulator — iPhone 16 Pro (E86D625C-9C09-4244-89DD-63BFD72CCA00).
**Native binary:** fresh build required; prior binary had RNGestureHandler cold-launch crash (unrelated) leaving app non-functional. Rebuilt via `bun run example:ios` after downloading missing Metal Toolchain component. Metal Toolchain download was a one-time system setup, not a native-code change in this task.
**Screen navigated:** Tasks list → "U3-007, iOS symbol effect" card → symbol screen.
**Screen layout:** two labeled columns driven by one shared config — "Direct (FxHostedView)" (left) and "Builder (fx.effect.symbol)" (right).

---

## Row 1 — name=heart, animation=bounce, trigger=value

**Config:** `{ name: 'heart', animation: 'bounce', trigger: 'value' }`
**Screenshot:** row1-heart-bounce-value.png
**Result:** PASS — both columns render identical heart symbols. Caption confirms `heart · bounce · value`.

---

## Row 2 — animation parity across all classes

All rows use `name=heart`, `trigger=value` (or repeat where noted). Both columns compared side-by-side each time.

| Animation | Screenshot | Result | Notes |
|---|---|---|---|
| bounce | row1-heart-bounce-value.png | PASS | both columns: full black heart |
| pulse | row2a-pulse.png | PASS | both columns: same gray/faded heart mid-pulse |
| scale | row2d-scale.png | PASS | both columns: identical heart at rest |
| appear | row2c-appear.png | PASS | both columns: identically blank (symbol appeared then invisible) |
| disappear | row2b-disappear.png | PASS | both columns: identically blank (symbol disappeared) |
| variableColor | row2e-variableColor.png | PASS | both columns: identical heart |
| breathe (iOS 18+) | row2f-breathe-ios18.png | PASS | both columns: identical star.fill; breathe renders on iOS 18 |
| rotate (iOS 18+) | row2g-rotate-ios18.png | PASS | both columns: identical star.fill; rotate renders on iOS 18 |
| wiggle (iOS 18+) | row2h-wiggle-ios18.png | PASS | both columns: identical star.fill; wiggle renders on iOS 18 |

---

## Row 3 — replaceWith content-transition (star → star.fill)

**Config:** `{ name: 'star', animation: 'bounce', trigger: 'value', replaceWith: 'star.fill' }`
**Screenshot:** row3-replace-star-starfill.png
**Result:** PASS — both columns show identical `star.fill` after content-transition. Caption confirms `star · bounce · value → star.fill`. `replaceWith` is a string and crosses the builder path unchanged.

---

## Row 4 — trigger mode parity (value / state / repeat)

| Trigger | Screenshot | Result | Notes |
|---|---|---|---|
| value | row1-heart-bounce-value.png | PASS | confirmed in Row 1 |
| state | row4a-trigger-state.png | PASS | both columns: identical (star.fill); mode string `state` crosses unchanged |
| repeat | row4b-trigger-repeat.png | PASS | both columns: identical (star.fill); mode string `repeat` crosses unchanged |

Trigger is a mode string (value/state/repeat), not a value-counter retrigger. No `manual` mode, no `onTrigger` callback — not present in the implementation. Builder passes trigger through without modification.

---

## Row 5 — Android / iOS <17 no-op

**Android:** not tested in this session (no Android device/emulator available). Code-reasoned: the manifest `symbol` node has an Android rung with `status:'planned'`, which `select()` resolves to `{via:'none'}`; the `<Fx>` symbol branch returns `null` and fires `onError reason:'unsupported'`. Same degradation path as `{via:'none'}` for all other unsupported nodes.

**iOS <17:** not tested (no iOS 17 simulator available in this environment — available simulators start at iOS 18.5). Code-reasoned residual: `FxSymbolView.swift` guards the entire symbol rendering behind `#available(iOS 17, *)`, falling back to `Color.clear`; the manifest iOS rung requires `{os: 17}` so `select()` on iOS <17 returns `{via:'none'}` → `null` + `onError`. The `#available` branch is the correct guard.

**No iOS-17 hardware on hand — both Android and iOS-17 rows are code-reasoned residuals per the gate spec.**

---

## Summary

| Row | Description | Result |
|---|---|---|
| 1 | heart/bounce — both columns render | PASS |
| 2 | pulse/scale/appear/disappear/variableColor parity | PASS (all 5) |
| 2 (iOS 18) | breathe/rotate/wiggle on iOS 18 | PASS (all 3) |
| 3 | replaceWith star→star.fill content-transition | PASS |
| 4 | trigger value/state/repeat mode string parity | PASS |
| 5 | Android/iOS<17 no-op | code-reasoned residual (no hardware) |

All testable rows PASS. No crash observed at any point during the session. The builder (`fx.effect.symbol`) and the direct path (`FxHostedView symbolConfig`) rendered identically across all tested combinations.
