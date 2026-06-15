# DEF-009 — Device Verification (executor evidence)

## Date
2026-06-14

## Devices / builds
- **Android:** POCO F1, **Android 15 / API 35**, hardware GPU (AGSL-capable — the proven
  DEF-008/U8-003 setup). Fresh `:app:assembleDebug` built from commit `a89d2fb`, installed via adb.
- **iOS:** iPhone 17 simulator (iOS 26). `npx expo run:ios` → `Build Succeeded`, app launched.
- App id `expo.modules.fx.example`; JS served by Metro. Driven with the agent-device CLI.

## Result
**PARTIAL — one blocking defect.** The content-distort capability is real and proven on Android
(visible draw-time distortion, live child touch survives, animation, intensity tracking, off-window
pause), pre-33 is inert-safe, and iOS is a clean no-op. **However**, the ripple **does not start on
initial mount or after navigating back to the screen** — the frame loop only starts after a manual
ripple off→on toggle. Demo defaults to `rippling=true`, so a user opening the screen sees crisp,
undistorted content until they toggle. Device gate is **not** ticked (maintainer ratifies).

> Per the gate rules: packages/ source was **not** modified to make any row pass. Temporary
> `Log.d` instrumentation added to observe the frame loop was reverted with targeted edits; the
> working tree is clean (`git status`: only this `evidence/` dir is untracked).

## Proof matrix

| # | Scenario | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | **Visible distortion** — content visibly rippled vs not | **PASS** (when loop active) | `screenshots/03-anim-frame-1.png`, `03-anim-frame-3.png` (strong wavy warp of text + both buttons at intensity 0.80) vs crisp `screenshots/01b-ripple-off.png` / `04a-intensity-low.png`. Toggling on/off flips the warp. |
| 2 | **Live child touch** (load-bearing) | **PASS** | `screenshots/02-live-touch-through-ripple.png` — Increment **(5)** and Second button **(3)**, caption "taps 5 · second 3", captured while the surface is visibly rippling. Touch survives the draw-time distortion. |
| 3 | **Animation** (time advances) | **PASS** (when loop active) | `video/03-ripple-animation.mp4`; frames `03-anim-frame-1..4.png` show the warp pattern moving frame-to-frame. `logs/choreographer-lifecycle.md` §2 shows `time` advancing at ~60 fps. |
| 4 | **Intensity** tracks 0→1, no flash/reset | **PASS** (when loop active) | `04a-intensity-low.png` (0.02 → crisp), `04e-mid-1.png` (0.50 → moderate warp), `04d-toggle-2.png` (0.89 → strong warp). Strength scales with the slider; slider press/drag did not flash, reset, or crash. |
| 5 | **Off-window / background pause** | **PASS** (loop never runs off-window) | `logs/choreographer-lifecycle.md` §3–4: HOME → `stopLoop` + 5 s silence; foreground → `resume`/`startLoop` + frames. Navigate away → `stopLoop` on detach. Rule #1 honored. *(See defect: loop does not restart on navigate-**back**.)* |
| 6 | **Pre-33** renders normally, no crash | **PASS (code-reasoned residual)** | No API <33 device/emulator available (only API 33 + API 35 AVDs on this host). Code-reason: `FxContentDistortion.update()` early-returns on `SDK_INT < TIRAMISU` **before** `isEnabled`/`ensureShader`/any `RuntimeShader`/`RenderEffect` reference; `clearEffect()` is also gated; the nullable `RuntimeShader?` field never class-loads until the gated `ensureShader()`. Content stays a plain RN tree → renders normally, no crash. Mirrors the shipped `FxSurfaceShaderView` gating precedent. |
| 7 | **iOS no-op** | **PASS** | `screenshots/07c-ios-content-distort.png` — `contentDistortion="ripple"` accepted, content renders crisp/undistorted, no LogBox/RedBox overlay, no `contentDistortion`/"unsupported prop" log line. `07d-ios-buttons-tap.png` + snapshot: Increment **(3)**, Second button **(2)** — buttons tap. No crash, no warning. |

## Defect found (blocking the headline claim)

**Ripple is inert on initial mount and after re-navigation; it only animates after a manual
off→on toggle.**

Reproduced cleanly three times (first open `01a`, post-remount `04b`/`04c-high-1..6`, and untouched
fresh mount `05-fresh-mount-1..4` — all crisp despite the chip reading "ripple on"). An animating
spatial ripple cannot render crisp, so the loop is not running.

Root cause (logcat in `logs/choreographer-lifecycle.md` §1 + source read of
`FxContentDistortion.kt` / `FxSurfaceView.kt`):
- `startLoop()` is gated on `target.isAttachedToWindow`, where `target` is the **child**
  `intermediateContainer` (the effect target, not the Fabric-tracked outer view).
- On mount, `applyResolvedConfig → update("ripple", …)` logs `attached=false` → startLoop skipped.
- The `resume()` fired from the base `FxNativeView.onAttachedToWindow()` also logs `attached=false`
  — a ViewGroup runs its own `onAttachedToWindow` **before** its children attach, so the child
  isn't attached yet — startLoop skipped again. Nothing retries once the child attaches.
- Intra-app navigation does not fire `onWindowFocusChanged`, so the window-focus path doesn't kick
  it either. Only a prop toggle (when the view is already fully attached) starts the loop.
- This is why background→foreground **does** resume (view stays attached) but mount / navigate-back
  **do not**.

Impact: the demo's default `rippling=true` shows no ripple until the user toggles; the README
device-verify line "ripple VISIBLY distorts … the distortion ANIMATES" is satisfied only after
interaction, not on first render. Suggested area for the maintainer/fix-round: start the loop once
the child container is genuinely attached (e.g. an attach listener on `intermediateContainer`, or
post the start to the next frame), rather than gating on the child's attach state at parent-attach
time.

## Also noted (not pass/fail) — per-frame setRenderEffect cost

The conservative per-frame `setRenderEffect(createRuntimeShaderEffect(...))` re-call animated
**smoothly at ~60 fps** on the POCO F1 (Adreno 630) for this single 280 px surface: logcat showed a
steady 30 frames / 0.5 s while active, and the in-app FPS overlay held 59.8–59.9 fps during
animation (the "dropped" counter accrued across the whole session, including navigations, not just
while rippling). No evidence on this device that `invalidate()`-alone is required for performance;
the framework question (whether `invalidate()` could replace the re-call) remains open but is not
perf-motivated here.

## Evidence index
- `screenshots/01a-ripple-on.png` — initial mount, "ripple on" but **inert/crisp** (defect)
- `screenshots/01b-ripple-off.png` — ripple off, crisp baseline
- `screenshots/02-live-touch-through-ripple.png` — Row 2, counters 5/3 through active ripple
- `screenshots/03-anim-frame-1..4.png` + `video/03-ripple-animation.mp4` — Rows 1 & 3, animating warp
- `screenshots/04a-intensity-low.png` (0.02), `04e-mid-1..2.png` (0.50), `04d-toggle-1..3.png` (0.89) — Row 4
- `screenshots/04b-intensity-high.png`, `04c-high-1..6.png` — 0.89 **inert before toggle** (defect)
- `screenshots/05-fresh-mount-1..4.png` — untouched fresh mount, inert (defect, clean repro)
- `logs/choreographer-lifecycle.md` — Choreographer loop logcat (mount / toggle / bg-fg / navigate)
- `screenshots/07a-ios-tasklist.png`, `07b-ios-screen.png`, `07c-ios-content-distort.png`, `07d-ios-buttons-tap.png` — Row 7 iOS no-op
