# 0-spine · cross-cutting frame — the invariants every other folder obeys

**Plane:** Vocabulary (the manifest lives here) + the cross-cutting law/contract ·
**Domain:** both · **Substrate:** defines the split · **Phase:** v1
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

The frame the rest of the vault is a consumer of. Nothing here is platform mechanics or
consumer API — it is the *contract* layer:

- **The thesis, the goal, the personas, and the law** (author vs consumer; "JS never
  authors shaders"; agnostic names, platform-native defaults).
- **The substrate & hosting model** — `hosted` vs `expo-view`, and the Expo Host
  conflict (#46549) that `requires.substrate` encodes.
- **The capability manifest / IR / lowering schema** — the single source of truth that
  every other folder dispatches against. This *is* the Vocabulary plane.
- **The adapter-vs-compiler decision** — the two manifest-consumer strategies.
- **The state-ownership model** (`04`) — who owns desired state / the tree / layout /
  presentation / pixels; the spine beneath layout, presence, children, and animation.
- **The native boundary decision** (`05`) — Expo Modules vs Nitro vs RN Runtimes vs raw
  Fabric; the authority that keeps rule #7 from being relitigated ad hoc.

Out of scope (lives elsewhere): per-platform mechanics → `5-realization`; capability
semantics → `2-effects` / `3-motion`; the public API → `1-surface`.

## Invariants that bite here

This folder *defines* the invariants, so its job is to keep them coherent — not to obey
someone else's. The load-bearing ones it owns: the **law**, the **contract**, the
**node-ids-are-the-naming-authority** rule, and **a node with no satisfiable rung
degrades to `{via:'none'}`, never throws**. Changes here ripple everywhere — touch with
care and update downstream consumers in lockstep.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| 00 | thesis-and-personas | the goal, personas, the law | researched |
| 01 | substrates-and-hosting | hosted vs expo-view; Host conflict | researched |
| 02 | capability-ir-and-lowering | ★ the manifest schema, IR, lowering ladder | researched |
| 03 | adapter-vs-compiler | the two consumer strategies (one manifest) | researched |
| 04 | state-ownership-and-boundaries | who owns which state across the stack (the spine for layout/presence/children) | researched |
| 05 | native-boundary-decision | the JS↔native boundary mechanism (ADR) | researched |

## Feeds

- **Consumes ←** nothing (this is the root of the dependency order).
- **Feeds →** everything. `02` directly feeds `5-realization` (renders its columns),
  `2-effects`/`3-motion` (the nodes), `1-surface` (adapter dispatch), `4-runtime`
  (clock/`requires`).

## Open research targets

The spine is `researched`; the open work is keeping the manifest sufficient as the new
scope lands:

- Resolve `02`'s own open questions: per-shader uniform typing location, composition
  modes in the schema, manifest partitioning, the `feature` flag vocabulary, the
  `via:'lib'` dependency contract.
- **Motion in the manifest — done.** `02` carries **one** `kind:'driver'` `motion` node
  (content + effect rungs); `appear` / `dismiss` / presence are **orchestrations over it**
  (`3-motion/41`–`42`), not separate nodes. The IR covers both domains under one schema.
- Confirm the law is stated strongly enough that no downstream folder invents a
  cross-platform-uniform default.
