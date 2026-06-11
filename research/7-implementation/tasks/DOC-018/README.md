# DOC-018 — presence scope ceiling + `sheet`/`modal` naming + React-semantics rows

Type: `ratify` · State: `todo` · Device: no · Consumes: — · Closes: — (no ledger row) · **Blocks U7-001**

Origin: critique F5 (HIGH, presence) + F12 (MEDIUM, presence).

- **F5** — the JS-held deferred-unmount model (`04` seam 5, `35`) only animates an exit
  while `FxPresence` itself stays mounted. A navigator pop / parent-conditional / list
  eviction destroys the whole subtree at once, so the handshake never fires. `sheet`/`modal`
  are *screen-scale* preset names users will put directly under navigators — they oversell
  against that boundary. Document the ceiling; decide the naming against it.
- **F12** — `35` has no React-semantics edge-case checklist (StrictMode, Fast Refresh,
  Suspense, mid-exit re-render, list eviction). Reanimated has accumulated handling for each.
  Add them as explicit rows before U7-001.

## Maintainer decision (2026-06-11)

**Drop `sheet`/`modal` from the V1 presence vocabulary; ship `transient` only.** `sheet`/`modal`
defer to **MOT-001** (the device-filled per-platform catalog), resurrecting once
presence-under-navigation is settled. This revises DOC-005's ratified presence set
(`transient · sheet · modal` → `transient`). Rationale: the two names denote screen-scale
presentations that collide with the scope ceiling, and their per-platform shape is
device-pending anyway — deferring costs nothing now.

## Subtask

- Contract anchors:  `3-motion/42` (presence semantics — the owning doc), `4-runtime/35`
                     (the FSM + deferred-unmount handshake), `0-spine/04` (React owns the tree).
- Decision:          `ratify` — record the V1-vocabulary narrowing + the scope ceiling in `42`;
                     propagate the value-set change to `56`/`50`/`41`; reconcile the ledger
                     wording (SURF-003, MOT-001); add the F12 rows to `35`.
- Reference (HOW):   Reanimated's edge-case inventory (`references/reanimated` —
                     interrupted-exit merging, reparenting transfer, `skipExiting`) frames the
                     `35` research rows; not adopted, only enumerated as questions.
- Guides:            `Writing Style Guide.md`.
- Rules gate:        #9 (React owns the tree; fx defers unmount via handshake, never seizes it)
                     — the scope ceiling is this rule's honest edge.
- Device-verify:     none here — the `35` rows become U7-001 / U7-002 device questions.
- Done when:         `42` records the `transient`-only V1 set + the scope ceiling + the
                     deferral of `sheet`/`modal` to MOT-001; `56`/`50`/`41` agree; the ledger
                     wording is reconciled; `35` carries the React-semantics rows + the
                     navigator-pop ceiling cross-ref.

## Proof

- headless: N/A — docs-only.
- device:   N/A — the new `35` rows are U7-001/U7-002 device questions, not closed here.
- docs:     `42`, `56`, `50`, `41`, `35`, `decision-ledger.md` (SURF-003 + MOT-001 wording).
            No `Closes:` row of its own; SURF-003 stays resolved (its *existence* claim holds)
            with its V1 value-set wording narrowed.
