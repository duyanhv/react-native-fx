# U2-001 — planned-rung selection

Unit 2 · type: `implement` · state: `ready-to-merge` · device: no
Consumes: SPINE-013 · Closes: SPINE-013

> Implements the typed manifest `select()` adapter so planned rungs stay documented
> in the manifest but are skipped by executable selection by default.

## Authority links

```
Subtask: planned-rung selection (blueprint Unit 2)
- Contract anchors:  02-capability-ir-and-lowering.md (the selection rule, the schema,
                      planned/out-of-scope statuses)
- Decision:          fx-original — select() as a pure function, skips planned +
                      out-of-scope, OS gating, wantInteractive substrate enforcement,
                      driver target matching
- Reference (HOW):   N/A — the selection algorithm is fully specified in 02
- Guides:            Code Style Guide (TypeScript naming), Code Comments Guide
                      (docblock the iceberg), Testing Guide (Tier 1 headless)
- Rules gate:        #1 (native owns frame loop — select() is a pure selector, not
                      per-frame), #7 (Expo Modules + Fabric — no native code here)
- Device-verify:     none — pure headless logic
- Done when:         select() implemented, 02 updated, SPINE-013 resolved, tests green
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [ ] reviewed
- [x] docs-closed
- [ ] merged

## Proof

- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run test` pass.
  17 Jest tests in `manifest-select.test.ts`.
- device: N/A
- docs: `02` selection rule updated with `planned` skip; decision-ledger SPINE-013 resolved
