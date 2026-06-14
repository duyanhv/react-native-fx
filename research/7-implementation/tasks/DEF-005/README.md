# DEF-005 — `edge`/`origin` partial-override sugar (MOT-004)

Type: `ratify` · State: `merged` · Device: `no` · Consumes: — · Closes: MOT-004 ·
Blocked by: — (V2)

## The decision (Option A, maintainer-ratified 2026-06-14)

**Rejected. No top-level `edge`/`origin` partial-override sugar ships.** `FxPresence` keeps the
binary model: `preset` for the full platform-native shape *and* timing, or an explicit `motion`
map for a cross-platform shape override (platform timing still falls back to the preset/default
driver unless `transition` overrides it).

Three grounds (all charter-level):
- **Blurs the shape-native law.** The law is a clean dichotomy — platform default *or* explicit
  uniform override. A top-level `edge=` is a fuzzy hybrid ("the platform's shape, but relocated")
  with no clean meaning across iOS (banner from top) vs Android (snackbar from bottom).
- **Duplicates the `motion` map.** `motion={{ enter: fx.motion.edgeIn({from:'bottom'}), exit:
  fx.motion.edgeOut({to:'bottom'}) }}` already delivers "platform timing + chosen edge" — the
  map fixes *shape* only; timing still falls back to the platform default. The sugar would be
  pure verbosity reduction, not a new capability.
- **Conflicts with no-implicit-reverse.** A single `edge="bottom"` spanning both phases implies
  exit reverses enter — which `41` Decision 8 forbids; respecting it collapses the sugar back
  into a per-phase map.

The recipe (keep the platform shape, change the edge) is pinned in `41` Decision 14 + `54`.

## Authority links

```
Subtask: ratify the edge/origin partial-override question (MOT-004).
- Contract anchors:  41-motion-vocabulary.md (the owning doc — the shape-native law, the
                     preset/motion binary, no-implicit-reverse Decision 8, the deferred
                     partial-override open question), 54-presence.md (the FxPresence
                     surface + the motion-map example), 50-api-and-presets.md (the prop
                     split), decision-ledger.md MOT-004.
- Decision:          ratify "reject — keep the preset-or-motion binary; no edge=/origin=
                     sugar." Charter-consistent (the law; no-implicit-reverse).
- Rules gate:        rule #2 (agnostic names, platform-native defaults — the law).
- Device-verify:     none — pure ratify (no code).
- Done when:         MOT-004 closed in 41 (the owning doc) + the ledger; the edge-relocation
                     recipe pinned; no sugar ships.
```

## What was recorded (docs-closed)

- `41-motion-vocabulary.md` — new Decision 14 (no `edge`/`origin` sugar; the binary stays; the
  pinned recipe + the platform-timing clarification); the partial-override open question
  resolved-rejected.
- `54-presence.md` — a note near the motion-map example: relocate a preset's edge through
  `motion`, not `edge=`/`origin=`; enter/exit specified separately (no implicit reverse).
- `50-api-and-presets.md` — the `motion` prop row notes it is the sole shape-override channel;
  no partial top-level shape props.
- `decision-ledger.md` — MOT-004 `deferred` → `resolved`.

No source code touched (the decision is to not build).

## Lifecycle

- [x] spec'd (planner, 2026-06-14)
- [x] rules-gated (rule #2 — the law; the decision honors it)
- [x] ratified (maintainer chose Option A — reject, 2026-06-14)
- [x] docs-closed (planner, 2026-06-14 — `41` Decision 14 + open question; `54`; `50`; ledger
      MOT-004 resolved)
- [x] reviewed (planner, 2026-06-14 — no separate doc; self-evident ratify, per the
      DOC-002/003/005 convention)
- [x] merged (maintainer-authorized, 2026-06-14 — on integration/0.1.x, this commit)

## Proof

- **headless:** N/A (no code).
- **device:** N/A (pure ratify).
- **docs:** MOT-004 true in its owning doc (`41` Decision 14) and closed in the ledger.
