# U14-001 notes

## THE spike risk — morph-through-wrapper question (UNVERIFIED)

**Claim:** `UIGlassContainerEffect` can merge two `FxGlassSurfaceView` instances that are
not direct children of `containerEffectView.contentView` but are grandchildren (each
wrapped inside a `FxHostedView`).

**Why unverified:** The UIKit documentation does not specify the depth to which
`UIGlassContainerEffect` traverses the view hierarchy when looking for glass surfaces to
merge. The reference pattern (`GlassContainer.swift`) mounts direct subviews into
`contentView`, so glass-as-direct-child is the known-working shape. In our case each
glass surface (`FxGlassSurfaceView`, owned by `FxHostedView`) is one level deeper:

```
containerEffectView.contentView
  └─ FxHostedView (native ExpoView — FxItem is a Fragment, no extra native layer here)
      └─ FxGlassSurfaceView (UIView + UIVisualEffectView + UIGlassEffect)
```

Note: `FxItem` being a JS Fragment does NOT add a native layer. The `FxHostedView` is
the only thing between `contentView` and the glass surface.

**Spike outcome shapes future work:**

- **Merges:** architecture is correct. Ship as-is. No native FxItemView needed.
- **Does not merge:** the one extra level breaks directness. Options (evaluate in order):
  1. Make `<Fx effect="glass">` mount `FxGlassSurfaceView` as the `FxHostedView`'s root
     view (already the case on iOS 26 — check that the `UIView` returned IS the glass surface).
  2. If the ExpoView wrapper is the issue, explore making `FxHostedView` on the glass path
     return a bare `FxGlassSurfaceView` as its root UIView (requires checking ExpoView
     initialization constraints).
  3. As a last resort, introduce a native `FxItemView` that wraps and exposes the glass
     surface more directly — but only after the spike proves it helps.

## Architecture decision rationale

`FxItem` is a JS Fragment (not a native view) because:
- A native `FxItemView` would add one more native layer between `contentView` and the
  glass surface, making directness worse, not better.
- The Fragment already achieves zero extra native layers; the only native wrapper is the
  `FxHostedView` that `<Fx effect="glass">` always renders.

This is the minimum-indirection shape for V1. The spike validates whether it is sufficient.

## Android divergence confirmation

Android `FxGroupView` is a plain passthrough. No Liquid Glass, no cross-item glass union.
Individual glass items render their own material. This is the ratified shape-native
divergence per DOC-006 — not a gap.
