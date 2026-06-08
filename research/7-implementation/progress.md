# Implementation progress

The durable record of build execution. The **table** is the global view — one row per task,
current **state** only. **Detail blocks** below carry the full lifecycle checklist and proof
for active or complex tasks. The rules (lifecycle, states, proof, the closure rule) live in
[`subtask-protocol.md`](./subtask-protocol.md).

> **The cardinal rule:** a task is `complete` only when every `Closes:` ledger row is true in
> its **owning source doc** — not here, not in `data-layer.md`, not in the commit.

## Legend

- **state** (one per task): `todo · in-progress · blocked · headless-done · device-pending · docs-pending · ready-to-merge · merged`. `ready-to-merge` = **complete** (all gates but git); `merged` = integrated.
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
| DOC-001 | 1-surface | doc-cleanup | todo | no | — | SURF-001, SURF-009 | — | docs: `56`/`55`/`41` drop `GlassView` + `SpringTune` |
| DOC-002 | 0-spine | ratify | todo | no | — | SPINE-004, SPINE-005, SPINE-006, SPINE-007 | — | docs: `02` composition, feature-flags, partitioning, lib naming |
| DOC-003 | 0-spine | ratify | todo | no | — | SPINE-001, SPINE-002 | — | docs: `00`/`50` curation/BYO threshold, palettes-as-artifact |
| DOC-004 | 1-surface | ratify | todo | no | — | SURF-002 | — | docs: `56`/`6-ship` ship effect components? |
| DOC-005 | 1-surface | ratify | todo | no | MOT-001 | SURF-003, SURF-004, SURF-005 | — | docs: `50`/`56`/`57` V1 preset/state/feedback vocab |
| DOC-006 | 1-surface | ratify | todo | no | — | SURF-006 | — | docs: `57`/`21` FxGroup morph scope |
| DOC-007 | 2-effects | ratify | todo | no | — | FX-001, FX-004 | — | docs: `20`/`22`/`50` mesh ergonomics, shader catalog |
| DOC-008 | 2-effects | ratify | todo | no | — | FX-009 | — | docs: `24` Android symbol scope |
| DOC-009 | 3-motion | ratify | todo | no | — | MOT-003, MOT-005, MOT-006, MOT-009 | — | docs: `40`/`41`/`42` V1 motion vocab scope |
| DOC-010 | 3-motion | ratify | todo | no | — | MOT-010 | — | docs: `41`/`42` reduce-motion policy |
| DOC-011 | 4-runtime | ratify | todo | no | — | RT-006, RT-008 | — | docs: `32`/`36` SDF source, driver granularity |
| DOC-012 | 6-ship | ratify | todo | no | — | SHIP-002 | — | docs: `53` no-rung degradation UX |
| DOC-013 | 2-effects | ratify | todo | no | — | REAL-004 | — | docs: `52` single-source shaders (ties compiler) |

### V1 build — Units 1–3 + ship

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U1-001 | Unit 1 | implement | docs-pending | no | IMPL-001 | SHIP-001, IMPL-001 | — | reviewed; SHIP-001 closed, IMPL-001 carried; [detail](#u1-001--package-scaffolding) |
| U1-002 | Unit 1 | implement | headless-done | no | RT-010 | — | U1-001 | headless build green; `FxNativeView` + substrate view classes register in source; docs reconciled; SDK-verify deferred to U1-003; [detail](#u1-002--fxnativeview-abstract-base--substrate-view-registration) |
| U1-003 | Unit 1 | device-verify | ready-to-merge | yes | RT-010, RT-011 | SURF-010, RT-010, RT-011, RT-004 | U1-002, U1-004 | all four scenarios pass on iOS + Android (2026-06-08); ledger rows resolved; source docs reconciled; [detail](#u1-003--sdk-verify-expo-boundary-behaviors) |
| U1-004 | Unit 1 | implement | ready-to-merge | no | — | SHIP-003 | U1-001 | CI green on GitHub (all 4 jobs). SHIP-003 resolved in `53` and ledger. `apple.podspecPath` fix recorded. [detail](#u1-004--bare-fabric-example-in-ci) |
| U1-005 | Unit 1 | implement | headless-done | no | — | — | — | Android library build-ready: `versionCode`/`versionName` added to `packages/android/build.gradle`; fix committed on main (`e6c29c3`). CI Android autolink passes. |
| U2-001 | Unit 2 | implement | ready-to-merge | no | SPINE-013 | SPINE-013 | — | typed `select()` in `packages/src/manifest/select.ts` skips planned and out-of-scope rungs; 17 Jest tests pass; `02` selection rule updated; [detail](#u2-001--planned-rung-selection) |
| U2-002 | Unit 2 | rework | ready-to-merge | no | SPINE-003 | SPINE-003 | — | `02` UniformSpec widened with `boolean` + `color[]`; `data-layer.md` provisional note removed; types manually synced in `packages/src/manifest/types.ts`; [detail](#u2-002--uniformspec-schema-reconciliation) |
| U3-001 | Unit 3 | implement | ready-to-merge | yes | FX-004 | RT-009 | U1-002, U2-001, DOC-007, DOC-008 | implemented; RT-009 closed; fill iOS+Android; material iOS; device-verified iOS 26+; [detail](#u3-001--hosted-effect-renderer) |
| U3-002 | Unit 3 | device-verify | todo | yes | — | SPINE-012, FX-002, FX-005 | U3-001 | device: hosting parity, glass styles, uniform alignment, GPU resume |
| U3-003 | Unit 3 | implement | todo | yes | — | FX-003 | U3-001 | device: Android glass fallback + intensity 0–1; RenderEffect staleness |
| U3-004 | Unit 3 | ratify | todo | no | — | FX-006 | U3-001 | docs: `22` BYO `.metal`/`.agsl` registration contract |
| U3-005 | Unit 3 | device-verify | todo | yes | — | REAL-002, REAL-003 | U3-001 | device: metallib bundle resolves; AGSL assets read at runtime |

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

Type: `implement` · State: `docs-pending` · Closes: SHIP-001, IMPL-001 · [task](./tasks/U1-001-package-scaffolding/)

Through `reviewed` ([review](./reviews/U1-001.md), approved). `docs-closed` is **partial**:

- **SHIP-001 — closed.** `package.json` matches `52` (root `exports`, `files` allowlist shipping
  both shader trees, `publishConfig` public, `FxShader` dropped); `npm pack --dry-run` verified.
- **IMPL-001 — carried (stays `implementation-pending`).** The scaffolding pass landed headless,
  but IMPL-001 closes only when its consumed rows do. **RT-010** is now resolved (U1-003, 2026-06-08).
  **REAL-002** (native build / metallib resolves — device, U3-005) remains the sole blocker.
- **`apple.podspecPath`** declared in `packages/expo-module.config.json` (U1-004 finding) — makes
  autolinking install-method-agnostic. Recorded in the IMPL-001 package-identity context.

So U1-001 is **complete-blocked on IMPL-001**, now gated only on REAL-002 (U3-005).

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

Type: `rework` · State: `ready-to-merge` · Consumes: SPINE-003 · Closes: SPINE-003 · [task](./tasks/U2-002-uniformspec-reconciliation/task.md)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] `02` UniformSpec widened to match `data-layer` (`boolean`, `color[]`)
- [x] `data-layer.md` provisional mismatch note removed
- [x] TypeScript manifest types updated manually
- [x] ledger SPINE-003 closed (true in `02`)
- [ ] reviewed
- [ ] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bunx biome check .`, and `bun run test` from `packages/` all pass. `git diff --check` clean.
- device: N/A
- docs: `02` §The schema, `data-layer.md` §1, decision-ledger SPINE-003

## U2-001 — planned-rung selection

Type: `implement` · State: `ready-to-merge` · Consumes: SPINE-013 · Closes: SPINE-013 · [task](./tasks/U2-001-planned-rung-selection/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [ ] reviewed
- [x] docs-closed
- [ ] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run test` from `packages/` all pass. 17 Jest tests prove planned rungs are skipped, out-of-scope rungs are skipped, OS gating works, `wantInteractive` enforces expo-view, driver target matching works, and empty/guarded-out ladders degrade to `{ via: 'none' }`.
- device: N/A.
- docs: `02` selection rule updated with `planned` skip. decision-ledger SPINE-013 resolved.

## U3-001 — hosted effect renderer

Type: `implement` · State: `ready-to-merge` · Device: yes · Consumes: FX-004 · Closes: RT-009 · [task](./tasks/U3-001-effect-renderer-hosted/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified
- [x] docs-closed
- [ ] reviewed
- [ ] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run test` from `packages/`.
  Renderer logic is device-gated — effects do not run headless.
- device: RT-009 — hosted mount + prop/config path on iOS + Android. fill on both platforms
  (unblocked). iOS material (unblocked); Android material gated by U3-003 / FX-003.
  shader after DOC-007/FX-004. symbol iOS after DOC-008/FX-009; Android symbol deferred.
  Evidence in `tasks/U3-001-effect-renderer-hosted/evidence/device.md`.
- docs: `51` RT-009 intended close (hosted authoring path — device gate pending);
  `structure.android.md` records V1 deviation (plain View fill, Compose deferred);
  `structure.ios.md` records hosted material path.

## U1-002 — FxNativeView abstract base + substrate view registration

Type: `implement` · State: `headless-done` · Consumes: RT-010 · Closes: — · [task](./tasks/U1-002-native-view-boundary/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run swift:lint` pass. `bun run test` passes with no tests found. These verify TS types/build/style and Swift formatting only. None prove native compilation or runtime registration — those are U1-003.
- device: N/A
- docs: `51` (decisions #5 — several views), `architecture.md` §2/§4 + `data-layer.md` §9 (fix default-view binding bugs). RT-010: docs reconciled; SDK-verify deferred.

## U1-003 — SDK-verify Expo boundary behaviors

Type: `device-verify` · State: `ready-to-merge` · Consumes: RT-010, RT-011 · Closes: SURF-010, RT-010, RT-011, RT-004 · [task](./tasks/U1-003-sdk-verify-boundary/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] scenario-written (four device scenarios defined)
- [x] device-verified (all four scenarios observed on iOS + Android, 2026-06-08)
- [x] docs-closed (source docs reconciled, all four ledger rows resolved)
- [ ] reviewed
- [ ] merged

Proof:
- headless: N/A — all claims require runtime/device observation.
- device: all four scenarios pass on iOS + Android: multi-view registration (RT-010), @Field Record coercion (RT-011), recycle reset (RT-004), previousProps value-equality for nested records (SURF-010). Evidence recorded in `tasks/U1-003-sdk-verify-boundary/evidence/device.md`.
- docs: `51` open questions closed (registration ergonomics + Record coercion); `data-layer.md` §5.1 ratified (value-equality confirmed); `31` recycling question closed; decision-ledger SURF-010, RT-010, RT-011, RT-004 all resolved.

## U1-004 — bare Fabric example in CI

Type: `implement` · State: `ready-to-merge` · Closes: SHIP-003 · [task](./tasks/U1-004-bare-fabric-example-ci/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done (CI green on GitHub — all 4 jobs; `bare-ios` on `macos-26` for Swift 6.2)
- [x] docs-closed (SHIP-003 resolved in `53` and ledger; `apple.podspecPath` recorded)
- [ ] reviewed
- [ ] merged

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

## Maintenance

- The table is the **view**; the detail block / `tasks/<id>/` folder is the **store**. On disagreement, the store wins — same discipline as "the source doc closes a ledger row, not the ledger."
- A row reaches `ready-to-merge` (complete) only when its `Closes:` rows are true in their source docs. Until then it sits at `docs-pending`, however green the build.
- Escalate by need: row → add a detail block when the task is active → promote to a `tasks/<id>/` folder when it accrues device evidence.
