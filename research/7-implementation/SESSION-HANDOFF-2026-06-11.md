# Session handoff — 2026-06-11 evening (resume here)

Planner/Reviewer session. **V1 is complete and fully merged; the V2 motion engine is
two-thirds built.** Everything through `a168220` is committed AND pushed on
`integration/0.1.x`; the working tree is clean. This file is the pickup list — read it,
then `progress.md`.

## What landed today (context, all merged unless noted)

- Housekeeping: both stale audits retired; the ~30MB evidence recordings scrubbed from
  unpushed history (evidence mp4/mov now gitignored — recordings stay local).
- The full F1–F19 critique batch: U3-008 (persistent hosting controller), U4-003 (lazy
  Metal + process-shared context), DOC-016..020 (human-contributor path, Android-mechanic
  spine reconciliation, presence narrowed to `transient`, `tune` deferred, event-name
  mapping pinned).
- U2-003 — the canonical manifest data ships (audit G1 closed); typed config derived;
  conformance suite; `onFxLoad`/`onFxError` wired; absent-vs-empty `shader` fixed;
  intensity contract reconciled to 0..1/0.8.
- U1-006 (FxGroupView out of the public index) · EX-002 (100-cell stress screen — the
  multi-instance shared-Metal proof delivered) · U3-003 ratified on the POCO (FX-003
  closed in `21`).
- The U7 presence preflight — verdict **SOUND** (JS mount retention needs no commit hook;
  the five React-semantics rows are now FSM rules in `35`).
- **U5-001 merged** — `FxLayoutObserver` device-verified both platforms; RT-013 closed
  (strictly expo-view; New Arch only).
- **U6-001 at `headless-done`** — `FxAnimationDriver` + `FxSpring` (`a168220`). Two
  review rounds: round 1 found a stale-provenance retarget bug, a
  settlingDuration/duration spring mismatch, an event-dispatch scope violation, and
  missing comments — all fixed and re-verified. RT-007 stays open (device-gated).

## Pick up here (in order)

1. **U6-001 device gate** — run the five-point scenario in `tasks/U6-001/evidence/` via
   an agent-device session: (1) fire-once envelope, completion exactly once; (2)
   mid-flight retarget — no snap, velocity carried, **including a SECOND retarget
   mid-display-link** (the round-1 bug's regression check) — completion once, final
   target only; (3) content tappable at rest; (4) cancel settles in place, display link
   stops; (5) reduce-motion → single-frame identity. The driver has no JS API by design —
   temporary native trigger + counters, everything reverted, tree clean at the end.
   Agent must not tick `device-verified`/`merged` or close RT-007.
2. **On PASS** (planner thread does this): ratify, close RT-007 in `34` + the ledger,
   write `reviews/U6-001.md`, tick reviewed/docs-closed; maintainer merges.
3. **U6-002** (RT-016 hard-retarget matrix) and **U6-003** (tune feel / M3 floor) —
   device-verify tasks, now buildable against the shipped driver.
4. **U7-001 spec pass (planner)** — the presence FSM. The preflight is done
   (`tasks/U7-001/preflight.md`, verdict sound); the spec must encode the five `35` FSM
   rules, the stranded-exit guard, snapshot semantics, and the internal
   `onContentAnimationCompletion` hook as the driver attachment point.

## The working protocol (set 2026-06-11)

Planner specs every task (`tasks/<id>/README.md`, row → `spec'd`) → user dispatches a
fresh session with the cold-start prompt + `Task: <id>.` → planner reviews strictly
(file:line, gates re-run, comments/style sweep, cardinal closure rule), two-round when
needed. `device-verified` and `merged` are the maintainer's; device-pending ledger rows
close only on the device gate.

## Standing hardware gates (no action until a device appears)

- **iOS 17 / sub-17 device** → U3-007 A1-2 degradation rows (maintainer chose not to waive).
- **Physical iPhone** → EX-002 scroll-fps row (sim has no fps tooling; standing re-run).
- **TalkBack-equipped Android** → the U3-008 a11y screen-reader demo (POCO/MIUI ships none).

## Open items worth remembering

- Interactive glass has no VoiceOver AX element — owned by the interactive-surface work
  (U8 era), pinned in `structure.ios.md`.
- The Android expo-view interactive shader renderer is unimplemented (stress-list shader
  cells blank on Android) — U8-era work; documented in `structure.android.md`.
- Deferred-with-trigger: DEF-014 (scrollTransition, first V1.x), DEF-015/016 (package
  naming — npm placeholder is `react-native-fxkit`), DEF-017 (CI smoke lane).
- `onStateChange`/`onLongPress` events: names pinned in `40`, dispatchers unwired (U7/U8).
