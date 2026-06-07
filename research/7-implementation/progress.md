# Implementation progress

The durable record of build execution. The **table** is the global view — one row per task,
current **state** only. **Detail blocks** below carry the full lifecycle checklist and proof
for active or complex tasks. The rules (lifecycle, states, proof, the closure rule) live in
[`subtask-protocol.md`](./subtask-protocol.md).

> **The cardinal rule:** a task is `complete` only when every `Closes:` ledger row is true in
> its **owning source doc** — not here, not in `data-layer.md`, not in the commit.

## Legend

- **state** (one per task): `todo · in-progress · blocked · headless-done · device-pending · docs-pending · ready-to-merge · merged`. `ready-to-merge` = **complete** (all gates but git); `merged` = integrated.
- **type:** `implement` (code) · `ratify` (decide in source doc) · `device-verify` (device proof) · `rework` (fix inconsistency) · `doc-cleanup` (source alignment).
- **device:** `yes` = has a non-headless gate (effects/animation/touch — will not run headless).
- **consumes / closes:** decision-ledger ids this task reads / must close.

## Tasks

Every in-flight ledger row is closed by exactly one task below. Resolved rows and the resolved
baseline are not tracked. Order is build order; deferred (V2 / trigger-gated) work is parked at
the bottom. A row needs a detail block only when it is active or has more than a one-line proof.

### Cross-cutting decisions — `ratify` / `doc-cleanup`, no native unit, resolve in the source doc

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| DOC-001 | 1-surface | doc-cleanup | todo | no | — | SURF-001, SURF-009 | — | docs: `56`/`55`/`41` drop `GlassView` + `SpringTune` |
| DOC-002 | 0-spine | ratify | todo | no | — | SPINE-004, SPINE-005, SPINE-006, SPINE-007 | — | docs: `02` composition, feature-flags, partitioning, lib naming |
| DOC-003 | 0-spine | ratify | todo | no | — | SPINE-001, SPINE-002 | — | docs: `00`/`50` curation/BYO threshold, palettes-as-artifact |
| DOC-004 | 1-surface | ratify | todo | no | — | SURF-002 | — | docs: `56`/`6-ship` ship effect components? |
| DOC-005 | 1-surface | ratify | todo | no | MOT-001 | SURF-003, SURF-004, SURF-005 | — | docs: `50`/`56`/`57` V1 preset/state/feedback vocab |
| DOC-006 | 1-surface | ratify | todo | no | — | SURF-006 | — | docs: `57`/`21` FxGroup morph scope |
| DOC-007 | 2-effects | ratify | todo | no | — | FX-001, FX-004 | — | docs: `20`/`22`/`50` mesh ergonomics, shader catalog |
| DOC-008 | 2-effects | ratify | todo | no | — | FX-009 | — | docs: `24` Android symbol scope |
| DOC-009 | 3-motion | ratify | todo | no | — | MOT-003, MOT-005, MOT-006, MOT-009 | — | docs: `40`/`41`/`42` V1 motion vocab scope |
| DOC-010 | 3-motion | ratify | todo | no | — | MOT-010 | — | docs: `41`/`42` reduce-motion policy |
| DOC-011 | 4-runtime | ratify | todo | no | — | RT-006, RT-008 | — | docs: `32`/`36` SDF source, driver granularity |
| DOC-012 | 6-ship | ratify | todo | no | — | SHIP-002 | — | docs: `53` no-rung degradation UX |
| DOC-013 | 2-effects | ratify | todo | no | — | REAL-004 | — | docs: `52` single-source shaders (ties compiler) |

### V1 build — Units 1–3 + ship

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U1-001 | Unit 1 | implement | in-progress | no | IMPL-001 | SHIP-001, IMPL-001 | — | headless build; [spec](./tasks/U1-001-package-scaffolding/) |
| U1-002 | Unit 1 | implement | todo | no | RT-010 | RT-010 | U1-001 | headless build; `FxNativeView` + substrate view classes register |
| U1-003 | Unit 1 | device-verify | todo | yes | — | SURF-010, RT-011, RT-005 | U1-002 | device: `previousProps` value-equality skips work; `@Field` defaults; recycle reset |
| U1-004 | Unit 1 | implement | todo | no | — | SHIP-003 | U1-001 | headless: bare RN + Fabric example green in CI |
| U2-001 | Unit 2 | implement | todo | no | SPINE-013 | SPINE-013 | — | headless: `select()` planned-rung tests |
| U2-002 | Unit 2 | rework | todo | no | SPINE-003 | SPINE-003 | — | headless: `tsc` on reconciled UniformSpec |
| U3-001 | Unit 3 | implement | todo | yes | FX-004 | RT-009 | U1-002, U2-001 | device: hosted fill/material/shader/symbol render |
| U3-002 | Unit 3 | device-verify | todo | yes | — | SPINE-012, FX-002, FX-005, RT-004 | U3-001 | device: hosting parity, glass styles, uniform alignment, GPU resume |
| U3-003 | Unit 3 | implement | todo | yes | — | FX-003 | U3-001 | device: Android glass fallback + intensity 0–1; RenderEffect staleness |
| U3-004 | Unit 3 | ratify | todo | no | — | FX-006 | U3-001 | docs: `22` BYO `.metal`/`.agsl` registration contract |
| U3-005 | Unit 3 | device-verify | todo | yes | — | REAL-002, REAL-003 | U3-001 | device: metallib bundle resolves; AGSL assets read at runtime |

### V2 build — Units 4–9

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U4-001 | Unit 4 | rework | todo | yes | RT-015 | RT-015 | U1-002 | device: child rides animated wrapper (see detail) |
| U4-002 | Unit 4 | device-verify | todo | yes | — | RT-014 | U4-001 | device: `mountChildComponentView` override on Fabric |
| U5-001 | Unit 5 | implement | todo | yes | RT-013 | RT-013 | U4-001 | device: post-layout frame read natively |
| U6-001 | Unit 6 | implement | todo | yes | RT-007 | RT-007 | U4-001, U5-001 | device: interruptible spring, no snap |
| U6-002 | Unit 6 | device-verify | todo | yes | — | RT-016 | U6-001 | device: animators handle hard retarget, else build integrator |
| U6-003 | Unit 6 | device-verify | todo | yes | — | MOT-002, REAL-001 | U6-001 | device: tune formulas feel right; M3 floor + fallback |
| U7-001 | Unit 7 | implement | todo | yes | MOT-001 | — | U6-001 | device: presence FSM + deferred-unmount handshake |
| U7-002 | Unit 7 | device-verify | todo | yes | — | MOT-001 | U7-001 | device: per-platform preset catalog filled, passes law test |
| U8-001 | Unit 8 | implement | todo | yes | RT-006 | — | U1-002, U3-001 | device: press recognizer + SDF hit-test |
| U8-002 | Unit 8 | device-verify | todo | yes | — | RT-001 | U8-001 | device: cancel path + full RNGH coexistence matrix |
| U9-001 | Unit 9 | implement | todo | yes | RT-008 | — | U6-001, U7-001 | device: `Fx*` SharedObjects wired |
| U9-002 | Unit 9 | device-verify | todo | yes | — | SPINE-009 | U4-001, U5-001, U7-001, U9-001 | device: identity holds across Fabric commits (the `05` test) |

### Deferred — V2 / trigger-gated, not actionable now

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| DEF-001 | 0-spine | ratify | blocked | no | — | SPINE-008 | trigger: BYO/novel demand | the build-time shader/effect emitter |
| DEF-002 | 0-spine | ratify | blocked | no | — | SPINE-010 | trigger: per-child control | reconsider Nitro / raw Fabric |
| DEF-003 | 1-surface | ratify | blocked | no | — | SURF-007 | V2 | portal / root overlay placement |
| DEF-004 | 1-surface | implement | blocked | no | — | SURF-008 | V2 | `Fx.Stack` JSX-compound skin |
| DEF-005 | 3-motion | ratify | blocked | no | — | MOT-004 | V2 | `edge`/`origin` partial-override sugar |
| DEF-006 | 3-motion | implement | blocked | yes | — | MOT-007 | post-V1 | Reanimated UI-thread channel (regime C) |
| DEF-007 | 3-motion | ratify | blocked | no | — | MOT-008 | V2 | BYO intro/outro envelope declaration |
| DEF-008 | 2-effects | implement | blocked | yes | — | FX-007 | V2 | runtime shader compilation |
| DEF-009 | 2-effects | implement | blocked | yes | — | FX-008 | V2 | Android content-filter wrapper |
| DEF-010 | 4-runtime | device-verify | blocked | yes | — | RT-002 | V2 | `@gorhom/bottom-sheet` coexistence |
| DEF-011 | 4-runtime | implement | blocked | yes | — | RT-003 | V2 | drag/tilt (G3) axis-aware claiming |
| DEF-012 | 4-runtime | ratify | blocked | no | — | RT-012 | V2 | generalize beyond presence to declarative state |
| DEF-013 | 6-ship | implement | blocked | no | — | SHIP-004 | trigger: V2 native mod | config plugin |

## U4-001 — wrapper mechanic

Type: `rework` · State: `todo` · Consumes: RT-015 · Closes: RT-015

Checklist:
- [ ] spec'd
- [ ] rules-gated
- [ ] source docs reconciled (`33`, `34` decide the target object)
- [ ] `architecture.md` / `data-layer.md` updated to match (consumers, not sources)
- [ ] device proof defined and observed
- [ ] ledger RT-015 closed (true in `33`/`34`)

Proof:
- headless: N/A
- device: mount an RN child inside `FxSurfaceView`; confirm the child rides the animated wrapper and hit-testing survives mid-animation
- docs: `33`, `34`, `architecture.md`, decision-ledger RT-015

## U2-002 — UniformSpec schema reconciliation

Type: `rework` · State: `todo` · Consumes: SPINE-003 · Closes: SPINE-003

Checklist:
- [ ] spec'd
- [ ] rules-gated
- [ ] `02` UniformSpec widened to match `data-layer` (`boolean`, `color[]`) — or `data-layer` narrowed
- [ ] TS types regenerate from `02`
- [ ] ledger SPINE-003 closed (true in `02`)

Proof:
- headless: `tsc` — the manifest types compile against the reconciled UniformSpec
- device: N/A
- docs: `02` §The schema, decision-ledger SPINE-003

## Maintenance

- The table is the **view**; the detail block / `tasks/<id>/` folder is the **store**. On disagreement, the store wins — same discipline as "the source doc closes a ledger row, not the ledger."
- A row reaches `ready-to-merge` (complete) only when its `Closes:` rows are true in their source docs. Until then it sits at `docs-pending`, however green the build.
- Escalate by need: row → add a detail block when the task is active → promote to a `tasks/<id>/` folder when it accrues device evidence.
