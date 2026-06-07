# U1-001 · package scaffolding

Unit 1 · type: `implement` · state: `in-progress` · device: no
Consumes: IMPL-001 · Closes: SHIP-001, IMPL-001 · Blocked by: —

> **Next action (resume here):** the `implemented` gate — run the Work steps below to `headless-done` (build + `tsc` green), then stop for review. Awaiting go-ahead to mutate `packages/` (this renames the published identity). Keep the existing `FxShaders.metal` pixels.

The package is still the stock `create-expo-module` `FxShader` skeleton. Nothing else can be
built cleanly until the identity, layout, and autolinking match the research. This is plumbing,
not effects — but it unblocks U1-002 (`FxNativeView`) → U3 (first hosted effect on a device).

## Start here (cold-start)

A fresh session: read in order, then construct.

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking (states, proof, the closure rule).
3. **Per-gate guides** (binding — read the one for the gate you are on):
   - `implemented` → `guides/Code Style Guide.md` (Biome / swift-format; `.swift-format`, `.editorconfig`)
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - (`device-verified` → `guides/Device Verification Guide.md` — N/A this task)
4. **Contract + Reference** — below.

## Authority links

- **Contract:** `52` (standards/publishing), `53` (install/autolink), `51` (the boundary), `05` (Expo Modules decision). Target layout: `architecture.md` §1. Names: `data-layer.md` §9 (D1 five-view module, D2 `FxShader`→`ReactNativeFx`).
- **Decision:** `use` Expo Modules (blueprint Unit 1). No flip-trigger — settled.
- **Reference (HOW):** `references/expo/packages/expo-modules-core/ios/Core/Modules/ModuleDefinition.swift` (multi-view module, first view = default), `.../ios/Core/Views/ExpoView.swift`; file:line breadcrumbs in `architecture.md` §0. Mimic the module/view registration; **reject** `@expo/ui` universal-component auto-Host (would seize layout/hit-testing — `01`).
- **Rules gate:** #7 (Expo Modules + Fabric only; no JSI/C++). Public surface stays the ratified vocabulary — no un-ratified API names.

## Lifecycle

- [x] spec'd
- [ ] rules-gated
- [ ] implemented
- [ ] commented
- [ ] headless-done
- [ ] reviewed
- [ ] docs-closed — SHIP-001 true in `52`; IMPL-001 true in `architecture`/`data-layer`
- [ ] merged

`device-verified`: N/A — pure scaffolding, runs headless.

## Proof

- **headless:** `bun run build` + `tsc` green on the restructured package; `expo-module` autolink resolves iOS + Android.
- **device:** N/A
- **docs:** `52` (exports/files), decision-ledger SHIP-001 + IMPL-001.

## Work

1. **package.json** — fix `description` (drop "Interactable Metal ShaderView"); drop the `FxShader` keyword; add the root-only `exports` map (`52`); `files` allowlist incl. `ios/Shaders/**/*.metal` + `android/**/*.agsl`; `publishConfig.access = "public"`; fill `repository`/`bugs`/`homepage`.
2. **expo-module.config.json** — module name `ReactNativeFx`; add the `android` platform + Kotlin `FxModule`.
3. **ios** — rename `FxShader.podspec` → `ReactNativeFx`; add `resource_bundles` (`FxShaders`) + `MTL_LIBRARY_OUTPUT_DIR` (`52`); rename `FxShaderModule`/`FxShaderView` → `FxModule` + the substrate/role view classes (`architecture.md` §1).
4. **android/** — create it: `FxModule.kt`, the `ExpoView` subclasses, `assets/shaders/` for `.agsl`.
5. **src/** — restructure flat `FxShader*` → layered `manifest/ · surface/ · effects/ · motion/ · presets/ · runtime/` + root `index.ts` (`architecture.md` §1).

Keep the existing working `FxShaders.metal` + its curated shaders — they are the V1 starter set (`data-layer` §6, FX-004); this task moves and renames, it does not delete pixels.

## Done when

The package builds on both platforms, describes itself per `52`/`53`, the Android skeleton exists, and **SHIP-001 + IMPL-001 are true in their source docs** — with no published-API surface beyond the ratified vocabulary.
