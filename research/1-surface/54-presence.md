# Surface: FxPresence
Status: researched (API) · native mechanics open (→ 33/34/35)
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

A platform-idiomatic `preset`, refined by `tune`/`transition`, or overridden by an explicit
`motion` map (`50`'s prop language; the shape-native split, `41`):

```tsx
// preset — fx resolves the platform-idiomatic shape + timing per OS
<FxPresence visible={open} preset="transient" tune={{ speed: 'fast' }} />

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
- **`tune` adjusts intent inside the platform family; `transition` is expert timing** — both
  refine a `preset` *or* an explicit `motion`. Neither is a shape.
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

## Decisions

1. **`FxPresence` is a stateful coordinator, not a dumb wrapper** — it owns deferred
   unmount via the `35` handshake.
2. **`preset` (platform-idiomatic) is the default; `motion` is the explicit cross-platform
   shape override.** `tune`/`transition` refine either and are never a shape; `visible` is
   `FxPresence`-only. The shape-native split (`41`).
3. **Any children, one managed wrapper, no per-child motion** — accept fragments/arrays and
   wrap them in one transform target; per-child motion is the `33`/`05` boundary trigger,
   out of scope. Content motion is transform/opacity only (touch-safe).
4. **fx owns motion, not placement** — overlay positioning is the app's concern via `style`
   / app layout (or a future portal helper), **not** `FxPresence` and **not** `composition`
   (which stays effect-layer positioning only, `50`).
5. **Separate component from the effect render-targets** (`<EdgeGlow>` etc.) — it wraps
   content rather than drawing; it may share the native view base (`51`) but is its own
   public component.

## Open questions

- **Portal** — does fx ever need a root overlay layer for `transient`/`modal`, or is
  placement always the app's job? Lean: app's job in v1.
- ~~**`uniforms`/`tune` memoization**~~ — **resolved (SURF-010): same as `50`.** Native
  `previousProps` value-equality (not reference) means inline builders need no manual memo;
  both primitive and nested `Record` props compare by value. Verified on SDK 56, iOS + Android.
- ~~**Event payload** — beyond `phase`, does `onTransitionEnd` need timing/interrupt info?~~
  **Resolved in `40`:** `onTransitionEnd` carries `{ owner, phase, finished, interrupted }`
  (the interrupt/completion contract); presence reads `phase` + `interrupted`.
- The native mechanics (the handshake, the host-view ref) are `open` in `33`/`35`.

## Sources

- Conversation: component-vs-chain decision; `preset`/`motion`/`tune`; the shape-native law; lifecycle
  ownership; fx-owns-motion-not-placement.
- `42-presence-and-lifecycle.md` (presence presets), `35-view-state.md` (the handshake),
  `41` (`fx.motion`/`MotionSpec` for `enter`/`exit` + the law), `50` (the prop language +
  the three layers), `55` (effect composition, the sibling builder).
