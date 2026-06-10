# U3-002 — hosting parity / glass styles / uniforms

Unit 3 · type: `device-verify` (hybrid — includes a library prep step) · state: `headless-done` · device: `yes`
Consumes: — · Closes: SPINE-012, FX-002, FX-005 · Blocked by: U3-001 (merged)

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: glass styles + hosting parity device verify (blueprint Unit 3)
- Contract anchors:  21 (material semantics — §The typed inputs defines variant: 'regular'|'clear'
                     and interactive: boolean as the glass config; the vocabulary is variant,
                     never the public effect id), 02 (material manifest node), structure.ios.md
                     §material (the SwiftUI .glassEffect rung — the sole mechanic home),
                     device-sweep-v1.md §A2/§A3/§A4/§B2 (the device scenarios).
- Decision:          mimic the U3-007 SymbolConfig pattern exactly — a structured Record config
                     channel on FxHostedView, not a new top-level prop. Flip-trigger: only if
                     material config outgrows the hosted substrate (V2 interactive surface).
- Reference (HOW):   references/expo/packages/expo-glass-effect/ios/GlassView.swift +
                     GlassStyle.swift — the shipped iOS-26 rung: a hit-testable UIVisualEffectView
                     + UIGlassEffect (Style.regular/.clear, isInteractive, cornerConfiguration),
                     with the lifecycle quirks (effect created in layoutSubviews, stale-effect
                     clear on isInteractive toggles, setNeedsLayout on window re-entry). ADOPT
                     those; REJECT tintColor/colorScheme/per-corner radii/RTL, the
                     NSClassFromString availability probe, and mountChildComponentView (rule #4).
                     The rework follows the ratified spike
                     (research/wip/interactive-glass-touch-delivery.md): the SwiftUI .glassEffect
                     modifier cannot present a clear backdrop and the system interaction view at
                     once, so the SwiftUI rung was replaced. Historical context for the variant
                     vocabulary: references/expo/packages/expo-ui/ios/Modifiers/
                     GlassEffectModifier.swift — the SwiftUI Glass API
                     (.glassEffect(glass.interactive(bool), in: shape) with
                     Glass.regular/.clear/.identity); .identity stays rejected (21 ships
                     regular/clear only).
- Guides:            Code Style + Code Comments (the code); Testing (headless); Device
                     Verification (the sweep scenarios); Contributing (merge bar).
- Rules gate:        #2 (agnostic surface — public TS speaks 21's variant vocabulary; never
                     UIGlassEffect/Glass/.glassEffect names above the manifest), #5 (glass is an
                     effect fx draws — config rides the effect channel, not a top-level prop),
                     #1 (the system glass animates natively — no per-frame JS), #7 (Expo Modules
                     Record with @Field on every property — no JSI).
- Device-verify:     A2 glass styles (regular/clear render over content), A3 uniform alignment
                     (FX-005), A4 hosting parity / interactive glass in a scroller / GPU resume
                     (SPINE-012), B2 Android hosting parity. All human gates.
- Done when:         materialConfig crosses the bridge and FxMaterialView applies the variant +
                     .interactive() on iOS 26 (material fallback below 26 unchanged); the example
                     glass picker drives regular/clear/interactive; headless gates + a local
                     xcodebuild pass; the sweep scenarios are then verified on device and
                     SPINE-012/FX-002/FX-005 close in their owning docs (human gate).
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified (human gate — agent-device evidence run + maintainer live-tap confirmation, 2026-06-10)
- [x] reviewed ([review](../../reviews/U3-002.md))
- [x] docs-closed (FX-002 in `21`, FX-005 in `22`, SPINE-012 in `01` + ledger, 2026-06-10)
- [ ] merged

## Proof

- **headless:** `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
  `bun run test` from `packages/`; `bunx tsc --noEmit` from `example/`; a local `xcodebuild`
  (Debug, iphonesimulator) recording BUILD SUCCEEDED in `evidence/` — the TS/format gates do
  not compile Swift.
- **device:** `device-sweep-v1.md` §A2 (glass styles), §A3 (uniform alignment), §A4 (hosting
  parity / interactive glass / GPU resume), §B2 (Android hosting parity). Human gate.
- **docs:** on device pass — FX-002 closes in `21` (Open questions), FX-005 in `22`, SPINE-012
  in `01`, all in the decision ledger. Not closed by this session.

## Scope

### iOS native

- **FxGlassSurfaceView.swift** (new, the UIKit rework) — the iOS-26 glass surface: a `UIView`
  owning a `UIVisualEffectView` + `UIGlassEffect` (`Style` mapped from `MaterialConfig.variant`,
  `isInteractive` from `interactive`, `cornerConfiguration` from the host's corner radius), with
  the precedent's lifecycle quirks (effect created in `layoutSubviews()`, stale-effect clear on
  `isInteractive` toggles, `setNeedsLayout()` on window re-entry). The `MaterialConfig` Record
  (`variant`, `interactive` — `@Field` on every property) lives here with its consumer.
- **FxHostedView.swift** — `pendingMaterialConfig` + `setMaterialConfig`; on iOS 26 the
  `material` effect mounts `FxGlassSurfaceView` directly as a UIKit subview (no
  `UIHostingController`), and `layoutSubviews()` pushes the layer's `cornerRadius` into it
  without remounting. Below 26 the `material` case still hosts the SwiftUI fallback.
- **FxMaterialView.swift** — shrunk to the below-26 intensity-keyed material fallback; the
  SwiftUI `.glassEffect` body was removed by the UIKit rework.
- **FxModule.swift** — `Prop("materialConfig")` on the `FxHostedView` view definition
  (unchanged by the rework).

### TypeScript

- **src/effects/catalog.ts** — add `MaterialVariant` and `MaterialConfig` types (the `21`
  vocabulary subset this slice ships: `variant`, `interactive`).
- **src/runtime/FxHostedView.tsx** — add `materialConfig?: MaterialConfig` to
  `NativeFxHostedProps`.
- **src/index.ts** — export the new material types.

### Example

- **example/screens/hosting-parity.tsx** — add a glass section: variant segmented control +
  interactive toggle driving `<FxHostedView effect="material" materialConfig={…}>` inside the
  existing ScrollView (the A4 interactive-glass-in-a-scroller case rides the same screen).

### Docs

- **structure.ios.md §material** — pin the variant/interactive mechanic (the single home).
- **device-sweep-v1.md** — flip the glass-styles + interactive-glass readiness rows to ✅;
  reconcile §A2 to the ratified `regular`/`clear` (+ `interactive`) vocabulary.

### Tests

- None added: the slice is bridge passthrough plus native rendering — there is no JS resolution
  logic, and glass does not render headless. The proof is the headless gates + xcodebuild +
  the device sweep.

## Scope guard

- Does NOT add `.identity` — SwiftUI's `Glass` exposes it (see the expo-ui reference), but `21`
  deliberately ships `regular`/`clear`; adding it would be speculative surface.
- Does NOT add a top-level `glassStyle` prop — the config channel mirrors `symbolConfig`.
- Does NOT ship `tintColor`/`colorScheme`/`weight`/intensity-as-uniform — the rest of `21`'s
  `MaterialUniforms` lands with the public surface layer, not this binding slice.
- Does NOT touch Android material (FX-003 / U3-003) or the manifest select path.
- Does NOT tick `device-verified` or close FX-002/FX-005/SPINE-012 — those close on device.

## Done when

- `MaterialConfig` crosses the bridge with `@Field` on every property.
- `FxMaterialView` applies `regular`/`clear` + `.interactive()` on iOS 26; the below-26 material
  fallback is untouched.
- The example glass picker drives regular/clear/interactive on the hosting-parity screen.
- structure.ios.md pins the mechanic; device-sweep-v1.md readiness rows flip.
- Headless gates green; xcodebuild BUILD SUCCEEDED recorded in `evidence/`.
- The device scenario is written; notes and progress are updated.
