# DOC-022 — notes

## Changed (2026-06-13)

- **RT-012 resolved** — `35` §Resolved: V1 stays presence-specific; the presence FSM +
  deferred-unmount handshake are scoped to `FxPresence`. Generalization → DEF-012 (V2,
  trigger: declarative-state demand). Ledger RT-012 `open → resolved`.
- **RT-003 resolved by citation** (no new device run) — `31` §Resolved: device-shared
  singleton (U4-003/EX-002), fresh-drawable-on-resume (U3-008), continuous-while-active is
  cheap (RT-006/U8-001). Ledger RT-003 `device-pending → resolved`. Maintainer-ratified the
  citation-close in the closeout.
- **Doc-cleanup** — struck `35`'s stale `05`-falsification open question (SPINE-009 already
  closed via U9-002, device-proven-by-citation).
- **DEF-012 re-pointed** — `closes` RT-012 → `—`; now trigger-gated (declarative-state demand,
  V2), spawns a fresh ledger row when triggered (the RT-006→DEF-019 pattern).
- **Standing deliverable** — wrote `research/7-implementation/v1-cut-checklist.md`; linked from
  `progress.md` (header) and `HOW-TO-CONTINUE.md`.
- **Merge-tick batch** (stale cells flipped to `merged` against in-tree finishing commits):
  DOC-006 `d3f8b4c`, DOC-009 `3163c5d`, DOC-011 `fd5ed75`, DOC-012 `5c98519`, U3-004 `3a5e9e1`,
  U9-001/U9-002 `835d546`, U3-002 `48fa26b` (the non-legend `docs-closed` state normalized).
- **U3-007 waived** — A1-2 iOS OS-degradation visual rows accepted unverified for the cut
  (maintainer call); flipped to `merged` with the waiver explicit; recorded in the checklist.

## Verification

- Docs + bookkeeping only; no headless/device gate of its own.
- Cross-checked every merge-tick flip against `git log` — each task's finishing commit is on
  `integration/0.1.x` before the cell was flipped (no merged-on-faith).
- RT-003 asserts no new device truth — it cites four already-maintainer-ratified gates.

Next: DEF-016 (the mechanical rename to `react-native-fxkit` + the `skills/` parity story) at
pre-publish; DEF-014 (the iOS-hosted `source` rung) as the first V1.x task.
