# DOC-018 — notes

## Maintainer decision (2026-06-11, via AskUserQuestion)
**Drop `sheet`/`modal` from the V1 presence vocabulary; ship `transient` only.** `sheet`/`modal`
defer to MOT-001 (the device-filled catalog), resurrecting once presence-under-navigation is
settled. This revises DOC-005's ratified presence set. (Options offered: keep+document /
rename / drop-from-V1; maintainer chose drop-from-V1.)

## Changed

### F5 — scope ceiling + the naming decision (owning doc `42`)
- `42` — new `## The scope ceiling (what presence does not animate)` section: presence animates
  conditional rendering inside a mounted screen, NOT navigator transitions / whole-subtree
  teardown (rule #9 honest edge; rule #7 forbids the native-held alternative). Two consequences
  (drive exit with `visible`; screen-scale presentation is the app's navigator).
- `42` — preset catalog table reduced to `transient`; `sheet`/`modal` behavior intent preserved
  in a deferral note (→ MOT-001). New **Decision 7** records the V1 narrowing + reason +
  DOC-005 supersession. Mentions reconciled (surface example `:29`, reduce-motion `:128`, open
  question `:157`).

### Vocabulary propagation (consumers)
- `56` — preset reference table (`:54`) + Decision 5 narrowed to `transient` (presence), sheet/modal deferred.
- `50` — Decision 7 (`:150`) narrowed; sheet/modal deferred note.
- `41` — V1 preset-set open question (`:227`) narrowed; running example `preset="sheet"` → `"transient"` (`:123`).
  Left `:162-164` (the platform's sheet presentation as a *nameable-source* law illustration — not a V1-set claim).
- `data-layer.md` §Presence presets (`:434`) — note that V1 ships `transient` only; the `sheet`/`modal`
  rows stay as MOT-001's provisional catalog targets, deferred from the V1 surface.

### Ledger
- SURF-003 (main `:61` + reconciliation `:157`) — stays `resolved` (its existence claim holds);
  V1 value-set wording narrowed to `transient`, sheet/modal → MOT-001 (DOC-018).
- MOT-001 (`:88`) — now also owns the deferred `sheet`/`modal` presets' resurrection.

### F12 — React-semantics rows (`35`)
- `35` — new `### React-semantics edge cases (resolve before / during U7-001)` table: StrictMode,
  Fast Refresh, Suspense offscreen-hide, re-render mid-exit, list eviction — each with the risk
  and the `references/reanimated` precedent (interrupted-exit merging, reparenting, `skipExiting`).
  Framed as open questions → U7-001 rules + U7-002 device rows, NOT decisions. Note: fx adopts the
  model, never the worklet runtime / commit hook (rule #7).
- `35` — extended the "stay mounted" finding with the scope-ceiling corollary (navigator pop /
  whole-subtree teardown), cross-referencing the `Teardown-during-exit` invariant + `42`.

## Deliberately left
- `42`/`56` Decision 2 + `56:16` keep `sheet` as an illustration of the *behavior-named* naming
  principle — it is deferred, not cancelled; the V1-set decisions make scope unambiguous.
- `data-layer` sheet/modal catalog rows kept (they are MOT-001's device-pending targets, where
  sheet/modal now live).
- `DOC-005/notes.md` — historical session log; supersession recorded in live sources, not the log.

## Lifecycle
- spec'd → rules-gated (docs-only; the scope ceiling is rule #9/#7 made explicit) → decision
  recorded in `42` + propagated + ledger reconciled. State: `ready-to-merge`. `reviewed`/`merged`
  are the maintainer's.

## Proof
- headless: N/A — docs-only.
- device:   N/A — the new `35` rows are U7-001/U7-002 device questions, opened not closed here.
- docs:     `42`, `56`, `50`, `41`, `35`, `data-layer.md`, `decision-ledger.md` (SURF-003, MOT-001).
            No `Closes:` row; SURF-003 stays resolved with narrowed wording.

## Unverified claims
- None of substance — the React-semantics rows are explicitly *questions* for U7-001, not claims.
  The `references/reanimated` precedents (interrupted-exit merging, reparenting, `skipExiting`)
  are cited from the critique's reference appendix, not freshly re-diffed this session.

Next: maintainer review; this **blocks U7-001** (presence FSM) — U7-001 must answer the new `35`
rows. Continue with DOC-019 (defer `tune` from the V1 surface).
