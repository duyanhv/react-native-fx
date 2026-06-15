# DOC-009 — V1 motion vocabulary scope: the driver-model ratification

3-motion · type: `ratify` · state: `ready-to-merge` · device: no
Consumes: — · Closes: MOT-003, MOT-005, MOT-006, MOT-009 · Blocked by: —

> Closes the four open motion-vocabulary rows by promoting the driver-model rethink
> (`research/wip/motion-driver-model-rethink.md`, maintainer-accepted 2026-06-10) into the
> canonical docs. The reframe: motion channels and effect uniforms are both *animatable
> properties bound to native drivers* — `target` (discrete state → platform-native spring),
> `clock` (native timeline), `source` (native scroll/gesture value). The four-prop front door
> (`preset`/`motion`/`tune`/`transition`) stays; drivers become the layer beneath it.
>
> **Scope widened** beyond the original "`40`/`41`/`42` V1 motion vocab scope" row: the
> ratification also touches `02` (the driver vocabulary + the iOS content-rung floor), `34` +
> `structure.{ios,android}` (the maintainer-ratified U6-001 spring preflight dispositions),
> and the `Transition.spring` consumers (`55`, `data-layer`).

## The maintainer decisions this records (2026-06-10)

1. **Substrate-tiered slicing accepted; rule #4 holds.** Content motion (`expo-view`) gets
   full-fidelity `target`/`clock` and a best-effort `source`; render-server `source` fidelity
   and all effect-uniform animation live in the hosted effects lane. Build order: `target` +
   `clock` first, `source` second (V2), effect-uniform animation in the hosted lane last.
   `source`'s honest guarantee is "zero per-frame JS" everywhere — not "zero per-frame native
   work" (true only on iOS hosted).
2. **iOS 17 floor for spring content motion.** The `motion` content rung moves `os:13` →
   `os:17` (`SwiftUI.Spring` solver only; no hand-rolled 13–16 fallback). Below 17 the ladder
   degrades to `{via:'none'}` — instant placement, consistent with the reduce-motion posture.
3. **Render-server-first, integrator-on-retarget** for the iOS content lane. Fire-once
   envelopes commit the iOS 17 unified spring (render server, off the main thread); a
   `CADisplayLink` + `SwiftUI.Spring` integrator (the `FxSpring` facade) engages only on an
   actual mid-flight retarget.

## Start here

1. **This file** — the work order, authority links, scope, and proof.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle and closure rules.
3. **`research/7-implementation/tasks/DOC-009/notes.md`** — current handoff.
4. **Per-gate guides:**
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - all gates → `agents/session-protocol.md`

## Authority links

```
Subtask: V1 motion vocabulary scope — driver-model ratification (no blueprint unit — cross-cutting)
- Contract anchors:  40-motion-reactivity-and-data-flow.md (regimes, transition, regime-C routes),
                     41-motion-vocabulary.md (the four-prop split, the law, the driver node),
                     42-presence-and-lifecycle.md (the envelope, named states),
                     02-capability-ir-and-lowering.md (the motion driver node — vocabulary authority),
                     34-animation-driver.md (the driver contract),
                     research/wip/motion-driver-model-rethink.md + u6-001-ios-spring-preflight.md
                     (the accepted exploration being promoted)
- Decision:          fx-original (the driver vocabulary) over researched native primitives.
                     Per platform: USE the stock spring engines (iOS 17 unified spring /
                     CASpringAnimation; androidx.dynamicanimation animateToFinalPosition;
                     SwiftUI.Spring as the retarget solver). REJECT a hand-rolled
                     cross-platform integrator as the default (the Reanimated model — inverse
                     of the law) and the invented {damping,mass,stiffness} uniform spring.
- Reference (HOW):   references/reanimated spring.ts/springUtils.ts (velocity-carry +
                     opposing-inertia clip — the retarget logic to mirror in FxSpring;
                     REJECT its worklet/JSI mechanism and uniform iOS/Android feel);
                     references/react-native SpringAnimationDriver.cpp (retarget drops
                     velocity — a bug, not a template).
- Guides:            Writing Style Guide (the doc edits), Contributing Guide (merge bar),
                     subtask protocol
- Rules gate:        #1 (native owns frames — drivers are native; source = zero per-frame JS),
                     #2 (the law — per-platform spring authoring, platform-tuned defaults),
                     #4 (never host RN content — the tiered slicing exists to honor this),
                     #7 (no JSI/C++ — discrete targets only cross the boundary)
- Device-verify:     none for ratification. RT-016 (retarget proof) stays device-pending,
                     owned by U6-002; MOT-001/MOT-002 (catalog values, tune constants) stay
                     device-pending. The clock/source drivers get their own build tasks.
- Done when:         the driver vocabulary and the three dispositions are true in
                     02/40/41/42/34/structure.*; MOT-003/005/006/009 flipped to resolved;
                     MOT-007 reframed (stays deferred); RT-016 wording updated (stays
                     device-pending); the wip docs folded and removed.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [ ] implemented — N/A (ratify: decision in source docs)
- [ ] commented — N/A
- [ ] headless-done — N/A (docs-only; no code)
- [ ] device-verified — N/A (RT-016/MOT-001/MOT-002 device gates stay with their owners)
- [x] docs-closed — see Done when (all items satisfied 2026-06-10)
- [ ] reviewed
- [ ] merged

## Proof

- headless: N/A — no code; docs-only.
- device: N/A — ratification. RT-016 stays with U6-002; MOT-001/002 stay device-pending.
- docs: `02` Decision #14 + content-rung floor; `40` Decision #7 + open questions; `41`
  Decisions #10–#12 + open questions; `42` Decision #6 + open questions; `34` §Findings —
  the iOS spring disposition + touch-caveat flip + reduce-motion spring gate;
  `structure.ios.md` / `structure.android.md` `motion` content-target mechanics; `55` +
  `data-layer.md` `Transition.spring` shape; decision-ledger MOT-003/005/006/009 →
  resolved, MOT-007 reframed, RT-016 reworded.

## Scope

### In scope (this task)

- Record the driver vocabulary (`target`/`clock`/`source`) and the tiered slicing in
  `02`/`40`/`41`/`42`.
- Replace the cross-platform `{damping,mass,stiffness}` spring with per-platform native
  spring authoring (`41` decision; `55`/`data-layer` consumers reconciled).
- Pin the maintainer-ratified iOS spring dispositions (17 floor; render-server-first,
  integrator-on-retarget) in `34` + `structure.ios.md`; confirm and pin the Android stock
  retarget (`animateToFinalPosition`) + the reduce-motion spring gate in
  `structure.android.md` + `34`.
- Close MOT-003, MOT-005, MOT-006, MOT-009; reframe MOT-007 (stays deferred); update
  RT-016 wording (stays device-pending).
- Fold and remove the wip docs; move the U6-001 preflight into `tasks/U6-001/`.

### Out of scope

- Building any driver (`target`+`clock` core → U6-001+; `source` → V2 tasks; effect-uniform
  animation → the hosted lane's tasks).
- The `clock`/`source` manifest rung schema — lands with their build tasks.
- Closing RT-016 (U6-002, device), MOT-001/MOT-002 (device), RT-013 (U5-001), MOT-008
  (BYO envelopes — untouched).
- The per-platform default catalog values (`data-layer` §3 — device-pending, MOT-001).

## Done when

- `02` records the driver-vocabulary generalization (Decision #14) and the content rung
  reads `os:17` with the render-server-first note.
- `40` resolves `transition` scope and the native-source-read (the `source` driver, V2,
  tiered) — Decision #7; regime-C routes renamed to the driver vocabulary.
- `41` records drivers-beneath-the-four-props, per-platform spring authoring, and the V1
  primitive-set resolution (Decisions #10–#12).
- `42` records presence as a `target`-driver orchestration and extended states as `clock`
  timelines (V2) — Decision #6.
- `34` + `structure.{ios,android}.md` carry the ratified spring mechanics and the
  touch-caveat flip.
- MOT-003/005/006/009 are true in their owning source docs and flipped to `resolved`.
- `progress.md` DOC-009 moves to `ready-to-merge`.
