# U2-002 — UniformSpec schema reconciliation

Type: rework
State: todo
Unit: 2

Consumes: SPINE-003
Closes: SPINE-003
Blocked by: —

## Goal

Reconcile `data-layer.md`'s `UniformSpec.type` (`boolean`, `color[]` extensions) with `02`'s canonical schema (`number | color | vec2 | vec4 | enum`). Either widen `02` or narrow `data-layer.md`.

## Checklist

- [ ] spec'd
- [ ] rules-gated
- [ ] `02` UniformSpec widened to match `data-layer` (`boolean`, `color[]`) — or `data-layer` narrowed
- [ ] TS types regenerate from `02`
- [ ] ledger SPINE-003 closed (true in `02`)

## Proof

- headless: `tsc` — the manifest types compile against the reconciled UniformSpec
- device: N/A
- docs: `02` §The schema, decision-ledger SPINE-003
