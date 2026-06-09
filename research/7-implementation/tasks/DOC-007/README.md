# DOC-007 — mesh ergonomics and shader catalog ratification

2-effects · type: `ratify` · state: `merged` · device: no
Consumes: — · Closes: FX-001, FX-004 · Blocked by: —

> **Next action (resume here):** start DOC-008 to unblock U3-001 symbol scope.

DOC-007 closes two effects decisions. `fill.mesh` uses the full `width × height` control
grid in V1, and `drift` belongs only to mesh. The V1 shader catalog includes both the five
implemented starter shaders and the five research-name shader ids; the latter are ratified
catalog entries but still need native implementations before package types/runtime expose
them.

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: mesh ergonomics and shader catalog ratification
- Contract anchors:  20 (fill semantics), 22 (shader semantics), 50 (public surface),
                     data-layer.md §1/§3/§6 (provisioned values).
- Decision:          ratify full-grid mesh controls, mesh-only `drift`, the 10-id V1
                     shader catalog, and shared minimal shader uniforms. REJECT N-stop
                     mesh sugar and per-shader public uniform maps for this task.
- Reference (HOW):   packages/ios/Shaders/FxShaders.metal for the five implemented
                     starter shaders; packages/src/effects/catalog.ts for current
                     package exposure. REJECT treating unimplemented shader ids as
                     runtime-ready.
- Guides:            Writing Style Guide, Contributing Guide, subtask protocol.
- Rules gate:        #1 (native owns frames), #2 (one agnostic vocabulary), #5
                     (front door is curated presets, not shader authoring), #7
                     (no JSI/C++ boundary), #9 (no layout writes).
- Device-verify:     none for this ratification. Shader rendering remains device work
                     for the implementation task that exposes the five additional ids.
- Done when:         FX-001 and FX-004 are resolved in source docs and the ledger; the
                     implementation gap for the five additional shader ids is tracked.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] source docs reconciled (`20`, `22`, `50`, and `data-layer.md`)
- [x] implementation gap tracked for the five additional shader ids
- [x] ledger FX-001 and FX-004 closed
- [x] docs-closed
- [x] reviewed
- [x] merged

`device-verified`: N/A — this task is pure source-doc ratification.

## Proof

- **headless:** `git diff --check`.
- **device:** N/A.
- **docs:** `20` pins full-grid mesh and mesh-only `drift`; `22`/`50` pin the 10-id
  shader catalog and shared minimal uniform scope; `data-layer.md` drops candidate wording;
  `decision-ledger.md` marks FX-001 and FX-004 `resolved`; `progress.md` moves DOC-007 to
  `ready-to-merge` and tracks the implementation follow-up.

## Work

1. Ratify mesh ergonomics in `20`: V1 exposes the full `width × height` color grid.
   N-stop/auto-placement sugar stays out of V1.
2. Ratify `drift` in `20`: only mesh uses `drift`; plain gradients stay static unless a
   future task adds a separate animated-gradient capability.
3. Ratify the V1 shader catalog in `22` and `50`: `fractal-clouds`, `ink-smoke`,
   `liquid-chrome`, `loop`, `dots`, `aurora`, `noise-field`, `plasma`, `caustics`, and
   `edge-glow`.
4. Make implementation status explicit: the first five ids are implemented starter shaders;
   the five research-name ids are catalog entries that need native MSL+AGSL implementations
   before package exposure.
5. Pin the V1 public shader uniform scope to shared semantic overrides. `time`,
   `resolution`, `pressDepth`, and `touch` remain native-owned/internal.
6. Close FX-001 and FX-004 in `decision-ledger.md` only after the owning docs are true.

## Scope guard

- Does NOT edit package TypeScript or native runtime files.
- Does NOT implement the five additional shader functions.
- Does NOT close FX-005 uniform alignment or FX-006 BYO registration.
- Does NOT add N-stop mesh sugar.

## Done when

- `20`, `22`, `50`, and `data-layer.md` agree on the mesh and shader decisions.
- FX-001 and FX-004 are `resolved` in `decision-ledger.md`.
- DOC-007 is `ready-to-merge` in `progress.md`.
- The five unimplemented shader ids have a tracked follow-up task.
