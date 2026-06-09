# Thesis & personas
Status: researched
Phase: v1
Feeds: README.md, 04-state-ownership-and-boundaries.md, and the framing for every other doc

## Why this matters

Every design decision in this repo serves a goal, and the goal has been easy to
under-frame. An early version optimized for *"curated effects that are hard to make
ugly."* A later one for *"SwiftUI shader ergonomics, brought to RN."* Both undersell what
fx actually is. The real product is **a native presentation runtime**: fx owns the
presentation layer — the slice between RN/Yoga's layout and the platform's pixels — for
React Native, covering both the **effects it draws** and the **motion of the content it
wraps**. This doc pins that thesis, who it serves, and what it rules in and out.

## The thesis

> **A native presentation runtime for React Native.** fx owns *presentation state* —
> transform, opacity, effects, and motion envelopes, the layer between layout and pixels —
> exposed through one platform-agnostic vocabulary and configured declaratively from JS.
> JS never authors shaders; JS never drives frames; the default look and feel is always
> the platform's own.

The product is the **presentation runtime + its agnostic vocabulary**, not a shader engine
the user programs and not a 2D canvas they rebuild. It spans two peer domains:

- **Effects** — what fx *draws*: `fill`, `material`, `shader`, `symbol`, `filter`.
- **Motion** — what fx *animates*: presence (enter/exit of content), content transform,
  the reactive/lifecycle envelopes.

Both are the same job — **own presentation state, let the platform render it.** The
ownership lines that make this coherent are `04`; the data-flow contract is `40`.

## The two personas

The split is load-bearing — it is what makes "JS never authors shaders / never drives
frames" coherent. [Aurora](https://github.com/tornikegomareli/Aurora) is the model for the
effect half: one author wrote the Metal shader once; thousands of developers use it and
never see it. fx generalizes that to the whole runtime.

- **The native author** (rare — you, or a contributor) writes the native side *once*:
  `.metal` / `.agsl` for an effect, or the runtime objects (`FxAnimationDriver`,
  `FxPresenceCoordinator`, …) that own presentation state. Touches native code and the
  manifest.
- **The JS consumer** (95%+) never touches native. They work entirely in fx
  primitives (`<FxPresence>`, `<Fx>`, the chain), **presets / palettes / themes**
  (resolved in JS), and the **reactive / presence channel** (discrete `visible` / `state`
  + native-eased `transition`). They reach a premium, reactive, native-feeling result
  without leaving JS.

"Make it easy on the RN side" therefore means *nail the consumer API*; native code is a
contributor concern and a rare escape hatch, not the front door.

## The goal, against the alternatives

The competition tells us what to optimize for — **activation energy at native quality,
cross-platform** — not raw power:

- **react-native-skia** makes you rebuild the drawing layer in *its* world (Canvas, SkSL,
  manual uniforms). Powerful, high activation energy, and a canvas — not a runtime over
  your real views.
- **react-native-reanimated** owns content animation, but via worklets / shared values (a
  UI-thread JS model) and only transform/opacity — **no native effects**, and you wire the
  curves yourself.
- **react-native-filament** is a full 3D engine — enormous for "I want a glow or a
  slide-in."
- **expo-ui** exposes *raw* platform components — it leaks `SwiftUI`/`Compose` and makes
  you write platform-specific code.
- **SwiftUI / Jetpack Compose** are the ergonomic target, but each is single-platform.

fx's win condition is **native-grade presentation — effects *and* motion — at the lowest
activation energy, cross-platform, with platform-native defaults**, and without authoring
shaders or driving frames. Curation is a batteries-included starter set; the moat is the
cross-platform presentation runtime and the consumer ergonomics.

## What this rules in and out

- **In:** an agnostic effect catalog with deep typed props; content **presence & motion**
  (the owned runtime); first-class palettes/themes; the reactive/lifecycle channel;
  native-eased transitions; BYO `.metal` / `.agsl` as *one feature*.
- **In (the moat):** fx **owns its presentation runtime itself** — **no dependency for the
  V1/V2 presence runtime** (no Reanimated, no other lib), on the `expo-view` substrate; the
  boundary stays Expo Modules until proven insufficient (`05`). **The one carve-out:**
  continuous gesture-scrubbed motion (regime C) is a *separately-scoped future lane* that
  may take a JSI/worklets dependency (`40`/`05`) — it is not part of, and does not dilute,
  the no-lib presence runtime.
- **Out:** JS-authored shaders as the front door; per-frame JS↔native traffic; **hosting RN
  content to sample/distort it** (severs touch on iOS — `content-distort` is iOS-out-of-
  scope); **flow-layout animation** (reorder, content-size — that is Yoga's/the app's;
  fx *reads* layout, never owns it); continuous gesture-scrubbed motion on the JS thread
  (regime C); **being a UI kit** — fx **wraps** any UI kit and owns presentation *semantics*
  (`preset`/`feedback`/`effect`), never the components (no `<Toast>`/`<Button>`/`<Card>`;
  only effects, which fx draws whole, are fx components).

## Decisions

1. **The product is a native presentation runtime** — not a shader engine, not a canvas,
   **not a UI kit**. fx owns the slice between layout and pixels (`04`), for both effects and
   motion, and **wraps any UI kit** — it owns presentation *semantics*, never the components.
2. **Two domains, peers** — Effects (draws) and Motion (animates), unified by "fx owns
   presentation state." Neither is subordinate.
3. **Two personas, designed for explicitly** — native author (writes the native side once)
   vs consumer (never does). The manifest + curated catalog is the seam.
4. **The win condition is activation energy at native quality, cross-platform** — platform-
   native defaults in **shape *and* timing** (the shape-native law, `41`), no shader
   authoring, no frame-driving. Beat Skia/Reanimated/Filament on time-to-first-result;
   match SwiftUI/Compose ergonomics; add cross-platform.
5. **fx owns its runtime** — **no dependency for the V1/V2 presence runtime**; the boundary
   stays Expo Modules until the ownership research proves it insufficient (`05`). Regime-C
   continuous motion is the one separately-scoped future lane that may take a dependency.
6. **The V1 curation/BYO threshold** — the curated catalog is the 10 shader ids (`22`)
   plus the ratified preset/feedback/effect vocabularies (`50`/`56`). Anything outside
   the curated set is BYO (developer-supplied `.metal`+`.agsl` via the `shader` node).
   The compiler/emitter (`03`) is deferred until real novel-composition demand triggers it.

## Open questions

- ~~**Where curation ends and BYO begins**~~ — **resolved (SPINE-001; DOC-003).** The
  threshold is the 10 curated shader ids + the ratified preset/feedback/effect vocabularies.
  BYO is the `shader` node with developer-supplied assets; the compiler remains deferred.
- ~~**Palettes/themes as a shareable artifact**~~ — **resolved (SPINE-002; DOC-003).**
  Consumer-authored palettes/themes are deferred to V2; pure-config palettes resolve in JS
  within the core package (`presets/`). A distribution surface would live in `@react-native-fx/lab`
  if demand justifies the split (`52` Decision #11).
- **Keeping the fx-vs-app line sharp** — fx owns *overlay presentation* and *its own
  effects*; the app/Yoga own *flow layout*. Watch that presence never drifts into owning
  layout.

## Sources

- `README.md` — the thesis summary and platform constraints.
- `04-state-ownership-and-boundaries.md` — the ownership model this thesis rests on.
- Aurora (https://github.com/tornikegomareli/Aurora) — the author-once / consume-many model
  fx mirrors for the effect half.
- `02-capability-ir-and-lowering.md` (the vocabulary), `40` (the data-flow contract), `50`
  (the consumer surface).
