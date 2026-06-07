# task-execution — how to execute a task by type

The authority chain (rules > contract > blueprint > reference) and the cross-check protocol (gate → bind → honor → get mechanic → consult reference → check verification) are defined in [`research/7-implementation/subtask-protocol.md`](../research/7-implementation/subtask-protocol.md). This file adds agent-specific workflow per task type.

---

## `implement` — build a unit or subtask

### Checklist
- [ ] spec'd — the task goal and proof are written
- [ ] rules-gated — no CLAUDE.md rule violated
- [ ] implemented — native code or TS code written, tests pass
- [ ] commented — code comments match the [Code Comments Guide](../guides/Code%20Comments%20Guide.md)
- [ ] headless-done — lint passes, tests pass, `tsc` is green
- [ ] device-verified — human gate; agent marks `device-pending`
- [ ] reviewed — PR opened, reviewed, approved
- [ ] docs-closed — every `Closes:` ledger row is true in its source doc
- [ ] complete

### Agent workflow
1. Open the task's contract docs (the `Contract:` line from the blueprint unit).
2. Open the reference files named in the blueprint `Precedent` cell — only the `file:line` cited.
3. Write the implementation. Native files follow the [Code Style Guide](../guides/Code%20Style%20Guide.md); TS files follow Biome.
4. Write tests per the [Testing Guide](../guides/Testing%20Guide.md).
5. Run `bun run lint` and `bun run test`. Mark `headless-done` when green.
6. If `device: yes`, mark `device-pending` and prepare the handoff per [`device-handoff.md`](./device-handoff.md).
7. If `device: no`, proceed to `docs-closed` — update the source docs listed in the task's `Proof` section.

---

## `ratify` — decide an open design call in a source doc

### Checklist
- [ ] spec'd — the decision and close condition are clear
- [ ] rules-gated — no CLAUDE.md rule violated
- [ ] source doc updated — the decision is written in the owning research doc
- [ ] ledger closed — the `Closes:` row is flipped to `resolved`
- [ ] complete

### Agent workflow
1. Read the owning research doc (the source of truth).
2. Read any provisioned candidates in `data-layer.md` or `architecture.md` that inform the decision.
3. Write the decision into the source doc's "Decisions" section.
4. Update the ledger: flip the `Closes:` row to `resolved`.
5. Update `progress.md`: mark the task `complete`.

---

## `device-verify` — prove a provisioned value on a device

### Checklist
- [ ] spec'd — the device scenario is written
- [ ] implemented — the thing to verify is built
- [ ] device-verified — evidence captured and reviewed
- [ ] source docs updated — values propagated back from device proof
- [ ] complete

### Agent workflow (pre-device)
1. Prepare the device handoff per [`device-handoff.md`](./device-handoff.md).
2. Write the device scenario into `tasks/<id>/evidence/headless.md`.
3. Mark the task `device-pending` in `progress.md`.

### Human workflow (on device)
1. Read the device handoff. Follow the exact steps.
2. Capture evidence: logs, screenshots, video as specified.
3. Place evidence in `tasks/<id>/evidence/device.md`, `evidence/logs/`, `evidence/screenshots/`.
4. Mark the checklist box `device-verified`. If values need propagating to source docs, mark `docs-pending`.

---

## `rework` — fix an internal inconsistency

### Checklist
- [ ] spec'd — the inconsistency is documented (which docs disagree, on what)
- [ ] source docs reconciled — the authoritative doc wins; all consumers updated
- [ ] `architecture.md` / `data-layer.md` updated — consumers, not sources
- [ ] ledger closed — the `Closes:` row is flipped to `resolved`
- [ ] complete

### Agent workflow
1. Cross-reference the conflicting docs. Confirm the authoritative doc per the authority chain.
2. Update the non-authoritative docs to match.
3. Update `progress.md`: mark the task `complete`.
4. If the rework changed `architecture.md` or `data-layer.md`, verify the traceability index still points to the updated section.

---

## `doc-cleanup` — fix stale wording or source alignment

### Checklist
- [ ] spec'd — the doc and the stale wording are identified
- [ ] doc updated — the wording is fixed
- [ ] ledger closed — the `Closes:` row is flipped to `resolved`
- [ ] complete

### Agent workflow
1. Open the named doc. Find the stale or contradictory section.
2. Edit to match the current design. One file, one change.
3. Update `progress.md`: mark the task `complete`.

---

## State transitions

```
todo → in-progress → [headless-done | docs-pending]
                         │
                         ├── headless-done → device-pending → docs-pending → ready-to-merge → merged
                         │
                         └── docs-pending → ready-to-merge → merged
```

- `in-progress`: agent is actively working
- `headless-done`: lint + tests green; device not yet verified
- `device-pending`: waiting for human device verification
- `docs-pending`: waiting for source doc updates / ledger closure
- `ready-to-merge`: complete — all gates passed
- `merged`: git integration happened

A task with `device: no` skips `headless-done`/`device-pending`. It goes straight from `in-progress` to `docs-pending` to `ready-to-merge`.
