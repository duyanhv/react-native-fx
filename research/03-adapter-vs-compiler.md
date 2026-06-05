# Adapter vs compiler (ADR)
Status: researched
Phase: v1 (adapter) · v2 (compiler)
Feeds: 02-capability-ir-and-lowering.md, 50-api-and-presets.md, the build

## Why this matters

The capability manifest (`02`) is the source of truth for how each effect lowers per
platform. *Something* has to consume it to produce native output. There are two
strategies — a thin **adapter** and a full **compiler** — and the instinct is to
treat them as a fork. They are not: **both are consumers of the same manifest**, so
the choice is deferrable. This ADR records that, and the deferred-hybrid ruling.

## The two strategies

### Adapter — bind to native primitives

Each capability dispatches to a hand-written native binding per platform. The
consumer is the trivial reader of `02`: `select(node, platform, ctx)` picks a rung,
and the binding for that rung's `primitive`/`applyVia` mounts the native view/prop.

- **Cheap for `via:'native'` (green) rungs** — gradients, materials, blur. Almost no
  logic; just dispatch.
- **Brutal for `via:'shader'` (blue) rungs** — every shader effect means authoring
  `.metal` *and* `.agsl` by hand, per effect. Does not scale to BYO or novel looks
  (those would need native code on both sides).

### Compiler — lower the IR

Define the effect as an IR graph and **lower** it to native: emit a SwiftUI/Compose
tree + `.metal`/`.agsl` from the manifest's `lower`/`asset`/`applyVia`. The consumer
is the sophisticated reader.

- **Transformative for blue rungs** — author an effect *once* in the IR and emit both
  shader languages. BYO and novel composition stop meaning "write it twice."
- **Best done as build-time codegen** — a TS tool that reads the manifest/IR and
  emits shaders + bindings at build time. That keeps it consistent with the
  Expo-Modules / no-runtime-C++ decision (no JSI/HybridObject; `07`/the boundary
  rules). A runtime cross-platform core is only warranted if live IR evaluation
  becomes a real need.

## The ruling: deferred hybrid, one source of truth

**Both strategies read the same manifest, so the source of truth never changes —
which means the choice does not have to be made now.**

1. **V1 ships the adapter consumer.** Trivial dispatch over `02`; green rungs are
   complete from the manifest, blue rungs use the small curated set of hand-authored
   `.metal`/`.agsl`.
2. **The compiler is an *additive* V2 consumer.** When BYO/novel composition demand
   it, add the build-time emitter against the same manifest. No rewrite, no change to
   the source of truth.
3. **The manifest stays dispatch + contract**, pointing at three hand-written
   engines: native bindings (adapter), the IR→MSL/AGSL emitter (compiler), and the
   runtime (G).

So fx does not bet V1 on a compiler, yet keeps the compiler path fully open — the
manifest is the stable spine; consumer sophistication grows around it.

## Trade-offs

| | Adapter (V1) | Compiler (V2) |
|---|---|---|
| Consumer complexity | trivial dispatch | IR lowering + shader emitter |
| Green rungs (native) | complete from manifest | same (passes through) |
| Blue rungs (shader) | hand-author MSL+AGSL per effect | emit both from one IR |
| BYO / novel looks | needs native code both sides | author once, emit both |
| When | now | when BYO/novel demand it |
| Runtime cost | none | none (build-time codegen) |

## Decisions

1. **Adapter and compiler are both manifest consumers**, not a fork. The source of
   truth (`02`) is invariant under the choice.
2. **V1 = adapter.** Ship dispatch over the manifest with a small curated shader set.
3. **Compiler is additive V2**, built as **build-time codegen** (no runtime C++/JSI),
   added when BYO/novel composition makes hand-authoring two shader languages the
   bottleneck.
4. **The manifest is the dispatch + contract layer, not a generator** — it points at
   the bindings, the emitter, and the runtime.

## Open questions

- **The compiler's IR surface** — is the build-time IR the same `uniforms`/node model
  as `02`, or a richer graph (layers, blends) for novel composition? Pin when the
  compiler starts.
- **Trigger to build the compiler** — a concrete signal (catalog size, BYO demand,
  number of effects needing both shader languages) rather than "eventually."
- **Emitter targets** — does codegen emit raw `.metal`/`.agsl` only, or also the
  native binding stubs? Affects how much of the adapter it replaces.

## Sources

- `02-capability-ir-and-lowering.md` — the manifest both strategies consume; the
  `via`/`lower`/`asset` fields the emitter reads.
- `00-thesis-and-personas.md` — why BYO/novel matters (the author persona).
- The boundary rules (Expo Modules, no JSI/C++) — why the compiler is build-time codegen.
