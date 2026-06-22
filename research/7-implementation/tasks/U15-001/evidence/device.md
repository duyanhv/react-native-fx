# U15-001 device verification — typed material config (tint + colorScheme)

Commit: 89b594b (the public-path row + iOS-aligned Android tint parser; supersedes the 7440f19 the runner first noted — the `<Fx effect={fx.effect.glass(…)}>` rows below only exist as of 89b594b, and the captures postdate it). Build: native rebuild on both platforms.
iOS: iPhone 17 Pro simulator (iOS 26). Android: POCO F1.
Captured: 2026-06-21.

---

## iOS 26 — iPhone 17 Pro simulator

### Row 1 — tint casts the glass

Each tint color is applied with colorScheme=system. The glass visibly takes the hue; "none" produces untinted frosted glass.

| state | screenshot | result |
|---|---|---|
| tint=none, colorScheme=system | ios-tint-none-system.png | PASS — frosted glass; color blocks visible through muted blur |
| tint=#ff6b6b, colorScheme=system | ios-tint-ff6b6b-system.png | PASS — glass takes a strong red/coral hue via UIGlassEffect.tintColor |
| tint=#339af0, colorScheme=system | ios-tint-339af0-system.png | PASS — glass takes a blue hue |
| tint=#51cf66, colorScheme=system | ios-tint-51cf66-system.png | PASS — glass takes a green hue |

Both `FxHostedView materialConfig={…}` and the `<Fx effect={fx.effect.glass(…)}>` public path builder produce identical appearance in every frame. The tint applies to `UIGlassEffect.tintColor` on iOS 26.

**Row 1: PASS**

### Row 2 — colorScheme forces appearance

tint=none; colorScheme toggled across all three values.

| state | screenshot | result |
|---|---|---|
| colorScheme=system | ios-tint-none-system.png | PASS — follows device (light in sim); glass is light-frosted |
| colorScheme=light | ios-tint-none-light.png | PASS — light frosted glass regardless of any system override |
| colorScheme=dark | ios-tint-none-dark.png | PASS — glass switches to dark (near-black) frosted appearance |

Combination also tested: ios-tint-ff6b6b-dark.png — tint=#ff6b6b with dark colorScheme produces a salmon/coral glass on a dark base, confirming both axes compose correctly.

colorScheme is applied via `effectView.overrideUserInterfaceStyle` on the hosted UIView.

**Row 2: PASS**

### Row 3 — no regression

Screenshot ios-regression-top.png shows the top of the fill-material screen (above the U15-001 section):
- `fill · gradient (iOS + Android)` — star-shaped multicolored fill renders correctly
- `fill · gradient, intensity 0.3` — same gradient at reduced intensity renders correctly
- `material · glass over content (iOS only)` — untinted system glass over color blocks renders correctly; no change from pre-U15-001 behavior

**Row 3: PASS**

### Sub-26 fallback — code-reasoned

No sub-26 simulator was available. Code reasoning:

- `colorScheme` is applied via `overrideUserInterfaceStyle` on the view hosting the material. This API exists from iOS 13 and applies equally to UIVisualEffectView on older devices, so colorScheme continues to work on the `.ultraThinMaterial` fallback.
- `tint` is set via `UIGlassEffect.tintColor`, a property available only on iOS 26. On pre-26 devices the code path falls through to a no-op; the glass renders untinted. This degradation is documented and expected.

---

## Android — POCO F1

### Row 4 — tint colors the frost scrim

Each tint color applied with colorScheme=system. The fx-drawn frost scrim takes the tint color; "none" produces a white/neutral frost.

| state | screenshot | result |
|---|---|---|
| tint=none, colorScheme=system | android-tint-none-system.png | PASS — white frost; color blocks clearly visible behind scrim |
| tint=#ff6b6b, colorScheme=system | android-tint-ff6b6b-system.png | PASS — frost scrim tinted pink/salmon; color blocks tinted through |
| tint=#339af0, colorScheme=system | android-tint-339af0-system.png | PASS — frost scrim tinted blue |
| tint=#51cf66, colorScheme=system | android-tint-51cf66-system.png | PASS — frost scrim tinted green |

Both `FxHostedView materialConfig={…}` and `<Fx effect={fx.effect.glass(…)}>` builder show the same tint in every frame. Color blocks remain legible through the tinted scrim (contrast with iOS where the tint is more opaque — platform-native behavior difference, both correct).

**Row 4: PASS**

### Row 5 — colorScheme switches the base

tint=none; colorScheme toggled across light/dark (system is equivalent to light on this device in its current setting).

| state | screenshot | result |
|---|---|---|
| colorScheme=system | android-tint-none-system.png | PASS — white/light frost base |
| colorScheme=light | android-tint-none-light.png | PASS — white frost base; content clearly visible |
| colorScheme=dark | android-tint-none-dark.png | PASS — gray/dark frost base; material darkens significantly |

**Row 5: PASS**

### Row 6 — no regression

Screenshot android-regression-top.png shows the top of the fill-material screen (above the U15-001 section):
- `fill · gradient (iOS + Android)` — blue-to-purple gradient fill renders correctly
- `fill · gradient, intensity 0.3` — lighter variant renders correctly
- `material · glass over content (iOS only)` — section renders color blocks with no glass overlay on Android (correct; labeled "iOS only"), no crash

App remained responsive throughout all chip interactions; no crash or LogBox error observed (the "Open debugger" toast is a pre-existing dev-mode warning, not a U15-001 regression).

**Row 6: PASS**

---

## Summary

| row | description | iOS 26 | Android (POCO F1) |
|---|---|---|---|
| 1 | tint casts the glass / frost scrim | PASS | PASS |
| 2 | colorScheme forces appearance | PASS | PASS |
| 3 / 6 | no regression | PASS | PASS |
| 4 | (Android) tint colors frost scrim | — | PASS |
| 5 | (Android) colorScheme switches base | — | PASS |

**Overall: PASS on both platforms.**

Sub-26 tint degradation is code-reasoned and documented above; no device evidence required per runbook.
