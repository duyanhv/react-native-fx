# DOC-019 — notes

## Decision
**`tune` deferred from the V1 surface; V1 ships the `preset`/`motion`/`transition` triad.**
`tune` resurrects with MOT-001's device-tuned catalog (its vocabulary is the open `MOT-002`).
Triage pre-accepted the disposition (F8 → DOC-019), so no maintainer question needed — this
task records + propagates it. The four-prop *design* is retained everywhere for resurrection;
only the V1 *surface* drops the prop.

## Changed

### Owner (`41` — the four-prop split)
- §The preset/motion/tune/transition split — `tune` table row marked *(deferred — V1.x /
  MOT-001)*; added the triad-ships note. New **Decision 13** (V1 triad / `tune` deferred + the
  overlap + no-comparison-library-ships-a-third-axis rationale). Decision 6 annotated. Open
  question (`tune` vocabulary) ties to `MOT-002` + the deferral.

### Public surface
- `50` — props table `tune` row marked deferred; V1 `FxPresence` example stripped of `tune`;
  decision 2 (the split) + the "applies only where motion/preset exists" bullet annotated.
- `42` — `tune={{…}}` removed from the V1 surface example; prop bullet marked deferred; the
  `tune` modulation paragraph prefixed as V1.x design retained for MOT-001.
- `54` — intro "refined by `tune`/`transition`" → `transition` only (+ deferral note); example
  stripped of `tune`; the `tune`/`transition` prop bullet + Decision 2 annotated.
- `56` — the split section: triad-ships note + `tune` moved to a deferred bullet; the
  escape-ladder ("Escape is downward — `tune` → …") rephrased to start at `motion`.
- `1-surface/README.md` — doc-map prop line marked.

### Materialized provisionals + ledger
- `data-layer.md §4` (tune Scaling Formulas) — header note: MOT-001/MOT-002 territory,
  deferred from V1, resurrects with the device-tuned catalog.
- `architecture.md` (JSX-flow `tune` comment) — deferral marker.
- `decision-ledger.md` MOT-002 — stays **open**; noted `tune` deferred from V1 (DOC-019), no
  longer a V1 blocker, resurrects with MOT-001.

## Deliberately left (design vocabulary, not V1-surface claims — resurrects with `tune`)
- The `tune.distance` measured-channel scaling comments (`41` MotionSpec `Travel`; `42` reads
  table) — internal design of how `tune` *will* modulate.
- `34`/`35`/`04`/`55:114`/`structure.*` and the `3-motion`/`4-runtime` section READMEs —
  `tune` as part of the design vocabulary / re-entrancy questions, not the public V1 surface.
- `data-layer` I2 (`SpringTune` removed; canonical `tune` concept) — a resolved concept point.

## Lifecycle
- spec'd → rules-gated (docs-only; narrows surface, no rule touched) → decision recorded in
  `41` + propagated + provisionals/ledger reconciled. State: `ready-to-merge`. `reviewed`/`merged`
  are the maintainer's.

## Proof
- headless: N/A — docs-only.
- device:   N/A — `tune` formulas are device-pending under MOT-001/MOT-002, not closed here.
- docs:     `41`, `50`, `42`, `54`, `56`, `1-surface/README.md`, `data-layer.md §4`,
            `architecture.md`, `decision-ledger.md` (MOT-002). No `Closes:` row.

## Unverified claims
- None — narrows a not-yet-coded surface; `tune` does not exist in `packages/src` today (the
  critique's premise, unchanged this session).

Next: maintainer review; continue with DOC-020 (pin the native↔public event-name mapping).
