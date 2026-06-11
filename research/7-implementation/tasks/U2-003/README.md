# U2-003 — CapabilityManifest data + typed config + conformance + cadence + event wiring

Type: `implement` · Device: no headless gate; two device-pending carry-ins · Consumes: — · Closes: — (critique-routed, no ledger row)

A self-sufficient cold-start kit. Start here.

## Goal

Today the capability manifest exists only as a **schema** (`src/manifest/types.ts`), a
**selector** (`src/manifest/select.ts`), and a **test fixture** redefined inline in the
spec. The dispatch data is rendered in *five unsynchronized places*: the test fixture,
`02`'s worked examples, `data-layer.md §1`, the iOS native shader switches, and the
Android native switch. This task makes the manifest data **canonical and shipped**, ties
the renderings together with a conformance test, derives per-effect typed config from it,
adds the open `cadence` schema hint, and clears two carry-ins from the U4-003 review.

## In scope (six work items)

1. **Author the canonical `CapabilityManifest` data** in `src/manifest/manifest.ts` —
   all V1 nodes (`fill`, `material`, `shader`, `filter`, `motion`, `symbol`,
   `content-distort`, `shape-morph`), each with its `uniforms`/`properties` typed config and
   per-platform `lower` ladders, **reconciled to the shipped native + the contract** where
   `data-layer.md §1` has drifted. The test fixture imports this module instead of redefining
   it (drift source #1 removed).
2. **Per-effect typed config → generated TS.** Resolve `02`'s first Open question
   ("Where does per-effect typed config live"): canonical in the manifest, TS types derived
   from it. Type-level derivation (`as const satisfies` + a mapped `ConfigFor<NodeId>`); no
   codegen script (honors `02` decision 6 — the manifest is dispatch + contract, **not** a
   code generator). Assert the derived config agrees with the shipped public catalog types
   (`MaterialConfig`/`SymbolConfig`) at the type level.
3. **`manifest ↔ ShaderId ↔ native-switch` conformance test** — a Tier-1 headless guard that
   the curated id set (`CURATED_SHADER_IDS`, now the single runtime source `ShaderId` derives
   from), the iOS hosted MSL switch, the Android AGSL switch, and the on-disk `.agsl` assets
   stay in lockstep. The iOS interactive **raster** switch covers a documented 5-id subset
   (not all 10) — encoded honestly, not as a failing 10-demand.
4. **`cadence` hint on the schema** (F11's cadence half) — add `Cadence =
   'ambient' | 'display-rate' | 'static'` and `Lowering.cadence?`, populate animated rungs,
   and pin it in `02`'s schema while the schema is open.
5. **Carry-in — wire `onFxLoad`/`onFxError` on `FxSurfaceView`** (iOS + Android). They are
   declared in `FxModule` `Events(...)` but dispatched nowhere; the Device Verification Guide
   expects "BYO shader compilation succeeds or fires `onError`" (`22` §Events/Decision 6).
   Fire once per shader change (never per frame — rule #1): `onFxLoad` when the active shader
   resolves to a usable pipeline/asset, `onFxError` when it does not.
6. **Carry-in — absent-vs-empty `shader` contract.** `shader` set back to `undefined` does
   not reset the native shader: Expo omits the prop from the batch, so the setter never fires
   and the stale shader sticks (U4-003 device run). Resolve: absent ⟺ empty ⟺ no effect; the
   JS binding coerces `shader ?? ''` so the prop always crosses, and native already treats `""`
   as no-effect. Pin the contract in `structure.ios.md` + the binding TSDoc.

## Out of scope

- The Android **interactive shader surface** render (`FxSurfaceView.kt` has no GPU path — U8).
- Completing the iOS interactive **raster** catalog to 10 (only 5 raster fragment functions
  exist; the hosted path does 10 — U8/effects).
- BYO `registerShader()` runtime registration (`22` decision 6 forward-pointer; `DEF-008`).
- Manifest partitioning, `assets: Asset[]`, `feature` enumeration (`02` Open questions — deferred).
- `tune`/extra material uniforms (`tintColor`/`weight`/…) — deferred with the full material
  surface (`MaterialConfig` TODO in `catalog.ts`; DOC-019 `tune` deferral). V1 config matches
  the shipped public types.

## Authority links

- **Contract anchors:** `0-spine/02` (the manifest schema + selection rule + the typed-config
  Open question this closes), `2-effects/22` (shader catalog: 10 ids, minimal public uniform
  `intensity`, `onLoad`/`onError` contract), `2-effects/21` (material variant/interactive),
  `2-effects/23`/`24` (filter/symbol typed config), `3-motion/41` + `02` decision 14 (motion
  `properties`).
- **Decision:** `fx-original` (manifest authoring) + `adapt` the existing fixture shape.
  Type-level config derivation over a codegen script (flip-trigger: node count makes type-level
  derivation unwieldy → a build emitter, `02` Open question "Manifest partitioning").
- **Platform mechanics:** `5-realization/structure.ios.md` (hosted MSL + raster Metal switch,
  the lazy/shared Metal context, the load/error + reset pins this adds), `structure.android.md`
  (AGSL asset path; the load/error pin).
- **Reference (HOW):** the existing `select.ts`/`manifest-select.test.ts` shapes; Expo
  `EventDispatcher` payload idiom already used by `onShaderPress*` on `FxSurfaceView`.
- **Guides:** Code Style + Code Comments (TS + Swift + Kotlin); Testing (Tier-1 headless +
  Tier-3 build); Device Verification (the two carry-in scenarios); Contributing (merge bar).
- **Rules gate:** #1 (events fire per-change, never per-frame), #2 (agnostic ids, platform-native
  switches below the manifest), #7 (Expo Modules — `Prop`/`Events`, no JSI), #9 (no layout writes).

## Resolved decisions (from the authority chain, not invented)

- **Schema goes `readonly`** (arrays/`options`/`range`) so the canonical manifest can be
  `as const satisfies CapabilityManifest` (literals preserved for config derivation); mutable
  inputs stay assignable, so the existing inline fixtures still typecheck. Mirror the note in
  `02`/`data-layer §1`.
- **Shader public uniforms = `{ intensity }`** only (`22` decision 3 — `time`/`resolution`/
  `pressDepth`/`touch` are native-owned; `colorA` in `data-layer §1` is not wired in V1).
- **Material uniforms = `{ variant, interactive }`** — matches the shipped `MaterialConfig`;
  the rest stay TODO with the full material surface.
- **`material` iOS rung = `UIGlassEffect`/`UIVisualEffectView`** (shipped U3-002 rework), not
  `data-layer §1`'s stale `.glassEffect`; Android = `RenderEffect.createBlurEffect` /
  `View.setRenderEffect` + planned `Haze` + an unblurred `draw` floor (shipped U3-003).
- **`shader` Android hosted `applyVia` = `Paint.onDraw`** (`02` worked example + shipped
  `FxShaderView.kt`), not `data-layer §1`'s stale `RenderEffect`.
- **iOS `onFxError` reachability** — `fragmentName(for:)` returns `String?` (nil for an id with
  no raster function), so a genuinely-missing function yields a nil pipeline → `onFxError`,
  instead of silently defaulting to `fractal-clouds`. The 5 raster ids load; the rest error on
  the **interactive** surface (the hosted path is unaffected and still does 10).

## Proof

- **headless:** from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test` (conformance + select suites). The type-level config
  assertions are enforced by `tsc`. Native: `xcodebuild` (Debug, iphonesimulator) build-verify
  (run `pod install` in `example/ios` first — stale Pods cause phantom missing-type errors).
- **device (carry-ins, the human's gate):**
  - set `shader` to an id, then back to `undefined` → the effect clears (no stale shader).
  - a usable curated shader fires `onFxLoad`; an unknown/missing one fires `onFxError`; neither
    fires per-frame.
- **docs:** `02` schema (`cadence`) + the typed-config Open question resolved + decisions;
  `data-layer §1` reconciled to shipped + cadence mirror; `structure.ios.md` (load/error +
  reset pins); `structure.android.md` (load/error pin). No ledger row.

## Lifecycle

- [x] spec'd
- [x] rules-gated (#1 events fire per-change not per-frame; #2 agnostic ids, native switches below; #7 Expo `Prop`/`Events`; #9 no layout writes)
- [x] implemented
- [x] commented
- [x] headless-done (tsc/build/lint/swift:lint/26→34 tests green; iOS xcodebuild + Android compileDebugKotlin BUILD SUCCEEDED)
- [x] device-verified (maintainer-ratified 2026-06-11 on the PASS evidence — iOS 26 sim + POCO F1/API 35; `evidence/README.md`)
- [x] reviewed (2026-06-11, approved after two rounds — `../../reviews/U2-003.md`)
- [x] docs-closed (verified in review: `02` decisions 15+16, `data-layer` canonical re-point + intensity reconciliation, `structure.{ios,android}.md` pins; no ledger row)
- [x] merged (maintainer, 2026-06-11, on integration/0.1.x)
