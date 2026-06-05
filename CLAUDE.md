# react-native-fx — working rules

react-native-fx is **a cross-platform native-effect primitive** for React Native: SwiftUI on iOS, Jetpack Compose + `RenderEffect`/AGSL on Android, exposed through one platform-agnostic capability vocabulary and configured declaratively from JS. JS developers never author shaders and JS never drives frames.

The [research](./research) folder is the source of truth. Read it for the reasoning behind every rule below. [research/02-capability-ir-and-lowering.md](./research/02-capability-ir-and-lowering.md) is the spine; [research/structure.ios.md](./research/structure.ios.md) and [research/structure.android.md](./research/structure.android.md) own each platform's mechanics. The root summary doc was deleted on purpose — do not look for it.

## Non-negotiable rules (apply without asking)

1. **Native owns the frame loop.** JS configures (capability, uniforms, mode, callbacks) and receives semantic events. Nothing crosses the bridge per frame.
2. **One platform-agnostic capability vocabulary.** The capability manifest (`research/02`) is the source of truth; `structure.{ios,android}.md` render it. Never expose `SwiftUI*`/`Compose*` names above the manifest.
3. **Two substrates.** `hosted` (SwiftUI/Compose host — decorative, gesture-free or self-gesturing) and `expo-view` (plain native view — interactive, the runtime/G layer). Interaction requires `expo-view`.
4. **Never host RN content to sample or distort it** — it severs RN touch on iOS (`content-distort` is out-of-scope on iOS). Self-contained generative effects host fine.
5. **JS developers never author shaders.** Curated semantic components are the front door; bring-your-own `.metal`/`.agsl` is one feature, not the door.
6. **iOS and Android are peers**, designed cross-platform from the start. Platform divergence is localized in `research/structure.{ios,android}.md` and nowhere else.
7. **Stay on Expo Modules (Fabric).** No hand-written JSI / C++ / `HybridObject` for the JS↔native boundary — the thin async boundary is why it isn't needed, and the SwiftUI/Compose hosting infrastructure is Expo's.
8. **Reactive state crosses as discrete targets plus native-eased transitions**, never per-frame JS.

## Operating rules

- Match the surrounding code's idiom, naming, and comment density.
- Pin platform mechanics in `research/structure.{ios,android}.md` before you build them; a mechanic lives in exactly one place.
- Keep the render loop paused when the view is off-window or the app is backgrounded.
- Verify on a device. Effects do not run headless — neither Metal nor the hosted renderers.

## Style and tooling

- **Prose**: [guides/Writing Style Guide.md](./guides/Writing%20Style%20Guide.md) — second person, present tense, active voice, sentence-case headings, no emojis.
- **Swift, Metal, Kotlin, AGSL**: [guides/Swift Style Guide.md](./guides/Swift%20Style%20Guide.md) — swift-format with the root **.swift-format**; `Fx`-prefixed native classes. Android lands later and mirrors the same naming.
- **TypeScript**: eslint-config-universe plus Prettier (already in **packages**). Do not hand-format.
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
