# Config plugin & install
Status: researched
Phase: v1
Feeds: the README min-version matrix; the install story
Owns: install (managed + bare), the no-plugin decision, runtime capability gating.

## Why this matters

This doc pins the install story for both audiences (managed Expo + bare RN), the
min-version matrix the README advertises, and the call on whether fx ships a config
plugin. The cross-platform thesis keeps the old conclusion — **no plugin** — but adds
runtime capability gating as the honest replacement for prebuild-time warnings, because
capabilities now vary by OS *per effect* (iOS 17/18/26, Android API 31/33).

## V1 ships NO config plugin

fx is an Expo Modules native view package, so **autolinking** (`expo-module.config.json`)
does the linking. Nothing mutates a consuming app's native project:

- **Module linking** → autolinking, not a plugin.
- **Shader assets** → packaged by the podspec resource bundle (iOS) / Android assets
  (`52`), compiled by the consumer's normal build. Never a plugin.
- **No AppDelegate/MainApplication hooks, no Info.plist keys, no Gradle edits.**

A plugin whose only job is emitting warnings doesn't justify its cost. If a future V2
mod (an actual native side-effect) needs install-time mutation, that's when a plugin is
introduced — scoped to the mod that forces it.

## Install

```bash
# managed Expo (CNG / prebuild) — zero manual native edits
npx expo install react-native-fx

# bare RN — once, to get Expo Modules, then pods
npx install-expo-modules@latest && (cd ios && pod install)
```

## Min-version matrix (advertise in README)

Anchored to **Expo SDK 56 / RN 0.85 / React 19.2**:

| Concern | Floor |
|---|---|
| React Native / Expo SDK | RN 0.85+ / SDK 56+ |
| New Architecture (Fabric) | **Required** |
| iOS deployment target | 15.1+ (SDK 56 baseline) |
| Android `minSdk` / `compileSdk` | 24 / 36+ |
| Node | 20.19.4+ |
| Xcode | 16.1+ |

**Per-effect capability floors are higher and runtime-gated** (not install-gated): iOS
17 shaders/symbols, 18 MeshGradient, 26 Liquid Glass; Android API 31 RenderEffect, 33
AGSL. The manifest's `requires.os` (`02`) drives the runtime selection + graceful
fallback, so an effect on an older OS degrades to its fallback rung rather than failing.

## Runtime capability gating replaces plugin warnings

Because the manifest already encodes `requires.os` per rung, the adapter (`50`)
feature-detects at runtime and picks the best satisfiable rung (or `{via:'none'}`). That
is more honest than a prebuild warning a bare app never sees, and it is the cross-platform
mechanism for "this effect needs a newer OS" — handled as data, not as a plugin.

## Decisions

1. **No config plugin in V1** — autolinking + packaged shader assets suffice; nothing
   mutates the app project.
2. **Install:** managed `npx expo install react-native-fx`; bare `install-expo-modules`
   then `pod install`.
3. **Min-version matrix** anchored to SDK 56 / RN 0.85 / New Arch required; advertise in
   README.
4. **Per-effect OS floors are runtime-gated via the manifest**, not install-gated — the
   adapter degrades to a fallback rung; no plugin warning.
5. **A plugin is introduced only when a real V2 native mod forces it.**
6. **`via:'lib'` rungs are optional peer dependencies, never silent bundles.** A `lib`
   lowering (e.g. Haze/Cloudy for the Android material below-floor, `2-effects/21`; Lottie
   for `symbol`) declares an **optional peer dependency the app installs** — fx does not
   ship it. If absent, the rung **guards out** and the ladder degrades further (graceful),
   so the dependency is genuinely optional. The optional-peer rule is **settled** (this
   decision); the only open part is whether the manifest **names the package + version**
   (`02`); install docs list these as optional peers.
7. **No-rung degradation: silent omission in production, `__DEV__` console warning.**
   When a capability's ladder bottoms out at `{via:'none'}` (no satisfiable rung at all),
   the effect layer is silently omitted in production — any wrapped content remains fully
   visible and interactive (`rule #5`). For motion, the no-rung case degrades to instant
   placement (content visible, no animation), consistent with the reduce-motion posture
   (`41` Decision 9). In `__DEV__`, the adapter emits a console warning naming the node,
   platform, and the guarding condition. A static fallback is never invented unless the
   ladder itself defines one (e.g., glass below floor degrades to material/blur, which is a
   rung-with-fallback, not a no-rung case). This policy is the umbrella over the ratified
   degradation decisions: glass below floor → material/blur (`21` Decision 4); reduce-motion
   → instant placement (`41` Decision 9); symbol on Android → `{via:'none'}` (DOC-008); BYO
   missing platform file → `{via:'none'}` (`22` Decision 6).

## Open questions

- ~~**Bare + Fabric CI**~~ — **resolved.** A bare React Native + Fabric example (`example-bare/`)
  is wired into CI (`.github/workflows/ci.yml`). All 4 jobs pass on GitHub: TypeScript, Swift format,
  bare iOS build (Metal toolchain → `pod install` → `xcodebuild` — proves native autolink + compile),
  bare Android autolink (package id + module class resolve). Proven on `macos-26` with Swift 6.2
  (2026-06-07, U1-004).
- ~~**Runtime guard UX**~~ — **resolved (DOC-012, 2026-06-10).** Decision 7: silent omission in production, `__DEV__` console warning. Motion no-rung maps to instant placement. No static fallback invented unless the ladder itself defines one.
- **Android backend maturity** — revisit if the Android path ever needs a real mod
  (then, and only then, a scoped plugin).

## Sources

- `_legacy/07-config-plugin-and-install.md` — the no-plugin decision, install paths, the
  min-version matrix.
- `02-capability-ir-and-lowering.md` — `requires.os` runtime gating; `50` — the adapter
  feature-detection; `52` — shader asset packaging.
