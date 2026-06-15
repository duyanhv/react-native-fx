# EX-001 — device harness enablement (V1 sweep)

Type: `implement` (example code) · Device: no (harness-only; human verifies on device)
Consumes: — · Closes: — (no ledger row; this task does not close a decision)

## Goal

Build the missing example screens so the V1 device sweep (U3-007 / U3-003 / U3-002) is
runnable, and wire them into the example app. The device gates themselves stay human-owned.

## Screens built

1. **symbol (U3-007)** — `example/screens/symbol.tsx`
   - `FxHostedView` with `symbolConfig` (name, animation, trigger, replaceWith)
   - Native segmented controls for symbol name, animation, trigger mode, and replaceWith
   - Exercises `SymbolConfig` / `SymbolAnimation` types from `react-native-fx`

2. **android-material (U3-003)** — `example/screens/android-material.tsx`
   - `FxHostedView effect="material"` with intensity slider over animating content
   - Animated block behind the blur moves and changes color to exercise RenderEffect staleness
   - Intensity slider 0–1 drives blur radius

3. **hosting-parity (U3-002)** — `example/screens/hosting-parity.tsx`
   - Grid of many `FxHostedView` boundaries (mixed fill/shader) to test scroll smoothness
   - One multi-uniform shader (`loop`) with intensity slider to make uniform alignment observable
   - GPU-resume is referenced in the doc (already exercisable on `shader-catalog`)

## Out of scope

- Glass styles selector (`.regular`/`.clear`/`.identity`) — blocked on library `glassStyle` prop
  (FX-002). Noted in `device-sweep-v1.md`.
- Interactive glass (`.interactive()` in a scroller) — blocked on the same library prop. Noted
  in `device-sweep-v1.md`.

## Lifecycle

- [x] spec'd
- [x] implemented (screens + wiring)
- [x] commented
- [x] headless-done (tsc/lint/bundle green)
- [ ] device-verified (human gate — not this task)
- [ ] reviewed
- [ ] merged

## Proof

- **headless:** `bunx tsc --noEmit` from `example/`; `bun run lint` from repo root; app bundles
  without runtime errors.
- **device:** N/A — the harness screens are the scenario; the human runs them on device.
- **docs:** `research/7-implementation/device-sweep-v1.md` readiness table updated.

## Authority

- Contract: `research/7-implementation/device-sweep-v1.md` (the spec)
- Style: `guides/Code Style Guide.md` (Biome, example idiom)
- Comments: `guides/Code Comments Guide.md` (iceberg, no internal-artifact refs)
