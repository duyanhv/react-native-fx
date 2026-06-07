# audit.md — Architecture Audit of fx Research Specifications

## Metadata
- **Scope**: All research docs (`0-spine/`, `1-surface/`, `2-effects/`, `3-motion/`, `4-runtime/`, `5-realization/`)
- **Status**: Research complete, implementation not started
- **Audit Date**: 2026-06-06
- **Severity**: CRITICAL (blocks impl) > HIGH (inconsistency) > MEDIUM (risk) > LOW (missing spec)

---

## CRITICAL — Implementation Blockers (G1-G5)

| ID | Gap | Location | Blocker |
|----|-----|----------|---------|
| G1 | **No CapabilityManifest artifact** | `02` defines TS schema but no `manifest.ts`/`manifest.json` exists | Every consumer (adapter, compiler, feature-detection, substrate selection, clock wiring, build scaffolding) reads from this |
| G2 | **No `select()` implementation spec** | `02` signature only; `50` says "component layer is adapter" but no TS types, location, caching, error handling | Core JS→native boundary cannot be implemented |
| G3 | **MotionSpec/EffectStack type boundary undefined** | `41` `MotionSpec` vs `55` `EffectStack`; both on `FxView` (`motion` + `effect` props) | Type confusion: `fx.motion.scale()` vs `fx.effect.glow()` — no branded types/discriminated union |
| G4 | **Preset default catalog undefined** | `42` "filled on device"; `56` "fill on device"; no starter values, no platform source mappings, no `tune` formulas | V1 cannot ship "platform-native defaults" — law untestable |
| G5 | **FxGroup/FxItem morph scope undefined** | `57` "which effects support cross-item morph beyond glass" open; iOS 26 `.glassEffect`+`GlassEffectContainer`; Android Haze/blur only | "Honest compound" has no cross-platform path — may be iOS-only V1 |

---

## HIGH — Internal Inconsistencies (I1-I7)

| ID | Inconsistency | Locations | Detail |
|----|---------------|-----------|--------|
| I1 | `motion` node phase mismatch | `02` L292 node `phase:'v1'` vs content rung `phase:'v2'` vs effect rung `phase:'v1'` | Node-level `phase` misleading — decision 11 says per-rung but field exists |
| I2 | `tune` vocabulary mismatch | `41`/`56`: `{speed,emphasis,distance}`; `55`: `SpringTune{spring,emphasis}`; platform docs: adjusts within platform spring family | `SpringTune` vs `tune` — same? `spring`↔`emphasis` mapping? |
| I3 | Three "interaction" concepts collision | `30` `interactionMode` prop; `02` node `interaction:none\|self\|fx`; `01` substrate routing via `interaction` | Node property, component prop, substrate routing — same word, different meanings |
| I4 | `symbol` composability rule | `55`: "TERMINAL — not composed in stacks"; `02`: render-target with `interaction:'self'`; builder API may allow chaining | Can `fx.effect.shader().symbol()` be called? Docs say no, types may allow |
| I5 | `content-distort` all-rungs-out-of-scope | `02` iOS `out-of-scope`, Android `planned`; selector skips `out-of-scope` rungs but continues ladder | If ALL rungs `out-of-scope` → `{via:'none'}` — correct but unverified |
| I6 | `shape-morph` empty iOS ladder | `02` `ios:[]`; `structure.ios.md`: "needs canonical node with iOS `none`/`planned` rung or Android-only carve-out" | Empty array vs explicit `out-of-scope` rung — inconsistency with `content-distort` |
| I7 | `via:'lib'` dependency contract unresolved | `02` + `structure.android.md` open questions: "does manifest name package+version?" | Haze (glass), Lottie (symbols) — dependency unresolved at build time |

---

## MEDIUM — Structural Risks (R1-R6)

| ID | Risk | Detail | Mitigation |
|----|------|--------|------------|
| R1 | Expo Modules wrapper identity across Fabric commits | `05`/`35` falsification test: `FxPresenceCoordinator`/`FxManagedView` must survive re-renders | Validate in `33`/`35` BEFORE V1 impl |
| R2 | Per-child motion = Nitro trigger | `05`: "day preset needs per-child motion = reconsider Nitro"; `42` `menu`/`tooltip` (v2) need per-child | V2 anchored presets likely force boundary swap — design for it |
| R3 | Clock per rung vs substrate divergence | `02` `clock` on rung; `structure.ios.md`: "per-substrate clock correct: `shader` uses `timeline` hosted, `display-link` expo-view" | Same node different clocks — adapter must dispatch correctly |
| R4 | Android M3 Expressive opt-in and version-fluid | `structure.android.md`: "pin concrete minimum"; `motion` node defaults to M3 springs | Need fallback spring config for non-M3 Android |
| R5 | No web strategy for effects | Current `FxShaderView.web.tsx` → `null`; research silent on web | Decide: web=no effects (document) or web=CSS fallbacks |
| R6 | FxPressable vs interactive `<Fx>` recognizer base | `30`/`57`: different runtime ownership; `57`: "shared native base internally" | Design shared native press recognizer base |

---

## LOW — Missing Specifications (M1-M10)

| ID | Missing Spec | Needed By |
|----|--------------|-----------|
| M1 | **CapabilityManifest data file** (TS/JSON) with all 8 nodes, both platforms, all rungs | Everything |
| M2 | **`select()` function** with exact TS types, caching, error handling | `50` adapter |
| M3 | **Preset default catalog** — per-platform shape+timing for `transient`/`sheet`/`modal`/`lift`/`native` | `42`,`56`,`57` |
| M4 | **`tune` scaling formulas** — `speed`/`emphasis`/`distance` → platform spring params | `41`,`55`,`56` |
| M5 | **FxView state vocabulary** — named states per preset + `MotionSpec` map | `40`,`56`,`57` |
| M6 | **FxPressable feedback values** — `native` + variants, per-platform catalog | `56`,`57` |
| M7 | **Effect preset vocab** — `edge-glow`/`mesh-gradient`/`glass`/... + `EffectStack` compositions | `55`,`56` |
| M8 | **BYO asset registration API** — how dev registers `.metal`/`.agsl` + uniform types | `50`,`02` |
| M9 | **Memoization guidance** — `useFx`/`stable-ref` for inline builders | DX |
| M10 | **Web fallback strategy** — `<Fx effect="...">` on web | `55` |

---

## DECISIONS NEEDING CONFIRMATION (D1-D4)

| ID | Decision | Current | Question |
|----|----------|---------|----------|
| D1 | Single `FxModule` vs multiple | `expo-module.config.json`: `["FxShaderModule"]` | One `FxModule` exporting `FxPresenceView`/`FxManagedView`/`FxPressableView`/`FxEffectView`/`FxGroupView`? |
| D2 | `requireNativeView` module name | Current: `'FxShader'`; Research `51`: `'ReactNativeFx'` | Must change module name |
| D3 | `FxGroup`/`FxItem` Android without Liquid Glass | iOS 26 `.glassEffect`+`GlassEffectContainer`; Android Haze/blur only | `FxGroup` iOS-only in V1? |
| D4 | `symbol` Android = Lottie/AVD dependency | `structure.android.md`: `via:'lib'` (Lottie) or `via:'native'` (AVD) | Resolve `via:'lib'` contract |

---

## PRIORITY ORDER

| Priority | When | IDs |
|----------|------|-----|
| P0 | Before any implementation | G1, G2, M1, M2 |
| P1 | Before V1 ships | G3, G4, G5, I1-I7, D1-D4 |
| P2 | Before V2 | R1-R6 |

---

## SOURCE REFERENCES

| Doc | Key Lines |
|-----|-----------|
| `02-capability-ir-and-lowering.md` | Schema (L55-131), `select()` (L141-150), worked examples (L160-323), decisions (L345-388) |
| `01-substrates-and-hosting.md` | Two substrates (L17-35), iOS mutual exclusivity (L71-85), manifest encoding (L95-102) |
| `03-adapter-vs-compiler.md` | Adapter V1, compiler V2 additive, manifest invariant (L48-65) |
| `04-state-ownership-and-boundaries.md` | Five owners (L22-39), seams (L42-56), decisions (L74-101) |
| `05-native-boundary-decision.md` | Expo Modules default, Nitro falsification test (L99-105), regime-C exception (L93-95) |
| `41-motion-vocabulary.md` | Law (L13-21), preset/motion/tune/transition (L23-41), MotionSpec (L43-64), decisions (L145-162) |
| `42-presence-and-lifecycle.md` | Preset catalog (L42-47), default catalog (L73-92), envelope (L94-103) |
| `50-api-and-presets.md` | Three layers (L24-33), prop language (L35-58), adapter dispatch (L103-108) |
| `55-composition-chain.md` | EffectStack (L48-61), EffectStep (L48-52), animate() binding (L82-90) |
| `56-platform-behavior-presets.md` | Preset definition (L14-23), three bundles (L49-58), effect components (L59-72) |
| `57-content-primitives.md` | FxView (L16-40), FxPressable (L41-54), FxGroup/FxItem (L55-66) |
| `structure.ios.md` | Substrates (L13-29), clock (L41-46), motion (L121-135), version gates (L79-86) |
| `structure.android.md` | Three divergences (L24-36), clock (L44-49), motion (L112-125), version gates (L74-81) |
