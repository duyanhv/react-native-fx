# Runtime: view state & the presence handshake
Status: researched (design) · source-audit pass · device proof pending
Phase: v2
Feeds: 42-presence-and-lifecycle.md, 33-shadow-nodes-and-layout.md, structure.{ios,android}

## Why this matters

This is the second problem `FxPresence` surfaced: **JS owns mount/unmount, native owns
the animation clock.** When `visible` flips false, React wants to unmount the child
*now*, but the exit animation needs it alive. This doc owns the state machine that
reconciles React's declarative tree with the native animation lifecycle.

## The handshake

`FxPresence` is not a dumb wrapper — it is a stateful coordinator:

```
visible → false
  JS: keep children mounted, set native target = exiting
  native: play exit envelope (interruptible)
  native: onTransitionEnd
  JS: now release the child to unmount
```

It works **because presence is discrete** — JS sets a target, native runs the envelope,
a single completion event comes back (regime B of `40`). It is not a per-frame stream
in either direction. A mid-flight re-toggle (`visible` back to true) retargets the
native envelope rather than restarting, so the JS state and the native state never
diverge into a glitch.

This is the seam to defend: the moment someone wants a gesture-*scrubbed* reveal (regime
C), it does not belong here — that is a different mechanism, post-this.

## The lifecycle state machine (formal)

The handshake is a **finite state machine**, drawn so the edge cases are explicit rather
than prose. There are **two coupled FSMs** synced by the handshake (`04`): the **native
lifecycle FSM** (`FxPresenceCoordinator` — owns frames) and the **JS mount-retention FSM**
(`FxPresence` — owns the tree).

```
        visible:true                 enter done
 absent ───────────────▶ entering ───────────────▶ present
   ▲                        │  ▲                       │
   │ native: exit done →    │  │ visible:true          │ visible:false
   │ JS: release child      │  │ (retarget)            │
   │                        ▼  │                       ▼
   └──────────────────────  exiting  ◀────────────────┘
                       visible:false (from present)
```

**Native lifecycle FSM** — states: `absent · entering · present · exiting`.

| from | event | to | action |
|---|---|---|---|
| `absent` | `visible:true` | `entering` | play enter (or → `present` if `appear=false`); **JS** owns the mount — native does not touch the tree |
| `entering` | enter completes | `present` | emit `onTransitionEnd{enter, finished:true}` |
| `entering` | `visible:false` | `exiting` | **retarget** from current value (no restart), `interrupted:true` |
| `present` | `visible:false` | `exiting` | play exit |
| `exiting` | exit completes | `absent` | emit `onTransitionEnd{exit, finished:true}` → **JS** releases the child to unmount |
| `exiting` | `visible:true` | `entering` | **retarget** back toward present from current value |
| `present`/`absent` | same value | (self) | no-op |

**Guards / invariants:**

- **Interrupt = retarget, never restart** — every mid-flight transition eases from the
  *present animated value* and emits `interrupted:true` (`40`).
- **Deferred unmount** — the child stays mounted through `exiting`; it is released *only* on
  `exiting → absent`. The JS FSM keeps it in a ref until then.
- **Teardown-during-exit** — split by whether a JS receiver is still alive. A cancel **while
  the component lives** (a `visible` retarget) emits `interrupted:true`, per the FSM rows
  above. But if the subtree is destroyed for a *non-animation* reason while `exiting` (parent
  unmounts, app teardown), the **JS receiver is gone**, so the coordinator cancels in-flight
  animation, **releases its retained handle** (React unmounts the subtree), and **emits
  nothing** — there is no live `FxPresence` to hear an event. Either way it **never leaks the
  retained-exiting child** (`31`).
- **`appear=false`** — initial `visible:true` enters at `present` directly (skips `entering`).

The **JS mount-retention FSM** is the mirror: `rendered` (while `visible` *or* `exiting`) →
`released` (on the `exit done` event). The two never diverge because the only cross-channel
messages are the discrete `visible` prop (down) and `onTransitionEnd` (up).

## Findings — deferred unmount, and the "stay mounted" rule

The web's `AnimatePresence` pattern transfers directly: keep the exiting child in a
**React ref** across the render that removed it, play the native exit, then release it to
unmount. Two requirements fall out and become **API constraints** on `FxPresence`:

- **`FxPresence` must stay mounted to animate exit.** Drive exit with the `visible`
  prop — **not** by conditionally rendering `FxPresence` itself: `{show && <FxPresence/>}`
  unmounts the coordinator before it can animate. The coordinator must live *above* the
  thing it animates. → a stated contract in `54`.
- **Stable child key.** The wrapped content needs an identity stable across renders so the
  coordinator can match "same child, now exiting."

The handshake — `visible→false` → keep mounted → native exit → `onTransitionEnd` →
unmount — is entirely **discrete async events**, no synchronous JS↔native read, which is
exactly why it stays inside the Expo Modules boundary (`05`). Interruptibility lives in the
native envelope (`34`): a re-toggle retargets, it does not restart.

**Verified against source (`references/`):**
- **Coordinator identity holds** — Expo `shouldBeRecycled() = false` (views are never
  recycled), so the native object persists across Fabric re-renders. This **answers the
  `05` falsification test for the identity/state half — a source-audit PASS (device proof
  pending).**
- **The deferred-unmount pattern is confirmed sound** — Reanimated implements exactly this:
  defer the `Remove`/`Delete` mutation, keep the view alive, track `WAITING → ANIMATING →
  DEAD`, and emit the final removal via a completion callback. fx adopts this model (the
  native side of the handshake); it does **not** adopt Reanimated's worklet runtime.

## What JS may observe (the exposure model)

fx owns the native presentation state (the lifecycle FSM, the animated frame). JS sees it
**only** as semantic events or async snapshots, never as a live frame stream (`04` decision
7, `40`):

| Exposed (events / async snapshot) | Not exposed |
|---|---|
| `phase` (enter/hold/exit), `onStateChange` | per-frame transform/opacity |
| `loaded` / `error` | the in-flight animation value |
| the resolved lowering (which rung) | the frame clock |
| the interrupt result (retargeted / completed) | |
| a measured frame, on demand (`snapshot()`) | |

So the coordinator's state machine is native and authoritative; JS learns *outcomes*
(transitions completed, interrupted, failed), not *frames*. This is what keeps the boundary
async and JSI-free (`05`).

## Research questions

- What is the exact JS↔native protocol for deferred unmount, and what guarantees
  ordering of `onTransitionEnd` under rapid `visible` toggles?
- Where does the source of truth live — is `visible` authoritative in JS with native as
  a follower, and how is the follower kept consistent on interrupt?
- How does the coordinator behave when the view unmounts for a *non-animation* reason
  (parent unmounts, app backgrounds mid-exit)? Teardown must not leak (ties to `31`).
- What is the re-entrancy model for `tune` / `transition` changing *during* a transition?

## Open questions

- **Falsification test for the boundary decision (gates `0-spine/05`).** This doc owns
  the identity/state half: can Expo Modules keep **native object identity** (the
  coordinator) **across Fabric commits / re-renders**, and run the **deferred-unmount
  handshake purely on async events** (no synchronous JS↔native read)? If identity can't
  be held or the handshake needs a synchronous channel, that is a concrete trigger to
  reconsider Nitro/JSI. Until then, the Expo Modules default holds.
- Whether this generalizes beyond presence to a general "native-eased declarative state"
  primitive, or stays presence-specific in V1.

## Sources

- Conversation: the two hard problems (layout → `33`, JS state → here); the discrete
  handshake; the no-other-lib decision.
- `40-motion-reactivity-and-data-flow.md` (regimes, discrete events),
  `31-lifecycle-and-teardown.md` (teardown), `42-presence-and-lifecycle.md` (semantics).
