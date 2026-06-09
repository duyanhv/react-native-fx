# Merge batch review — 2026-06-09

Records the `reviewed` gate for three tasks merged on `integration/0.1.x` whose review happened
in-session without a standalone review doc (audit-2026-06-09 finding S2). Review-only — verdicts
and provenance, not new design.

## U3-006 · curated shader catalog (10) — APPROVED

- 10 MSL `[[stitchable]]` + 10 AGSL shaders; `ShaderId` widened to all ten; hosted dispatch on
  both platforms. Headless green (18 jest); device-verified iOS + Android (incl. blank-on-switch
  + intensity-flicker fixes).
- Closure: `22` reconciled (all ten ids ship with native pairs). REAL-002/REAL-003 correctly left
  to U3-005 (not laundered into U3-006). Maintainer confirmed the review gate.

## U4-001 · wrapper mechanic (RT-015) — APPROVED (after reconciliation fixes)

- Decision sound and well-grounded in `33`: the animator targets an intermediate **view** (not a
  raw CALayer) inside `FxSurfaceView` that Fabric does not track; override scoped to `FxSurfaceView`
  (not the abstract base); cites `BaseViewProps.h`/`Differentiator.cpp` for the clobber mechanism.
- Findings caught + fixed during review: (1) RT-015 was left `open` in the ledger while the decision
  was made in source — flipped to `resolved` and the reconciliation rows updated; (2) the
  `FxManagedView`/src-tree reconciliation was incomplete — handled (the broader phantom-binding
  drift was lodged as DOC-014, correctly *not* force-fixed inside the wrapper task).
- Mid-animation "child rides the animated wrapper" proof is deferred to U6 (no animator yet);
  the static mechanic is device-verified.

## U4-002 · mountChildComponentView override (RT-014) — APPROVED (reimplemented to templates)

The substantive review of this session. First implementation compiled but failed on device four
ways; a **reference fan-out over `references/`** (RN core, Expo, Reanimated, gesture-handler)
proved the intermediate-container design is a *shipping Expo pattern* and located every bug as a
template deviation, not an architecture flaw:

- **Rule #7 — PASS (verified in code):** clean Swift/Kotlin override over Expo's surface, no
  C++/JSI/HybridObject. A real de-risking of the no-Nitro bet (SPINE-009).
- **Android crash** — `super.onLayout` ran `LinearLayout`'s traversal over the proxied
  `FrameLayout`-params child → `ClassCastException`. Fix: lay only the container (no super), full
  `ExpoBlurTargetView.kt` override family, `onMeasure`/`onLayout` sizing (also the 0×0 fix).
- **iOS "shows from start" / can't hide** — a spurious default shader (`pendingShader = "fractal-clouds"`
  → `""`) rendered in front of the content; the mount/unmount overrides were correct all along (logs
  confirmed). Plus a free-running hidden `MTKView` loop (sluggish UI / laggy taps / gesture-gate
  timeouts) → now pauses when no effect is active. Symmetric mount/unmount + superview guard added.
- The corrected per-platform mechanic + the proven-template rules are pinned in
  `structure.{ios,android}.md`; `33` carries the no-reparent (Reanimated) fallback note.
- Device-verified iOS + Android (maintainer). RT-014 resolved.

**Process note (carried into [[react-native-fx-review-grounding]]):** for native parity work, diff
the new view against the already-solved sibling (`FxHostedView`) + the `references/` templates for
documented platform gotchas *as part of review* — the Android layout crash was catchable pre-device
that way. Reviewing in isolation missed it.
