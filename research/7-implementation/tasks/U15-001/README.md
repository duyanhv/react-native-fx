# U15-001 — typed material config: `tint` + `colorScheme`

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes a2-triage Outcome 1; opens no new ledger row) · Unblocks: — · Blocked by: — (Unit 3 material merged)

Origin: blueprint Phase S **Unit 15** (proposed in a2-triage Outcome 1, maintainer-ratified 2026-06-18). Recommendation pass complete + maintainer-aligned (2026-06-21): **ship `tint` + `colorScheme` only; strike `weight` from the candidate set.**

## The goal

Extend the typed `material` config with two product-facing knobs — `tint` (a color cast) and `colorScheme` (light/dark override) — **backed natively on each platform's primary material rung**, never declared where the renderer would ignore them (the `fill`/`filter` trap a2-triage Outcome 3 warns against). The public type becomes:

```ts
type MaterialConfig = {
  variant?: 'regular' | 'clear';           // shipped (U3-002/U3-003)
  interactive?: boolean;                    // shipped (inert on Android)
  tint?: string;                            // NEW — a color cast
  colorScheme?: 'system' | 'light' | 'dark'; // NEW — appearance override
};
```

## The honesty decision (recommendation-pass outcome, maintainer-ratified 2026-06-21)

`weight` is **struck** from the a2-triage candidate set. It fails the honesty test and is not kept in any form (no alias to `variant`, no Android-only scoping):

- The shipped iOS-26 rung is `UIGlassEffect`, which has **no thickness/weight property** (only `style` = `regular`/`clear`, `tintColor`, `isInteractive`). A `weight` knob would be silently ignored on the primary iOS path — the exact `fill`/`filter` trap.
- It overlaps the shipped `variant` axis (on Android `regular`/`clear` *are* the scrim-alpha weights 0.55/0.28). An alias creates two public names for one backed axis.
- "Material thickness" (`.ultraThin`…`.chrome`) exists only on SwiftUI's `Material`, which is the **below-26 fallback** rung, not the shipped glass. Fallback-only backing is not enough — the primary rung must back the config, or it is dishonest.

`tint` and `colorScheme` pass because **both primary rungs back them**, confirmed against `references/expo/packages/expo-glass-effect/ios/GlassView.swift`:

| field | iOS 26 (`UIGlassEffect`) | Android (fx-drawn material) | iOS <26 fallback (`.ultraThinMaterial`) |
|-------|--------------------------|------------------------------|------------------------------------------|
| `tint` | `effect.tintColor` (`GlassView.swift:261`) | frost-scrim color (fx owns the `onDraw`) | **degrades** — SwiftUI `Material` has no tint; document as a rung-fidelity note, never silent |
| `colorScheme` | `effectView.overrideUserInterfaceStyle` (`GlassView.swift:264`) | light/dark material base in the draw | still applies (interface style on the host) |

The honesty bar: **the primary rung on each platform backs both fields.** Below-26 iOS `tint` degradation is a documented rung-fidelity divergence (the law allows fidelity divergence across rungs), not a declared-but-ignored uniform.

## The design

### 1. Manifest node — the source of truth (`src/manifest/manifest.ts`)

Add to `material.uniforms` (alongside `variant`/`interactive`):

```ts
tint: { type: 'color' },                                           // no default — undefined = untinted system glass
colorScheme: { type: 'enum', default: 'system', options: ['system', 'light', 'dark'] },
```

`UniformSpec` already supports `type:'color'` and `type:'enum'` (U2-002) — **no schema widening.** `tint` has no `default` (undefined ⇒ the system's own untinted glass).

### 2. Public catalog type — lockstep (`src/effects/catalog.ts`)

Replace the `// TODO: tint, color scheme, …` line in `MaterialConfig` with the two backed fields:

```ts
tint?: string;
colorScheme?: 'system' | 'light' | 'dark';
```

The compile-time assertion `MaterialConfigConformsToManifest` (`config.ts:80`, `ConfigMatches<MaterialEffectConfig, Partial<MaterialConfig>>`) **fails the build** if the manifest and this type drift — so both edits land together or tsc breaks. Confirm `UniformTSType<{type:'color'}>` resolves to `string` (it should, from U2-002's `color[]`→`string[]`); if not, that is a `config.ts` `UniformTSType` gap to fix, not a workaround in the catalog type.

### 3. iOS native — `FxGlassSurfaceView.swift` + the `MaterialConfig` Swift struct

- Add `tint: String?` + `colorScheme: String?` to the native `MaterialConfig` decode struct.
- In `applyEffect()` (the iOS-26 rung): `effect.tintColor = <parsed UIColor from tint>` and `effectView.overrideUserInterfaceStyle = <map colorScheme>` (`.unspecified`/`.light`/`.dark`). Follow the `GlassView.swift` precedent exactly (tint on the `UIGlassEffect`, color scheme on the effect *view*).
- Apply in-place on config change (the existing `setMaterialConfig` diff path), never remount.
- The below-26 `.ultraThinMaterial` fallback: apply `colorScheme`; `tint` degrades (documented). If the shipped build has no below-26 renderer wired, the fallback note still belongs in the structure doc.

### 4. Android native — the material view draw + the `MaterialConfig` Kotlin

- Add `tint` + `colorScheme` to the Kotlin `MaterialConfig`.
- In the material `onDraw` (the white frost scrim + highlight gradient, `structure.android.md §material`): drive the scrim color from `tint` (default white when absent); switch the frost base light/dark from `colorScheme`.
- Live-update via the existing `setMaterialConfig` → `invalidate()` path, never remount. `interactive` stays inert (unchanged).

### 5. Doc reconciliation — `tintColor` → `tint`, strike `weight`

`21-materials-and-glass.md` is internally inconsistent: examples use `tint` (lines 33/83/95/103) but the `MaterialUniforms` interface block (line 49) and prose (line 56) say `tintColor`, and the block lists `weight` (line 52). Reconcile to the shipped public surface:
- `tintColor` → `tint` (lines 49, 56).
- **Strike `weight`** (line 52) + any prose treating it as a shipped knob.
- Clarify `intensity` is the separate `<Fx>` presence prop (0–1), not a `MaterialConfig` field — the typed config is `{ variant, interactive, tint, colorScheme }`.

## Scope guard — explicitly NOT this task

- **No `weight`** in any form — not a field, not a `variant` alias, not Android-only. Struck.
- **No new effect node / no new public effect id** — `material` / `glass` are shipped; this extends their config only.
- **No change to `intensity`** — it is the separate `<Fx>`-level presence prop, not part of `MaterialConfig`.
- **No backdrop-sampling change** — Android stays own-content composition (rule #4); iOS keeps the system view. tint/colorScheme are appearance knobs on the existing rungs.
- **No `FxGroup`/`FxItem` morph work** — that is U14.
- **No `filter`/`fill` wire-through** — separate spawned Phase-S rows.
- **No new prop plumbing** — the two fields ride the existing `materialConfig` Record across the bridge.

## Proof

```
Proof:
- headless: packages tsc (the MaterialConfigConformsToManifest lockstep MUST compile — proves manifest
            ↔ catalog type agreement) + build + lint green; manifest-conformance + effects-resolver +
            effect-builder + manifest-select tests still pass (add material tint/colorScheme assertions
            where a fixture exercises MaterialConfig); Swift compile (FxGlassSurfaceView + struct) via
            iOS xcodebuild after pod install; Android :react-native-fx:compileDebugKotlin --rerun-tasks
            + :app:assembleDebug BUILD SUCCESSFUL; example tsc.
- device:   YES — example harness: a glass <Fx effect="glass"> (and/or FxView effect={fx.effect.glass({...})})
            with controls for tint (a couple of colors) and colorScheme (system/light/dark).
            iOS (26 device/sim): tint visibly casts the glass; colorScheme forces light/dark glass
            regardless of system appearance; variant/interactive unregressed. If a sub-26 device is
            available, confirm colorScheme applies and note tint degradation; otherwise code-reason it.
            Android (POCO F1): tint colors the frost scrim; colorScheme switches the material base
            light/dark; intensity/variant unregressed; interactive still inert (no crash).
            iOS + POCO F1; NATIVE change ⇒ REBUILD (Device Verification Guide §Launching the app).
- docs:     02/manifest material node (tint + colorScheme uniforms); catalog.ts MaterialConfig; 21
            (tintColor→tint, strike weight, intensity clarification); structure.{ios,android}.md §material
            (the tint + colorScheme mechanic + the iOS <26 tint-degradation note); data-layer material
            node mirror if it enumerates uniforms; a2-triage Outcome 1 row marked shipped.
```

## Authority links

```
Subtask: typed material config — tint + colorScheme, native-backed only (blueprint Phase S, Unit 15)
- Contract anchors:  a2-triage Outcome 1 (build now: tint/colorScheme native-backed only; weight struck —
                     the fill/filter trap), 21 (the material/glass config vocabulary; reconcile tintColor→tint,
                     strike weight), 02 (the manifest material node + UniformSpec — color/enum already supported),
                     50 (typed config is the scoped prop language; native owns pixels).
- Decision:          recommendation-pass + maintainer-ratified 2026-06-21 — ship tint (iOS UIGlassEffect.tintColor /
                     Android scrim color) + colorScheme (iOS overrideUserInterfaceStyle / Android light-dark base);
                     STRIKE weight (no UIGlassEffect thickness; overlaps variant; fallback-only backing is dishonest);
                     no alias, no Android-only. Public field is `tint`, not `tintColor`.
- Reference (HOW):   references/expo/packages/expo-glass-effect/ios/GlassView.swift (the exact UIGlassEffect.tintColor
                     + overrideUserInterfaceStyle calls to mirror) + GlassEffectModule.swift (the prop shapes);
                     packages/ios/FxGlassSurfaceView.swift (the shipped glass surface + MaterialConfig struct to extend);
                     the Android material view (FxMaterialView / the onDraw scrim+gradient, structure.android.md §material)
                     + its Kotlin MaterialConfig; packages/src/manifest/manifest.ts (material node), config.ts (the
                     ConfigFor/lockstep), effects/catalog.ts (MaterialConfig). REJECT re-deriving the type system.
- Guides:            Code Style (Fx-prefixed native, typed fields); Code Comments (iceberg — why no weight, why tint
                     degrades sub-26; NO internal ids); Testing (the lockstep must compile; conformance fixtures);
                     Device Verification (tint + colorScheme visible both platforms, NATIVE REBUILD); Writing Style
                     (21/02/structure reconciliation); Contributing (merge bar).
- Rules gate:        #1 (native owns pixels; JS configures semantics), #2 (the law — platform-native realization;
                     equal polish, not pixel parity; magnitudes/fidelity diverge per rung), #4 (no hosting RN content
                     to sample — Android stays own-content), #5 (config on the shipped material, not a new component),
                     #6 (iOS/Android peers; divergence in structure.{ios,android}.md), #7 (Expo Records, no JSI).
- Device-verify:     iOS tint cast + colorScheme force (26); Android scrim tint + base switch; both unregressed on
                     variant/interactive/intensity; iOS <26 tint-degradation noted.
- Done when:         tint + colorScheme in the manifest + catalog type (lockstep compiles); applied on both primary
                     native rungs in place; weight struck from 21; device-verified both platforms; docs reconciled.
```

## Lifecycle

```
[x] spec'd        this file
[x] rules-gated   #1/#2/#4/#5/#6/#7 — native-backed config, own-content Android, no new component
[x] implemented   manifest material uniforms + catalog MaterialConfig (lockstep) + iOS FxGlassSurfaceView/struct
                  + FxMaterialView (below-26 colorScheme) + Android material draw/struct + 21/structure reconciliation
[x] commented     iceberg: why tint degrades sub-26 iOS (FxMaterialView.swift), tint→scrim mapping (FxMaterialView.kt)
[x] headless-done packages tsc (lockstep compiles) + build + lint + 145 tests; iOS pod install + xcodebuild BUILD SUCCEEDED;
                  Android compileDebugKotlin/assembleDebug BUILD SUCCESSFUL; example tsc
[x] reviewed      planner, 2026-06-21 — ALL gates re-run independently: packages tsc (lockstep compiles)/lint/145
                  tests/build; example tsc; Android compileDebugKotlin --rerun-tasks (58 executed, not cached);
                  iOS xcodebuild BUILD SUCCEEDED. Full diff read: TS lockstep clean (the unplanned `default?`
                  widening in types.ts is correct + necessary for no-default tint); iOS mirrors GlassView.swift
                  exactly (tint on the effect, colorScheme on the effect view), hex parser degrades safely;
                  Android scrim tint + #1C1C1E dark base, safe parse fallback; tests assert manifest + builder.
                  Internal-id audit: packages/ clean (the one U15-001 ref is an on-screen harness label — the
                  accepted example-screen idiom, DEF-009 precedent).
                  THREE maintainer-flagged fixes applied + re-gated (2026-06-21): (1) Android tint parser — replaced
                  Color.parseColor (rejects #RGB; reads 8-digit as #AARRGGBB alpha-first) with a local parser matching
                  iOS (#RGB/#RRGGBB/#RRGGBBAA, alpha-last) so 8-digit tints render identically cross-platform; (2)
                  harness public-path row added — <Fx effect={fx.effect.glass({tint,colorScheme})}> (builder→materialConfig,
                  Fx.tsx), not only FxHostedView; (3) 02 UniformSpec schema reconciled to default?:unknown. Re-gated:
                  packages tsc/lint; example tsc; Android compileDebugKotlin --rerun-tasks (58 executed). iOS untouched.
[x] device-verified  6/6 PASS both platforms (maintainer-ran + ratified 2026-06-21, gate build 89b594b):
                  iOS tint via UIGlassEffect.tintColor + colorScheme via overrideUserInterfaceStyle; Android scrim
                  tint + dark base; the FxHostedView and public <Fx effect={fx.effect.glass(…)}> paths render
                  identically; variant/intensity/fill unregressed; no crash. Static appearance checks — agent
                  capture authoritative, no hand-ratification needed. evidence/device.md + 15 PNGs.
                  REVIEWER NOTE: the gate agent wrote evidence to a stray repo-root `tasks/U15-001/` — planner
                  relocated it to the canonical path, removed the stray folder, and corrected the device.md commit
                  header (7440f19 → 89b594b; the public-path rows + PNG mtimes prove the post-fix build).
[x] docs-closed   02/manifest (incl. UniformSpec default?), catalog, 21 (tintColor→tint, weight struck, hex format),
                  structure.{ios,android}.md (parser + format), data-layer material mirror (tintColor+default→tint
                  no-default; intensity/weight removed), a2-triage Outcome 1 row marked shipped + weight-struck.
[ ] merged
```

## Start here

1. **This file** — the honesty decision (tint + colorScheme in, weight struck), the native mapping table, the scope guard.
2. **a2-triage.md Outcome 1 + Outcome 3** — why native-backed-only; the fill/filter trap this avoids.
3. **The lockstep** — `packages/src/manifest/manifest.ts` (`material` node), `packages/src/manifest/config.ts` (`ConfigFor`/`MaterialConfigConformsToManifest`), `packages/src/effects/catalog.ts` (`MaterialConfig`). Edit manifest + catalog together; tsc enforces agreement.
4. **The iOS reference + shipped surface** — `references/expo/packages/expo-glass-effect/ios/GlassView.swift` (the exact `tintColor`/`overrideUserInterfaceStyle` calls), `packages/ios/FxGlassSurfaceView.swift` (extend its `MaterialConfig` + `applyEffect`).
5. **The Android material** — `structure.android.md §material` (the scrim+gradient draw) + the Kotlin material view/config to extend.
6. **`21-materials-and-glass.md`** lines 46–58 — the `tintColor`→`tint` + strike-`weight` reconciliation.
7. **`agents/session-protocol.md` + `subtask-protocol.md`** — lifecycle, gates, closure. Device gate is a NATIVE rebuild.
8. **Guides per gate:** `implemented`→Code Style; `commented`→Code Comments (no internal ids); `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style.
```
