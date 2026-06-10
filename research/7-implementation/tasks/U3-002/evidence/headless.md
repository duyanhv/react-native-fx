# U3-002 — Device Scenario

## Goal

Verify the iOS glass styles (FX-002), uniform alignment (FX-005), and hosting parity /
GPU resume (SPINE-012) on device. The single-pass checklist is
`research/7-implementation/device-sweep-v1.md` — this scenario runs its Sections
A2, A3, A4, and B2. All four are human gates.

## Steps

### A2 · iOS glass styles (FX-002) — iOS 26 device
1. Launch the example app on an iOS 26 device (Xcode 26 runtime).
2. Open the U3-002 task → the `hosting-parity` screen → the "Glass styles" section.
3. With variant `regular`: the glass tile renders system glass over the moving shader
   backdrop — never a flat box and never a dark box. The iOS-26 rung is now a UIKit
   `UIVisualEffectView` + `UIGlassEffect` mounted by `FxHostedView`; the host layer's
   `cornerRadius` flows into `cornerConfiguration` at `layoutSubviews` time. If the layer
   reports `0`, the glass renders as a sharp rectangle — the explicit fallback.
4. Check the visual edge: the glass should match the tile bounds with a `borderRadius: 16`
   edge — not a pill and not a sharp rectangle. If the edge is sharp, the layer radius is
   not reaching `cornerConfiguration` (or Fabric did not set it).
5. Switch the variant to `clear`: the tile visibly changes to the more transparent glass,
   with no dark box behind it.
6. Set press response to `interactive` and press the tile: the system press response plays
   (fx surfaces no press events — the response is the system's own, via
   `UIGlassEffect.isInteractive`). **Verify the press with a backdrop-independent signal,
   never by frame-diffing over the animated shader backdrop** (that method produced a prior
   false conclusion). Acceptable signals, any one of:
   - a temporary `hitTest(_:with:)` override on `FxHostedView` logging the winning view
     class — the system glass interaction view must appear in the chain when pressing the
     interactive glass (apply the instrumentation locally for the run, then revert it;
     it is not shipped code);
   - a static backdrop (temporarily swap the aurora for a solid color) so the press state
     is visible by eye or by frame comparison;
   - a live human tap judging the system press response directly on device.
7. `identity` is deliberately absent from the picker: SwiftUI exposes `Glass.identity`,
   but the ratified `21` surface ships `regular`/`clear` only.
8. Below iOS 26 (if a device is available): the same screen renders the material
   fallback (`.ultraThinMaterial` family), not glass and not a flat box.

### A2-3 · Glass compositing re-verify (architectural)
9. After the opaque base is removed (A2-1 fix), check whether the glass tile refracts
   the aurora backdrop behind it. The current example composes the aurora as an
   independent `FxHostedView` behind the glass tile; `.glassEffect` samples only its own
   host, so the glass may not refract the aurora. If the glass does not refract, this
   confirms the compositing limit.
10. Hypothesis to test: composing both the glass and the aurora as siblings inside the
    same `UIHostingController` (e.g., via `FxGroup`/`FxItem` or a single-host compound)
    would allow the glass to refract the aurora because the aurora is fx-drawn, not RN
    content (rule #4 does not apply). Do not change the example unless device results
    confirm the limit.

### A3 · uniform alignment (FX-005) — no new screen
8. On the same screen, drag the intensity slider against the `loop` multi-uniform
   shader: colors and positions track the slider without garbling, shifting, or
   flicker — Swift↔MSL field order/stride is aligned.

### A4 · hosting parity / many boundaries / GPU resume (SPINE-012)
9. Scroll the boundary grid (12 mixed fill/shader hosts): every host renders, scroll
   stays smooth.
10. With press response `interactive`, press the glass tile, then scroll the screen by
    dragging from outside the tile: the press response and the scroller coexist. **On the
    shipped UIKit rung a drag that begins on the glass passes through and pans the list
    (scroll-through: tap → press, drag → scroll) — device-confirmed 2026-06-10. Capture
    of such drags was SwiftUI-rung behavior only; either way the arbitration is the
    system's, not a scroll bug.** Confirm a drag starting off the glass at the same
    height also pans.
11. On `shader-catalog` with a running shader visible, background then foreground the
    app: the clock resumes, no black frame.

### B2 · Android hosting parity
12. On Android, open the same `hosting-parity` screen: hosts size correctly (no 0×0),
    taps land, the grid scrolls smoothly. (`effect="material"` on Android is U3-003 —
    out of this scenario.)

## Expected result

- iOS 26: `regular` and `clear` render distinct system glass; `interactive` plays the
  system press response inside the scroller.
- Glass shape matches the tile bounds (no pill-shaped glass on a rectangle).
- Backdrop shows through the glass (no opaque dark fill behind it).
- Below 26: material fallback, never a flat box.
- Multi-uniform shader output stays correct across the intensity range.
- Many boundaries render and scroll smoothly on both platforms; GPU clock resumes after
  backgrounding.

## Failure signs

- Flat box instead of glass; variant switch has no visible effect (`materialConfig` not
  reaching native — prop typing / `@Field` mismatch).
- Dark rectangle behind the glass (the effect view rendering opaque — A2-1 regressed).
- No press response on `interactive` glass, proven by the backdrop-independent signal
  (the system interaction view not installed — A2-4 regressed; check the lifecycle: the
  effect must be created during `layoutSubviews`, and toggling `isInteractive` must clear
  the prior effect first).
- Glass edge is sharp when `borderRadius` is non-zero (layer `cornerRadius` not reaching
  `cornerConfiguration`, or Fabric did not set it).
- Glass does not reappear after navigating away and back (window re-entry must call
  `setNeedsLayout` because `layoutSubviews` may not fire when geometry is unchanged).
- Crash on the Xcode 26 runtime when the glass mounts.
- Garbled/shifted shader output (uniform stride mismatch).
- Blank hosts at scale; dropped touches; frozen or black surface after resume.

## Platform

- iOS: yes — iOS 26 for A2; any iOS 17+ for A3/A4.
- Android: yes — B2 only.

## On pass

Tick `device-verified` in `progress.md`, fill the sweep sign-off block, and close the
ledger rows in their owning source docs: FX-002 → `21` Open questions, FX-005 → `22`,
SPINE-012 → `01`. Source-doc closure is the cardinal rule.
