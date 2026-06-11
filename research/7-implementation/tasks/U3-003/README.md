# U3-003 — Android `material` (own-content composition + RenderEffect blur)

Unit 3 · type: `implement` · state: `headless-done` · device: `yes`
Consumes: — · Closes: FX-003 (pending the human gate) · Blocked by: U3-001 (merged)

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
Subtask: Android material — own-content composition + RenderEffect blur (blueprint Unit 3)
- Contract anchors:  21 (material semantics — §The typed inputs defines variant: 'regular'|'clear'
                     and interactive: boolean; §Degradation pins the fallback-ladder law "never a
                     flat box"), 02 (material manifest node), structure.android.md §material (the
                     sole mechanic home — this task reconciles it to the decided shape),
                     sweep finding B1 (the finding this task closes: effect="material"
                     had no Android branch — the glass stage rendered only the backdrop;
                     the sweep docs were retired 2026-06-10, history in git — the device
                     scenario lives in evidence/headless.md).
- Decision:          maintainer-ratified 2026-06-10; do not re-litigate.
                     (1) Default = own-content composition: an fx-drawn translucent stack
                     (gradient/scrim) blurred by RenderEffect.createBlurEffect applied to fx's
                     OWN view (API 31+). No backdrop capture — costly/stale-prone on Android,
                     would touch RN content (rule #4), and iOS does not refract sibling fx hosts
                     either (sweep A2-3), so own-content is cross-platform-consistent in practice.
                     (2) Haze rung → planned, non-selectable in V1 (same treatment as the Android
                     symbol rung): documented, deferred; no Compose dependency and no
                     optional-peer machinery now.
                     (3) Below API 31: the translucent composition WITHOUT blur — degraded but
                     never a flat box.
                     (4) Intensity normalization: intensity 0–1 maps to blur radius against a
                     pinned max of 24dp (converted to px) plus the overlay alpha curve. JS speaks
                     0–1 only; the constants live in structure.android.md.
                     (5) materialConfig on Android: variant maps to two overlay weights
                     (regular = heavier frost, clear = lighter/more transparent); interactive is
                     INERT on Android (no system glass press exists; platform-native defaults,
                     never simulated iOS behavior) — accepted silently, no crash, documented.
- Reference (HOW):   packages/android FxShaderView.kt + FxFillView — the plain-View hosted idiom
                     (the library deliberately avoids a Compose compiler dependency in V1); the
                     blur applies via View.setRenderEffect, mirroring the expo-view shader rung's
                     mechanism. packages/ios/FxGlassSurfaceView.swift — the iOS peer
                     (MaterialConfig Record shape: variant: String = "regular",
                     interactive: Bool = false; the Kotlin Record mirrors it field-for-field).
                     REJECT Compose/Haze for V1 (planned rung); REJECT backdrop capture; REJECT
                     simulating a press on interactive.
- Guides:            Code Style + Code Comments (the code); Testing (headless); Device
                     Verification (the device scenario); Contributing (merge bar).
- Rules gate:        #2 (agnostic vocabulary — public TS speaks variant, never
                     RenderEffect/Haze names above the manifest), #5 (glass is an effect fx
                     draws — config rides the effect channel, not a top-level prop), #6 (Android
                     is a peer — divergence lives in structure.android.md only), #9 (fx reads
                     layout, never writes it — the stack draws to the host bounds).
- Device-verify:     B1 on the hosting-parity glass stage — material tile renders (translucent
                     frosted panel, not absent, not a flat/dark box); intensity low vs high
                     visibly differ; regular vs clear visibly differ; interactive toggles with
                     no crash and no behavior change; no scroll-jank regression vs the B2
                     ~60 fps baseline. Below-31 degradation is not exercisable on an API 35
                     device — covered by the code path + the manifest gate. Human gate.
- Done when:         effect="material" mounts FxMaterialView on Android and the translucent
                     stack + blur render at {os:31, hosted}; intensity and materialConfig update
                     the live view without remount; the manifest fixture carries the Android
                     material ladder (blur rung selectable, Haze planned/non-selectable,
                     unblurred-stack floor) with select() tests; structure.android.md §material
                     pins the mechanics and constants; headless gates + an Android build pass;
                     the device scenario then closes FX-003 (human gate).
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified (maintainer-ratified 2026-06-11 — B1 PASS on POCO F1/API 35: render, live intensity, variants, interactive-inert, scroll 59.8 fps, staleness clean; `evidence/device.md` + `evidence/device-run-2026-06-11/`)
- [x] reviewed (reviewer, 2026-06-11 — `../../reviews/device-batch-2026-06-11.md`)
- [x] docs-closed (FX-003 closed: `21` Decision 6 + both open questions struck + ledger row resolved)
- [x] merged (maintainer, 2026-06-11, on integration/0.1.x)

## Proof

- **headless:** `bun run lint`, `bun run build`, `bun run test`, `bunx tsc --noEmit` from
  `packages/`; `bunx tsc --noEmit` from `example/`; an Android example build recording
  BUILD SUCCESSFUL in `evidence/` — the TS gates do not compile Kotlin.
- **device:** the B1 scenario above on an Android 12+ (API 31+) device. Human gate.
- **docs:** on device pass — FX-003 closes in `21` (Open questions: Android backdrop blur
  cost + intensity semantics) and the decision ledger. Not closed by this session.

## Scope

### Android native

- **FxMaterialView.kt** (new) — a plain `View` implementing `FxEffectView`: draws the
  translucent stack (frost scrim + highlight gradient) in `onDraw`, applies
  `RenderEffect.createBlurEffect(radius, radius, CLAMP)` via `setRenderEffect` on API 31+
  when the radius is positive; skips the blur below 31. `setIntensity` updates radius +
  alpha and invalidates without remount; `setMaterialConfig` applies the variant weight
  without remount. The `MaterialConfig` Record (`variant`, `interactive` — `@Field` on
  every property) lives here with its consumer, mirroring the iOS placement.
- **FxHostedView.kt** — `pendingMaterialConfig` + `setMaterialConfig` in the two-phase
  pattern; the `"material"` branch in `mountEffect`; config-only changes push onto the
  live view without remount.
- **FxModule.kt** — `Prop("materialConfig")` on the `FxHostedView` view definition (the TS
  side already sends it; no TS changes).

### Manifest + tests

- **packages/src/__tests__/manifest-select.test.ts** — the `material` node joins the
  fixture (iOS glass + material fallback; Android blur rung at `{os:31, hosted}`, planned
  Haze rung, unblurred-stack floor) with selection/degradation cases following the
  existing idiom.

### Docs

- **structure.android.md §material** — rewritten to the decided shape (the single home):
  own-content composition + `View.setRenderEffect` (reconciling the stale
  `applyVia:graphicsLayer` flavor), the pinned constants, the variant weights, the inert
  `interactive`, the planned Haze rung, the below-31 floor.

## Scope guard

- Does NOT add a Compose dependency or the Haze library — the Haze rung is `planned`,
  non-selectable, with no optional-peer machinery in V1.
- Does NOT capture or sample the backdrop — the stack blurs fx's own pixels only.
- Does NOT simulate a press on `interactive` — accepted silently, inert, documented.
- Does NOT ship `tintColor`/`colorScheme`/`weight` — the rest of `21`'s
  `MaterialUniforms` lands with the public surface layer.
- Does NOT touch TS runtime/catalog types — `materialConfig` already crosses the bridge.
- Does NOT tick `device-verified` or close FX-003 — those close on device (human gate).
- Does NOT touch device-sweep-v1-findings.md, the decision ledger, `21`'s open questions,
  or `01` — closure housekeeping follows maintainer ratification.

## Done when

- `effect="material"` mounts a real translucent panel on Android API 31+ — never absent,
  never a flat box.
- `intensity` 0–1 drives blur radius (0–24dp) + overlay alpha in place, no remount.
- `variant` switches the overlay weight in place; `interactive` is inert with no crash.
- The manifest fixture selects the blur rung at API 31+, skips the planned Haze rung, and
  degrades to the unblurred stack below 31 — proven by `select()` tests.
- structure.android.md pins the mechanics and constants.
- Headless gates green; Android build BUILD SUCCESSFUL recorded in `evidence/`.
- The device scenario is written; notes and progress are updated.
