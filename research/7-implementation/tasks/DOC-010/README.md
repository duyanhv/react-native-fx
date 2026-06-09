# DOC-010 — reduce-motion policy ratification

3-motion · type: `ratify` · state: `in-progress` · device: no
Consumes: — · Closes: MOT-010 · Blocked by: —

> Closes MOT-010: the motion domain has no policy for honoring OS reduce-motion /
> animation-scale settings. This task decides the policy, writes it into the three
> owning source docs (`41` motion vocabulary, `42` presence & lifecycle, `34`
> animation driver), and closes the ledger row.

## Start here

1. **This file** — the work order, authority links, scope, and proof.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle and closure rules.
3. **`research/7-implementation/tasks/DOC-010/notes.md`** — current handoff.
4. **Per-gate guides:**
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - all gates → `agents/session-protocol.md`

## Authority links

```
Subtask: reduce-motion policy ratification (no blueprint unit — cross-cutting)
- Contract anchors:  41-motion-vocabulary.md (the law, decisions),
                      42-presence-and-lifecycle.md (the envelope, presets),
                      34-animation-driver.md (the driver contract)
- Decision:          Ratify V1 reduce-motion policy: instant degradation (0-duration,
                      snap to target). The driver checks the OS setting at the start
                      of each animation envelope and sets duration to 0 when active.
                      Opacity-only degradation is deferred to V2.
- Reference (HOW):   iOS UIAccessibility.isReduceMotionEnabled; Android
                      Settings.Global.TRANSITION_ANIMATION_SCALE. Standard platform
                      accessibility APIs — no third-party dependency.
                      REJECT: per-frame apply/don't-apply decisioning; driver-level
                      duration scaling that keeps partial animation.
- Guides:            Writing Style Guide (the doc edits), Contributing Guide
                      (merge bar), subtask protocol
- Rules gate:        #1 (native owns frames — the driver owns this check natively,
                      no JS per frame), #9 (motion driver does not write layout)
- Device-verify:     none for ratification. The policy is a driver contract;
                      implementation + device proof are owned by U6-001
                      (FxAnimationDriver, v2).
- Done when:         41, 42, and 34 all record the reduce-motion policy; MOT-010 is
                      true in its source docs and flipped to resolved.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [ ] implemented — N/A (ratify: decision in source docs)
- [ ] commented — N/A
- [ ] headless-done — N/A (docs-only; no code)
- [ ] device-verified — N/A (policy, not implementation)
- [ ] docs-closed — `41` Decision #9, `42` §Reduce-motion, `34` §Reduce-motion;
       MOT-010 → resolved
- [ ] reviewed
- [ ] merged

## Proof

- headless: N/A — no code; docs-only.
- device: N/A — policy ratification. Implementation + device proof owned by U6-001.
- docs: `41` moti`on vocabulary (new Decision #9), `42` presence & lifecycle
  (new §Reduce-motion), `34` animation driver (new §Findings — reduce-motion);
  decision-ledger MOT-010 → resolved.

## Scope

### In scope (this task)

- Decide the V1 reduce-motion policy: instant degradation (0-duration, snap to target).
- Record the decision in the three owning source docs: `41`, `42`, `34`.
- Close MOT-010 in the decision ledger.

### Out of scope

- Implementing the reduce-motion check in the animation driver (U6-001, v2).
- Opacity-only degradation — deferred V2 refinement.
- Per-frame reduce-motion toggling or runtime preference changes that restart
  mid-flight animations.

## Done when

- `41-motion-vocabulary.md` records the reduce-motion policy as Decision #9.
- `42-presence-and-lifecycle.md` records the envelope behavior under reduce-motion
  (new §Reduce-motion after §The envelope).
- `34-animation-driver.md` notes the driver honors the OS setting (new §Findings).
- MOT-010 is true in its source docs and flipped to `resolved`.
- `progress.md` DOC-010 moves to `ready-to-merge`.
