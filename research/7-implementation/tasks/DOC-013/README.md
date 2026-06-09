# DOC-013 — curated shader authoring pipeline ratification

2-effects · type: `ratify` · state: `ready-to-merge` · device: no
Consumes: — · Closes: REAL-004 · Blocked by: —

> **Next action (resume here):** review DOC-013, then continue U3-006 with hand-maintained
> MSL+AGSL shader pairs.

DOC-013 closes the curated shader single-source decision. V1 hand-maintains each curated
shader as an MSL+AGSL pair. The compiler remains an additive V2 build-time emitter, triggered
by BYO/novel composition demand rather than required for the V1 catalog.

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: curated shader authoring pipeline ratification
- Contract anchors:  52 (shader asset packaging and publishing), 03 (adapter vs compiler),
                     22 (shader semantics and MSL↔AGSL split).
- Decision:          V1 curated shaders are hand-maintained MSL+AGSL pairs. The
                     author-once compiler is deferred to V2 as build-time codegen.
- Reference (HOW):   packages/ios/Shaders/FxShaders.metal for the implemented iOS half.
                     REJECT adding a compiler, transpiler, generated shader source, or
                     package split in this task.
- Guides:            Writing Style Guide, Contributing Guide, subtask protocol.
- Rules gate:        #1 (native owns frames), #2 (one agnostic vocabulary), #5
                     (curated catalog front door), #7 (no runtime JSI/C++ compiler path),
                     #9 (no layout writes).
- Device-verify:     none for ratification. U3-006/U3-005 own later shader render and
                     asset-loading proof.
- Done when:         52 and 03 agree on V1 hand-maintained shader pairs; REAL-004 is
                     resolved; U3-006 knows to implement MSL+AGSL pairs directly.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] source docs reconciled (`52`, with `03` already aligned)
- [x] ledger REAL-004 closed
- [x] docs-closed
- [x] reviewed
- [x] merged

`device-verified`: N/A — this task is pure source-doc ratification.

## Proof

- **headless:** `git diff --check`.
- **device:** N/A.
- **docs:** `52` removes the single-source open question and records V1 hand-maintained
  MSL+AGSL pairs; `decision-ledger.md` marks REAL-004 resolved; `progress.md` moves
  DOC-013 to `ready-to-merge` and clarifies U3-006 uses hand-maintained pairs.

## Work

1. Ratify V1 curated shader authoring in `52`: maintain `.metal` and `.agsl` per shader.
2. Keep `03`'s compiler ruling unchanged: build-time codegen is additive V2.
3. Close REAL-004 in the decision ledger.
4. Update U3-006 tracking so implementation does not wait for compiler decisions.

## Scope guard

- Does NOT implement shader code.
- Does NOT add a compiler, transpiler, codegen command, or generated artifacts.
- Does NOT close SPINE-008; the compiler IR/build trigger remains deferred.
- Does NOT close REAL-002 or REAL-003 asset-loading proof.

## Done when

- REAL-004 is `resolved` in `decision-ledger.md`.
- DOC-013 is `ready-to-merge` in `progress.md`.
- U3-006 can proceed by hand-maintaining the MSL+AGSL pair for each remaining shader id.
