# react-native-fx — Research

The **how-to-actually-build-it** vault for react-native-fx. Working ground truth:
the capability vocabulary, the per-platform mechanics, on-device findings, and the
decisions that flow from them.

This `research/` directory is the source of truth. The old root summary doc has
been deleted; the root `CLAUDE.md` holds the enforced rules and defers here. Do
not add a competing architecture or roadmap doc at the repo root.

> **Restructure complete.** The layered map below is fully written. The old flat
> `00–09` have been mined and archived in **`_legacy/`**, which the lean docs still
> cite for deep build-reference detail (full Swift/Metal/glass code, device caveats).
> Deleting `_legacy/` loses that detail (no git history here); keep it as build
> reference until the implementation phase no longer needs it. The old→new mapping
> is in the migration map.

## What fx is (the thesis)

> **A cross-platform native-effect primitive for React Native.** SwiftUI on iOS,
> Jetpack Compose + `RenderEffect`/AGSL on Android, exposed through **one
> platform-agnostic capability vocabulary** and configured declaratively from JS.
> JS developers never author shaders; JS never drives frames.

- **The product is the capability vocabulary, not a shader engine.** A small set of
  semantic effects (`fill`, `material`, `shader`, `filter`, `motion`, `symbol`)
  each render on the best native primitive per platform. The **capability manifest**
  (`02`) is the source of truth for how each lowers; `structure.{ios,android}.md`
  render one platform column each.
- **Two substrates.** `hosted` (SwiftUI/Compose host — decorative, gesture-free or
  self-gesturing, sits behind the Expo `Host` boundary) and `expo-view` (a plain
  native view — interactive, carrying the runtime/G layer). A capability used
  interactively forces `expo-view`.
- **Two personas.** The *shader author* writes `.metal`/`.agsl` once (you, or a
  contributor); the *JS consumer* — 95%+ of users — never touches it and works in
  semantic components, presets, palettes, and the reactive channel.
- **iOS and Android are peers**, designed cross-platform from the start. All
  platform divergence is localized in the two `structure.*` files.
- Built on **Expo Modules API + Fabric** (no hand-written JSI/C++/HybridObject),
  pinned to **Expo SDK 56 / React Native 0.85 / React 19.2** for the first pass.

## The platform constraints that bound everything

Settled facts (don't relitigate) — they're why the thesis is shaped this way:

1. **Self-contained generative effects host cleanly; content-sampling does not.**
   Hosting a SwiftUI/Compose effect that draws *itself* (a glow, a mesh, glass) as
   a layer is safe and is the main path. Hosting *RN content* to sample/distort it
   (`.layerEffect` over a live subtree) severs RN touch on iOS — `content-distort`
   is out-of-scope on iOS, and is the one thing Android's draw-time `RenderEffect`
   can actually do.
2. **Interaction belongs to the `expo-view` substrate.** A plain native view keeps
   the surface a first-class UIKit/Android citizen, so recognizers attach and
   scroll/RNGH arbitration mediates for free. The runtime (G) — touch, host-safe
   hit-testing, SDF pass-through, springs, scheduling — only exists here.
3. **The Expo `Host` world and the runtime (G) are mutually exclusive on iOS.** The
   auto-Host boundary (expo/expo#46549) owns layout and offers only coarse
   `pointerEvents` hit-testing; decorative effects ride it happily, interactive
   ones must stay outside it on `expo-view`.
4. **The boundary is thin and async.** Config, semantic events, and discrete
   imperatives only — never per-frame. That is why Expo Modules suffices and no
   JSI/C++ layer is needed.

## How the system is built — manifest in, consumers out

The capability manifest (`02`) is the one source of truth. Everything else is a
**consumer** of it, so the iOS/Android split lives in data and every other layer is
platform-agnostic:

- **Adapter dispatch** (runtime) — pick the native primitive per capability, OS, and
  substrate.
- **Compiler lowering** (build time, optional/V2) — emit `.metal`/`.agsl` + bindings
  from the IR. Adapter and compiler are *both* manifest consumers, so the choice
  between them is deferrable (`03`).
- **Runtime feature-detection, substrate selection, clock wiring** — all read the
  manifest's `requires`/`substrate`/`clock`.

The manifest is dispatch + contract, **not** codegen: it points at three
hand-written engines — native bindings, the IR→MSL/AGSL emitter, and the runtime
(G).

## Doc map (layered)

```
0 · Framing & spine
   README.md                          this index + thesis
   00-thesis-and-personas.md          consumer vs author; goals; "JS never authors shaders"
   01-substrates-and-hosting.md       hosted vs expo-view; the Expo Host conflict (#46549)
   02-capability-ir-and-lowering.md   ★ the manifest schema, IR vocabulary, lowering ladder  [written]
   03-adapter-vs-compiler.md          the two consumer strategies (one manifest)

1 · Platform realization (resources)
   structure.ios.md                   iOS column of the manifest, fully expanded + fundamentals
   structure.android.md               Android column, fully expanded + fundamentals

2 · Capabilities (semantics; mechanics defer to structure.*)
   20-fills.md · 21-materials-and-glass.md · 22-shaders.md · 23-filters.md · 24-symbols.md

3 · Runtime (G — the moat; phase V2)
   30-interaction-and-gestures.md · 31-lifecycle-and-teardown.md · 32-host-safe-hittest-and-sdf.md

4 · Motion, reactivity & data flow
   40-motion-reactivity-and-data-flow.md

5 · API & ship
   50-api-and-presets.md · 51-expo-modules-view.md · 52-standards-and-publishing.md · 53-config-plugin-and-install.md
```

### Migration map (old → new)

| Old | New |
|---|---|
| 00 library standards & publishing | 52 |
| 01 expo modules view | 51 |
| 02 iOS glass materials (was *secondary*) | 21 (promoted to core) |
| 03 Android RenderEffect (was *later*) | structure.android (promoted to peer) |
| 04 preset system | splits → 20 (fills) + 50 (resolution/presets) |
| 05 gestures & interaction | 30 (+ mechanics → structure.*) |
| 06 lifecycle & teardown | 31 |
| 07 config plugin & install | 53 |
| 08 shader accents & distribution (was *core*) | 22 + feeds 02 (demoted to one capability) |
| 09 API layering | 50 |

## Authorities (which doc owns what)

- **Capability vocabulary, IR, lowering schema** → `02`. Node ids are the naming
  authority for everything.
- **Platform mechanics** (recognizer config, render loop, clock, API levels) →
  `structure.{ios,android}.md`, the sole home for a mechanic.
- **Substrate & hosting model** → `01`.
- **Adapter-vs-compiler decision** → `03`.
- **Public component API, presets, palettes, BYO** → `50`.
- **Runtime (G)** → `30`–`32`.

## Phase axis

Each doc carries a phase tag; the build splits the same way:

- **V1 — decorative render-targets on the `hosted` substrate.** Lean on the
  auto-Host's sizing + `pointerEvents` passthrough. Capabilities `fill`, `material`,
  `shader` (decorative), `symbol`, plus the manifest + adapter dispatch + the
  reactive channel. This is most of the named use cases (edge glow, toast, mesh
  backgrounds).
- **V2 — the interactive runtime (G) on the `expo-view` substrate.** Pressable
  shader surfaces, SDF touch pass-through, RNGH coexistence, the continuous
  Reanimated channel, and `content-distort` on Android.

## Status legend & tracker

- `open` — questions written, not yet researched
- `researched` — answered from current sources, not yet built
- `re-frame` — researched, but needs updating for the thesis
- `prototyped` — validated in a throwaway prototype
- `verified` — confirmed on a real device

| Doc | Status |
|---|---|
| 00–03 spine (thesis, substrates, manifest, adapter-vs-compiler) | researched (written) |
| structure.ios / structure.android | researched (written) |
| 20–24 capabilities | researched (written) |
| 30–32 runtime (G) | researched (written) |
| 40 motion/reactivity/data-flow | researched (written) |
| 50–53 API & ship | researched (written) |

## V1 build checklist

Phase-V1, decorative-first:

- [x] capability manifest schema (`02`)
- [ ] render `structure.ios.md` / `structure.android.md` from the manifest ← next
- [ ] adapter dispatch (JS) — `select(node, platform, ctx)` over the manifest
- [ ] curated `fill` (gradient + mesh) on the hosted substrate
- [ ] curated `shader` decorative path (`.colorEffect` iOS / `RenderEffect` Android) + one bundled glow
- [ ] the reactive channel — discrete `state`/`mood` + native-eased `transition` + `onTransitionEnd`
- [ ] `material` (glass 26+ / blur fallback) and `symbol`
- [ ] BYO `.metal` + `.agsl` as a `shader` node with developer assets
- [ ] example app exercising the decorative capabilities on device

Phase-V2 (deferred): the `expo-view` interactive runtime (G), pressable shader
surfaces, SDF pass-through, the continuous Reanimated channel, `content-distort`
on Android.

## Doc template

```md
# <title>
Status: open | researched | re-frame | prototyped | verified
Phase: v1 | v2
Feeds: <doc(s)>

## Why this matters
## Research questions      ← the checklist this doc must answer
## Findings                ← answers, with code + API levels + sources
## Decisions               ← what we'll do, and why
## Open questions          ← unresolved / needs-device
## Sources
```

`structure.{ios,android}.md` use a different shape: **§ Platform fundamentals**
(substrate, hosting, clock, render, touch, lifecycle, version gates) then
**§ Per-capability realization** (one section per IR node, expanding the manifest).
