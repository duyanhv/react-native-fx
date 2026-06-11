# Runtime: view state & the presence handshake
Status: researched (design) · source-audit + U7-001 preflight pass · device proof pending
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
- **Stranded-exit guard** — completion events deliver **only while the native view is
  mounted**: Expo's view-event dispatcher silently drops events for a dead view (no queue, no
  will-unmount hook). If the native host detaches (host ref → null) while the JS FSM is
  `exiting` and JS did not release — a Fast Refresh remount is the real case — JS releases the
  retained child immediately and expects no event. Production never reaches this path while
  the stay-mounted contract (`54`) holds. (U7-001 preflight.)
- **Snapshot semantics** — the retained child is the element tree captured when `visible`
  flipped false; later re-renders do **not** propagate into the exiting child. Envelope
  config (`preset`/`motion`/`transition`) latches at phase start; a mid-flight change applies
  from the next phase, never restarts the current one — `visible` retargets are the only
  mid-flight FSM edges. (U7-001 preflight.)
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
  thing it animates. → a stated contract in `54`. The corollary is presence's **scope
  ceiling**: when the *whole subtree* dies at once — a navigator pop, a parent conditional
  above the coordinator, list-cell eviction — the coordinator dies with the child and the
  exit cannot play (the `Teardown-during-exit` invariant above is exactly this path: it
  cancels, releases, and emits nothing). fx accepts this rather than a native-held model
  with a Fabric commit hook (rule #7). `42` §The scope ceiling states it as a contract.
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
- **JS retention is the platform's own semantics, not an emulation** — Fabric's differ emits
  `Remove`/`Delete` only when a child leaves the rendered output, so a ref-retained child
  produces **no mutation at all**; the only post-commit deferral seam
  (`MountingOverrideDelegate`) is C++-registered inside Fabric and unreachable from Expo
  Modules. The handshake therefore needs no forbidden mechanism — and an offscreen hide
  lowers to an `Update` (`view.hidden`), never a `Remove`, so suspension can never masquerade
  as unmount. (U7-001 preflight, `7-implementation/tasks/U7-001/preflight.md`.)

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
- ~~How does the coordinator behave when the view unmounts for a *non-animation* reason
  (parent unmounts, app backgrounds mid-exit)?~~ **Resolved (U7-001 preflight):** teardown
  takes the `Teardown-during-exit` invariant plus the stranded-exit guard — cancel, release,
  emit nothing, never leak. Backgrounding is not teardown; the loop-pause stays owned by `31`.
- ~~What is the re-entrancy model for `tune` / `transition` changing *during* a
  transition?~~ **Resolved (U7-001 preflight):** config latches at phase start; a mid-flight
  change applies from the next phase (the snapshot-semantics invariant). `visible` retargets
  are the only mid-flight edges.

### React-semantics edge cases (resolved at spec time — U7-001 preflight)

The coordinator reconciles a *native* lifecycle with React's tree, so React's own lifecycle
quirks are part of the contract. Reanimated accumulated handling for each of these; fx
answered them at spec time (the U7-001 preflight,
`7-implementation/tasks/U7-001/preflight.md`, 2026-06-11). Each row carries the
implementation rule the FSM adopts; each remains a U7-002 device row.

| case | what React does | the rule fx adopts (U7-001 preflight) |
|---|---|---|
| **StrictMode** (dev) | mounts → unmounts → remounts every component once | **no guard needed** — the FSM is prop-driven, and StrictMode's double effect invocation does not remount host views; JS effects stay idempotent (subscribe/unsubscribe only) and never imperatively trigger enter/exit. Reanimated ships no StrictMode guard either — only cancellation resilience |
| **Fast Refresh** | remounts the subtree on a code edit, possibly mid-transition | the **stranded-exit guard** (invariants, above): a host detach while `exiting` releases the retained child immediately, no event expected — dev-only. Reanimated cancels and accepts the same dev limitation |
| **Suspense** | hides a subtree offscreen (does not unmount) when a sibling suspends | **a hide is a hold** — presence keys exclusively off `visible`; a hide lowers to an `Update` (`view.hidden`), never a `Remove`, so no FSM edge exists for it structurally |
| **re-render mid-exit** | a parent re-render while `exiting` may change the child's props or identity | **snapshot semantics + latched config** (invariants, above) — re-renders do not propagate into the exiting child; config changes apply from the next phase. Reanimated's analogue merges the new target into the running animation, never restarts |
| **list eviction** (FlatList / recycler) | virtualizes a row off-screen; the cell recycles | **structurally immune** — eviction is whole-subtree teardown (the `42` ceiling): cancel, release, emit nothing. fx never infers exit from removal, so phantom exits cannot fire; Reanimated needs `skipExiting` precisely because it does |

fx adopts the *model* these answers imply (deferred unmount, interrupt-as-retarget), never
Reanimated's worklet runtime or commit hook (rule #7). The list-eviction row also ties to the
scope ceiling (`42`): an evicted cell is whole-subtree teardown, so its exit cannot animate.

## Open questions

- **Falsification test for the boundary decision (gates `0-spine/05`).** This doc owns
  the identity/state half: can Expo Modules keep **native object identity** (the
  coordinator) **across Fabric commits / re-renders**, and run the **deferred-unmount
  handshake purely on async events** (no synchronous JS↔native read)? If identity can't
  be held or the handshake needs a synchronous channel, that is a concrete trigger to
  reconsider Nitro/JSI. Until then, the Expo Modules default holds. **The U7-001 preflight
  reinforces the handshake half from source:** a retained child generates no `Remove`
  mutation (Fabric's differ) and Expo view events deliver while the view is mounted — no
  synchronous channel is needed. Device proof remains (SPINE-009).
- Whether this generalizes beyond presence to a general "native-eased declarative state"
  primitive, or stays presence-specific in V1.

## Sources

- Conversation: the two hard problems (layout → `33`, JS state → here); the discrete
  handshake; the no-other-lib decision.
- `40-motion-reactivity-and-data-flow.md` (regimes, discrete events),
  `31-lifecycle-and-teardown.md` (teardown), `42-presence-and-lifecycle.md` (semantics).
