# U6-003 — pin the M3 Expressive floor (REAL-001)

Type: `ratify` · State: `todo` (spec'd) · Device: `no` (the fallback's device proof already exists — see Closure) · Consumes: — · Closes: REAL-001 · Blocked by: — (U6-001/U6-002 merged 2026-06-12)

## Scope note (planner, 2026-06-12)

This task was originally drafted as "device: tune formulas feel right; M3 floor +
fallback", closing MOT-002 + REAL-001. Two things changed under it:

1. **`tune` was deferred from the V1 surface (DOC-019)** — MOT-002 stays open by design
   and resurrects with MOT-001's device-tuned catalog. Device-testing tune formulas with
   no surface and no catalog values would be premature. **MOT-002 is dropped from this
   task** (the ledger row already records the deferral; nothing to do here).
2. **The standard-spring fallback is already device-proven.** U6-001 and U6-002 ran the
   stock `androidx.dynamicanimation` `SpringForce` path on MIUI hardware with no M3
   Expressive present — fire-once, retarget, cancel, reduce-motion, and the full nine-row
   matrix. That IS REAL-001's "standard-spring fallback verified" half
   (`tasks/U6-001/evidence/device-run.md`, `tasks/U6-002/evidence/matrix.md`).

What remains is the other half: **pin the concrete M3 Expressive floor** — a library /
version / detection question answered from documentation and the dependency graph, not a
device run. Hence the re-type to `ratify`.

## Authority links

```
Subtask: pin the M3 Expressive floor (blueprint Unit 6 periphery; REAL-001) — replace
         the "version-fluid until pinned" placeholder with a concrete, checkable minimum.
- Contract anchors:  research/5-realization/structure.android.md §motion + §version
                     gates + §Open questions ("M3 Expressive is opt-in and version-fluid
                     — pin a concrete minimum once the Android backend starts"; the
                     shape-morph node's "os:21 is the schema-shaped floor until the
                     concrete M3 library/API level is pinned"),
                     research/0-spine/02-capability-ir-and-lowering.md (the
                     feature:'m3-expressive' requires-clause — lines ~167/291: a
                     feature-gated rung is selected only when the runtime has it),
                     decision-ledger.md REAL-001 (close condition: a concrete minimum
                     pinned and the standard-spring fallback verified),
                     research/3-motion/41 Decision 11 (spring authoring tokens; M3
                     MotionScheme tokens where present).
- Decision to make:  THE deliverable — answer and pin in structure.android.md:
                     1. The concrete artifact + minimum version that ships M3
                        Expressive motion (MotionScheme springs; the shape library for
                        shape-morph): MDC-Android and/or Compose Material3 — name the
                        exact coordinates and the first stable version carrying the API.
                     2. How fx detects it: feature:'m3-expressive' must resolve at
                        runtime — an optional peer dependency the app installs (the
                        via:'lib' contract, 53 decision 6) vs a bundled dependency vs
                        reflection-based presence check. Decide, record the rationale.
                     3. Whether the schema floor changes: shape-morph's requires is
                        {os:21, hosted, feature:m3-expressive} with os:21 as a
                        placeholder — if the pinned library minimum implies a higher
                        effective floor (minSdk, compile requirements), reconcile the
                        02 node and structure.android.md together.
- Reference (HOW):   Android/Material release notes + Maven coordinates (use context7 /
                     official docs — the floor must cite a real version, not memory);
                     references/expo for the optional-peer-dependency pattern if that
                     is the chosen detection route.
- Guides:            Writing Style (doc edits); Contributing. No code ships unless the
                     detection decision requires a manifest-data placeholder — prefer
                     pinning the doc and leaving implementation to the task that builds
                     the Android M3 rung.
- Rules gate:        #2 (the law — M3 Expressive stays progressive enhancement over the
                     platform-standard spring; the standard path remains the default),
                     #6 (the divergence lives in structure.android.md and nowhere else).
- Closure:           REAL-001 closes when (a) the concrete minimum is pinned in
                     structure.android.md (§version gates + the shape-morph node + the
                     §Open questions row struck), (b) the 02 node is reconciled if the
                     floor moved, and (c) the fallback half is closed by CITATION to the
                     U6-001/U6-002 device evidence (no new run). The cardinal rule
                     applies — close it in the OWNING doc (structure.android.md), then
                     the ledger.
- Done when:         structure.android.md names artifact + version + detection for M3
                     Expressive; the "version-fluid" open question is struck; 02
                     reconciled if needed; REAL-001 → resolved; progress + notes updated.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-12)
- [ ] rules-gated
- [ ] ratified (the floor pinned in structure.android.md; `02` reconciled)
- [ ] reviewed
- [ ] docs-closed (REAL-001 closed in the ledger, fallback half by citation)
- [ ] merged (human gate)

## Proof

- **headless:** doc-only — `git diff --check`; lint untouched unless a manifest
  placeholder lands (then the standard package gates).
- **device:** none new — the fallback citation is `tasks/U6-001/evidence/device-run.md` +
  `tasks/U6-002/evidence/matrix.md` (stock SpringForce on POCO F1 / MIUI, no M3 present).
