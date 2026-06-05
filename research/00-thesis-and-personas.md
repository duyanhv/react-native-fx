# Thesis & personas
Status: researched
Phase: v1
Feeds: README.md, and the framing for every other doc

## Why this matters

Every design decision in this repo serves a goal, and the goal is easy to get
wrong. Earlier framing optimized for *"curated effects that are hard to make
ugly."* That is not the goal. The goal is **lowest activation energy from "I have
an effect in mind" to "it's a live native effect in my RN app," on both
platforms** — SwiftUI-grade ergonomics, brought to React Native, cross-platform.
This doc pins the thesis, who it serves, and what that rules in and out.

## The thesis

> **A cross-platform native-effect primitive for React Native.** SwiftUI on iOS,
> Jetpack Compose + `RenderEffect`/AGSL on Android, exposed through one
> platform-agnostic capability vocabulary, configured declaratively from JS. JS
> developers never author shaders; JS never drives frames.

The product is the **capability vocabulary** (`fill`, `material`, `shader`,
`filter`, `motion`, `symbol`, …), each lowering to the best native primitive per
platform via the manifest (`02`). It is not a shader engine the user programs, and
not a 2D canvas they rebuild.

## The two personas

The split is load-bearing — it is what makes "JS never authors shaders" coherent.
[Aurora](https://github.com/tornikegomareli/Aurora) is the model: one author wrote
the Metal shader once; thousands of SwiftUI developers use `AuroraGlow().mood(…)`
and never see it.

- **The shader author** (rare — you, or a contributor) writes `.metal` + `.agsl`
  *once* to add a curated effect, or to extend the curated catalog. Touches native
  code and the manifest.
- **The JS consumer** (95%+) never touches a shader. They work entirely in:
  semantic components, **presets / palettes / themes** (resolved in JS), and the
  **reactive channel** (discrete `state`/`mood` + native-eased `transition`). They
  reach a premium, reactive look without leaving JS.

"Make it easy on the RN side" therefore means *nail the consumer API*; `.metal`/
`.agsl` is a contributor concern and a rare escape hatch, not the front door.

## The goal, against the alternatives

The competition tells us what to optimize for — **activation energy and authoring
model**, not raw power:

- **react-native-skia** makes you rebuild the drawing layer in *its* world (Canvas,
  SkSL strings, manual uniforms). Powerful, high activation energy.
- **react-native-filament** is a full 3D engine — enormous for "I want a glow."
- **SwiftUI** is the ergonomic target: `Rectangle().colorEffect(…)`, drop a `.metal`
  in the bundle, one line. But it's iOS-only.

fx's win condition is **SwiftUI's activation energy, delivered to RN, on both
platforms**, with curation as a batteries-included starter set rather than the moat.

## What this rules in and out

- **In:** a curated semantic catalog with deep, typed props; first-class palettes/
  themes; the reactive/lifecycle channel; native-eased transitions; BYO `.metal`/
  `.agsl` as *one feature*.
- **In (V2):** the interactive runtime (G) on the `expo-view` substrate — the real
  differentiator over "expo-ui with shaders."
- **Out:** JS-authored shaders as the front door; per-frame JS↔native traffic;
  hosting RN content to sample/distort it (severs touch on iOS — `content-distort`
  is iOS-out-of-scope).

## Decisions

1. **The product is the consumer experience**, not a shader engine. Optimize the
   JS-facing semantic catalog + presets + reactive channel; keep `.metal`/`.agsl`
   a rare contributor/escape path.
2. **Two personas, designed for explicitly** — author (writes shaders once) vs
   consumer (never does). The manifest + curated catalog is the seam between them.
3. **The win condition is activation energy**, not breadth of GPU power. Beat Skia/
   Filament on time-to-first-effect, match SwiftUI's ergonomics, add cross-platform.
4. **Curation is a starter set, not the moat.** The moat is the cross-platform
   capability runtime and the consumer ergonomics.

## Open questions

- **Where curation ends and BYO begins** — how large a curated catalog before the
  "drop in your own" path is genuinely needed; track against real consumer demand.
- **Palettes/themes as a shareable artifact** — are consumer-authored "looks" (pure
  config) a distribution surface of their own (`50`)?

## Sources

- `README.md` — the thesis summary and platform constraints.
- Aurora (https://github.com/tornikegomareli/Aurora) — the author-once / consume-many
  model fx mirrors.
- `02-capability-ir-and-lowering.md` — the vocabulary the consumer works in.
- `50-api-and-presets.md` — the consumer-facing component/preset surface.
