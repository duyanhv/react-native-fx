# U2-003 — device evidence

Run date: 2026-06-11. Driven via agent-device on log-instrumented builds.

- **iOS:** iPhone 17 Pro · iOS 26 simulator (the U4-003 precedent device), Metal-capable.
- **Android:** physical POCO F1 · Android 15 / API 35 (above the API 33 floor, so the
  AGSL load path is exercisable).

The two device-pending claims under test live in [`../notes.md`](../notes.md) §Unverified:
(A) the absent-vs-empty `shader` reset, and (B) `onFxLoad`/`onFxError` firing once per
shader change — never per frame — including the iOS interactive raster-subset error change.

## Instrumentation (temporary, reverted)

To make the events deterministic, three files were temporarily instrumented and **reverted
after the run** (`git diff` over `packages/` and `example/` is empty; only this `evidence/`
folder is added):

- `packages/ios/FxSurfaceView.swift` — `NSLog("[FxU2003] …")` lines in
  `dispatchShaderLoadState()` (load / error / silent-clear / dedup-skip) and
  `updateEffectSurfaceVisibility()` (surface visible vs hidden+paused). Log-only; no behavior
  change.
- `packages/android/.../FxSurfaceView.kt` — matching `Log.i("FxU2003", …)` lines in
  `dispatchShaderLoadState()`. Log-only.
- `example/screens/content-motion.tsx` (the U4-002 / interactive `FxSurfaceView` screen) —
  temporarily given shader chips (`loop`, `fractal-clouds`, `aurora (non-raster)`, `clear`),
  an intensity slider, and on-screen `load=N error=M` / `last=…` counters wired to
  `onFxLoad`/`onFxError`. The counters make the once-per-change claim verifiable from the UI
  itself, independent of the native log.

iOS rebuilt with `expo run:ios`; Android rebuilt with `gradlew :app:assembleDebug` + `adb
install` (the `expo run:android` device-select prompt is non-interactive, so it never reached
gradle — the first install was a stale Jun-9 APK that predated the U2-003 native changes and
showed `load=0`; a fresh gradle APK was required).

---

## iOS — both scenarios PASS

Native log excerpt: [`fxu2003-ios-device-log.txt`](./fxu2003-ios-device-log.txt).

### Scenario A — absent-vs-empty `shader` reset

- **Claim:** set `shader` to a curated id, then back to `undefined` → the surface clears (no
  stuck last frame), the render loop pauses, and **no** `onFxLoad`/`onFxError` fires for the
  clear.
- **Steps:** tap `loop` (surface renders the animated shader), drag intensity, then tap `clear`
  (sets `shader` to `undefined`, which the JS wrapper coerces to `''`).
- **Observed:** the surface visually emptied — [`04-ios-clear-reset-silent.png`](./04-ios-clear-reset-silent.png)
  shows the box blank, no residual loop pixels. Counters held at `load=1 error=0`. Native log:
  `shader cleared (loop -> <none>): silent, no event` immediately followed by
  `surface hidden+paused (hasActiveEffect=0 metalViewExists=1)` — the lazily-allocated `MTKView`
  was hidden **and paused** (loop stopped), not torn down.
- **Verdict:** **PASS.** Absent ⟺ empty ⟺ no effect; the clear is silent and pauses the loop.

### Scenario B — `onFxLoad`/`onFxError` once per change, never per frame

- **`loop` (raster id) → exactly one `onFxLoad`.** `load=1 error=0`, `last=load:loop`; the shader
  renders ([`02-ios-loop-load-once.png`](./02-ios-loop-load-once.png)). Native log: one
  `onFxLoad shader=loop`.
- **Re-apply same id → no second event.** Re-tapping `loop` left `load=1` (React does not resend
  the unchanged prop).
- **Intensity drag → no events (never per frame).** Dragging intensity 0.80 → 0.19 held
  `load=1 error=0` ([`03-ios-intensity-no-event.png`](./03-ios-intensity-no-event.png)). The
  native log shows **47** `dispatch skipped (dedup): shader=loop` lines across the drag:
  `applyResolvedConfig` re-ran 47 times and dispatched **zero** events — uniform changes are not
  shader changes.
- **`aurora` (non-raster id) on the interactive surface → exactly one `onFxError`, no render.**
  `load=1 error=1`, `last=error:aurora:no renderer for shader id`; the surface stays **empty** —
  it does **not** silently fall back to `fractal-clouds`
  ([`05-ios-aurora-interactive-error-no-render.png`](./05-ios-aurora-interactive-error-no-render.png)).
  Native log: one `onFxError shader=aurora` + `surface hidden+paused`. This is the U2-003 behavior
  change (`fragmentName(for:)` returns nil → nil pipeline → error).
- **Hosted regression — `aurora` still renders on the hosted path.** On the shader-catalog screen
  (`FxHostedView`), `aurora` renders its bands normally
  ([`06-ios-aurora-hosted-renders.png`](./06-ios-aurora-hosted-renders.png)) — the error is scoped
  to the interactive surface only; the hosted path is unaffected (still 10).
- **Verdict:** **PASS** on every sub-claim.

---

## Android — PASS (load/error dispatch + silent clear)

Native log: [`fxu2003-android-device-log.txt`](./fxu2003-android-device-log.txt). POCO F1, API 35.
As scoped for V1, the Android interactive surface renders **nothing** (the GPU path is deferred
to U8) — what is under test here is the load/error dispatch (the AGSL asset open + compile), not
a rendered effect.

- **`loop` (valid id) → exactly one `onFxLoad`.** `load=1 error=0`, `last=load:loop`
  ([`07-android-loop-load-once.png`](./07-android-loop-load-once.png)). Native log:
  `onFxLoad shader=loop (asset opened + compiled)` — the curated `.agsl` opened and `RuntimeShader`
  compiled it. The surface itself is blank (expected).
- **Re-apply same id → no second event.** Re-tapping `loop` held `load=1`.
- **`clear` → silent.** `load=1 error=0`, `shader=<none>`. Native log:
  `shader cleared (loop -> <none>): silent, no event`.
- **Platform divergence (documented, expected): `aurora` → `onFxLoad` on Android.** Because every
  curated id ships an on-disk `.agsl` asset, `aurora` opens + compiles and fires `onFxLoad`
  (`load=2`, `last=load:aurora`) — [`08-android-aurora-load-divergence.png`](./08-android-aurora-load-divergence.png).
  This is the correct counterpart to the iOS interactive raster subset: the iOS-interactive
  `onFxError` for `aurora` is iOS-specific (a 5-of-10 raster catalog), while Android proves the
  load by asset compile. The `{ shader, reason? }` payload shape is identical across platforms.
- API 33+ only; below 33 the rung degrades silently (not exercised — POCO F1 is API 35).
- **Verdict:** **PASS** for the in-scope Android claims (valid id loads, clear is silent).

---

## Accessibility (required of every device gate)

Across both platforms the interactive `FxSurfaceView` surfaced only its wrapped content to the
accessibility tree (the instrumentation chips, counters, and slider); the decorative GPU surface
(iOS `MTKView`; Android has none yet) never appeared as its own element or stole focus. Consistent
with the U4-003 a11y observation.

## Stills

| File | Platform | Shows |
|------|----------|-------|
| `01-ios-baseline-no-shader.png` | iOS | initial state, `load=0 error=0`, empty surface |
| `02-ios-loop-load-once.png` | iOS | `loop` renders, `load=1` |
| `03-ios-intensity-no-event.png` | iOS | intensity 0.19, counters still `load=1 error=0` |
| `04-ios-clear-reset-silent.png` | iOS | surface cleared, silent, `load=1 error=0` |
| `05-ios-aurora-interactive-error-no-render.png` | iOS | `aurora` → `error=1`, empty (no fallback) |
| `06-ios-aurora-hosted-renders.png` | iOS | `aurora` renders on the hosted path |
| `07-android-loop-load-once.png` | Android | `loop` → `load=1` (asset compiled), blank surface |
| `08-android-aurora-load-divergence.png` | Android | `aurora` → `load=2` (asset exists, loads) |

Screen recordings stayed local-only (repo gitignores `evidence/**/*.mp4|*.mov`); the stills + the
two device logs carry the proof.
