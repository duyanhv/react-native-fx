# U3-002 — notes

## Unverified claims

- `regular`/`clear` glass renders distinctly on an iOS 26 device (the variant reaches
  `.glassEffect` through `materialConfig`).
- `.interactive()` plays the system press response, and it coexists with the RN scroller
  on the `hosting-parity` screen.
- The below-26 material fallback is unchanged by the refactor (intensity-keyed materials).
- Uniform alignment (FX-005) and hosting parity / GPU resume (SPINE-012) — pure device
  checks against the existing harness; no code claim, but unverified until the sweep runs.
- **NEW (rework round 1):** `self.layer.cornerRadius` is populated by Fabric when `borderRadius` is
  set on the RN style. If it reads `0`, the glass shape falls back to a sharp rectangle.
  The `layoutSubviews` override rebuilds the host when the radius changes, so a late
  Fabric layout pass should correct the shape. Unverified until device logs are checked.
- **NEW (rework round 1):** With the opaque base gone, the glass may or may not refract the
  aurora backdrop. The example composes the aurora as an independent `FxHostedView`; if
  `.glassEffect` samples only its own host, the glass will not refract the aurora. This
  is a hypothesis, not a claim — the device test determines the real behavior.
- **NEW (rework round 2):** `.contentShape(RoundedRectangle(cornerRadius: cornerRadius))` restores
  the hit region for the `interactive` glass press response. The press response is the
  system's own; fx surfaces no press events. Unverified until device confirmation — the
  human/reviewer verifies the press fires while the dark box does not come back.

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

### Rework round 1 additions (2026-06-10)

- `packages/ios/FxMaterialView.swift` — **A2-1 fix**: `Rectangle().fill(.clear)` on the iOS 26
  path so the glass lets the backdrop show through (no opaque dark fill). **A2-2 fix**: added
  `cornerRadius: CGFloat` parameter and `.glassEffect(resolvedGlass, in: RoundedRectangle(...))`
  so the glass shape follows the host bounds, not the default `Capsule()`.
- `packages/ios/FxHostedView.swift` — passes `self.layer.cornerRadius` to `FxMaterialView`.
  Added `layoutSubviews()` override that reads the layer radius, logs it with `NSLog`, and
  rebuilds the SwiftUI host if the radius changed while the effect is `material`. This
  addresses the mount-time-stale-corner-radius problem (R2).
- `research/5-realization/structure.ios.md` §material — added the glass shape mechanic
  (host-layer corner-radius read) and the **glass compositing limit** note (`.glassEffect`
  samples only its own host; in-host composition is needed for glass-over-fx-drawn-content).
- `research/2-effects/21-materials-and-glass.md` — added a citation-only note pointing to
  `structure.ios.md` §material for the shape mechanic and compositing limit.
- `tasks/U3-002/evidence/headless.md` — expanded A2 steps with corner-radius logging,
  shape-matching check, and A2-3 re-verification as a hypothesis test.

### Rework round 2 additions (2026-06-10)

- `packages/ios/FxMaterialView.swift` — **A2-4 fix**: `.contentShape(RoundedRectangle(cornerRadius:))`
  added to the iOS 26 path to restore the hit region for the `interactive` glass press response
  after `.fill(.clear)` removed the opaque hit surface. The visual stays clear (no dark box);
  the hit-test region is the same shape as the glass.
- `tasks/U3-002/evidence/headless.md` — added the A2-4 interactive press-response check to
  the A2 steps (press the glass tile, confirm the system liquid response fires).

### Rework round 2 removals (2026-06-10)

- `research/wip/critique-2026-06-10.md` — deleted (out of scope for U3-002; 414-line
  architectural critique is not a glass-fix changeset). The critique may have value for a
  planner triage separately.
- `research/wip/README.md` — reverted to original state ("Nothing in flight.") to remove the
  critique reference.
- `research/7-implementation/progress.md` — reverted the leading-space churn introduced in
  round 1; the U3-002 detail block now has no leading spaces on the list/checklist/proof lines.
  The only added content is the genuine "Rework (2026-06-10):" paragraph.

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
  fx passes the `Glass` value and a `RoundedRectangle` matching the host, replacing the
  default `Capsule()` that produced the dark-corner artifact.
- **A2-4 rationale:** `.fill(.clear)` removes the opaque hit surface, so the `interactive`
  glass modifier (`.glassEffect`) cannot receive touches. `.contentShape` restores the hit-test
  region to the same `RoundedRectangle` used by the glass, without reintroducing the dark fill.
  The visual remains clear; the touch region is the correct shape.
- No new tests: the slice is bridge passthrough + native rendering — no JS resolution logic,
  and glass does not render headless. The proof is the gates + xcodebuild + the device sweep.

## Next:

Run the device sweep (reworked `evidence/headless.md` §A2) on an iOS 26 device, verify: (1) the
press response fires on `interactive` glass (A2-4), (2) the dark box does NOT come back, (3) the
glass shape matches the tile bounds (A2-2), (4) the layer `cornerRadius` log reads the expected
value (16), (5) the A2-3 refraction hypothesis. Record results in `notes.md` under a device-run
section. Then close FX-002 in `21`, FX-005 in `22`, SPINE-012 in `01` and the ledger — the human gate.
