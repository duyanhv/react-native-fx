# Library standards & publishing
Status: researched
Phase: v1
Feeds: the published package
Owns: repo/package conventions, build, asset bundling, release.

## Why this matters

fx is a public, premium library, not app code — scaffolding, layout, entry fields,
`files` allowlist, and release are expensive to change once published. Pin the standard
up front. The cross-platform thesis adds one real packaging constraint over the old
iOS-only framing: the library ships **both** `.metal` (iOS) and `.agsl` (Android)
shader assets, and each platform's build must compile/package its own.

## Scaffold & layout

- **`npx create-expo-module@latest react-native-fx`** — the canonical generator for a
  publishable Expo Modules native view library (Swift, Kotlin, TS API, `example/` app,
  `expo-module.config.json`).
- **Bun workspace**: the publishable library in `packages/` (npm `react-native-fx`), the
  dev harness in a root `example/`. Exactly one publishable package for V1.
- Replace the template lint/format with the repo standard; add public-library docs
  (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, issue/PR templates, CI).

```
packages/
├── src/              # TS public API (components, presets, the manifest + adapter)
├── ios/              # Swift: FxModule, the ExpoView subclasses, Shaders/*.metal
├── android/          # Kotlin: FxModule, the ExpoView subclasses, assets/*.agsl
├── expo-module.config.json   # autolinking: platforms + module classes
└── package.json
example/              # dev harness (iOS + Android) — also the demos
```

## Cross-platform shader asset bundling

The keystone packaging detail — each platform compiles/packages its own shader assets:

- **iOS (`.metal`)** — ship via the podspec **`resource_bundles`** (NOT `source_files`,
  because the pod is `static_framework`), with the Metal compiler output redirected:
  ```ruby
  s.resource_bundles = { 'FxShaders' => ['Shaders/**/*.metal'] }
  s.pod_target_xcconfig = { 'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaders.bundle' }
  ```
  Produces `default.metallib` inside `FxShaders.bundle`, loaded at runtime via a
  linkage-agnostic bundle lookup (`structure.ios`).
- **Android (`.agsl`)** — AGSL is a string/resource compiled at runtime by
  `RuntimeShader`, so the `.agsl` ship as packaged assets/resources read at load time
  (`structure.android`). No build-time shader compile step.
- **npm `files` allowlist** must ship both asset trees (`ios/Shaders/**/*.metal`,
  `android/**/*.agsl`) so they reach consumers.

## package.json & release

- Entry fields per the Expo template (`main`/`types` → `build/`), peer-dep
  `expo`/`react`/`react-native`, `publishConfig` public.
- A positive `files` allowlist (not just `.npmignore`) for publish safety — and it must
  include the shader asset trees above.
- Semver + changelog + automated release; Conventional Commits.

## Decisions

1. **`create-expo-module` scaffold, Bun workspace, one publishable package** in
   `packages/`; dev harness in root `example/`.
2. **iOS `.metal` ship via `resource_bundles` + `MTL_LIBRARY_OUTPUT_DIR`** (not
   `source_files`); loaded via linkage-agnostic bundle lookup.
3. **Android `.agsl` ship as packaged assets** compiled at runtime by `RuntimeShader`.
4. **`files` allowlist ships both shader asset trees** + `build/` + native dirs.
5. **Standard public-library hygiene** (docs, templates, CI, semver, Conventional Commits).

## Open questions

- **Resource-bundle name (needs-device)** — confirm CocoaPods emits `FxShaders.bundle`
  unmangled and `MTL_LIBRARY_OUTPUT_DIR` lands `default.metallib` at the bundle root on
  the pinned SDK 56 toolchain (carried from `_legacy/08`/`00`).
- **AGSL asset packaging path** — exact Android assets vs res/raw location and the
  runtime read API; pin with `structure.android`.
- **Single source for the curated shaders** — author once (GLSL/SkSL) → transpile to
  MSL+AGSL, or hand-maintain the pair per effect? (Ties to `03` compiler.)

## Sources

- `_legacy/00-library-standards-and-publishing.md` — scaffold, Bun workspace, package
  fields, repo hygiene.
- `_legacy/08-shader-accents-and-distribution.md` §5 — the iOS `resource_bundles`
  bundling mechanism.
- `structure.{ios,android}.md` — runtime asset loading; `53` — install/autolinking.
