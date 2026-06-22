# U12-001 · FxView — device evidence

Agent-collected 2026-06-21. Re-gated Android 2026-06-21 (scale 1.04 / translateY -6dp build).
Human ratification required for items flagged below.

## Android — POCO F1 (re-gate: scale=1.04, translateY=-6dp)

Screenshots prefixed `android-r2-*` are from the re-gate build.

| Claim | Result | Screenshot |
|-------|--------|------------|
| 1. State-flip easing + visible lift | PASS — settled position clearly higher in selected state; bottom gap widens vs idle baseline; card is wider from 1.04 scale. Reads as a lift, not just a corner change. | android-r2-01-idle-baseline.png, android-r2-02-selected-settled.png |
| 2. Settle event (one per flip) | PASS — `state=selected finished=true interrupted=false` on Select; `state=idle finished=true interrupted=false` on Deselect; exactly one line each | android-r2-02-selected-settled.png, android-r2-03-log-and-settle.png |
| 3. Interrupt ordering | PASS — hand-ratified by gate owner 2026-06-21: a rapid by-hand Select→Deselect shows the superseded target `finished=false interrupted=true` before the winning target's settle; no double-settle or stuck state. (Synthetic capture not possible — sequential taps cannot race the spring.) | — (verbal hand-ratification) |
| 4. Touch-through | PASS — counter incremented 0→1 while card was in Selected (lifted) state | android-r2-02-selected-settled.png |
| 5. No regression — FxPressable | PASS (prior gate, unchanged) | android-04-fxpressable-regression.png |
| 5. No regression — Presence | PASS (prior gate, unchanged) | android-06-presence-regression.png |
| 5. No regression — interactionMode shader | PASS (prior gate, unchanged) | android-05-u10-regression.png |

## iOS — iPhone 16 Plus (simulator)

| Claim | Result | Screenshot |
|-------|--------|------------|
| 1. State-flip easing | PASS — card transitions between Idle and Selected; settle event confirms animation completed | ios-02-selected-settled.png |
| 2. Settle event (one per flip) | PASS — `state=selected finished=true interrupted=false` fires on each Select flip; one entry per flip | ios-02-selected-settled.png |
| 3. Interrupt ordering | PASS — hand-ratified by gate owner 2026-06-21: a rapid by-hand double-tap shows the superseded target's `interrupted=true` before the winning target's settle. The prior-session log (ios-01-existing-state.png) already carried `finished=false interrupted=true` entries; the hand test confirms it live. | ios-01-existing-state.png |
| 4. Touch-through | PASS — counter incremented from 3 to 4 after tapping card body while in Selected state | ios-03-touch-through.png |
| 5. No regression — FxPressable | PASS — onPress event fired | ios-04-fxpressable-regression.png |
| 5. No regression — Presence | PASS — screen loads, Show/remount/offscreen controls visible, no crash | ios-05-presence-regression.png |
| 5. No regression — interactionMode shader | PASS — U10-001 loaded, `load: dots` in semantic log | ios-06-u10-regression.png |

## LAW OBLIGATION — lift magnitudes (rule #2)

Platforms are now diverged (the law requires this):

- iOS: `scale = 1.03`, `translateY = -3pt` (unchanged from original seed — iOS pass accepted as-is by gate owner)
- Android: `scale = 1.04`, `translateY = -6dp * density` (~15–16px on POCO F1)

**Android re-gate assessment:** The 6dp translateY reads as a clear upward float in the settled screenshot (visible bottom-gap widening vs idle baseline). Scale 1.04 adds slight visual weight without reading as dramatic. Transform-only (no elevation channel) passes for this MVP seed — the lift reads as deliberate, not subtle-outline-only. Human gate owner must confirm the live animation feel; if transform-only still reads weak in motion, escalate to elevation channel.

**Chosen values (record final numbers once live animation judged):**

- iOS: scale = 1.03, translateY = -3pt
- Android: scale = 1.04, translateY = -6dp
