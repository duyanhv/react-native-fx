# Config plugin & bare RN install
Status: researched
Feeds: skills/react-native-fx/references/quickstart.md

## Why this matters
The research thesis commits to Expo Modules partly because it gives prebuild,
autolinking, and (if needed) config-plugin support when native side effects are
actually required — while still working in bare RN via `install-expo-modules`.
This doc pins the exact install story for both audiences, resolves the
min-version matrix the README must advertise, and — this pass — makes the
**final call on whether fx ships a config plugin at all**. It is the doc that the
`00`/`01` foundation docs defer their version floors to.

The decisive input is the feed-forward from `08` (Decision 8): **V1 is
curated-library-only.** The app developer authors **no** `.metal`; there are no
app-local or runtime shaders. Curated `.metal` ship inside the library's podspec
as a `resource_bundles` (`FxShaderShaders`) + `MTL_LIBRARY_OUTPUT_DIR` xcconfig —
**native/podspec scope, never app-plugin scope** (`08` §5, Decisions 5–6). That
single fact removes the only app-project mutation a plugin would have owned, and
it changes the V1 plugin answer from "small plugin" to **"no plugin."**

## Research questions
- Now that V1 is curated-only, is a **config plugin warranted at all** for an
  interactable iOS Metal `ShaderView` library? What native install work, if any,
  is left for a plugin once app-local `.metal` handling is gone?
- Prebuild flow for managed Expo: what `npx expo prebuild` does for an Expo
  Module via autolinking, with no manual native steps.
- **Bare RN** path: `npx install-expo-modules@latest` — what it patches
  (AppDelegate/MainApplication, Podfile, Gradle), then `pod install`. The manual
  steps (if any) a bare user must replicate.
- Minimum versions to pin in README: RN version, **New Architecture / Fabric
  required**, iOS deployment target, Android `minSdk`.
- Verifying the bare + Fabric intersection works (the most common breakage).
- Whether to ship a bare RN example app in CI so the path doesn't rot.

## Findings

### TL;DR — V1 ships NO config plugin
fx V1 is an Expo Modules native view package, so **Expo Autolinking** does the
linking through `expo-module.config.json`. A config plugin was previously kept
for one reason: an explicit install-time place to handle app-provided `.metal`
shader files. **The `08` feed-forward kills that reason** — V1 is
curated-library-only, the app authors no shaders, and all `.metal` distribution
is inside the pod's `resource_bundles` (`08` Decision 5/8). With app-local
shaders gone, nothing left over actually *mutates* a consuming app's native
project:

- **Module linking** → Autolinking (`expo-module.config.json`), not a plugin.
- **Curated `.metal` bundling** → podspec `resource_bundles` +
  `MTL_LIBRARY_OUTPUT_DIR`, compiled by the consumer's normal pod build
  (`08` §5.1, `00`). Never the plugin.
- **iOS deployment target** → already satisfied by the SDK 56 baseline (15.1);
  fx needs no raise (see matrix).
- **New Architecture** → default-on for SDK 56 / RN 0.85 fresh apps; a plugin
  could only *warn*, not enable it safely.
- **No AppDelegate/MainApplication hooks, no `Info.plist` keys, no Gradle
  edits, no Hermes/JS-engine mutation** — fx needs none of these.

A plugin whose entire job is emitting compatibility *warnings* does not justify
its own cost: a `plugin/` build target, an `app.plugin.js` surface, an
`expo-module build plugin` step in `prepack`, and an `@expo/config-plugins`
dependency. Per Expo's own CNG guidance, **"no native side-effects → autolinking
suffices"** — a library should not ship a config plugin that performs no
mods. fx is squarely in that case.

**Decision (V1): no config plugin.** Ship autolinking + the podspec resource
bundle only. Move compatibility validation to (a) the documented README
min-version matrix and (b) a lightweight runtime/JS guard if a misconfigured app
reaches `ShaderView` (e.g. New-Arch-off or below the iOS floor), which is more
honest than a prebuild-time warning a bare app would never see anyway. If a
future V2 escape hatch (app-provided shaders, Android backend flags, an actual
native mod) ever needs install-time project mutation, **that** is when a plugin
is introduced — added deliberately, scoped to the mod that forces it.

Contrast with the sibling `@react-native-runtimes/core` plugin (inspected at
`/Users/duyanhv/works/react-native-runtimes/packages/core/plugin/src/index.ts`):
that plugin earns its keep because it has real app-runtime side effects — it
patches `MainApplication.kt`, patches iOS `AppDelegate`, adds a Swift bridging
header, and asserts `newArchEnabled`/Hermes. fx has none of those mods, so it
should **not** copy that plugin at all in V1 — not even a trimmed version.

### Plugin scope matrix — every candidate, and why none warrants a plugin in V1

| Candidate | What a plugin would do | V1 decision |
|---|---|---|
| **Library module linking** | Register `FxShaderModule` / `FxShaderView`, link podspec / Gradle | **Autolinking owns this.** Via `expo-module.config.json` (`00`/`01`). Never plugin. |
| **Curated `.metal` shaders** | Compile/package the shader functions shipped by `react-native-fx` | **Podspec/native owns this.** `resource_bundles = { 'FxShaderShaders' => ['Shaders/**/*.metal'] }` + `MTL_LIBRARY_OUTPUT_DIR` (`08` Decision 5). Compiled by the consumer's pod build. Never plugin. |
| ~~App-local custom `.metal` shaders~~ | ~~Add app shader dirs / copy resources / extra Xcode build phase~~ | **Removed entirely.** V1 is curated-library-only (`08` Decision 8). No app shaders exist, so there is nothing to copy, no build phase to add, no `shaderDirectories` option. Not deferred-as-typed-option; just gone from V1 scope. |
| **iOS deployment target** | Ensure consuming app ≥ iOS 15.1 | **Baseline handles it.** SDK 56 already ships ≥ 15.1; fx requires no raise. A plugin would set a floor that is already met. Documented in the matrix instead. |
| **New Architecture** | Ensure Fabric/New Arch enabled | **Document + runtime-guard, do not plugin.** SDK 56 fresh apps are New-Arch-first; bare/upgraded apps must enable it themselves. A plugin can only warn; the README requirement + CI prove the path. |
| **Android backend config** | AGSL/RenderEffect/Skia options, min/compile SDK | **Out of scope.** Android is a later backend (`03`); do not mutate Android in V1, and do not reserve a plugin for it now. Introduce a plugin if/when that backend needs a real mod. |
| Info.plist / permissions | Add keys | **No.** fx needs none. |
| AppDelegate/MainApplication hooks | Add runtime startup code | **No.** View lifecycle is per-view, not app-level (`06`). |

The matrix has **no row whose V1 decision is "plugin."** That is the whole basis
for shipping no plugin.

### Min-version matrix (pin in README)

Anchored to the current stable release train: **Expo SDK 56 / React Native
0.85 / React 19.2** (SDK 56 shipped 2026-05-21).

| Concern | Floor to advertise | Source / reason |
|---|---|---|
| **React Native** | **0.85+** (Expo SDK **56+** for managed) | SDK 56 = RN 0.85 + React 19.2. fx peer-deps `expo`/`react`/`react-native` as `*` (doc `00`); the documented floor is SDK 56 / RN 0.85. |
| **New Architecture (Fabric)** | **Required.** Fabric + New Arch ON. | SDK 55 dropped Legacy Architecture support, so SDK 56 managed apps are New-Arch-only by default. Bare RN apps must also run New Architecture. |
| **iOS deployment target** | **15.1+** | MetalKit is available well below this floor; 15.1 follows the Expo/RN baseline and keeps the library aligned with SDK 56 projects. The SDK 56 baseline already satisfies this — fx requires no plugin-set floor and no raise. |
| **iOS Metal shader resources** | Library shaders bundled by the podspec resource bundle; **no app-provided shaders** | V1 curated shaders compile/package with the library via `resource_bundles` (`08` §5.1). There is no app-local custom `.metal` path in V1 (`08` Decision 8). |
| **Android `minSdk`** | **24** (base; Android backend later) | Do not raise `minSdk` for future AGSL/RenderEffect experiments. Runtime-gate Android capabilities when that backend exists (`03`). |
| **Android `compileSdk` / `targetSdk`** | **36+** (base) | Use the SDK 56 template defaults unless Expo bumps them. |
| **Xcode** | **16.1+** | RN/Expo native build baseline. Raise only if a future Metal feature requires newer SDK headers. |
| **Node** | **20.19.4+** | RN 0.85 drops support for Node versions before 20.19.4. Node 22+ and 24+ are also supported. |
| **`requireNativeView`** | available since **SDK 52** | Resolves doc `01`'s open question: with an SDK-56 floor, the JS binding uses `import { requireNativeView } from 'expo'` — **not** the legacy `requireNativeViewManager`. |

### Managed Expo install path (zero manual native project edits, no plugin entry)
For an Expo-managed app (CNG / prebuild):

```bash
npx expo install react-native-fx
```

There is **no `"plugins"` entry to add** — fx ships no config plugin. `app.json`
stays untouched by fx:

```jsonc
{
  "expo": {
    "plugins": []   // fx requires no plugin entry
  }
}
```

`expo install` picks an fx version compatible with the project's SDK and adds it
to `package.json`. From there:

- **Dev build / EAS:** `npx expo prebuild` (or it runs implicitly in the EAS
  build / `expo run:ios` / `expo run:android` flow) generates the native
  projects. During prebuild + native build, **Expo Autolinking** discovers fx via
  its `expo-module.config.json`, registers `FxShaderModule` / `FxShaderView`,
  links the podspec / Gradle module, and the **podspec's resource bundle**
  compiles the curated `.metal` into `FxShaderShaders.bundle` as part of the
  normal pod build (`08` §5.1). No plugin runs because there is none, and none is
  needed.
- Not usable in **Expo Go** — fx has custom native code, so it requires a
  **development build** (`expo-dev-client`). This is standard for any native
  module and should be stated in the README.

### Bare RN install path
A bare RN app must first have the Expo Modules infrastructure, then install fx
like any Expo module.

**1. Add Expo Modules support (once per project):**
```bash
npx install-expo-modules@latest
```
What this patches (verified against Expo's "Install Expo modules in an existing
React Native project" doc):
- **`package.json`** — installs/aligns the `expo` package (provides
  `expo-modules-core` + autolinking).
- **iOS `Podfile`** — adds the **`use_expo_modules!`** directive so CocoaPods
  autolinks every Expo module (incl. fx) at `pod install` time.
- **iOS `AppDelegate.swift`** — adds the optional Expo delegate wiring some
  modules need (fx itself needs none, but the infra adds it).
- **iOS deployment target** — ensured at the Expo-modules minimum.
- **Android `settings.gradle`** — wires the Expo autolinking Gradle plugin
  (`expoAutolinking.useExpoModules()` / the React Native Gradle settings plugin)
  for module + version-catalog discovery.
- **Android `build.gradle` (app)** — applies the autolinking so Expo modules are
  compiled into the app.

**2. Install pods (iOS) and let autolinking pick up fx:**
```bash
npx expo install react-native-fx     # or: yarn/npm add react-native-fx
cd ios && pod install                 # or: npx pod-install
```
After `use_expo_modules!` is present, `pod install` autolinks fx with **no
manual podspec reference, no manual Gradle include**, and the fx podspec's
resource bundle compiles the curated `.metal` as part of that pod build.

**Manual steps a bare user must replicate or verify:**
fx ships **no config plugin** and has no AppDelegate/MainApplication/Manifest
side effects, so bare users hand-patch nothing fx-specific. There is no
managed-prebuild behavior the plugin would have performed that a bare user must
mirror. They must still verify the same project-level settings any New-Arch Expo
module needs:

- New Architecture/Fabric enabled.
- iOS deployment target is at least 15.1 (the SDK 56 baseline already provides
  this on fresh templates).

On a current RN 0.85 template these are defaults, but upgraded bare apps can
drift. (No `.metal` step appears here because the app provides no shaders; the
library's `.metal` ride inside the pod's resource bundle.)

### The bare + Fabric intersection (the common breakage)
The most fragile path is **bare RN with the New Architecture**, because:
- An older bare app may still be on the **legacy architecture**; fx is
  New-Arch-targeted. The app must set `newArchEnabled=true`
  (`ios/Podfile`/`gradle.properties` `RCT_NEW_ARCH_ENABLED=1` →
  `newArchEnabled=true`). On fresh SDK 56 / RN 0.85 projects New Architecture is
  the default, but upgraded apps may still have stale native settings.
- Bare projects pin native config by hand, so the version-floor drift (iOS
  target, `minSdk`, Hermes) that prebuild would normalize can silently regress.
- Expo-modules-in-bare + Fabric codegen ordering is the classic place pods fail
  to compile after an RN upgrade.

Because fx ships no plugin, **none** of this is normalized at prebuild for fx —
which makes the documented requirement and CI even more load-bearing. This is
exactly why the README must (a) state **New Architecture is required**, and
(b) CI must exercise a real bare app, not just the managed `example/`.

### Where compatibility validation lives instead of a plugin
With no prebuild hook, the checks a plugin would have emitted move to two cheaper
surfaces:

1. **README min-version matrix** (above) — the authoritative, audience-facing
   statement of SDK 56 / RN 0.85 / New Arch / iOS 15.1 / Android 24/36 / Xcode /
   Node floors. Managed and bare users both read this.
2. **A lightweight runtime/JS guard (optional, dev-only).** If a misconfigured
   app instantiates `ShaderView` without New Architecture, or the curated
   metallib fails to load (e.g. below-floor build), the native side already falls
   back to the default shader without crashing (`08` §5.3/5.4); the JS layer can
   additionally emit a one-time `__DEV__` warning pointing at the README matrix.
   This reaches **bare** users too, which a prebuild-time plugin warning never
   would.

This is strictly more coverage than a warn-only plugin, at zero packaging cost.

### Package shape consequence (feeds `00`)
Because there is no plugin, the fx package **omits** the plugin scaffolding that
`00` would otherwise carry:

- **No `app.plugin.js`** at the package root.
- **No `plugin/` source tree**, no `plugin/tsconfig.json`
  (`expo-module-scripts/tsconfig.plugin`), no `build:plugin`
  (`expo-module build plugin`) step in `prepack` — `prepack` builds only the JS.
- **No `@expo/config-plugins`** dependency (neither devDependency nor optional
  peer) and **no `"expo": { "plugin": ... }`** field in `package.json`.
- The `files` allowlist therefore needs **no** `app.plugin.js` / `plugin/build`
  entries; it must still ship `ios/**` incl. `ios/Shaders/**/*.metal` for the
  resource bundle (`08` "feeds 00").

If a future version introduces a real native mod, reintroducing the plugin is the
standard Expo library pattern (`app.plugin.js` + `plugin/` built with
`expo-module-scripts`); the sibling repo at
`/Users/duyanhv/works/react-native-runtimes/packages/core` remains the reference
for those mechanics **when** that day comes.

## Decisions
1. **No config plugin in V1.** fx ships **no** `app.plugin.js` and **no**
   `plugin/`. Autolinking (`expo-module.config.json`) links the module; the
   podspec resource bundle (`08`) ships the curated `.metal`. There is no app
   project mutation left for a plugin to own once app-local shaders are removed
   (`08` Decision 8), and a warn-only plugin does not justify its cost. This
   reverses the earlier "ship a small plugin" call.
2. **Curated `.metal` bundling is podspec-native, never plugin (FINAL).** The
   podspec ships fx's curated shaders via
   `resource_bundles = { 'FxShaderShaders' => ['Shaders/**/*.metal'] }` +
   `MTL_LIBRARY_OUTPUT_DIR` (`08` §5.1, Decision 5). The (absent) plugin never
   touches shaders. This feeds `00`'s podspec scaffold.
3. **No app-local / app-provided shaders in V1.** The app developer authors no
   `.metal`; there is no `shaderDirectories` option, no copy step, and no extra
   Xcode build phase — the option is removed from scope, not deferred as a typed
   stub (`08` Decision 8).
4. **Do not mutate Android in V1, and do not reserve a plugin for it.** Android
   remains a later backend (`03`); when it needs a real mod, introduce a plugin
   then.
5. **Compatibility validation moves to docs + a dev-only runtime guard**, not a
   prebuild hook — which also reaches bare users (see Findings).
6. **Pin the README min-version matrix** to: **Expo SDK 56+ / RN 0.85+**,
   **New Architecture (Fabric) REQUIRED**, **iOS deployment target 15.1**
   (satisfied by the SDK 56 baseline; no raise needed),
   **Android `minSdk 24` / `compileSdk 36` / `targetSdk 36`**, Xcode 16.1+,
   Node 20.19.4+. State that fx needs a **development build** (not Expo Go).
7. **Managed install:** `npx expo install react-native-fx`, then
   prebuild/dev-build. **No `"plugins"` entry.** Autolinking links the module; the
   podspec resource bundle compiles the curated `.metal`.
8. **Bare install:** `npx install-expo-modules@latest` (patches Podfile
   `use_expo_modules!`, AppDelegate, settings/build.gradle autolinking, iOS
   target) → `npx expo install react-native-fx` → `pod install`. Bare users
   hand-patch nothing fx-specific; they must verify New Arch + iOS target only.
9. **Resolve doc `01`'s open question:** with the SDK-56 floor, the JS binding
   uses `import { requireNativeView } from 'expo'` (available since SDK 52), not
   `requireNativeViewManager`.
10. **Ship a bare RN example app in CI.** Add a second harness alongside the
    managed `example/`: a bare RN 0.85 app with New Arch ON that runs
    `install-expo-modules` + `pod install` and builds fx on iOS + Android in CI on
    every PR. With no plugin to normalize config at prebuild, CI is the only thing
    that keeps the **bare + Fabric** path (the #1 breakage) from rotting across
    RN/Expo upgrades.
11. **Package shape (feeds `00`):** omit all plugin scaffolding — no
    `app.plugin.js`, no `plugin/` tree / `build:plugin` step, no
    `@expo/config-plugins` dependency, no `"expo": { "plugin" }` field. Keep
    `ios/Shaders/**/*.metal` in the `files` allowlist for the resource bundle.

## Open questions
- **Exact dev-only guard surface:** decide where the optional `__DEV__`
  New-Arch / metallib-missing warning lives (JS `ShaderView` wrapper vs native
  module init) and how it references the README matrix. Low stakes; ties to `01`.
- **Bare-CI cost/runtime:** building a bare iOS app in CI is slow; decide whether
  to gate the bare matrix to a nightly/merge-queue job vs every PR.
- Confirm whether upgraded bare RN 0.85 projects always preserve New Architecture
  after the upgrade helper path, to know how loud the README "enable New
  Architecture" callout must be (more load-bearing now that no plugin normalizes
  it).
- **Plugin reintroduction trigger (V2+):** if/when an app-provided-shaders escape
  hatch or an Android backend lands a real native mod, that is the point to add a
  config plugin — scoped to that mod. Explicitly out of V1 (ties to `08`/`03`).

## Sources
- Bare RN — install Expo modules (what `install-expo-modules` / manual install
  patches: `use_expo_modules!`, AppDelegate, settings/build.gradle, iOS target):
  https://docs.expo.dev/bare/installing-expo-modules/
- CNG — how a library author adopts CNG (autolinking vs config plugin vs
  lifecycle listeners; the **"no side-effects → autolinking suffices"** case that
  decides fx's no-plugin call):
  https://docs.expo.dev/llms-full.txt
- Config-plugin development for libraries (the scaffolding fx now omits —
  `app.plugin.js`, `plugin/` + `expo-module-scripts/tsconfig.plugin`,
  `expo.plugin`, build/files — kept as the V2 reference):
  https://docs.expo.dev/config-plugins/development-for-libraries/
- Brownfield/integrated autolinking (settings.gradle `expoAutolinking.useExpoModules()`):
  https://docs.expo.dev/brownfield/installing-expo-modules/ ·
  https://docs.expo.dev/brownfield/integrated-approach
- Expo SDK 56 changelog (RN 0.85 / React 19.2, SDK 56 release train):
  https://expo.dev/changelog/sdk-56
- React Native 0.85 release (New Animation Backend, Node floor >=20.19.4):
  https://reactnative.dev/blog/2026/04/07/react-native-0.85
- iOS deployment target 15.1 baseline (Apple minimum; Expo/RN default; satisfied
  by the SDK 56 baseline so fx needs no plugin-set floor):
  https://docs.expo.dev/versions/latest/sdk/build-properties/ ·
  https://expo.dev/blog/apple-sdk-minimum-requirements
- Android `RenderEffect.createBlurEffect` = API 31 (Android 12; later backend):
  https://developer.android.com/reference/android/graphics/RenderEffect
- `requireNativeView` re-exported from `expo` since SDK 52 (resolves doc 01):
  https://github.com/expo/expo/blob/main/packages/expo/CHANGELOG.md ·
  https://docs.expo.dev/modules/module-api/
- Config-plugin reference for the V2 reintroduction case (far more side-effects
  than fx needs, hence not copied in V1):
  `/Users/duyanhv/works/react-native-runtimes/packages/core`
  (`app.plugin.js`, `plugin/src/index.ts`, `plugin/tsconfig.json`, `package.json`).
- Cross-refs: doc `00` (autolinking/`expo-module.config.json`, `files` allowlist,
  omit plugin scaffolding), `01` (view DSL, `requireNativeView`, dev-only guard),
  `08` (curated `.metal` resource bundle + curated-library-only ruling that
  removes app-local shader handling), `03` (Android backend later), `06`
  (per-view lifecycle).
