# Device batch — EX-002 + U3-003 (B1) — review

Date: 2026-06-11
Branch: `integration/0.1.x` · one agent-device session covered both device gates
Scope: the device evidence vs each task's scenario doc, plus EX-002's implementation
(pre-reviewed at headless-done) and U3-003's FX-003 closure chain. Review-only on code; the
reviewer executed the FX-003 doc closure (bookkeeping of a device-decided outcome).

## Verdict

**Both approved.** Instrumentation fully reverted (`git diff` over `packages/` and `example/`
empty — reviewer-confirmed); evidence grounded in device logs and stills; the one finding is
correctly classified as pre-existing, and the FX-003 closure is genuinely recorded in its
owning source doc per the cardinal rule.

## EX-002 — 100-cell stress list (approved)

Implementation pre-reviewed at headless-done (deterministic 4-kind cell mix, shader cells
correctly on `FxSurfaceView` — the lazy-MTKView/shared-context path under test; registration
matches the harness idiom; comments clean). Device run, iOS 26.5 sim + POCO F1:

- **(a) Shared Metal context — PASS.** Exactly 1 `MTLDevice` + 1 `MTLCommandQueue`
  process-wide across the whole session; 5 pipeline compiles = the 5 distinct raster ids,
  each compiled once — repeat-id cells scrolling in and out (ink-smoke #4 and #44) drew from
  one cached pipeline. This is the multi-instance proof U4-003 deferred here, now delivered.
- **(c) Zero `MTKView` for motion-only cells — PASS.** All 28 allocations traced to shader
  cells via `ensureEffectSurface`; motion-only wrappers allocated none at list scale.
- **(b) Scroll perf — PASS on Android hardware** (59.8 fps, 0 stutters ≥4 frames, ~0.4–2.6%
  dropped over full-list flinging); **partial on the iOS sim** (Apple's fps tooling is
  unavailable on simulators). The iOS-hardware fps row stays open as a standing-scenario
  re-run whenever a physical iPhone is attached — the screen is standing infrastructure, so
  nothing is lost.
- **A11y — PASS both platforms.**

**Finding (correctly classified pre-existing):** Android expo-view shader cells render blank —
`FxSurfaceView.kt`'s renderer is the documented deferred work (`structure.android.md`; the
hosted `FxShaderView.kt` path does render). The scenario doc's "Android shader cells via AGSL"
claim was inaccurate and is corrected in `evidence/device.md`. Not an EX-002 defect; the
interactive-renderer work owns it.

## U3-003 — Android material, B1 scenario (approved)

The implementation landed earlier (sweep B1) and held only on hardware; the POCO F1 run
closes it: render over content, live intensity easing (0.20 → 0.98 blur radius), `regular`
vs `clear` variants visually distinct, `interactive` inert (no crash, no feedback — correct:
the Android rung has no system press response), scroll 59.8 fps with **no `RenderEffect`
staleness** (the FX-003 risk, device-checked clean). APK freshness verified (current-timestamp
gradle build, not the stale prebuilt).

**FX-003 closure executed (cardinal rule satisfied):** `21` Decision 6 records the Android
glass default (own-content blur; Haze stays the planned optional-peer rung) and the
`intensity` 0–1 normalization (iOS `fractionComplete`; Android blur radius + overlay alpha);
both matching open questions in `21` struck as resolved; the ledger row and its
Reconciliation row flipped to `resolved`. Mechanics remain pinned solely in
`structure.android.md`.

## Carry-forwards

- iOS-hardware scroll-fps row for EX-002 — re-run the standing scenario on a physical
  iPhone when attached.
- The Android interactive shader renderer (expo-view path) — already-documented deferred
  work; the stress list will light up its shader cells for free when it lands.

Remaining gate on both: `merged` (maintainer).
