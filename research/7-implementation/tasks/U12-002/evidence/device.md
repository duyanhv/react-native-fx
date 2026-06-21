# U12-002 · FxView effect prop — device evidence

Agent-collected 2026-06-21.
Human ratification required for items flagged below.

**Row 4 hand-ratified by the maintainer 2026-06-21** — manual interrupt (a Select→Deselect that races the spring) confirmed on device; the effect stays coupled through the concurrent retarget. The interrupt FSM itself is U12-001's (unchanged by this JS-only unit), already hand-ratified there. All five rows are now ratified on both platforms.

## iOS — iPhone 17 Pro (simulator)

| Claim | Result | Screenshot |
|-------|--------|------------|
| 1. Effect behind content (z-order) | PASS — glow markers visible at all four corners of the effect card at rest; card text ("Idle", "taps: 0") fully unobscured; no-effect card shows no glow | ios-01-idle-baseline.png |
| 2. Lifts with content | PASS — after Select, card shows "Selected" in lifted position; glow corner markers remain at card edges (moved up with the card, not pinned to resting position); log shows `state=selected finished=true interrupted=false` for both cards | ios-02-selected-settled.png |
| 3. Touch-through | PASS — effect card counter incremented from 0 to 2 on two directed taps while effect overlay covers the card; bottom (no-effect) card remained at 1, confirming hits were correctly routed | ios-03-touch-through.png |
| 4. Transition stability (rapid flip) | PASS — seven rapid Select/Deselect toggles completed; glow still present on idle settle; all log entries show `finished=true interrupted=false`; no flicker or effect dropout in final screenshot. NEEDS HAND-RATIFICATION for true concurrent spring interrupts — sequential synthetic taps cannot race the spring. | ios-04-rapid-flip.png |
| 5. No-effect regression | PASS — no-effect card lifted to "Selected" on Select, fired `state=selected finished=true interrupted=false`, and accepted taps (counter reached 3); feature-complete FxView behavior unaffected by the addition of the `effect` prop on the sibling | ios-05-no-effect-regression.png |

## Android — POCO F1

| Claim | Result | Screenshot |
|-------|--------|------------|
| 1. Effect behind content (z-order) | PASS — glow markers visible at all four corners of the effect card at rest; card text ("Idle", "taps: 0") fully unobscured; no-effect card shows no glow | android-01-idle-baseline.png |
| 2. Lifts with content | PASS — after Select, card shows "Selected" in lifted position; glow corner markers remain at card edges (moved up with the card); log shows `state=selected finished=true interrupted=false` for both cards | android-02-selected-settled.png |
| 3. Touch-through | PASS — effect card counter incremented from 0 to 1 on a directed tap while effect overlay covers the card; no-effect card counter unchanged at 0, confirming the tap hit the correct target | android-03-touch-through.png |
| 4. Transition stability (rapid flip) | PASS — seven rapid Select/Deselect toggles completed; glow still present on idle settle; multiple `finished=true interrupted=false` entries in log; no flicker or effect dropout in final screenshot. NEEDS HAND-RATIFICATION for true concurrent spring interrupts — sequential synthetic taps cannot race the animation. | android-04-rapid-flip.png |
| 5. No-effect regression | PASS — no-effect card lifted to "Selected" on Select, fired `state=selected finished=true interrupted=false`, and accepted taps (counter reached 1); feature-complete FxView behavior unaffected by the addition of the `effect` prop on the sibling | android-05-no-effect-regression.png |
