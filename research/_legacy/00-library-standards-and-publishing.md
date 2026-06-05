# Library standards & publishing (foundation)
Status: researched
Feeds: skills/react-native-fx/references/quickstart.md (repo conventions underpin everything)

## Why this matters
fx is a **public, premium library**, not app code. The scaffolding, repo layout,
build tooling, entry-point fields, and release process are decisions that are
expensive to change once published (renames break installs, wrong `files`/
`.npmignore` ships secrets or bloats the tarball, wrong entry fields break
Metro/TS). Pin the standard up front. The good news: there's a canonical
generator for exactly our case (`create-expo-module`), and a real published
sibling repo (`react-native-runtimes`) to copy repo-level conventions from.

One caveat verified during this pass: **`react-native-runtimes` uses Nitro
Modules + a hand-rolled `tsc` build**, so its *entry-field shape*
(`main`/`react-native`/`source` + `lib/`) and its `files` allowlist are **not**
what `create-expo-module` emits. Copy runtimes for *repo conventions* (release,
CI, README, keywords, monorepo split) — but take entry fields and the
build pipeline from the **actual Expo template** (verified below), not from
runtimes.

**Layout reality (verified this pass):** the repo is now a **Bun workspace**, not
single-package-at-root. The publishable library lives in **`packages/`** (npm
name `react-native-fx`, pod `FxShader`) and the dev harness is a **root-level
`example/`**. Root `package.json` is a private workspace
(`"workspaces": ["packages"]`). All package-relative paths in this doc therefore
resolve under `packages/` (e.g. `packages/ios/FxShader.podspec`,
`packages/ios/Shaders/`, `packages/expo-module.config.json`). The "single package
now vs monorepo later" guidance below is reconciled to this reality — the repo
adopted the workspace split early, but still ships **exactly one** publishable
package for V1.

**Feed-forward from `08` (applied below):** curated `.metal` shaders ship inside
the library and the consumer's Xcode must compile them into a metallib. This is a
hard constraint on the **podspec** (resource bundle, not source files, because the
pod is `static_framework`) and on the **npm `files`/`.npmignore`** (the `.metal`
sources must reach the tarball). See the new **Metal shader packaging** subsection
under Findings and Decision 13.

## Research questions
- What's the standard scaffolder for a publishable native library, and which one
  fits fx (Expo Modules) vs the generic RN path?
- The standard project layout and what each directory/file is for.
- Build tooling: what compiles TS + native, and produces the published artifact.
- The `package.json` fields that matter for a native RN/Expo library (entry
  points, `files`/`.npmignore`, `exports`, peer deps, `publishConfig`).
- Autolinking registration (`expo-module.config.json`).
- Versioning + release process (semver, pre-releases, changelog, automation).
- Single package vs monorepo — and the exact trigger for adding a second package.
- New Architecture / Fabric declaration; should the example enable New Arch?
- The example app as a dev harness; docs/site; CI; license; npm discovery.
- Public-library repo hygiene: contributing docs, issue/PR templates, security
  policy, changelog, formatter/linter, package-manager pinning, engines.

## Findings

### The standard scaffolder
- **fx's case (Expo Modules) → `npx create-expo-module@latest react-native-fx`.**
  Canonical, Expo-maintained generator for a *publishable* native module + view
  library. It scaffolds Swift (iOS), Kotlin (Android), a TS API, an `example/`
  app for both platforms, `expo-module.config.json`, and starter build/lint/test
  scripts. We keep the scaffold but replace its default lint/format stack with
  **Biome**. (`--local` is the *other* mode — for in-app modules under
  `modules/`, **not** published to npm; **not** us.) Verified against the actual
  template package `expo-module-template@56.0.12` (what the generator fetches).
- **The generic-RN standard** is Callstack's **`create-react-native-library`**
  + **`react-native-builder-bob`** (the build tool). Right choice when you author
  raw Turbo/Fabric Codegen specs by hand. fx deliberately uses Expo Modules (see
  `01-expo-modules-view.md`), so `create-expo-module` is the front door — but bob
  is worth knowing because much of the ecosystem (and many docs) assume it.
- **Real reference:** `react-native-runtimes` (sibling repo) is a published lib
  using **Nitro + a manual `tsc` build**. Its *repo-level* conventions
  (release-it, CI matrix, README badges, keywords, monorepo split) are the ones
  to copy; its entry fields are Nitro/bob-style, not Expo-template-style.

### Standard project layout for fx
Start from `expo-module-template@56`, then adapt it for fx's day-one decisions:
plugin exists, `expo-module-scripts` is used, Bun is pinned, Biome owns
lint/format, and public-library docs/templates are present. The resulting
scaffold is:
```
react-native-fx/
├── src/                      # TS public API
│   ├── index.ts
│   ├── ReactNativeFx.ts      # the native module loader
│   ├── ReactNativeFx.web.ts  # web fallback (.web.ts)
│   └── ReactNativeFx.types.ts
├── ios/                      # ReactNativeFx.swift, ReactNativeFx.podspec
├── android/                  # build.gradle, src/ (Kotlin)
├── expo-module.config.json   # autolinking: platforms + native module classes
├── app.plugin.js             # config plugin entrypoint
├── plugin/                   # plugin/src -> plugin/build
├── example/                  # dev-harness app (iOS + Android) — also the demos
├── package.json
├── tsconfig.json             # rootDir src → outDir build; moduleResolution bundler
├── biome.json                # lint + formatting (source of truth)
├── .editorconfig             # editor whitespace/newline baseline
├── .npmignore                # what does NOT ship (template uses this, not files[])
├── README.md
├── docs/                     # package docs; site wrapper can come later
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
└── .github/
    ├── workflows/
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```
Note the template ships **`internal/module_scripts/*.js`** (self-contained `tsc`
wrappers) and wires `package.json` scripts to them. fx intentionally replaces
that path with `expo-module-scripts` because plugin exists on day one. The
template also uses a **`.npmignore`** (exclusion list) rather than a `files`
allowlist by default; fx uses a positive `files` allowlist for publish safety.
fx also overrides the template lint/format defaults with Biome and adds the
public library docs/templates above.

### Mature Expo package reference: `packages/expo-ui`
Local check: `/Users/duyanhv/works/expo/packages/expo-ui` is a useful reference
for a real, shipped Expo UI module, but it is **not** the standalone template.
It uses Expo monorepo conventions:

- Package scripts are `expo-module build`, `expo-module clean`,
  `expo-module lint`, `expo-module test`, and `expo-module prepublishOnly`
  through `expo-module-scripts`.
- `tsconfig.json` extends `expo-module-scripts/tsconfig.base`; `plugin/tsconfig`
  extends `expo-module-scripts/tsconfig.plugin`.
- `babel.config.js` is generated from `expo-module-scripts/babel.config.base`.
- `expo-module.config.json` uses `name`, `platforms`, `coreFeatures`, `apple`,
  and `android`; for expo-ui the core features are `swiftui` and `compose`.
- It has explicit platform roots: `ios/`, `android/`, `src/swift-ui/`,
  `src/jetpack-compose/`, `src/universal/`, `src/community/`, plus `plugin/`.
- `package.json` exposes multiple public subpaths through `exports`, including
  `./swift-ui`, `./jetpack-compose`, community adapters, and `./babel-plugin`.
  Each export points `types` at `build/...` and `default` at `src/...`.
- It ships package-local `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and
  `.npmignore`; repo-level Expo files cover broader `SECURITY.md`, issue
  templates, and workflows.
- Its package README is intentionally tiny; the real docs live in Expo's docs
  repo under `docs/pages/guides/expo-ui-*`,
  `docs/pages/versions/*/sdk/ui/index.mdx`, generated API JSON under
  `docs/public/static/data/*/expo-ui/**`, and screenshots under
  `docs/public/static/images/expo-ui/**`.
- API docs are generated from source comments. `expo-ui` component files use
  TSDoc comments and `@example` blocks; Expo's root contributing flow calls
  `et generate-docs-api-data -p <package-name>`.
- iOS packaging is explicit: `ios/ExpoUI.podspec` sets iOS/tvOS deployment
  floors, Swift version, `static_framework`, ExpoModulesCore, Worklets, Fabric,
  and Objective-C/Swift source globs. It also has `spm.config.json` for Expo's
  Swift Package Manager prebuild tooling.

What fx should copy from expo-ui:

- Keep platform/API folders obvious. For fx V1 that means `src/shader/`,
  `src/interaction/`, `ios/` Metal renderer files, optional `plugin/`, and
  example demos that map directly to the public API.
- Use `CONTRIBUTING.md` as a workflow gate, not a generic doc. The fx version
  should require rebuilt JS output, iOS shader demo updates, native interaction
  verification, docs updates, and `npm pack --dry-run`.
- Treat TypeScript source comments as API-doc source. Every exported component,
  prop type, preset, event, and imperative method should have concise TSDoc and
  at least one `@example` when the behavior is not obvious.
- Model the podspec level of explicitness: iOS floor, Swift version,
  `static_framework`, ExpoModulesCore, Fabric, and any Metal shader resource
  globs must be named deliberately.
- Adopt `expo-module-scripts` immediately if the config plugin or plugin tests
  exist on day one; otherwise the template scripts are still acceptable for the
  first scaffold.

What fx should **not** copy blindly:

- Do not copy Expo's ESLint/Prettier setup. fx lint/format remains **Biome**.
- Do not copy expo-ui's broad `exports` map unless fx has real public subpaths
  (`./shader`, `./plugin`, etc.). For a single V1 surface, the template
  `main`/`types` pair is lower-risk.
- Do not copy `src/swift-ui` / `src/jetpack-compose` taxonomy; fx's thesis is
  an interactable native iOS Metal shader view, not native framework wrappers.
- Do not treat `spm.config.json` as required for a standalone npm package.
  Add it only if SwiftPM distribution/prebuild support becomes an explicit
  release target.
- Do not defer all documentation because the docs site is deferred. The site
  shell can wait; README, local docs, examples, screenshots, and source comments
  are part of the V1 scaffold.

### Build tooling — two valid paths, pick one
There are now **two** Expo-blessed build pipelines; the doc previously conflated
them. Both compile TS → `build/`; native is never "built" into the tarball.

1. **Template-bundled scripts (what `create-expo-module@56` emits by default).**
   `package.json` calls `node internal/module_scripts/build.js` etc. These are
   thin wrappers over `tsc` (with `--watch` in a TTY, no-watch under `CI`).
   Scripts: `build`, `clean`, `test`, `prepare`, `open:ios`, `open:android`.
   Replace the emitted `lint` script with Biome (`biome check`).
2. **`expo-module-scripts` + the `expo-module` CLI** (what Expo's own packages,
   e.g. `expo-linear-gradient`, `expo-image`, use). Scripts become
   `"build": "expo-module build"`, `"build:plugin": "expo-module build plugin"`,
   `"clean": "expo-module clean"`, `"test": "expo-module test"`,
   `"prepare": "expo-module prepare"`, `"prepublishOnly":
   "expo-module prepublishOnly"`. Adds `expo-module-scripts` (dev) and gives you
   the standardized **config-plugin build** (`expo-module build plugin`) and
   shared tsconfig/test presets. Keep Biome as fx's lint/format source even if
   this path is adopted.

**Decision for fx:** use path 2 from day one. fx has a `plugin/` directory in
the initial scaffold, so `expo-module-scripts` is the cleaner baseline:
`expo-module build plugin` compiles `plugin/src` → `plugin/build`, and
`expo-module test` can cover plugin tests. Keep Biome for lint/format; do not
use `expo-module lint`.

**How native code reaches the consumer (verified):** the package ships native
**source** (`ios/*.swift`, `*.podspec`, `android/` Kotlin + `build.gradle`) plus
`expo-module.config.json`. In the consumer app, **Expo Autolinking** discovers
the module from that config; `npx expo prebuild` (or `pod install` / Gradle sync
in bare) then compiles the Swift/Kotlin **in the app's own Xcode/Gradle build**.
There is **no prebuilt `.framework`/`.aar` in the npm tarball** — the app
toolchain compiles it. TS, by contrast, ships pre-compiled in `build/`.

### `expo-module.config.json` (autolinking) — verified shape
The v56 template uses a **`platforms` array** plus per-platform `modules`. Note
the iOS key is **`apple`** (not `ios`) in the current template:
```json
{
  "platforms": ["apple", "android", "web"],
  "apple":   { "modules": ["ReactNativeFxModule"] },
  "android": { "modules": ["expo.modules.reactnativefx.ReactNativeFxModule"] }
}
```
For fx's V1 iOS-led shader component this becomes (names illustrative):
```json
{
  "platforms": ["apple", "android"],
  "apple":   { "modules": ["FxShaderModule"] },
  "android": { "modules": ["com.fx.FxShaderModule"] }
}
```
This is the *entire* manual-linking story — Autolinking wires the listed classes
into the app with zero extra steps for consumers.

### `package.json` — verified entry fields, and the fx skeleton
**Verified truth (v56 template):** the generator emits **only** `main` +
`types`, both pointing at `build/`. It does **not** emit `react-native`,
`source`, or an `exports` map:
```jsonc
"main":  "build/index.js",
"types": "build/index.d.ts",
```
This resolves the standing open question: **current `create-expo-module`
ships the legacy minimal pair, not an `exports` map, and not a Metro
`source`/`react-native` redirect.** Consumers' Metro loads the compiled
`build/index.js`; it does not consume `src/*.ts` directly (that's the
runtimes/bob convention, not Expo's). Keep it that way — match the generator.

`exports` is supported by Metro (package-exports) and is the modern direction,
but the Expo template doesn't use it yet; adding one is optional and risks
subtle resolution differences — **defer unless a real need appears** (e.g.
splitting a `/plugin` subpath).

Copy-ready skeleton for fx (path 2: `expo-module-scripts`, plugin present;
merges runtimes' discovery metadata). Treat devDependency versions as
**SDK 56-compatible values**: copy exact versions from the Expo SDK 56 package
set / generated scaffold when implementing, rather than hand-maintaining this
doc as a lockfile.
```jsonc
{
  "name": "react-native-fx",
  "version": "0.1.0-alpha.0",
  "description": "Interactable native iOS Metal shader views for React Native + Expo.",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "files": [
    "build",
    "src",
    "ios",
    "ios/Shaders/**/*.metal",
    "android",
    "app.plugin.js",
    "plugin/build",
    "plugin/*.d.ts",
    "expo-module.config.json",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "packageManager": "bun@1.3.14",
  "engines": {
    "node": ">=20.19.4"
  },
  "scripts": {
    "build":      "expo-module build",
    "build:plugin": "expo-module build plugin",
    "clean":      "expo-module clean",
    "lint":       "biome check .",
    "format":     "biome format --write .",
    "typecheck":  "tsc --noEmit",
    "test":       "expo-module test",
    "prepare":    "expo-module prepare",
    "prepublishOnly": "expo-module prepublishOnly",
    "prepack":    "bun run build && bun run build:plugin",
    "open:ios":     "bun --cwd example expo run:ios",
    "open:android": "bun --cwd example expo run:android",
    "release": "release-it"
  },
  "keywords": [
    "react-native", "expo", "expo-modules", "ios", "android",
    "fabric", "new-architecture", "metal", "mtkview", "shader",
    "shader-view", "visual-effects", "gpu", "interaction", "ui"
  ],
  "repository": { "type": "git", "url": "https://github.com/<org>/react-native-fx.git" },
  "homepage": "https://github.com/<org>/react-native-fx#readme",
  "bugs": { "url": "https://github.com/<org>/react-native-fx/issues" },
  "author": "<author>",
  "license": "MIT",
  "peerDependencies": {
    "@expo/config-plugins": "*",
    "expo": "*",
    "react": "*",
    "react-native": "*"
  },
  "peerDependenciesMeta": {
    "@expo/config-plugins": { "optional": true },
    "expo": { "optional": false }
  },
  "expo": {
    "plugin": "./app.plugin.js"
  },
  "publishConfig": { "access": "public" },
  "devDependencies": {
    "@babel/core": "<template-emitted>",
    "@expo/config-plugins": "<SDK-56-compatible>",
    "@types/react": "<template-emitted>",
    "babel-preset-expo": "<template-emitted>",
    "@biomejs/biome": "<current>",
    "expo": "<SDK-56-compatible>",
    "expo-module-scripts": "<SDK-56-compatible>",
    "react": "19.2.0",
    "react-native": "0.85.x",
    "release-it": "<current>",
    "typescript": "<template-emitted>"
  }
}
```
Notes on the fields that matter:
- **Entry points:** `main`→`build/index.js`, `types`→`build/index.d.ts`. That's
  it — match the template; do **not** add `source`/`react-native`/`exports`
  unless you have a concrete reason.
- **`peerDependencies`:** keep the Expo-template style (`expo`, `react`,
  `react-native` as `"*"`) so the app owns versions and `expo install` can do
  SDK-aware resolution. Enforce the real floor in docs, CI, and examples:
  **Expo SDK 56+ / React Native 0.85+ / React 19.2** (`07`). Do not mark `expo`
  optional: bare RN users still install Expo Modules infrastructure via
  `install-expo-modules`, and fx is an Expo Modules library.
- **What ships:** use a positive **`files` allowlist** for the published package,
  even though the template defaults to `.npmignore`. This is safer for a public
  premium library because new local files cannot leak into the tarball by
  accident. Include: `build`, `src`, `ios`, `android`,
  `expo-module.config.json`, `README.md`, `LICENSE`, and any root podspec or
  generated package metadata the scaffold requires. Because plugin exists on day
  one, also include `app.plugin.js`, `plugin/build`, and any plugin typings.
  **Curated Metal shaders must ship (feed-forward from `08`):** `ios/**` already
  covers `ios/Shaders/**/*.metal`, but list the glob **explicitly** in `files`
  (and verify it in `npm pack --dry-run`) so the `.metal` sources can never be
  dropped — they are build *input* the consumer's Xcode compiles into the pod's
  resource-bundle metallib, so a missing `.metal` silently breaks shader loading
  at runtime, not at publish. **Current repo reality:** `packages/.npmignore`
  exists and there is **no** `files` allowlist yet; the `.npmignore` excludes
  `/.*/`, `*.tgz`, `__mocks__/__tests__`, `internal/module_scripts/`, android
  test/build dirs, and `example/`. Migrating to a positive `files` allowlist is a
  scaffold task — until then, confirm `.npmignore` does **not** exclude
  `ios/Shaders/`. Remove or neutralize `.npmignore` once `files` is present so the
  packaging story is not split. **Always run `npm pack --dry-run`** before the
  first publish to audit the tarball (assert `ios/Shaders/FxFullscreen.metal` and
  each curated fragment appear).
- **Config plugin metadata:** add `"expo": { "plugin": "./app.plugin.js" }`.
  The plugin scope is defined in `07`: compatibility validation, iOS
  deployment-target floor, optional app-local Metal shader directories, no
  Android mutation in V1.
- **Tooling fields:** set `packageManager` and `engines.node` in `package.json`.
  Node floor follows `07` (20.19.4+). Package manager is **Bun**; pin
  `packageManager` and make CI use Bun everywhere.
- **`publishConfig.access: public`** — required for a scoped name; harmless
  unscoped. fx's name is unscoped (`react-native-fx`), so this is belt-and-braces.
- **`prepack`/`prepare`** runs the build so the published `build/` is always
  fresh (runtimes uses `prepack: build`; the Expo template uses `prepare`).

### `expo-module.config.json` is what does autolinking — not `package.json`
Unlike bob/Nitro libs (which use `react-native.config.js` or a
`reactNativeRuntimes`/`codegenConfig` block in `package.json`), an Expo module
registers purely via `expo-module.config.json`. fx has **no** `codegenConfig`
and **no** `react-native.config.js` — Expo Modules generates the Fabric glue.

### Metal shader packaging — podspec resource bundle + npm allowlist (from `08`)
This is the **feed-forward from `08`** (iOS Metal shader surface & distribution),
finalized there and threaded into the scaffold here. fx ships **curated `.metal`
fragment/vertex functions inside the library**; the consumer's Xcode compiles them
at build time (there is no on-device MSL compiler — README constraint #1); at
runtime the native loader reads a metallib and selects functions by id. The
packaging consequences split cleanly: the **podspec** must get Xcode to compile
the `.metal` into a discoverable metallib, and the **npm tarball** must contain the
`.metal` sources in the first place.

**1. Where the shaders live.** Curated `.metal` files live in
**`packages/ios/Shaders/<Name>.metal`** — the shared full-screen vertex stage
`Shaders/FxFullscreen.metal` plus one file per curated fragment
(`Shaders/Aurora.metal`, `Shaders/Ripple.metal`, `Shaders/Spotlight.metal`). This
directory does **not** exist in the current scaffold (`packages/ios/` today holds
only `FxShader.podspec`, `FxShaderModule.swift`, `FxShaderView.swift`); creating
`packages/ios/Shaders/` is a scaffold task.

**2. Podspec must declare a resource bundle, not source files.** The pod is
**`static_framework = true`**, so `source_files` is the **wrong** home for `.metal`:
a static framework/library has no framework bundle for the resulting
`default.metallib` to land in, leaving no reliable named lookup target at runtime.
(The current `source_files` glob `"**/*.{h,m,mm,swift,hpp,cpp}"` doesn't even match
`.metal`, so today they would not compile at all.) Instead declare a **named
resource bundle** and redirect the Metal compiler output into it. Required additions
to `packages/ios/FxShader.podspec` (the current spec has only `DEFINES_MODULE` in
`pod_target_xcconfig`):

```ruby
# Compile Swift/ObjC as before — this glob does NOT need to match .metal.
s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"

# Curated build-time shaders → a named resource bundle holding default.metallib.
s.resource_bundles = {
  'FxShaderShaders' => ['Shaders/**/*.metal']
}

# Redirect the Metal compiler output into that bundle so the metallib is
# discoverable at runtime regardless of static-vs-dynamic linkage.
s.pod_target_xcconfig = {
  'DEFINES_MODULE' => 'YES',
  'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaderShaders.bundle',
}
```

- `resource_bundles` (plural, **hash** form) namespaces the metallib so static
  linking can't clobber it. The `Shaders/**/*.metal` glob is the build *input*;
  CocoaPods packages the compiled `default.metallib` *output* into
  `FxShaderShaders.bundle`.
- The runtime loader reads `default.metallib` from `FxShaderShaders.bundle` via
  `device.makeDefaultLibrary(bundle:)` (linkage-agnostic bundle resolution; see
  `08` §5.2/Decision 6). The bundle key here (`FxShaderShaders`) MUST match the
  loader's `bundleName`.
- **FLAG — verify the xcconfig key spelling on the SDK 56 toolchain.** Some docs
  use the modern **`MTL_LIBRARY_OUTPUT_DIR`**; older material shows the legacy
  **`METAL_LIBRARY_OUTPUT_DIR`**. Both have been used historically. Verify the
  active key against the toolchain in the pinned **SDK 56 / RN 0.85** build: if the
  resource bundle comes out **empty** (no `default.metallib`), switch to the legacy
  spelling. This is a needs-device check (ties to `08` Open questions: confirm
  CocoaPods emits the bundle as literally `FxShaderShaders.bundle`, not
  name-mangled, and lands the metallib at the bundle root).

**3. The npm allowlist must publish the `.metal` sources.** The shaders are build
*input* the consumer compiles — if they don't ship in the tarball, the pod has
nothing to compile and shader loading fails at runtime (not at publish). The
positive **`files` allowlist** must include **`ios/Shaders/**/*.metal`** (covered
transitively by `ios/**`, but listed explicitly for safety — see the `files`
section above). If the package stays on `.npmignore` during scaffolding, confirm
`.npmignore` does **not** exclude `ios/Shaders/`. Audit with
`npm pack --dry-run` and assert `ios/Shaders/FxFullscreen.metal` plus each curated
fragment appear in the tarball.

**4. `expo-module.config.json` stays as-is.** Shader bundling requires **no**
autolinking change. The current `packages/expo-module.config.json`
(`{"platforms":["apple"],"apple":{"modules":["FxShaderModule"]}}`) is correct
unchanged — the metallib is a pod resource, not an autolinked module.

> Curated-only in V1 (from `08` Decision 8): the app developer does **not** author
> `.metal`; only the library ships shaders. This keeps the podspec, the config
> plugin (`07`), and the loader simple — the config plugin needs **no** app-local
> `.metal` handling.

### Repository standard files (public-library hygiene)
A public library needs more than the generated module scaffold. Add these files
up front so contribution, support, release, and automation behavior is explicit:

```txt
.
├── biome.json
├── .editorconfig
├── README.md
├── docs/
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
└── .github/
    ├── workflows/
    │   ├── lint.yml
    │   ├── build-ios.yml
    │   ├── build-android.yml
    │   └── expo-doctor.yml
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.yml
    │   ├── feature_request.yml
    │   └── config.yml
    └── pull_request_template.md
```

- **Biome is the lint/format source of truth.** Use `biome check .` in CI and
  `biome format --write .` locally. Do not add ESLint/Prettier unless a specific
  Expo/React Native rule gap proves necessary.
- **`CONTRIBUTING.md`**: local setup, package manager, build commands, example
  app workflow, iOS shader development notes, CI expectations, release process,
  and how to run `npm pack --dry-run`.
- **`CODE_OF_CONDUCT.md`**: standard Contributor Covenant text.
- **`SECURITY.md`**: supported versions, reporting address/process, and a note
  that shader/native crashes should be reported privately if they expose
  sensitive app/device state.
- **`CHANGELOG.md`**: keep it generated/updated by release flow. GitHub release
  notes are not a substitute for package-local changelog history.
- **`.github/ISSUE_TEMPLATE/*`**: at minimum bug report and feature request.
  Bug template must ask for Expo SDK, RN version, iOS version/device, whether
  New Architecture is enabled, repro repo, native logs, and whether the issue is
  rendering, interaction, install, or packaging.
- **`.github/pull_request_template.md`**: checklist for tests, `biome check`,
  typecheck/build, example app verification, and docs updates.
- **`SUPPORT.md`** is optional. Add it if support boundaries become ambiguous;
  otherwise keep support guidance in README/CONTRIBUTING.
- **`NOTICE`** is not needed for MIT by default; add only if bundled shader or
  native assets introduce attribution obligations.

### Documentation baseline
The docs site can be deferred, but the docs content cannot. For the first public
alpha, fx should ship:

```txt
docs/
├── installation.md
├── api.md
├── ios-metal.md
├── shader-authoring.md
├── interaction.md
├── composition.md
├── troubleshooting.md
└── release-checklist.md
```

- **README.md** is the short path: pitch, compatibility table, install,
  `npx expo install react-native-fx`, minimal `<ShaderView>` example, Expo
  SDK/RN/New Architecture requirements, iOS-first warning, and links to `docs/`.
- **`docs/api.md`** mirrors the public TypeScript surface: `ShaderView`,
  shader source/asset props, uniforms, presets, interaction callbacks, imperative
  refs, composition modes, and known unsupported cases.
- **TSDoc is required on exports.** Every exported component, prop type, event,
  preset, and helper needs a concise source comment. Add `@example` for
  non-obvious behavior, following the `expo-ui` pattern.
- **`docs/ios-metal.md`** explains the native rendering model: `MTKView` or
  `CAMetalLayer`, command queue ownership, shader library/resource loading,
  render loop policy, teardown, and iOS deployment target.
- **`docs/shader-authoring.md`** defines the shader contract: function names,
  expected uniforms, time/resolution/touch uniforms, coordinate system, precision
  assumptions, and asset/resource bundling rules.
- **`docs/interaction.md`** defines what "interactable" means: native press /
  touch / hover state if available, uniform updates, callback timing, gesture
  conflicts, and the explicit non-goal of preserving arbitrary sampled RN child
  hit testing in V1.
- **`docs/composition.md`** documents shader-only, background, overlay, and
  pass-through modes, with screenshots from the example app.
- **`docs/troubleshooting.md`** covers install/prebuild/pods, Metal resource
  failures, blank view diagnostics, simulator/device differences, New Arch
  requirements, and `npm pack --dry-run` packaging mistakes.
- **Example app screenshots** should be captured for the README/docs before
  each alpha. Expo UI keeps screenshots under docs static assets; fx can keep
  them under `docs/assets/` until a site exists.
- **Generated API docs are optional for V1.** If a docs site lands later, use
  the source comments as the generation input rather than writing API docs twice.

### Scaffold acceptance criteria
Before moving from research into implementation, the initial repository scaffold
should meet this checklist:

- `package.json` has `name`, `version`, `description`, `repository`, `license`,
  `keywords`, `packageManager`, `engines.node`, Expo module peer dependencies,
  and scripts for `build`, `clean`, `lint`, `format`, `typecheck`, `test`,
  `prepare`, `prepack`, `open:ios`, and `open:android`.
- `biome.json` is present and `lint` resolves to `biome check .`.
- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, `LICENSE`, `.editorconfig`, `.npmignore`, `docs/`, GitHub issue
  templates, PR template, and CI workflows exist.
- README links to `docs/`, and `docs/` covers install, API, iOS Metal,
  shader authoring, interaction, composition, troubleshooting, and release
  checklist.
- Exported TypeScript API has TSDoc comments and examples for non-trivial
  behavior.
- `expo-module.config.json`, `ios/`, `android/`, `src/`, `plugin/`, and
  `example/` are present with names aligned to `FxShaderModule` /
  `FxShaderView`.
- The podspec explicitly names iOS deployment floor, Swift version,
  `static_framework`, ExpoModulesCore, Fabric dependency, source files, and the
  **Metal shader resource bundle**: `s.resource_bundles = { 'FxShaderShaders' =>
  ['Shaders/**/*.metal'] }` plus `'MTL_LIBRARY_OUTPUT_DIR' =>
  '${TARGET_BUILD_DIR}/FxShaderShaders.bundle'` in `pod_target_xcconfig` (verify
  key spelling per `08`; not `source_files`, because `static_framework`).
- CI has at least `lint.yml`, `build-ios.yml`, `build-android.yml`, and
  `expo-doctor.yml`; the minimum PR gate is Biome, typecheck, module build,
  example app build, and Expo Doctor.
- `npm pack --dry-run` includes only intended package files: compiled JS/types,
  native source, podspec/Gradle files, config plugin build output, README,
  changelog, license, **and the curated `ios/Shaders/**/*.metal` sources** (assert
  `FxFullscreen.metal` + each curated fragment are present — they are build input
  the consumer compiles).
- The example app can render a non-blank iOS shader view and exercise one native
  interaction path before any public alpha.

### Exact scaffold implementation list
Create or adapt these files in the first implementation pass:

```txt
.
├── package.json
├── bun.lock
├── biome.json
├── tsconfig.json
├── babel.config.js
├── expo-module.config.json
├── app.plugin.js
├── plugin/
│   ├── tsconfig.json
│   └── src/index.ts
├── src/
│   ├── index.ts
│   ├── ShaderView.tsx
│   ├── ShaderView.types.ts
│   ├── shader/
│   └── interaction/
├── ios/
│   ├── ReactNativeFx.podspec
│   ├── FxShaderModule.swift
│   ├── FxShaderView.swift
│   └── Shaders/
├── android/
│   ├── build.gradle
│   └── src/
├── example/
├── docs/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
├── .editorconfig
└── .github/
    ├── workflows/
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

Minimum script set:

```jsonc
{
  "build": "expo-module build",
  "build:plugin": "expo-module build plugin",
  "clean": "expo-module clean",
  "lint": "biome check .",
  "format": "biome format --write .",
  "typecheck": "tsc --noEmit",
  "test": "expo-module test",
  "prepare": "expo-module prepare",
  "prepublishOnly": "expo-module prepublishOnly",
  "prepack": "bun run build && bun run build:plugin",
  "open:ios": "bun --cwd example expo run:ios",
  "open:android": "bun --cwd example expo run:android"
}
```

### Versioning & release
- **Semver with pre-release tags during build-out.** runtimes ships
  `0.1.0-alpha.1`. fx V1 starts at **`0.1.0-alpha.0`** and only reaches `1.0.0`
  when V1 is device-verified (the `verified` status in README's legend).
- **Tooling — `release-it` (recommended for fx now).** runtimes uses `release-it`
  with a per-package `.release-it.json`. For a **single package**, release-it is
  the lighter choice: one config, git tag + GitHub release + npm publish in one
  command. Real runtimes config (adapt names for fx):
  ```jsonc
  {
    "hooks": { "before:init": ["bun run clean", "bun run build", "bun run build:plugin"] },
    "git": {
      "commitMessage": "chore: release v${version}",
      "tagName": "v${version}",
      "requireBranch": "main",
      "requireCleanWorkingDir": true,
      "push": true
    },
    "github": { "release": true, "releaseName": "v${version}", "autoGenerate": true },
    "npm": { "publish": true }
  }
  ```
- **Changesets is the better choice only once fx is a monorepo** (two or more
  published packages). Changesets stores per-change markdown files, fans out
  independent versions/changelogs across packages, and is the 2025 default for
  multi-package RN repos. **Trigger to switch: the day a second publishable
  package exists.** Until then, release-it.
- **dist-tags / pre-release plan:** publish alphas under a non-`latest` tag so
  `npm install react-native-fx` doesn't pull an unstable build:
  ```sh
  npm publish --tag alpha     # 0.1.0-alpha.x → installs only via @alpha
  # later: 0.1.0-beta.x --tag beta ; then 0.1.0 / 1.0.0 → default `latest`
  ```
  release-it: pass `--preRelease=alpha` to bump+tag the pre-release line and
  publish under the matching dist-tag automatically.
- Conventional Commits → auto-generated GitHub release notes (`autoGenerate:
  true`) and/or `CHANGELOG.md`.

### Single package now vs monorepo later — the exact trigger
- runtimes is a **`packages/* + example` Bun workspace** *because it ships two
  packages* (`@react-native-runtimes/core`, `/state`), each with its own
  `package.json`, `.release-it.json`, README, and keywords.
- **fx V1 ships exactly one package** (`react-native-fx`).
- **Layout reconciliation (updated this pass):** the repo **already adopted the
  Bun-workspace layout** anyway — root `package.json` is a private workspace
  (`"name": "react-native-fx-monorepo"`, `"private": true`,
  `"workspaces": ["packages"]`), the single publishable package lives in
  **`packages/`**, and the dev harness is a **root-level `example/`**. This differs
  from the earlier "no workspace, no `packages/`" guidance and from what
  `create-expo-module` emits at root. Treat it as a benign early adoption: it costs
  nothing while one package ships and makes the later split mechanical. The
  forcing-function below is unchanged — **the count of *publishable* packages is
  still one**, so this is not yet a "real" monorepo in the release sense (still
  one package to version/publish; release-it, not Changesets — see Versioning).
- **Exact trigger to convert to a monorepo:** when a second separately
  installable package exists (for example an optional Android backend or a
  shader toolchain/compiler package with meaningful dependency weight). That is
  the *only* forcing function; a new component inside the same package is not.
- **"Clean module boundaries now" in practice** (so any later split is
  mechanical): inside the single package, keep
  `src/core/` (shared view/lifecycle/prop-bridging convention), `src/shader/`,
  and `src/interaction/` as separate folders with a small public `src/index.ts`
  barrel; mirror that in native (`FxView` base + `FxShaderView` subclass, not
  one monolith). If Android or tooling later needs a separate package, lift that
  backend/tooling into its own package.

### New Architecture / Fabric
Expo Modules support New Arch automatically (see `01-expo-modules-view.md`); fx
targets Fabric from day one. **The example app should run with New Arch
enabled** — verified that runtimes' example sets `newArchEnabled=true`
(`android/gradle.properties`), and New Arch is the default in current RN/Expo
templates anyway. Keeping it on means CI exercises the real target. Declare
Fabric support + the RN floor in the README and `07-config-plugin-and-install.md`.

### CI — concrete GitHub Actions outline (modeled on runtimes' `.github/`)
runtimes keeps `.github/workflows/` at the **repo root** with **separate
workflows per concern**, each gated by `paths:` filters and a `concurrency` group
that cancels superseded runs on non-`main` branches. Mirror this:

- **`lint.yml`** — two jobs on `ubuntu-latest`: `biome check .` and
  `tsc --noEmit` (typecheck). Triggered on `*.ts/tsx/json/tsconfig/biome.json`
  changes. Fast, runs on every PR. (runtimes also builds each package's `tsc`
  here to catch type breaks.)
- **`build-ios.yml`** — `macos-*` runner: `pod install` then `xcodebuild` the
  `example/` app for an iOS simulator (`CODE_SIGNING_ALLOWED=NO`,
  `ONLY_ACTIVE_ARCH=YES`). Caches Pods + DerivedData + ccache. Path-gated to
  `example/ios/**`, `ios/**`, `*.podspec`.
- **`build-android.yml`** — `ubuntu-latest`: `./gradlew :app:assembleDebug` for
  the `example/` app with a single ABI (`-PreactNativeArchitectures=x86_64`).
  Caches Gradle + CMake.
- **`expo-doctor.yml` or lint job step** — run `npx expo-doctor` in `example/`
  to catch SDK-56 dependency drift, native config mismatches, and unsupported
  package versions before the native builds fail later.
- **(later) `harness-*.yml`** — on-device/E2E via Maestro or
  `callstackincubator/react-native-harness` on an Android emulator / iOS sim.
  runtimes runs these; for fx defer until V1 renders on real devices, then
  add visual/interaction E2E (shader surface renders, responds to press, updates
  uniforms, and composes behind/above RN children).

Minimal `lint.yml` job shape:
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.14 }
      - run: bun install --frozen-lockfile
      - run: bun run lint          # biome check .
      - run: bun run typecheck
      - run: bun run build         # expo-module build
      - run: bun run build:plugin  # expo-module build plugin
      - run: bunx expo-doctor
        working-directory: example
```
Per-PR gate = lint + typecheck + expo-doctor + build-example (iOS+Android).
On-device later.

### Example app, docs, license, npm discovery
- **`example/` is the dev harness** and the home for the research thesis's **three V1
  demos** (interactive Metal shader surface, shader behind RN content, shader
  overlay/pass-through or controlled-highlight demo).
  It's how you develop the lib (open:ios/open:android), and doubles as living
  documentation. Runs New Arch (above).
- **Docs content is required; docs site is optional.** Ship local Markdown docs
  from day one (see Documentation baseline). A site shell can wait until the API
  stabilizes. If/when needed, runtimes' **Next 16 + fumadocs**
  (`fumadocs-core/ui/mdx`) setup is the local reference.
- **License: MIT** (ecosystem default; runtimes uses it). Ship a `LICENSE` file.
- **npm discovery / README:** rich `keywords` (above), a badge row (RN version,
  New Architecture, Expo, iOS, Android, MIT — runtimes' pattern), a one-line
  pitch, an install snippet, a minimal `<ShaderView>` example, the iOS-first
  note, and a clear roadmap for native Metal rendering, native interaction,
  composition modes, and later platform backends.

## Decisions
1. **Scaffold with `npx create-expo-module@latest react-native-fx`** — not
   `--local`, not bob. Then adapt the generated package to Bun,
   `expo-module-scripts`, Biome, plugin output, and the public-library files
   listed above.
2. **Single package** named `react-native-fx` for V1. Convert to a Changesets
   monorepo **only** when a second installable package exists.
3. **Build pipeline path 2**: use **`expo-module-scripts` + `expo-module`** from
   day one because `plugin/` exists. Scripts include `build`, `build:plugin`,
   `clean`, `test`, `prepare`, `prepublishOnly`; lint/format stays Biome.
4. **Entry fields = `main`→`build/index.js`, `types`→`build/index.d.ts` only**
   (verified template truth). No `source`/`react-native`/`exports`. Build runs in
   `prepack`/`prepare` so `build/` is always fresh.
5. **Ship via a positive `files` allowlist**. `npm pack --dry-run` before first
   publish. `publishConfig.access: public`.
6. **Autolink via `expo-module.config.json`** (`platforms` + `apple`/`android`
   `modules`). No `codegenConfig`, no `react-native.config.js`.
7. **Release with `release-it`** + Conventional Commits + auto-generated GitHub
   releases. Start `0.1.0-alpha.0`; publish pre-releases under the **`alpha`**
   dist-tag (`--preRelease=alpha`); promote to `latest` only at a stable `0.1.0`/
   `1.0.0` when device-verified.
8. **`example/` runs New Arch** and hosts the three V1 shader demos as the dev loop.
9. **CI = per-concern GitHub Actions** (lint+typecheck, expo-doctor, build-ios,
   build-android) with `paths:`/`concurrency` gating; on-device E2E later.
   Modeled on runtimes' root `.github/workflows/`.
10. **Public-library docs and templates:** `README.md`, local `docs/`,
    `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
    `.editorconfig`, `.github/ISSUE_TEMPLATE/*`, and
    `.github/pull_request_template.md`.
11. **MIT license**; rich npm `keywords`; README with badges + the research
    thesis pitch. Docs content required for alpha; docs site shell deferred.
12. **Package manager is Bun**. Pin `packageManager: "bun@1.3.14"` and use Bun
    consistently in CI, release hooks, and local docs. **Repo layout is a Bun
    workspace** (`packages/` = the single publishable lib, root `example/` =
    harness); one publishable package, so release-it not Changesets.
13. **Curated Metal shaders are packaged as a podspec resource bundle + npm
    `.metal` sources** (feed-forward from `08`). `.metal` live in
    `packages/ios/Shaders/<Name>.metal`; the podspec ships them via
    `s.resource_bundles = { 'FxShaderShaders' => ['Shaders/**/*.metal'] }` with
    `'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaderShaders.bundle'`
    (NOT `source_files`, because the pod is `static_framework`); the npm `files`
    allowlist publishes `ios/Shaders/**/*.metal`. `expo-module.config.json` is
    unchanged. **Flag:** verify `MTL_LIBRARY_OUTPUT_DIR` vs legacy
    `METAL_LIBRARY_OUTPUT_DIR` on the SDK 56 toolchain (switch if the bundle is
    empty).

## Open questions
- **`exports` map:** the template doesn't emit one. Stay minimal unless a real
  subpath (e.g. `/plugin`) needs to be exposed — then add `exports` + keep
  `main` as the fallback for older resolvers.
- **Docs-site tooling** (fumadocs like runtimes vs simpler) — site shell
  deferred; README + local Markdown docs are not deferred.

## Sources
- `create-expo-module` (standalone vs `--local`, scaffold output):
  https://docs.expo.dev/more/create-expo-module ·
  https://docs.expo.dev/modules/get-started ·
  https://docs.expo.dev/modules/native-module-tutorial
- **Verified template ground truth** — `expo-module-template@56.0.12` (the
  package `create-expo-module` fetches): `$package.json` emits only
  `main`/`types`, scripts call `internal/module_scripts/*.js`, ships
  `.npmignore`, `expo-module.config.json` uses `platforms` + `apple`/`android`
  `modules`. (`npm pack expo-module-template@latest`.)
- **Verified mature Expo package reference** — local
  `/Users/duyanhv/works/expo/packages/expo-ui`: `package.json`,
  `expo-module.config.json`, `tsconfig.json`, `plugin/tsconfig.json`,
  `.npmignore`, `CONTRIBUTING.md`, `ios/ExpoUI.podspec`, and `spm.config.json`.
- **Verified Expo UI docs reference** — local
  `/Users/duyanhv/works/expo/docs/pages/guides/expo-ui-swift-ui/index.mdx`,
  `.../extending.mdx`, `docs/pages/versions/unversioned/sdk/ui/index.mdx`,
  `docs/public/static/data/unversioned/expo-ui/**`,
  `docs/public/static/images/expo-ui/**`, plus Expo root `CONTRIBUTING.md`
  docs-generation notes (`et generate-docs-api-data -p <package-name>`).
- `expo-module-scripts` / `expo-module build` pipeline + config-plugin build:
  https://docs.expo.dev/config-plugins/development-for-libraries ·
  https://docs.expo.dev/config-plugins/mods (real usage: `expo-linear-gradient`,
  `expo-image` `package.json` `"build": "expo-module build"`).
- `expo-module.config.json` autolinking registration:
  https://docs.expo.dev/modules/existing-library
- Bare-RN support via autolinking (`install-expo-modules`):
  https://docs.expo.dev/bare/installing-expo-modules/
- `package.json` fields & Metro package-exports support:
  https://docs.expo.dev/versions/latest/config/package-json/ ·
  https://reactnative.dev/blog/2023/06/21/package-exports-support
- release-it vs Changesets tradeoffs (single vs monorepo):
  https://github.com/changesets/changesets ·
  https://www.hamzak.xyz/blog-posts/release-management-for-nx-monorepos-semantic-release-vs-changesets-vs-release-it-
- Real published reference repo (repo conventions, CI, release-it, keywords,
  monorepo split, New-Arch example) — `react-native-runtimes` (sibling in this
  workspace): root `package.json` (Bun workspace), `packages/core/package.json` +
  `.release-it.json`, `.github/workflows/{lint,build-ios,build-android,
  harness-android}.yml`, `example/android/gradle.properties` (`newArchEnabled=
  true`), `docs/package.json` (Next 16 + fumadocs), `README.md` (badge row).
  *Caveat: runtimes is Nitro + manual `tsc`, so its `main`/`react-native`/
  `source` + `lib/` entry shape and `files[]` are NOT the Expo-template shape.*
- Generic-RN standard (context, not chosen): `create-react-native-library` /
  `react-native-builder-bob` (Callstack).
- **Metal shader packaging (feed-forward) —** `08-shader-accents-and-distribution.md`
  §5 / Decisions 5–6 / "Feeds back into 07 and 00": curated `.metal` in
  `packages/ios/Shaders/`, podspec `resource_bundles` +
  `MTL_LIBRARY_OUTPUT_DIR` → `FxShaderShaders.bundle`, runtime
  `makeDefaultLibrary(bundle:)`, and the npm `files` requirement to ship
  `ios/Shaders/**/*.metal`. Underlying mechanism sources (CocoaPods
  `resource_bundles` + Metal library output dir, static-framework resource
  placement) are listed in `08`.
- **Verified repo layout (this pass)** — root `package.json`
  (`react-native-fx-monorepo`, private, `workspaces: ["packages"]`),
  `packages/package.json` (`react-native-fx`), `packages/.npmignore` (no `files`
  allowlist yet), `packages/expo-module.config.json`
  (`{"platforms":["apple"],"apple":{"modules":["FxShaderModule"]}}`),
  `packages/ios/FxShader.podspec` (`static_framework = true`, only
  `DEFINES_MODULE` in `pod_target_xcconfig`, no `Shaders/` dir yet), root
  `example/`.
