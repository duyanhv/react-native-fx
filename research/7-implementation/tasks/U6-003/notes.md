# U6-003 — notes

## Unverified claims

- None requiring device proof. The standard-spring fallback (the only device-bound half of
  REAL-001) was already proven by U6-001/U6-002 and is closed by citation here. The pinned
  M3 Expressive path itself ships no renderer in this task (deferred to the Android M3 rung),
  so there is nothing new to run on a device.
- Version/minSdk facts are sourced from official release notes, not memory (see § Sources).

## What changed (and why)

- **`research/5-realization/structure.android.md`** — the deliverable. § `shape-morph` now
  pins the concrete M3 Expressive floor: artifact `androidx.compose.material3:material3`
  ≥ `1.4.0` (`MaterialShapes` + `MotionScheme`, first M3-Expressive stable 2025-09-24) over
  `androidx.graphics:graphics-shapes` ≥ `1.0.0` (the `Morph` engine, 2024-08-21); **detection**
  = optional peer dependency (`53` d6), reflection presence-check, never bundled (bundling
  rejected on the law — M3 stays progressive enhancement, standard `SpringForce` is the
  default); **floor = API 23** (Compose 1.8 raised the Compose minSdk 21→23, so `material3`
  1.4.0 runs only on 23+). § version gates row rewritten (library-gated, footnoted). The two
  § motion spring cross-refs now point at the concrete pin and note the `MotionScheme` upgrade
  is Compose-rung gated. § Open questions "version-fluid" bullet struck → resolved.
- **`research/0-spine/02-capability-ir-and-lowering.md`** — shape-morph rung `requires.os`
  `21`→`23` (the placeholder bumped to the real Compose floor). Kept agnostic: no artifact
  coordinates in `02` (rule #6 — they live in `structure.android.md` only).
- **`packages/src/manifest/manifest.ts`** — shape-morph rung `os: 21`→`23`, mirroring `02`
  (the manifest is the shipped conformance mirror established in U2-003).
- **`packages/src/__tests__/manifest-select.test.ts`** — the two `shape-morph` `select()`
  cases bumped `deviceOS: 21`→`23` (the feature-present case asserted `'native'` and would
  have failed under the higher floor; the feature-absent case now isolates the feature gate
  with the OS floor satisfied).
- **`research/7-implementation/decision-ledger.md`** — REAL-001 `device-pending`→`resolved`
  with the close note (pin + detection + API-23 + fallback-by-citation).
- **`progress.md`** + this task README — U6-003 `todo`→`ready-to-merge`; checklist ticked
  through `docs-closed` (review + merge are the maintainer's).

## Decisions of note

- **The floor moved (21→23), so the schema was reconciled, not just the prose.** The spec's
  sub-decision 3 anticipated this. Per the maintainer's call this session, the shipped manifest
  + tests were reconciled in the same pass to avoid a doc↔code delta (rather than docs-only +
  a tracked follow-up). `graphics-shapes` alone is API 21, but the pinned `MaterialShapes`
  (Compose) realization is the binding floor.
- **`02` stays agnostic.** Only the `os` number changed there; the concrete library/version/
  detection lives solely in `structure.android.md` (rule #6).

## Sources (version facts)

- Compose Material3 1.4.0 (M3 Expressive stable; `MotionScheme.standard()/.expressive()`,
  `MaterialShapes`), released 2025-09-24 — developer.android.com compose-material3 release notes.
- `androidx.graphics:graphics-shapes` 1.0.0 (first stable; `RoundedPolygon`/`Morph`), released
  2024-08-21 — developer.android.com graphics release notes.
- Compose 1.8 raised the Compose minSdk from API 21 to API 23 — developer.android.com compose
  release notes.

## Proof

- headless: from `packages/` — `bunx tsc --noEmit` clean; `bun run build` clean; `bun run lint`
  (Biome, 19 files) clean; `bun run test` 34/34 pass. `git diff --check` clean. No Swift touched.
- device: none new — fallback citation is `tasks/U6-001/evidence/device-run.md` +
  `tasks/U6-002/evidence/matrix.md`.
- docs: REAL-001 resolved in `structure.android.md` § `shape-morph` (owning source) + ledger.

Next: maintainer review of the pin + the `os:21`→`23` manifest/test reconciliation, then merge
on integration/0.1.x.

## 2026-06-12 — ratification (planner thread)

- Reviewed: the pin's three version facts verified (material3 1.4.0 / graphics-shapes
  1.0.0 / Compose-1.8 minSdk 23); the rule-#6 altitude held (`02` agnostic, coordinates
  only in `structure.android.md`); the bundling rejection correctly grounded in the law;
  the manifest/test reconciliation accepted as maintainer-authorized (avoids a doc↔code
  conformance delta). Gates re-run by the reviewer: tsc/build/lint/34 tests/diff-check
  green. REAL-001 closure condition genuinely true in the owning doc.
- Reviewed + merged ticked (maintainer, 2026-06-12). Unit 6 is fully closed.

Next: dispatch U7-001 (cold-start prompt + `Task: U7-001.`) — the last spec'd task in
the queue; then U7-002 spec after its review.
