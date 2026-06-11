# Substrates & hosting
Status: researched
Phase: v1 (hosted) · v2 (expo-view runtime)
Feeds: 02-capability-ir-and-lowering.md, structure.ios.md, structure.android.md, 30–35

## Why this matters

The single most decision-shaping fact in fx is *which native substrate an effect — or a
piece of content motion — runs on*. It gates whether the effect can be interactive,
whether fx's owned runtime (interaction **and** content presentation) applies, how layout
and hit-testing work, and how it composes with RN content. Every
capability rung in the manifest (`02`) carries a `requires.substrate`; this doc
defines the two substrates, when each is used, and the hosting mechanics and
conflicts that come with them. Platform-specific mechanics live in
`structure.{ios,android}.md`; this doc owns the cross-platform model.

## The two substrates

- **`hosted`** — a host view fx owns, inside RN via Expo's `Host`/`RNHostView`: a SwiftUI
  view on iOS; on Android a plain `View` drawing the effect directly in V1, with Jetpack
  Compose as the intended future rung (the mechanic and its deferral live in
  `structure.android.md`). **Decorative or self-gesturing.**
  The host owns layout and offers only a coarse `pointerEvents` hit-test lever. This
  is the **main path** for generative effects (gradients, mesh, materials, glass,
  generative shaders, symbols).
- **`expo-view`** — a plain `ExpoView` (a `UIView` on iOS, a `View`/`ViewGroup` on
  Android), hosting the actual render surface or wrapping RN content. A first-class native
  citizen: recognizers/touch dispatch attach directly and scroll/RNGH arbitration mediates
  for free. **Carries fx's owned runtime** — both *interaction* (the G layer) **and**
  *content presentation* (the presence/content-motion runtime: the wrapper fx transforms,
  the animation driver, the deferred-unmount handshake; `33`–`35`). Required for any
  fx-managed interaction **and** for animating wrapped RN content.

**The rule:** decorative/generative ⇒ `hosted`; fx-managed interaction **or wrapped-content
motion** ⇒ `expo-view`. A node's `interaction` (`none | self | fx`) routes interactive use
to `expo-view`; a `motion` rung's `target:'content'` routes content motion there too (`02`).

## The hosted world

Hosting a self-contained generative effect as a *layer* is safe and is the whole
point — the effect draws itself and samples nothing, so RN content underneath stays
fully interactive. Mechanics to respect:

- **Auto-Host (expo/expo#46549).** Every standalone universal component auto-wraps in
  a native `Host` boundary unless already inside one. The host **owns sizing** (writes
  back via `shadowNodeProxy.setStyleSize`) and exposes **only `pointerEvents`**
  (`box-none | none | box-only | auto`) for hit-testing — coarse and rectangular.
- **Passthrough.** A full-surface decorative effect must set `pointerEvents="none"`/
  `box-none` so touches reach RN content below; the host otherwise captures touches
  across its whole bounds.
- **The `RNHostView` landmine.** Hosting RN content *back* inside the native world
  attaches an RN touch handler to the first child view
  (`createAndAttachTouchHandler`). Never nest an interactive fx view as that child.
- **fx owns its boundary.** fx is **not** built as an `@expo/ui` universal component;
  it hosts its own view (SwiftUI on iOS; the Android host per `structure.android.md`) with a
  boundary it controls, so it never hands its layout/hit-testing to the auto-Host.

## The expo-view world

A plain native view keeps the surface in the RN/native view tree, so fx's owned runtime
can exist. That runtime has two faces, both living here:

- **interaction (the G layer)** — cooperative gesture recognizer, host-safe and shaped/SDF
  hit-testing, springs, frame scheduling (`30`–`32`). The only place fx-managed interaction
  works.
- **content presentation** — the **owned content-motion runtime**: fx wraps RN content in
  a host view it owns and animates that view's transform/opacity (presence, the animation
  driver, the deferred-unmount handshake; `33`–`35`). The only place wrapped-content motion
  works, because it needs a real native view in the tree to transform.

Mechanics in `30`–`35` and `structure.{ios,android}`.

## The mutual exclusivity (iOS)

The runtime (G) and the Host world are **mutually exclusive on iOS**, and it is a
structural fact, not a preference:

- The host's only hit-test lever is coarse `pointerEvents`; there is no shape-aware
  hit-testing because a `UIHostingController` captures across its bounds.
- Applying a content-sampling effect (`.layerEffect`) to live RN content requires
  hosting that content, which severs RN/RNGH touch.

So: **decorative effects ride the Host** (and lean on its passthrough + sizing for
free — most of V1 needs little of G); **interactive effects live on `expo-view`**
outside any Host boundary. `content-distort` (effect over live RN content with
preserved touch) is therefore out-of-scope on iOS.

## The Android softening

Android mirrors the substrate split (the hosted host view vs plain `ExpoView`) but relaxes
one constraint: `RenderEffect`/AGSL are **draw-time**, independent of input
dispatch, so shading *over live content* does **not** sever touch. That is why
`content-distort` is `planned` on Android while out-of-scope on iOS, and why the
hosted/expo-view boundary is less load-bearing for touch on Android. Details in
`structure.android.md`.

## How the manifest encodes this

- Each rung's `requires.substrate` (`hosted | expo-view`) places that lowering.
- A node's `interaction` (`none | self | fx`) decides whether interactive use forces
  the `expo-view` rung (only `fx`).
- A node may carry both a hosted (decorative) rung and an expo-view (interactive)
  rung — e.g. `shader`; the selector chooses by intended use (`02`).

## Decisions

1. **Two substrates, chosen per capability and per intended use.** `hosted` for
   decorative/self-gesturing (main path); `expo-view` for fx-managed interaction **and for
   the owned content-presentation runtime** (wrapped-content motion / presence).
2. **fx owns its own native views and hosting boundary** — never an `@expo/ui`
   universal component, so it is never auto-Hosted and never cedes layout/hit-testing.
3. **G and the Host world are mutually exclusive on iOS.** Decorative→Host (coarse
   `pointerEvents` is enough); interactive→`expo-view` (G runtime). The line is
   structural.
4. **`content-distort` is iOS-out-of-scope, Android-planned** — the draw-time
   asymmetry is the reason, recorded in the manifest via `status`.
5. **V1 leans on the Host's passthrough + sizing** for decorative effects, so most of
   the runtime (G) is V2.
6. **Self-gesturing glass coexists with RN scrollers, and the drag arbitration is
   rung-specific** (device-grounded; the `research/wip/interactive-glass-touch-delivery.md`
   spike plus the U3-002 device gate, 2026-06-10). A `self`-interaction glass hosted inside
   an RN scroller delivers its press, and the parent scroll pans normally. What happens to
   a drag that *begins on the glass* depends on the realization: the **shipped UIKit rung**
   (`UIVisualEffectView` + `UIGlassEffect`) lets it pass through — the parent scroller pans
   (tap → press, drag → scroll-through); the SwiftUI `.glassEffect` rung the spike measured
   captured such drags via its interaction view. In both cases the arbitration is owned by
   the system, never by fx — fx installs no recognizer on `hosted`.

## Open questions

- ~~**Android `RNHostView` parity**~~ — **resolved (SPINE-012; U3-002 device gate,
  2026-06-10).** The Android host passes the device matrix (POCO F1/API 35): the 12-cell
  mixed grid renders with no blank hosts, tiles size to layout, scroll holds ~60 fps.
  Touch/sizing parity confirmed for the implemented effects. (The #46549 Android source
  read remains optional background, not a gate.)
- ~~**When a single screen mixes substrates**~~ — **resolved (SPINE-012; U3-002 device
  gate, 2026-06-10).** Twelve mixed fill/shader hosts on one screen hold UI/JS 60 fps on
  device; no grouping `Host` is needed at V1 scale. One caveat recorded: the
  interactive-glass stage read ~40 fps on the iOS simulator — watch on hardware, not a
  blocker.

## Sources

- expo/expo#46549 — automatic Host boundaries (`HostView.swift`, `RNHostView.swift`,
  `autoHost.tsx`, `hostContext.tsx`).
- `structure.ios.md`, `structure.android.md` — the per-platform hosting/touch mechanics.
- `02-capability-ir-and-lowering.md` — `requires.substrate` and `interaction`.
- `30-interaction-and-gestures.md` — the `expo-view` recognizer and RNGH coexistence.
- `research/wip/interactive-glass-touch-delivery.md` — the device spike behind decision 6
  (interactive glass press delivery and scroller coexistence).
