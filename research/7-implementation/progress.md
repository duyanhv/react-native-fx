# Implementation progress

The durable record of build execution. The **table** is the global view — one row per task,
current **state** only. **Detail blocks** below carry the full lifecycle checklist and proof
for active or complex tasks. The rules (lifecycle, states, proof, the closure rule) live in
[`subtask-protocol.md`](./subtask-protocol.md).

> **The cardinal rule:** a task is `complete` only when every `Closes:` ledger row is true in
> its **owning source doc** — not here, not in `data-layer.md`, not in the commit.

> **V1-cut readiness** lives in [`v1-cut-checklist.md`](./v1-cut-checklist.md) — the standing
> record of dispositions, the one remaining device gate (U3-007, waived), waivers, and known
> V1 limitations.

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
| DOC-003 | 0-spine | ratify | merged | no | — | SPINE-001, SPINE-002 | — | docs: `00` Decision #6 + `52` Decision #11 + `50` open question struck; SPINE-001/002 resolved; reviewed (no separate doc); merged on integration/0.1.x; [task](./tasks/DOC-003/) · [detail](#doc-003--ratify-spine-001--spine-002) |
| DOC-004 | 1-surface | ratify | merged | no | — | SURF-002 | — | `56` Decision 4 records the criterion; `52` Decision 12 records the V1 set; SURF-002 resolved; reviewed (no separate doc); merged on integration/0.1.x; [task](./tasks/DOC-004/) · [detail](#doc-004--ratify-surf-002) |
| DOC-005 | 1-surface | ratify | merged | no | MOT-001 | SURF-003, SURF-004, SURF-005 | — | `50`/`56`/`57`/`41` V1 preset/state/feedback vocab ratified; springs stay with MOT-001; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-005--v1-presetstatefeedback-vocabulary-ratification) |
| DOC-006 | 1-surface | ratify | merged | no | — | SURF-006 | — | **merged 2026-06-13 (maintainer — V1-cut closeout): `d3f8b4c`.** docs: `57`/`21` FxGroup morph scope ratified; [task](./tasks/DOC-006/) |
| DOC-007 | 2-effects | ratify | merged | no | — | FX-001, FX-004 | — | full-grid mesh + mesh-only `drift`; 10-id shader catalog; shared minimal shader uniforms; [task](./tasks/DOC-007/) · [review](./reviews/DOC-007.md) |
| DOC-008 | 2-effects | ratify | merged | no | — | FX-009 | — | `symbol` iOS-only in V1; Android AVD/Lottie planned/deferred (non-selectable, enforced by `select()`); [task](./tasks/DOC-008/) · [review](./reviews/DOC-008.md) |
| DOC-009 | 3-motion | ratify | merged | no | — | MOT-003, MOT-005, MOT-006, MOT-009 | — | **merged 2026-06-13 (maintainer — V1-cut closeout): `3163c5d`.** driver model (`target`/`clock`/`source`) ratified — scope widened to promote the research/wip rethink (maintainer-accepted 2026-06-10); per-platform spring authoring replaces `{damping,mass,stiffness}`; iOS content rung → `os:17`; render-server-first + `FxSpring`-on-retarget pinned; MOT-003/005/006/009 resolved in source; [task](./tasks/DOC-009/) · [detail](#doc-009--driver-model-ratification) |
| DOC-010 | 3-motion | ratify | merged | no | — | MOT-010 | — | V1 reduce-motion = instant degradation (0-duration); policy recorded in `41` Decision #9, `42` §Reduce-motion, `34` §Findings; MOT-010 resolved; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-010--reduce-motion-policy-ratification) |
| DOC-011 | 4-runtime | ratify | merged | no | — | RT-005 | — | **merged 2026-06-13 (maintainer — V1-cut closeout): `fd5ed75`.** **ratified (planner, 2026-06-12)** — `32` Decisions 4–5: SDF source = the shader's own shape uniforms; coordinate space = the shader's `[0,1]` y-up UV (the shipped touch-uniform convention) across `hitTest`/uniforms/`setHighlight`, JS events in view points; RT-005 resolved. **Closes column re-wired (planner, 2026-06-12):** the original RT-006/RT-008 pairing was wrong — RT-006 is device-pending (closes with U8-001's gate, where the tuning/cost rows run) and RT-008 closes at implementation (→ U9-001); RT-005 was this task's actual docs pin |
| DOC-012 | 6-ship | ratify | merged | no | — | SHIP-002 | — | **merged 2026-06-13 (maintainer — V1-cut closeout): `5c98519`.** docs: `53` Decision 7; no-rung degradation policy ratified; SHIP-002 resolved; [task](./tasks/DOC-012/) |
| DOC-013 | 2-effects | ratify | merged | no | — | REAL-004 | — | V1 curated shaders hand-maintain MSL+AGSL pairs; compiler remains additive V2; [task](./tasks/DOC-013/) · [review](./reviews/DOC-013.md) |
| DOC-014 | 7-impl | doc-cleanup | merged | no | — | — | — | [detail](#doc-014--runtime-binding-ref-cleanup). Reviewed + merged on integration/0.1.x. Reconciled all runtime-binding/folder refs in `architecture.md` (§1 src-tree, §2 path, §9 unit-map + footnote, podspec) and `data-layer.md` (§9 entity diagram) to the real package — 3 bindings `FxHostedView`/`FxSurfaceView`/`FxGroupView`. **All three phantoms dropped** (`FxManagedView` + `FxPresenceView` + `FxPressableView`): grounding overruled the S1 "mark planned" disposition — presence/press are `expo-view` (rule #3) over `FxSurfaceView`, exposed as `src/surface/` components, never dedicated bindings. Also reconciled the ledger RT-008 "five-view object model" wording to 3 views (RT-008 stays open — object granularity per `36`). (scope widened per audit-2026-06-09 S1; binding call revised in-session) |
| DOC-015 | 1-surface | doc-cleanup | merged | no | — | SURF-010 (re-close) | — | [detail](#doc-015--surf-010-plane-1-re-closure). Reviewed + merged on integration/0.1.x. Cardinal-rule slip (audit-2026-06-09 S3): SURF-010 (memoization guidance — native `previousProps` value-equality ⇒ no manual memo) was closed against plane-7 `data-layer §5.1`, not its named plane-1 source `50`/`54`/`55`. Propagate the guidance into the owning surface doc(s) and re-point the SURF-010 closure there (or correct the source attribution if it genuinely belongs in `data-layer`) |
| DOC-016 | guides | doc-cleanup | merged | no | — | — | — | critique F19: short human-contributor path added to `Contributing Guide.md` (§Contributing as a human — small drive-by change vs research-path change); no ledger row; [task](./tasks/DOC-016/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-017 | 0-spine | rework | merged | no | — | — | — | critique F4: spine reconciled to the shipped Android hosted mechanic — `01`/`02`/`README` substrate wording + the `02` shader-hosted worked row now say plain `View` + `Paint.onDraw` + `Choreographer`, Compose marked future rung; `structure.android.md` (mechanic home) corrected too (it was self-contradictory — Compose-host vs plain-View host); no ledger row; [task](./tasks/DOC-017/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-018 | 0-spine/3-motion | ratify | merged | no | — | — | — | critique F5+F12: **maintainer decided (2026-06-11) — drop `sheet`/`modal` from V1, ship `transient` only; defer `sheet`/`modal` to MOT-001.** Scope ceiling documented (`42` §The scope ceiling: presence animates in-screen conditional rendering, not navigator transitions); V1 vocab narrowed in `42`/`56`/`50`/`41` + ledger (SURF-003/MOT-001) + `data-layer` catalog note; React-semantics rows (StrictMode/Fast Refresh/Suspense/mid-exit re-render/list eviction) added to `35`; revises DOC-005; blocks U7-001; [task](./tasks/DOC-018/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-019 | 1-surface | ratify | merged | no | — | — | — | critique F8: `tune` deferred from the V1 surface — V1 ships the `preset`/`motion`/`transition` triad. Recorded in `41` (Decision 13 + table marker); propagated to `50`/`42`/`54`/`56`/`1-surface README` (surface marks + examples stripped of `tune`); `data-layer §4` + `architecture` + ledger MOT-002 carry the deferral; design retained for MOT-001 resurrection; no ledger row; [task](./tasks/DOC-019/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-020 | 1-surface | ratify | merged | no | — | — | — | critique F18: native↔public event-name mapping pinned as the one canonical table in `40` §Native ↔ public event-name mapping (grounded in shipped `FxModule`/view `Events`: press `onShader*`, lifecycle/load `onFx*`; `onStateChange`/`onLongPress` marked unwired); `architecture.md`'s vague note + `50`'s event list now point at it; no rename (code change, out of scope); no ledger row; [task](./tasks/DOC-020/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-022 | 7-impl | ratify + doc-cleanup | merged | no | — | RT-012, RT-003 | — | **V1-cut closeout sweep — merged 2026-06-13 (maintainer, this commit).** **RT-012 resolved** (`35` §Resolved: V1 stays presence-specific; generalization → DEF-012 V2). **RT-003 resolved by citation** (`31` §Resolved: device-shared singleton U4-003/EX-002, fresh-drawable-on-resume U3-008, continuous-while-active cheap RT-006/U8-001; maintainer-ratified citation-close). Struck `35`'s stale `05`-falsification question (SPINE-009 closed via U9-002). Re-pointed DEF-012 (closes — , trigger-gated). Wrote `v1-cut-checklist.md` (linked from `progress.md` + `HOW-TO-CONTINUE.md`); ticked the stale merge batch + waived U3-007 A1-2. [task](./tasks/DOC-022/) |

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
| U3-002 | Unit 3 | device-verify (hybrid) | merged | yes | — | SPINE-012, FX-002, FX-005 | U3-001 | **merged 2026-06-13 (maintainer — V1-cut closeout; the stale `docs-closed` state cell normalized — reviewed + committed `48fa26b`): `48fa26b`.** iOS-26 glass rung reworked to UIKit `UIVisualEffectView`+`UIGlassEffect` per the ratified spike; device-verified 2026-06-10 (agent-device run + maintainer live tap); SPINE-012/FX-002/FX-005 closed in owning docs + ledger; UIKit rung is scroll-through inside scrollers (`01` decision 6) ([task](./tasks/U3-002/), [detail](#u3-002--hosting-parity--glass-styles--uniforms-scope-note)) · [review](./reviews/U3-002.md) |
| U3-003 | Unit 3 | implement | merged | yes | — | FX-003 | U3-001 | Android material landed (sweep B1): `FxMaterialView` own-content stack + `RenderEffect.createBlurEffect` via `setRenderEffect` (API 31+; unblurred stack below — never a flat box), intensity 0–1 → 0–24dp blur + alpha, `variant` weights, `interactive` inert, Haze rung `planned`; manifest fixture + 5 select() tests; gates green + `assembleDebug` BUILD SUCCESSFUL; **device run 2026-06-11 on POCO F1 (API 35) via agent-device — B1 PASS recommended** (renders / intensity live / variant / interactive-inert / scroll 59.8 fps · `tasks/U3-003/evidence/device.md` + `device-run-2026-06-11/`); **device-verified ratified 2026-06-11 (maintainer)**; **FX-003 closed** — `21` Decision 6 (own-content blur default, intensity 0–1 mapping, staleness clean) + ledger resolved; reviewed ([review](./reviews/device-batch-2026-06-11.md)); **merged 2026-06-11 (maintainer)** on integration/0.1.x ([task](./tasks/U3-003/)) |
| U3-004 | Unit 3 | ratify | merged | no | — | FX-006 | U3-001 | **merged 2026-06-13 (maintainer — V1-cut closeout): `3a5e9e1`.** docs: `22` BYO `.metal`/`.agsl` registration contract ratified; [detail](#u3-004--byo-registration-contract) |
| U3-005 | Unit 3 | device-verify | merged | yes | — | REAL-002, REAL-003 | U3-001 | headless-done + docs-closed (2026-06-09); REAL-002 build-verified on Xcode 26.5; REAL-003 path recorded in `structure.android.md`; both ledger rows resolved; reviewed (approved, incl. fix-round addendum); merged on integration/0.1.x; [detail](#u3-005--shader-asset-packaging--runtime-load-proof) · [review](./reviews/U3-005.md) |
| U3-006 | Unit 3 | implement | merged | yes | FX-004, REAL-004 | — | — | 10 MSL `[[stitchable]]` + 10 AGSL shaders; hosted dispatch on iOS + Android; `ShaderId` = 10 ids; headless green; **device-verified iOS + Android (2026-06-08)**, incl. blank-on-switch + intensity-flicker fixes; docs-closed (`22` reconciled); reviewed + confirmed by maintainer (2026-06-09); merged on integration/0.1.x; [detail](#u3-006--curated-shader-implementation) |
| U3-007 | Unit 3 | implement | merged | yes | FX-009 | — | DOC-008, U3-001 | **merged 2026-06-13 (maintainer — V1-cut closeout; the A1-2 iOS OS-degradation rows WAIVED for the cut — they need a real iOS 17 / sub-17 device, accepted unverified): code `118cae2`/`33c7f98`.** A1-1 `replaceWith` was device-evidenced + maintainer-ratified 2026-06-10; only the cross-OS-degradation visual rows are the waived residual (recorded in `v1-cut-checklist.md`). iOS `.symbolEffect` via hosted slice; Android planned rung skipped by `select()`; A1-1 `replaceWith` fix device-evidenced and maintainer-ratified (2026-06-10); device gate held ONLY for the A1-2 OS-degradation rows — needs a real iOS 17 / sub-17 device (maintainer chose not to waive); [detail](#u3-007--ios-symbol-effect) |
| U1-006 | Unit 1 | implement | merged | no | — | — | — | critique F9: `FxGroupView` + `NativeFxGroupProps` pulled from the public index (`src/index.ts`) — the binding file + its `.web` stub + the inert native class stay; no example/skills import existed; gates green; awaiting review; [detail](#u1-006--drop-fxgroupview-from-the-public-index); **reviewed 2026-06-11 (approved, no separate doc — see detail block)**; **merged 2026-06-11 (maintainer)** on integration/0.1.x |
| U2-003 | Unit 2 | implement | merged | yes | — | — | — | critique F3+F6+F11 (audit G1): canonical `CapabilityManifest` shipped at `src/manifest/manifest.ts` (`as const`, reconciled to shipped native, `cadence` added); per-effect typed config derived at the type level (`config.ts`, no codegen) + asserted against the catalog types; manifest↔`ShaderId`↔native-switch conformance test (34 tests). `cadence`/`'string'` added to the `02` schema (decisions 15+16). **Carry-ins:** `onFxLoad`/`onFxError` now dispatch on `FxSurfaceView` (iOS pipeline-compile; Android asset open+compile) once per change; absent-vs-empty `shader` resolved (binding coerces `undefined → ''`). Headless + iOS xcodebuild + Android compileDebugKotlin green. **device-verified ratified 2026-06-11 (maintainer)** on the agent-device PASS evidence — shader-reset silent + loop-pausing, load/error once per change (47-reapply drag = zero events), iOS raster subset errors instead of wrong-rendering, hosted path unaffected, Android load-by-asset-compile divergence documented; evidence in `tasks/U2-003/evidence/`. **Reviewed + docs-closed 2026-06-11** after two review rounds — intensity contract reconciled to the native clamp, comments/style sweep clean ([review](./reviews/U2-003.md)); **merged 2026-06-11 (maintainer)** on integration/0.1.x. [task](./tasks/U2-003/) · [detail](#u2-003--capabilitymanifest-data--typed-config--conformance--cadence) |
| U3-008 | Unit 3 | rework | merged | yes | — | — | — | critique F1+F10: persistent `UIHostingController` + observed props holder on iOS `FxHostedView` (Expo `SwiftUIHostingView` idiom; the Android sibling and the UIKit glass path already update in place) — unblocks the eased-uniform `transition` channel, symbol state survives prop changes; decorative hosted views default a11y-hidden on both platforms; a11y row added to the Device Verification Guide template. Headless gates + xcodebuild green; agent-device evidence (stills only) in `tasks/U3-008/evidence/device-run-2026-06-10/` — F1 symbol/shader continuity PASS, glass regular/clear + GPU resume PASS, decorative a11y-hidden PASS, interactive-glass reachability PARTIAL (no AX element in either state — the open VoiceOver item, see notes). **device-verified ratified 2026-06-11 (maintainer)** on physical iPhone + POCO F1 (Android 15/API 35): iOS symbol `variableColor`+`repeat` replace-flip and iOS+Android intensity-slider in-place uniform updates PASS (no blank/restart); Android decorative a11y-hidden confirmed via the live accessibility tree (effect view absent, controls present — `FxHostedView.kt:105`); residual — literal Google-TalkBack screen-reader demo needs a TalkBack-equipped device (POCO F1/MIUI ships none); evidence in `tasks/U3-008/evidence/ratify-2026-06-11/`. **Reviewed + docs-closed 2026-06-11** — approved, gates re-run green at `04f77d0`, two non-blocking nits (inert `FxHostedProps.materialConfig`; teardown-wording nuance in `structure.ios.md`) ([review](./reviews/U3-008.md)); **merged 2026-06-11 (maintainer)** on integration/0.1.x ([task](./tasks/U3-008/)) |
| U4-003 | Unit 4 | rework | merged | yes | — | — | — | critique F2+F11(sharing half): iOS `FxSurfaceView` builds its `MTKView` lazily (first active `shader`) + shares a process-wide static device/queue/library/pipeline cache; Android unaffected (no GPU in the shell). Headless green; `structure.ios.md` §Lifecycle pinned. **device-verified ratified 2026-06-11 (maintainer)** on the agent-device PASS evidence — exactly one `MTKView` allocation per session, zero for content-motion-only, reuse + isolated teardown clean (`tasks/U4-003/evidence/`); multi-instance proof rides EX-002. **Reviewed + docs-closed 2026-06-11** ([review](./reviews/U4-003.md)); **merged 2026-06-11 (maintainer)** on integration/0.1.x. [task](./tasks/U4-003/) · [detail](#u4-003--lazy-metal--shared-static-metal-context) |
| EX-002 | harness | implement | merged | yes | — | — | — | critique F14: 100-cell mixed-effect stress list shipped in the example (`screens/stress-list.tsx`, FlatList, 4 cell kinds cycling — shader `FxSurfaceView` / fill+material `FxHostedView` / motion-only `FxSurfaceView`); registered as task EX-002; example tsc green, no native touched; **device run 2026-06-11 via agent-device (iOS 26.5 sim, log-instrumented build reverted after; + Android POCO F1) — (a) shared Metal context PASS (1 MTLDevice + 1 MTLCommandQueue process-wide, 5 pipeline compiles = distinct raster ids, repeat-id reuse no recompile), (c) zero MTKView for motion cells PASS (28 allocs all shader-cell), a11y PASS; (b) scroll PASS on Android hardware (59.8 fps, 0 stutters) / partial on iOS sim (no fps tooling)** — `tasks/EX-002/evidence/device.md`. **Finding:** Android expo-view shader cells render blank (`FxSurfaceView.kt` renderer is a TODO; scenario doc's "shader via AGSL" claim inaccurate). **device-verified ratified + reviewed 2026-06-11 (maintainer / reviewer)** ([review](./reviews/device-batch-2026-06-11.md)); the Android-renderer gap is pre-existing (deferred interactive renderer), not an EX-002 defect — scenario doc corrected; **merged 2026-06-11 (maintainer)** on integration/0.1.x. [task](./tasks/EX-002/) · [detail](#ex-002--100-cell-mixed-effect-stress-list) |

### V2 build — Units 4–9

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U4-001 | Unit 4 | rework | merged | yes | RT-015 | RT-015 | U1-002 | RT-015 resolved — animator targets an intermediate container (a Fabric-untracked view inside `FxSurfaceView`); `33`/`34` decide, `structure.{ios,android}` pin, consumers reconciled; device-verified via U4-002 run (2026-06-09); merged on integration/0.1.x; [detail](#u4-001--wrapper-mechanic) |
| U4-002 | Unit 4 | device-verify | merged | yes | — | RT-014 | U4-001 | `mountChildComponentView` override (rule-#7 clean Swift/Kotlin); reimplemented to the `ExpoBlurTargetView`/`expo-glass` templates after a reference fan-out — fixed the Android `LinearLayout`-traversal crash, Android 0×0, iOS spurious default shader, iOS free-running MTKView loop; device-verified iOS + Android (2026-06-09); RT-014 closed; merged on integration/0.1.x; [detail](#u4-002--mountchildcomponentview-override) |
| U5-001 | Unit 5 | implement | merged | yes | RT-013 | RT-013 | U4-001 | `FxLayoutObserver.swift`/`.kt` owned by `FxSurfaceView` — iOS bounds-KVO (the expo-modules-core `UIViewFrameObserver` template; the C++-typed `updateLayoutMetrics` override rejected per rule #7), Android `OnLayoutChangeListener` (decoupled from the no-super `onLayout` override); read points pinned in `structure.{ios,android}.md` §Layout read before code; reads: parent-space frame (captured) + window origin / edge travel / insets (live); headless + xcodebuild + assembleDebug green; **device run 2026-06-11 via agent-device — 5/5 PASS on iOS 26 sim + physical Android (incl. the origin-only event-path captures and the writes-nothing baseline), instrumentation reverted, `evidence/device.md` §Results; device-verified ratified 2026-06-11 (maintainer)**; **RT-013 closed** — `33` questions struck/resolved (strictly `expo-view`, New Arch only) + ledger flipped; reviewed + docs-closed 2026-06-11 ([review](./reviews/U5-001.md)) — [task](./tasks/U5-001/); **merged 2026-06-11 (maintainer)** on integration/0.1.x |
| U6-001 | Unit 6 | implement | merged | yes | RT-007 | RT-007 | U4-001, U5-001 | `FxAnimationDriver.swift`/`.kt` + `FxSpring.swift` owned by `FxSurfaceView`; two review rounds (stale-provenance retarget bug found + fixed, regression-checked on device); **device gate PASS 2026-06-12 via agent-device — POCO F1 / Android 15 API 35 + iPhone 17 Pro sim / iOS 26.5 (fire-once/retarget+second-retarget/tap-at-rest/cancel/reduce-motion; the opposing-inertia clip observed in the handoff logs), maintainer-ratified; instrumentation reverted; [evidence](./tasks/U6-001/evidence/device-run.md)**; RT-007 closed in `34` + ledger; reviewed + docs-closed 2026-06-12 ([review](./reviews/U6-001.md)) — [task](./tasks/U6-001/); **merged 2026-06-12 (maintainer)** on integration/0.1.x; U6-002 owns RT-016's device truth |
| U6-002 | Unit 6 | device-verify | merged | yes | — | RT-016 | U6-001 (merged) | device: animators handle hard retarget, else build integrator; spec'd (planner, 2026-06-12); **matrix run 2026-06-12 — all nine rows PASS on iPhone 17 Pro sim / iOS 26.5 + POCO F1 / Android 15 API 35 (timing sweep, reversal/extension clip-vs-carry, rapid-fire, zero-displacement, after-rest, rotation+combined, mixed-channel, cancel-under-fire, JS silence); stock retarget paths hold, integrator-flip NOT triggered; instrumentation reverted, gates green; [evidence](./tasks/U6-002/evidence/matrix.md)**; device-verified ratified + **RT-016 closed** in `34` + ledger; reviewed + docs-closed 2026-06-12 ([review](./reviews/U6-002.md)) — [task](./tasks/U6-002/); **merged 2026-06-12 (maintainer)** on integration/0.1.x |
| U6-003 | Unit 6 | ratify | merged | no | — | REAL-001 | U6-001 (merged) | **ratified + docs-closed (2026-06-12)** — [task](./tasks/U6-003/): M3 floor pinned in `structure.android.md` § `shape-morph` — `androidx.compose.material3:material3` ≥ `1.4.0` (`MaterialShapes`/`MotionScheme`) over `androidx.graphics:graphics-shapes` ≥ `1.0.0`, **API 23** (Compose-1.8 minSdk bump), detected as an optional peer dependency (`53` d6), never bundled. `os:21`→`os:23` reconciled in `02` + the shipped manifest + `select()` tests; gates green (tsc/build/lint/34 tests). **REAL-001 closed** — fallback half by citation to U6-001/U6-002 stock-`SpringForce` runs (no new device). MOT-002 dropped per DOC-019; reviewed 2026-06-12 (planner, no separate doc — pin + altitude + gates verified); **merged 2026-06-12 (maintainer)** on integration/0.1.x |
| U7-001 | Unit 7 | implement | merged | yes | MOT-001 | — | U6-001, DOC-018 | device: presence FSM + deferred-unmount handshake; **headless-done (agent, 2026-06-12)** — [task](./tasks/U7-001/): the four pieces shipped (`src/motion` builders + wire, `FxPresence` + the pure retention FSM, `FxPresenceCoordinator.{swift,kt}` on the U6-001 driver, the `visible`/`preset`/`motion`/`appear` boundary + `onFxTransitionEnd`→`onTransitionEnd` remap); gates green (tsc/build/lint/`swift:lint`/58 Tier-1 tests; Android `compileDebugKotlin` + iOS `pod install`+`xcodebuild` BUILD SUCCEEDED; example tsc); two review rounds (shipped-comment provenance stripped; `transition` narrowed to the V1-honored `{spring?:'native'}`); **device gate PASS 2026-06-12 via agent-device — all six scenarios on iPhone 17 Pro sim / iOS 26.5 + POCO F1 / Android 15 API 35 (deferred unmount, interrupt-retarget with the `35` ordering question ANSWERED — cut-short `interrupted:true` strictly precedes the retargeted settle, both platforms; appear, tap-at-rest, teardown-during-exit, reduce-motion); [evidence](./tasks/U7-001/evidence/device.md)**; docs-closed (`35` questions struck, `54` status flipped, architecture row reconciled); reviewed 2026-06-12 ([review](./reviews/U7-001.md)) — [task](./tasks/U7-001/); **merged 2026-06-12 (maintainer)** on integration/0.1.x. preflight: [preflight](./tasks/U7-001/preflight.md) |
| U7-002 | Unit 7 | device-verify | merged | yes | — | — (→U7-003) | U7-001 (merged) | device: per-platform preset catalog filled, passes law test; **headless-done (agent, 2026-06-12)** — [task](./tasks/U7-002/): the two bounded carried fixes shipped + the device runbook written. First-mount translate fix (`FxPresenceCoordinator.{swift,kt}` `enterAwaitingLayout` + `handleContentLayout`; `FxSurfaceView.{swift,kt}` `hasResolvedContentSize` + layout hook — holds a fresh enter until layout resolves measured travel, so the first enter slides not just fades; NO `FxAnimationDriver` touched, U6 retarget intact); harness log-key fix + offscreen/eviction affordances (`example/screens/presence.tsx`). Gates green (tsc/build/lint/58 tests/swift:lint; example tsc; Android `compileDebugKotlin` + iOS `xcodebuild`). [`evidence/catalog.md`](./tasks/U7-002/evidence/catalog.md) = the device runbook (catalog law-test, five React-semantics rows, first-mount proof, parity). **Device gate PASS 2026-06-12 — all five parts, both platforms ([evidence](./tasks/U7-002/evidence/catalog.md)):** iOS transient kept-default (law-passing); Android shape confirmed + the ONE law gap found (bouncy default spring vs the non-bouncing snackbar — catalog value `DAMPING_RATIO_NO_BOUNCY` recorded, **re-homed to U7-003**); the five `35` React-semantics rows device-proven; first-mount translate fix validated; values propagated to data-layer/structure.*; reviewed + docs-closed 2026-06-12 ([review](./reviews/U7-002.md)); **merged 2026-06-12 (maintainer)** on integration/0.1.x |
| U7-003 | Unit 7 | implement | merged | yes | — | MOT-001 | U7-002 (merged) | **headless-done (agent, 2026-06-12)** — [task](./tasks/U7-003/): Android transient presence passes `DAMPING_RATIO_NO_BOUNCY` at `STIFFNESS_MEDIUM` from the coordinator into `FxAnimationDriver` per envelope (optional `FxAnimationSpring`, routed via `FxSurfaceView.animateContentTo`); driver no-params default unchanged (explicitly reset per envelope so a presence spring cannot leak); iOS untouched. Gates green (tsc/build/lint/swift:lint/58 tests/`compileDebugKotlin`); reviewed at headless-done (planner, 2026-06-12, gates re-run). **Device gate PASS 2026-06-12 (POCO F1 / A15, gate commit `5069c91`, [evidence](./tasks/U7-003/evidence/device.md)) — all four rows:** no-overshoot proven by per-frame logcat capture (presence envelopes `dampingRatio=1.0`, translation within `[0,176]` across the full log; slowed-scale capture was reviewed out — `dynamicanimation:1.0.0` springs ignore the animator scale); the default-spring positive control validated the probe (~16 % bounce only under `0.5`); retarget regression held (`retarget=true` both directions, `interrupted:true` strictly before the retargeted settle, one completion); reduce-motion single-frame. **MOT-001 CLOSED** — the V1 catalog filled, parity-checked, and shipped; the `sheet`/`modal` rider re-homed to DEF-018; `data-layer` + `structure.android` markers flipped to verified; reviewed + docs-closed 2026-06-12 ([review](./reviews/U7-003.md)); **merged 2026-06-12 (maintainer)** on integration/0.1.x. **Unit 7 fully closed** |
| U8-001 | Unit 8 | implement | merged | yes | RT-005 | RT-006 | U1-002, U3-001, DOC-011 | **headless-done (agent, 2026-06-12)** — [task](./tasks/U8-001/): `FxPressHandler.{swift,kt}` ships behind `interactionMode` passive/active; slop self-failure, handler-owned long-press timers, `onShaderLongPress`, native UV uniform writes, and Android invalidate-on-write AGSL rendering are wired. Current SDF behavior uses the `32` full-bounds fallback because shipped shaders have no separate shape description. Gates green (`bun install`; packages `tsc`/build/lint/`swift:lint`/58 tests; Android `:react-native-fx:compileDebugKotlin`; iOS `pod install` + example `xcodebuild`). Device handoff: [`evidence/headless.md`](./tasks/U8-001/evidence/headless.md). Device gate still owns RT-006 tuning/cost closure; the full coexistence matrix stays U8-002. **Device gate run 2026-06-12 (gate `e2ec3dd`): PARTIAL — 5/6 rows PASS both platforms; Row 4 `none`-mode pass-through FAIL both ([evidence](./tasks/U8-001/evidence/device.md)). Round-3 fix (agent, 2026-06-13, [notes](./tasks/U8-001/notes.md) round-3 log): iOS `none` pass-through fixed (intermediate container added to the bare-surface hit set); Android press-event coords converted px→dp; iOS Android-parity pass-through (`ReactPointerEventsView`) BLOCKED — the interface does not resolve on the library compile classpath (`react-android` not transitively present via `expo-modules-core`), reverted unshipped, STOP-flagged. All headless gates re-green (packages tsc/build/lint/swift:lint/58 tests; `compileDebugKotlin`; iOS `xcodebuild` iPhone 17 Pro). **Android pass-through decided (planner, 2026-06-13): REAL-005 Option A** — implement `ReactPointerEventsView` (`BOX_NONE`/`AUTO`) via `compileOnly` `react-android` (the Android-native peer of the iOS `hitTest` fix; rule #7 clean — view-system participation, not the JS↔native boundary). iOS `none` pass-through + the px→dp event-coord fix reviewed-green and checkpointed; the Android lever + the bounded Row-4 re-gate are the remaining work (re-gate device-proves Fabric consults `getPointerEvents()` on the `ExpoView`).** **Round-4 (agent, 2026-06-13, [notes](./tasks/U8-001/notes.md) round-4 log): Android `none`-mode pass-through now SHIPS (compile-proven, awaiting device proof).** Added `compileOnly 'com.facebook.react:react-android'` to `packages/android/build.gradle` (the round-3 classpath blocker), and `FxSurfaceView` implements `ReactPointerEventsView` — `appliedPointerEvents` finalized in `applyResolvedConfig` (`AUTO` for passive/active, `BOX_NONE` otherwise), the `pointerEvents` override returns it, never per-event. iOS + the press FSM untouched. Gates re-green (packages tsc/build/lint/swift:lint/58 tests); `:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL (executed, resolves `ReactPointerEventsView`/`PointerEvents` — the `compileOnly` coupling holds) and `:app:assembleDebug` BUILD SUCCESSFUL (no duplicate-class/runtime-missing — host provides `react-android`, fx bundled no copy). `structure.android.md` §Touch contract build-coupling note flipped planned→shipped. **Row-4 re-gate run 2026-06-13 (gate `8894cfe`): iOS Row 4 PASS both 4a/4b (the iOS `hitTest` fix + px→dp now device-proven); Android 4a FAIL, 4b inconclusive; px→dp PASS (Android now emits ~dp); rows 1–3 AUTO-path smoke PASS ([evidence](./tasks/U8-001/evidence/device-regate.md)).** **Root cause corrected (planner, 2026-06-13) from the running RN 0.85.3 `TouchTargetHelper.kt` (`example/node_modules`): REAL-005 Option A is NOT falsified — `:320` consults `getPointerEvents()` on any `ReactPointerEventsView`, so `FxSurfaceView`'s `BOX_NONE` is honored. The Android 4a FAIL is child-occlusion: the AGSL `FxSurfaceShaderView` and the `intermediateContainer` are full-bounds `AUTO` children that `BOX_NONE` descends into and returns as `SELF` targets (`:388-410`), remapping to the surface tag and swallowing the bare tap (same mechanism as the 4b confound). iOS passed because its `hitTest` excludes `metalView` + `intermediateContainer`.** **Round-5 specced (planner, 2026-06-13): mark the two non-content children — `FxSurfaceShaderView` → `ReactPointerEventsView` `NONE`; `intermediateContainer` → `ReactPointerEventsView` `BOX_NONE` — the Android analogue of the iOS exclusion. Keeps Option A; the JS-`pointerEvents` fallback is retired (it never touches the children, would fail identically).** Stays `device-pending`: the round-5 fix + the Row-4 re-re-gate (4a/4b both platforms — 4b now testable under a shader) is owed. REAL-005/RT-006 not closed. **Round-5 (agent, 2026-06-13, [notes](./tasks/U8-001/notes.md) round-5 log): the child-occlusion fix SHIPS (compile/assemble-proven, awaiting device proof).** `FxSurfaceShaderView` implements `ReactPointerEventsView` → `NONE` (decorative never-target); `intermediateContainer` is now `FxPassthroughContainer` (private `FrameLayout` subclass) → `ReactPointerEventsView` `BOX_NONE` (children targetable, itself never a `SELF` target) — the Android analogue of the iOS `hitTest` exclusion of `metalView` + `intermediateContainer`. `FxSurfaceView`'s own `BOX_NONE`/`AUTO` surface lever, the press FSM, and iOS untouched. Gates re-green (packages tsc/build/lint/swift:lint/58 tests); `:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL (executed, resolves the interface on both children) and `:app:assembleDebug` BUILD SUCCESSFUL. Reviewed clean (planner, gates re-run). **Row-4 RE-RE-GATE PASS both platforms 2026-06-13 (gate `9497631`, maintainer-ratified — [evidence](./tasks/U8-001/evidence/device-regate.md) round-5 section):** Android 4a bare tap reaches the behind-`Pressable` (`#1 behind`, no `onShader*` — was the swallow), 4b inside child tappable under a live shader (`#0 inside`), px→dp confirmed (`{120,120}` dp), rows 1–3 AUTO-path smoke unregressed; iOS 4a/4b re-confirmed. **Root-cause correction device-proven: Fabric honored `BOX_NONE` all along; the swallow was the two unmarked full-bounds children.** **Closure (planner, 2026-06-13):** **RT-006 closed** (cost device-proven; feather/threshold re-homed to **DEF-019**, trigger: first shaped shader — V1 is full-bounds, no SDF edge); **REAL-005 resolved** (Option A device-proven both platforms, mechanism citation-grounded at `TouchTargetHelper.kt:320/:339/:355/:388`); `40` `onLongPress` row flipped to wired; `32` cost question resolved + feather deferred; reviewed ([review](./reviews/U8-001.md)); **device-verified + reviewed + docs-closed 2026-06-13; merged 2026-06-13 (maintainer)** on integration/0.1.x. **Unit 8 recognizer (U8-001) closed.** **U8-002** (the full RNGH/`@gorhom` coexistence matrix, closes RT-001) is now unblocked. |
| U8-002 | Unit 8 | device-verify | merged | yes | — | RT-001 | — | **MERGED 2026-06-13 (maintainer) on integration/0.1.x as `9a874ea` (the finishing landing — harness + RT-001 close). RT-001 CLOSED with documented waivers (maintainer-decided); device-verified + reviewed + docs-closed.** Every distinct mechanism device-proven across both platforms; RT-001 resolved in `30` §Resolved + the ledger; nesting policy ratified in `30` Decision 6. Reviewed: [`reviews/U8-002.md`](./reviews/U8-002.md). **Android matrix RAN 2026-06-13 after the U8-003 fix — 9 PASS / 3 needs-manual / 1 inconclusive (POCO F1 / API 35; [evidence](./tasks/U8-002/evidence/device.md)).** Cancel path device-proven on Android across **three** independent ancestors — 1b (inner scroll), 1d (outer scroll), **3a (`@gorhom` RNGH-pan — the `30` "hard case")** — each `PressIn`/`PressOut`, no `Press`, ancestor visibly moving; taps 1a/2a/3b/4-tap clean `Press`; 5/6 silent. needs-manual (gesture-fidelity, not faked): 1c (longpress hold-still), 2b (pager claims before PressIn registers), 4 (`rngh-pan ACTIVATED` drops under frame loss — mechanism already proven by 3a). row 7 (nesting) ROOT-CAUSED 2026-06-13 (API-33 re-observe with inner=`dots`): a shader-bearing surface nested inside another is **occluded + touch-shadowed by the outer** — FxSurfaceView composites its shader view above its content container, so the outer's `aurora` paints over the inner (which renders bands, no `dots` grid) and the outer's recognizer claims the touch (`nested·OUTER` logs; `nested·INNER` never does). Consistent with `30` Decision 6 (the surface is ONE interactive unit); the nesting policy is now decidable from this (planner to ratify into `30`: outer claims; shader-in-shader is not a V1 composition pattern — use layered composition). **Still owed for RT-001:** maintainer ratification of U8-003 (API-33 crash proof obtained); the nesting-policy ratification; the 3 Android hand-rows + iOS remainder (physical iPhone) — all mechanism-redundant with already-proven rows (maintainer's close-bar call). RT-001 open. **headless-done (agent, 2026-06-13)** — [task](./tasks/U8-002/): the example coexistence harness ships ([`coexistence.tsx`](../../example/screens/coexistence.tsx)) — an `active`/`passive`/`controlled` `FxSurfaceView` in each matrix container (native ScrollView, pager-view, `@gorhom/bottom-sheet`, RNGH `GestureDetector(Pan)`, nested), a fixed timestamped semantic-press log as the runbook surface. Four gesture peers added to `example/` only (gesture-handler 2.31.2, reanimated 4.3.1, worklets 0.8.3, pager-view 8.0.1, `@gorhom/bottom-sheet` 5.2.14, SDK-56 pins); root `GestureHandlerRootView` + worklets Babel plugin wired; `packages/` RNGH-free (rule #7). Gates green (example `tsc`; packages `tsc`/build/lint/`swift:lint`; `git status` clean under `packages/`). Device handoff: [`evidence/headless.md`](./tasks/U8-002/evidence/headless.md). The recognizer is frozen — observed, not changed. **Device run 2026-06-13 (agent-device, iPhone 17 Pro sim / iOS 26 + physical POCO F1 / API 33): PARTIAL — Android HARD-BLOCKED, iOS partial ([evidence](./tasks/U8-002/evidence/device.md)).** Android: the coexistence screen SIGABRTs on mount (5/5) — a native AGSL exception-probe fault in `FxSurfaceShaderView.probeInteractiveUniforms` on API 33, not a harness/peer fault; flagged as a U8-001 rework, freeze honored (`packages/` clean). iOS: cancel path DEMONSTRATED on two ancestors (1b native-scroll cancel, 2b pager cancel) + 1a/2a tap→Press + 5/6 passive/controlled silent — all PASS from the semantic log; remaining iOS rows (1c/1d/3/4/7) need a physical iPhone (the curated stitchable shaders don't render on the sim — surfaces interactive-but-invisible, blocking visual-targeting + the nesting observation). **Blocked on [U8-003](./tasks/U8-003/)** (the Android probe fix); the Android matrix re-runs after it, the iOS remainder needs a physical iPhone. RT-001 stays open. |
| U8-003 | Unit 8 | rework | merged | yes | — | — (unblocks RT-001 via U8-002) | — | **MERGED 2026-06-13 (maintainer) on integration/0.1.x as `f9af1bc` (the finishing landing — the source-declaration probe fix). device-verified + reviewed + docs-closed 2026-06-13.** Reviewed: [`reviews/U8-003.md`](./reviews/U8-003.md). **API-33 crash proof OBTAINED 2026-06-13 (AVD, repro-validated).** Second device run on an android-33 AVD (`fx_api33`, Android 13; arm64 on Apple-silicon host — both binding constraints, API 33 + hardware GPU/AGSL, met). **Repro validated:** reverted the fix (`git stash`, old probe confirmed back) → coexistence SIGABRTs on mount with the EXACT tombstone (`unable to find uniform named <garbage>` → `ThrowIAEFmt` → `NewStringUTF` → `CheckJNI JniAbort` → signal 6; `api33-crash-logcat.txt`), confirming the AVD is a faithful repro. **Fix proven:** restored (`git stash pop`, hard-verified present) → mount **5/5 crash-free on API 33** (pid stable, 0 abort matches; `api33-mount-fix-logcat.txt`). The tombstone byte-dump confirms the corrupt bytes are AGSL's own (clean `"unable to find uniform named "` prefix + appended garbage), not a name fx passes. Plus API-35 regression-safe from the prior run. **Residual (minor):** the `dots`-active VISIBLE write bulge can't be observed — the only `dots` surface is the nested inner, which is occluded by the outer's shader (see U8-002 row 7); the write path is proven device-SAFE (mounts + writes crash-free), only the visible confirmation is blocked. [evidence](./tasks/U8-003/evidence/device.md). **headless-done (agent, 2026-06-13)** — [task](./tasks/U8-003/): fixed the Android interactive-uniform probe surfaced by U8-002's device crash. The unsafe exception-probe (`FxSurfaceShaderView.probeInteractiveUniforms` called `setFloatUniform` for an absent uniform inside a try/catch on `IllegalArgumentException`; on `aurora` the API-33 native error path corrupts → `NewStringUTF` CheckJNI abort → SIGABRT) is replaced by `scanInteractiveUniforms` — a source-declaration scan of the in-hand AGSL text (`\buniform\s+\w+\s+<name>\b`, word-boundary-guarded so an in-body mention like `dots`'s local `touchPoint` does not read as a `touch` declaration). The `supportsFloatUniform` extension + the `IllegalArgumentException` import are deleted. One file (`FxSurfaceShaderView.kt`); `onDraw`/loop/consumers + `setShaderId`'s structure unchanged; iOS + the press FSM untouched. Scan result (read from fixtures): `aurora` → both flags false, `dots` → both true. Gates green: packages `tsc`/build/lint (27 files)/`swift:lint`/58 tests + (from `example/android`) `./gradlew :react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL (recompiled). No-probe mechanic pinned in `structure.android.md` §`shader`. Device handoff [`evidence/device.md`](./tasks/U8-003/evidence/device.md): coexistence mount crash-free + interactive-write regression on **API 33 AND API 35**. RT-001 still closes at U8-002, not here. _(spec'd planner, 2026-06-13: maintainer-chosen source-declaration scan; no ledger row.)_ |
| U9-001 | Unit 9 | ratify | merged | no | — | RT-008 | U6-001, U7-001 | **merged 2026-06-13 (maintainer — V1-cut closeout): `835d546`.** **ratified (planner, 2026-06-13).** Scope reframed from "build `Fx*` SharedObjects" to a V1 ratification: V1 exposes no JS-held handle, so a `SharedObject` has no consumer — the object graph stays three plain `internal` native classes (`FxAnimationDriver`/`FxPresenceCoordinator`/`FxLayoutObserver`) + the recognizer, rendering inline in the views. **RT-008 closed** in `36` §Resolved questions (one driver/two families; per-view clocks; `FxEffectRenderer` object + the SharedObject layer deferred to **DEF-020**). No code, no device gate. Awaiting maintainer's `merged` tick |
| U9-002 | Unit 9 | ratify | merged | no | — | SPINE-009 | U4-001, U5-001, U7-001 | **merged 2026-06-13 (maintainer — V1-cut closeout): `835d546`.** **ratified (planner, 2026-06-13).** Reframed from a new device gate to a **device-proven-by-citation** close: **SPINE-009 closed** — the no-Nitro bet's falsification test passes on hardware across the maintainer-ratified U5–U8 gates (native layout read U5-001; identity-stable driver/coordinator/recognizer U6/U7/U8). `05` falsification open question flipped to device-proven; `SPINE-010` not triggered. No separate gate needed. Awaiting maintainer's `merged` tick |

### Deferred — V2 / trigger-gated, not actionable now

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| DEF-001 | 0-spine | ratify | blocked | no | — | SPINE-008 | trigger: BYO/novel demand | the build-time shader/effect emitter |
| DEF-002 | 0-spine | ratify | blocked | no | — | SPINE-010 | trigger: per-child control | reconsider Nitro / raw Fabric |
| DEF-003 | 1-surface | ratify | merged | no | — | SURF-007 | — | **MERGED on integration/0.1.x (this commit). Ratified Option A (maintainer, 2026-06-14): no fx portal primitive — placement stays the app's job (root-level / the app's portal / RN `Modal`); rules #5/#9 + `54` Decision 4.** fx guarantees portal/`Modal` *coexistence* instead, under the **coordinator-placement invariant** (portal the rendered output, never the `FxPresence` coordinator — same failure mode as the `42` scope ceiling). **SURF-007 resolved.** Docs-closed (planner, 2026-06-14): `54` (new § Placement & portal coexistence + Decision 4 + open question), `42` (scope-ceiling cross-ref), ledger SURF-007 `deferred`→`resolved`. Reviewed — no separate doc (DOC-002/003/005 ratify convention). No code, no device gate. **Fully closed.** [task](./tasks/DEF-003/) |
| DEF-004 | 1-surface | ratify | merged | no | — | SURF-008 | — | **MERGED on integration/0.1.x (this commit). Ratified (maintainer, 2026-06-14): REJECTED — no `Fx.Stack`/`Fx.Layer`/JSX compound. The `fx.effect.*` builder *is* the stack API.** Reframed from `implement` to a ratify-reject: binding to the contract showed the build would overturn `50` Decision 4 (config-children must be props — an `EffectStack` composites in one `<Fx>` surface, one bridge crossing) and `55` Decision 6 (no separate `FxLayer`); consistent with `Fx.Scroll`'s data-not-children precedent (DEF-014). **SURF-008 resolved (rejected).** Docs-closed (planner, 2026-06-14): `55` Decision 8 + open question resolved; ledger SURF-008 `deferred`→`resolved`. No code. Reviewed — no separate doc. **Fully closed.** [task](./tasks/DEF-004/) |
| DEF-005 | 3-motion | ratify | merged | no | — | MOT-004 | — | **MERGED on integration/0.1.x (this commit). Ratified (maintainer, 2026-06-14): REJECTED — no top-level `edge`/`origin` sugar. `FxPresence` keeps the binary: `preset` (full platform-native shape+timing) or an explicit `motion` map (cross-platform shape override, platform timing preserved unless `transition` overrides).** Rejected because it blurs the shape-native law, duplicates the `motion` map (which already gives "platform timing + chosen edge"), and conflicts with no-implicit-reverse. **MOT-004 resolved.** Docs-closed (planner, 2026-06-14): `41` Decision 14 + open question (recipe pinned), `54` (motion-map note), `50` (prop-row cross-ref), ledger MOT-004 `deferred`→`resolved`. No code. Reviewed — no separate doc. **Fully closed.** [task](./tasks/DEF-005/) |
| DEF-006 | 3-motion | implement | blocked | yes | — | MOT-007 | post-V1 | Reanimated UI-thread channel (regime C) |
| DEF-007 | 3-motion | ratify | merged | no | — | MOT-008 | — | **MERGED on integration/0.1.x (this commit). Ratified (maintainer, 2026-06-14): RESOLVED BY COMPOSITION — the premise is false.** fx hardcodes no shader-internal intro/outro envelope for curated effects either (curated = native `time` + eased `intensity`; appear/disappear = the `FxPresence` wrapper envelope). BYO reaches full parity by construction via the same three channels: `FxPresence` whole-surface lifecycle, native `time` in-shader, and semantic uniforms eased by `transition` / re-fired by `triggerKey`. **No BYO envelope mechanism, no reserved lifecycle uniform — and not deferred-until-demand** (a reserved uniform would be a new feature that must apply to curated too). **MOT-008 resolved.** Docs-closed (planner, 2026-06-14): `40` + `34` open questions struck (three-channel contract), `22` runtime-behavior note, ledger MOT-008 `open`→`resolved`. No code. Reviewed — no separate doc. **Fully closed.** [task](./tasks/DEF-007/) |
| DEF-008 | 2-effects | implement | merged | yes | — | FX-007 | — (V2 active) | **MERGED on integration/0.1.x (this commit). FX-007 closed.** **DEVICE GATE PASS — all 6 rows, both platforms (iPhone 17 Pro sim / iOS 26.5 + POCO F1 / API 35, 2026-06-14).** app-pulse compiles+renders animated/intensity-reactive; app-broken → onFxError no crash; cache no-recompile confirmed (iOS process-wide pipeline cache; Android per-view RuntimeShader); app-ios-only renders iOS / silent {via:'none'} Android; iOS lowers through FxSurfaceView (expo-view) per the spike; curated unregressed. Evidence in `evidence/device.md`. **RECOVERY (planner, 2026-06-14):** the device-gate agent accidentally `git checkout`-reverted the uncommitted DEF-008 work in `FxSurfaceView.swift` + `FxSurfaceShaderView.kt` while undoing instrumentation; git could not recover (never staged). Restored **verbatim from the review diffs** (diffstat re-matched 79/61 exactly) — gates re-green incl. iOS `xcodebuild` + Android `compileDebugKotlin`. **REVIEW REFINEMENT (planner, 2026-06-14, maintainer-flagged):** renamed `pipeline→curatedPipeline`, `resolvedPipeline→pipeline` (the name was hiding a runtime-compile side effect) + added a native curated-id stop (an iOS `curatedShaderIds` mirror, matching Android) so "curated ids win" is native-enforced, not JS-dependent — *behavior-preserving* (a curated id with a registered source is JS-impossible). Re-gated: tsc/lint/swift:lint/72 tests + iOS xcodebuild BUILD SUCCEEDED. **Next: docs-closed (FX-007 in `22` + ledger; cache-divergence note) then merge.** **Headless review PASS (planner, 2026-06-14).** Gates re-run independently (tsc/lint/swift:lint/72 tests); surface contract fully implemented + tested (8 registry tests); spike accepted as headless-definitive; rules #1/#2/#5/#7 gated; comments provenance-clean; the generalized `scanUniforms` (guards time/resolution/intensity) is a correct API-33-abort defense. **For docs-closed (planner):** the "cache by source" contract is iOS-satisfied (immutable `MTLRenderPipelineState`, process-wide); on Android a compiled `RuntimeShader` is *mutable* (holds per-view uniform state) so it cannot be shared across surfaces — per-view construction is the necessary platform divergence, to be noted in `22`, not a defect. No executor fixes owed. **headless-done (agent, 2026-06-14).** **Spike resolved → NO:** SwiftUI `.colorEffect` cannot consume a runtime `MTLLibrary` (no public `ShaderLibrary` init over `MTLLibrary`/`MTLFunction`/MSL source, iOS 26.5 SDK), so runtime shaders lower through the **expo-view Metal path even for decorative use** (recorded in `structure.ios.md` § shader). Shipped: JS `registerShader` + registry (collision→curated wins, both-absent reject, idempotent/clean-replacement re-registration, pair-rule null-push) + types + index export; iOS `FxShaderRegistry` + `FxModule.registerShader` + `FxSurfaceView` runtime compile via `makeLibrary(source:)` (fixed `fx_fragment` ABI + prepended preamble, cache by source string); Android `FxShaderRegistry` + `FxModule.registerShader` + `FxSurfaceShaderView`/`FxSurfaceView` AGSL-from-registry (guarded uniform writes incl. time/resolution/intensity, malformed→catch→GONE), registry-aware load/error dispatch; example DEF-008 demo (`runtime-shader.tsx`: working/malformed/iOS-only). Gates green: packages tsc/build/lint/swift:lint/72 tests (8 new registry Tier-1); example tsc; iOS `pod install`+`xcodebuild` **BUILD SUCCEEDED**; Android `:react-native-fx:compileDebugKotlin` **BUILD SUCCESSFUL**. Device gate (6-row runbook in `evidence/device.md`) owns FX-007 closure. Original spec ↓ — Registry-sourced runtime shader compilation — `registerShader({ id, uniforms, source: { ios, android } })` compiles at runtime; `<Fx effect="id" />` stays the only consumption surface (Option A, maintainer-confirmed; no `<Fx source>` prop). The DX win: app-side BYO with no build-path placement and no config plugin (lifts the `22` D6 V1 constraint). **iOS hosted path is a SPIKE-first gate:** no public `ShaderLibrary(source:)` (iOS 26.5 SDK) — `makeLibrary(source:)` serves the expo-view raster path; the spike decides whether SwiftUI `.colorEffect` can consume a runtime `MTLLibrary` (if not, runtime shaders lower through expo-view even for decorative use). Android already runtime-compiles `RuntimeShader` (small delta: accept AGSL from JS). Pinned: dual MSL+AGSL still required (single-source = DEF-001), curated ids win on collision, missing-platform → `{via:'none'}`, compile failure → `onFxError`, cache by `(platform, sourceHash, fn, opts)` not id, explicit re-registration/invalidation rule. No preflight (first-party APIs). Mechanic framework pinned in `structure.{ios,android}` § shader. [task](./tasks/DEF-008/) |
| DEF-009 | 2-effects | implement | merged | yes | — | FX-008 | — (V2 active) | **MERGED on integration/0.1.x (human-delegated tick, 2026-06-15; finishing commits already in — `ee69c1a` + the asset refactor `5ef3fc7`/`9ba02b1`/`090f737`). FX-008 closed.** Asset re-gate fully closed: **headless** — fresh `:react-native-fx:compileDebugKotlin --rerun-tasks` (393 executed) + `:app:assembleDebug` SUCCESSFUL, `unzip -l` confirms `assets/shaders/content_ripple.agsl` (552 B) INSIDE the built APK beside the 10 device-proven siblings (this build also recompiled the post-DEF-009 Android review-fix commits `5c32983`/`57bc2dc` green); **device R1 PASS (run 3)** — heading + both buttons visibly warped on first render from the bundled asset (default `rippling=true`, no toggle), warp phase shifts between frames confirming the loop runs, ~59.9 fps, planner-eyeballed (`evidence/device-run3.md`). Prior 7/7 (inline build) + run-3 R1 (asset build) = asset-load path device-proven; FX-008 already RESOLVED in the ledger + docs-closed. ↓ prior trail — **ASSET RE-GATE HEADLESS PASS + 7/7 device on the inline build (`495fbe5`).** ↓ further trail — **DOCS-CLOSED + 7/7 device-verified ON THE INLINE BUILD (`495fbe5`).** **Post-device housekeeping (maintainer, `FxContentDistortion.kt` + new untracked `assets/shaders/content_ripple.agsl`, ~08:50, AFTER the 08:38 run-2 APK):** the ripple sampler moved out of the inline Kotlin const into the private AGSL asset, loaded via `AssetManager` — aligns with the sibling `FxSurfaceShaderView`/`FxShaderView` curated-asset idiom (idiomatic, good), null-on-missing-source no-op guard. BUT built/verified state is the inline const; the asset-load path is **device-unverified** (new failure mode: if the asset does not merge into the APK, `ensureShader()→false` and the ripple silently no-ops) and the note's Housekeeping section carries no re-gate line. **NEXT: re-run headless (`:react-native-fx:compileDebugKotlin --rerun-tasks` + `:app:assembleDebug`, confirm `content_ripple.agsl` lands in the APK assets) + a bounded device re-confirm (R1 first-render ripple still renders from the bundled asset) → then ready-to-merge.** ↓ **Device RE-GATE (run 2, POCO F1 / API 35, fresh `:app:assembleDebug` from `495fbe5`, APK `08:38:24` verified newer): 3/3 PASS** — R1 first-render ripple (default `rippling=true`, no toggle), R2 navigate-away→back animates again, R3 background-pause resume; the loop-start fix proven, other rows unaffected → run-1 6/7 + run-2 3/3 = **7/7 overall** (`evidence/device-run2.md` + `run2/`). **DOCS-CLOSED (FX-008):** `02 §content-distort` prose flipped (was "merely planned on Android"); `23 §Open questions` resolved (the content-filter wrapper ships); `data-layer.md` I5 reconciled + the Android rung's stale `status:'planned'` removed to match `02`; loop-start (container's-own-attach) + per-frame-refresh mechanic pinned in `structure.android.md §content-distort`; ledger FX-008 `deferred`→`resolved`; `reviews/DEF-009.md` written. Stray `react-native-gesture-handler` dep bump the gate agent left was reverted (tree clean). ↓ prior trail — **DEVICE RE-GATE (pre-run-2) after a device-found defect + fix (2026-06-15).** **Device gate run 1 (POCO F1 / API 35, build `a89d2fb`): PARTIAL — 6/7 PASS, one blocking defect.** PASS: live child touch-through (the load-bearing draw-time-survives claim — Increment/Second both fired through the active ripple), intensity-tracks-live, background/detach pause (rule #1, logcat-proven stopLoop + 5 s silence + resume), pre-33 (code-reasoned residual — no sub-33 host; the `SDK_INT < TIRAMISU` early-return precedes any RuntimeShader/RenderEffect ref), iOS no-op; distortion + animation PASS *when the loop is active*. Perf note: the conservative per-frame `setRenderEffect` ran ~60 fps on one surface — keep it, no motivation for `invalidate()`-alone. **BLOCKING DEFECT (device-root-caused): the ripple never started on first mount or after navigate-back** — `startLoop()` was gated on the content container's attach state, but the parent `FxNativeView.onAttachedToWindow → resume()` fires *before* the child container attaches (ViewGroup dispatches the parent's onAttachedToWindow ahead of child attach), so resume saw `attached=false` and bailed with no retry; background→foreground worked only because the view stays attached. **FIX (rework, 2026-06-15, `FxContentDistortion.kt` only, +19): the helper registers a `View.OnAttachStateChangeListener` on the content container** — `onViewAttachedToWindow → startLoop()` if enabled, `onViewDetachedFromWindow → stopLoop()` — the correct attach timing, mirroring how the sibling `FxSurfaceShaderView` (a View) self-manages; `update()/pause()/resume()` untouched (isLooping/stopLoop keep it idempotent); inert below API 33 (isEnabled never flips). Planner-reviewed clean + re-gated green (lint 36 / tsc / 73 tests / swift:lint / forced `compileDebugKotlin --rerun-tasks` 58 executed). Committed pre-re-gate (DEF-008 wipe lesson). **Next: bounded device RE-GATE** — (1) ripple distorts on FIRST render (`rippling=true` default, no toggle), (2) animates again after navigate-away→back, (3) re-confirm background-pause unaffected; other rows already proven → docs-closed (FX-008 in `02` prose + `23` open question + `data-layer` + ledger). ↓ run-1 trail — **headless-done + planner-reviewed clean; committed pre-device (2026-06-14).** Reviewed independently (full diff + all gates re-run by planner, incl. a forced `:react-native-fx:compileDebugKotlin --rerun-tasks` = 58 executed, not cached; iOS `xcodebuild` BUILD SUCCEEDED): surface contract honored exactly (mechanical `contentDistortion='ripple'`, not the public surface; iOS no-op; private AGSL asset not a `ShaderId`; manifest flip + rewritten `select()` preserving planned-skip coverage; genuine in-surface-tappable proof screen), rule #4 clean (RenderEffect on the EXISTING container — children never reparented). **Two-finding fix-round applied + re-reviewed:** (1) rule #1 — `FxSurfaceView.onWindowFocusChanged` added so the continuous content-distort loop pauses when backgrounded-but-attached (was attach/detach-only; sibling `FxSurfaceShaderView` self-manages focus); (2) provenance — stripped a `DEF-009` ledger id from a `content-distort.tsx` code comment, moved it to an on-screen `<Text>` label per the sibling example-screen idiom. Re-gated green. **Committed before the device gate** (the DEF-008 git-checkout-wipe lesson). **Next: Android device gate** (visible distortion + live child touch + animation + off-window pause + pre-33 normal + iOS no-op) → docs-closed (FX-008 in `02`/`23`, data-layer, ledger). Original headless-done log ↓ — **headless-done (executor, 2026-06-14).** Built the full 6-step scope. New `FxContentDistortion.kt` (private `content_ripple.agsl` sampler asset, `RenderEffect.createRuntimeShaderEffect(shader, "content")` on `intermediateContainer`, Choreographer `time` loop, `declaresUniform` guarded writes, `>= TIRAMISU` gate, pause/resume hooked into the presentation loop); `FxSurfaceView.kt` prop+setter+update wiring; `contentDistortion` Prop on Android (wired) + iOS (empty no-op); JS `contentDistortion?: 'ripple'` with `?? ''` clear-coercion; Android `content-distort` rung flipped `planned`→selectable in `02` worked-example + `manifest.ts`; `select()` conformance updated (Android resolves at os33 / none below 33 / iOS none); `content-distort.tsx` example screen (ripple toggle + intensity + two in-surface tappable counters) registered. **Gates green:** packages lint/tsc/build/swift:lint + 73 tests; Android `:react-native-fx:compileDebugKotlin` + `:app:assembleDebug` BUILD SUCCESSFUL; iOS `pod install` + `xcodebuild` BUILD SUCCEEDED; example tsc. Unverified claims + the one framework unknown (per-frame `setRenderEffect` re-call vs `invalidate()`) in `tasks/DEF-009/notes.md`. **Next: Android device gate** (visible distortion + live child touch + animation + off-window pause + pre-33 normal + iOS no-op) → docs-closed (FX-008 in `02`/`23`, data-layer, ledger). Original spec ↓ — **spec'd (planner, 2026-06-14)** — [task](./tasks/DEF-009/). Android content-distort wrapper, **one curated `ripple` demonstrator**: an AGSL sampler (`uniform shader content;`) applied to `FxSurfaceView`'s existing content container via `RenderEffect.createRuntimeShaderEffect(shader, "content")` — draw-time, so live RN children stay touchable (the rule-#4 inverse of iOS, which stays out-of-scope/no-op). API 33+; below 33 content renders normally (`{via:'none'}`). Mechanical native prop `contentDistortion='ripple'` (NOT the long-term public surface; high-level sugar deferred). Mechanic pinned in `structure.android.md § content-distort`. Device proof = visible distortion + live child touch + animated + loop pauses off-window. No spike/preflight (first-party APIs, in-repo `FxSurfaceShaderView` precedent). Next: executor build → device gate → docs-closed (FX-008 in `02`/`23`). |
| DEF-010 | 4-runtime | doc-cleanup | merged | no | RT-001 | — | — | **MERGED on integration/0.1.x (human-delegated tick, 2026-06-15).** stale duplicate retired: `@gorhom/bottom-sheet` coexistence was the RT-001 hard case and closed by U8-002; RT-002 stays with DEF-011's drag/tilt controlled-mode path |
| DEF-011 | 4-runtime | implement | blocked | yes | — | RT-002 | DEF-006 (re-sequenced 2026-06-15) | drag/tilt (G3) axis-aware claiming. **Closes RT-002.** DEF-020 (the `controlled` write path) is merged; **re-sequenced to land AFTER DEF-006** (maintainer-accepted 2026-06-15): drag/tilt's payoff is continuous finger-following = regime C, which needs the DEF-006 UI-thread channel. A discrete-only DEF-011 is scaffolding that closes the row on paper but defers the useful behavior and forces two passes over the same surface — so it is **NOT specced yet**. **Scoping decisions banked (2026-06-15, honor when speccing):** (1) RNGH stays **documented-only / example-only** — no RNGH coupling in `packages/` by default (the U8-002 disposition holds); add a smallest `compileOnly`-style coupling only if a real API requires it, as a separate rule-#7 call. (2) **Tilt = pointer-derived**; device sensors (gyro / CoreMotion / `SensorManager`) are a different native-source family (permission/lifecycle/calibration) and a separate task if ever wanted. Spec DEF-011 (axis-aware claiming + a drag/tilt demo over the DEF-006 channel) once DEF-006 lands. |
| DEF-012 | 4-runtime | ratify | blocked | no | — | — | trigger: declarative-state demand (V2) | generalize beyond presence to declarative state. RT-012 was resolved V1-presence-specific in the closeout (DOC-022, 2026-06-13); this spawns a fresh ledger row when the trigger fires (the RT-006→DEF-019 pattern) |
| DEF-013 | 6-ship | implement | blocked | no | — | SHIP-004 | trigger: V2 native mod | config plugin |
| DEF-014 | 3-motion | implement | merged | yes | — | — | — (trigger "V1 shipped" fired 2026-06-14) | **THE V2 OPENER — MERGED on integration/0.1.x (this commit). device-verified (maintainer-ratified — physical confirmed, 2026-06-14; formal hold waived) + reviewed + docs-closed (planner, 2026-06-14).** critique F7 (maintainer-accepted 2026-06-10): the iOS-hosted `source` rung — scroll-linked presentation, the category's demand center. Scoped to the **render-server hosted lane only** (fx-owned SwiftUI `ScrollView` + per-item `.scrollTransition`, `requires {os:17, substrate:hosted}`, `target:'effect'`, drives fx's OWN content per rule #4); the ambient-RN-scroll best-effort tier and Android are deferred (each its own later rung). Shipped: the `source` driver node in the manifest (iOS rung os17/hosted/effect; Android empty ladder; +6 conformance/select tests), the JS surface (`fx.source.scroll`, the provisional `Fx.Scroll` hosted context + native binding with Android/web static fallbacks), the iOS native realization (`FxScrollView` persistent `UIHostingController` + `FxScrollRootView` `ScrollView`/`.scrollTransition`), and the example demo (`source-scroll` screen + registration). Headless green (tsc/build/lint/swift:lint/64 tests; iOS `pod install` + example `xcodebuild` BUILD SUCCEEDED; example tsc; Android `compileDebugKotlin` unaffected — no Kotlin changed). **Headless review round clean (planner, 2026-06-14):** gates re-run independently; 2 findings fixed — stripped 5 `(rule #N)` provenance tags (`commented` gate) and dropped the dead `onFxLoad`/`onFxError` from `FxScrollView`; re-gated green. Design ratifications captured for docs-closed — container-scoped `source` with tiles-as-data (rule-#4-forced, more correct than the spec's per-`<Fx>` phrasing) and `Fx` as a namespace object (forward-compatible with the frozen `<Fx effect>` compound). Surface names provisional — ratify at docs-closed. **Sim smoke test 5/6 PASS (maintainer-run, 2026-06-14; iPhone 17 sim / iOS 26.x; commit `6f9e572`) — NON-AUTHORITATIVE, `device-verified` not ticked:** rows 1–4 + 6 PASS incl. the strong render-server-under-JS-stall proof (rule #1) and a *structural* zero-per-frame-JS proof (the surface exposes no scroll callback — nothing can fire per frame); row 5 (os<17 fallback) NOT-RUN (code-reasoned, trivial `#available` branch). **Finding:** the curated `[[stitchable]]` shaders DO render on the current sim — contradicts the v1-cut-checklist waiver premise (worth reconciling; relevant to DEF-017's sim smoke lane). The sim-only hardware gate was BLOCKED by a CoreDevice tunnel fault; the maintainer **confirmed on physical hardware and waived the formal hold (2026-06-14)**. **Recorded residuals (documented-waiver precedent, U3-007/U8-002):** row 5 (os<17 fallback, code-reasoned) and the A15-GPU perf characterization (not a defined spec row). **Docs-closed done (planner, 2026-06-14):** `02` (node vocab + decision 14 shipped marker), `40` (Escaping-Regime-C route 1 + decision 7 + the resolved open question flipped to shipped-on-iOS), `50` (source in the layers table/prop language/builders + Decision 9 ratifying the surface), `structure.ios.md § source` confirmed; `reviews/DEF-014.md` written. **Follow-up (not blocking):** the shaders-render-on-sim finding vs the `v1-cut-checklist` waiver — a small `doc-cleanup` once confirmed across the toolchain (unblocks DEF-017). **Unit DEF-014 fully closed.** [task](./tasks/DEF-014/) · [review](./reviews/DEF-014.md) · [notes](./tasks/DEF-014/notes.md) · [device runbook](./tasks/DEF-014/evidence/device.md) |
| DEF-015 | 1-surface | ratify | merged | no | — | — | **MERGED 2026-06-13 on integration/0.1.x (this docs-ratification commit).** Surface-freeze naming pass + package identity ratified; recorded in `50` (Decision 8), `55` (Decision 7), `30` (Decision 7 + `controlled` row), `01`/`02` (substrate-vocabulary guard), `52` (Decision 10 reconciled); no ledger row; [task](./tasks/DEF-015/). Decisions: `<Fx effect>`/`fx.effect.*` as-is (no bare export), `interactionMode` `none\|passive\|active` (`controlled`→DEF-020), `hosted`/`expo-view` internal-only, **publish unscoped as `react-native-fxkit`** (d) revised 2026-06-13 from `@react-native-fx/core` — scope needs by-hand org creation; `react-native-fxkit` is already owned/published). **Blocks DEF-016** (mechanical rename only; no scope-claim step) | critique F17 (maintainer-accepted 2026-06-10): one naming-review pass before the surface freezes — `<Fx effect={fx.effect.*}>` stutter, `interactionMode` runtime vocabulary, `hosted`/`expo-view` mechanism leakage. **Now also owns the package-name call (F15):** the npm name is claimed as `react-native-fxkit` (unscoped `react-native-fx` is unclaimable — npm typosquat filter vs `react-native-fs`); decide whether the product/repo identity adopts `fxkit` or keeps `react-native-fx` as the product over a `fxkit` package |
| DEF-016 | 6-ship | implement | blocked | no | — | — | trigger: pre-publish — **publish only after V2 is done (maintainer, 2026-06-14); do not run DEF-016 at V1** | critique F13: coexistence matrix (RNGH, Reanimated-alongside, navigation, Expo Go/web) + per-capability parity/degradation story + the platform-exclusives positioning in `skills/`. **F15 (name decided — DEF-015, revised 2026-06-13):** rename `packages/package.json` `name` `react-native-fx` → **`react-native-fxkit`** (unscoped, already owned/published — no scope-claim step) and align all install/import/README/skills/doc + package-metadata refs; keep API symbols short (`Fx`/`FxPresence`/`FxView`/`FxPressable`/`EdgeGlow`/`fx.effect.*`/`fx.motion.*`); confirm no `skills/` page exposes `hosted`/`expo-view`. Run the package tsc/build/lint/test gates after the rename |
| DEF-017 | 6-ship | implement | blocked | no | — | — | trigger: post-V1 | critique F16: simulator smoke lane in CI (mount each catalog id, screenshot, diff) — catches the blank-on-switch regression class headlessly |
| DEF-018 | 3-motion | implement | blocked | yes | — | — | trigger: presence-under-navigation settled | the `sheet`/`modal` presence presets deferred from V1 (DOC-018), re-homed from MOT-001 at its closure (U7-003, 2026-06-12): they name screen-scale presentations that collide with presence's scope ceiling (`42`); provisional catalog targets live in `data-layer` §Presence presets; resurrect them through the proven U7-002 catalog pattern (fill → law test → device gate) once presence-under-navigation is settled |
| DEF-019 | 4-runtime | implement | blocked | yes | — | — | trigger: first shaped shader ships | SDF feather/threshold tuning, re-homed from RT-006 at its closure (U8-001, 2026-06-13): V1 ships no shader exposing a shape uniform, so the hit-test runs the `32` D4 full-bounds fallback and there is no SDF edge to feather; the per-frame cost half was device-proven cheap and closed with RT-006. Tune the feather on device when the first shaped shader (a glow/blob with a shape uniform) ships |
| DEF-020 | 4-runtime | implement | merged | yes | — | — | unblocks DEF-011 | **MERGED on integration/0.1.x (human-delegated tick, 2026-06-15; finishing commit `d39a096`, feature chain `d6ba13a`→`e4b1286`). Unblocks DEF-011.** Device spike PASS both platforms (POCO F1 / Android + iPhone 17 Pro sim / iOS 26, fresh builds at HEAD `e4b1286`): R1 discrete write observed, R2 clobber rule (write survives host re-render), R3 `setHighlight` survives re-render (M3), R4 exit-`controlled` restore (M2), R5 loop pause off-window (rule #1) — `evidence/device.md` (+21 gitignored screenshots). One minor coverage note: the Android in-`none` no-op write sub-step wasn't reached (scroll position); iOS covered it, mechanism shared. Docs-closed: `30` Decision 7 + the `controlled` table row flipped deferred→shipped; `50` Decision 8 cross-ref updated; `structure.{ios,android}` mechanic already pinned; no ledger row (unblocks DEF-011/RT-002, closes none). — [task](./tasks/DEF-020/); detail block ↓. SCOPE SPLIT (maintainer-accepted 2026-06-15): DEF-020 = the **view-ref `controlled` write path only** — `setUniform`/`setHighlight` as Expo `AsyncFunction`s on the surface ref, **discrete writes only**, into the existing uniform buffer (RT-005 `[0,1]` y-up UV). No `SharedObject`, no `FxEffectRenderer` extraction, no Nitro — unblocks DEF-011 without speculative architecture. Continuous gesture-sourced uniforms stay DEF-006; the true SharedObject/renderer/HybridObject half split to **DEF-021**. Two review rounds applied + re-reviewed clean (planner): B1/B2 — scalar-whitelist cross-platform parity + the Android vec-uniform arity crash fix (`2288181`); M2/M4 — clear imperative overrides on exit-`controlled` + `ReactNode` import (`a1356d7`). Gates re-run green incl. forced `:react-native-fx:compileDebugKotlin` (58 executed) + example tsc. Example harness `controlled-write` added (discrete button-tap writes, the clobber re-render test). Review: `reviews/DEF-020.md`. Device spike pending the human gate. |
| DEF-021 | 4-runtime | implement | blocked | yes | — | — | trigger: first detached imperative handle (post-v2 impulse API) or per-child control (DEF-002 / the `05` Nitro re-eval) | the true `Fx*` `SharedObject` layer + the discrete `FxEffectRenderer` object + the HybridObject *shape* (`equals`/`dispose`/identity), split from DEF-020 (2026-06-15). Only a *detached* JS-held handle needs it; the view-ref `controlled` write path (DEF-020) does not, so building it now is speculative architecture (the U9 ratification logic) and trips the rule-#7 Nitro boundary. Originally deferred from Unit 9 (2026-06-13): V1 exposes no JS-held handle, so a `SharedObject` has no consumer and the internal objects stay plain native classes (`36` §V1 realization). Keep DEF-020's `setUniform`/`setHighlight` a clean subset so the later swap stays mechanical. |

## DEF-020 — view-ref `controlled` write path (`setUniform` / `setHighlight`)

Type: `implement` · State: `merged` · Device: yes · Consumes: — · Closes: — (unblocks DEF-011) · [task](./tasks/DEF-020/)

The minimal half of the original DEF-020 (split accepted by the maintainer, 2026-06-15): the view-ref
imperative write path that `interactionMode="controlled"` needs and DEF-011 (drag/tilt) hard-depends
on. **Discrete writes only** — continuous gesture-sourced motion stays DEF-006; the true SharedObject
layer split to DEF-021. Full spec, authority links, scope in/out, spike, and proof in the task README.

Headless work planner-reviewed clean across two rounds ([review](./reviews/DEF-020.md)): the B1/B2
round (`2288181`) restored cross-platform parity (scalar whitelist `{intensity, pressDepth}` on both
platforms) and removed the Android vec-uniform arity crash; the M2/M4 round (`a1356d7`) clears the
imperative overrides when the mode leaves `controlled` and fixes the `ReactNode` import. All headless
gates re-run independently by the planner (incl. a forced `compileDebugKotlin` = 58 executed). The
`controlled-write` example screen is the device-spike harness (discrete button-tap writes only — no
per-frame JS — plus the force-host-re-render clobber test).

Checklist:
- [x] spec'd ([README](./tasks/DEF-020/README.md))
- [x] rules-gated (#1 discrete-only / no JS frame loop, #7 Expo `AsyncFunction` not JSI, #8 discrete targets)
- [x] implemented (full write path built — the device spike, including the clobber rule, remains the human gate)
- [x] commented (iceberg — the guarded-write rule, the UV space, why discrete-only)
- [x] headless-done (packages tsc/build/lint/swift:lint/test green; Android `compileDebugKotlin`; iOS `xcodebuild` BUILD SUCCEEDED)
- [x] device-verified (R1–R5 PASS both platforms, 2026-06-15, fresh builds at `e4b1286` — `evidence/device.md`; one minor note: Android in-`none` no-op write not reached, iOS covered it)
- [x] reviewed (planner — three rounds: B1/B2, M2/M4, final; gates re-run independently; device evidence cross-checked)
- [x] docs-closed (`30` Decision 7 + `controlled` table row flipped deferred→shipped; `50` Decision 8 cross-ref updated; `structure.{ios,android}` mechanic pinned; no ledger row)
- [x] merged (human-delegated tick, 2026-06-15 — finishing commit `d39a096` on integration/0.1.x)

## EX-002 — 100-cell mixed-effect stress list

Type: `implement` · State: `merged` · Device: yes · Consumes: — · Closes: — (critique-routed F14, no ledger row) · [task](./tasks/EX-002/)

Origin: critique F14. A standing device-verify scenario (not a throwaway) that converts the F1/F2
per-instance-Metal / scroll-cost critique from theoretical to measured, and is where U4-003's
deferred multi-instance shared-context proof gets run.

Checklist:
- [x] spec'd ([README](./tasks/EX-002/README.md))
- [x] rules-gated (#1 native owns the frame loop under scroll; #3 mixes the two substrates only;
      #9 reads layout — plain RN cells)
- [x] implemented (`example/screens/stress-list.tsx` + registration)
- [x] commented (iceberg — why the cell mix, why virtualized, the deterministic generator)
- [x] headless-done (example `bunx tsc --noEmit` green; example screens carry no unit tier)
- [x] device-verified (maintainer-ratified 2026-06-11 on the PASS evidence — (a)/(c)/a11y full, (b) full on Android hardware, partial on the iOS sim by tooling limits; `evidence/device.md`)
- [x] reviewed (reviewer, 2026-06-11 — `../reviews/device-batch-2026-06-11.md`)
- [x] merged (maintainer, 2026-06-11, on integration/0.1.x)

Change (JS-only — `example/`, no `packages/` native):
- **`screens/stress-list.tsx`** (`StressListScreen`) — a virtualized `FlatList` of 100
  deterministic cells, four kinds cycling by `index % 4`: `shader` (`FxSurfaceView shader={id}` —
  the expo-view Metal path U4-003 reworked), `fill` + `material` (`FxHostedView` — the hosted
  path), and `motion` (`FxSurfaceView` wrapping content with no shader → no MTKView). Shader cells
  cycle the ten curated ids so the pipeline cache holds several keys with repeats. Per-cell
  captions name the kind + shader id for device correlation.
- **`data/tasks.ts`** — `"stress-list"` added to `DemoScreen`; an `EX-002` `TASKS` entry.
- **`app/(tasks)/[taskId].tsx`** — `StressListScreen` import + `case "stress-list"` in `renderDemo`.

Why `FxSurfaceView` (not `FxHostedView`) for shader cells: the lazy-MTKView + process-shared static
Metal context lives in `FxSurfaceView.swift`; proofs (a)/(c) target that path. `FxHostedView` runs
the separate hosted Metal lane and serves the fill/material cells.

Proof:
- headless: `bunx tsc --noEmit` from `example/` — green. No example lint gate (Biome scopes to
  `packages/src`); the file uses tab indentation matching sibling screens. `packages/` untouched.
- device: `tasks/EX-002/evidence/device.md` — (a) multi-instance shared Metal context (one
  device/queue, same-id pipeline reuse), (b) scroll perf on the mixed list (no per-frame JS / jank),
  (c) shader-less cells allocate zero MTKView at scale; plus the a11y row. iOS owns (a)/(c);
  both platforms run (b). The human gate.
- docs: none — critique-routed, no ledger row.

## U1-006 — drop FxGroupView from the public index

Type: `implement` · State: `merged` · Device: no · Consumes: — · Closes: — (critique-routed, no ledger row)

Origin: critique F9. `src/index.ts` is the declared stability contract, and the grouped-substrate
binding is an inert stub — its native `FxGroupView` does nothing until the morph compound (DEF-006
/ `FxGroup` high-level component) lands. Exporting it publishes API surface the runtime can't honor.
The fix narrows the public surface; nothing else moves.

Checklist:
- [x] spec'd (single-line export removal; trivial — tracked as a detail block, not a folder)
- [x] rules-gated (no rule touched — a public-surface narrowing; #2/#3/#7/#9 untouched)
- [x] implemented (dropped the `FxGroupView` + `NativeFxGroupProps` export from `src/index.ts:12`)
- [x] commented (no new code; the index header comment still reads true)
- [x] headless-done
- [x] reviewed (reviewer, 2026-06-11 — approved: export cut verified in the built `index.d.ts` (zero refs), no stray imports in `example/`/`skills/`/`packages/src`, binding + web stub + native registration correctly kept; no separate review doc for a one-line change)
- [x] merged (maintainer, 2026-06-11, on integration/0.1.x)

Change (TS-only):
- **`src/index.ts`** — removed `export { FxGroupView, type NativeFxGroupProps } from './runtime/FxGroupView'`.
  The built `index.d.ts` now exposes only `FxHostedView` + `FxSurfaceView` substrate hosts.
- **Kept:** `src/runtime/FxGroupView.tsx` (the binding), `src/runtime/FxGroupView.web.tsx` (the web
  stub that imports `NativeFxGroupProps` from it), and the inert native `FxGroupView` registration.
  Only the public re-export was cut.
- **Not touched:** the `index.ts` header comment listing the future high-level vocabulary
  (`Fx`, `FxGroup`, `FxItem`) — those are the unbuilt high-level components, not this low-level
  binding, so the comment stays accurate.

No `FxGroupView` / `NativeFxGroupProps` import exists anywhere in `example/` or `skills/` (grepped
both, plus `packages/src`); the only other reference is the binding file and its `.web` sibling.

Proof:
- headless: from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint` (Biome, 19 files
  clean), `bun run test` (34 pass) all green; built `index.d.ts` confirmed to no longer export either
  symbol.
- device: N/A — public-surface narrowing, nothing renders.
- docs: none — critique-routed, no ledger row, no source-doc decision.

## DOC-014 — runtime-binding ref cleanup

Type: `doc-cleanup` · State: `merged` · Device: no · Consumes: — · Closes: — (no ledger row)

Reconciles the phantom/stale runtime-binding and folder refs in `architecture.md` + `data-layer.md`
to the real package. Scope widened per audit-2026-06-09 S1.

Checklist:
- [x] spec'd
- [x] rules-gated (docs-only; no rule touched)
- [x] docs reconciled
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

Edits made (grounded against the shipped package):
- **`architecture.md` §1 runtime block (`:55-58`)** — dropped **all three** phantom bindings
  (`FxManagedView` + `FxPresenceView` + `FxPressableView`). Revised from the initial S1 disposition
  after grounding: there are only 3 registered native views, so the runtime layer has exactly 3
  bindings (`FxHostedView`/`FxSurfaceView`/`FxGroupView`, at `packages/ios/FxModule.swift:12,31,53`;
  `android/.../FxModule.kt:19,38,60`). Presence/press are `expo-view` (rule #3) — they route through
  `FxSurfaceView` + a coordinator/recognizer object and ship as `src/surface/` components, never their
  own `requireNativeView` bindings. `src/surface/` currently holds only `types.ts` (components not yet built).
- **`architecture.md` §1 manifest (`:29`)** — `CapabilityManifest.ts (the data)` → `index.ts (the
  manifest barrel)`. Real manifest files are `index.ts`/`select.ts`/`types.ts`; `CapabilityManifest`
  is a *type* in `types.ts`, and the manifest *data* is not shipped in `src/` (test fixture only).
  **Note:** `:29` was not in the S1-enumerated ref set, but it is the identical phantom as
  `data-layer:693` — fixed for tree-consistency.
- **`architecture.md` §2 Path-2 flow (`:323`)** — `src/runtime/FxPresenceView.tsx` →
  `src/runtime/FxSurfaceView.tsx` (the real binding the JSX lowers to today; matches the
  `requireNativeView('ReactNativeFx','FxSurfaceView')` line beneath it).
- **`architecture.md` §9 unit map (`:556-557`)** — Unit 7/8 native = `FxSurfaceView` + the
  coordinator/recognizer object (not a dedicated view); JS = `src/surface/FxPresence.tsx` /
  `FxPressable.tsx` (planned). Added a footnote phrasing this as the current direction, with
  object/view granularity formally open per RT-008.
- **`decision-ledger.md` RT-008 row (`:170`)** — reconciled the stale "five-view object model"
  provisioned-value wording to the **3-view** reality (the same phantom drift one level up — five =
  3 real + the 2 phantom presence/press views). RT-008 stays **open**: its real subject is
  runtime-object granularity (driver family-split + scheduling), still open in `36`/DOC-011. Doc
  bodies (`architecture.md §2`, `data-layer.md §9 D1`) were already correct at 3 views — no body edit needed.
- **`architecture.md` §1 podspec (`:77`)** — `react-native-fx.podspec` → `ReactNativeFx.podspec`
  (real file; dropped the now-satisfied `[IMPL-001: post-identity-pass name]` prediction).
- **`data-layer.md` §9 entity diagram (`:693`, `:724-726`)** — manifest `CapabilityManifest.ts` →
  `index.ts (public API)`; runtime box dropped `FxManagedView`, marked Presence/Pressable
  `(planned — Unit 7/8)`. Box ASCII alignment preserved.
- **DOC-014's own pointer** — the widened row text already cites "entity-diagram src-tree", not
  `§5.1`; no further pointer fix needed (`§5.1` is the Memoization section, correctly distinct).

Proof:
- headless: N/A — docs-only, no code changed.
- device: N/A.
- docs: `architecture.md` §1/§2/§9; `data-layer.md` §9 entity diagram. No ledger row (cleanup only).

## DOC-015 — SURF-010 plane-1 re-closure

Type: `doc-cleanup` · State: `merged` · Device: no · Consumes: — · Closes: SURF-010 (re-close)

Fixes the cardinal-rule slip flagged in audit-2026-06-09 S3: SURF-010 (memoization guidance) was
closed against plane-7 `data-layer §5.1`, not its named plane-1 source `50`/`54`/`55`. Took the
**propagate** path (Option A): the guidance now lives in the owning surface docs, so the row closes
in source.

Checklist:
- [x] spec'd
- [x] rules-gated (docs-only)
- [x] guidance propagated to `50`/`54`/`55` §Open questions (resolved in source)
- [x] ledger SURF-010 reconciliation verb flipped `propagate` → `resolved`; main row + `data-layer §5.1` re-pointed
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

Edits made:
- **`50-api-and-presets.md` §Open questions** — memoization bullet struck through and resolved:
  no manual memo (native `previousProps` value-equality; React Compiler memoizes automatically).
- **`54-presence.md` §Open questions** — `uniforms`/`tune` memoization bullet resolved (same as `50`).
- **`55-composition-chain.md` §Open questions** — `EffectStack` memoization bullet resolved.
- **`decision-ledger.md`** — main SURF-010 row close-condition re-pointed to `50`/`54`/`55`
  §Open questions; the Reconciliation row verb flipped `propagate` → `resolved (DOC-015)`.
- **`data-layer.md §5.1`** — header note clarifies plane 7 *materializes* the guidance; closure
  lives in the plane-1 source docs.

Proof:
- headless: N/A — docs-only.
- device: N/A.
- docs: `50`/`54`/`55` §Open questions; `decision-ledger.md` SURF-010 (both rows); `data-layer.md §5.1`.

## DOC-009 — driver-model ratification

Type: `ratify` · State: `ready-to-merge` · Device: no · Consumes: — · Closes: MOT-003, MOT-005, MOT-006, MOT-009 · [task](./tasks/DOC-009/)

Promotes the research/wip driver-model rethink (maintainer-accepted 2026-06-10) into the
canonical docs and closes the four open motion-vocabulary rows. Scope widened from the
original "`40`/`41`/`42` V1 motion vocab scope" to carry the spine vocabulary (`02`), the
maintainer-ratified U6-001 spring-preflight dispositions (`34` + `structure.*`), and the
`Transition.spring` consumers (`55`, `data-layer`).

The three maintainer decisions recorded (2026-06-10):

1. **Substrate-tiered slicing; rule #4 holds.** Motion channels and effect uniforms are both
   animatable properties bound to native drivers — `target`/`clock`/`source`. Content motion
   (`expo-view`) gets full-fidelity `target`/`clock` and a best-effort `source`; render-server
   `source` fidelity and all effect-uniform animation live in the hosted effects lane.
   `source`'s guarantee is "zero per-frame JS", not "zero per-frame native". Build order:
   `target`+`clock`, then `source` (V2), then hosted effect-uniform animation.
2. **iOS 17 floor for spring content motion** — the `02` content rung moves `os:13` → `os:17`
   (`SwiftUI.Spring` only; below 17 the ladder degrades to `{via:'none'}`, instant placement).
3. **Render-server-first, integrator-on-retarget** for the iOS content lane (the `FxSpring`
   facade over `SwiftUI.Spring`; the touch caveat flips to visual-position while it runs).

Checklist:
- [x] spec'd
- [x] rules-gated (docs-only; the slicing exists to honor rule #4; per-platform spring
      authoring is the law applied to timing)
- [x] docs-closed (`02` Decision #14 + content rung; `40` Decision #7; `41` Decisions
      #10–#12; `42` Decision #6; `34` §Findings — iOS spring disposition + caveat flip +
      Android spring gate; `structure.{ios,android}.md` motion content mechanics; `55` +
      `data-layer.md` `Transition.spring`; MOT-003/005/006/009 → resolved; MOT-007 reframed
      (stays deferred, DEF-006); RT-016 reworded (stays device-pending, U6-002); wip folded —
      rethink deleted, preflight moved to `tasks/U6-001/preflight.md`)
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

Proof:
- headless: N/A — docs-only, no code changed.
- device: N/A — RT-016 stays with U6-002; MOT-001/MOT-002 catalog values stay device-pending.
- docs: as listed under docs-closed above.

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

Type: `rework` · State: `merged` · Consumes: RT-015 · Closes: RT-015

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] source docs reconciled (`33`, `34` decide the target object)
- [x] `architecture.md` / `data-layer.md` / `blueprint.md` updated to match (consumers, not sources)
- [x] device proof defined (scenario in `tasks/U4-001-wrapper-mechanic/evidence/device.md`)
- [x] device proof observed (maintainer-verified iOS + Android, 2026-06-09 — child mounts into the container, hit-test survives at rest; via the U4-002 device run)
- [x] ledger RT-015 closed (true in `33`/`34`)
- [x] merged (couple-merge with U4-002)

Proof:
- headless: N/A
- device: mount an RN child inside `FxSurfaceView`; confirm the child rides the animated intermediate container and hit-testing survives at rest (mid-flight caveat per `34`)
- docs: `33`, `34`, `architecture.md`, `data-layer.md`, `blueprint.md`, decision-ledger RT-015

## U4-002 — mountChildComponentView override

Type: `device-verify` · State: `merged` · Consumes: — · Closes: RT-014 · [task](./tasks/U4-002-mountChildComponentView/)

Checklist:
- [x] spec'd
- [x] rules-gated
  - [x] implemented
  - [x] commented
  - [x] TS+format-green (tsc/build/lint/test pass; swift-format clean)
  - [x] native-compile-verified (iOS local xcodebuild BUILD SUCCESSFUL; Android local gradle BUILD SUCCESSFUL)
  - [x] Android reimplemented — full `ExpoBlurTargetView.kt` override family + the no-`super.onLayout` fix (the `LinearLayout`-traversal crash) + onMeasure/onLayout sizing (0×0 fix)
  - [x] iOS reimplemented — symmetric mount/unmount + superview guard; spurious default shader (`pendingShader=""`) + free-running MTKView loop (pause when no effect) fixed; diagnostics removed
  - [x] device-verified (maintainer, iOS + Android, 2026-06-09 — mount/unmount confirmed via logs; smooth show/hide; taps land; Android crash gone)
  - [x] docs-closed (RT-014 mechanic + the corrected templates pinned in `structure.{ios,android}`; `33` fallback note; reference fan-out captured)
  - [x] reviewed (diffed against `ExpoBlurTargetView`/`expo-glass` templates; root causes confirmed fixed)
  - [x] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, `bun run test` from `packages/` all pass. `git diff --check` clean.
- native compile:
  - **iOS:** `xcodebuild` (Debug, iphonesimulator) on Xcode 26.5 → BUILD SUCCESSFUL. Diagnostic logging added to both `mountChildComponentView` and `unmountChildComponentView` to diagnose the "child won't unmount" symptom on device.
  - **Android:** `./gradlew :react-native-fx:compileDebugKotlin` → BUILD SUCCESSFUL. Reimplemented to match `expo-blur` `ExpoBlurTargetView.kt` exactly: full `addView`/`removeView`/`updateViewLayout`/`onMeasure`/`onLayout` family with identity guards. `onMeasure` added (explicit `setMeasuredDimension` + `intermediateContainer.measure`) as the missing half of the 0×0 fix.
- device: mount an RN child inside `<FxSurfaceView>` (no `shader` prop — `metalView` hidden), confirm it lands in the intermediate container, renders correctly (layout + draw, not 0×0), and hit-testing survives. The scenario must exercise layout, draw, and touch correctness. **iOS: capture console logs and answer:** (1) does `unmountChildComponentView` fire on hide? (2) if it fires, does `removeFromSuperview()` remove the child? (3) is there double-parenting (`self.subviews` vs `intermediateContainer.subviews`)? Mid-flight caveat per `34`.
- docs: `structure.ios.md` / `structure.android.md` — intermediate container mechanic + effect surface visibility rule + explicit layout note; `34` — open item about effect↔content composition.

## U4-003 — lazy Metal + shared static Metal context

Type: `rework` · State: `merged` · Device: yes · Consumes: — · Closes: — (no ledger row) · [task](./tasks/U4-003/)

Origin: critique F2 (HIGH) + F11's sharing half. `FxSurfaceView` is the `expo-view` substrate
every V2 motion/press/presence component rides; on iOS it allocated Metal eagerly and
per-instance, so wrapping a long list multiplied `MTKView`s/queues/libraries to animate
transforms that draw no shader.

Checklist:
- [x] spec'd
- [x] rules-gated (perf rework; #1/#3/#7/#9 hold, no tension)
- [x] implemented (lazy `MTKView`; static shared device/queue/library/pipeline cache)
- [x] commented (iceberg — why lazy, why process-lived, main-thread cache access)
- [x] headless-done
- [x] device-verified (maintainer-ratified 2026-06-11 on the PASS evidence — iOS 26 sim, agent-device, log-instrumented build reverted after; `tasks/U4-003/evidence/device.md` §Results; multi-instance shared-context proof rides EX-002)
- [x] reviewed (2026-06-11, approved — `../reviews/U4-003.md`)
- [x] docs-closed (`structure.ios.md` §Lifecycle mechanic pinned; no ledger row)
- [x] merged (maintainer, 2026-06-11, on integration/0.1.x)

Change (iOS-only — `packages/ios/FxSurfaceView.swift`):
- **Lazy Metal** — `init` builds only the content container; the `MTKView` (now `MTKView?`)
  is created by `ensureEffectSurface()` on the first active `shader`. A content-motion-only
  surface allocates no GPU view.
- **Process-shared Metal context** — `device`/`commandQueue`/`library`/`pipelineCache` moved
  to `private static` (one device, one queue, the one bundled `default.metallib`, a
  `shaderId`-keyed pipeline cache valid across instances because the pixel format is the fixed
  `bgra8Unorm`). Process-lived; `deinit` releases only the per-view `MTKView`.
- **Android** — unchanged; `FxSurfaceView.kt` holds no GPU resources. The cadence half of F11
  is out of scope (split to U2-003).

Proof:
- headless: from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test` (26 pass); `git diff --check` clean. Native:
  `xcodebuild` (Debug, iphonesimulator, Xcode 26.5) on `reactnativefxexample` → BUILD
  SUCCEEDED (after a `pod install` to refresh a stale Pods project — see `tasks/U4-003/notes.md`).
- device: **PASS** (2026-06-11, iOS 26 sim iPhone 17 Pro, agent-device on a log-only-instrumented
  build, reverted after). Exactly one `MTKView` allocation across the session, only on the first
  active shader; content-motion-only mount = zero alloc; child mount + hit-test intact; lazy
  `loop` rendered (not blank); reuse + fresh re-mount = no extra alloc; isolated teardown, no
  crash. Full log + screenshots in `evidence/device.md` §Results. Multi-instance shared-context
  (EX-002 list) + GPU-capture variant left as the maintainer's confirmation. Formal device-verified
  tick is the maintainer's.
- docs: `structure.ios.md` §Lifecycle (lazy effect surface + process-shared Metal context). No
  ledger row.

## U2-003 — CapabilityManifest data + typed config + conformance + cadence

Type: `implement` · State: `merged` · Device: yes (two carry-in scenarios) · Consumes: — · Closes: — (critique-routed, no ledger row) · [task](./tasks/U2-003/)

Origin: critique F3+F6+F11 (audit G1) + the two U4-003-review carry-ins. Makes the capability
manifest canonical and shipped, ties the dispatch renderings together, derives per-effect typed
config from it, adds the `cadence` schema hint, and wires the declared-but-dead surface events.

Checklist:
- [x] spec'd ([README](./tasks/U2-003/README.md))
- [x] rules-gated (#1 events per-change not per-frame; #2 agnostic ids over native switches; #7 Expo `Prop`/`Events`, no JSI; #9 no layout writes)
- [x] implemented
- [x] commented (iceberg — why coerce the shader prop, why dedup the events, the raster subset)
- [x] headless-done
- [ ] device-verified (human — `notes.md` §Unverified claims)
- [ ] reviewed
- [ ] docs-closed (source edits landed; reviewer confirms)
- [ ] merged

Change:
- **TS (headless):** `src/manifest/manifest.ts` (canonical `as const` manifest, all V1 nodes,
  reconciled to shipped native, `cadence` on animated rungs); `src/manifest/config.ts`
  (`ConfigFor<NodeId>` type-level derivation + build-failing assertions vs `MaterialConfig`/
  `SymbolConfig`); `types.ts` (`Cadence`, `cadence?`, `'string'`, readonly); `catalog.ts`
  (`CURATED_SHADER_IDS` → `ShaderId`); `manifest-conformance.test.ts` (ids ↔ MSL ↔ AGSL ↔ assets);
  `manifest-select.test.ts` repointed off the inline fixture; `FxSurfaceView.tsx` wraps the binding
  to coerce `shader ?? ''` + adds the load/error props.
- **Native (compile-verified; behavior device-pending):** `ios/FxSurfaceView.swift` — `fragmentName`
  → `String?`, `dispatchShaderLoadState()` fires `onFxLoad`/`onFxError` once per change.
  `android/.../FxSurfaceView.kt` — `FxShaderEvent` Record payload + asset-open/compile load proof.
- **Docs:** `02` (schema + decisions 15/16, typed-config Open question resolved); `data-layer §1`
  (canonical pointer + reconciled rungs + cadence); `structure.{ios,android}.md` `§shader` (events +
  reset contract + raster-subset note).

Proof:
- headless: from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test` (34 pass); `git diff --check` clean. Native: `pod install`
  then `xcodebuild` (Debug, iphonesimulator) → BUILD SUCCEEDED; `./gradlew
  :react-native-fx:compileDebugKotlin` → BUILD SUCCESSFUL.
- device: shader-reset (undefined clears) + `onFxLoad`/`onFxError` fire once (iOS raster subset
  now errors instead of wrong-rendering); scenarios in `tasks/U2-003/notes.md`.
- docs: `02`, `data-layer §1`, `structure.{ios,android}.md`. No ledger row.

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

## U3-002 — hosting parity / glass styles / uniforms (scope note)

Type: `device-verify` (hybrid — includes a library prep step) · State: `merged` · Device: yes ·
Consumes: — · Closes: SPINE-012, FX-002, FX-005 (all closed 2026-06-10) · Blocked by: U3-001 · [task](./tasks/U3-002/) · [review](./reviews/U3-002.md)

Scope folded in (Planner, 2026-06-10): **FX-002 (glass styles) cannot be device-verified until
the library exposes a glass-style channel.** Landed (2026-06-10) as the `materialConfig` config
channel (mirrors `symbolConfig`, per `21` §The typed inputs — `variant: 'regular'|'clear'` +
`interactive`; `.identity` deliberately not adopted), in order:

1. **The library prep** — `materialConfig` on `FxHostedView` (TS `NativeFxHostedProps`) +
   `FxModule` `Prop` + `FxMaterialView` applying the `Glass` variant and `.interactive()` on
   iOS 26. Done.
2. **The example selector** — the glass section on the `hosting-parity` screen (variant
   segmented control + press-response toggle, glass tile inside the scroller). Done.
3. **The glass-style device check** (scenario in `tasks/U3-002/evidence/headless.md`). Human gate.

FX-005 (uniform alignment) and SPINE-012 (hosting parity / many boundaries / GPU resume) are
pure device-verify against the EX-001 harness — no library work. The scenarios live in
`tasks/U3-002/evidence/headless.md` (the sweep docs were retired 2026-06-10; history in git).

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [ ] device-verified (human gate)
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
  `bun run test` (21 tests) from `packages/`; `bunx tsc --noEmit` from `example/`; local
  xcodebuild (Debug, iphonesimulator) BUILD SUCCEEDED — `tasks/U3-002/evidence/xcodebuild.md`.
- device: scenario in `tasks/U3-002/evidence/headless.md` (formerly sweep §A2/§A3/§A4/§B2; the sweep docs were retired 2026-06-10 — history in git). Verified 2026-06-10.
- docs: on device pass, FX-002 closes in `21`, FX-005 in `22`, SPINE-012 in `01` + the ledger.

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

## U3-004 — BYO registration contract

Type: `ratify` · State: `ready-to-merge` · Device: no · Consumes: — · Closes: `FX-006` · [task](./tasks/U3-004/)

Ratifies the V1 BYO (bring-your-own) shader registration contract in the owning source doc (`22-shaders.md`) and propagates it to `data-layer.md` §7. The contract is end-to-end: registration, consumption, typing, and unregistered-id behavior.

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] docs-closed (`22` Decision 6 records the contract; open question resolved; `data-layer.md` §7 reconciled)
- [x] ledger `FX-006` closed (true in `22`)
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

Proof:
- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `22` §Decisions (Decision 6), `22` §Open questions (BYO asset contract resolved), `data-layer.md` §7 (reconciled), `decision-ledger.md` `FX-006` → `resolved`.

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

## DOC-003 — ratify SPINE-001 + SPINE-002

Type: `ratify` · State: `merged` · Device: no · Consumes: — · Closes: SPINE-001, SPINE-002 · [task](./tasks/DOC-003/)

Ratifies the curation/BYO threshold and the palettes-as-artifact disposition.

**SPINE-001 — curation/BYO threshold:**
- `00` Decision #6: the V1 threshold is the 10 curated shader ids (`22`) plus the ratified preset/feedback/effect vocabularies (`50`/`56`). Anything outside the curated set is BYO (developer-supplied `.metal`+`.agsl` via the `shader` node). The compiler/emitter (`03`) is deferred until real novel-composition demand triggers it.
- The `00` open question "Where curation ends and BYO begins" is struck through and resolved.

**SPINE-002 — palettes/themes as artifact:**
- `52` Decision #11: palettes and themes as a shareable distribution artifact are deferred to V2. Pure-config palettes resolve in JS within the core package (`presets/`). A distribution surface would live in `@react-native-fx/lab` if demand justifies the split.
- The `50` open question "Theme distribution" is struck through and resolved.
- `52` Decision #10 already named `@react-native-fx/lab` as the home for "where curation ends"; Decision #11 makes the palettes-as-artifact link explicit.

Checklist:
- [x] spec'd
- [x] rules-gated (docs-only)
- [x] source docs ratified
  - [x] `00` — Decision #6 added; open question struck through
  - [x] `52` — Decision #11 added
  - [x] `50` — "Theme distribution" open question struck through
- [x] ledger SPINE-001 + SPINE-002 closed (true in source)
- [x] docs-closed
- [x] reviewed (no separate doc — inline verdict)
- [x] merged (integration/0.1.x)

Proof:
- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `00` §Decisions (Decision #6), `50` §Open questions, `52` §Decisions (Decision #11); decision-ledger SPINE-001 + SPINE-002 → `resolved`.

## DOC-004 — ratify SURF-002

Type: `ratify` · State: `merged` · Device: no · Consumes: — · Closes: SURF-002 · [task](./tasks/DOC-004/)

Ratifies the criterion for shipping named effect components and the V1 set that passes it.

**SURF-002 — ship effect components?**
- `56` Decision 4: named effect components ship only when the effect is drawn whole by fx (rule #5), is standalone-useful without wrapped content, and the canonical API remains `<Fx effect="…">`. The V1 set that passes this test today is `EdgeGlow`. `MeshGradient` is a fill style, reached via `<Fx effect="mesh-gradient">` (or `fx.effect.mesh()`), not a standalone component.
- `56` Decision 6: `EdgeGlow` ships as a component. `MeshGradient` does not. These are sugar over effects already in the curated catalog (DOC-003, SPINE-001) — not new surface. They export from the core package, not `@react-native-fx/lab` (consistent with `52` Decision #10).
- `52` Decision 12: ratifies the same V1 set and criterion in the ship plane.
- `55` line 11: curated effect preset wording updated to `EdgeGlow` only.
- The `56` and `52` open questions are struck through and resolved.

Checklist:
- [x] spec'd
- [x] rules-gated (docs-only)
- [x] source docs ratified
  - [x] `56` — Decision 4 records the criterion; Decision 6 records the V1 set + DOC-003 reconciliation
  - [x] `52` — Decision 12 records the V1 set
  - [x] `55` — curated effect preset wording updated
- [x] ledger SURF-002 closed (true in `52`)
- [x] docs-closed
- [x] reviewed (no separate doc — inline verdict)
- [x] merged (integration/0.1.x)

Proof:
- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `56` §Decisions (Decision 4, Decision 6), `52` §Decisions (Decision 12), `55` line 11; decision-ledger SURF-002 → `resolved`.

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

## DOC-006 — FxGroup morph scope ratification

Type: `ratify` · State: `ready-to-merge` · Device: no · Consumes: — · Closes: SURF-006 · [task](./tasks/DOC-006/)

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] docs-closed
  - [x] `57` — Decision 6 records glass-only morph scope, iOS 26+ / system-owned merge, Android flat fallback
  - [x] `57` — Open question struck
  - [x] `21` — Decision 5 records glass-morph as the only V1 compound effect
  - [x] `21` — Open question struck
  - [x] `data-layer.md` §10 reconciled to ratified wording
- [x] ledger SURF-006 closed (true in `57`/`21`)
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

Proof:
- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `57` §Decisions (Decision 6), `21` §Decisions (Decision 5), `data-layer.md` §10; `decision-ledger.md` SURF-006 → `resolved`.

## U3-007 — iOS symbol effect

Type: `implement` · State: `headless-done` · Device: yes · Consumes: `FX-009` · Closes: — · Blocked by: `DOC-008`, `U3-001` · [task](./tasks/U3-007/)

Implement iOS `symbol` via `.symbolEffect` on the hosted slice. Android symbol deferred (planned, non-selectable), confirmed by `select()` tests.

Checklist:
- [x] spec'd
- [x] rules-gated
- [x] implemented
  - [x] `FxSymbolView.swift` — `.symbolEffect` on iOS 17+ (bounce/pulse/scale/appear/disappear/variableColor), iOS 18 adds breathe/rotate/wiggle, `.contentTransition(.symbolEffect(.automatic))` for symbol→symbol, degrades below 17
  - [x] `FxHostedView.swift` — `symbolConfig` dispatch path before `effect` path
  - [x] `FxModule.swift` — `Prop("symbolConfig")` registered
  - [x] `src/effects/catalog.ts` — `SymbolAnimation` and `SymbolConfig` types exported
  - [x] `src/runtime/FxHostedView.tsx` — `symbolConfig` added to `NativeFxHostedProps`
  - [x] `src/index.ts` — exports the new symbol types
- [x] commented
- [x] headless-done
  - [x] `bunx tsc --noEmit` green
  - [x] `bun run build` green
  - [x] `bun run lint` green
  - [x] `bun run swift:lint` green
  - [x] `xcodebuild` native compile: **BUILD SUCCEEDED** (Xcode 26.5, iPhone 17 sim, iOS 26.5)
  - [x] `bun run test` green (21 tests pass, 3 new symbol tests)
  - [x] `structure.ios.md` diff check: zero changes (consumed, not edited)
- [ ] device-verified (human gate)
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

Proof:
- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, `bun run test` from `packages/` all green. `xcodebuild` native compile: BUILD SUCCEEDED. `structure.ios.md` diff = zero changes.
- device: scenario written in `tasks/U3-007/evidence/headless.md`. Requires iOS 17+ device/simulator to verify `.symbolEffect` rendering and symbol→symbol transition. Android degradation confirmed by `select()` test.
- docs: `structure.ios.md` §symbol already pinned — consumed, not re-derived. `24-symbols.md` already ratified. No new ledger row to close (FX-009 resolved by DOC-008).

## Maintenance

- The table is the **view**; the detail block / `tasks/<id>/` folder is the **store**. On disagreement, the store wins — same discipline as "the source doc closes a ledger row, not the ledger."
- A row reaches `ready-to-merge` (complete) only when its `Closes:` rows are true in their source docs. Until then it sits at `docs-pending`, however green the build.
- Escalate by need: row → add a detail block when the task is active → promote to a `tasks/<id>/` folder when it accrues device evidence.
