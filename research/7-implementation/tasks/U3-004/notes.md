# U3-004 notes

## Unverified claims

None — this is a ratify task (docs-only). No device or headless claims.

## What changed

- **`research/2-effects/22-shaders.md`**
  - Added **Decision 6** — the full V1 BYO registration contract: registration path (`registerShader`), asset locations (clarified as the fx package's paths, not the app's), build wiring (cross-references `structure.ios.md` §shader + `52` Decision #2 instead of restating), V1 constraint (no config plugin, DEF-013/SHIP-004 deferred), runtime compilation deferred to V2 (`DEF-008`), missing-platform guard-out (`{via:'none'}`), `onLoad`/`onError` events, consumption surface (`<Fx effect="id">`), typing idiom (`ShaderId | (string & {})`), unregistered-id behavior (`onError`, no crash), and forward pointer for the TypeScript implement task.
  - Resolved the **"BYO asset contract"** open question — struck through and marked resolved (FX-006; U3-004, 2026-06-10).
  - Fixed **Decision 5 indentation** — reverted from 4-space to 3-space (consistent with Decisions 1–4 and 6).

- **`research/7-implementation/data-layer.md` §7**
  - Changed heading from "Provisional Candidate" to "Ratified Contract".
  - Removed the "pending source-doc closure" caveat and updated the ledger reference to `resolved`.
  - Updated **Asset location** to clarify these are the fx package's paths, not the app's.
  - Updated **Build integration** to cross-reference the single-home mechanic (`structure.ios.md` + `52`) instead of restating it.
  - Added **V1 constraint** subsection (no config plugin, DEF-013/SHIP-004 deferred).
  - Added **Consumption surface**, **Typing idiom**, **Unregistered-id behavior**, and **Missing platform guard-out** subsections to match the ratified contract.

- **`research/7-implementation/decision-ledger.md`**
  - Closed **FX-006** — flipped from `open` → `resolved` with the close condition verified in `22` Decision 6.
  - Updated the **Reconciliation with plane 7** table: FX-006 action changed from `ratify` to `resolved (U3-004, 2026-06-10)`.

- **`research/7-implementation/progress.md`**
  - Updated U3-004 row state from `todo` → `ready-to-merge`.
  - Added detail block with checklist, proof, and task link.

- **`research/7-implementation/tasks/U3-004/README.md`**
  - Created task spec with authority links, rules gate, and lifecycle checklist.

## Next

Review `22` Decision 6 + FX-006 ledger closure; then the TypeScript implement task (applying `ShaderId | (string & {})` at the `effect` prop boundary) can be scheduled separately.
