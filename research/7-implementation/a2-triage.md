# A2 triage — the audit's "untracked deliverables", ratified

> Ratifies the audit-2026-06-18 §A2 cluster (DOC-025). **A2 is not one backlog; it is three
> outcomes: build now where the public surface is already real, defer where a trigger is
> missing, and narrow source docs where research — or the shipped manifest — over-promised the
> V1/V2 shape.** Maintainer-ratified 2026-06-18.
>
> This is a **ratify record, not a build spec.** Each row names the outcome and where the work
> is (or should be) tracked; the execution rides the spawned rows in the final section.

The codebase findings behind the conditional calls (verified against `packages/`):

- The shipped surface resolves `preset` **natively** — `src/surface/FxPresence.tsx` passes `preset` raw to the native coordinator (the platform catalog lives native, per the law). No JS preset resolver has a consumer today.
- `src/manifest/config.ts` already **derives** `FillConfig` / `FilterConfig` / `MaterialEffectConfig` from the manifest (`ConfigFor<NodeId>`, U2-003) — the *types* exist; the gap is the native render side.
- `material` manifest node declares only `variant` + `interactive` — honest, matches native glass.
- `fill` manifest node declares `colors`/`angle`/`kind`/`width`/`height`/`drift`, but the native fill renderers on **both platforms** (`ios/FxFillView.swift`; the Android plain-`View` + `LinearGradient` rung) render a **fixed** gradient (intensity-only) and ignore them.
- `filter` manifest node declares `blur`/`saturation`/`contrast`/`brightness`/`hueRotate`/`opacity` with a `phase:'v1'` native lowering, but **no native filter renderer exists** (no `FxFilterView`; the modifiers are unimplemented).

---

## Outcome 1 — Build now (the public surface is already real)

| Deliverable | Why build | Scope guard | Track as |
|---|---|---|---|
| typed **material** config | product-facing DX; honors "JS configures semantics, native owns pixels"; native glass already backs it | extend `MaterialConfig` + the `material` manifest node + the `ConfigFor` lockstep with `tint`/`colorScheme`/`weight` **only as iOS `UIGlassEffect` / Android material actually back each** — never add a uniform native ignores (the `fill`/`filter` trap below) | NEW Phase-S unit (proposed **Unit 15**) |

---

## Outcome 2 — Defer (a trigger is missing; no current consumer)

| Deliverable | Why defer | Where it lives |
|---|---|---|
| `clock` driver node | named-next in `02 §Decision 14`; no consumer yet | `02 §Decision 14` → add a deferred ledger row (currently untracked) |
| SDF shaped hit-test pass | U8 shipped the full-bounds fallback; needs the first shaped shader to matter | DEF-019 (already homed) |
| app-state / off-window pause coordinator + the `cadence` consumer | `cadence` schema field shipped (U2-003); the loop-pause policy that reads it has no consumer object yet | NEW deferred row (proposed) — or fold into the runtime when first needed |
| `getUniform()` pull channel | `51` names it; no feature needs a uniform **read** yet (DEF-020 shipped writes only) | deferred until a pull consumer exists |
| `src/presets/` JS resolver | the shipped surface resolves `preset` **natively** (`FxPresence` passes it raw); no JS resolver has a consumer | Phase-S — only if `<Fx effect>` (Unit 10/11) needs JS default-merge; not before |
| `palettes.ts` / `themes.ts` | risks turning fx into a theme / design-token / UI-kit layer; expose platform-native presentation presets, not tokens, until a real consumer forces it | narrow `50 §Presets/palettes/themes` to "deferred — no V1 consumer"; drop the `presets/{palettes,themes}.ts` target-tree entries until then |

---

## Outcome 3 — Narrow (research / manifest over-promised the shape)

| Over-promise | Reality | Narrow to |
|---|---|---|
| `filter` typed config + the `filter` manifest node (`phase:'v1'`, native lowering declared) | **no native filter renderer exists** — `saturation`/`contrast`/… unimplemented; only `blur` lives, via material's `RenderEffect` | mark the `filter` manifest lowering `status:'planned'` (so `select()` never offers it) + narrow `23-filters` to "planned typed config"; the derived `FilterConfig` type stays but is unselectable. **Pre-Unit-10 blocker** — `<Fx effect>` must not offer `filter` until it renders. |
| `fill` typed config (`colors`/`angle`/`kind`/`width`/`height`/`drift`) | the native fill renderers on **both platforms** render a **fixed** gradient (intensity-only); the declared params are ignored | **Narrow now (maintainer-ratified 2026-06-18).** Trim the `fill` manifest node + `20-fills` to the rendered subset (intensity-driven `gradient`/`mesh` presets — no per-call `colors`/`angle`/`kind`). **Pre-Unit-10 blocker** — `<Fx effect>` must not expose a selectable effect whose typed config lies. Phase-S wire-through (`colors`/`angle`/`kind` → the native `MeshGradient`/`LinearGradient` primitives) is spawned for later, once examples + device proof exist. |
| `fx.effect.*` `fill` / `symbol` (terminal) stack steps | the `fx.effect.*` builder is unbuilt (Unit 11); `fill` is partial, `symbol` is iOS-only | do **not** expose `fill` / `symbol` terminal steps in Unit 11; narrow `55 §EffectStep.node` to the backed steps until the render targets + examples exist |

---

## Record-as-built (shipped — needs a tracked note, not a build)

| Mechanic | Code | Note |
|---|---|---|
| `fx.motion.*` builders | `src/motion/builders.ts` | shipped under U7-001; record as-built (DOC-024 Phase-A style) |
| reduce-motion driver gating | `FxAnimationDriver.{swift,kt}` | shipped + device-proven (U6/U7); the Android `ValueAnimator.areAnimatorsEnabled()` manual gate is the platform divergence |
| idempotent teardown order | view/driver lifecycle (`31 §Idempotent teardown`) | shipped; record |

---

## Spawned work (for the maintainer to register as rows)

- **Phase-S build** — typed material config (proposed **Unit 15**), native-backed uniforms only.
- **Narrow, pre-Unit-10 (urgent)** — both the `filter` and `fill` manifest over-promises block an honest `<Fx effect>` (`select()` would offer a rung whose typed config the renderer ignores). Reconcile **both** before Unit 10: `filter` → mark the lowering `status:'planned'` + narrow `23-filters`; `fill` → trim the manifest node + `20-fills` to the rendered (intensity-driven) subset.
- **Narrow** — `palettes`/`themes` narrowing in `50`; `fx.effect.*` step-set narrowing in `55`.
- **Phase-S (later)** — typed material config (proposed **Unit 15**); and wire `fill` `colors`/`angle`/`kind` through the native `MeshGradient`/`LinearGradient` primitives, once examples + device proof exist.
- **Record-as-built** — a small Phase-A/§11-style addendum for `fx.motion.*`, reduce-motion gating, and teardown order.
- **Deferred rows** — `clock` driver, app-state/`cadence` pause coordinator, `getUniform` (the rest already have homes: SDF→DEF-019; resolver/palettes/themes narrowed above).
