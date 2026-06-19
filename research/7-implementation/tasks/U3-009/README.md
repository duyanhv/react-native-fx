# U3-009 — narrow the `fill` / `filter` manifest over-promise to the rendered subset

Type: `rework` · Device: `no` · Consumes: — · Closes: — (no ledger row) · Gates: `U10-001` · Blocked by: — (Unit 3 merged)

Origin: audit-2026-06-18 §A2 / DOC-025; the ratified call is [`a2-triage.md`](../../a2-triage.md)
**Outcome 3** (maintainer-ratified 2026-06-18). **Pre-Unit-10 blocker** — `<Fx effect>` (U10-001)
must not expose a rung whose typed config the renderer ignores.

## The defect

`<Fx effect="id">` runs `select()` over the manifest and surfaces the per-effect typed config
derived from each node's `uniforms` (`config.ts` `ConfigFor<NodeId>`). Two render targets declare
typed config the native side does not honor:

**`fill` — declares six uniforms; the renderer consumes none of them.**
- `manifest.ts:22-73` (`fill.uniforms`) declares `kind` / `colors` / `angle` / `width` / `height`
  / `drift`; `config.ts:55` derives `FillConfig = ConfigFor<'fill'>` from them.
- Both native renderers draw a **fixed** gradient whose only input is the surface-level
  `intensity` prop (not a `fill` uniform):
  - iOS `FxFillView.swift` — hardcoded `MeshGradient` (iOS 18+) / `LinearGradient` (below),
    `intensity` → `.opacity`. The six uniforms are never read.
  - Android `FxHostedView.kt` (`FxFillView`) — hardcoded blue→purple `LinearGradient`,
    `intensity` → paint alpha. Same: the six uniforms are never read.
- So `FillConfig`'s six fields are typed config the renderer silently drops.

**`filter` — declares a `phase:'v1'` native lowering with no renderer behind it.**
- `manifest.ts:188-221` (`filter.uniforms`) declares `blur` / `saturation` / `contrast` /
  `brightness` / `hueRotate` / `opacity`, with a `via:'native'`, `phase:'v1'` lowering on both
  platforms; `config.ts:58` derives `FilterConfig`.
- There is **no filter renderer**: no `FxFilterView` on iOS; nothing renders `filter` on Android
  (only `material`'s `RenderEffect` blur exists, a different node). So `select('filter', …)`
  returns a `via:'native'` rung pointing at an unimplemented primitive — the whole typed config
  is unbacked.

This is the same "shipped a layer the renderer ignores" class the audit hunts. It **gates
Unit 10**: ship it as-is and the front door offers a `fill` effect whose `colors`/`angle` props
vanish and a `filter` effect that renders nothing — a direct breach of the law (rule #2:
platform-native, **native-backed**) and rule #5 (the front door must be honest).

## The fix (manifest data + source docs; **no native renderer change**)

1. **`fill` — trim `fill.uniforms` to the rendered subset.** The renderer's only input is the
   surface-level `intensity` prop, which is **not** a `fill` node uniform. Remove the six
   unrendered uniforms (`kind`/`colors`/`angle`/`width`/`height`/`drift`) so `FillConfig` no
   longer advertises config the renderer drops. The honest model is the `material` node
   (`manifest.ts:84-87`), which declares only the `{variant, interactive}` it actually backs.
   Leave the lowering rungs in place — they correctly route to the hosted gradient renderer.
2. **`filter` — mark the lowering `status:'planned'`.** Set `status: 'planned'` on **both**
   `filter.lower.ios[0]` and `filter.lower.android[0]`, so `select()` skips them
   (`select.ts:27-29` already skips `'planned'`) and returns `{via:'none'}`. The derived
   `FilterConfig` type stays — harmless, because the node is now unselectable.
3. **Source docs — stop over-promising.** Narrow `2-effects/20-fills.md` to the rendered
   (intensity-driven) subset, and `2-effects/23-filters.md` to "planned typed config — no native
   renderer in V1." Match the surrounding doc idiom; no per-platform mechanic gets re-stated here
   (those live in `structure.{ios,android}.md`).
4. **Tests — pin the new contract.** In `__tests__/manifest-select.test.ts` assert
   `select('filter', <any ctx>)` → `{via:'none'}`; in `manifest-conformance.test.ts` assert the
   `fill` node exposes only the narrowed uniform set. Keep all suites green (`tsc` will also flag
   any consumer that read the removed `FillConfig` fields).

## Scope guard — explicitly NOT this task

- **No native rendering work.** Wiring `fill` `colors`/`angle`/`kind` through real
  `MeshGradient`/`LinearGradient` primitives is the **spawned Phase-S follow-up** (a2-triage
  spawned-work line 67 — "once examples + device proof exist"). Do not add a renderer here.
- **No device gate.** This removes lying typed config; it changes nothing that draws. The fixed
  gradient already renders; `filter` already renders nothing. `device: no`.

## Open questions for the maintainer (decide at review — do NOT bake into the first pass)

- **Declare `intensity` on the `fill` node?** The renderer's sole input is the surface-level
  `intensity` prop. `shader` declares `intensity` as a node uniform (`manifest.ts:141`); `fill`
  does not. **Recommendation:** keep `intensity` the surface prop it already is and document it in
  `20-fills` — adding it to the node would advertise a uniform the renderer reads from a different
  path. One-line add if the maintainer prefers cross-node consistency.
- **Trim the over-promising lowering `note`s too?** The iOS `fill` rung says "animated mesh
  vertices + colors" and the Android `os:33` rung claims a `via:'shader'` AGSL mesh — both
  describe motion/inputs the static renderer does not produce. **Recommendation:** trim those
  notes (and consider dropping the unbacked Android AGSL `fill` rung) in the same pass — same
  "manifest lies" class, file already open — but it is outside the strict ratified uniforms scope,
  so it is the maintainer's call whether U3-009 carries it or a follow-up does.

## Proof

```
Proof:
- headless: packages tsc + build + lint green; manifest-select + manifest-conformance Jest green
            WITH the new assertions (filter -> {via:'none'}; fill narrowed uniform set). No native
            file changes expected -> no xcodebuild / compileDebugKotlin needed; run them only if a
            .swift/.kt is touched.
- device:   none — manifest data + types + source docs; no effect rendering changes.
- docs:     2-effects/20-fills.md (narrowed), 2-effects/23-filters.md (planned), manifest.ts,
            config.ts (derived — no manual edit), the two __tests__ files.
```

## Authority links

```
Subtask: narrow fill/filter manifest over-promise (Unit 3 rework; pre-Unit-10)
- Contract anchors:  a2-triage.md Outcome 3 (the ratified narrowing); 02 (the manifest schema +
                     the select skip-rule); 2-effects/20-fills (fill semantics); 2-effects/23-filters
                     (filter semantics); 50 §V1 shader catalog (the surface exposes select()'s result).
- Decision:          fx-original — narrow the IR to what native backs (the law: native-backed config
                     only; no uniform the renderer ignores). Flip-trigger: the Phase-S wire-through,
                     when fill colors/angle/kind get real native primitives + device proof.
- Reference (HOW):   the shipped select() status handling (select.ts:27-31 skips 'planned'); the
                     material node's honest {variant, interactive} (manifest.ts:84-87) is the model.
                     REJECT adding a native renderer or wiring the removed uniforms.
- Guides:            Code Style (manifest.ts / config.ts / tests); Testing (the two Jest suites);
                     Writing Style (20-fills / 23-filters); Contributing (the merge bar).
- Rules gate:        #2 (the law — native-backed config only; no lying typed config); #5 (the front
                     door must not expose a rung whose config the renderer ignores). #1/#9 untouched
                     (no frame/loop/layout change).
- Device-verify:     none — pure manifest / types / docs; nothing new to draw.
- Done when:         select('filter', any ctx) -> {via:'none'}; FillConfig advertises only the
                     rendered subset; 20-fills / 23-filters no longer over-promise; conformance +
                     select suites green; <Fx effect> (U10) cannot expose ignored typed config.
```

## Lifecycle

```
[ ] spec'd        this file
[ ] rules-gated   #2 / #5 — the IR must advertise only native-backed config
[ ] implemented   manifest.ts: fill uniforms trimmed; filter ios+android rungs status:'planned'
[ ] commented     manifest comments are the iceberg only — no internal ids (Code Comments Guide)
[ ] headless-done tsc / build / lint + manifest-select + manifest-conformance green (new assertions)
[ ] reviewed
[ ] docs-closed   20-fills narrowed; 23-filters marked planned; FillConfig/FilterConfig derive correctly
[ ] merged
```

No `device-verified` box — `device: no`.

## Start here

1. **This file** — the defect, the fix, the scope guard, the two maintainer open questions.
2. **[`a2-triage.md`](../../a2-triage.md) Outcome 3** — the ratified narrowing (the "narrow to" column).
3. **`packages/src/manifest/manifest.ts`** (`fill` 22-73, `filter` 188-221), **`select.ts`**
   (27-31, the `'planned'` skip), **`config.ts`** (55/58, the derived types).
4. **`packages/ios/FxFillView.swift`** + **`packages/android/.../FxHostedView.kt`** (`FxFillView`)
   — confirm for yourself the renderers read only `intensity` before trimming.
5. **`agents/session-protocol.md`** + **`subtask-protocol.md`** — lifecycle, gates, closure.
6. **Guides:** `implemented` → Code Style; `headless-done` → Testing; `docs-closed` → Writing Style;
   `reviewed`/`merged` → Contributing.
```
