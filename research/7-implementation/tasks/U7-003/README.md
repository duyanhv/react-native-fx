# U7-003 — ship the Android catalog spring (MOT-001's last cell)

Type: `implement` · State: `todo` (spec'd) · Device: `yes` · Consumes: — · Closes: MOT-001 · Blocked by: — (U7-002 merged 2026-06-12)

## Why this task exists

U7-002's law test filled the V1 `transient` catalog on device and found exactly one parity
gap: the Android driver animates with the `SpringForce()` default
(`DAMPING_RATIO_MEDIUM_BOUNCY 0.5`), which overshoots ~16 % — a Material snackbar does not
bounce. The catalog value is pinned (`structure.android.md` §presence presets:
`DAMPING_RATIO_NO_BOUNCY (1.0)` at `STIFFNESS_MEDIUM`); this task makes the shipped code
match it and confirms on device. MOT-001 closes here — the catalog's last unshipped cell.

## Authority links

```
Subtask: plumb the presence spring parameter on Android (blueprint Unit 7 closeout).
- Contract anchors:  structure.android.md §presence presets (the pinned catalog value —
                     the spec of this change) + §motion (spring authoring as platform
                     tokens; the reduce-motion gate must keep working),
                     data-layer.md §Presence presets (the U7-003-marked cells),
                     decision-ledger.md MOT-001 (closes here),
                     tasks/U7-002/evidence/catalog.md Part 1 (the finding + method),
                     tasks/U6-002/evidence/matrix.md (the retarget behavior that must
                     not regress).
- Decision:          already made (the U7-002 law test + this docs-closed): Android
                     transient runs DAMPING_RATIO_NO_BOUNCY at STIFFNESS_MEDIUM. The
                     plumb is a per-envelope spring parameter from FxPresenceCoordinator
                     to FxAnimationDriver — the DRIVER DEFAULT STAYS the platform family
                     (the proven U6 behavior is the no-params path); the presence
                     coordinator passes the catalog token for its envelopes. iOS needs
                     NO change (kept-default, device-verified).
- Reference (HOW):   androidx.dynamicanimation SpringForce.setDampingRatio/setStiffness;
                     the existing animateTo wiring in FxAnimationDriver.kt.
- Guides:            Code Style + Comments (no planning-artifact refs); Testing; Device
                     Verification; Contributing.
- Rules gate:        #2 (the catalog value IS the platform's snackbar family — tokens,
                     not raw invented curves), #1/#9 unchanged. The U6-001/U6-002 proven
                     mechanics must hold: retarget via animateToFinalPosition() with the
                     new damping must still carry value+velocity.
- Scope boundaries:  Android only; transient only (the param plumbs generically, but no
                     other preset ships values); NO iOS change; NO driver-default change;
                     NOT tune/transition authoring (deferred — MOT-002/the catalog
                     resurrection).
- Device-verify:     (agent-device, physical Android) (1) the transient enter/exit no
                     longer overshoots — capture at a slowed animator scale (e.g.
                     `settings put global animator_duration_scale 5`) so the ~120 ms
                     envelope resolves in frames, then restore; (2) one mid-flight
                     retarget on the presence envelope — no snap, completion once (the
                     U6 contract under the new damping); (3) reduce-motion still
                     single-frame. Write evidence/device.md.
- Closure:           on the maintainer's PASS, the planner closes MOT-001 (the V1
                     catalog filled, parity-checked, AND shipped) and re-homes its
                     sheet/modal rider to a deferred row (trigger:
                     presence-under-navigation settled); the data-layer U7-003 markers
                     and the structure.android pending note flip to verified. The agent
                     ticks nothing past headless-done.
- Done when:         the coordinator passes the catalog spring token for presence
                     envelopes on Android; driver default unchanged; headless gates +
                     compileDebugKotlin green; the three-point device scenario written
                     (run is the gate); no comment provenance.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-12)
- [ ] rules-gated
- [ ] implemented
- [ ] commented
- [ ] headless-done
- [ ] device-verified (human gate)
- [ ] reviewed
- [ ] docs-closed (MOT-001 → resolved; the rider re-homed; data-layer/structure markers flipped)
- [ ] merged (human gate)

## Proof

- **headless:** packages gates + `compileDebugKotlin` (Kotlin-only change; iOS untouched).
- **device:** `evidence/device.md` — no-overshoot capture (slowed scale), a presence
  retarget regression, reduce-motion.
