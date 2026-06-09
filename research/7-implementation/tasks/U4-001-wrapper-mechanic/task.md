# U4-001 — wrapper mechanic

Type: rework
State: device-pending
Unit: 4

Consumes: RT-015
Closes: RT-015
Blocked by: —

## Goal

Decide and document the exact object fx animates for content motion. Resolve whether the animator targets the container view itself or an intermediate container that Fabric does not track. The research (33:58-60) says "intermediate container that Fabric does not track."

## Checklist

- [x] spec'd
- [x] rules-gated
- [x] source docs reconciled (`33`, `34` decide the target object)
- [x] `architecture.md` / `data-layer.md` / `blueprint.md` updated to match (consumers, not sources)
- [x] blueprint.md shape fixed ("intermediate container" picked)
- [x] device proof defined
- [ ] device proof observed (human gate)
- [x] ledger RT-015 closed (true in `33`/`34`)

## Proof

- headless: N/A
- device: mount an RN child inside `FxSurfaceView`; confirm the child rides the intermediate container and hit-testing survives at rest (mid-flight follows 34's iOS/Android caveat)
- docs: `33`, `34`, `architecture.md`, `data-layer.md`, `blueprint.md`, decision-ledger RT-015
