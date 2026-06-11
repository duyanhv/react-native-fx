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
| DOC-003 | 0-spine | ratify | merged | no | — | SPINE-001, SPINE-002 | — | docs: `00` Decision #6 + `52` Decision #11 + `50` open question struck; SPINE-001/002 resolved; reviewed (no separate doc); merged on integration/0.1.x; [task](./tasks/DOC-003/) · [detail](#doc-003--ratify-spine-001--spine-002) |
| DOC-004 | 1-surface | ratify | merged | no | — | SURF-002 | — | `56` Decision 4 records the criterion; `52` Decision 12 records the V1 set; SURF-002 resolved; reviewed (no separate doc); merged on integration/0.1.x; [task](./tasks/DOC-004/) · [detail](#doc-004--ratify-surf-002) |
| DOC-005 | 1-surface | ratify | merged | no | MOT-001 | SURF-003, SURF-004, SURF-005 | — | `50`/`56`/`57`/`41` V1 preset/state/feedback vocab ratified; springs stay with MOT-001; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-005--v1-presetstatefeedback-vocabulary-ratification) |
| DOC-006 | 1-surface | ratify | ready-to-merge | no | — | SURF-006 | — | docs: `57`/`21` FxGroup morph scope ratified; [task](./tasks/DOC-006/) |
| DOC-007 | 2-effects | ratify | merged | no | — | FX-001, FX-004 | — | full-grid mesh + mesh-only `drift`; 10-id shader catalog; shared minimal shader uniforms; [task](./tasks/DOC-007/) · [review](./reviews/DOC-007.md) |
| DOC-008 | 2-effects | ratify | merged | no | — | FX-009 | — | `symbol` iOS-only in V1; Android AVD/Lottie planned/deferred (non-selectable, enforced by `select()`); [task](./tasks/DOC-008/) · [review](./reviews/DOC-008.md) |
| DOC-009 | 3-motion | ratify | ready-to-merge | no | — | MOT-003, MOT-005, MOT-006, MOT-009 | — | driver model (`target`/`clock`/`source`) ratified — scope widened to promote the research/wip rethink (maintainer-accepted 2026-06-10); per-platform spring authoring replaces `{damping,mass,stiffness}`; iOS content rung → `os:17`; render-server-first + `FxSpring`-on-retarget pinned; MOT-003/005/006/009 resolved in source; [task](./tasks/DOC-009/) · [detail](#doc-009--driver-model-ratification) |
| DOC-010 | 3-motion | ratify | merged | no | — | MOT-010 | — | V1 reduce-motion = instant degradation (0-duration); policy recorded in `41` Decision #9, `42` §Reduce-motion, `34` §Findings; MOT-010 resolved; reviewed (no separate doc); merged on integration/0.1.x; [detail](#doc-010--reduce-motion-policy-ratification) |
| DOC-011 | 4-runtime | ratify | todo | no | — | RT-006, RT-008 | — | docs: `32`/`36` SDF source, driver granularity |
| DOC-012 | 6-ship | ratify | ready-to-merge | no | — | SHIP-002 | — | docs: `53` Decision 7; no-rung degradation policy ratified; SHIP-002 resolved; [task](./tasks/DOC-012/) |
| DOC-013 | 2-effects | ratify | merged | no | — | REAL-004 | — | V1 curated shaders hand-maintain MSL+AGSL pairs; compiler remains additive V2; [task](./tasks/DOC-013/) · [review](./reviews/DOC-013.md) |
| DOC-014 | 7-impl | doc-cleanup | merged | no | — | — | — | [detail](#doc-014--runtime-binding-ref-cleanup). Reviewed + merged on integration/0.1.x. Reconciled all runtime-binding/folder refs in `architecture.md` (§1 src-tree, §2 path, §9 unit-map + footnote, podspec) and `data-layer.md` (§9 entity diagram) to the real package — 3 bindings `FxHostedView`/`FxSurfaceView`/`FxGroupView`. **All three phantoms dropped** (`FxManagedView` + `FxPresenceView` + `FxPressableView`): grounding overruled the S1 "mark planned" disposition — presence/press are `expo-view` (rule #3) over `FxSurfaceView`, exposed as `src/surface/` components, never dedicated bindings. Also reconciled the ledger RT-008 "five-view object model" wording to 3 views (RT-008 stays open — object granularity per `36`). (scope widened per audit-2026-06-09 S1; binding call revised in-session) |
| DOC-015 | 1-surface | doc-cleanup | merged | no | — | SURF-010 (re-close) | — | [detail](#doc-015--surf-010-plane-1-re-closure). Reviewed + merged on integration/0.1.x. Cardinal-rule slip (audit-2026-06-09 S3): SURF-010 (memoization guidance — native `previousProps` value-equality ⇒ no manual memo) was closed against plane-7 `data-layer §5.1`, not its named plane-1 source `50`/`54`/`55`. Propagate the guidance into the owning surface doc(s) and re-point the SURF-010 closure there (or correct the source attribution if it genuinely belongs in `data-layer`) |
| DOC-016 | guides | doc-cleanup | merged | no | — | — | — | critique F19: short human-contributor path added to `Contributing Guide.md` (§Contributing as a human — small drive-by change vs research-path change); no ledger row; [task](./tasks/DOC-016/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-017 | 0-spine | rework | merged | no | — | — | — | critique F4: spine reconciled to the shipped Android hosted mechanic — `01`/`02`/`README` substrate wording + the `02` shader-hosted worked row now say plain `View` + `Paint.onDraw` + `Choreographer`, Compose marked future rung; `structure.android.md` (mechanic home) corrected too (it was self-contradictory — Compose-host vs plain-View host); no ledger row; [task](./tasks/DOC-017/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-018 | 0-spine/3-motion | ratify | merged | no | — | — | — | critique F5+F12: **maintainer decided (2026-06-11) — drop `sheet`/`modal` from V1, ship `transient` only; defer `sheet`/`modal` to MOT-001.** Scope ceiling documented (`42` §The scope ceiling: presence animates in-screen conditional rendering, not navigator transitions); V1 vocab narrowed in `42`/`56`/`50`/`41` + ledger (SURF-003/MOT-001) + `data-layer` catalog note; React-semantics rows (StrictMode/Fast Refresh/Suspense/mid-exit re-render/list eviction) added to `35`; revises DOC-005; blocks U7-001; [task](./tasks/DOC-018/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-019 | 1-surface | ratify | merged | no | — | — | — | critique F8: `tune` deferred from the V1 surface — V1 ships the `preset`/`motion`/`transition` triad. Recorded in `41` (Decision 13 + table marker); propagated to `50`/`42`/`54`/`56`/`1-surface README` (surface marks + examples stripped of `tune`); `data-layer §4` + `architecture` + ledger MOT-002 carry the deferral; design retained for MOT-001 resurrection; no ledger row; [task](./tasks/DOC-019/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |
| DOC-020 | 1-surface | ratify | merged | no | — | — | — | critique F18: native↔public event-name mapping pinned as the one canonical table in `40` §Native ↔ public event-name mapping (grounded in shipped `FxModule`/view `Events`: press `onShader*`, lifecycle/load `onFx*`; `onStateChange`/`onLongPress` marked unwired); `architecture.md`'s vague note + `50`'s event list now point at it; no rename (code change, out of scope); no ledger row; [task](./tasks/DOC-020/) · [review](./reviews/doc-batch-2026-06-11.md) — approved + **merged 2026-06-11 (maintainer)** |

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
| U3-002 | Unit 3 | device-verify (hybrid) | docs-closed | yes | — | SPINE-012, FX-002, FX-005 | U3-001 | iOS-26 glass rung reworked to UIKit `UIVisualEffectView`+`UIGlassEffect` per the ratified spike; device-verified 2026-06-10 (agent-device run + maintainer live tap); SPINE-012/FX-002/FX-005 closed in owning docs + ledger; UIKit rung is scroll-through inside scrollers (`01` decision 6) ([task](./tasks/U3-002/), [detail](#u3-002--hosting-parity--glass-styles--uniforms-scope-note)) · [review](./reviews/U3-002.md) |
| U3-003 | Unit 3 | implement | merged | yes | — | FX-003 | U3-001 | Android material landed (sweep B1): `FxMaterialView` own-content stack + `RenderEffect.createBlurEffect` via `setRenderEffect` (API 31+; unblurred stack below — never a flat box), intensity 0–1 → 0–24dp blur + alpha, `variant` weights, `interactive` inert, Haze rung `planned`; manifest fixture + 5 select() tests; gates green + `assembleDebug` BUILD SUCCESSFUL; **device run 2026-06-11 on POCO F1 (API 35) via agent-device — B1 PASS recommended** (renders / intensity live / variant / interactive-inert / scroll 59.8 fps · `tasks/U3-003/evidence/device.md` + `device-run-2026-06-11/`); **device-verified ratified 2026-06-11 (maintainer)**; **FX-003 closed** — `21` Decision 6 (own-content blur default, intensity 0–1 mapping, staleness clean) + ledger resolved; reviewed ([review](./reviews/device-batch-2026-06-11.md)); **merged 2026-06-11 (maintainer)** on integration/0.1.x ([task](./tasks/U3-003/)) |
| U3-004 | Unit 3 | ratify | ready-to-merge | no | — | FX-006 | U3-001 | docs: `22` BYO `.metal`/`.agsl` registration contract ratified; [detail](#u3-004--byo-registration-contract) |
| U3-005 | Unit 3 | device-verify | merged | yes | — | REAL-002, REAL-003 | U3-001 | headless-done + docs-closed (2026-06-09); REAL-002 build-verified on Xcode 26.5; REAL-003 path recorded in `structure.android.md`; both ledger rows resolved; reviewed (approved, incl. fix-round addendum); merged on integration/0.1.x; [detail](#u3-005--shader-asset-packaging--runtime-load-proof) · [review](./reviews/U3-005.md) |
| U3-006 | Unit 3 | implement | merged | yes | FX-004, REAL-004 | — | — | 10 MSL `[[stitchable]]` + 10 AGSL shaders; hosted dispatch on iOS + Android; `ShaderId` = 10 ids; headless green; **device-verified iOS + Android (2026-06-08)**, incl. blank-on-switch + intensity-flicker fixes; docs-closed (`22` reconciled); reviewed + confirmed by maintainer (2026-06-09); merged on integration/0.1.x; [detail](#u3-006--curated-shader-implementation) |
| U3-007 | Unit 3 | implement | device-pending | yes | FX-009 | — | DOC-008, U3-001 | iOS `.symbolEffect` via hosted slice; Android planned rung skipped by `select()`; A1-1 `replaceWith` fix device-evidenced and maintainer-ratified (2026-06-10); device gate held ONLY for the A1-2 OS-degradation rows — needs a real iOS 17 / sub-17 device (maintainer chose not to waive); [detail](#u3-007--ios-symbol-effect) |
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
| U5-001 | Unit 5 | implement | spec'd | yes | RT-013 | RT-013 | U4-001 | device: post-layout frame read natively; spec'd by the planner (2026-06-11) — [task](./tasks/U5-001/) is the work order; RT-013 closes only on the device gate |
| U6-001 | Unit 6 | implement | todo | yes | RT-007 | RT-007 | U4-001, U5-001 | device: interruptible spring, no snap; spring dispositions pre-ratified (DOC-009) — see [preflight](./tasks/U6-001/preflight.md) |
| U6-002 | Unit 6 | device-verify | todo | yes | — | RT-016 | U6-001 | device: animators handle hard retarget, else build integrator |
| U6-003 | Unit 6 | device-verify | todo | yes | — | MOT-002, REAL-001 | U6-001 | device: tune formulas feel right; M3 floor + fallback |
| U7-001 | Unit 7 | implement | todo | yes | MOT-001 | — | U6-001, DOC-018 | device: presence FSM + deferred-unmount handshake; preflight done — see [preflight](./tasks/U7-001/preflight.md) (verdict: sound — JS mount retention validated without the commit hook; the `35` React-semantics rows resolved to FSM rules) |
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
| DEF-014 | 3-motion | implement | blocked | yes | — | — | trigger: V1 shipped | critique F7 (maintainer-accepted 2026-06-10): pull the iOS-hosted `source` rung (`scrollTransition`/`visualEffect`, Android deferred) forward as the FIRST V1.x task — scroll-linked presentation is the category's demand center |
| DEF-015 | 1-surface | ratify | blocked | no | — | — | trigger: surface freeze (Unit 5/6 design) | critique F17 (maintainer-accepted 2026-06-10): one naming-review pass before the surface freezes — `<Fx effect={fx.effect.*}>` stutter, `interactionMode` runtime vocabulary, `hosted`/`expo-view` mechanism leakage. **Now also owns the package-name call (F15):** the npm name is claimed as `react-native-fxkit` (unscoped `react-native-fx` is unclaimable — npm typosquat filter vs `react-native-fs`); decide whether the product/repo identity adopts `fxkit` or keeps `react-native-fx` as the product over a `fxkit` package |
| DEF-016 | 6-ship | implement | blocked | no | — | — | trigger: pre-publish | critique F13: coexistence matrix (RNGH, Reanimated-alongside, navigation, Expo Go/web) + per-capability parity/degradation story + the platform-exclusives positioning in `skills/`. **Also (F15):** align `packages/package.json` `name` (currently `react-native-fx`, an unpublishable name) and all README/skills/doc references to the published name per DEF-015's call, before the real `0.1.0` ships |
| DEF-017 | 6-ship | implement | blocked | no | — | — | trigger: post-V1 | critique F16: simulator smoke lane in CI (mount each catalog id, screenshot, diff) — catches the blank-on-switch regression class headlessly |

## EX-002 — 100-cell mixed-effect stress list

Type: `implement` · State: `device-pending` · Device: yes · Consumes: — · Closes: — (critique-routed F14, no ledger row) · [task](./tasks/EX-002/)

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
