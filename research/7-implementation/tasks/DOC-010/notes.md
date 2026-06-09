# DOC-010 notes

## 2026-06-09 — spec'd + executed (docs-closed)

### What changed and why

- **Created `tasks/DOC-010/README.md`** — subtask spec with authority links from the ledger
  (MOT-010), blueprint, and cited research docs (41, 42, 34).
- **`41-motion-vocabulary.md`** Decision #9: ratified the V1 reduce-motion policy — instant
  degradation (0-duration, snap to target) when the OS reduce-motion / animation-scale setting
  is active. iOS `UIAccessibility.isReduceMotionEnabled`, Android
  `TRANSITION_ANIMATION_SCALE`/`ANIMATOR_DURATION_SCALE` = 0.0. Opacity-only degradation is a
  deferred V2 refinement.
- **`42-presence-and-lifecycle.md`** new §Reduce-motion (between §The envelope and
  §Decisions): defines how the enter and exit phases degrade to instant under reduce-motion —
  all animated channels (`translateX/Y`, `scale`, `rotate`, `opacity`) to identity in a single
  frame; `onTransitionEnd` fires immediately. Presets and explicit `motion` overrides are both
  subject to this degradation.
- **`34-animation-driver.md`** new §Findings — reduce-motion (before §Research questions):
  notes that the driver checks the OS setting at the start of each animation envelope and
  degrades to 0-duration when active. References the policy recorded in `41`/`42`.
- **`decision-ledger.md`** MOT-010 → `resolved`: policy recorded in `41`, `42`, `34`; close
  condition satisfied.
- **`progress.md`** DOC-010 moved to `ready-to-merge`; detail block added with checklist and
  proof.

### Unverified claims

None. This is a policy ratification — no implementation or device proof required. The driver
implementation and device verification are owned by U6-001 (FxAnimationDriver, v2).

## Next

Next: review + merge (human gates).
