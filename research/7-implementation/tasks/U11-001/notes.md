# U11-001 session notes

## Unverified claims (pending device gate)

- `fx.effect.glow()` renders identically to `<Fx effect="edge-glow" />` on iOS sim and POCO F1.
- `fx.effect.glass()` renders identically to `<Fx effect="glass" />` on both platforms.
- `fx.effect.mesh()` renders identically to `<Fx effect="mesh-gradient" />` on both platforms.
- A two-target chain (`fx.effect.glow().glass()`) renders only the first step (glow) — the second call is a no-op; the dev warning appears in Metro.

---

## Changes (2026-06-19)

- **Created `src/effects/stack.ts`** — `Transition`, `SpringSpec`, `EffectStep`, `EffectStack` types; `EffectBuilder` type (closure-based, no class — avoids Babel runtime dependency not present in the Jest setup); `glow`/`glass`/`mesh` factory functions; `addRenderTarget` guard (dev warn + reference-identity no-op on second render-target call).
- **Modified `src/fx.ts`** — added `effect: { glow, glass, mesh }` to the `fx` namespace; updated docblock.
- **Modified `src/surface/Fx.tsx`** — widened `FxProps.effect` to `EffectId | EffectStack`; added stack-branch logic to extract `effectId`/`effectIntensity`/`effectConfig` before hooks (Rules of Hooks compliance — early-return moved after hooks); `useEffect` dep updated to `effectId`.
- **Modified `src/index.ts`** — added `EffectBuilder`/`EffectStack`/`EffectStep`/`EffectStepId`/`SpringSpec`/`Transition` type exports.
- **Created `src/__tests__/effect-builder.test.ts`** — 22 tests covering factory functions, value semantics, single-render-target guard, animate/defaults, and resolution conformance.

## Gates run

- `bun run tsc --noEmit` — clean.
- `bun run build` — clean.
- `bun run lint` — clean (Biome auto-fix applied to import order + formatting).
- `bun run jest` — 136 tests pass, 22 new.
- `cd example && npx tsc --noEmit` — clean.

## Design notes

- Used closure-based `EffectBuilder` (not a class) — the project has no class syntax in `packages/src/`, and the Jest/Babel setup lacks `@babel/runtime` helpers for class transpilation.
- The guard returns the SAME builder reference on a second render-target call (reference identity `result === original`), tested directly.
- `effectId` is derived before hooks with a `'edge-glow'` placeholder for the unreachable empty-stack case; both null conditions (`isStack && !step` and `rung.via === 'none'`) are combined into one post-hook early-return.

Next: maintainer runs the device gate (builder-form harness section in `example/screens/effect-surface.tsx`), reviews, and closes docs.
