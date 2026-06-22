# U14-001 device verification — 2026-06-22

Both platforms verified. All cases pass. (Screenshot `.png` are gitignored; this file is the
tracked record.)

## iOS 26 — the spike question (PASS)

- Two glass items with the default close (4 px) gap **morph/merge** into one continuous Liquid
  Glass surface along the shared edge.
- Tapping "apart (80px)" **separates** them back into two distinct surfaces.
- This resolves the load-bearing unknown: `UIGlassContainerEffect` merges the glass even though
  it is a grandchild of `contentView` (nested under `FxHostedView`), not a direct child. So
  `FxItem` stays JS-only — no native `FxItemView`, no composition rework.

### iOS 26 — secondary checks (PASS)

- Labels "A" / "B" visible through the glass; content rides the glass surface.
- Tapping the glass area triggers "Touch reached item A/B" — touch-through confirmed, not severed.
- No crash on open / navigate away / navigate back.

## iOS <26 (PASS)

- Both items render as individual glass (no morph); no crash. The ratified fallback.

## Android (PASS — after a gate-found fix)

- Both items render as individual material glass side by side; no morph, no crash — the ratified
  shape-native divergence (DOC-006, rule #2).
- Touch-through confirmed (taps reach items A/B).

### Defect found and fixed at this gate

On first mount the items collapsed onto the origin; a gap toggle "fixed" them (Fabric re-applying
layout). Root cause: `ExpoView` is a `LinearLayout`, which re-arranges absolutely-positioned RN
children by flow rules. The first fix attempt — routing children into an intermediate `FrameLayout`
(the existing `FxStateView`/`FxPressableView` pattern) — did **not** work, because `FrameLayout`
also re-stacks children by gravity (default top-left). The FrameLayout pattern was only ever
exercised against a single full-bleed child, where top-left gravity is harmless.

Fix: route children into a `com.facebook.react.views.view.ReactViewGroup` (commit `fa95df1`),
whose `onLayout` is a no-op and `onMeasure` is size-only, so it preserves the frames the Fabric
mounting layer assigns — the class RN itself uses for absolutely-positioned children. Re-verified
on device: no first-mount collapse.
