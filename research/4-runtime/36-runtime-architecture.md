# Runtime: the object model (the native architecture)
Status: researched (design) · source-audit pass · device proof pending
Phase: v2
Feeds: structure.{ios,android}, the build; consumes 04, 05, 30–35, 51
Owns: the runtime object graph — which native object owns what, and how they collaborate.

## Why this matters

`04` and `05` name a set of **stable logical owners** (`FxAnimationDriver`,
`FxPresenceCoordinator`, `FxLayoutObserver`, `FxEffectRenderer`), and `05`'s "adopt the
HybridObject *shape* now" decision **rests on them** — but no doc lays out the graph: who
holds the wrapper handle, who reads layout, who owns the FSM, who emits events, how they
wire. This doc is that graph. It is the **research→code bridge**: the native architecture an
implementer builds, **platform-agnostic** (the per-platform impl is `5-realization`). These
are long-lived, identity-stable native objects — `Fx`-prefixed, HybridObject-shaped
regardless of binding, so a later Nitro swap is mechanical, not architectural (`05`).

## The objects

| Object | Owns | Reads | Emits | Doc |
|---|---|---|---|---|
| **`FxNativeView`** | the Expo Modules boundary — two-phase props in, events out; hosts the SwiftUI/Compose host, the render surface, **or** the content wrapper | resolved props | (routes events) | `51` |
| **`FxLayoutObserver`** | post-layout reads of the wrapper (size/origin/travel, insets) — **reads layout, never writes** | the Yoga/Fabric frame | — | `33` |
| **`FxAnimationDriver`** | the interruptible native animation + the frame loop; two families — **content** (CA / View-anim) and **effect** (SwiftUI / Compose) | targets, measurements | `onTransitionEnd` | `34` |
| **`FxPresenceCoordinator`** | the presence **lifecycle FSM** + the deferred-unmount handshake | `visible` target | `onTransitionEnd{phase}` | `35` |
| **`FxEffectRenderer`** | the effect layers (the `EffectStack` mount); the GPU surface for interactive shaders | effect config, pointer (interactive) | `onLoad`/`onError`/`onPress*` | `22`, `30`, `51` |

(The interactive recognizer (`30`) is a native *input source* feeding `FxEffectRenderer`'s
shader uniforms / `FxAnimationDriver`; the SDF hit-test (`32`) gates it.)

## How they collaborate — two paths from the boundary

`FxNativeView` is the boundary **pattern** — realized as one or more **substrate-specific**
native view classes (`FxHostedView` / `FxSurfaceView`, blueprint Unit 1), not a single
switch-on-`node` class — and it routes to one of two paths by node kind (`02`):

**1 · Effect path** (`<Fx>`, render-targets) — decorative or interactive:
```
FxNativeView ──mounts──▶ FxEffectRenderer ──(interactive)──▶ recognizer (30) → shader uniforms
                              │
                              └─ effect-target animation ─▶ FxAnimationDriver (effect family)
```

**2 · Content-motion path** (`FxPresence`/`FxView` wrapping RN children):
```
FxNativeView (wraps children, owns the wrapper)
   │ visible / state ▼
FxPresenceCoordinator (lifecycle FSM, 35) ──drives──▶ FxAnimationDriver (content family, 34)
                                                          │ needs travel/origin ▼
                                                       FxLayoutObserver (reads frame, 33)
   ▲ onTransitionEnd (deferred-unmount handshake) ──────┘
```

## The wiring rules (one-way, per `04`)

- **Boundary routes; coordinator orchestrates; driver executes; observer reads; renderer
  draws.** Events flow back **up** through the boundary only.
- **Read layout, never write it** (`FxLayoutObserver`) — fx animates transform *above* Yoga.
- **Native owns frames** (`FxAnimationDriver`) — JS sets discrete targets; no per-frame JS.
- **JS sees events/snapshots only** (the exposure model, `35`) — never a frame stream.
- **Identity is stable** across Fabric re-renders — the objects persist with the view (the
  `05` falsification test; if identity can't be held, that's the trigger to reconsider Nitro).

## Findings — the HybridObject shape (verified against nitro, `references/`)

- **The shape to mirror now** (binding-agnostic): a **named, long-lived object** with
  state + methods, identity via **`equals()`** (not pointer exposure) and an optional
  **`dispose()`**, with **prototype-based method dispatch** (the object is otherwise empty).
  Nitro backs this with `jsi::NativeState` + a cached per-runtime prototype — but fx adopts
  the *shape* in Swift/Kotlin first; the JSI/C++ binding (and nitrogen codegen) is deferred
  (`05`).
- **CRITICAL: Nitro Hybrid Views do NOT host RN children** (`HybridViewProps` is empty by
  design; a Hybrid View's `view` is a single native `UIView`/`View` with no RN-child
  container). So even under a future Nitro adoption, Nitro would cover the **runtime
  objects**, *not* the content-wrapper view — that stays **Expo Modules** (which *can* host
  RN children). This narrows the `05` fallback: "swap to Nitro" is not a clean drop-in for
  `FxNativeView`'s content-wrapping role.

## Decisions

1. **Five named runtime objects, one responsibility each, stable identity** — the
   HybridObject *shape* (`05`), `Fx`-prefixed (style guide), binding-agnostic.
2. **Two paths from the one boundary pattern** — effect (`FxEffectRenderer`) and content-motion
   (`FxPresenceCoordinator` + `FxAnimationDriver` + `FxLayoutObserver`).
3. **Each object maps to one contract doc** (`30`–`35`/`51`); the per-platform implementation
   is `5-realization` — this doc never pins platform mechanics.
4. **Data flow is one-way** (boundary → coordinator → driver → observer/renderer; events
   back up), enforcing the `04` ownership boundaries in the object graph.

## Open questions

- **Driver: one object with two families, or two objects** (content vs effect)? Lean: one
  with two families, shared scheduling — confirm when the frame-loop sharing is settled (`34`).
- **`FxEffectRenderer` vs the interactive-shader surface** — one object or split (decorative
  vs interactive)? Ties to `30`/`32`.
- **Object identity across Fabric commits** — the `05` falsification test; device-pending (`35`).
- **Shared vs per-object scheduling** — does the content driver share a clock with the effect
  renderer / interactive loop, or run independently (`31`/`34`)?

## Sources

- `04` (the ownership boundaries these objects enforce), `05` (the stable-logical-owner /
  HybridObject-shape decision), `30`–`35` (each object's contract), `51` (the boundary).
- `structure.{ios,android}.md` — the per-platform implementation of each object.
