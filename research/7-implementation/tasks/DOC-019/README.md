# DOC-019 — defer `tune` from the V1 surface

Type: `ratify` · State: `todo` · Device: no · Consumes: — · Closes: — (no ledger row)

Origin: critique F8 (MEDIUM, API). Four motion knobs (`preset`/`motion`/`tune`/`transition`);
`tune` is the weak member. Its `{speed, emphasis, distance}` semantics are invisible until
MOT-001's device tuning lands, and its job overlaps both neighbors (`preset` carries intent,
`transition` carries timing). The `preset`/`motion`/`transition` triad is load-bearing — the
law needs an explicit-override channel — but `tune` is a third adjustment axis with no code
yet. Cutting it from V1 costs nothing.

Triage already accepted the disposition ("accept — defer `tune` from the V1 surface" →
DOC-019), so the decision is made; this task records it in source and reconciles consumers.

Connection: `tune`'s vocabulary is the open ledger row **MOT-002** (`The tune dimension
vocabulary … and the minimal animatable-property set`), device-pending under MOT-001. Deferring
`tune` keeps MOT-002 open and ties `tune`'s resurrection to it — the exact parallel to DOC-018's
`sheet`/`modal` → MOT-001.

## Subtask

- Contract anchors:  `3-motion/41` (the four-prop split — the owning doc), `1-surface/50`
                     (the public surface), `42`/`54` (the FxPresence surface examples).
- Decision:          `ratify` — record "V1 ships `preset`/`motion`/`transition`; `tune` deferred
                     to MOT-001" in `41`; mark `tune` deferred at every V1-surface point; remove
                     it from V1 surface examples; keep the four-prop *design* (it resurrects).
- Reference (HOW):   the critique's mental-model comparison (Reanimated 4 = entering/exiting +
                     transitions; Framer = variants + transition) — none ship a third intent axis.
- Guides:            `Writing Style Guide.md`.
- Rules gate:        none breached — docs-only; narrows the surface, no rule touched.
- Device-verify:     none here — `tune`'s formulas are MOT-001/MOT-002 device work.
- Done when:         no V1-surface doc shows `tune` as a shipping prop; `41` records the
                     triad-ships / `tune`-deferred decision; `50`/`42`/`54`/`56` agree; the
                     materialized `tune` formulas (`data-layer §4`) + MOT-002 carry the deferral.

## Proof

- headless: N/A — docs-only.
- device:   N/A — `tune` formulas are device-pending under MOT-001/MOT-002, not closed here.
- docs:     `41`, `50`, `42`, `54`, `56`, `data-layer.md §4`, `architecture.md`,
            `decision-ledger.md` (MOT-002). No `Closes:` row; MOT-002 stays open (deferral noted).
