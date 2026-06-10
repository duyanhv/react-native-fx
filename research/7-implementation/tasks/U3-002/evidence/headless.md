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
   backdrop — never a flat box.
4. Switch the variant to `clear`: the tile visibly changes to the more transparent glass.
5. Set press response to `interactive` and press the tile: the system liquid press
   response plays (fx surfaces no press events — the response is the system's own).
6. `identity` is deliberately absent from the picker: SwiftUI exposes `Glass.identity`,
   but the ratified `21` surface ships `regular`/`clear` only.
7. Below iOS 26 (if a device is available): the same screen renders the material
   fallback (`.ultraThinMaterial` family), not glass and not a flat box.

### A3 · uniform alignment (FX-005) — no new screen
8. On the same screen, drag the intensity slider against the `loop` multi-uniform
   shader: colors and positions track the slider without garbling, shifting, or
   flicker — Swift↔MSL field order/stride is aligned.

### A4 · hosting parity / many boundaries / GPU resume (SPINE-012)
9. Scroll the boundary grid (12 mixed fill/shader hosts): every host renders, scroll
   stays smooth.
10. With press response `interactive`, scroll the screen by dragging across the glass
    tile, then press it: the glass press response and the scroller coexist.
11. On `shader-catalog` with a running shader visible, background then foreground the
    app: the clock resumes, no black frame.

### B2 · Android hosting parity
12. On Android, open the same `hosting-parity` screen: hosts size correctly (no 0×0),
    taps land, the grid scrolls smoothly. (`effect="material"` on Android is U3-003 —
    out of this scenario.)

## Expected result

- iOS 26: `regular` and `clear` render distinct system glass; `interactive` plays the
  system press response inside the scroller.
- Below 26: material fallback, never a flat box.
- Multi-uniform shader output stays correct across the intensity range.
- Many boundaries render and scroll smoothly on both platforms; GPU clock resumes after
  backgrounding.

## Failure signs

- Flat box instead of glass; variant switch has no visible effect (`materialConfig` not
  reaching native — prop typing / `@Field` mismatch).
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
