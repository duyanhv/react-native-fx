# DEF-003 — portal / root overlay placement (SURF-007)

Type: `ratify` · State: `merged` · Device: `no` · Consumes: — · Closes: SURF-007 ·
Blocked by: — (V2)

## The decision (Option A, maintainer-ratified 2026-06-14)

**fx ships no portal primitive; overlay placement stays the app's job. fx guarantees
portal/`Modal` coexistence instead.** A portal is generic React-tree teleportation — pure JS,
untouched by fx's native runtime — and the ecosystem already solves it (RN `Modal`'s native
overlay window; `@gorhom/portal` and the like). Building `Fx.Portal` would duplicate those and
breach rule #5 (fx wraps any UI kit; it isn't one) and rule #9 (fx reads layout, never owns tree
placement). The genuinely-missing artifact was never a primitive — it was the **coexistence
contract**: what fx must guarantee when `FxPresence` lives inside a portal/`Modal`. That is now
pinned.

The rejected alternative (Option B — a thin `Fx.Portal`/overlay helper in V2) was declined: it's
convenience the app already has (place `FxPresence` at root today), it duplicates mature libs,
and it would solve only the easy half — the anchored `menu`/`tooltip` case needs a child anchor
rect, which `33`/`05` flag as the per-child Expo-Modules boundary (the SPINE-010 trigger), not a
portal.

## Authority links

```
Subtask: ratify the portal/root-overlay question (SURF-007).
- Contract anchors:  54-presence.md Decision 4 + Open questions (the owning doc; "fx owns
                     motion, not placement"), 42-presence-and-lifecycle.md § scope ceiling
                     (whole-subtree destruction breaks the handshake — the same failure
                     mode), decision-ledger.md SURF-007.
- Decision:          ratify "app's job; no fx portal primitive; pin the coexistence
                     contract + the coordinator-placement invariant." Charter-consistent
                     (rules #5/#9, 54 Decision 4).
- Rules gate:        #5 (fx is not a UI kit), #9 (reads layout, never owns placement).
- Device-verify:     none — pure ratify (no code, no device gate).
- Done when:         SURF-007 closed in 54 (the owning doc) + the ledger; the coexistence
                     contract + invariant pinned in 54; 42 cross-references it.
```

## What was recorded (docs-closed)

- `54-presence.md` — new § Placement & portal coexistence (the contract + the
  coordinator-placement invariant); Decision 4 extended (no `Fx.Portal`; coexistence instead);
  the Portal open question resolved.
- `42-presence-and-lifecycle.md` — the scope-ceiling "drive exit with `visible`" consequence now
  notes the same rule governs portals (portal the output, never the coordinator).
- `decision-ledger.md` — SURF-007 `deferred` → `resolved`.

## Lifecycle

- [x] spec'd (planner, 2026-06-14)
- [x] rules-gated (#5/#9 — the decision honors them)
- [x] ratified (maintainer chose Option A, 2026-06-14)
- [x] docs-closed (planner, 2026-06-14 — `54` + `42` + ledger; SURF-007 resolved)
- [x] reviewed (planner, 2026-06-14 — no separate doc; the decision is self-evident and
      recorded in the owning source doc, per the DOC-002/003/005 ratify convention)
- [x] merged (maintainer-authorized, 2026-06-14 — on integration/0.1.x, this commit)

## Proof

- **headless:** N/A (no code).
- **device:** N/A (pure ratify).
- **docs:** SURF-007 true in its owning doc (`54` § Placement & portal coexistence + Decision 4)
  and closed in the ledger.
