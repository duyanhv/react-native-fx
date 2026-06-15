# U3-003 — notes

## 2026-06-10 — Android material implemented (headless-done)

What changed and why, one line each:

- `research/5-realization/structure.android.md` §material — rewritten to the ratified
  shape before code (the repo rule): own-content composition + `View.setRenderEffect`
  (reconciling the stale `applyVia:graphicsLayer` Compose flavor), pinned constants
  (24dp max radius; scrim weights regular 0.55 / clear 0.28; highlight 0.35→0.05),
  inert `interactive`, below-31 unblurred floor, Haze → `planned` non-selectable.
- `packages/android/.../FxMaterialView.kt` (new) — a plain `View` implementing
  `FxEffectView`: frost scrim + vertical highlight gradient in `onDraw`, blurred by
  `RenderEffect.createBlurEffect(radius, radius, CLAMP)` via `setRenderEffect` on API
  31+; the stack draws unblurred below 31 (never a flat box). `MaterialConfig` Record
  (`variant`/`interactive`, `@Field` each) co-located with its consumer, mirroring the
  iOS `FxGlassSurfaceView.swift` placement.
- `packages/android/.../FxHostedView.kt` — `pendingMaterialConfig` + `setMaterialConfig`
  (two-phase stash); the `"material"` branch in `mountEffect` (closes the B1-1
  `else -> return` gap); intensity/config changes push onto the live view, no remount.
- `packages/android/.../FxModule.kt` — `Prop("materialConfig")` registered on the
  `FxHostedView` definition (the TS side already sends it; no TS changes).
- `packages/src/__tests__/manifest-select.test.ts` — the `material` node joins the
  fixture (the shipped manifest data is still the test fixture; no `packages/src/manifest`
  data file exists to edit): Android blur rung at `{os:31, hosted}`, planned Haze rung
  (non-selectable, mirroring the Android symbol idiom), `via:draw` unblurred floor at
  `{os:21, hosted}`; iOS glass + `.ultraThinMaterial` peer ladder; 5 new select() cases.
- `tasks/U3-003/README.md` + `evidence/{gradle.md,headless.md}` — the work order, the
  build/gate record, and the B1 device scenario.

Build fix worth noting: `MaterialConfig` is public, not `internal` — the public
`FxHostedView.setMaterialConfig` signature exposes it and Kotlin rejects the visibility
mismatch (caught by `compileDebugKotlin`).

## Unverified claims

- The translucent stack + blur actually renders as a credible frosted panel on device
  (blurring a smooth own-content gradient is visually subtle; the constants may need
  tuning at the human gate).
- Low vs high intensity are visibly different in blur radius and overlay alpha.
- `regular` vs `clear` are visibly different in weight.
- `interactive` toggles with no crash and no behavior change on device.
- No scroll-jank regression vs the B2 ~60 fps baseline.
- Below-31 unblurred degradation — not exercisable on any attached hardware (none this
  session; the sweep device is API 35 anyway); covered by the `SDK_INT` code path and the
  manifest `select()` test.

## Device results

### 2026-06-11 — B1 run on POCO F1 (API 35) via agent-device — PASS recommended

Fresh `./gradlew :app:assembleDebug` → `adb install -r` (APK timestamp current). The B1
scenario is split across the two material screens (the glass section's slider drives the
`loop` shader, not the material, so intensity is exercised on the android-material screen):

- **B1-1 render — PASS:** translucent frosted panel over its own stack on both screens (not
  absent, not a flat/dark box).
- **Intensity — PASS:** 0.20 vs 0.98 visibly differ in blur radius, applied live in place (no
  flash/remount). Overlay-opacity difference subtle on the white stage; blur radius unmistakable.
- **Variant — PASS:** `regular` heavier frost vs `clear` lighter/more transparent (scrim 0.55 vs
  0.28), in place.
- **Interactive (inert) — PASS:** toggled `interactive`, pressed the tile — no crash, no behavior
  change, no press feedback; PID stable, no logcat exception.
- **Scroll — PASS:** 59.8 fps, 0 stutters (4+) with the material mounted; ~0.9% dropped session
  cumulative. No B2 regression.
- **Staleness — observed clean:** the blur tracks the moving/recoloring block (no `RenderEffect`
  staleness).
- **Below-31 floor — not exercisable** on an API 35 device (covered by the `SDK_INT` guard + the
  manifest `select()` test).

Results + PASS/FAIL writeup in `evidence/device.md`; stills in `evidence/device-run-2026-06-11/`.
The unverified claims above are now all observed PASS on device. `device-verified` NOT ticked.

Next: maintainer ratifies `device-verified` on the evidence — FX-003 closes in `21` only after
that tick; then `reviewed` / `docs-closed` / `merged`.
