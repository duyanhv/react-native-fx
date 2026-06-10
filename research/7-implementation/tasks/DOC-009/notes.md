# DOC-009 — notes

## Unverified claims

- None requiring device proof for this task itself. The device gates the ratification
  deliberately leaves open: RT-016 (retarget proof — U6-002), MOT-001 (preset catalog
  values), MOT-002 (`tune` constants). The Android `animateToFinalPosition()` velocity-carry
  and the iOS render-server/integrator behaviors are documented-API claims sourced from the
  preflight research, not device-observed — that is exactly what RT-016/U6-002 proves.

## 2026-06-10 — driver-model ratification (session log)

- Maintainer accepted all three parked wip decisions: substrate-tiered slicing (rule #4
  holds), iOS 17 spring floor (Option A), render-server-first integrator-on-retarget.
- Spec'd this task (README) with scope widened beyond `40`/`41`/`42` to carry the promotion.
- `02`: added Decision #14 (driver vocabulary `target`/`clock`/`source`, tiered); motion
  content rung `os:13` → `os:17` + render-server-first note; prose paragraph after the
  motion node.
- `40`: added Decision #7 (`transition` surface-scoped; `source` driver V2, tiered); renamed
  the regime-C routes to the driver vocabulary; struck two open questions (MOT-005, MOT-006).
- `41`: added §The driver layer beneath the vocabulary; Decisions #10 (drivers beneath the
  four props), #11 (per-platform spring authoring — `{damping,mass,stiffness}` dropped),
  #12 (V1 primitive layer = driver vocabulary; no Compose-name borrow); updated the
  driver-node table's iOS content cell; struck two open questions (MOT-003).
- `42`: added Decision #6 (presence = `target`-driver orchestration; extended states =
  `clock` timelines, V2); struck the named-states open question (MOT-009).
- `34`: new §Findings — the iOS spring disposition (render-server-first, `FxSpring`,
  17 floor, rejected stock alternatives); touch-caveat flip; Android reduce-motion spring
  gate (`areAnimatorsEnabled()`); updated the families table; struck the animator-
  sufficiency open question (disposition recorded; RT-016 stays U6-002's).
- `structure.ios.md`: motion content target rewritten to the ratified mechanic
  (`requires {os:17}`); caveat split render-server vs integrator; child-routing text
  untouched.
- `structure.android.md`: pinned `animateToFinalPosition()` retarget, the
  stiffness/dampingRatio authoring surface (`SpringForce` constants), the reduce-motion
  spring gate.
- `55` + `data-layer.md`: `Transition.spring` → per-platform `SpringSpec`
  (`ios {duration,bounce}` / `android {stiffness,dampingRatio}`).
- Ledger: MOT-003/005/006/009 → resolved; MOT-007 reframed (stays deferred, DEF-006);
  RT-016 reworded (stays device-pending, U6-002).
- wip folded: rethink doc deleted (content promoted); preflight moved to
  `tasks/U6-001/preflight.md` with the maintainer decisions recorded; wip README updated.
- progress.md: DOC-009 → ready-to-merge + detail block; U6-001 row points at the preflight.

Next: maintainer review + merge of DOC-009; then the next todo per progress.md (DOC-006 is
the first unblocked `todo`).
