# Anchored reveal and library shape
Status: open -- WIP, non-authoritative
Phase: post-v2 exploration
Feeds: `0-spine/04`/`05` (capability-boundary taxonomy and Lane 1 grammar; `capability-boundary-classifier.md` and `lane1-declarative-surface.md` historical), `1-surface/50`, `3-motion/41` (the canon animation grammar — decision 15; `native-animation-api-extraction.md` historical), `4-runtime/33-shadow-nodes-and-layout.md`, `5-realization/structure.{ios,android}.md`
Scope: explore geometry-aware presentation from an RN-laid-out anchor rect to an fx-owned target rect, and place that feature in the public library model without turning fx into a generic layout animation API.

## Why this matters

A chat input camera reveal exposes a gap between simple content motion and true layout
participation. The desired effect is not just `scale` or `opacity`: a camera button inside a
chat input opens a bottom-half camera panel, and the chat input border appears to stretch upward
from the bottom-left corner into the panel chrome.

This should not make `fx.motion` animate `width` or `height`. It should create a new
geometry-aware orchestration layer: fx reads RN/Yoga geometry, owns an animated shell and chrome,
and keeps JS out of the frame loop. If siblings must reflow through Yoga, that is a separate
Boundary L problem.

## Library shape

react-native-fx has three layers:

| Layer | Public shape | Job | Layout ownership |
|---|---|---|---|
| Value builders | `fx.effect.*`, `fx.motion.*`, `transition` | Small reusable descriptors for effects, transform/opacity shape, and timing | none |
| Native wrappers | `Fx`, `FxPresence`, `FxView` | Own native presentation for one wrapper or effect surface | read only |
| Geometry orchestration | `FxAnchor`, `FxReveal`, future `FxFlow` | Coordinate presentation across measured rects, slots, or anchors | read only unless explicitly promoted to Boundary L |

This keeps the current primitives useful:

- `fx.effect.*` describes native pixels and effect stacks.
- `fx.motion.*` describes transform/opacity shape for one fx-owned wrapper.
- `transition` describes timing and later carries platform-specific expert blocks.
- `preset` describes platform-native behavior bundles.
- `FxAnchor` and `FxReveal` describe geometry-aware handoffs that are too rich for a single
  `MotionSpec`.
- `FxFlow` remains the future slot-continuity primitive. Reserved-size flow stays Boundary A;
  measured-content flow moves to Boundary L.

## Use case

The product example is a chat bar with a camera button inside the input chrome:

```tsx
<FxAnchor id="chatInputChrome">
  <ChatInput borderless />
</FxAnchor>

<FxReveal
  open={cameraOpen}
  from={{ anchor: "chatInputChrome", origin: "bottom-left" }}
  to={{ placement: "bottom-half" }}
  preset="anchoredMorph"
  transition={{
    preset: "platform",
    ios: { preset: "snappy" },
    android: { preset: "materialEmphasized" },
  }}
>
  <CameraView />
</FxReveal>
```

The chat input chrome belongs to fx from the collapsed state. The `TextInput` itself is
borderless content inside that chrome. When the camera opens, the same fx-owned chrome morphs
into the camera panel, so there is no duplicate border handoff.

## Boundary call

This is Boundary A, not Boundary L.

fx reads:

- the anchor rect from `FxAnchor`;
- the target rect from the reveal placement or container bounds;
- optional source chrome metrics, such as radius or border style.

fx owns:

- the reveal shell transform;
- border, background, radius, and clip chrome;
- outgoing and incoming content handoff, such as opacity or clipping;
- the native timing, interruption, cleanup, and completion event.

RN owns:

- `TextInput` layout and input state;
- `CameraView` content;
- chat list and chat bar layout;
- the React tree.

This becomes Boundary L only if fx must report an animated measured size back to Yoga so siblings
outside the reveal move as part of layout. That case belongs to measured-content `FxFlow` or a
separate Fabric/shadow-node decision.

## Native lowering

`FxReveal` lowers to a target-driver plan:

```txt
JS
  open changes once

Expo Modules
  stashes props
  applies one coherent batch

Native
  resolves fromRect from the anchor
  resolves toRect from placement
  lays the shell at toRect
  applies an inverse transform so the shell visually starts at fromRect
  animates transform to identity
  morphs chrome to the target style
  fades or clips outgoing and incoming content
  emits one semantic completion event
```

The geometric trick is to lay out the shell at the final target rect, then animate away the
inverse transform:

```txt
scaleX = fromRect.width / toRect.width
scaleY = fromRect.height / toRect.height
translate = fromRect.origin - toRect.origin, adjusted for origin
```

Then native animates:

```txt
transform: inverse(fromRect -> toRect) -> identity
radius: source radius -> target radius
input content opacity: 1 -> 0
camera content opacity: 0 -> 1
```

The current `FxAnimationDriver` only covers opacity, uniform scale, translation, and rotation.
An anchored reveal can start as a private preset runner that adds non-uniform scale, chrome
radius, and content fade. Later, promoted `clock.phase` or `clock.keyframes` can reuse the same
lowered plan shape.

## API direction

Do not expose the implementation state as `revealState: "collapsed" | "expanded"`. That makes
one use case look like the primitive.

Expose four independent concerns instead:

| Concern | Example | Meaning |
|---|---|---|
| target | `open={cameraOpen}` | discrete semantic state |
| geometry | `from={{ anchor, origin }}` / `to={{ placement }}` | where the shell starts and ends |
| presentation | `preset="anchoredMorph"` | constrained chrome/content recipe |
| timing | `transition={{ preset: "platform", ios, android }}` | platform-native timing with expert refinement |

The native implementation may still lower this to two resting states. The public API should name
the semantic target and geometry, not the internal states.

## Platform timing model

Use the hybrid timing direction from the canon animation grammar (`3-motion/41` decision 15):

```tsx
transition={{
  preset: "platform",
  ios: { preset: "snappy" },
  android: { preset: "materialEmphasized" },
}}
```

The universal layer names the behavior. Platform blocks refine timing and feel. Raw SwiftUI,
UIKit, Compose, or Android class names stay private to the resolver.

## Non-goals

- Do not add `width`, `height`, or `flex` to `fx.motion`.
- Do not make `fx.motion` the universal shape for chrome, radius, clipping, and camera handoff.
- Do not expose raw platform framework names in JS.
- Do not use a custom Fabric/shadow-node path for anchored reveal.
- Do not host RN or camera content inside SwiftUI or Compose to animate it.
- Do not sample or distort RN/camera content on iOS.
- Do not emit per-frame geometry or progress to JS.

## Open questions

- Does `FxAnchor` use string ids, refs, or both? String ids make examples readable, but refs avoid
  registry lifetime questions.
- Does the collapsed input chrome live inside `FxAnchor`, or does `FxReveal` own both collapsed
  and expanded chrome through one always-mounted shell?
- How does the reveal handle focus, keyboard, and camera session lifecycle during interruption?
- Which chrome fields are part of the first preset: radius only, or radius plus border and
  background?
- Does `FxReveal` belong as its own component, or as a geometry-aware mode on `FxView`?

## Promotion path

1. Keep this note in WIP until the boundary and public surface settle.
2. Ratify the API direction in the owning surface and motion docs.
3. Pin iOS and Android mechanics in `structure.{ios,android}.md`.
4. Build the smallest device spike: anchor rect to bottom-half panel, native shell transform,
   radius morph, and camera content handoff.
5. Device-verify camera preview, touch delivery, clipping, interruption, background pause, and
   rapid open/close.
6. Revisit Boundary L only if a product case requires outside siblings to reflow through Yoga.
