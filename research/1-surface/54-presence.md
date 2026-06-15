# Surface: FxPresence
Status: researched (API) · built + handshake device-verified (U7-001, 2026-06-12) · catalog magnitudes device-pending (MOT-001/U7-002)
Phase: v1 (API) · v2 (the owned runtime behind it)
Feeds: the public package; consumes 42-presence-and-lifecycle, 41-motion-vocabulary, 55-composition-chain
Owns: the public `FxPresence` component (the consumer surface for content presence).

## Why this matters

`FxPresence` is the front door for content entrance/exit — the semantic layer of motion,
rendered as a component. It is a *component* (not a chain) because presence is **stateful
and wraps content**: it is driven by reactive `visible` state and must own the
mount/unmount lifecycle (keep children alive through the exit, then unmount). A builder
cannot defer unmount; only a wrapping component can.

## The prop surface

A platform-idiomatic `preset`, refined by `transition`, or overridden by an explicit
`motion` map (`50`'s prop language; the shape-native split, `41`). (`tune` — the fourth
knob — is deferred from the V1 surface, DOC-019; it resurrects with MOT-001.)

```tsx
// preset — fx resolves the platform-idiomatic shape + timing per OS
<FxPresence visible={open} preset="transient" />

// explicit motion map — fixes the shape cross-platform (opt-in uniformity)
<FxPresence
  visible={visible}
  motion={{                          // typed map: lifecycle phases (enter/exit)
    enter: fx.motion.edgeIn({ from: 'bottom' }),
    exit:  fx.motion.edgeOut({ to: 'bottom' }),
  }}
  transition={{ spring: 'native' }}  // Transition — timing/spring only (50)
  appear={false}                     // play enter on first mount when visible starts true? default true
  onTransitionEnd={(e) => …}         // { phase: 'enter' | 'exit' } — discrete back-channel (40)
  style={styles.transient}           // wrapper/placement style (the app owns placement)
>
  <MyToast />                       {/* YOUR component — fx wraps it, never replaces it */}
</FxPresence>
```

- **`preset` is the default; `motion` overrides it.** `preset` resolves the whole behavior
  per platform (shape may diverge — the law); a `motion` map **fixes the shape
  cross-platform** (the only sanctioned opt-out). `visible` lives **only** on `FxPresence`.
- **`motion` is a typed map of *lifecycle phases*** — `{ enter, exit }` — not mounted states
  (that is `FxView`, `57`). Fallback: `userMotion[k] ?? presetMotion[k] ?? identity`; no
  implicit reverse (`41`).
- **Relocate a preset's edge through `motion`, not a top-level prop.** There is no
  `edge=`/`origin=` partial-override sugar (MOT-004/DEF-005); to keep the platform's shape but
  enter from a different edge, supply a `motion` map — it fixes the semantic shape while
  platform timing is preserved (unless `transition` overrides it). Specify **`enter` and `exit`
  separately** — there is no implicit reverse (`41` Decisions 8, 14):

  ```tsx
  <FxPresence
    preset="transient"
    motion={{ enter: fx.motion.edgeIn({ from: 'bottom' }), exit: fx.motion.edgeOut({ to: 'bottom' }) }}
  />
  ```
- **`transition` is expert timing** — it refines a `preset` *or* an explicit `motion`, and is
  never a shape. (`tune`, the intent-adjustment knob, would refine the same way but is deferred
  from the V1 surface — DOC-019.)
- **`children`** — see the children rule below; fx wraps them in one managed host view and
  transforms that (transform/opacity only ⇒ touch-safe).
- **`appear`** — whether `visible: true` on the *initial* mount plays the enter envelope or
  shows instantly. Default plays enter; opt out with `appear={false}`.

## Children — any children, one wrapper, no per-child motion

The rule falls out of `04`/`33`: **`FxPresence` accepts any React children and animates
one managed wrapper/container around them. There is no implicit per-child animation** —
per-child motion is the per-child-control case that `33`/`05` flag as the Expo-Modules
boundary trigger, and it is out of scope for presence. So the only open choice is
ergonomic, and it is decided: **accept fragments/arrays and wrap them** (one host view
either way) rather than forcing a single child — wrapping already normalizes arity, so the
stricter rule buys nothing.

## Lifecycle (what the component coordinates)

`visible` → true mounts (if needed) and plays **enter**; → false plays **exit**, then the
child unmounts — the deferred-unmount handshake owned by `35`. The native envelope is
interruptible, so a mid-flight re-toggle retargets rather than restarts. `onTransitionEnd`
fires per phase so JS can sequence (advance a queue, chain transient overlays).

**Drive exit with `visible`, not by conditionally rendering `FxPresence`** — `{show &&
<FxPresence/>}` unmounts the coordinator before it can animate (`35`). Keep `FxPresence`
mounted; flip `visible`. The wrapped child should carry a stable key.

**While exiting, the retained child is a snapshot** — the children captured when `visible`
flipped false; later re-renders do not propagate into the exiting child, and config changes
apply from the next phase (the `35` snapshot-semantics invariant, U7-001 preflight).

## Placement & portal coexistence (SURF-007, resolved DEF-003)

fx owns motion, not placement (Decision 4). Overlay content that must escape parent
clipping/z-order — `transient` banners, the deferred `modal`/`menu`/`tooltip` — is placed by
the **app**: at the root of its tree, via the app's existing portal (`@gorhom/portal` and the
like), or inside RN `Modal`, whose native overlay window is the platform's own root layer. fx
ships **no `Fx.Portal` primitive** — a portal is generic React-tree teleportation (pure JS,
untouched by the native runtime) and outside the presentation runtime's charter: rule #5 (fx
wraps any UI kit; it isn't one) and rule #9 (fx reads layout, never owns tree placement).

What fx **does** guarantee is **coexistence**: `FxPresence` works correctly when its rendered
output is teleported by a portal or hosted in a `Modal`, subject to one invariant.

**The coordinator-placement invariant.** The `FxPresence` coordinator must stay mounted *above*
the content it animates, so it can hold the exit and hear `onTransitionEnd` — the
deferred-unmount handshake (`35`). A portal that teleports only the *rendered children* while
leaving the `FxPresence` element mounted in place is compatible. A portal (or conditional
render) that unmounts `FxPresence` itself destroys the coordinator before it can animate — the
same failure mode as the `42` scope ceiling (whole-subtree destruction breaks the handshake).
So: **portal the children, never the coordinator**, and drive exit with `visible`, not by
unmounting `FxPresence` (Lifecycle, above).

This is a documentation + coexistence-verification contract, not a feature — the V2 surface
adds no placement API. Revisit only on the original ledger trigger, if app-owned placement
proves insufficient in practice.

## Decisions

1. **`FxPresence` is a stateful coordinator, not a dumb wrapper** — it owns deferred
   unmount via the `35` handshake.
2. **`preset` (platform-idiomatic) is the default; `motion` is the explicit cross-platform
   shape override.** `transition` refines either and is never a shape (`tune` would too, but
   is deferred from the V1 surface — DOC-019); `visible` is `FxPresence`-only. The
   shape-native split (`41`).
3. **Any children, one managed wrapper, no per-child motion** — accept fragments/arrays and
   wrap them in one transform target; per-child motion is the `33`/`05` boundary trigger,
   out of scope. Content motion is transform/opacity only (touch-safe).
4. **fx owns motion, not placement** — overlay positioning is the app's concern via `style`
   / app layout, the app's own portal, or RN `Modal`, **not** `FxPresence` and **not**
   `composition` (which stays effect-layer positioning only, `50`). **No fx portal primitive**
   (SURF-007, DEF-003); fx guarantees portal/`Modal` *coexistence* instead (§ Placement &
   portal coexistence).
5. **Separate component from the effect render-targets** (`<EdgeGlow>` etc.) — it wraps
   content rather than drawing; it may share the native view base (`51`) but is its own
   public component.

## Open questions

- ~~**Portal** — does fx ever need a root overlay layer for `transient`/`modal`, or is
  placement always the app's job?~~ **Resolved (SURF-007, DEF-003, 2026-06-14):** placement
  stays the app's job — no fx portal primitive (rules #5/#9). fx guarantees portal/`Modal`
  coexistence instead (§ Placement & portal coexistence + Decision 4); revisit only on the
  original trigger.
- ~~**`uniforms`/`tune` memoization**~~ — **resolved (SURF-010): same as `50`.** Native
  `previousProps` value-equality (not reference) means inline builders need no manual memo;
  both primitive and nested `Record` props compare by value. Verified on SDK 56, iOS + Android.
- ~~**Event payload** — beyond `phase`, does `onTransitionEnd` need timing/interrupt info?~~
  **Resolved in `40`:** `onTransitionEnd` carries `{ owner, phase, finished, interrupted }`
  (the interrupt/completion contract); presence reads `phase` + `interrupted`.
- ~~The native mechanics (the handshake, the host-view ref) are `open` in `33`/`35`.~~
  **Resolved (U7-001, 2026-06-12):** built (`FxPresence` + `FxPresenceCoordinator` on the
  content driver) and the handshake device-verified on both platforms; the `35` ordering
  question is answered there. Shape/timing magnitudes stay device-pending (MOT-001/U7-002).

## Sources

- Conversation: component-vs-chain decision; `preset`/`motion`/`tune`; the shape-native law; lifecycle
  ownership; fx-owns-motion-not-placement.
- `42-presence-and-lifecycle.md` (presence presets), `35-view-state.md` (the handshake),
  `41` (`fx.motion`/`MotionSpec` for `enter`/`exit` + the law), `50` (the prop language +
  the three layers), `55` (effect composition, the sibling builder).
