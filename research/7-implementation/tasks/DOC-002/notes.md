# DOC-002 notes

## 2026-06-09 — spec'd + executed (docs-closed)

### What changed and why

- **`02-capability-ir-and-lowering.md`** — two new decisions, two honest deferrals:
  - **Decision #12:** `composition` (background/overlay/surface) is an API-layer prop (`50` owns
    it), not a manifest field. The component resolves it before the manifest is consulted.
  - **Decision #13:** `via:'lib'` naming: `applyVia` = library name, `asset` = asset type, no
    version in manifest. The optional peer dependency is managed by the app (`53` decision 6).
  - **Open questions updated:** `composition` and `via:'lib'` removed from the open questions list
    (marked as resolved via decisions 12+13). `feature`-flag vocab and manifest partitioning are
    explicitly deferred with triggers — no premature decision.
- **`decision-ledger.md`**:
  - **SPINE-004 → resolved** (close condition true in `02` Decision 12).
  - **SPINE-007 → resolved** (close condition true in `02` Decision 13).
  - **SPINE-005 → deferred** (no real shader/feature case forces it in V1; trigger: revisit when a
    non-OS capability flag or multiple assets per rung is needed).
  - **SPINE-006 → deferred** (manifest stays one file for V1; trigger: revisit when node count
    makes rendering unwieldy).
- **`progress.md`** DOC-002 moved to `ready-to-merge`; detail block added with 2-closed/2-deferred
  split and justification.

### Rows closed vs stayed open

| Row | Action | Why |
|---|---|---|
| SPINE-004 | **closed** | The lean was "API-layer prop, not manifest" — confirmed by `50` which already defines `composition` as a prop. Decision was ripe. |
| SPINE-007 | **closed** | The optional-peer rule was settled in `53`; the only open question was the naming convention. `applyVia` = library name, `asset` = asset type is sufficient for V1. |
| SPINE-005 | **deferred** | No real shader or feature case forces it in V1. Enumerating capability flags prematurely is inventing a taxonomy for nothing. |
| SPINE-006 | **deferred** | No implementation has selected a structure yet. The manifest is one file for V1; splitting is premature optimization. |

## 2026-06-09 — review fixes (ledger-consistency sweep)

### ① Stale SPINE-007 references (three dangling pointers)

The ledger row SPINE-007 was resolved by DOC-002, but three references inside the same file still called it `open`:

1. **FX-009 row (line 82):** "SPINE-007 remains open for the broader `via:'lib'` naming convention."
   → Fixed: "The `via:'lib'` naming convention is resolved separately (SPINE-007, DOC-002)."
2. **Reconciliation table (line 156):** "**ratify** — `applyVia:'Haze'` appearing is not a closed naming convention."
   → Fixed: "**resolved** — `02` Decision 13: `applyVia` = library name, `asset` = asset type, no version in manifest."
3. **Resolved baseline (line 190):** "only package/version naming is open (`SPINE-007`)."
   → Fixed: "the optional-peer rule is resolved in `53` decision 6 and the naming convention is resolved in `02` Decision 13 (SPINE-007)."

### ② SPINE-004 "no Yoga leak" clause (optional)

Added to the close condition: "By construction it is a z-order/compositing concern (rule #9) and never touches Yoga layout." This makes the no-leak claim explicit rather than implicit.

## Next

Next: review + merge (human gates).