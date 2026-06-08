# U2-002 — UniformSpec schema reconciliation

Unit 2 · type: `rework` · state: `in-progress` · device: no
Consumes: SPINE-003 · Closes: SPINE-003 · Blocked by: —

> **Next action (resume here):** widen the canonical `UniformSpec.type` schema in `02` and
> the TypeScript manifest types so `boolean` and `color[]` are first-class manifest values.

`data-layer.md` provisioned two UniformSpec variants that the source manifest schema does not
yet allow: `boolean` for semantic toggles and `color[]` for color-stop lists. The manifest is
the vocabulary authority, so this task resolves the mismatch in `02`, then updates the
manually maintained TypeScript types to match. Do not introduce generated types in this task.

## Start here

A fresh session: read in order, then reconcile.

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: UniformSpec schema reconciliation (blueprint Unit 2)
- Contract anchors:  02 (canonical Capability IR schema), data-layer.md §1
                     (provisioned manifest data), 50 (surface vocabulary that consumes
                     per-effect config).
- Decision:          rework the source schema by widening 02 to include `boolean`
                     and `color[]`; then manually update the TypeScript manifest types
                     to match. REJECT generated types for this task because blueprint
                     Unit 2 says TypeScript types are manually maintained alongside
                     the manifest.
- Reference (HOW):   pure TypeScript type/doc reconciliation; no direct runtime precedent.
                     REJECT renderer, shader, native, or public surface work.
- Guides:            Code Style Guide (TypeScript naming), Code Comments Guide
                     (avoid restatement comments), Testing Guide (Tier 1 headless),
                     Writing Style Guide (source docs), Contributing Guide.
- Rules gate:        #1 (no frame-loop work), #2 (one platform-agnostic vocabulary),
                     #5 (not a UI kit / no public component surface), #7 (no JSI/C++),
                     #9 (no layout writes).
- Device-verify:     none — pure schema/type/docs reconciliation.
- Done when:         02 and data-layer agree on UniformSpec.type; packages/src/manifest
                     types match 02; SPINE-003 is resolved in the ledger; headless
                     checks pass.
```

## Lifecycle

- [x] spec'd
- [ ] rules-gated
- [ ] source docs reconciled (`02` widened; `data-layer.md` no longer marks the values provisional)
- [ ] TypeScript manifest types updated by hand
- [ ] headless-done
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

`device-verified`: N/A — this task is pure TypeScript/schema documentation.

## Proof

- **headless:** from **packages/**, run `bunx tsc --noEmit`, `bun run build`,
  `bunx biome check .`, and `bun run test`. Also run `git diff --check` from the repo root.
- **device:** N/A.
- **docs:** `02` §The schema is widened; `data-layer.md` §1 drops the provisional mismatch note;
  `decision-ledger.md` marks SPINE-003 `resolved`; `progress.md` moves U2-002 forward.

## Work

1. **Widen the source schema.** Update `research/0-spine/02-capability-ir-and-lowering.md`
   so `UniformSpec.type` is:
   `number | boolean | color | color[] | vec2 | vec4 | enum`.
2. **Reconcile the provisioned data.** Update `research/7-implementation/data-layer.md`
   to remove the provisional note that says `boolean` and `color[]` extend `02`. Keep the
   existing `boolean` and `color[]` usages unless a source-doc conflict appears.
3. **Update TypeScript types manually.** Update `packages/src/manifest/types.ts` so
   `UniformSpec.type` matches `02`. Do not add codegen or generated artifacts.
4. **Keep selector behavior unchanged.** U2-001 already owns planned-rung selection,
   feature guards, interactive substrate gating, and driver target matching. This task only
   changes accepted schema values.
5. **Add or adjust tests only if needed.** If type-only changes are enough, existing tests
   may remain unchanged. Add a focused type/fixture test only if the reconciled schema is not
   exercised by the compiler.
6. **Close SPINE-003.** After docs and types agree, mark SPINE-003 `resolved` in
   `decision-ledger.md` and update `progress.md`.

## Scope guard

- Does NOT build a manifest generator.
- Does NOT change `select()` behavior.
- Does NOT build renderers, shader compilers, effects, motion, or native code.
- Does NOT close FX-006 or any BYO shader registration row.
- Does NOT export a new public app-developer API from the package root.

## Done when

- `02`, `data-layer.md`, and `packages/src/manifest/types.ts` agree on `UniformSpec.type`.
- SPINE-003 is `resolved` in `decision-ledger.md`.
- U2-002 is `ready-to-merge` in `progress.md`.
- Required headless checks pass.
