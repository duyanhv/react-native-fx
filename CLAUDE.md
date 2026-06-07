# react-native-fx — working rules

> **AGENTS.md** is a symlink to this file — one source of truth for every agent and contributor. Edit **CLAUDE.md**.

react-native-fx is **a native presentation runtime for React Native** — it owns the presentation layer (transform, opacity, effects, motion envelopes; the slice between layout and pixels) for both the effects it draws and the motion of the content it wraps. SwiftUI/Core Animation on iOS, Jetpack Compose + `RenderEffect`/AGSL / View animation on Android, exposed through one platform-agnostic capability vocabulary and configured declaratively from JS. JS developers never author shaders, JS never drives frames, and the default look and feel is always the platform's own.

The [research](./research) folder is the source of truth. Read it for the reasoning behind every rule below. [research/README.md](./research/README.md) holds the mental model and doc map (the **presentation-runtime** frame, with compiler-style lowering: Surface → Vocabulary → Runtime, × Effects/Motion, under the law + the contract); [research/0-spine/02-capability-ir-and-lowering.md](./research/0-spine/02-capability-ir-and-lowering.md) is the manifest spine; [research/0-spine/04-state-ownership-and-boundaries.md](./research/0-spine/04-state-ownership-and-boundaries.md) is the ownership spine; [research/5-realization/structure.ios.md](./research/5-realization/structure.ios.md) and [research/5-realization/structure.android.md](./research/5-realization/structure.android.md) own each platform's mechanics. The root summary doc was deleted on purpose — do not look for it.

## Non-negotiable rules (apply without asking)

1. **Native owns the frame loop.** JS configures (capability, config, discrete targets like `visible`/`state`, callbacks) and receives semantic events. Nothing crosses the bridge per frame.
2. **One platform-agnostic capability vocabulary.** The capability manifest (`research/0-spine/02`) is the source of truth; `5-realization/structure.{ios,android}.md` render it. Never expose `SwiftUI*`/`Compose*` names above the manifest. **The law: agnostic names, platform-native defaults (shape-native, not just curve-native)** — every primitive's default realization is the platform's own *shape, origin, edge, spring, easing, and material*, never a cross-platform-uniform default; only an explicit user override forces cross-platform uniformity.
3. **Two substrates.** `hosted` (SwiftUI/Compose host — decorative, gesture-free or self-gesturing) and `expo-view` (plain native view — the owned runtime: fx-managed **interaction** *and* **content motion**). Interaction and wrapped-content motion require `expo-view`.
4. **Never host RN content to sample or distort it** — it severs RN touch on iOS (`content-distort` is out-of-scope on iOS). Self-contained generative effects host fine.
5. **fx is not a UI kit; it wraps any UI kit, and JS developers never author shaders.** The front door is **platform-native behavior presets** — `preset`/`feedback`/`effect` props applied to *your* content — not exported `Toast`/`Card`/`Button` components. fx owns presentation *semantics*, never the component; only effects fx draws whole (e.g. `EdgeGlow`) may ship as components. Bring-your-own `.metal`/`.agsl` is one feature, not the door.
6. **iOS and Android are peers**, designed cross-platform from the start. Platform divergence is localized in `research/5-realization/structure.{ios,android}.md` and nowhere else.
7. **Stay on Expo Modules (Fabric).** No hand-written JSI / C++ / `HybridObject` for the JS↔native boundary — the thin async boundary is why it isn't needed, and the SwiftUI/Compose hosting infrastructure is Expo's. Nitro/JSI is a *deferred fallback*, considered only if the layout/shadow-node research proves Expo Modules insufficient (`research/0-spine/05`), not the default.
8. **Reactive state crosses as discrete targets plus native-eased transitions**, never per-frame JS. Native state returns to JS only as semantic events or async snapshots — never a frame stream.
9. **fx owns presentation state; it reads layout, never writes it.** Yoga/Fabric own layout — fx animates transform/opacity *above* it (no flow-layout animation); React owns the mounted tree — fx defers unmount via a handshake, never seizes it (`research/0-spine/04`). Content motion animates one managed wrapper fx owns, never arbitrary RN children.

## Operating rules

- Before you write code or a doc, read the guide in [guides](./guides) that owns the work and follow it exactly. The guides are binding and override your defaults: `Code Style Guide` for formatting and naming, `Code Comments Guide` for comments, `Writing Style Guide` for prose, `Testing Guide` for tests, `Device Verification Guide` for device proof, `Contributing Guide` for commands and the merge bar.
- Match the surrounding code's idiom, naming, and comment density.
- Pin platform mechanics in `research/5-realization/structure.{ios,android}.md` before you build them; a mechanic lives in exactly one place.
- Keep the render loop paused when the view is off-window or the app is backgrounded.
- Verify on a device. Effects do not run headless — neither Metal nor the hosted renderers.

### Session protocol

AI agents follow the [agents/session-protocol.md](./agents/session-protocol.md) for starting and ending every session. The build plan is in [research/7-implementation](./research/7-implementation). The task list is in [research/7-implementation/progress.md](./research/7-implementation/progress.md).

## Style and tooling

The [guides](./guides) folder is binding, not advisory — this is the index, and each guide is the full, authoritative reference for its area. Follow them exactly.

- **Prose**: [guides/Writing Style Guide.md](./guides/Writing%20Style%20Guide.md) — second person, present tense, active voice, sentence-case headings, no emojis.
- **Code style and naming**: [guides/Code Style Guide.md](./guides/Code%20Style%20Guide.md) — TypeScript via **Biome** (`packages/biome.json` is the source of truth), Swift and Metal via swift-format with the root **.swift-format**, Kotlin and AGSL when Android lands. `Fx`-prefixed native classes. Do not hand-format.
- **Comments**: [guides/Code Comments Guide.md](./guides/Code%20Comments%20Guide.md) — comment the iceberg, not the surface; TSDoc and Swift docblocks in the third-person declarative.
- **Contributing**: [guides/Contributing Guide.md](./guides/Contributing%20Guide.md) — toolchain, per-platform commands, and the bar a change meets before it merges.
- **Editors**: the root **.editorconfig** aligns indent and line endings.
- **Commits**: Conventional Commits.

## Repository layout

```
packages/   the react-native-fx library (src, ios, android, package.json)
example/    the dev-harness app (runs the effects on a device)
research/   the source of truth — capability manifest, platform structure, decisions
skills/     end-user usage docs for the shipped library
guides/     how to write code and docs for this repo
```
