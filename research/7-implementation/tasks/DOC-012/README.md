# DOC-012 — no-rung degradation UX ratification

6-ship · type: `ratify` · state: `in-progress` · device: no
Consumes: — · Closes: SHIP-002 · Blocked by: —

> Closes SHIP-002: the runtime guard UX when no rung is satisfiable at all (the ladder
> bottoms out at `{via:'none'}`). This task decides the umbrella policy, writes it into
> the owning source doc (`53`), and closes the ledger row.

## Start here

1. **This file** — the work order, authority links, scope, and proof.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle and closure rules.
3. **`research/7-implementation/tasks/DOC-012/notes.md`** — current handoff.
4. **Per-gate guides:**
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - all gates → `agents/session-protocol.md`

## Authority links

```
Subtask: no-rung degradation UX (no blueprint unit — cross-cutting)
- Contract anchors:  53-config-plugin-and-install.md (the owning open question),
                      02-capability-ir-and-lowering.md (the {via:'none'} contract),
                      50-api-and-presets.md (the adapter surface)
- Decision:          ratify the V1 no-rung degradation policy: silent omission in
                      production; __DEV__ console warning. Motion no-rung maps to instant
                      placement (content visible, no animation). No static fallback
                      unless the ladder itself defines one.
- Reference (HOW):   none — pure design decision.
- Guides:            Writing Style Guide (the doc edits), Contributing Guide
                      (merge bar), subtask protocol
- Rules gate:        #5 (degradation never breaks or hides wrapped content),
                      #2 (platform-native defaults, shape-native law),
                      #1 (native owns the frame loop)
- Device-verify:     none — ratification task.
- Done when:         53 records the no-rung policy as a decision; 53 open question struck;
                      SHIP-002 resolved in ledger; progress.md updated.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [ ] implemented — N/A (ratify: decision in source docs)
- [ ] commented — N/A
- [ ] headless-done — N/A (docs-only; no code)
- [ ] device-verified — N/A (policy, not implementation)
- [x] docs-closed — `53` Decision 7; SHIP-002 → resolved
- [ ] reviewed
- [ ] merged

## Proof

- headless: N/A — no code; docs-only.
- device: N/A — policy ratification.
- docs: `53` §Decisions (Decision 7), `53` §Open questions (runtime guard UX resolved);
  `decision-ledger.md` SHIP-002 → resolved.

## Scope

### In scope (this task)

- Decide the V1 no-rung degradation policy: silent omission in production, `__DEV__`
  console warning.
- Record the decision in the owning source doc `53`.
- Close SHIP-002 in the decision ledger.

### Out of scope

- Implementing the `__DEV__` warning in the adapter (future implement task).
- Reopening the degradation decisions already ratified (glass → material/blur,
  reduce-motion → instant placement, symbol on Android → {via:'none'},
  BYO missing platform file → {via:'none'}). This policy is the umbrella over them.

## Done when

- `53-config-plugin-and-install.md` records the no-rung policy as Decision 7.
- `53` §Open questions strikes the runtime guard UX question as resolved.
- SHIP-002 is true in its source doc and flipped to `resolved` in the ledger.
- `progress.md` DOC-012 moves to `ready-to-merge`.
