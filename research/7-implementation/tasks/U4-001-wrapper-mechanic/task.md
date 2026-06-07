# U4-001 — wrapper mechanic

Type: rework
State: todo
Unit: 4

Consumes: RT-015
Closes: RT-015
Blocked by: —

## Goal

Decide and document the exact object fx animates for content motion. Resolve whether the animator targets the container view itself or an intermediate sublayer that Fabric does not track. The research (33:58-60) says "intermediate layer/container that Fabric does not track."

## Checklist

- [ ] spec'd
- [ ] rules-gated
- [ ] source docs reconciled (`33`, `34` decide the target object)
- [ ] `architecture.md` / `data-layer.md` updated to match (consumers, not sources)
- [ ] blueprint.md shape fixed ("native sublayer" or "container view" — pick one)
- [ ] device proof defined and observed
- [ ] ledger RT-015 closed (true in `33`/`34`)

## Proof

- headless: N/A
- device: mount an RN child inside `FxSurfaceView`; confirm the child rides the intermediate sublayer and hit-testing survives at rest (mid-flight follows 34's iOS/Android caveat)
- docs: `33`, `34`, `architecture.md`, `blueprint.md`, decision-ledger RT-015
