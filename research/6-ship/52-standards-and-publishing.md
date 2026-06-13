# Library standards & publishing
Status: researched
Phase: v1
Feeds: the published package
Owns: repo/package conventions, the internal `src/` layering, build, asset bundling, release.

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
├── src/                  # TS — layered to mirror the research planes (see below)
│   ├── surface/          #   FxPresence, FxView/FxPressable, the curated components, the generic <Fx>
│   ├── motion/           #   motion vocabulary, role presets
│   ├── effects/          #   effect components/semantics, shader ids
│   ├── presets/          #   presets, palettes, themes (the JS-resolution layer, 50)
│   ├── manifest/         #   the capability manifest + select()  — a dependency SINK
│   ├── runtime/          #   JS-side bindings only (requireNativeView, dispatch-and-mount)
│   └── index.ts          #   the public surface (fx, FxPresence, EdgeGlow, …) — the contract
├── ios/                  # Swift: FxModule, the ExpoView subclasses, the native runtime, Shaders/*.metal
├── android/              # Kotlin: FxModule, the ExpoView subclasses, the native runtime, assets/*.agsl
├── expo-module.config.json   # autolinking: platforms + module classes
└── package.json
example/                  # dev harness (iOS + Android) — also the demos
```

## Internal `src/` structure (the layering)

The `src/` folders mirror the research planes/domains, so `research/3-motion/` ↔
`src/motion/`. The structure is a navigation aid, **not** a published contract — only the
`exports` map is (below).

- **Dependencies point one way, toward `manifest/`.** `manifest/` (the IR + `select()`)
  imports nothing from `surface`/`motion`/`effects`/`presets`/`runtime` — it is the
  dependency **sink**, keeping "every layer is a manifest consumer" (`02`) true in code.
- **`runtime/` is JS bindings only.** The real runtime — shadow nodes, layout, the
  animation driver (`33`/`34`/`35`) — is native, in `ios/`/`android/`. `src/runtime/` is
  just `requireNativeView`, the module wrappers, and the dispatch-and-mount glue.
- **`fx` (the composition chain) lives at the root export, not under `motion/`.** It spans
  effects *and* motion (`55`), so it is surface-level, not a motion primitive.
- **`presets/` is its own concern** (presets + palettes + themes, `50`), separate from
  `effects/` — so `react-native-fx/presets` resolves honestly if subpaths ship.

### Public exports — root first, subpaths are optional V2 polish

The internal folders are private. The **only stability contract is `package.json`
`exports`.** Ship a **single root export** for V1 — the ratified vocabulary (`50`/`54`–`57`):

```ts
import {
  fx,                          // the composition chain — spans effects + motion (55)
  FxPresence,                  // content enter/exit (54)
  FxView, FxPressable,         // mounted-state + press primitives (57)
  Fx,                          // the effect primitive — single id or EffectStack (55)
  FxGroup, FxItem,             // the glass morph compound (57)
  // curated effect component (EdgeGlow) — ratified in DOC-004; MeshGradient is a fill,
  // reached via <Fx effect="…">. Optional sugar, NOT committed root exports.
} from 'react-native-fx';
```

The export-map shape is the actual contract — **root export only in V1, no subpaths**:

```jsonc
// package.json
"exports": {
  ".": {
    "types": "./build/index.d.ts",
    "react-native": "./build/index.js",   // Metro/RN entry
    "default": "./build/index.js"
  }
},
"main":  "build/index.js",      // fallback for non-`exports` resolvers
"types": "build/index.d.ts"
```

Subpath exports (`react-native-fx/motion`, `react-native-fx/presets`) are **optional
namespacing ergonomics, not V1**: on Metro they need package-`exports` resolution
(**verify on the pinned SDK 56 / RN 0.85 toolchain** — historically finicky) and buy
almost no bundle savings (Metro tree-shakes poorly). Add them later only if the
namespacing earns its keep.

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
6. **One package, layered `src/` mirroring the research planes** (`surface` · `motion` ·
   `effects` · `presets` · `manifest` · `runtime`). Folders are navigation, not contract.
7. **Dependencies point one way, toward `manifest/` (the sink); `runtime/` is JS bindings
   only.** `fx` exports from the root (it spans effects + motion); `presets/` is its own
   concern.
8. **The `exports` map is the only stability contract — root export for V1**; subpath
   exports are optional V2 polish (verify Metro `exports` support; minimal bundle benefit).
9. **V1 curated shaders are hand-maintained MSL+AGSL pairs** — author the `.metal` and
   `.agsl` implementation for each catalog id directly. The author-once compiler remains
   additive V2 build-time codegen (`03`), not a prerequisite for the V1 catalog.
10. **Do not scope-split into *multiple* `@react-native-fx/*` packages yet** — version
    coordination, install friction, and premature boundaries before the product is stable.
    The only later split worth considering: `@react-native-fx/compiler` (the optional
    build-time shader/effect emitter, `03`) and `@react-native-fx/lab` (experimental
    effects/recipes — a home for the "where curation ends" question in `00`, kept out of
    core's semver). **The single V1 package itself publishes as `@react-native-fx/core`
    (DEF-015)** — not a split, a name: the unscoped `react-native-fx` is unclaimable on npm
    (typosquat filter vs `react-native-fs`), so the scope is the only way to keep the exact
    product identity. Claiming the scope for the core package also reserves the namespace,
    de-risking the later `compiler`/`lab` split. The mechanical rename of `packages/package.json`
    + the install/import snippets across docs is DEF-016.
11. **Palettes/themes as a shareable artifact are deferred to V2.** Pure-config palettes
    resolve in JS within the core package (`presets/`). Consumer-authored palettes as a
    distribution surface would live in `@react-native-fx/lab` if demand justifies the split.
    This decision is recorded in `00` (SPINE-002, DOC-003).
12. **V1 named effect-component set ratified (DOC-004).** `EdgeGlow` ships as a component;
    `MeshGradient` does not. The criterion is: drawn whole by fx, standalone-useful, and the
    canonical API remains `<Fx effect="…">`. These are sugar over effects already in the
    curated catalog (DOC-003, SPINE-001) — not new surface. They export from the core package,
    not `@react-native-fx/lab` (consistent with Decision #10).

## Findings

- **iOS shader bundle resolution.** CocoaPods emits `FxShaders.bundle` unmangled with
  `default.metallib` at its root, per the `resource_bundles` + `MTL_LIBRARY_OUTPUT_DIR`
  mechanism (Decision #2). The hosted shader path resolves the bundle at runtime via
  `ShaderLibrary(url:)` against `FxShaders.bundle`. Build-verified locally on Xcode 26.5 /
  Swift 6.3.2 (U3-005); the CI `bare-ios` job (U1-004) separately confirmed native compile
  + autolink on `macos-26` / Xcode 26. The bundle layout is determined by the podspec
  mechanism, which is toolchain-stable. Render-verified on device (U3-006).
- **Android AGSL asset path.** Curated AGSL shaders ship under
  `android/src/main/assets/shaders/*.agsl` and are read at runtime via
  `context.assets.open("shaders/<id>.agsl")`. No build-time shader compile step is
  required. Below API 33 the shader rung is unavailable. Pin recorded in `structure.android.md`
  §Render paths. Device-verified on API 35 (U3-006).

## Open questions

- ~~**`surface/` exports come from the ratified vocabulary (`50`/`54`–`57`), not the folder
  layout.**~~ — **Resolved (DOC-004, DOC-005).** The component set is pinned: `FxPresence`
  (`54`), `FxView`/`FxPressable`/`FxGroup`/`FxItem` (`57`), `<Fx>` single-or-stack (`55`),
  plus the curated effect component `EdgeGlow` (`56`). `FxLayer` was dropped (folded into
  `<Fx>`). The package must not introduce un-ratified API names.

## Sources

- `_legacy/00-library-standards-and-publishing.md` — scaffold, Bun workspace, package
  fields, repo hygiene.
- `_legacy/08-shader-accents-and-distribution.md` §5 — the iOS `resource_bundles`
  bundling mechanism.
- `structure.{ios,android}.md` — runtime asset loading; `53` — install/autolinking.
