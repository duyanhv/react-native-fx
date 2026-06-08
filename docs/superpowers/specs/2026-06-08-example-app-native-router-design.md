# Example app: native router, native tabs/header, device theming, @expo/ui

**Date:** 2026-06-08
**Scope:** primarily the `example/` dev-harness app. A small library packaging
change in `packages/` is required so the example can consume it by package name
(see "Library consumption" below).

## Problem

The example app is a device-verification harness for the fx runtime. Today it is a
single 360-line `App.tsx` that hand-rolls navigation with `useState` (a task list
swaps to per-task screens), hardcodes a dark palette while `app.json` declares
`userInterfaceStyle: "light"`, and has no router, no native header, and no native
tab bar. expo-router and every navigation/safe-area dependency is uninstalled.

Goals:

1. Fix the app: replace hand-rolled navigation with a real router and native chrome.
2. Theme from the device appearance (light/dark), with an in-app override.
3. Adopt expo-router (Expo SDK 56, RN 0.85).
4. Native tabs (`expo-router/unstable-native-tabs`) and native stack headers.
5. Use `@expo/ui` native controls where they replace hand-styled widgets.

Non-goals: changing the fx library, persisting settings, adding web-specific
layouts, or building product UI. This stays a harness.

## Architecture

### Routing tree

```
example/
  app/
    _layout.tsx              ThemeRoot (device theme + override context) → <NativeTabs>
    (tasks)/
      _layout.tsx            <Stack> — native large-title header
      index.tsx              verification task list (current TASKS array)
      [taskId].tsx           task detail: FillMaterial | Shader | Blank
    (comps)/
      _layout.tsx            <Stack>
      index.tsx              fx component catalog list (Fill/Material, Shaders, ...)
      [compId].tsx           component demo: FillMaterial | Shaders | Blank
    settings/
      _layout.tsx            <Stack>
      index.tsx              theme override + build info
  components/
    theme.tsx                palette tokens (light/dark), ThemeProvider wrapper, useTheme/override context
    native-segmented.tsx     agnostic segmented control over @expo/ui Picker (.ios / .android)
    native-slider.tsx        agnostic slider over @expo/ui Slider (.ios / .android)
  screens/
    fill-material.tsx        moved verbatim from App.tsx (FxHostedView usage unchanged)
    shader-catalog.tsx       moved from App.tsx ShaderScreen; intensity → native slider
    task-blank.tsx           moved from App.tsx BlankScreen
```

Three native tabs, each owning its own `Stack` so it gets a native large-title
header (native tabs render no header themselves):

| Tab        | route group | SF symbol               | Material symbol |
| ---------- | ----------- | ----------------------- | --------------- |
| Tasks      | `(tasks)`   | `checklist`             | `checklist`     |
| Comps      | `(comps)`   | `square.stack.3d.up`    | `widgets`       |
| Settings   | `settings`  | `gearshape`             | `settings`      |

Tab order: Tasks, Comps, Settings. No search role tab.

The Comps tab is the fx component catalog: `index.tsx` lists the runtime's
components/capabilities, each row pushing `[compId].tsx`. The shader catalog is
**one** entry (`compId === "shaders"`); Fill & Material is another
(`compId === "fill-material"`); not-yet-built components are todo rows that push
the blank screen. This browses fx *by component*, complementing the Tasks tab
which lists the same demos *by verification status*.

### Theming (expo-router only, no react-navigation)

expo-router is built on react-navigation, but the app uses **only** expo-router's
own APIs and never imports `@react-navigation/native`. The native chrome (native
tabs, native stack header) themes itself from the OS appearance trait, so theming
is driven entirely by the system color scheme — no `NavigationThemeProvider`.

`components/theme.tsx` owns:

- `lightPalette` / `darkPalette` — named tokens (`background`, `surface`,
  `surfaceBorder`, `text`, `textMuted`, `accent`, plus the status-badge colors)
  replacing the scattered hex in `App.tsx`.
- A `ThemeProvider` (React context) exposing `{ palette, scheme, override, setOverride }`.
  `scheme` comes from RN `useColorScheme()`. `override` is `'system' | 'light' | 'dark'`,
  default `'system'`, held in memory only.
- `setOverride` calls RN `Appearance.setColorScheme(override === 'system' ? null : override)`.
  Because this sets the OS appearance trait, the **native** tab bar and header
  re-theme too — not just app content — without any react-navigation theme object.
  `useColorScheme()` then reflects the forced value and feeds the palette.
- `useTheme()` hook for screens.

For explicit tints on native chrome (e.g. `NativeTabs tintColor`, header title
color) use `PlatformColor("label")` / `DynamicColorIOS({light,dark})` so they stay
adaptive under the OS trait.

`app.json`: `userInterfaceStyle` → `"automatic"`.

Default behavior = follow the device. The Settings override is a demonstrable,
testable control on top; it does not persist (YAGNI).

### @expo/ui usage

`@expo/ui` is platform-split (`@expo/ui/swift-ui` vs `@expo/ui/jetpack-compose`),
so each control is wrapped in an agnostic component that branches by platform file
(`native-segmented.ios.tsx` / `.android.tsx`) and exposes one prop interface:

- `NativeSegmented` — `{ options: string[]; selectedIndex: number; onChange(i) }`.
  iOS: SwiftUI `Picker` with segmented style inside `Host`. Android: Compose
  segmented buttons / `Picker` inside `Host`.
- `NativeSlider` — `{ value: number; min; max; step?; onChange(v) }`. iOS: SwiftUI
  `Slider`. Android: Compose `Slider`.

Used in: Settings (theme override → `NativeSegmented`), the shader demo (intensity →
`NativeSlider`; shader pick → `NativeSegmented` or kept as chips if the 10-option
count is too high for a segmented control — decided during build by readability).

The exact SDK 56 `@expo/ui` API is verified from the installed `.d.ts` and
`https://docs.expo.dev/versions/v56.0.0/sdk/ui/...` before each component is used,
per `example/AGENTS.md`.

## Plumbing

1. Install via `expo install` (SDK-56-correct versions), using the repo's bun:
   `expo-router`, `react-native-safe-area-context`, `react-native-screens`,
   `expo-linking`, `expo-constants`, `expo-system-ui`, `@expo/ui`.
   Let `expo install` add any further required peers (e.g. reanimated/gesture
   handler) rather than pinning by hand.
2. `package.json`: `main` → `"expo-router/entry"`. Remove `index.ts` and `App.tsx`.
3. `app.json`: add `"scheme": "rnfxexample"`, add `expo-router` to `plugins`,
   set `userInterfaceStyle: "automatic"`. Optionally enable typed routes.
4. `metro.config.js`: extend `extraNodeModules` so `expo-router` and the new nav
   singletons resolve from `example/node_modules` (the existing react/expo
   singleton blocklist stays; verify the new deps are not duplicated under
   `../packages` or root, add to the blocklist if they are).
5. Native rebuild — `@expo/ui`, `expo-router`, `react-native-screens` add native
   code, so `expo run:ios` / `expo run:android` is required; Expo Go is already
   out (the app links the local `react-native-fx` module).

## Library consumption (packages change)

The example consumes the library **by package name**, mirroring the `references/`
repos (nitro, react-native-runtimes); the old deep relative import into
`../packages/src` does not work under Expo SDK 56 metro (it will not crawl files
reached by a relative path escaping the project root). Required changes:

- `packages/package.json`: add `"source": "src/index.ts"` and
  `"react-native": "src/index.ts"`; remove the `exports` field (it pinned
  resolution to an unbuilt `build/` and sealed the package). `main`/`types` stay
  for npm publish.
- `packages/src/index.ts`: export the runtime substrate views (`FxHostedView`,
  `FxSurfaceView`, `FxGroupView`) from the public entry — promoting them from
  internal to public API (an intentional, approved exception to the deferral in
  the index's own comment), since the harness needs them.
- `example/package.json`: depend on `"react-native-fx": "file:../packages"`.
  bun copies it (hardlinked, no nested react/expo — singleton-safe); the metro
  `react-native-fx` alias is removed. Library JS edits need `bun install` to
  refresh the copy; native is always live via autolinking.
- `example/tsconfig.json`: `paths` map `react-native-fx` → `../packages/src`.

## Migration of existing screens

The `FxHostedView` usage is preserved exactly; the import changes from a deep
relative path to `import { FxHostedView } from "react-native-fx"`, and the
container moves:

- `FillMaterialScreen` → `screens/fill-material.tsx`, rendered by
  `app/(tasks)/[taskId].tsx` when `taskId === "U3-001"`.
- `ShaderScreen` → `screens/shader-catalog.tsx`, rendered as the `shaders` entry of
  the Comps tab (`app/(comps)/[compId].tsx`) and reused by the Tasks tab for U3-006.
  Intensity chips become `NativeSlider`.
- `BlankScreen` → `screens/task-blank.tsx`, default detail for todo tasks/comps.
- The `TASKS` array and the Comps catalog list move to `data` modules imported by
  the route files — kept out of the `app/` dir per the route-structure rule that
  `app/` holds only routes.
- Back buttons (`< Back`) are deleted — the native header provides back.
- All `StyleSheet` colors are replaced by `useTheme().palette` tokens; structural
  styles (sizes, layout) stay.

## Testing / verification

Effects do not run headless. After the native rebuild, verify on a device/simulator:

- App boots into the Tasks tab with a native large-title header and a native tab bar.
- Switching device appearance (light/dark) re-themes headers, tab bar, and screens;
  the Settings override forces light/dark independent of the device.
- Tapping a task pushes a native-header detail with a working native back.
- U3-001 still renders fill + iOS material; the shader catalog still renders shaders
  with the native slider driving intensity.
- Both iOS and Android build and run (iOS and Android are peers).

Captured per `guides/Device Verification Guide.md`.

## Risks

- **Singleton duplication** under the bun monorepo metro setup — mitigated by
  extending `extraNodeModules`/blocklist and a clean rebuild.
- **`@expo/ui` SDK 56 API drift** from the SDK-55 skill — mitigated by reading the
  installed `.d.ts` and v56 docs before use; fall back to RN controls if a needed
  control is unavailable.
- **Native tabs are `unstable`** — acceptable for a harness; pinned to the SDK 56
  `expo-router/unstable-native-tabs` entry point.
