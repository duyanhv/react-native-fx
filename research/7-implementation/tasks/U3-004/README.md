# U3-004 — BYO `.metal`/`.agsl` registration contract

> Unit 3: `FxEffectRenderer` (The Pixels) — the shader-rung flip.
> Type: `ratify` · Device: no · Closes: `FX-006`.

## Goal

Ratify the V1 BYO (bring-your-own) shader registration contract in the owning source doc (`22-shaders.md`) and propagate it to `data-layer.md` §7. The contract must be end-to-end: it covers registration, consumption, typing, and unregistered-id behavior, without leaving the consumer call site unspecified.

## Authority links

- **Contract anchors (primary):** `22-shaders.md` — the `shader` node semantics, BYO open question, the `ShaderId` union, and the `onLoad`/`onError` event contract.
- **Contract anchors (secondary):** `50-api-and-presets.md` — BYO reuses the `shader` node, no separate API; `55-composition-chain.md` — `<Fx effect="id">` is the consumption surface; `52-standards-and-publishing.md` — asset bundling mechanism (Decision #2, #3); `structure.ios.md` / `structure.android.md` — BYO load mechanics.
- **Decision:** `fx-original` — the registration contract is a new design decision; no precedent to mimic.
- **Rules gate:**
  - `#5` — BYO is one feature, not the front door; the curated catalog is the default.
  - `#2` — shape-native defaults; a BYO shader must declare both an MSL and an AGSL artifact, or honestly guard out the missing platform.
  - `#7` — Expo Modules + Fabric; no JSI/C++ for registration.
- **Closes:** `FX-006` — the BYO asset registration contract.
- **Done when:** `22` Decision 6 records the contract, the open question is resolved, `data-layer.md` §7 is reconciled, and `FX-006` is closed in the ledger.

## Lifecycle checklist

- [x] spec'd
- [x] rules-gated
- [x] docs-closed (`22` Decision 6 + open question resolved; `data-layer.md` §7 reconciled)
- [x] ledger `FX-006` closed (true in `22`)
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

## Proof

- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `22` §Decisions (Decision 6), `22` §Open questions (BYO asset contract resolved), `data-layer.md` §7 (reconciled), `decision-ledger.md` `FX-006` → `resolved`.

## Notes

- No `.ts` edits — the typing contract is documented in `22` and `data-layer.md` only. The actual TypeScript change (applying `ShaderId | (string & {})` at the `effect` prop boundary) is an `implement` task, not this one.
- Runtime shader compilation (`DEF-008`, V2) is explicitly out of scope — V1 BYO is build-time `.metal`/`.agsl` pairs only.
