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

## Open questions

- **Bare + Fabric CI** — ship a bare RN example in CI so the install path doesn't rot.
- **Runtime guard UX** — when an effect has no satisfiable rung (e.g. AGSL below API 33
  with no fallback), what does the consumer see — a no-op, a static fallback, a dev
  warning? Tie to `50` and the `{via:'none'}` contract (`02`).
- **Android backend maturity** — revisit if the Android path ever needs a real mod
  (then, and only then, a scoped plugin).

## Sources

- `_legacy/07-config-plugin-and-install.md` — the no-plugin decision, install paths, the
  min-version matrix.
- `02-capability-ir-and-lowering.md` — `requires.os` runtime gating; `50` — the adapter
  feature-detection; `52` — shader asset packaging.
