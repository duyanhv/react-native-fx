# Session handoff — 2026-06-12 (resume here)

Planner/Reviewer session. **Units 6 AND 7 are fully closed** (U7-003 merged + MOT-001
closed late on 2026-06-12; review at `reviews/U7-003.md`). This file is the pickup list —
read it, then `progress.md`.

## What landed today (all merged on integration/0.1.x)

Twelve commits (`70cfb65`…`74933cf`), five tasks driven spec → device gate → ratified:

- **U6-001 merged** — the FxAnimationDriver device gate PASSED (POCO F1/A15 + iPhone 17 Pro
  sim/iOS 26.5): fire-once, retarget + the second-retarget regression check, tap-at-rest,
  cancel, reduce-motion. The handoff logs caught the opposing-inertia clip working on device.
  **RT-007 closed**; review at `reviews/U6-001.md`.
- **U6-002 merged** — the nine-row hard-retarget matrix PASSED in full (timing sweep,
  clip-vs-carry, rapid-fire, zero-displacement, after-rest, rotation+combined, mixed
  channels, cancel-under-fire, JS silence). **RT-016 closed — the integrator flip did NOT
  trigger; the stock paths suffice.** Review at `reviews/U6-002.md`.
- **U6-003 re-scoped + merged** — was "tune formulas + M3 floor"; narrowed to REAL-001 only
  (MOT-002 stays deferred per DOC-019). **REAL-001 closed**: M3 Expressive floor pinned in
  `structure.android.md` §shape-morph — `androidx.compose.material3:material3 ≥ 1.4.0` over
  `graphics-shapes ≥ 1.0.0`, **API 23** (the Compose-1.8 minSdk bump), optional peer
  dependency, never bundled; `os:21→23` reconciled in `02` + the shipped manifest + tests.
- **U7-001 merged** — FxPresence: the presence FSM + deferred-unmount handshake, the four-
  piece vertical (src/motion vocabulary; FxPresence + the pure retention reducer;
  FxPresenceCoordinator.swift/.kt on the U6-001 driver via `onContentAnimationCompletion`;
  the visible/preset/motion/appear boundary). Two review rounds (shipped-comment provenance
  stripped; `transition` narrowed to `{spring?:'native'}`). Device gate: all six scenarios
  PASS both platforms; **the `35` event-ordering question is ANSWERED** (cut-short
  `interrupted:true` strictly precedes the retargeted settle — struck into `35`). `54`
  status flipped; the architecture coordinator row reconciled. Review at `reviews/U7-001.md`.
- **U7-002 merged** — the catalog gate: `transient` law-tested against the real
  banner/snackbar on both platforms; **the five `35` React-semantics rows device-proven**
  (StrictMode / Fast Refresh / offscreen-hold / re-render-mid-exit / eviction); the
  first-mount translate fix (`enterAwaitingLayout` held-enter) shipped + validated; values
  propagated to `data-layer` + `structure.{ios,android}` §presence presets. **The law test
  caught one gap:** Android's bouncy default spring vs the non-bouncing snackbar —
  **MOT-001 therefore did NOT close; it re-homed to U7-003.** Review at `reviews/U7-002.md`.
- **U7-003 spec'd** — the Unit 7 closeout (see Pick up below).

## Pick up here (in order)

1. ~~Dispatch U7-003~~ — **DONE 2026-06-12**: merged on `integration/0.1.x`; device gate
   PASS on the POCO F1 (per-frame logcat capture + a default-spring positive control — the
   slowed-animator-scale method was reviewed out: `dynamicanimation:1.0.0` springs ignore
   the animator scale). **MOT-001 closed**; the `sheet`/`modal` rider re-homed to
   **DEF-018** (trigger: presence-under-navigation settled). Review: `reviews/U7-003.md`.
2. **U8-001 spec pass (planner)** — the press recognizer (consumes RT-006, closes RT-005;
   blocked-by U1-002 + U3-001, both long merged). Contract: `30`/`32`; blueprint Unit 8
   (adapt the RNGH FSM + slop-yield pattern; reject RNGH-the-dependency). Consider a
   references preflight first (the U6/U7 preflights both paid off).
3. **U9-001** is also unblocked (U6-001 + U7-001 merged) if a second lane is wanted —
   `Fx*` SharedObjects (blueprint Unit 9); U9-002 then carries the SPINE-009 identity proof.

## The working protocol (unchanged, proven through five tasks today)

Planner specs (`tasks/<id>/README.md`, row annotated) → user dispatches a fresh session
(cold-start prompt + forced `Task: <id>.` — auto-select would grab DOC-011 first) → device
gates run via agent-device with a purpose-built dispatch prompt → planner reviews strictly
(file:line, gates re-run, evidence spot-checked against raw logs) → maintainer ratifies →
planner executes closure (ledger/docs/review/ticks) + commits. `device-verified`/`merged`
stay the maintainer's; the cardinal closure rule held twice today (U6-003's fallback-by-
citation; U7-002's MOT-001 re-home).

## Review gotchas learned today (also in the planner's memory)

- Gate agents can leave **dependency bumps** (expo patch versions + lockfiles) and
  misreport them as pre-existing — diff-check every cleanup claim.
- iOS `carriedVelocity` zeros at a retarget handoff can be the **opposing-inertia clip
  working** (check the direction sign before calling it a defect).
- **Duplicate same-named iOS simulators** silently split agent-device taps vs install/logs
  → false FAILs; delete the dupe and pin one device.
- POCO F1 dozes between commands (`svc power stayon true`, `wm dismiss-keyguard`); Android
  `SpringForce` settles ~0.26 s vs iOS ~0.5–0.75 s — calibrate retarget offsets per
  platform; the ~120 ms Android slide is below screen-recording burst resolution.
- **Rebuild + reinstall from the gate commit before a device run** — stale binaries fail
  native-fix scenarios spuriously (the U7-002 runner caught this itself).

## Standing hardware gates (no action until a device appears)

- **iOS 17 / sub-17 device** → U3-007 A1-2 degradation rows (maintainer chose not to waive).
- **Physical iPhone** → EX-002 scroll-fps row; a physical-iPhone re-run of the U6/U7 gates
  is a standing nice-to-have (all iOS evidence this session is simulator, per precedent).
- **TalkBack-equipped Android** → the U3-008 a11y screen-reader demo.

## Open items worth remembering

- **Fast-Refresh strict mid-exit instant** is un-isolatable under Metro HMR latency
  (~0.7–1.0 s > the 0.75 s iOS exit); all stranded-guard *outcomes* held on device. Dev-only;
  accepted in `reviews/U7-002.md`.
- The presence harness (`example/screens/presence.tsx`) carries a kept safe-area inset fix
  (the transparent-header overlap) and the offscreen/eviction affordances — they are
  deliberate keeps, not leftovers.
- `transition` ships narrowed to `{spring?:'native'}`; it widens with the MOT-001-era
  catalog work. `tune` (MOT-002) and `sheet`/`modal` stay deferred.
- The Android expo-view interactive shader renderer remains U8-era; `onStateChange`/
  `onLongPress` dispatchers remain unwired (U7/U8-era, names pinned in `40`).
- Deferred-with-trigger: DEF-014 (scrollTransition), DEF-015/016 (package naming),
  DEF-017 (CI smoke lane).
