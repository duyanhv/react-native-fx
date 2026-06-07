# 7-implementation · implementation blueprint — the build-ordered execution plan

**Plane:** cross-cutting (execution) · **Domain:** both · **Substrate:** both · **Phase:** v1 + v2
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

The strict, build-ordered sequence that maps every architectural unit to its research
contract, a battle-tested precedent, and an explicit build decision (use / mimic / adapt /
fx-original design / reject) with a falsification trigger. It is the research→code bridge:
the last step before writing native code.

Out of scope: *what* the contracts say (→ every other folder). This folder only decides
*how* and *in what order* they are built.

It also owns the **decision ledger** — the single cross-plane index of every decision still
in flight (open, deferred, device-pending, implementation-pending, doc-cleanup), each with an
owner, what it blocks, and the condition that closes it. The blueprint says what to build; the
ledger says what is still undecided and what proof closes it. A future `implementation-plan.md`
consumes both by ID.

## Invariants that bite here

- **Every unit binds a contract anchor** (`1-surface`, `2-effects`, `4-runtime`, etc.) —
  never invent a unit without one.
- **Every decision has a flip-trigger** — a falsifiable condition that would reverse it.
- **Build order is dependency order** — `Depends on` links enforce the correct sequence.
- **Precedent cells name battle-tested prior art, not problems.** If no prior art exists,
  the decision is labeled **fx-original design** and the precedent cell states the
  constraint fx solves.
- **No unit repeats a contract's rationale.** The blueprint is a dispatch table, not a
  rewrite of the research docs.

## Docs

| id | doc | owns | status |
|----|-----|------|--------|
| — | blueprint | the 9-unit build sequence (phase V1 + V2) with contracts, precedents, decisions | researched |
| — | architecture | target folder structure, the overall orchestrator (`FxNativeView`), the runtime object model, and the two execution paths | researched |
| — | data-layer | the materialized data — manifest data, select(), presets, tune formulas, vocabularies, shader catalog, resolved inconsistencies, confirmed decisions | researched |
| — | subtask-protocol | the authority chain + cross-check protocol + subtask template for turning a unit into a verifiable subtask | researched |
| — | decision-ledger | the cross-plane index of in-flight decisions — status, owner, blocker, close condition per entry | researched |
| — | progress | the durable execution tracker — one row per subtask (state, type, device, consumes/closes, proof); lifecycle rules in `subtask-protocol` | researched |

A planned `implementation-plan.md` — the ordered build phases that consume the ledger's IDs via `Consumes:` / `Closes:` — is referenced but not yet created. Until it exists, its pending decisions live in `decision-ledger.md`.

## Feeds

- **Consumes ←** every other plane — the blueprint binds their contracts to build
  decisions.
- **Feeds →** the implementation in `packages/{src,ios,android}`.

## Open research targets

- Unit 4 (Fabric-invisible layer) — `mountChildComponentView` override verified on Fabric
  (device).
- Unit 6 (FxAnimationDriver) — interruptible-spring retargeting contract verified per
  platform.
- Unit 9 (Runtime Objects) — Expo SharedObject identity stability across Fabric commits
  (the `05` falsification test).
- Keep the `Depends on` graph accurate as units adjust scope during implementation.
