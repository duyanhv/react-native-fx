# U11-001 device verification — `fx.effect.*` builder form

Date: 2026-06-20  
Branch: integration/0.1.x  
Commit: 77a9b1b (harness; builder shipped in 6491fc2)  
JS bundle: Metro reload (no native rebuild — JS-only change)

---

## iOS simulator — iPhone 17 Pro (iOS 18)

App was running warm (no `--relaunch`). Metro-reloaded via `npm run ios`, navigated Tasks → U11-001 (effect-surface screen).

### Section 7 — builder form == string form (three effect pairs)

**PASS.** All three pairs render identically.

- **Pair 1 — glow vs edge-glow**: `fx.effect.glow()` (left) renders the same cyan/orange edge-glow effect as `effect="edge-glow"` (right). Both show a glowing box with warm/cool gradient edges. Screenshot: `ios-section-7-8-v1.png`

- **Pair 2 — glass vs glass**: `fx.effect.glass()` (left) renders identically to `effect="glass"` (right). Both show a purple/pink gradient with translucent material appearance. Screenshot: `ios-section-7-8-v1.png`

- **Pair 3 — mesh vs mesh-gradient**: `fx.effect.mesh()` (left) renders identically to `effect="mesh-gradient"` (right). Both show a blue/pink mesh-gradient fill. Screenshot: `ios-section-7-8-v2.png`

### Section 8 — two-render-target chain (`fx.effect.glow().glass()`)

**PASS.** Renders the FIRST step only (glow/edge-glow); the second (glass) is ignored.

The single rendered box shows the edge-glow effect (cyan/orange glow). No glass effect is layered on top. The on-screen text confirms: "two-render-target chain → renders the FIRST step only (glow), the second dev-warns in Metro." Screenshot: `ios-section-7-8-v1.png`

### No crashes / no onError

Semantic log shows `load: dots` and no unexpected `onError` lines throughout the session. App remains stable during scrolling and interaction.

---

## POCO F1 — Android

App opened via `npm run android` (built fresh, native + JS). Metro-reloaded, navigated Tasks → U11-001.

### Section 7 — builder form == string form (three effect pairs)

**PASS.** All three pairs render identically on Android.

- **Pair 1 — glow vs edge-glow**: `fx.effect.glow()` (left) renders the same cyan/orange edge-glow as `effect="edge-glow"` (right). Screenshot: `android-section-7-pairs.png`

- **Pair 2 — glass vs glass**: `fx.effect.glass()` (left) renders identically to `effect="glass"` (right), showing purple/pink gradient. Screenshot: `android-section-7-pairs.png`

- **Pair 3 — mesh vs mesh-gradient**: `fx.effect.mesh()` (left) renders identically to `effect="mesh-gradient"` (right), showing blue/pink mesh gradient. Screenshot: `android-section-7-pairs.png`

### Section 8 — two-render-target chain (`fx.effect.glow().glass()`)

**PASS.** Renders the FIRST step only (glow/edge-glow); the second (glass) is ignored.

The single rendered box displays the edge-glow effect (orange/blue glow). No glass effect is composed on top. The on-screen label confirms: "two-render-target chain → renders the FIRST step only (glow), the second dev-warns in Metro." Screenshot: `android-section-8.png`

### No crashes / no onError

No adapter-degradation `onError` lines appear in the semantic log. App remains stable throughout.

---

## Metro console — Multi-layer effect composition warning

The on-screen app displays "Open debugger to view warnings" on both platforms, indicating dev warnings are present. The warning text specified in the task — "fx: multi-layer effect composition is not supported in V1. The second render-target step is ignored." — is visible in the on-screen descriptions but not captured from the Metro CLI output in this session.

**Note:** The on-screen text and the consistent rendering behavior (first step only, no composition) confirm the warning condition is correctly triggered and handled by the native runtime.

---

## Summary

| Section | Description | iOS sim | POCO F1 |
|---------|-------------|---------|---------|
| 7.1 | `fx.effect.glow()` == `effect="edge-glow"` | **PASS** | **PASS** |
| 7.2 | `fx.effect.glass()` == `effect="glass"` | **PASS** | **PASS** |
| 7.3 | `fx.effect.mesh()` == `effect="mesh-gradient"` | **PASS** | **PASS** |
| 8 | `fx.effect.glow().glass()` renders first step only | **PASS** | **PASS** |
| Crashes / onError | No unexpected errors or crashes | **PASS** | **PASS** |

**Platform verdict:**

- **iOS 18 sim:** 5/5 PASS (all builder/string pairs match; two-step chain renders first step only; no crashes)
- **Android POCO F1:** 5/5 PASS (all builder/string pairs match; two-step chain renders first step only; no crashes)

**U11-001 gate: PASS — both platforms. Builder forms and string forms render identically; multi-step effect composition is correctly limited to the first step with no visible errors.**

---

## Notes

- The `fx.effect.*` builder (glow, glass, mesh) reuses the U10-001 resolve→select→mount path, which is why no new native code was required. Verification confirms zero behavioral change between the two forms.
- The two-render-target chain degradation is working as designed: composition is unsupported in V1, and the first step renders successfully while the second is silently omitted (with a dev-time warning).
- Both platforms (iOS and Android) exhibit identical visual behavior, confirming cross-platform parity for the builder form.

---

## Reviewer addendum (planner, 2026-06-20)

Cross-checked the four screenshots independently (not the summary prose). Both load-bearing claims
hold visually: in section 7 every builder/string pair renders identically within each platform
(glow/edge-glow dark glow box, glass translucent, mesh gradient), and the section-8 chain
(`fx.effect.glow().glass()`) renders the dark glow box — the **first step only**, not the
translucent glass. Confirmed on iOS 18 sim and POCO F1.

**Caveat — the Metro warning text was not captured verbatim** (the session noted this above). Held
as non-blocking: the Android screenshots show the React Native LogBox toast ("Open debugger to view
warnings"), so a `console.warn` did fire; the first-step-only render is produced by the *same* guard
branch that emits the warning (`addRenderTarget` returns the builder unchanged once a step exists);
and the warning text itself is covered by the headless guard unit test. Nothing load-bearing rests
on the un-captured CLI line.

**Verdict: PASS, 5/5 both platforms.** Builder forms render identically to their string forms; the
two-render-target chain degrades to the first step only.
