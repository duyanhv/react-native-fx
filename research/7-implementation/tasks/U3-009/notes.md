# U3-009 session notes

## Changes

- `packages/src/manifest/manifest.ts`: Trimmed `fill.uniforms` from six entries (`kind`/`colors`/`angle`/`width`/`height`/`drift`) to `{}`. Added `status: 'planned'` to both `filter.lower.ios[0]` and `filter.lower.android[0]`. Added iceberg comments to both nodes explaining the V1 state.
- `packages/src/__tests__/manifest-select.test.ts`: Added two assertions — `select(filter, ios, {deviceOS:18})` → `{via:'none'}` and `select(filter, android, {deviceOS:31})` → `{via:'none'}`.
- `packages/src/__tests__/manifest-conformance.test.ts`: Added `manifest fill node` describe block with two assertions — kind/interaction, and `Object.keys(fill.uniforms)` equals `[]`.
- `research/2-effects/20-fills.md`: Narrowed `## Semantic surface` (removed the six-field FillUniforms type, replaced with intensity-only V1 description), `## Runtime behavior` (removed drift/native-clock claims), `## Decisions` (removed decisions 2/4/5 referencing removed uniforms; simplified to 3 decisions).
- `research/2-effects/23-filters.md`: Added V1 unselectable note to `## The node`, updated `## Lowering` table to show `status:'planned'`, updated `## Degradation` to reflect always-`{via:'none'}` in V1, updated Decision 3 to "Planned parity."

## Verified

- Native renderers (`FxFillView.swift`, `FxHostedView.kt` `FxFillView`) confirmed to read only `intensity` — no fill uniform fields consumed.
- `packages tsc` — clean.
- `bun run build` — clean.
- `bun run lint` — clean (Biome, 37 files).
- `manifest-select.test.ts` + `manifest-conformance.test.ts` — 61 pass, 0 fail (two new assertions green).
- Pre-existing `registerShader()` 8-failure set is unrelated (Bun/Jest `resetModules` API gap).

## Open questions for review (from the spec — not baked in)

- Declare `intensity` on the `fill` node uniform? (recommendation: keep it a surface prop)
- Trim the over-promising lowering `note`s on the iOS/Android fill rungs? (recommendation: do in same pass — maintainer's call)

## Review-round fixes (2026-06-19)

- `packages/src/manifest/config.ts` — `ConfigFromSpecs<{}>` now produces `Record<string, never>` instead of `{}`. Fix: conditional on `[keyof Specs] extends [never]`; the empty spec case resolves to the strict no-extra-properties type. `FillConfig` is now `Record<string, never>` — U10 cannot accidentally accept `colors`/`angle`/etc.
- `packages/src/manifest/manifest.ts` — trimmed two over-promising fill lowering notes per the reviewer's call: iOS os:18 note `'animated mesh vertices + colors'` → `'MeshGradient; intensity → opacity'`; Android os:33 note `'mesh has no native primitive → AGSL'` → `'AGSL fill; intensity → alpha'`.

All gates re-green after fixes (tsc / lint / 61 tests).

Next: merge on integration/0.1.x.
