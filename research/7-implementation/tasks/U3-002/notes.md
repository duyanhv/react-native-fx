# U3-002 — notes

## Unverified claims

- `regular`/`clear` glass renders distinctly on an iOS 26 device (the variant reaches
  `.glassEffect` through `materialConfig`).
- `.interactive()` plays the system press response, and it coexists with the RN scroller
  on the `hosting-parity` screen.
- The below-26 material fallback is unchanged by the refactor (intensity-keyed materials).
- Uniform alignment (FX-005) and hosting parity / GPU resume (SPINE-012) — pure device
  checks against the existing harness; no code claim, but unverified until the sweep runs.

## What changed

- `research/7-implementation/tasks/U3-002/README.md` — new spec (subtask template; the
  folded FX-002 prep scope from the progress.md scope note).
- `packages/ios/FxMaterialView.swift` — added the `MaterialConfig` Record (`variant`,
  `interactive`, `@Field` on every property) and `resolvedGlass`: iOS 26 now applies
  `.glassEffect(glass.interactive(bool))` with `Glass.regular`/`Glass.clear` mapped from
  `variant` (unknown → regular). The below-26 intensity-keyed material fallback is untouched.
- `packages/ios/FxHostedView.swift` — `pendingMaterialConfig` + `setMaterialConfig`; the
  `material` case passes the config through `makeSwiftUIView`.
- `packages/ios/FxModule.swift` — `Prop("materialConfig")` on the `FxHostedView` definition.
- `packages/src/effects/catalog.ts` — `MaterialVariant` + `MaterialConfig` types (the `21`
  subset this slice ships; a `TODO` slot marks tint/color-scheme/weight for the full surface).
- `packages/src/runtime/FxHostedView.tsx` — `materialConfig?: MaterialConfig` on
  `NativeFxHostedProps`.
- `packages/src/index.ts` — exports `MaterialConfig`, `MaterialVariant`.
- `example/screens/hosting-parity.tsx` — glass section: variant segmented control +
  press-response toggle driving `<FxHostedView effect="material" materialConfig={…}>` over
  an aurora backdrop, inside the existing ScrollView (covers A2 and the A4 interactive case).
  No routing changes — the screen was already routed in both routers and `data/tasks.ts`.
- `research/5-realization/structure.ios.md` §material — pinned the variant/interactive
  lowering (`Glass.regular`/`.clear` ↔ `UIGlassEffect.Style`, the `Glass.interactive(_:)`
  combinator, `.identity` not adopted, unknown-variant fallback).
- `research/7-implementation/device-sweep-v1.md` — glass-styles + interactive-glass
  readiness rows ❌ → ✅; §A2 reconciled to the ratified `regular`/`clear` (+ `interactive`)
  vocabulary with `identity` marked explicitly not-adopted; the stale blocked notes and the
  stale "routes to blank placeholder" intro line removed; bottom line updated.
- `tasks/U3-002/evidence/headless.md` — the device scenario (sweep §A2/§A3/§A4/§B2).
- `tasks/U3-002/evidence/xcodebuild.md` — BUILD SUCCEEDED record (Xcode 26.5, Debug,
  iphonesimulator, full example workspace).

## Why

- `21` §The typed inputs ratifies the surface: `variant?: 'regular' | 'clear'` (the
  `UIGlassEffect.Style` vocabulary, never the public `effect` id) + `interactive?: boolean`.
  The config rides the effect channel mirroring `symbolConfig` (rule #5 — no top-level prop;
  rule #2 — no `Glass`/`UIGlassEffect`/`.glassEffect` names above the manifest).
- **`.identity` reconciliation (the ledger FX-002 note):** SwiftUI's `Glass` does expose
  `.identity` (grounded in `references/expo/packages/expo-ui/ios/Modifiers/GlassEffectModifier.swift`,
  which maps regular/clear/identity), so it exists in the API — but `21` deliberately ships
  `regular`/`clear` only, and `.identity` stays out of the fx surface. Confirmed: do not
  adopt. Recorded in `structure.ios` §material and sweep §A2; the FX-002 ledger row itself
  closes on device.
- The grounded iOS 26 API shape is `.glassEffect(glass.interactive(bool), in: shape)`;
  fx passes only the `Glass` value and keeps the modifier's default shape, preserving the
  pre-existing visual behavior of the bare `.glassEffect()` call.
- No new tests: the slice is bridge passthrough + native rendering — no JS resolution logic,
  and glass does not render headless. The proof is the gates + xcodebuild + the device sweep.

## Next:

Run the device sweep (`device-sweep-v1.md` §A2/§A3/§A4/§B2) on an iOS 26 device (+ Android
for B2), fill the sign-off block, then close FX-002 in `21`, FX-005 in `22`, SPINE-012 in
`01` and the ledger — the human gate.
