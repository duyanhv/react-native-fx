# U3-008 device ratification — 2026-06-11

Reviewer-driven device verification of U3-008 (persistent hosting controller +
decorative-hosted a11y default). Drives the symbol + shader scenarios and the
Android a11y default. The screen recordings stay out of the repo (local-only —
the stills + gesture-telemetry JSON carry the proof); ask the maintainer if a
re-run is needed.

## iOS — physical iPhone (booted device)

- `01/02-baseline-*.png` — symbol screen, `variableColor` + `repeat`: heart renders,
  color cycles between frames → animation is live.
- `03-before-flip` → `04/05-after-star` → `06/07-after-bell` —
  flipping the **Replace with** target mid-animation is a live prop change; symbol stays
  rendered, `variableColor` keeps cycling, label tracks the change, no blank in any still.
- `10-slider-80` → `11-slider-low` (0.16) → `12-slider-high` (0.89) —
  intensity slider drag streams uniform changes; fractal-clouds shader renders continuously
  (0.16 is a real low-intensity render, not a blank); no teardown / clock reset.
- Verdict: **PASS** — persistent hosting controller absorbs prop changes in place.

## Android — POCO F1, Android 15 / API 35

- `and-21-shaders-80` → `and-22-low` (0.18) → `and-23-high` (0.82) —
  shader (plain View + RuntimeShader/AGSL) renders continuously through the seekbar drag;
  intensity uniform tracks live; perf overlay holds ~60fps; no blank / restart. The
  "Android sibling already updates in place" claim holds on real hardware. **PASS.**
- Symbol scenario: N/A — SF Symbols are iOS-only.

## Android decorative-hosted a11y default

- Mechanism grounded at `FxHostedView.kt:105`:
  `view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO` on the decorative
  effect output (fill / material / all shaders), unconditional.
- `and-a11y-tree-shaders.json` (raw accessibility tree, the tree TalkBack consumes):
  the 10 shader chips, the intensity label, and the SeekBar are all exposed as accessible
  nodes; the preview box (y=728, 992x550) contains only empty unlabeled containers — no
  accessible node for the rendered shader. TalkBack focus lands only on
  importantForAccessibility nodes, so it provably cannot reach the decorative output.
- CAVEAT: this is the deterministic upstream proof (a11y node tree), NOT the literal
  TalkBack screen-reader demo — Google TalkBack is not installed on this Xiaomi/MIUI device
  (only the system AccessibilityMenu service is present, and `agent-device settings` has no
  Android a11y-service toggle). A literal "enable TalkBack and swipe through focus" demo
  needs a device/emulator with Google TalkBack.
