# Implementation progress

The durable record of build execution. The **table** is the global view — one row per task,
current **state** only. **Detail blocks** below carry the full lifecycle checklist and proof
for active or complex tasks. The rules (lifecycle, states, proof, the closure rule) live in
[`subtask-protocol.md`](./subtask-protocol.md).

> **The cardinal rule:** a task is `complete` only when every `Closes:` ledger row is true in
> its **owning source doc** — not here, not in `data-layer.md`, not in the commit.

## Legend

- **state** (one per task): `todo · in-progress · blocked · headless-done · device-pending · docs-pending · ready-to-merge · merged`. `ready-to-merge` = **complete** (all gates through `docs-closed`; finishing commit not yet in); `merged` = complete **and** the finishing commit is in (on `integration/0.1.x`).
- **type:** `implement` (code) · `ratify` (decide in source doc) · `device-verify` (device proof) · `rework` (fix inconsistency) · `doc-cleanup` (source alignment).
- **device:** `yes` = has a non-headless gate (effects/animation/touch — will not run headless).
- **consumes / closes:** decision-ledger ids this task reads / must close.

## Tasks

Every in-flight ledger row is closed by exactly one task below. Resolved rows and the resolved
baseline are not tracked. Order is build order; deferred (V2 / trigger-gated) work is parked at
the bottom. A row needs a detail block only when it is active or has more than a one-line proof.

### Cross-cutting decisions — `ratify` / `doc-cleanup`, no native unit, resolve in the source doc

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| DOC-001 | 1-surface | doc-cleanup | merged | no | — | SURF-001, SURF-009 | — | `GlassView` dropped from `56`; `SpringTune` removed from `55`; SURF-001 + SURF-009 resolved; [review](./reviews/v1-merge-batch-2026-06-08.md) |
| DOC-002 | 0-spine | ratify | merged | no | — | SPINE-004, SPINE-007 | — | `02` Decisions 12+13 ratified; SPINE-004/007 closed, SPINE-005/006 deferred; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-002--ratify-spine-004005006007) |
| DOC-003 | 0-spine | ratify | todo | no | — | SPINE-001, SPINE-002 | — | docs: `00`/`50` curation/BYO threshold, palettes-as-artifact |
| DOC-004 | 1-surface | ratify | todo | no | — | SURF-002 | — | docs: `56`/`6-ship` ship effect components? |
| DOC-005 | 1-surface | ratify | merged | no | MOT-001 | SURF-003, SURF-004, SURF-005 | — | `50`/`56`/`57`/`41` V1 preset/state/feedback vocab ratified; springs stay with MOT-001; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-005--v1-presetstatefeedback-vocabulary-ratification) |
| DOC-006 | 1-surface | ratify | todo | no | — | SURF-006 | — | docs: `57`/`21` FxGroup morph scope |
| DOC-007 | 2-effects | ratify | merged | no | — | FX-001, FX-004 | — | full-grid mesh + mesh-only `drift`; 10-id shader catalog; shared minimal shader uniforms; [task](./tasks/DOC-007/) · [review](./reviews/DOC-007.md) |
| DOC-008 | 2-effects | ratify | merged | no | — | FX-009 | — | `symbol` iOS-only in V1; Android AVD/Lottie planned/deferred (non-selectable, enforced by `select()`); [task](./tasks/DOC-008/) · [review](./reviews/DOC-008.md) |
| DOC-009 | 3-motion | ratify | todo | no | — | MOT-003, MOT-005, MOT-006, MOT-009 | — | docs: `40`/`41`/`42` V1 motion vocab scope |
| DOC-010 | 3-motion | ratify | merged | no | — | MOT-010 | — | V1 reduce-motion = instant degradation (0-duration); policy recorded in `41` Decision #9, `42` §Reduce-motion, `34` §Findings; MOT-010 resolved; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-010--reduce-motion-policy-ratification) |
| DOC-011 | 4-runtime | ratify | todo | no | — | RT-006, RT-008 | — | docs: `32`/`36` SDF source, driver granularity |
| DOC-012 | 6-ship | ratify | todo | no | — | SHIP-002 | — | docs: `53` no-rung degradation UX |
| DOC-013 | 2-effects | ratify | merged | no | — | REAL-004 | — | V1 curated shaders hand-maintain MSL+AGSL pairs; compiler remains additive V2; [task](./tasks/DOC-013/) · [review](./reviews/DOC-013.md) |

### V1 build — Units 1–3 + ship

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U1-001 | Unit 1 | implement | merged | no | IMPL-001 | SHIP-001, IMPL-001 | — | reviewed; SHIP-001 + IMPL-001 both resolved in source (IMPL-001 closed 2026-06-09 once REAL-002/U3-005 landed); docs-closed complete; merged on integration/0.1.x; [detail](#u1-001--package-scaffolding) |
| U1-002 | Unit 1 | implement | merged | no | RT-010 | — | U1-001 | headless build green; `FxNativeView` + substrate view classes register in source; docs reconciled; reviewed (batch); [detail](#u1-002--fxnativeview-abstract-base--substrate-view-registration) |
| U1-003 | Unit 1 | device-verify | merged | yes | RT-010, RT-011 | SURF-010, RT-010, RT-011, RT-004 | U1-002, U1-004 | all four scenarios pass on iOS + Android (2026-06-08); ledger rows resolved; source docs reconciled; reviewed (batch); [detail](#u1-003--sdk-verify-expo-boundary-behaviors) |
| U1-004 | Unit 1 | implement | merged | no | — | SHIP-003 | U1-001 | CI green on GitHub (all 4 jobs). SHIP-003 resolved in `53` and ledger. `apple.podspecPath` fix recorded. reviewed (batch). [detail](#u1-004--bare-fabric-example-in-ci) |
| U1-005 | Unit 1 | implement | merged | no | — | — | — | Android library build-ready: `versionCode`/`versionName` added to `packages/android/build.gradle`; fix committed (`e6c29c3`). CI Android autolink passes. reviewed (batch). |
| U2-001 | Unit 2 | implement | merged | no | SPINE-013 | SPINE-013 | — | typed `select()` in `packages/src/manifest/select.ts` skips planned and out-of-scope rungs; 17 Jest tests pass; `02` selection rule updated; reviewed (batch); [detail](#u2-001--planned-rung-selection) |
| U2-002 | Unit 2 | rework | merged | no | SPINE-003 | SPINE-003 | — | `02` UniformSpec widened with `boolean` + `color[]`; `data-layer.md` provisional note removed; types manually synced in `packages/src/manifest/types.ts`; reviewed (batch); [detail](#u2-002--uniformspec-schema-reconciliation) |
| U3-001 | Unit 3 | implement | merged | yes | — | RT-009 | U1-002, U2-001 | RT-009 + fill (iOS+Android) + iOS material; device-verified iOS 26+ (2026-06-08); shader → U3-006, symbol → U3-007; [detail](#u3-001--hosted-effect-renderer) · [review](./reviews/U3-001.md) |
| U3-002 | Unit 3 | device-verify | todo | yes | — | SPINE-012, FX-002, FX-005 | U3-001 | device: hosting parity, glass styles, uniform alignment, GPU resume |
| U3-003 | Unit 3 | implement | todo | yes | — | FX-003 | U3-001 | device: Android glass fallback + intensity 0–1; RenderEffect staleness |
| U3-004 | Unit 3 | ratify | todo | no | — | FX-006 | U3-001 | docs: `22` BYO `.metal`/`.agsl` registration contract |
| U3-005 | Unit 3 | device-verify | merged | yes | — | REAL-002, REAL-003 | U3-001 | headless-done + docs-closed (2026-06-09); REAL-002 build-verified on Xcode 26.5; REAL-003 path recorded in `structure.android.md`; both ledger rows resolved; reviewed (approved, incl. fix-round addendum); merged on integration/0.1.x; [detail](#u3-005--shader-asset-packaging--runtime-load-proof) · [review](./reviews/U3-005.md) |
| U3-006 | Unit 3 | implement | merged | yes | FX-004, REAL-004 | — | — | 10 MSL `[[stitchable]]` + 10 AGSL shaders; hosted dispatch on iOS + Android; `ShaderId` = 10 ids; headless green; **device-verified iOS + Android (2026-06-08)**, incl. blank-on-switch + intensity-flicker fixes; docs-closed (`22` reconciled); reviewed + confirmed by maintainer (2026-06-09); merged on integration/0.1.x; [detail](#u3-006--curated-shader-implementation) |
| U3-007 | Unit 3 | implement | todo | yes | FX-009 | — | DOC-008, U3-001 | implement iOS `symbol` via `.symbolEffect` on the hosted slice; Android symbol deferred (planned, non-selectable) |

### V2 build — Units 4–9

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U4-001 | Unit 4 | rework | todo | yes | RT-015 | RT-015 | U1-002 | device: child rides animated wrapper (see detail) |
| U4-002 | Unit 4 | device-verify | todo | yes | — | RT-014 | U4-001 | device: `mountChildComponentView` override on Fabric |
| U5-001 | Unit 5 | implement | todo | yes | RT-013 | RT-013 | U4-001 | device: post-layout frame read natively |
| U6-001 | Unit 6 | implement | todo | yes | RT-007 | RT-007 | U4-001, U5-001 | device: interruptible spring, no snap |
| U6-002 | Unit 6 | device-verify | todo | yes | — | RT-016 | U6-001 | device: animators handle hard retarget, else build integrator |
| U6-003 | Unit 6 | device-verify | todo | yes | — | MOT-002, REAL-001 | U6-001 | device: tune formulas feel right; M3 floor + fallback |
| U7-001 | Unit 7 | implement | todo | yes | MOT-001 | — | U6-001 | device: presence FSM + deferred-unmount handshake |
| U7-002 | Unit 7 | device-verify | todo | yes | — | MOT-001 | U7-001 | device: per-platform preset catalog filled, passes law test |
| U8-001 | Unit 8 | implement | todo | yes | RT-006 | RT-005 | U1-002, U3-001 | device: press recognizer + SDF hit-test |
| U8-002 | Unit 8 | device-verify | todo | yes | — | RT-001 | U8-001 | device: cancel path + full RNGH coexistence matrix |
| U9-001 | Unit 9 | implement | todo | yes | RT-008 | — | U6-001, U7-001 | device: `Fx*` SharedObjects wired |
| U9-002 | Unit 9 | device-verify | todo | yes | — | SPINE-009 | U4-001, U5-001, U7-001, U9-001 | device: identity holds across Fabric commits (the `05` test) |

### Deferred — V2 / trigger-gated, not actionable now

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| DEF-001 | 0-spine | ratify | blocked | no | — | SPINE-008 | trigger: BYO/novel demand | the build-time shader/effect emitter |
| DEF-002 | 0-spine | ratify | blocked | no | — | SPINE-010 | trigger: per-child control | reconsider Nitro / raw Fabric |
| DEF-003 | 1-surface | ratify | blocked | no | — | SURF-007 | V2 | portal / root overlay placement |
| DEF-004 | 1-surface | implement | blocked | no | — | SURF-008 | V2 | `Fx.Stack` JSX-compound skin |
| DEF-005 | 3-motion | ratify | blocked | no | — | MOT-004 | V2 | `edge`/`origin` partial-override sugar |
| DEF-006 | 3-motion | implement | blocked | yes | — | MOT-007 | post-V1 | Reanimated UI-thread channel (regime C) |
| DEF-007 | 3-motion | ratify | blocked | no | — | MOT-008 | V2 | BYO intro/outro envelope declaration |
| DEF-008 | 2-effects | implement | blocked | yes | — | FX-007 | V2 | runtime shader compilation |
| DEF-009 | 2-effects | implement | blocked | yes | — | FX-008 | V2 | Android content-filter wrapper |
| DEF-010 | 4-runtime | device-verify | blocked | yes | — | RT-002 | V2 | `@gorhom/bottom-sheet` coexistence |
| DEF-011 | 4-runtime | implement | blocked | yes | — | RT-003 | V2 | drag/tilt (G3) axis-aware claiming |
| DEF-012 | 4-runtime | ratify | blocked | no | — | RT-012 | V2 | generalize beyond presence to declarative state |
| DEF-013 | 6-ship | implement | blocked | no | — | SHIP-004 | trigger: V2 native mod | config plugin |

## U1-001 — package scaffolding

Type: `implement` · State: `merged` · Closes: SHIP-001, IMPL-001 · [task](./tasks/U1-001-package-scaffolding/)

Through `reviewed` ([review](./reviews/U1-001.md), approved). `docs-closed` is **complete** — both `Closes:` rows true in source:

- **SHIP-001 — closed.** `package.json` matches `52` (root `exports`, `files` allowlist shipping
  both shader trees, `publishConfig` public, `FxShader` dropped); `npm pack --dry-run` verified.
- **IMPL-001 — resolved (2026-06-09).** The scaffolding pass landed headless,
  but IMPL-001 closes only when its consumed rows do. **RT-010** resolved (U1-003, 2026-06-08);
  **REAL-002** resolved (U3-005, 2026-06-09 — build-verified, not device);
  **SHIP-001** resolved (U1-001). All three consumed rows are closed.
- **`apple.podspecPath`** declared in `packages/expo-module.config.json` (U1-004 finding) — makes
  autolinking install-method-agnostic. Recorded in the IMPL-001 package-identity context.

So U1-001's `docs-closed` gate is **satisfied** — IMPL-001 (and all its consumed rows: SHIP-001, RT-010, REAL-002) are resolved in their source docs. **Merged on integration/0.1.x (2026-06-09).**

## U4-001 — wrapper mechanic

Type: `rework` · State: `todo` · Consumes: RT-015 · Closes: RT-015

Checklist:
- [ ] spec'd
- [ ] rules-gated
- [ ] source docs reconciled (`33`, `34` decide the target object)
- [ ] `architecture.md` / `data-layer.md` updated to match (consumers, not sources)
- [ ] device proof defined and observed
- [ ] ledger RT-015 closed (true in `33`/`34`)

Proof:
- headless: N/A
- device: mount an RN child inside `FxSurfaceView`; confirm the child rides the animated wrapper and hit-testing survives mid-animation
- docs: `33`, `34`, `architecture.md`, decision-ledger RT-015

## U2-002 — UniformSpec schema reconciliation

Type: `rework` · State: `merged` · Consumes: SPINE-003 · Closes: SPINE-003 · [task](./tasks/U2-002-uniformspec-reconciliation/task.md)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] `02` UniformSpec widened to match `data-layer` (`boolean`, `color[]`)
- [x] `data-layer.md` provisional mismatch note removed
- [x] TypeScript manifest types updated manually
- [x] ledger SPINE-003 closed (true in `02`)
- [x] reviewed
- [x] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bunx biome check .`, and `bun run test` from `packages/` all pass. `git diff --check` clean.
- device: N/A
- docs: `02` §The schema, `data-layer.md` §1, decision-ledger SPINE-003

## U2-001 — planned-rung selection

Type: `implement` · State: `merged` · Consumes: SPINE-013 · Closes: SPINE-013 · [task](./tasks/U2-001-planned-rung-selection/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] reviewed
- [x] docs-closed
- [x] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run test` from `packages/` all pass. 17 Jest tests prove planned rungs are skipped, out-of-scope rungs are skipped, OS gating works, `wantInteractive` enforces expo-view, driver target matching works, and empty/guarded-out ladders degrade to `{ via: 'none' }`.
- device: N/A.
- docs: `02` selection rule updated with `planned` skip. decision-ledger SPINE-013 resolved.

## U3-001 — hosted effect renderer

Type: `implement` · State: `merged` · Device: yes · Consumes: — · Closes: RT-009 · [task](./tasks/U3-001-effect-renderer-hosted/) · [review](./reviews/U3-001.md)

Scope (Option A): U3-001 owns the hosted authoring path + fill + iOS material — the RT-009 slice.
The shader rung moved to U3-006 and the iOS symbol rung to U3-007; those are separate tasks, not
blockers on this one.

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified
- [x] docs-closed
- [x] reviewed
- [x] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run test` from `packages/`.
  Renderer logic is device-gated — effects do not run headless.
- device: RT-009 verified on iOS 26+ and Android (2026-06-08) — hosted mount + prop/config path;
  fill on both platforms; iOS material via `.glassEffect()`. Android material → U3-003 / FX-003;
  shader rung → U3-006; iOS symbol → U3-007. Evidence in
  `tasks/U3-001-effect-renderer-hosted/evidence/device.md`.
- docs: `51` RT-009 closed (hosted authoring path proven); `structure.android.md` records the V1
  deviation (plain View fill, Compose deferred); `structure.ios.md` records the hosted material path.

## U3-006 — curated shader implementation

Type: `implement` · State: `merged` · Device: yes · Consumes: FX-004, REAL-004 · Closes: — · [task](./tasks/U3-006/)

Scope: implement the committed V1 shader catalog on the hosted renderer slice. The public
`ShaderId` widens only when all ten curated ids have native coverage: MSL for all ten ids on iOS
and AGSL for all ten ids on Android. DOC-013's pair rule means Android AGSL covers the original
five ids too, not only `aurora` / `noise-field` / `plasma` / `caustics` / `edge-glow`.

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified
- [x] docs-closed
- [x] reviewed
- [x] merged

Proof:
- headless: from `packages/`, `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, and `bun run test`; from the repo root, `git diff --check`.
  All green (2026-06-08). 18 Jest tests pass; TS build produces widened ShaderId in `.d.ts`;
  Biome clean; swift-format clean.
- device: iOS 17+ and Android API 33+ render every curated shader id; `intensity` updates from a
  discrete prop; `time` advances natively while visible; shader switching has no stale pixels or
  crash; navigation/backgrounding pause and resume the native clock. Scenario in
  `tasks/U3-006/evidence/headless.md`.
  - **Android: PASS (2026-06-08)** — all ten AGSL shaders on a POCO F1 (API 35); blank-on-switch and
    intensity-drag flicker fixes both confirmed live.
  - **iOS: PASS (2026-06-08)** — verified by the maintainer on iOS 17+; shaders render through the
    hosted Metal path. Evidence in `tasks/U3-006/evidence/device.md`. (REAL-002/REAL-003 ledger
    closures remain owned by U3-005.)
- docs: **closed (2026-06-08).** `22` reconciled — all ten ids ship with native MSL+AGSL and are
  package-exposed (the "first five only" wording is gone, Decision 2 updated). `structure.android.md`
  carries the shipped hosted-shader mechanics (layout fix + discrete-uniform-in-place). `structure.ios.md`
  hosted-shader mechanic reads true; the metallib-bundle-resolution detail stays with U3-005/REAL-002.
  This tracker moved.

## U3-005 — shader asset packaging + runtime load proof

Type: `device-verify` (hybrid — see below) · State: `merged` · Device: yes · Consumes: — · Closes: REAL-002, REAL-003 · [task](./tasks/U3-005/)

Spec'd 2026-06-09. **Reframed:** the `device-verify` label undersells it — the dominant work
is **doc-cleanup + closure-reconciliation**, with a thin device/build residual.

- **REAL-002 (iOS metallib)** — close condition is "build verification on the pinned toolchain",
  an **agent-ownable Tier-3 build-artifact check**, not the human device gate. Build-verified on
  Xcode 26.5 / Swift 6.3.2 (2026-06-09): `FxShaders.bundle` emitted unmangled with
  `default.metallib` (194 KB) at the bundle root. `structure.ios.md` §Render paths records the
  `resource_bundles` + `MTL_LIBRARY_OUTPUT_DIR` mechanism and the `ShaderLibrary(url:)` hosted-path
  loader. `52` Findings section records the resolution.
- **REAL-003 (Android AGSL path)** — mis-statused `open`. The path is chosen and shipped
  (`android/src/main/assets/shaders/*.agsl`, read via `context.assets.open(...)`) and device-proven
  on U3-006 (POCO F1, API 35). Path recorded in `structure.android.md` §Render paths; `52` Open
  questions cleared. Row resolved.
- **No new device gate:** REAL-003's render is proven on U3-006; REAL-002 is a build check done on
  the pinned toolchain. No fresh device run required.

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] headless-done (REAL-002 build artifact verified on Xcode 26.5 / Swift 6.3.2 — `FxShaders.bundle/default.metallib` at bundle root)
- [x] docs-closed (`structure.android.md` AGSL path; `structure.ios.md`/`52` bundle resolution + loader; REAL-002 + REAL-003 closed in source)
- [x] reviewed (approved; ①/② toolchain-wording fixes applied + verified in the [review](./reviews/U3-005.md) addendum)
- [x] merged

Proof:
- headless / build-verify: xcodebuild Debug-iphonesimulator on Xcode 26.5 / Swift 6.3.2 → `FxShaders.bundle` (unmangled) with `default.metallib` (194 KB) at root in build products.
- device: no new run — Android render observed on U3-006; iOS render observed on U3-006. REAL-002 build verification satisfies the close condition.
- docs: `structure.android.md` §Render paths (AGSL asset path + read API); `structure.ios.md`/`52` (bundle resolution + hosted-path loader); `52` Open questions cleared → Findings; decision-ledger REAL-002 + REAL-003 → resolved.

## U1-002 — FxNativeView abstract base + substrate view registration

Type: `implement` · State: `merged` · Consumes: RT-010 · Closes: — · [task](./tasks/U1-002-native-view-boundary/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] reviewed
- [x] docs-closed
- [x] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run swift:lint` pass. `bun run test` passes with no tests found. These verify TS types/build/style and Swift formatting only. None prove native compilation or runtime registration — those are U1-003.
- device: N/A
- docs: `51` (decisions #5 — several views), `architecture.md` §2/§4 + `data-layer.md` §9 (fix default-view binding bugs). RT-010: docs reconciled; SDK-verify deferred.

## U1-003 — SDK-verify Expo boundary behaviors

Type: `device-verify` · State: `merged` · Consumes: RT-010, RT-011 · Closes: SURF-010, RT-010, RT-011, RT-004 · [task](./tasks/U1-003-sdk-verify-boundary/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] scenario-written (four device scenarios defined)
- [x] device-verified (all four scenarios observed on iOS + Android, 2026-06-08)
- [x] docs-closed (source docs reconciled, all four ledger rows resolved)
- [x] reviewed
- [x] merged

Proof:
- headless: N/A — all claims require runtime/device observation.
- device: all four scenarios pass on iOS + Android: multi-view registration (RT-010), @Field Record coercion (RT-011), recycle reset (RT-004), previousProps value-equality for nested records (SURF-010). Evidence recorded in `tasks/U1-003-sdk-verify-boundary/evidence/device.md`.
- docs: `51` open questions closed (registration ergonomics + Record coercion); `data-layer.md` §5.1 ratified (value-equality confirmed); `31` recycling question closed; decision-ledger SURF-010, RT-010, RT-011, RT-004 all resolved.

## U1-004 — bare Fabric example in CI

Type: `implement` · State: `merged` · Closes: SHIP-003 · [task](./tasks/U1-004-bare-fabric-example-ci/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done (CI green on GitHub — all 4 jobs; `bare-ios` on `macos-26` for Swift 6.2)
- [x] docs-closed (SHIP-003 resolved in `53` and ledger; `apple.podspecPath` recorded)
- [x] reviewed
- [x] merged

Progress (CI green — all 4 jobs on GitHub):
- **Bare fixture built + verified locally:** `example-bare/` — literal bare RN 0.85.3 / New-Arch
  app (bun, committed `ios/`+`android/`), Expo Modules via `install-expo-modules`,
  `react-native-fx` as `file:../packages`. Both platforms autolink fx (iOS `Podfile.lock` →
  `ReactNativeFx (0.1.0)`; Android resolver → `expo.modules.reactnativefx.FxModule`).
  **iOS compile: BUILD SUCCEEDED, 0 errors** — `FxBareExample.app` built, fx Swift + Metal
  (`FxShaders.metal` → bundled `default.metallib`) compiled in. Mandatory native-compile gate met.
- **Library fix (carries into the package):** declared `apple.podspecPath` in
  `packages/expo-module.config.json` — without it bun's `file:` file-symlink install hides the
  podspec from Expo's scanner and fx never links on iOS. Makes autolinking install-method-agnostic;
  should be recorded as a library config change (IMPL-001 / RT-010 area). See task notes.
- **CI:** `.github/workflows/ci.yml` has `typescript` + `swift` (library, locally green) + `bare-ios`
  (install → Metal-toolchain download → `pod install` → `Podfile.lock` assert → `xcodebuild`) +
  `bare-android` (install → autolink assert, package id + module class). All 4 jobs green on
  GitHub (`macos-26` for Swift 6.2).
- **Proof:** CI green on GitHub — all 4 jobs pass. iOS autolink + native compile proven; Android
  autolink proven. `apple.podspecPath` library-config change on main.

Proof:
- headless: package build/lint (green); CI all 4 jobs green — iOS autolink + native compile proven; Android autolink proven.
- device: N/A — U1-003 owns runtime/device verification.
- docs: `53` open question closed (Bare + Fabric CI); SHIP-003 resolved in ledger. `apple.podspecPath` library-config change recorded.

## DOC-002 — ratify SPINE-004/005/006/007

Type: `ratify` · State: `merged` · Device: no · Consumes: — · Closes: SPINE-004, SPINE-007 · [task](./tasks/DOC-002/)

Ratifies the `02` open questions that are ripe and honestly defers the ones that are not.

**Closed (2 of 4):**
- **SPINE-004** — `composition` (background/overlay/surface) is an **API-layer prop** (`50` / `<Fx>`), not a manifest field. `02` Decision 12 records this.
- **SPINE-007** — `via:'lib'` naming: `applyVia` names the library (e.g., `Haze`), `asset` names the asset type (e.g., `lottie`). No version in the manifest — managed by the app's optional peer dependency (`53` decision 6). `02` Decision 13 records this.

**Deferred (2 of 4) — no premature decision:**
- **SPINE-005** — feature-flag vocabulary + multiple assets per rung. Deferred: no real shader or feature case forces it in V1. Revisit when a non-OS capability flag or multiple assets per rung is needed.
- **SPINE-006** — manifest partitioning. Deferred: the manifest stays one file for V1; split when the node count makes rendering unwieldy.

Checklist:
- [x] spec'd (2026-06-09)
- [x] rules-gated
- [x] docs-closed (`02` Decisions 12+13; SPINE-004/007 closed; SPINE-005/006 deferred with triggers)
- [x] reviewed (passed — closures grounded in `02`+`50`+`53`, 2-closed/2-deferred split honored, stale SPINE-007 back-references swept; no separate review doc)
- [x] merged

Proof:
- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `02` Decision 12 (`composition` = API-layer prop), Decision 13 (`via:'lib'` naming); decision-ledger SPINE-004 + SPINE-007 → resolved; SPINE-005 + SPINE-006 → deferred with trigger notes.

## DOC-010 — reduce-motion policy ratification

Type: `ratify` · State: `merged` · Device: no · Consumes: — · Closes: MOT-010 · [task](./tasks/DOC-010/)

The motion domain had no policy for honoring OS reduce-motion / animation-scale settings.
This task ratifies the V1 policy: **instant degradation** (0-duration, snap to target)
when the OS setting is active. Implementation is owned by U6-001 (FxAnimationDriver, v2).

- **iOS:** `UIAccessibility.isReduceMotionEnabled` → driver sets duration to 0.
- **Android:** `Settings.Global.TRANSITION_ANIMATION_SCALE` = 0.0 (or
  `ANIMATOR_DURATION_SCALE` = 0.0) → driver sets duration to 0.
- **Scope:** All content motion (presence enter/exit, state transitions). Presets and
  explicit `motion` overrides are both degraded. Opacity-only degradation is a deferred
  V2 refinement. Decorative effects have their own native clock and are not gated in V1.

Checklist:
- [x] spec'd (2026-06-09)
- [x] rules-gated
- [x] docs-closed (`41` Decision #9; `42` §Reduce-motion; `34` §Findings — reduce-motion; MOT-010 → resolved)
- [x] reviewed (passed — closure verified across `41`/`42`/`34`, `onTransitionEnd`-fires-immediately confirmed; no separate review doc)
- [x] merged

Proof:
- headless: N/A — docs-only; no code.
- device: N/A — policy ratification. Implementation + device proof owned by U6-001.
- docs: `41-motion-vocabulary.md` (Decision #9), `42-presence-and-lifecycle.md`
  (§Reduce-motion), `34-animation-driver.md` (§Findings — reduce-motion);
  decision-ledger MOT-010 → resolved.

## DOC-005 — V1 preset/state/feedback vocabulary ratification

Type: `ratify` · State: `merged` · Device: no · Consumes: MOT-001 · Closes: SURF-003, SURF-004, SURF-005

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] source docs ratified (`50`/`56`/`57` vocab; `41`/`42` preset sets)
- [x] data-layer §3 MOT-001 ownership pointer added
- [x] data-layer §5 accuracy checked (no change needed — values already match)
- [x] ledger SURF-003/004/005 closed (resolved)
- [x] docs-closed
- [x] reviewed (passed — closures grounded in `56`/`57`/`41`; vocab cross-checked against `42` catalog + behavior-named law and the Reanimated motion-primitive altitude; split held; no separate doc)
- [x] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run test` from `packages/` — all green.
- device: N/A — ratification task.
- docs: `50`/`56`/`57` vocab ratified; `41`/`42` preset sets ratified; `data-layer.md` §3 MOT-001 pointer added; ledger SURF-003/004/005 → resolved. Springs remain device-pending with MOT-001.

## Maintenance

- The table is the **view**; the detail block / `tasks/<id>/` folder is the **store**. On disagreement, the store wins — same discipline as "the source doc closes a ledger row, not the ledger."
- A row reaches `ready-to-merge` (complete) only when its `Closes:` rows are true in their source docs. Until then it sits at `docs-pending`, however green the build.
- Escalate by need: row → add a detail block when the task is active → promote to a `tasks/<id>/` folder when it accrues device evidence.
