# DEF-004 — `Fx.Stack` JSX-compound skin (SURF-008)

Type: `ratify` (reframed from `implement` — the decision is to *not* build) · State:
`merged` · Device: `no` · Consumes: — · Closes: SURF-008 · Blocked by: — (V2)

## The decision (Option A, maintainer-ratified 2026-06-14)

**Rejected. fx ships no `Fx.Stack`, no `Fx.Layer`, no JSX compound over `EffectStack`. The
`fx.effect.*` builder is the stack API.** DEF-004 was specced as an `implement` (build the JSX
compound); binding to the contract surfaced that the build would overturn two ratified decisions,
so the task resolved as a ratify-reject instead.

Why the JSX compound is not honest here:
- An `EffectStack` is **data** — `fx.effect.*` builds it, `<Fx effect={stack}>` consumes it, and
  the resolved record crosses the bridge **once**; the layers composite inside **one** `<Fx>`
  native surface (`55` Decision 1). A `Fx.Stack`'s layer-children would be *configuration*, not
  separate native views.
- That is exactly what **`50` Decision 4** forbids ("compound only for real native layers; the
  moment a subcomponent would just carry configuration, it must be a prop").
- And it would reintroduce the **`FxLayer`** that **`55` Decision 6** explicitly rejected ("`<Fx>`
  is one component … no separate `FxLayer`").
- It matches the **`Fx.Scroll` precedent (DEF-014)**, where composited content is a *data* prop,
  not JSX children, for the same reason.

The rejected alternative (Option B — ship `Fx.Stack` as acknowledged JSX sugar) was declined:
the trigger was "build on real demand," and no concrete case was found where the builder chain
fails developers; the DX-readability argument did not justify a second way to express the
identical `EffectStack` plus a Decision-4/Decision-6 carve-out.

## Authority links

```
Subtask: ratify the Fx.Stack JSX-compound question (SURF-008).
- Contract anchors:  55-composition-chain.md (the owning doc — EffectStack + the builder;
                     Decision 6 "no separate FxLayer"; the JSX-compound open question),
                     50-api-and-presets.md Decision 4 (props by default; compound only for
                     real native layers), decision-ledger.md SURF-008. Precedent: DEF-014
                     (Fx.Scroll as data-not-children).
- Decision:          ratify "reject — the fx.effect.* builder IS the stack API; no
                     Fx.Stack/Fx.Layer." Charter-consistent (50 D4, 55 D6).
- Rules gate:        the surface-honesty discipline (50 D4); rule #5 (fx is not a UI kit).
- Device-verify:     none — pure ratify (no code).
- Done when:         SURF-008 closed in 55 (the owning doc) + the ledger; no JSX-compound
                     code ships.
```

## What was recorded (docs-closed)

- `55-composition-chain.md` — new Decision 8 (no JSX compound; the builder is the stack API);
  the JSX-compound open question resolved-rejected.
- `decision-ledger.md` — SURF-008 `deferred` → `resolved` (rejected).

No source code touched (the decision is to not build).

## Lifecycle

- [x] spec'd (planner, 2026-06-14)
- [x] rules-gated (`50` D4 / `55` D6 — the decision honors them)
- [x] ratified (maintainer chose Option A — reject, 2026-06-14)
- [x] docs-closed (planner, 2026-06-14 — `55` Decision 8 + open question; ledger SURF-008 resolved)
- [x] reviewed (planner, 2026-06-14 — no separate doc; self-evident ratify, per the
      DOC-002/003/005 convention)
- [x] merged (maintainer-authorized, 2026-06-14 — on integration/0.1.x, this commit)

## Proof

- **headless:** N/A (no code).
- **device:** N/A (pure ratify).
- **docs:** SURF-008 true in its owning doc (`55` Decision 8) and closed in the ledger.
