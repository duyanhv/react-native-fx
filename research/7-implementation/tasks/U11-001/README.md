# U11-001 — `fx.effect.*` builder + `EffectStack` (single render-target, V1)

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes SURF-008/DEF-004, already resolved) · Unblocks: — · Blocked by: — (U10-001 merged)

Origin: blueprint Phase S **Unit 11**; `55-composition-chain.md` (the builder design + Decisions 1/7/8). The direct continuation of U10's string-form front door. Design pre-aligned with the maintainer (2026-06-19): **Option A — ship the builder vocabulary + value semantics over a single render-target; do NOT pretend the native multi-layer compositor exists.**

## The goal

Add the third builder namespace `fx.effect.*` (joining the shipped `fx.motion`/`fx.source`), producing an immutable `EffectStack`, consumed by `<Fx effect={stack}>` — which reuses U10's proven resolve→`select()`→mount path for the stack's **one** backed render-target. The builder is the escape hatch; the string form `<Fx effect="id">` stays canonical (`55` Decision 7).

**Naming discipline (maintainer):** in docs and comments, call this **"the builder form for one effect with timing/defaults"** — NOT "composition." `EffectStack` is the *data shape* that can later hold multiple steps; V1 renders one. Multi-layer compositing is a separate future unit (a real native composite renderer + its own device matrix).

## The design (pre-aligned — Option A + guard (b))

### 1. The builder + types — `src/effects/stack.ts` (new)

```ts
type Transition = { duration?: number; delay?: number; easing?: string; spring?: SpringSpec };

interface EffectStep {
  // carry the public effect id so <Fx effect={stack}> reuses U10's resolveEffect()->select()->mount
  // unchanged; `node` is derivable from it. (55's EffectStep names `node`; the id is the V1 add.)
  id: 'edge-glow' | 'glass' | 'mesh-gradient';   // the V1 backed render-targets
  config?: MaterialConfig;                         // glass; mesh/glow carry intensity only
  intensity?: number;
  transition?: Transition;                         // per-step timing (from .animate())
}

interface EffectStack {
  steps: EffectStep[];          // V1 holds exactly ONE render-target step
  transition?: Transition;      // stack default (from .defaults())
}
```

Value semantics — each method returns a **new immutable** builder/stack (`55` Decision 1; SURF-010: an inline rebuild does no native work because the native side compares values via `previousProps`). The V1 builder methods:

- `fx.effect.glow(config?)` → one **shader** step, id `edge-glow`.
- `fx.effect.glass(config?)` → one **material** step, id `glass` (`variant`/`interactive`).
- `fx.effect.mesh(config?)` → one **fill** step, id `mesh-gradient`, **intensity only** (no colors/angle/kind — U3-009).
- `.animate(transition)` → sets the preceding step's `transition`.
- `.defaults(transition)` → sets the stack-level default `transition`.

### 2. The single-render-target guard (b) — fail loud in dev, honest in prod

Calling a **second render-target** method (`.glow`/`.glass`/`.mesh`) on a builder that already holds one is a **dev warning + no-op**: `console.warn` (dev only) that multi-layer composition is not yet supported, and **return the unchanged builder** (the original single step is preserved). Production: silent no-op, never drops to a wrong/partial render. `.animate`/`.defaults` are always allowed (they add timing, not a layer). This keeps chaining ergonomic while the rendered stack stays honest.

### 3. `<Fx effect={stack}>` — reuse U10's path

Widen `FxProps.effect` to `EffectId | EffectStack`. In `Fx.tsx`:
- `typeof effect === 'string'` → the existing U10 path (`resolveEffect(id)` → `select` → mount).
- otherwise (an `EffectStack`) → take `stack.steps[0]`, run the **same** `resolveEffect(step.id)` → `select` → mount with the step's `config`/`intensity`. One step, one substrate view, one bridge crossing (`55` Decision 1).

### 4. `.animate()` / `.defaults()` timing — recorded, not wired in V1

There is **no effect-transition channel** on the substrate views (the only `transition` is the presence `onFxTransitionEnd` event; no eased-effect-uniform prop exists). So `.animate`/`.defaults` **record** the `Transition` in the `EffectStack` for API stability and the future eased-uniform/multi-layer renderer, but V1 **does not apply it to native rendering**. Document this honestly (the same posture as `FxPresence`'s `transition`, which V1 accepts but honors the platform default). Effective-transition resolution (`step ?? stack ?? platform`, `55` §`.animate`) is computed in JS and carried, ready for when a channel lands.

### 5. Namespace wiring

`src/fx.ts`: add `effect: { glow, glass, mesh }` to the exported `fx` object (the comment there already anticipates it). Export `EffectStack` / `EffectStep` types from `src/index.ts`. No bare `effect` export (`55` Decision 7).

## Scope guard — explicitly NOT this task

- **No multi-layer compositing** — the builder holds one render-target in V1; the native single-surface composite renderer + multi-step rendering is a **separate future unit** (with its own device matrix). The guard (b) enforces this.
- **No `.blur()` / `filter`** — omit `.blur` **entirely** (not stubbed); `filter` stays `status:'planned'`/unselectable (U3-009).
- **No symbol builder step** — deferred with U10-002 / the symbol-config decision.
- **No fill config beyond `intensity`** (U3-009).
- **No native effect-transition wiring** — `.animate`/`.defaults` are recorded, not applied (no channel).
- **Do not call it "composition"** in V1 docs.

## Proof

```
Proof:
- headless: packages tsc + build + lint green; NEW stack-builder tests — value semantics (each call
            returns a new object; no mutation); glow/glass/mesh each produce a one-step stack with
            the right id (resolved node shader/material/fill, conformance-checked against the
            manifest like the U10 resolver); the SECOND-render-target guard (dev warn + no-op,
            original step preserved); .animate sets the step transition, .defaults the stack
            default; <Fx effect={stack}> mounts the same substrate as the equivalent string form.
            example tsc green.
- device:   YES — example harness: <Fx effect={fx.effect.glow()} />, {fx.effect.glass()},
            {fx.effect.mesh()} each render identically to their string-form equivalents
            (edge-glow / glass / mesh-gradient) on iOS sim + POCO F1; a two-render-target chain
            renders the first step only (+ dev warning in Metro). Reuses the U10 effect-surface
            harness screen (add a builder-form section).
- docs:     55 status (builder shipped, single render-target — NOT "composition"); 50 if it
            references the builder; src/index.ts exports; src/fx.ts namespace.
```

## Authority links

```
Subtask: fx.effect.* builder + EffectStack, single render-target (blueprint Phase S, Unit 11)
- Contract anchors:  55 (the builder + EffectStack/EffectStep + Decisions 1/7/8 + .animate rule),
                     50 (the prop language; builder is the layer-3 escape hatch), 02 (select()/nodes
                     the step resolves through), 41 (the parallel fx.motion/MotionSpec — symmetry).
- Decision:          fx-original — Option A: builder vocabulary + value semantics over a SINGLE
                     render-target; multi-layer native compositing deferred to its own unit.
                     REJECT a Fx.Stack/Fx.Layer JSX compound (55 D8), a bare `effect` export
                     (55 D7), `.blur`/filter (U3-009 planned), and any implied native layering.
- Reference (HOW):   the shipped fx.motion/fx.source builders (src/motion/builders.ts, src/fx.ts —
                     the one-to-one builder->type, value-semantics shape) and U10's
                     resolveEffect->select->mount (src/surface/Fx.tsx). REJECT re-deriving either.
- Guides:            Code Style + Code Comments (the builder + Fx widening); Testing (the builder
                     units + the guard); Device Verification (the builder-form matrix); Writing
                     Style (55/50 status — "builder form for one effect", not "composition");
                     Contributing (merge bar).
- Rules gate:        #1 (native owns frames; the stack crosses once as a resolved record),
                     #2 (the law — only native-backed steps; no `.blur`/filter, no fill config
                     beyond intensity), #4 (self-contained effects, no content hosting),
                     #5 (string form canonical; builder is the escape hatch), #7 (Expo Modules only).
- Device-verify:     glow/glass/mesh builder forms render == their string forms on both platforms;
                     the second-render-target chain renders the first step only.
- Done when:         fx.effect.{glow,glass,mesh} produce immutable one-step EffectStacks;
                     <Fx effect={stack}> renders the single backed render-target via U10's path;
                     the second-render-target guard warns+no-ops; .animate/.defaults record timing;
                     no .blur/symbol/multi-layer; builder + types exported; device-verified.
```

## Lifecycle

```
[ ] spec'd        this file
[ ] rules-gated   #1/#2/#4/#5/#7 — single native-backed render-target; no implied layering
[ ] implemented   src/effects/stack.ts (types + immutable builder + guard) + src/fx.ts (effect ns)
                  + src/surface/Fx.tsx (effect prop widened to EffectId | EffectStack) + exports
[ ] commented     iceberg only — no internal ids; "builder form for one effect", not "composition"
[ ] headless-done tsc/build/lint + the builder/guard/resolution tests + example tsc green
[ ] device-verified  builder forms == string forms on iOS sim + POCO F1; 2-target chain → first step
[ ] reviewed
[ ] docs-closed   55 builder status (single render-target, not "composition"); exports; fx namespace
[ ] merged
```

## Start here

1. **This file** — Option A, the single-render-target guard, the recorded-not-wired transition, the scope guard.
2. **`55-composition-chain.md`** — the builder + `EffectStack`/`EffectStep` + Decisions 1/7/8 + the `.animate` binding rule. Note the **V1/Unit-11 scope** block (only shader/material/intensity-fill backed; no filter/symbol/fill-config).
3. **The U10 path to reuse** — `src/surface/Fx.tsx` (`resolveEffect`→`select`→mount), `src/effects/effects.ts` (the resolver), the `FxProps.effect` shape.
4. **The shipped builder idiom** — `src/motion/builders.ts` + `src/fx.ts` (one-to-one builder→type, value semantics) and `src/source/builders.ts`.
5. **`agents/session-protocol.md`** + **`subtask-protocol.md`** — lifecycle, gates, closure.
6. **Guides per gate:** `implemented`→Code Style; `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style; `reviewed`/`merged`→Contributing.
```
