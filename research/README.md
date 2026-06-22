# react-native-fx — Research

The **how-to-actually-build-it** vault for react-native-fx. Working ground truth: the
mental model, the capability vocabulary, the per-platform mechanics, the owned runtime,
and the decisions that flow from them.

This `research/` directory is the source of truth. The root `CLAUDE.md` holds the
enforced rules and defers here. Do not add a competing architecture or roadmap doc at
the repo root.

## The mental model — fx as a presentation runtime (with compiler-style lowering)

> **fx owns presentation state for React Native** — one agnostic vocabulary, lowered to
> native and executed by fx's own runtime — across two domains, under one law and one
> contract.

fx is first a **native presentation runtime**: it owns the layer between layout and pixels
(`0-spine/04`). The *how* borrows a compiler's shape — a surface language, an IR, and a
backend that runs it — so every research doc is one of those **planes**, for one of two
**domains**. Lead with the runtime; compiler-style lowering is the mechanism, not the
identity (and it applies to effects, not motion — `03`).

### Three planes (altitude)

| Plane | What it is | Folder |
|---|---|---|
| **Surface** | what the developer writes — primitives (`FxPresence`, `FxView`, `FxPressable`, `<Fx>`, `FxGroup/FxItem`), scoped behavior props (`preset`/`feedback`/`effect`), and builders (`fx.motion.*`, `fx.effect.*`). Optional named effect components are sugar only when fx draws the whole thing. | `1-surface/` |
| **Vocabulary** | the agnostic capability IR + its per-platform lowering ladders — *the manifest*. Node ids are the naming authority and the seam between personas. | `0-spine/02` |
| **Runtime** | the native engines the manifest points at — effect renderers and the owned content-motion engine (shadow node, layout read, state, animation driver), interaction & scheduling; expanded per-platform. | `4-runtime/`, `5-realization/` |

### Two domains (what flows through every plane)

- **Effects** — what fx *draws*: `fill`, `material`, `shader`, `filter`, `symbol`
  (render-targets & modifiers). Effects are mounted by `<Fx>` or attached to `FxView` as
  decoration; they do not wrap RN content. → `2-effects/`
- **Motion** — what fx *animates*: presence/entrance-exit, content transform, lifecycle
  envelopes (drivers & the presence runtime). Motion wraps developer content in one
  managed native presentation target and animates transform/opacity above Yoga layout. A
  **peer of Effects**, because fx owns its engine. → `3-motion/`

### The surface methodology

The public API is not a UI kit and not a pile of semantic widgets. Components are only
the native/runtime ownership boundaries fx physically mounts:

| Primitive | Owns |
|---|---|
| `FxPresence` | presence lifecycle: `visible` → enter/hold/exit/deferred unmount |
| `FxView` | mounted-state presentation: `state` → transform/opacity, optional decoration |
| `FxPressable` | native press recognizer + platform feedback |
| `<Fx>` | fx-owned drawn effects, single effect id or `EffectStack`; interactive shader surface via `interactionMode` |
| `FxGroup` / `FxItem` | the honest compound: each item contributes a real native glass surface that morphs between siblings (glass-only in V1; `FxItem` is JS-only) |

Everything else is a prop or data:

- `preset` = platform-idiomatic behavior bundle for content presentation.
- `feedback` = press behavior bundle for `FxPressable`.
- `effect` = visual effect id / `EffectStack`, owned by `<Fx>` or attached as `FxView`
  decoration.
- `motion` = explicit `MotionSpec` map; this is the cross-platform shape override.
- `tune` = semantic intent adjustment inside the platform family.
- `transition` = expert timing only.

The top layer is **platform-native behavior presets**, not components like `Toast`,
`Card`, `Button`, or `Fab`. fx wraps any UI kit. Optional effect components such as an
edge-glow or mesh-gradient component may exist only as thin sugar over `<Fx effect="…">`,
because fx draws those visuals whole.

### Two invariants that bind the planes

- **The law — agnostic names, platform-native defaults (shape-native, not just
  curve-native).** Governs Surface↔Vocabulary. One name up top; all divergence lives in
  lowering; the *default realization is the platform's own* — **shape, origin, edge/anchor,
  distance, spring, easing, material** — not merely the curve. A `preset` resolves the whole
  behavior per platform; **only an explicit user override forces cross-platform uniformity.**
- **The contract — targets in, native owns frames, events out.** Governs
  Surface↔Runtime. The thin async boundary; no per-frame JS, either direction. This is
  why fx stays on Expo Modules with no JSI / C++.

### Two more axes that classify any doc (without being its home)

- **Substrate** — `hosted` (a host view behind the Expo Host; decorative — SwiftUI on iOS,
  a plain `View` in V1 on Android with Compose as a future rung) vs `expo-view` (plain native
  view; the runtime, interaction, **and now content motion** live here). → `0-spine/01`
- **Phase** — V1 (decorative effects on `hosted`) vs V2 (the owned interactive +
  content-motion runtime on `expo-view`).

Held in one sentence: **Surface → Vocabulary → Runtime, × {Effects, Motion}, under {the
law, the contract}, on {hosted, expo-view}.** Every research question is "which plane,
which domain" — and that pair is its folder.

### Two personas (who touches what)

- **Shader/effect author** (rare — you, or a contributor) — touches Vocabulary + Runtime.
- **JS consumer** (95%+) — touches Surface only; uses primitives, behavior presets, and
  builders; never authors a shader, never designs every frame, never drives a frame.

## Doc map (by plane)

Filenames are **stable IDs** (the `02`, `40`, `50` shorthand the docs cite); the
**folder** carries the plane. A doc lives in exactly one place.

```
0-spine/      the cross-cutting frame — law, contract, substrates, the manifest, personas
   00-thesis-and-personas.md          consumer vs author; the goal; "JS never authors shaders"
   01-substrates-and-hosting.md       hosted vs expo-view; the Expo Host conflict (#46549)
   02-capability-ir-and-lowering.md   ★ the manifest schema, IR vocabulary, lowering ladder
   03-adapter-vs-compiler.md          the two manifest-consumer strategies
   04-state-ownership-and-boundaries.md  who owns desired/tree/layout/presentation/pixels (the spine)
   05-native-boundary-decision.md     Expo Modules vs Nitro vs RN Runtimes vs raw Fabric (ADR)

1-surface/    the consumer API (Surface plane) — three layers, one scoped prop language
   50-api-and-presets.md              ★ umbrella: the 3 layers + shared prop language + presets + adapter
   54-presence.md                     FxPresence (content enter/exit)           [researched]
   55-composition-chain.md            effect composition — fx.effect → EffectStack  [researched]
   56-platform-behavior-presets.md    preset/feedback/effect — platform-native behaviors (NOT UI components)  [researched]
   57-content-primitives.md           FxView · FxPressable · FxGroup/FxItem (effects → 55) [researched]

2-effects/    domain: things fx draws (semantics; mechanics → 5-realization)
   20-fills.md · 21-materials-and-glass.md · 22-shaders.md · 23-filters.md · 24-symbols.md

3-motion/     domain: things fx animates (semantics; mechanics → 4-runtime)
   40-motion-reactivity-and-data-flow.md   regimes A/B/C; the reactive/transition channel
   41-motion-vocabulary.md            the agnostic animatable primitives + the law   [researched]
   42-presence-and-lifecycle.md       enter/hold/exit; the presence preset catalog   [researched]

4-runtime/    the native engine plane (the moat; mechanics)
   30-interaction-and-gestures.md · 31-lifecycle-and-teardown.md · 32-host-safe-hittest-and-sdf.md
   33-shadow-nodes-and-layout.md      Yoga/Fabric integration, layout ownership      [design]
   34-animation-driver.md             the from-scratch native animation engine       [design]
   35-view-state.md                   mount/unmount coordination, the presence FSM    [design]
   36-runtime-architecture.md         the object model — who owns what, how they wire [design]
   51-expo-modules-view.md            the native-view authoring base (the boundary)

5-realization/  per-platform expansion of the runtime
   structure.ios.md · structure.android.md

6-ship/       publishing & install
    52-standards-and-publishing.md · 53-config-plugin-and-install.md

7-implementation/  the build-ordered implementation blueprint (the research→code bridge)
    blueprint.md                       maps every architectural unit to its contract + precedent + decision
    subtask-protocol.md                the authority chain + cross-check protocol + subtask template

_legacy/      the pre-restructure flat 00–09 (deep build-reference detail; keep until built)
```

## Authorities (which doc owns what)

- **Capability vocabulary, IR, lowering schema** → `02`. Node ids name everything.
- **The law (platform-native defaults) + personas** → `00`; **motion's restatement** → `41`.
- **The state-ownership model** (who owns desired/tree/layout/presentation/pixels) → `04`
  — the static spine beneath layout, presence, children, animation.
- **The data-flow contract** → `40` (the regimes + targets/frames/events) — the dynamic
  form of `04`.
- **Substrate & hosting model** → `01`. **The native boundary mechanism** (Expo Modules
  vs Nitro/JSI vs RN Runtimes vs raw Fabric) → `05`.
- **Platform mechanics** (recognizers, render loop, clock, API levels) →
  `5-realization/structure.{ios,android}.md` — the sole home for a mechanic.
- **Public API, scoped props, presets, palettes, BYO** → `50` (+ `54`–`57`).
- **The owned content-motion runtime** (shadow node, layout, driver, state) →
  `33`/`34`/`35`. **Interaction runtime** → `30`–`32`.

## Per-folder indexes & the fan-out protocol

Each folder has its own `README.md` — a local index stating what the folder owns, the
invariants that bite there, its docs + status, its dependencies, and its open research
targets. **The folders are the unit of parallel research:** you can hand one agent one
folder.

If you are an agent researching a folder:

1. **Read this root README first** — the model, the law + the contract, the doc
   template, the status legend. Canonical and non-negotiable.
2. **Read your folder's README** — your scope, the invariants that bite, your open
   targets.
3. **Stay inside your folder's boundary.** A mechanic lives in exactly one place. If your
   research needs another folder's territory, record the cross-folder question and
   surface it up — don't write into the other folder.
4. **Respect the law** (agnostic names, platform-native defaults) and **the contract**
   (targets in, native frames, events out) in every answer. Never expose `SwiftUI*` /
   `Compose*` names above the manifest.
5. **Write findings into the folder's docs** using the doc template; move each doc's
   Status open → researched → prototyped → verified as you go.
6. **Anything needing a device stays `open` until verified** — effects don't run
   headless, neither Metal nor the hosted renderers.

**Dependency order** (what must be stable before what): `0-spine` (manifest + law +
contract) → `2-effects` / `3-motion` (semantics) → `5-realization` + `4-runtime`
(mechanics) → `1-surface` (the API that composes them) → `6-ship`.

## Phase axis

- **V1 — decorative render-targets on the `hosted` substrate.** Auto-Host sizing +
  `pointerEvents` passthrough. `fill`, `material`, `shader` (decorative), `symbol`, the
  manifest + adapter dispatch + the reactive channel. The named decorative use cases
  (edge glow, mesh backgrounds, glass/material accents, symbol effects).
- **V2 — the owned runtime on the `expo-view` substrate.** Interactive shader surfaces,
  SDF touch pass-through, RNGH coexistence — **and content motion**: `FxPresence`, the
  animation driver, shadow-node/layout integration, the mount/unmount handshake.
  `content-distort` on Android.

## Status legend & tracker

Base rungs: `open` · `researched` · `re-frame` · `prototyped` · `verified`.

Two qualifiers refine `researched` (use them, they are official):

- **researched (semantics)** — the cross-platform *contract* is settled; per-platform
  mechanics are deferred to `4-runtime`/`5-realization`.
- **researched (design)** — the *approach* is settled and grounded, but it makes claims
  that only a device can confirm; pair it with **· device-verify pending**.

Anything device-bound stays at `researched (design) · device-verify pending` until
`prototyped`/`verified` — effects and animations do not run headless.

| Area | Status |
|---|---|
| `0-spine` (thesis, substrates, manifest, adapter-vs-compiler, state-ownership, native-boundary) | researched |
| `1-surface` (`50` umbrella · `54` presence · `55` effects · `56` presets · `57` primitives) | researched (API) · native mechanics → `4-runtime` |
| `2-effects` (20–24) | researched |
| `3-motion` (`40` reactivity · `41` vocabulary · `42` presence) | researched (semantics) · runtime → `4-runtime/33–35` |
| `4-runtime` (`30–32` interaction · `33–35` owned content runtime) | researched (design) · `33–35` device-verify pending |
| `5-realization` structure.ios/android | researched |
| `6-ship` (52–53) | researched |

## Migration map (this restructure)

Old flat layout → new plane folders. **Filenames unchanged**, so all `see 02` / `40` /
`50` references still resolve; only the path changed.

| Old path | New path |
|---|---|
| `00`–`03` | `0-spine/` (same names) |
| `20`–`24` | `2-effects/` |
| `30`–`32` | `4-runtime/` |
| `40` | `3-motion/` |
| `50` | `1-surface/` |
| `51` | `4-runtime/` |
| `52`–`53` | `6-ship/` |
| `structure.{ios,android}.md` | `5-realization/` |
| — (new) | `1-surface/54`, `55` · `3-motion/41`, `42` · `4-runtime/33`, `34`, `35` |

The earlier flat `00–09` are archived in `_legacy/` (still cited for deep build-reference
detail — full Swift/Metal/glass code, device caveats). Keep until the implementation no
longer needs them.

## Doc template

```md
# <title>
Status: open | researched | re-frame | prototyped | verified
Phase: v1 | v2
Feeds: <doc(s)>
Owns: <the one thing this doc is the authority for>   ← for capability/runtime docs

## Why this matters
## Research questions      ← the checklist this doc must answer
## Findings                ← answers, with code + API levels + sources
## Decisions               ← what we'll do, and why
## Open questions          ← unresolved / needs-device
## Sources
```

`5-realization/structure.{ios,android}.md` use a different shape: **§ Platform
fundamentals** (substrate, hosting, clock, render, touch, lifecycle, version gates) then
**§ Per-capability realization** (one section per IR node, expanding the manifest).
