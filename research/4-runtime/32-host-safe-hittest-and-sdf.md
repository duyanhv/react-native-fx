# Runtime: host-safe hit-testing & SDF pass-through
Status: researched
Phase: v2
Feeds: 30-interaction-and-gestures.md, 50-api-and-presets.md
Owns: the runtime (G) hit-testing model (cross-platform). Mechanics → structure.{ios,android}.

## Why this matters

This is the moat. Everything else in the catalog you could approximate with
"expo-ui + effect modifiers"; the thing neither SwiftUI nor Compose gives you in an
RN context is a **shaped, host-safe, interactive surface** — a glow-shaped
**interactive effect surface** that is only touchable *inside the glow*, yields
correctly to scrollers, and doesn't sever RN touch. This doc owns that model. It exists **only on the
`expo-view` substrate**; the hosted world cannot provide it (below).

## Host-safe hit-testing

On the `expo-view` substrate the surface is a plain native view, so it owns its
`hitTest`. Two jobs:

- **Composition pass-through.** In `overlay` composition the decorative surface must
  let touches reach RN content below — `hitTest` returns nil unless `interactionMode`
  claims the gesture. In `background` it sits behind and never intercepts.
- **Shaped hit-testing (SDF).** For a surface whose *visible* effect is a shape (a
  glow blob, a soft-edged effect region, any non-rectangular **effect mask**), touches
  outside the shape should pass through. The surface evaluates a **signed-distance field**
  for the effect's shape at the touch point and only claims the gesture when the point is
  inside (with a tunable feather). This is what makes a magnetic/glow **effect surface**
  feel like a real object rather than an invisible rectangle.

The SDF is the same shape description the shader already uses to draw the effect, so
draw and hit-test stay consistent by construction — the touchable region is exactly
the visible region, per frame, with no separate hand-maintained mask.

## Why this can't live in the Host world

The Host world (auto-Host #46549) exposes only `pointerEvents`
(`box-none | none | box-only | auto`) — a coarse, rectangular lever. There is no
shape-aware hit-testing because a `UIHostingController` captures across its bounds,
and content-sampling effects sever RN touch. So shaped/host-safe interaction is
**structurally** an `expo-view`-only capability. Decorative effects ride the Host and
its coarse passthrough (fine — they don't need this); interactive shaped surfaces live
here. This is the G-vs-Host exclusivity from `01`, viewed from the hit-testing side.

## The Android asymmetry

Android's `RenderEffect`/AGSL are draw-time and don't sever input dispatch, so the
hosted/expo-view line is softer for touch — but shaped hit-testing still belongs on
the `expo-view` child where `onTouchEvent` and the SDF check live. Mechanics in
`structure.android.md`.

## Decisions

1. **Shaped, host-safe interaction is an `expo-view`-only capability** — structurally
   impossible in the Host world (coarse `pointerEvents` only).
2. **`hitTest` does composition pass-through *and* shaped (SDF) hit-testing** — the
   touchable region equals the visible region, derived from the shader's own shape
   description, so draw and hit-test never drift.
3. **Decorative effects use the Host's coarse passthrough**; only shaped interactive
   surfaces need this runtime — keeping V1 (decorative) free of it.

## Open questions

- **SDF source** — derive the hit shape from a uniform the shader already exposes
  (radius/corner/blob field), or a separate declared hit-shape? Lean: reuse the
  shader's shape so they can't desync.
- **Feather/threshold** — how much slop around the SDF edge feels right for touch
  (fat-finger tolerance) without claiming clearly-outside touches.
- **Per-frame cost** — evaluating the SDF on `hitTest` is cheap (one point), but
  confirm no measurable cost under rapid touch; needs-device.
- **Coordinate units** — normalize touch to the shader's space consistently across
  `hitTest`, events, and `setHighlight` (ties to `30`).

## Sources

- `01-substrates-and-hosting.md` — the G-vs-Host exclusivity and the auto-Host
  `pointerEvents` limit (#46549).
- `30-interaction-and-gestures.md` — the recognizer this hit-test gates.
- `structure.{ios,android}.md` — `hitTest` / `onTouchEvent` mechanics.
