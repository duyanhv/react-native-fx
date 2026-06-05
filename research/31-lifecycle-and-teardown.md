# Runtime: lifecycle & teardown
Status: researched
Phase: v2 (the owned GPU loop lives on the `expo-view` substrate)
Feeds: 50-api-and-presets.md
Owns: the lifecycle contract (cross-platform). Mechanics → structure.{ios,android}.

## Why this matters

An `expo-view` shader surface **owns a GPU surface and a native frame loop** — real
resources with real lifetimes. That makes lifecycle non-optional: the loop must pause
off-window and backgrounded, and teardown must be idempotent and leak-free. (Hosted
effects don't own a loop in the same way — SwiftUI/Compose manage it — so this layer
is specific to the interactive substrate.) This doc owns the cross-platform contract;
the Metal/`MTKView` resource specifics live in `structure.ios.md`.

## The owned-resource model

| Resource | Created | Released | Per-frame? |
|---|---|---|---|
| render surface (`MTKView`/equiv) | view init | view dealloc | — |
| device / command queue | once | teardown (or device-shared) | no |
| shader library | once, lazily | teardown | no |
| pipeline state (per shader id) | once, cached | teardown / evict | no |
| uniform storage | once | teardown | reused, not realloc'd |
| drawable + command buffer | every frame | autorelease drain | **yes — never stored** |

## Pause is mandatory

The loop runs **only when `window != nil` AND the app is foreground.** A GPU loop
running off-screen burns battery, and rendering to a drawable while backgrounded is
invalid (stalls/rejections). Two triggers, one switch:

- **Off-window (per-view)** — the attach/detach hook (`didMoveToWindow` /
  `onDetachedFromWindow`) flips the loop.
- **App background/foreground (shared)** — the module's
  `OnAppEntersBackground`/`OnAppEntersForeground` fan out to a **weak registry** of
  live surfaces.

Combine into one `updatePausedState()`. On resume, re-acquire a fresh drawable each
frame — never cache one across the pause.

## Idempotent teardown

Order, most-transient → most-owned, **safe to run twice** (runs from both destroy and
a recycling reset):

1. **Stop the loop first** (pause + drop the delegate / invalidate the display link)
   so no in-flight frame touches a half-freed pipeline.
2. Per-frame transients — nothing to free (autorelease-managed; the rule is *don't
   store them*).
3. Release pipeline cache + library + uniform storage.
4. Release queue, then device, last (or never, if device-shared).

**Retain-cycle discipline:** rely on the weak view delegate; hold the view weakly from
any separate renderer; **always invalidate a `CADisplayLink`** on off-window and
teardown; `[weak self]` in every closure; weak refs in the app-state registry. *If the
destructor never fires, you have one of these cycles.*

## Recycling

Fabric recycles host views (default-on iOS), so a rebound view carries stale GPU
state. The contract: make prop-application **fully self-sufficient** (resolve the
complete shader+uniform config from current props, never assume prior state); on
rebind **keep** the expensive identity-stable resources (device/queue/library, and the
same-id pipeline) but **reset** per-bind state (uniforms, animation clock, paused
flag). Don't opt into Android `enableViewRecycling` in V1.

## Decisions

1. **The interactive surface owns its GPU loop**; pause is **mandatory** — runs only
   when on-window AND foreground, via one `updatePausedState()`.
2. **Persistent objects once, reused** (device/queue/library/pipeline cached);
   per-frame transients never stored.
3. **Idempotent teardown order** (stop loop → release pipeline/library/uniforms →
   release queue/device); safe to run twice.
4. **Retain-cycle discipline** — weak delegate, weak view-from-renderer, invalidate
   display links, `[weak self]`, weak registry.
5. **Recycling: self-sufficient prop application**; keep heavy resources across a
   same-id rebind, reset per-bind state; no Android view-recycling opt-in in V1.
6. **No native flatten opt-out needed** — a custom host view is never layout-only;
   only a JS-side children container that must survive carries `collapsable={false}`.

## Open questions

- **Drawable-on-resume (needs-device)** — confirm fast background↔foreground toggles
  yield a fresh drawable with no stall.
- **One queue per view vs device-shared singleton (needs-device)** — measure churn
  under many simultaneous surfaces.
- **On-demand vs continuous for the press/uniform path** — does one frame per
  touch/`setUniform` feel responsive, or do interactive shaders need a short burst?
- **Expo per-view recycling reset hook** — does the pinned SDK expose a
  `prepareToRecycleView` equivalent to route to the reset? (`53`).

## Sources

- `_legacy/06-lifecycle-and-teardown.md` — the full lifecycle findings (owned-resource
  table, MTKView loop modes, pause hooks, teardown order, retain cycles, recycling).
- `structure.ios.md` — the `MTKView`/Metal resource specifics and code.
- `30-interaction-and-gestures.md` — the recognizer this loop reads uniforms from.
