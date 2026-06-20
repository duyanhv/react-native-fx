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
| DOC-023 | 7-impl / cross | doc-cleanup | merged | no | — | — | — | mechanical stale sweep — reconciles 07 + canonical-plane text to ratified source/shipped code (audit-2026-06-18 §F). **Reviewed + committed 2026-06-18.** WIP deletions deliberately held. Full scope in [detail](#doc-023--mechanical-stale-sweep) |
| DOC-024 | 7-impl | doc-cleanup | merged | no | — | — | — | as-built V2 addendum (audit-2026-06-18 §A1). **Reviewed (maintainer) + merged on integration/0.1.x (this commit).** `blueprint.md` "Phase A: As-built V2 addenda" (A1–A4) + `architecture.md §11` table — each maps a shipped-but-untracked mechanic to its ledger, native/JS code, owning source doc, and the future work it enables: `source`/`Fx.Scroll`/`fx.source.*` (DEF-014, iOS-hosted rung only), `controlled` ref writes `setUniform`/`setHighlight` (DEF-020), `dragAxis`/drag-tilt (DEF-011), runtime shader registration/compile (DEF-008). Verified against the real `packages/` tree. §11 also flags the §1 target-tree drift → DOC-025. Closes the Phase-S-class gap for merged mechanics |
| DOC-025 | 7-impl | ratify | merged | no | — | — | — | A2 triage (audit-2026-06-18 §A2), **maintainer-ratified 2026-06-18 + merged on integration/0.1.x (this commit); recorded in [`a2-triage.md`](./a2-triage.md).** Build now: typed **material** config (native-backed uniforms only → proposed Unit 15). Defer: `clock`, SDF (DEF-019), app-state/`cadence` coordinator, `getUniform`, JS preset resolver (surface resolves `preset` natively — no consumer), `palettes`/`themes` (no design-token layer until forced). Narrow (manifest over-promise, verified vs `packages/`): **pre-Unit-10** — both `filter` (no native renderer) and `fill` (declared colors/angle ignored by the native renderers) narrowed to the rendered subset; plus `palettes`/`themes` (`50`) and `fx.effect.*` fill/symbol terminal steps (`55`). `fill` colors/angle/kind wire-through spawned as later Phase-S. Record-as-built: `fx.motion.*`, reduce-motion gating, teardown. Spawned rows listed in the doc, for maintainer to register |
| DOC-026 | 0-spine | ratify | merged | no | — | — | — | promote `wip/capability-boundary-classifier.md` into canon `04`/`05` (audit-2026-06-18 §E; executes the 04/05 classifier-vocabulary slice of DOC-021 §1). **Merged `c0905c2` on integration/0.1.x (maintainer tick delegated 2026-06-19; awaiting push).** `04 §The presentation boundaries (A / B / L)`: A/B/L taxonomy + cross-tree-frontier warning + the sorting rule + a condensed nine-question gate (Q1–6/Q9 in `04`; source-channel/memory-policy/substrate-depth point to `05`, not duplicated) + "Boundary L empirically absent" + new Decision 8. `05 §Capability mechanism`: source-channel + substrate-depth axes, escalation-regimes table, Lane 1/Lane 2 ownership split, the falsifying test; **`05 §Decision 5` cite repointed** from the WIP to the new in-doc section (the correctness fix). WIP doc: **top banner only** (promoted → `04`/`05`, retained for derivation history — the shipped-primitive table, descriptor schema, stress cases deliberately NOT promoted). **Scope held narrow:** classifier only — no Lane 1 contract, no `02` edit (verified no `02` line needs a pointer; A/B/L is ownership vocab, not a manifest node), no feeder-WIP repoint sweep (→ DOC-030); the descriptive ledger row stays with DOC-021. Pure additions, no neighbor churn |
| DOC-027 | 7-impl | doc-cleanup | merged | no | — | — | — | record-as-built addendum (audit-2026-06-18 §A2 / DOC-025). **Merged `34d728b` on integration/0.1.x (maintainer tick delegated 2026-06-19; awaiting push).** Reviewed (maintainer 2026-06-19): three findings fixed pre-commit — traceability span made precise (A5 Unit 7 / A6 Unit 6 / A7 Units 4/6/7), the bad `42 §Presence motion` anchor repointed to real headings, the §11 heading broadened to cover both as-built classes. Added "Within-Unit mechanics not recorded at object granularity" to `blueprint.md` Phase A (A5–A7) + a matching `architecture.md §11` sub-table — three mechanics shipped inside tracked Units (A5 Unit 7, A6 Unit 6, A7 across Units 4/6/7; no DEF row), pinned at file granularity for their cross-platform divergence: `fx.motion.*` builders (A5 — `src/motion/builders.ts` + `src/fx.ts`, U7-001), reduce-motion driver gating (A6 — `FxAnimationDriver.{swift,kt}` `shouldReduceMotion`; the Android `areAnimatorsEnabled()`/`*_SCALE==0` manual gate vs the free iOS `UIAccessibility` read; DOC-010/MOT-010), idempotent teardown order (A7 — `31 §Idempotent teardown`; loop-first ordering + the `35` mid-exit no-leak edge). All file/symbol refs verified against `packages/`; docs-only, no internal-id leakage into code |
| DOC-028 | 7-impl | doc-cleanup | merged | no | — | — | — | reconcile `architecture.md §1` target tree (audit-2026-06-18 / the DOC-024 §11 drift note). **Merged `1d2264b` on integration/0.1.x (maintainer tick delegated 2026-06-19; awaiting push).** §1's JS `src/` tree is status-reconciled against the real `packages/` tree (every file tagged `[shipped]` / `[Phase-S]` / `[deferred]`): added the omitted shipped files (`src/source/`, `surface/FxScroll.tsx`+`presenceMachine.ts`, `effects/registry.ts`, `runtime/FxScrollView.*`+`FxSurfaceView.types.ts`, `fx.ts`, `manifest/{manifest,config}.ts`), fixed stale names (`motion/MotionSpec.ts`→`builders.ts`, dropped the non-existent `effects/types.ts`), marked the four Phase-S surface units + `presets/{defaults,palettes,themes}` deferred (`presets/types.ts` is a TODO stub). Native sub-trees marked **illustrative** (not enumerated — outside this row's JS-tree charter; §11 + the real dir are authority) and the §11 drift note flipped to reconciled. All verified against `packages/` |
| DOC-029 | 1-surface | doc-cleanup | merged | no | — | — | — | source-doc narrowing (audit-2026-06-18 §A2 / DOC-025). **Merged `1a32e38` on integration/0.1.x (maintainer tick delegated 2026-06-19; awaiting push).** `50 §Presets/palettes/themes`: palettes/themes marked **deferred — no V1 consumer / not a design-token layer**, plus a V1-resolution-status note (the `preset` bundle resolves **natively** in shipped V1 — `FxPresence` passes it raw; the `src/presets/` JS resolver is deferred, no consumer) + a matching narrowing on Decision 5. `55 §EffectStep.node`: a V1/Unit-11-scope note narrows the exposed builder steps to the **backed** set — `shader`/`material` exposed, `fill` to its rendered intensity subset (U3-009), `filter` `status:'planned'` (U3-009), `symbol` stays a single-layer `<Fx effect>` mount — so Unit 11 ships **no `fill`/`symbol` terminal steps and no `filter`**. Pure additions, no neighbor list-churn; grounded in a2-triage Outcomes 2/3 |
| DOC-030 | wip | doc-cleanup | merged | no | — | — | — | WIP cleanup (audit-2026-06-18 §E), **expanded with the DOC-026 classifier-feeder sweep** (maintainer-approved 2026-06-19). **Merged `5278e4c` on integration/0.1.x (maintainer tick delegated 2026-06-19).** Retired `interactive-glass-touch-delivery.md` (folded into `structure.ios.md` §material / `01` d6) and `critique-2026-06-10.md` (findings dispositioned into rows) — both **kept as evidence records with a retired banner, not deleted** (canon cites the glass spike as provenance; the critique self-declares "the evidence record"). Repointed every classifier feeder off the now-historical `capability-boundary-classifier.md` to canon `04`/`05` — grep-driven sweep across `lane1-signal-grammar`, `lane1-declarative-surface`, `anchored-reveal`, `interactive-content-distort`, `native-slot-layout-transitions`, `native-animation-api-extraction` (the two "source of truth" claims removed); classifier WIP left as derivation history. Moved all three into a new `wip/README.md` "Retired / historical" section. `capability-boundary-classifier.md` NOT deleted (kept historical with the DOC-026 banner). Task-layer cites (`tasks/DEF-006`, `tasks/DOC-021`) left as frozen audit trail. **Housekeeping bucket (DOC-027→030) complete.** |

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

### Surface build / Phase-S — the JS public surface (Units 10–15 + prereqs)

The components and builders `1-surface/` specifies and `6-ship/52 §Public exports` names as the V1
stability contract (`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`). The original
`blueprint.md` scoped the surface layer out and delegated it to `1-surface/` design docs; no unit ever
decomposed it, so the runtime engine (Units 1–9) shipped and was device-proven while the front door it
feeds went untracked. `blueprint.md` Phase S decomposes them; all depend only on already-merged runtime
units. **`Fx` (`<Fx effect>`) + `EdgeGlow` shipped + device-verified (U10-001, 2026-06-19); the
`fx.effect.*` builder shipped + device-verified (U11-001, 2026-06-20); `FxPressable` shipped +
device-verified (U13-001, 2026-06-20)** — the canonical front door, its builder escape hatch, and
native press feedback are live. Still unbuilt: `FxView` (U12), `FxGroup`/`FxItem`
(U14), typed material (U15), and the symbol string surface (U10-002). Decision rows these consume
(SURF-008/DEF-004, etc.) are already resolved — these are the build tasks that realize the ratified
surface, and close no new ledger row.

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| U10-001 | Unit 10 | implement | merged | yes | — | — | — (Units 1/2/3/8 + U3-009 merged) | **MERGED on integration/0.1.x (device-verified + reviewed + docs-closed 2026-06-19; maintainer-delegated ticks).** The canonical `<Fx effect="id">` front door + `EdgeGlow` + the `Fx` callable. `src/effects/effects.ts` resolver (single id→node source, conformance-tested) + `src/surface/Fx.tsx`. **6/6 PASS on iOS 18 sim + POCO F1.** Review folds: `symbol` removed (→U10-002); web crash guard; interactive-shader harness re-pointed `aurora`→`dots` after the reviewer caught aurora is hosted-only on iOS (interactive raster is a 5-shader subset — now documented in `50`). Code `c461a0d`; harness `dec8c4e`. Deferred follow-up: model per-shader interactive capability in the manifest (select-time vs runtime degradation). [task](./tasks/U10-001/) · [detail](#u10-001--fx-effectid-the-effect-surface-front-door--edgeglow) |
| U10-002 | Unit 10 | implement | todo | yes | — | — | U10-001 | **SPAWNED from U10-001 review (2026-06-19).** The symbol string-form public surface, deferred from U10. Decide + build: the zero-config `symbol-*` ids (`24-symbols §58`: `<Fx effect="symbol-bounce" />`) + the default symbol / name-resolution rule (a symbol needs `SymbolConfig.name` — what does a zero-config `symbol-*` render?), OR route the explicit `{name, animation}` config through the Unit 11 `fx.effect.*` builder form. Grounded in `24-symbols` + the iOS `FxSymbolView` / `setSymbolConfig` path (Android symbol is deferred, AVD/Lottie planned). Design-then-build; NOT YET SPEC'D. |
| U11-001 | Unit 11 | implement | merged | yes | — | — | U10-001 (merged) | **MERGED on integration/0.1.x (device-verified + reviewed + docs-closed 2026-06-20; maintainer-delegated ticks).** `fx.effect.*` builder (`.glow`/`.glass`/`.mesh` + `.animate`/`.defaults`) → immutable `EffectStack`; `<Fx effect={stack}>` widened to `EffectId \| EffectStack`, reusing U10's resolve→select→mount path for the stack's **one** backed render-target (builder form for one effect — NOT composition). Single-render-target guard dev-warns + no-ops. New `src/effects/stack.ts`; `src/fx.ts`/`Fx.tsx`/`index.ts` widened; **138 tests**. Builder `6491fc2`; harness `77a9b1b`. **Device gate 5/5 PASS on iOS 18 sim + POCO F1** — `fx.effect.glow/glass/mesh` render identically to `edge-glow`/`glass`/`mesh-gradient`; the two-render-target chain renders the first step only. Reviewer cross-checked the four screenshots independently; one honest caveat (the Metro warning text was not captured verbatim — held non-blocking: the LogBox toast proves a warn fired, the first-step-only render is the same guard branch, and the warn is headless-unit-covered). **Review folds (gates re-run each round):** readonly fields + `Object.freeze` builder/steps; guard-test `console.warn` suppression; "compositor unit"→"compositor support" (comments-guide); **Fx-level multi-step guard** (hand-built `EffectStack` >1 step → dev-warn + render first, not just builder-origin); **deep clone+freeze** of nested `config`/`transition`/`spring`. `.animate`/`.defaults` recorded, NOT wired (no effect-transition channel). [detail](#u11-001--fxeffect-builder--effectstack) |
| U12-001 | Unit 12 | implement | todo | yes | — | — | U10-001 (+ Units 4/6 merged) | `FxView` — state-driven content presentation (`state`/`preset`/`motion`/`effect`/`transition`); `lift` preset, `idle`/`selected` vocab; wires the unbuilt `onFxStateChange` native dispatcher. NOT YET SPEC'D. |
| U13-001 | Unit 13 | implement | ready-to-merge | yes | — | — | — (Unit 8 merged) | **DEVICE-VERIFIED + REVIEWED + DOCS-CLOSED (2026-06-20); READY TO MERGE — local commits only, awaiting maintainer merge-tick + push.** `FxPressable` over the shared `FxPressHandler` FSM (host protocol: `<Fx interactionMode>` + new `FxPressableView` content host). Three review rounds resolved: unregistered views / un-activated recognizer / two effect-surface regressions (round 1); the event pipeline was killed by removing `Events(...)` to dodge `topPress` (round 2 — fixed via `onFx`-prefixed events + JS mapping); the Android black square (null-shape ripple mask → `RectShape` mask) and the small inscribed ripple (→ container pressed-state drive + `RADIUS_AUTO` full-cover, **Option A**); plus a comment-density pass. **Device-verified, full matrix PASS both platforms (maintainer-confirmed):** mount, feedback (iOS scale/opacity, Android full-cover ripple), event order, long-press suppression, cancellation + scroll-yield (`onPressOut` only — the agent-gate FAILs were synthetic-gesture artifacts), rapid re-press, and `<Fx interactionMode>` no-regression. **Gates green both platforms:** lint/build/138 tests/example tsc; iOS `xcodebuild` (after `pod install`); Android `compileDebugKotlin`/`assembleDebug`. **Docs-closed:** `structure.{ios,android}.md` feedback mechanic; `57`/`56` `feedback="native"` device-verified; blueprint Unit 13 Shape note corrected (native unit, not "JS/Surface"). Full record: [reviews/U13-001.md](./reviews/U13-001.md) + [evidence/device.md](./tasks/U13-001/evidence/device.md). [task](./tasks/U13-001/) |
| U14-001 | Unit 14 | implement | todo | yes | — | — | — (Units 1/3 merged) | `FxGroup`/`FxItem` — the morphing compound over `FxGroupView`; glass-only morph in V1 (DOC-006), `spacing` deferred V2. NOT YET SPEC'D. |
| U3-009 | Unit 3 | rework | merged | no | — | — | — (Unit 3 merged) | **MERGED `360e651` on integration/0.1.x (reviewed + docs-closed 2026-06-19, planner; maintainer merged-tick delegated).** Narrowed the `fill`/`filter` manifest over-promise (audit-2026-06-18 §A2 / DOC-025, ratified). `fill.uniforms`→`{}` (six ignored uniforms removed; `FillConfig` derives exact `Record<string,never>`, pinned by assertion); `filter` both rungs `status:'planned'`→`select()`={via:'none'}. **Review folds (maintainer-directed):** trimmed the over-promising `fill` lowering rungs — iOS lost `clock`/`cadence`; the unbacked Android AGSL rung removed, remaining rung corrected to the static `LinearGradient` the renderer draws. **Canonical-mirror alignment:** the same false fill contract lived in five docs — aligned `02 §Worked examples`, `structure.{ios,android}.md §fill`, `data-layer.md` (node mirror + catalog row), `20-fills`/`23-filters` to the static V1 reality + one-line deferral each (configurable colors/angle/kind/mesh = the deferred wire-through). Gates re-run by reviewer: tsc/lint/build clean, 93 tests pass. `device: no`. Deliberate leaves: `blueprint.md` flip-trigger example + `22-shaders.md` fill-vs-shader parenthetical (deferred-design refs). `fill` wire-through = spawned Phase-S follow-up |
| U15-001 | Unit 15 | implement | todo | yes | — | — | — (Unit 3 merged) | typed **material** config (audit-2026-06-18 §A2 / DOC-025, ratified Phase-S build) — extend `MaterialConfig` + the `material` manifest node + the `ConfigFor` lockstep with native-backed uniforms (`tint`/`colorScheme`/`weight`) **only as iOS `UIGlassEffect` / Android material back each**; never a uniform native ignores (the `fill`/`filter` trap) |

### Deferred — V2 / trigger-gated, not actionable now

| id | unit | type | state | device | consumes | closes | blocked by | proof |
|----|------|------|-------|--------|----------|--------|------------|-------|
| DEF-001 | 0-spine | ratify | blocked | no | — | SPINE-008 | trigger: BYO/novel demand | the build-time shader/effect emitter |
| DEF-002 | 0-spine | ratify | blocked | no | — | SPINE-010 | trigger: per-child control | reconsider Nitro / raw Fabric |
| DEF-003 | 1-surface | ratify | merged | no | — | SURF-007 | — | **MERGED on integration/0.1.x (this commit). Ratified Option A (maintainer, 2026-06-14): no fx portal primitive — placement stays the app's job (root-level / the app's portal / RN `Modal`); rules #5/#9 + `54` Decision 4.** fx guarantees portal/`Modal` *coexistence* instead, under the **coordinator-placement invariant** (portal the rendered output, never the `FxPresence` coordinator — same failure mode as the `42` scope ceiling). **SURF-007 resolved.** Docs-closed (planner, 2026-06-14): `54` (new § Placement & portal coexistence + Decision 4 + open question), `42` (scope-ceiling cross-ref), ledger SURF-007 `deferred`→`resolved`. Reviewed — no separate doc (DOC-002/003/005 ratify convention). No code, no device gate. **Fully closed.** [task](./tasks/DEF-003/) |
| DEF-004 | 1-surface | ratify | merged | no | — | SURF-008 | — | **MERGED on integration/0.1.x (this commit). Ratified (maintainer, 2026-06-14): REJECTED — no `Fx.Stack`/`Fx.Layer`/JSX compound. The `fx.effect.*` builder *is* the stack API.** Reframed from `implement` to a ratify-reject: binding to the contract showed the build would overturn `50` Decision 4 (config-children must be props — an `EffectStack` composites in one `<Fx>` surface, one bridge crossing) and `55` Decision 6 (no separate `FxLayer`); consistent with `Fx.Scroll`'s data-not-children precedent (DEF-014). **SURF-008 resolved (rejected).** Docs-closed (planner, 2026-06-14): `55` Decision 8 + open question resolved; ledger SURF-008 `deferred`→`resolved`. No code. Reviewed — no separate doc. **Fully closed.** [task](./tasks/DEF-004/) |
| DEF-005 | 3-motion | ratify | merged | no | — | MOT-004 | — | **MERGED on integration/0.1.x (this commit). Ratified (maintainer, 2026-06-14): REJECTED — no top-level `edge`/`origin` sugar. `FxPresence` keeps the binary: `preset` (full platform-native shape+timing) or an explicit `motion` map (cross-platform shape override, platform timing preserved unless `transition` overrides).** Rejected because it blurs the shape-native law, duplicates the `motion` map (which already gives "platform timing + chosen edge"), and conflicts with no-implicit-reverse. **MOT-004 resolved.** Docs-closed (planner, 2026-06-14): `41` Decision 14 + open question (recipe pinned), `54` (motion-map note), `50` (prop-row cross-ref), ledger MOT-004 `deferred`→`resolved`. No code. Reviewed — no separate doc. **Fully closed.** [task](./tasks/DEF-005/) |
| DEF-006 | 3-motion | implement | blocked | yes | — | MOT-007 | trigger: a real app-owned continuous-source integration is needed | **OPTIONAL app-owned integration spike (re-scoped 2026-06-15) — [task](./tasks/DEF-006/); NOT on the DEF-011 path.** The optional UI-thread tier of the `source` driver (MOT-007): an **app-owned** Reanimated shared value driving an fx-exposed UI-thread-animatable prop off the JS thread. **Rule #7 clean (depth-1, per the DOC-021 narrow ratification):** Reanimated is the caller's transport — NO fx worklet/JSI, no Reanimated dep in `packages/`, no fx `createAnimatedComponent`. **Does NOT drive or unblock DEF-011** — fx-owned drag/tilt is native (route 1, DEF-011). Trigger-gated: spec the spike only when a real app-owned continuous-source integration is needed (prove Reanimated can drive an fx prop on the UI thread with the JS thread pinned). |
| DEF-007 | 3-motion | ratify | merged | no | — | MOT-008 | — | **MERGED on integration/0.1.x (this commit). Ratified (maintainer, 2026-06-14): RESOLVED BY COMPOSITION — the premise is false.** fx hardcodes no shader-internal intro/outro envelope for curated effects either (curated = native `time` + eased `intensity`; appear/disappear = the `FxPresence` wrapper envelope). BYO reaches full parity by construction via the same three channels: `FxPresence` whole-surface lifecycle, native `time` in-shader, and semantic uniforms eased by `transition` / re-fired by `triggerKey`. **No BYO envelope mechanism, no reserved lifecycle uniform — and not deferred-until-demand** (a reserved uniform would be a new feature that must apply to curated too). **MOT-008 resolved.** Docs-closed (planner, 2026-06-14): `40` + `34` open questions struck (three-channel contract), `22` runtime-behavior note, ledger MOT-008 `open`→`resolved`. No code. Reviewed — no separate doc. **Fully closed.** [task](./tasks/DEF-007/) |
| DEF-008 | 2-effects | implement | merged | yes | — | FX-007 | — (V2 active) | **MERGED on integration/0.1.x (this commit). FX-007 closed.** **DEVICE GATE PASS — all 6 rows, both platforms (iPhone 17 Pro sim / iOS 26.5 + POCO F1 / API 35, 2026-06-14).** app-pulse compiles+renders animated/intensity-reactive; app-broken → onFxError no crash; cache no-recompile confirmed (iOS process-wide pipeline cache; Android per-view RuntimeShader); app-ios-only renders iOS / silent {via:'none'} Android; iOS lowers through FxSurfaceView (expo-view) per the spike; curated unregressed. Evidence in `evidence/device.md`. **RECOVERY (planner, 2026-06-14):** the device-gate agent accidentally `git checkout`-reverted the uncommitted DEF-008 work in `FxSurfaceView.swift` + `FxSurfaceShaderView.kt` while undoing instrumentation; git could not recover (never staged). Restored **verbatim from the review diffs** (diffstat re-matched 79/61 exactly) — gates re-green incl. iOS `xcodebuild` + Android `compileDebugKotlin`. **REVIEW REFINEMENT (planner, 2026-06-14, maintainer-flagged):** renamed `pipeline→curatedPipeline`, `resolvedPipeline→pipeline` (the name was hiding a runtime-compile side effect) + added a native curated-id stop (an iOS `curatedShaderIds` mirror, matching Android) so "curated ids win" is native-enforced, not JS-dependent — *behavior-preserving* (a curated id with a registered source is JS-impossible). Re-gated: tsc/lint/swift:lint/72 tests + iOS xcodebuild BUILD SUCCEEDED. **Next: docs-closed (FX-007 in `22` + ledger; cache-divergence note) then merge.** **Headless review PASS (planner, 2026-06-14).** Gates re-run independently (tsc/lint/swift:lint/72 tests); surface contract fully implemented + tested (8 registry tests); spike accepted as headless-definitive; rules #1/#2/#5/#7 gated; comments provenance-clean; the generalized `scanUniforms` (guards time/resolution/intensity) is a correct API-33-abort defense. **For docs-closed (planner):** the "cache by source" contract is iOS-satisfied (immutable `MTLRenderPipelineState`, process-wide); on Android a compiled `RuntimeShader` is *mutable* (holds per-view uniform state) so it cannot be shared across surfaces — per-view construction is the necessary platform divergence, to be noted in `22`, not a defect. No executor fixes owed. **headless-done (agent, 2026-06-14).** **Spike resolved → NO:** SwiftUI `.colorEffect` cannot consume a runtime `MTLLibrary` (no public `ShaderLibrary` init over `MTLLibrary`/`MTLFunction`/MSL source, iOS 26.5 SDK), so runtime shaders lower through the **expo-view Metal path even for decorative use** (recorded in `structure.ios.md` § shader). Shipped: JS `registerShader` + registry (collision→curated wins, both-absent reject, idempotent/clean-replacement re-registration, pair-rule null-push) + types + index export; iOS `FxShaderRegistry` + `FxModule.registerShader` + `FxSurfaceView` runtime compile via `makeLibrary(source:)` (fixed `fx_fragment` ABI + prepended preamble, cache by source string); Android `FxShaderRegistry` + `FxModule.registerShader` + `FxSurfaceShaderView`/`FxSurfaceView` AGSL-from-registry (guarded uniform writes incl. time/resolution/intensity, malformed→catch→GONE), registry-aware load/error dispatch; example DEF-008 demo (`runtime-shader.tsx`: working/malformed/iOS-only). Gates green: packages tsc/build/lint/swift:lint/72 tests (8 new registry Tier-1); example tsc; iOS `pod install`+`xcodebuild` **BUILD SUCCEEDED**; Android `:react-native-fx:compileDebugKotlin` **BUILD SUCCESSFUL**. Device gate (6-row runbook in `evidence/device.md`) owns FX-007 closure. Original spec ↓ — Registry-sourced runtime shader compilation — `registerShader({ id, uniforms, source: { ios, android } })` compiles at runtime; `<Fx effect="id" />` stays the only consumption surface (Option A, maintainer-confirmed; no `<Fx source>` prop). The DX win: app-side BYO with no build-path placement and no config plugin (lifts the `22` D6 V1 constraint). **iOS hosted path is a SPIKE-first gate:** no public `ShaderLibrary(source:)` (iOS 26.5 SDK) — `makeLibrary(source:)` serves the expo-view raster path; the spike decides whether SwiftUI `.colorEffect` can consume a runtime `MTLLibrary` (if not, runtime shaders lower through expo-view even for decorative use). Android already runtime-compiles `RuntimeShader` (small delta: accept AGSL from JS). Pinned: dual MSL+AGSL still required (single-source = DEF-001), curated ids win on collision, missing-platform → `{via:'none'}`, compile failure → `onFxError`, cache by `(platform, sourceHash, fn, opts)` not id, explicit re-registration/invalidation rule. No preflight (first-party APIs). Mechanic framework pinned in `structure.{ios,android}` § shader. [task](./tasks/DEF-008/) |
| DEF-009 | 2-effects | implement | merged | yes | — | FX-008 | — (V2 active) | **MERGED on integration/0.1.x (human-delegated tick, 2026-06-15; finishing commits already in — `ee69c1a` + the asset refactor `5ef3fc7`/`9ba02b1`/`090f737`). FX-008 closed.** Asset re-gate fully closed: **headless** — fresh `:react-native-fx:compileDebugKotlin --rerun-tasks` (393 executed) + `:app:assembleDebug` SUCCESSFUL, `unzip -l` confirms `assets/shaders/content_ripple.agsl` (552 B) INSIDE the built APK beside the 10 device-proven siblings (this build also recompiled the post-DEF-009 Android review-fix commits `5c32983`/`57bc2dc` green); **device R1 PASS (run 3)** — heading + both buttons visibly warped on first render from the bundled asset (default `rippling=true`, no toggle), warp phase shifts between frames confirming the loop runs, ~59.9 fps, planner-eyeballed (`evidence/device-run3.md`). Prior 7/7 (inline build) + run-3 R1 (asset build) = asset-load path device-proven; FX-008 already RESOLVED in the ledger + docs-closed. ↓ prior trail — **ASSET RE-GATE HEADLESS PASS + 7/7 device on the inline build (`495fbe5`).** ↓ further trail — **DOCS-CLOSED + 7/7 device-verified ON THE INLINE BUILD (`495fbe5`).** **Post-device housekeeping (maintainer, `FxContentDistortion.kt` + new untracked `assets/shaders/content_ripple.agsl`, ~08:50, AFTER the 08:38 run-2 APK):** the ripple sampler moved out of the inline Kotlin const into the private AGSL asset, loaded via `AssetManager` — aligns with the sibling `FxSurfaceShaderView`/`FxShaderView` curated-asset idiom (idiomatic, good), null-on-missing-source no-op guard. BUT built/verified state is the inline const; the asset-load path is **device-unverified** (new failure mode: if the asset does not merge into the APK, `ensureShader()→false` and the ripple silently no-ops) and the note's Housekeeping section carries no re-gate line. **NEXT: re-run headless (`:react-native-fx:compileDebugKotlin --rerun-tasks` + `:app:assembleDebug`, confirm `content_ripple.agsl` lands in the APK assets) + a bounded device re-confirm (R1 first-render ripple still renders from the bundled asset) → then ready-to-merge.** ↓ **Device RE-GATE (run 2, POCO F1 / API 35, fresh `:app:assembleDebug` from `495fbe5`, APK `08:38:24` verified newer): 3/3 PASS** — R1 first-render ripple (default `rippling=true`, no toggle), R2 navigate-away→back animates again, R3 background-pause resume; the loop-start fix proven, other rows unaffected → run-1 6/7 + run-2 3/3 = **7/7 overall** (`evidence/device-run2.md` + `run2/`). **DOCS-CLOSED (FX-008):** `02 §content-distort` prose flipped (was "merely planned on Android"); `23 §Open questions` resolved (the content-filter wrapper ships); `data-layer.md` I5 reconciled + the Android rung's stale `status:'planned'` removed to match `02`; loop-start (container's-own-attach) + per-frame-refresh mechanic pinned in `structure.android.md §content-distort`; ledger FX-008 `deferred`→`resolved`; `reviews/DEF-009.md` written. Stray `react-native-gesture-handler` dep bump the gate agent left was reverted (tree clean). ↓ prior trail — **DEVICE RE-GATE (pre-run-2) after a device-found defect + fix (2026-06-15).** **Device gate run 1 (POCO F1 / API 35, build `a89d2fb`): PARTIAL — 6/7 PASS, one blocking defect.** PASS: live child touch-through (the load-bearing draw-time-survives claim — Increment/Second both fired through the active ripple), intensity-tracks-live, background/detach pause (rule #1, logcat-proven stopLoop + 5 s silence + resume), pre-33 (code-reasoned residual — no sub-33 host; the `SDK_INT < TIRAMISU` early-return precedes any RuntimeShader/RenderEffect ref), iOS no-op; distortion + animation PASS *when the loop is active*. Perf note: the conservative per-frame `setRenderEffect` ran ~60 fps on one surface — keep it, no motivation for `invalidate()`-alone. **BLOCKING DEFECT (device-root-caused): the ripple never started on first mount or after navigate-back** — `startLoop()` was gated on the content container's attach state, but the parent `FxNativeView.onAttachedToWindow → resume()` fires *before* the child container attaches (ViewGroup dispatches the parent's onAttachedToWindow ahead of child attach), so resume saw `attached=false` and bailed with no retry; background→foreground worked only because the view stays attached. **FIX (rework, 2026-06-15, `FxContentDistortion.kt` only, +19): the helper registers a `View.OnAttachStateChangeListener` on the content container** — `onViewAttachedToWindow → startLoop()` if enabled, `onViewDetachedFromWindow → stopLoop()` — the correct attach timing, mirroring how the sibling `FxSurfaceShaderView` (a View) self-manages; `update()/pause()/resume()` untouched (isLooping/stopLoop keep it idempotent); inert below API 33 (isEnabled never flips). Planner-reviewed clean + re-gated green (lint 36 / tsc / 73 tests / swift:lint / forced `compileDebugKotlin --rerun-tasks` 58 executed). Committed pre-re-gate (DEF-008 wipe lesson). **Next: bounded device RE-GATE** — (1) ripple distorts on FIRST render (`rippling=true` default, no toggle), (2) animates again after navigate-away→back, (3) re-confirm background-pause unaffected; other rows already proven → docs-closed (FX-008 in `02` prose + `23` open question + `data-layer` + ledger). ↓ run-1 trail — **headless-done + planner-reviewed clean; committed pre-device (2026-06-14).** Reviewed independently (full diff + all gates re-run by planner, incl. a forced `:react-native-fx:compileDebugKotlin --rerun-tasks` = 58 executed, not cached; iOS `xcodebuild` BUILD SUCCEEDED): surface contract honored exactly (mechanical `contentDistortion='ripple'`, not the public surface; iOS no-op; private AGSL asset not a `ShaderId`; manifest flip + rewritten `select()` preserving planned-skip coverage; genuine in-surface-tappable proof screen), rule #4 clean (RenderEffect on the EXISTING container — children never reparented). **Two-finding fix-round applied + re-reviewed:** (1) rule #1 — `FxSurfaceView.onWindowFocusChanged` added so the continuous content-distort loop pauses when backgrounded-but-attached (was attach/detach-only; sibling `FxSurfaceShaderView` self-manages focus); (2) provenance — stripped a `DEF-009` ledger id from a `content-distort.tsx` code comment, moved it to an on-screen `<Text>` label per the sibling example-screen idiom. Re-gated green. **Committed before the device gate** (the DEF-008 git-checkout-wipe lesson). **Next: Android device gate** (visible distortion + live child touch + animation + off-window pause + pre-33 normal + iOS no-op) → docs-closed (FX-008 in `02`/`23`, data-layer, ledger). Original headless-done log ↓ — **headless-done (executor, 2026-06-14).** Built the full 6-step scope. New `FxContentDistortion.kt` (private `content_ripple.agsl` sampler asset, `RenderEffect.createRuntimeShaderEffect(shader, "content")` on `intermediateContainer`, Choreographer `time` loop, `declaresUniform` guarded writes, `>= TIRAMISU` gate, pause/resume hooked into the presentation loop); `FxSurfaceView.kt` prop+setter+update wiring; `contentDistortion` Prop on Android (wired) + iOS (empty no-op); JS `contentDistortion?: 'ripple'` with `?? ''` clear-coercion; Android `content-distort` rung flipped `planned`→selectable in `02` worked-example + `manifest.ts`; `select()` conformance updated (Android resolves at os33 / none below 33 / iOS none); `content-distort.tsx` example screen (ripple toggle + intensity + two in-surface tappable counters) registered. **Gates green:** packages lint/tsc/build/swift:lint + 73 tests; Android `:react-native-fx:compileDebugKotlin` + `:app:assembleDebug` BUILD SUCCESSFUL; iOS `pod install` + `xcodebuild` BUILD SUCCEEDED; example tsc. Unverified claims + the one framework unknown (per-frame `setRenderEffect` re-call vs `invalidate()`) in `tasks/DEF-009/notes.md`. **Next: Android device gate** (visible distortion + live child touch + animation + off-window pause + pre-33 normal + iOS no-op) → docs-closed (FX-008 in `02`/`23`, data-layer, ledger). Original spec ↓ — **spec'd (planner, 2026-06-14)** — [task](./tasks/DEF-009/). Android content-distort wrapper, **one curated `ripple` demonstrator**: an AGSL sampler (`uniform shader content;`) applied to `FxSurfaceView`'s existing content container via `RenderEffect.createRuntimeShaderEffect(shader, "content")` — draw-time, so live RN children stay touchable (the rule-#4 inverse of iOS, which stays out-of-scope/no-op). API 33+; below 33 content renders normally (`{via:'none'}`). Mechanical native prop `contentDistortion='ripple'` (NOT the long-term public surface; high-level sugar deferred). Mechanic pinned in `structure.android.md § content-distort`. Device proof = visible distortion + live child touch + animated + loop pauses off-window. No spike/preflight (first-party APIs, in-repo `FxSurfaceShaderView` precedent). Next: executor build → device gate → docs-closed (FX-008 in `02`/`23`). |
| DEF-010 | 4-runtime | doc-cleanup | merged | no | RT-001 | — | — | **MERGED on integration/0.1.x (human-delegated tick, 2026-06-15).** stale duplicate retired: `@gorhom/bottom-sheet` coexistence was the RT-001 hard case and closed by U8-002; RT-002 stays with DEF-011's drag/tilt controlled-mode path |
| DEF-011 | 4-runtime | implement | merged | yes | — | RT-002 | — (unblocked; DEF-020 merged) | **spec'd (planner, 2026-06-15) — [task](./tasks/DEF-011/); detail block ↓.** **Native-owned drag/tilt** (re-scoped 2026-06-15 — drag/tilt is fx-owned interaction, so it is **native** (route 1, `40`), NOT routed through the app-owned Reanimated channel; **DEF-006 is no longer a blocker**, it is an optional app-owned integration). Closes RT-002. Scope: a native gesture recognizer (extending the shipped `FxPressHandler`) with **axis-aware claiming/yielding** (claim the shader's drag axis, yield the cross-axis to an ancestor scroller), **pointer-derived tilt only**, **native uniform writes** into the same buffer DEF-020 uses (new drag/tilt scalars added to the iOS `FxUniforms` struct + the Android known set), and **native settle/spring-back** — no per-frame JS, no Reanimated. RNGH stays example-only (coexistence) unless a separate rule-#7 decision proves a `packages/` coupling is needed. |
| DEF-012 | 4-runtime | ratify | blocked | no | — | — | trigger: declarative-state demand (V2) | generalize beyond presence to declarative state. RT-012 was resolved V1-presence-specific in the closeout (DOC-022, 2026-06-13); this spawns a fresh ledger row when the trigger fires (the RT-006→DEF-019 pattern) |
| DEF-013 | 6-ship | implement | blocked | no | — | SHIP-004 | trigger: V2 native mod | config plugin |
| DEF-014 | 3-motion | implement | merged | yes | — | — | — (trigger "V1 shipped" fired 2026-06-14) | **THE V2 OPENER — MERGED on integration/0.1.x (this commit). device-verified (maintainer-ratified — physical confirmed, 2026-06-14; formal hold waived) + reviewed + docs-closed (planner, 2026-06-14).** critique F7 (maintainer-accepted 2026-06-10): the iOS-hosted `source` rung — scroll-linked presentation, the category's demand center. Scoped to the **render-server hosted lane only** (fx-owned SwiftUI `ScrollView` + per-item `.scrollTransition`, `requires {os:17, substrate:hosted}`, `target:'effect'`, drives fx's OWN content per rule #4); the ambient-RN-scroll best-effort tier and Android are deferred (each its own later rung). Shipped: the `source` driver node in the manifest (iOS rung os17/hosted/effect; Android empty ladder; +6 conformance/select tests), the JS surface (`fx.source.scroll`, the provisional `Fx.Scroll` hosted context + native binding with Android/web static fallbacks), the iOS native realization (`FxScrollView` persistent `UIHostingController` + `FxScrollRootView` `ScrollView`/`.scrollTransition`), and the example demo (`source-scroll` screen + registration). Headless green (tsc/build/lint/swift:lint/64 tests; iOS `pod install` + example `xcodebuild` BUILD SUCCEEDED; example tsc; Android `compileDebugKotlin` unaffected — no Kotlin changed). **Headless review round clean (planner, 2026-06-14):** gates re-run independently; 2 findings fixed — stripped 5 `(rule #N)` provenance tags (`commented` gate) and dropped the dead `onFxLoad`/`onFxError` from `FxScrollView`; re-gated green. Design ratifications captured for docs-closed — container-scoped `source` with tiles-as-data (rule-#4-forced, more correct than the spec's per-`<Fx>` phrasing) and `Fx` as a namespace object (forward-compatible with the frozen `<Fx effect>` compound). Surface names provisional — ratify at docs-closed. **Sim smoke test 5/6 PASS (maintainer-run, 2026-06-14; iPhone 17 sim / iOS 26.x; commit `6f9e572`) — NON-AUTHORITATIVE, `device-verified` not ticked:** rows 1–4 + 6 PASS incl. the strong render-server-under-JS-stall proof (rule #1) and a *structural* zero-per-frame-JS proof (the surface exposes no scroll callback — nothing can fire per frame); row 5 (os<17 fallback) NOT-RUN (code-reasoned, trivial `#available` branch). **Finding:** the curated `[[stitchable]]` shaders DO render on the current sim — contradicts the v1-cut-checklist waiver premise (worth reconciling; relevant to DEF-017's sim smoke lane). The sim-only hardware gate was BLOCKED by a CoreDevice tunnel fault; the maintainer **confirmed on physical hardware and waived the formal hold (2026-06-14)**. **Recorded residuals (documented-waiver precedent, U3-007/U8-002):** row 5 (os<17 fallback, code-reasoned) and the A15-GPU perf characterization (not a defined spec row). **Docs-closed done (planner, 2026-06-14):** `02` (node vocab + decision 14 shipped marker), `40` (Escaping-Regime-C route 1 + decision 7 + the resolved open question flipped to shipped-on-iOS), `50` (source in the layers table/prop language/builders + Decision 9 ratifying the surface), `structure.ios.md § source` confirmed; `reviews/DEF-014.md` written. **Follow-up (DONE 2026-06-18):** the shaders-render-on-sim finding vs the `v1-cut-checklist` waiver — reconciled (the waiver premise was corrected: the hosted-path catalog renders on the sim per DEF-014 + DEF-017; hardware now proves only A15 GPU perf/fidelity). DEF-017's CI lane was since removed for cost; its harness is retained locally. **Unit DEF-014 fully closed.** [task](./tasks/DEF-014/) · [review](./reviews/DEF-014.md) · [notes](./tasks/DEF-014/notes.md) · [device runbook](./tasks/DEF-014/evidence/device.md) |
| DEF-015 | 1-surface | ratify | merged | no | — | — | **MERGED 2026-06-13 on integration/0.1.x (this docs-ratification commit).** Surface-freeze naming pass + package identity ratified; recorded in `50` (Decision 8), `55` (Decision 7), `30` (Decision 7 + `controlled` row), `01`/`02` (substrate-vocabulary guard), `52` (Decision 10 reconciled); no ledger row; [task](./tasks/DEF-015/). Decisions: `<Fx effect>`/`fx.effect.*` as-is (no bare export), `interactionMode` `none\|passive\|active` (`controlled`→DEF-020), `hosted`/`expo-view` internal-only, **publish unscoped as `react-native-fxkit`** (d) revised 2026-06-13 from `@react-native-fx/core` — scope needs by-hand org creation; `react-native-fxkit` is already owned/published). **Blocks DEF-016** (mechanical rename only; no scope-claim step) | critique F17 (maintainer-accepted 2026-06-10): one naming-review pass before the surface freezes — `<Fx effect={fx.effect.*}>` stutter, `interactionMode` runtime vocabulary, `hosted`/`expo-view` mechanism leakage. **Now also owns the package-name call (F15):** the npm name is claimed as `react-native-fxkit` (unscoped `react-native-fx` is unclaimable — npm typosquat filter vs `react-native-fs`); decide whether the product/repo identity adopts `fxkit` or keeps `react-native-fx` as the product over a `fxkit` package |
| DEF-016 | 6-ship | implement | blocked | no | — | — | trigger: pre-publish — **publish only after V2 is done (maintainer, 2026-06-14); do not run DEF-016 at V1** | critique F13: coexistence matrix (RNGH, Reanimated-alongside, navigation, Expo Go/web) + per-capability parity/degradation story + the platform-exclusives positioning in `skills/`. **F15 (name decided — DEF-015, revised 2026-06-13):** rename `packages/package.json` `name` `react-native-fx` → **`react-native-fxkit`** (unscoped, already owned/published — no scope-claim step) and align all install/import/README/skills/doc + package-metadata refs; keep API symbols short (`Fx`/`FxPresence`/`FxView`/`FxPressable`/`EdgeGlow`/`fx.effect.*`/`fx.motion.*`); confirm no `skills/` page exposes `hosted`/`expo-view`. Run the package tsc/build/lint/test gates after the rename |
| DEF-017 | 6-ship | implement | resolved (CI lane removed) | no | — | — | trigger: post-V1 (fired) | **CI lane shipped then REMOVED for cost; local harness retained (planner, 2026-06-18). [task](./tasks/DEF-017/).** critique F16: an iOS simulator smoke lane that mounts every `CURATED_SHADER_ID` via the catalog switch and asserts **non-blank** (not golden-image equality) — catches the U3-006 blank-on-switch regression class headlessly. **Shipped (commit `78176af`)** the `ios-smoke` ci.yml job + `example/scripts/smoke-shader-catalog.ts`; reviewed; proven both ways on a booted iPhone 17 Pro sim (green on all 10 ids, variance ~680–5860 vs threshold 120; RED on a reintroduced blank stub, variance 0.0). **Removed (2026-06-18):** the first hosted runs exposed the recurring cost — a ~15-min `macos-26` job (≈10× Linux rate) on every PR/push to `main`, guarding 10 V1-frozen, rarely-changing shaders. The maintainer judged it not worth the spend. The `ios-smoke` job was deleted from `ci.yml`; **`example/scripts/smoke-shader-catalog.ts` + `smoke:ios` are kept as an on-demand local check** (`cd example && bun run smoke:ios` before touching curated shaders). Bring-up fixes committed during diagnosis: `da2672b` (prebuild step — gone with the job) + `10bf282` (harness boot-timeout — kept, harmless for the fast local boot). The "first hosted run GPU-renders Metal" residual is now moot. Device stays the feel/touch gate. |
| DEF-018 | 3-motion | implement | blocked | yes | — | — | trigger: presence-under-navigation settled | the `sheet`/`modal` presence presets deferred from V1 (DOC-018), re-homed from MOT-001 at its closure (U7-003, 2026-06-12): they name screen-scale presentations that collide with presence's scope ceiling (`42`); provisional catalog targets live in `data-layer` §Presence presets; resurrect them through the proven U7-002 catalog pattern (fill → law test → device gate) once presence-under-navigation is settled |
| DEF-019 | 4-runtime | implement | blocked | yes | — | — | trigger: first shaped shader ships | SDF feather/threshold tuning, re-homed from RT-006 at its closure (U8-001, 2026-06-13): V1 ships no shader exposing a shape uniform, so the hit-test runs the `32` D4 full-bounds fallback and there is no SDF edge to feather; the per-frame cost half was device-proven cheap and closed with RT-006. Tune the feather on device when the first shaped shader (a glow/blob with a shape uniform) ships |
| DEF-020 | 4-runtime | implement | merged | yes | — | — | unblocks DEF-011 | **MERGED on integration/0.1.x (human-delegated tick, 2026-06-15; finishing commit `d39a096`, feature chain `d6ba13a`→`e4b1286`). Unblocks DEF-011.** Device spike PASS both platforms (POCO F1 / Android + iPhone 17 Pro sim / iOS 26, fresh builds at HEAD `e4b1286`): R1 discrete write observed, R2 clobber rule (write survives host re-render), R3 `setHighlight` survives re-render (M3), R4 exit-`controlled` restore (M2), R5 loop pause off-window (rule #1) — `evidence/device.md` (+21 gitignored screenshots). One minor coverage note: the Android in-`none` no-op write sub-step wasn't reached (scroll position); iOS covered it, mechanism shared. Docs-closed: `30` Decision 7 + the `controlled` table row flipped deferred→shipped; `50` Decision 8 cross-ref updated; `structure.{ios,android}` mechanic already pinned; no ledger row (unblocks DEF-011/RT-002, closes none). — [task](./tasks/DEF-020/); detail block ↓. SCOPE SPLIT (maintainer-accepted 2026-06-15): DEF-020 = the **view-ref `controlled` write path only** — `setUniform`/`setHighlight` as Expo `AsyncFunction`s on the surface ref, **discrete writes only**, into the existing uniform buffer (RT-005 `[0,1]` y-up UV). No `SharedObject`, no `FxEffectRenderer` extraction, no Nitro — unblocks DEF-011 without speculative architecture. App-owned continuous gesture-sourced motion stays DEF-006 (optional); fx-owned drag/tilt is DEF-011 (native). The true SharedObject/renderer/HybridObject half split to **DEF-021**. Two review rounds applied + re-reviewed clean (planner): B1/B2 — scalar-whitelist cross-platform parity + the Android vec-uniform arity crash fix (`2288181`); M2/M4 — clear imperative overrides on exit-`controlled` + `ReactNode` import (`a1356d7`). Gates re-run green incl. forced `:react-native-fx:compileDebugKotlin` (58 executed) + example tsc. Example harness `controlled-write` added (discrete button-tap writes, the clobber re-render test). Review: `reviews/DEF-020.md`. Device spike pending the human gate. |
| DEF-021 | 4-runtime | implement | blocked | yes | — | — | trigger: first detached imperative handle (post-v2 impulse API) or per-child control (DEF-002 / the `05` Nitro re-eval) | the true `Fx*` `SharedObject` layer + the discrete `FxEffectRenderer` object + the HybridObject *shape* (`equals`/`dispose`/identity), split from DEF-020 (2026-06-15). Only a *detached* JS-held handle needs it; the view-ref `controlled` write path (DEF-020) does not, so building it now is speculative architecture (the U9 ratification logic) and trips the rule-#7 Nitro boundary. Originally deferred from Unit 9 (2026-06-13): V1 exposes no JS-held handle, so a `SharedObject` has no consumer and the internal objects stay plain native classes (`36` §V1 realization). Keep DEF-020's `setUniform`/`setHighlight` a clean subset so the later swap stays mechanical. |
| DEF-022 | 0-spine | implement | blocked | no | — | — | trigger: a real `clock`-driven effect consumer | the `clock` driver node (native timeline: loop/keyframe/stagger), named-next in `02 §Decision 14` after `target`/`source` but with no consumer yet (audit-2026-06-18 §A2 / DOC-025). Additive manifest node; build when a multi-step / one-shot timeline surface is actually needed |
| DEF-023 | 4-runtime | implement | blocked | no | — | — | trigger: an off-window-pause consumer keyed on `cadence` | the cross-surface app-state / off-window pause coordinator that reads the `cadence` schema field (shipped U2-003) — the module-level `OnAppEntersBackground`/`Foreground` fan-out + weak surface registry (`31 §Pause is mandatory`) has no consumer object yet (audit-2026-06-18 §A2 / DOC-025). Today each surface self-pauses on attach/focus; this is the centralized `cadence`-keyed coordinator, deferred until a real need |
| DEF-024 | 4-runtime | implement | blocked | no | — | — | trigger: a feature needs a uniform read-back | the `getUniform()` pull channel named in `51 §The View DSL` (audit-2026-06-18 §A2 / DOC-025). DEF-020 shipped the write path (`setUniform`/`setHighlight`); no feature needs a uniform **read** yet, so the pull half is deferred until a consumer exists |

## DEF-020 — view-ref `controlled` write path (`setUniform` / `setHighlight`)

Type: `implement` · State: `merged` · Device: yes · Consumes: — · Closes: — (unblocks DEF-011) · [task](./tasks/DEF-020/)

The minimal half of the original DEF-020 (split accepted by the maintainer, 2026-06-15): the view-ref
imperative write path that `interactionMode="controlled"` needs and DEF-011 (drag/tilt) hard-depends
on. **Discrete writes only** — app-owned continuous gesture-sourced motion stays DEF-006; fx-owned
drag/tilt is DEF-011 (native); the true SharedObject layer split to DEF-021. Full spec, authority links, scope in/out, spike, and proof in the task README.

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

## DEF-011 — native-owned drag/tilt (G3 axis-aware claiming)

Type: `implement` · State: `merged` (on integration/0.1.x; hardware gate PASS + human-delegated tick 2026-06-18) · Device: yes · Consumes: — · Closes: RT-002 · [task](./tasks/DEF-011/) · [review](./reviews/DEF-011.md)

Re-scoped 2026-06-15 to **native-owned**: drag/tilt is fx-owned interaction, so a native recognizer
reads the gesture and writes the uniform natively every frame — no per-frame JS, no Reanimated.
DEF-006 (the app-owned Reanimated prop-drive) is no longer a blocker; it is an optional, trigger-gated
integration. Full scope, the settled forks, the preflight/spike, authority links, and proof
in the task README.

The three design forks are **settled** (ratified planner + maintainer, 2026-06-17 — see the README):
`active` + `dragAxis?: 'horizontal'|'vertical'|'both'` (no new `interactionMode` value, per the DEF-015
freeze); `drag`/`tilt` vec2 signed `[-1,1]` in the shipped touch-UV space (`drag` = `touchUV − originUV`,
axis-masked; `tilt` = `(touchUV − 0.5)*2`, full-2D); the iOS dual-path ABI cost priced.

**Phase 1 (headless) is done and reviewed clean (planner, 2026-06-17):** the `dragAxis` prop + the
axis-aware `shouldFail` refinement (cross-axis-dominance yield) on both `FxPressHandler`s + a spike
example screen. Preflight diffed the actual RNGH Pan FSM. Gates re-run independently green — Biome,
tsc (packages + example), `bun run test` 78/78, swift:lint, Android `compileDebugKotlin`, iOS
`xcodebuild` (ReactNativeFx). No uniforms/settle yet (Phase 2).

**Arbitration spike (simulator/emulator, 2026-06-17 — `tasks/DEF-011/evidence/device.md`):** the
design is **not falsified — proceed to Phase 2**, but it is **Android-decisive, not S1–S5-both-platforms**
(the pasted "all pass" headline overstated it). Proven (planner-verified against the screenshots):
Android S1 (claim horizontal + yield vertical) and S3 (`both` blocks the parent scroller) — the two
decisive corners. NOT proven: Android S2/S4/S5 (surfaces off-screen / inner-scroll position unreadable
via a11y) and **all iOS behavior** (XCTest can't observe recognizer state; Phase 1 has no visible
uniform, so "claiming" is invisible on iOS). The gaps are tooling/visibility limits, not failures —
Phase 2's visible uniform + real hardware close them. **Spike finding (rule #6):** iOS claims by
keeping its recognizer alive while the scroller always scrolls (simultaneous recognition); Android
claims by blocking the parent (`requestDisallowInterceptTouchEvent`). `horizontal`/`vertical`
converge; `both`-inside-a-scroller diverges (Android suppresses parent scroll, iOS does not) — settle
in Phase 2 (lean: document `both` as standalone-only). This is a **sim spike, NOT the closing
`device-verified` gate.**

**Phase 2 — headless-done + planner-reviewed (2026-06-17):** native drag/tilt uniform writes
(iOS dual-path: `FxUniforms` struct + runtime preamble + all 10 `[[stitchable]]` signatures +
hosted call site; Android per-shader `declaredUniforms`-gated `setFloatUniform`), axis-masked
`drag` + full-2D pointer `tilt` in the touch-UV basis, native settle to `(0,0)` via the 0.35
press-depth easing on both platforms, visible `dots` wiring (demo-only, no-op at rest), and a
`@gorhom/bottom-sheet` example coexistence section (example deps only). 11 new Tier-1 tests (ABI
presence across all 10 sigs + masking-math contract). Gates re-run independently green — Biome, tsc
(packages + example), `bun run test` 89/89, swift:lint, Android `compileDebugKotlin`, iOS
`xcodebuild` (full app, incl. metal). **`structure.{ios,android}.md` pinning was deferred to docs-closed** (the planner reverted the
executor's premature Phase-2 pin); it is **now pinned** — the hardware gate confirmed the exact
arbitration, the `both` divergence, and the feel. The 0.35-easing watch (the uniform lagging the
finger a few frames during active drag) was checked on device and **reads as smooth, not laggy**.

**Closing hardware gate — PASS (human, real devices iPhone 14 / iOS 26.5 + POCO F1 / Android 15,
2026-06-18; `tasks/DEF-011/evidence/device-hardware.md`).** Fresh native builds at HEAD + the gate
fix below. All scenarios verified by finger — S1/S2/S4/S5 axis claiming, drag/tilt tracking the
finger with no per-frame JS under load, native settle, W-F2, W-F3 (no scroll-start hitch from the
Android `ACTION_DOWN` disallow), the `@gorhom`/RNGH coexistence cases, loop pauses off-window. The
one exception is the **ratified iOS `both` divergence** (the ancestor scroll stays active — `both`
is standalone-only on iOS, out of scope not a bug); Android blocks the parent for `both`. **Gate bug
found + fixed (`0b4f9de`):** iOS dots vanished mid-drag because `UILongPressGestureRecognizer`'s
built-in `allowableMovement` (10 pt default) auto-failed the recognizer before the axis-aware
`shouldFail` could arbitrate — set to `.greatestFiniteMagnitude` so `shouldFail` is the sole
arbiter. S3 demo relabeled standalone-only (`49e89f6`). Docs-closed: `30` G3 open→shipped;
`structure.{ios,android}` pinned; ledger RT-002 deferred→resolved.

Checklist:
- [x] spec'd ([README](./tasks/DEF-011/README.md))
- [x] rules-gated (#1 native loop, #6 peers, #7 no Reanimated/RNGH/JSI in `packages/`, #9)
- [x] implemented (preflight + spike on the axis-split → native uniform write → settle)
- [x] commented
- [x] headless-done
- [x] device-verified (axis claim while a cross-axis scroller still scrolls; smooth track under JS load; coexistence — human gate, 2026-06-18)
- [x] reviewed
- [x] docs-closed (`30` G3 + `structure.{ios,android}` + ledger RT-002)
- [x] merged (on integration/0.1.x; human-delegated tick, 2026-06-18)

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
binding is an inert stub — its native `FxGroupView` does nothing until the `FxGroup` high-level
morph component (a future task) lands. Exporting it publishes API surface the runtime can't honor.
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

## DOC-023 — mechanical stale sweep

Reconciles stale text in the 07 structural docs and the canonical research planes to
already-ratified source docs and shipped code (surfaced by the audit-2026-06-18 alignment pass; the
F-list). No design change — pointers and status only. **Reviewed + committed 2026-06-18. WIP deletions deliberately held** (the
`interactive-glass-touch-delivery.md` retirement and any other wip moves wait until after this
bookkeeping is reviewed — DOC-026 territory).

**`architecture.md`**
- §7 platform table reconciled to `structure.{ios,android}`: content-distort `PLANNED` → ships
  (`ripple` demonstrator, DEF-009, device-proven); iOS glass `.glassEffect` → UIKit
  `UIVisualEffectView`+`UIGlassEffect`; Android decorative clock `withFrameNanos` → `Choreographer`
  on a plain `View` (Compose deferred); symbols → planned/deferred (iOS-only V1); shape-morph → M3
  `feature:'m3-expressive'` gate, Compose rung only.
- §4 / §4.1 reconciled to match §7 (Android decorative clock `Choreographer` + plain `View` +
  `Paint.onDraw`; Compose deferred) — closes the same-doc contradiction.
- §2.3 event payloads → `40 §Event payloads`: `onTransitionEnd({ owner, phase?, finished,
  interrupted })`, `onStateChange({ from, to })`.
- §3 object model → `36`: **five** named objects (not six); `FxPressHandler` reframed as a native
  input source; `FxEffectRenderer` tagged V1-inline / V2-discrete (DEF-021); `material`
  `interaction:'self'` press carve-out (`21`).

**`blueprint.md`** — Unit 2 "manually maintain TS types" → derived `ConfigFor<NodeId>` (U2-003);
Unit 9 `Fx*` SharedObjects → deferred to DEF-021.

**MOT-001 closure repoint** (MOT-001 closed with the V1 `transient` catalog at U7-003) across
`41`/`42`/`50`/`54`/`56`/`57`/`34`/`35` + `data-layer`/`decision-ledger`: `sheet`/`modal` →
DEF-018; `tune` → MOT-002 (incl. the `*(deferred — V1.x / MOT-001)*` table markers); `transient`
magnitudes → device-verified; the open `lift`/`native` halves re-attributed to the unbuilt
`FxView`/`FxPressable`. `35` identity-proof status → device-proven (SPINE-009, U9-002).

**Deliberately excluded:** `tasks/*` artifacts and `progress.md` proof-log entries (frozen audit
trail — not rewritten); `Phase: v2` header tags (phase labels, not status).

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

## U10-001 — `<Fx effect="id">` the effect-surface front door + EdgeGlow

Type: `implement` · State: `headless-done` · Device: yes · Consumes: — · Closes: — · [task](./tasks/U10-001/)

New files: `src/effects/effects.ts` (resolver + `compositionStyle`) and `src/surface/Fx.tsx` (callable `<Fx>` + `EdgeGlow`).
Modifications: `FxScroll.tsx` (removed provisional `Fx` namespace), `surface/index.ts`, `src/index.ts` (added `EdgeGlow`/`FxProps`/`EffectId` exports).
Test: `src/__tests__/effects-resolver.test.ts` — resolver conformance, substrate selection, wantInteractive, composition→style, and adapter degradation.

**Review folds (planner, 2026-06-19) — two defects found + fixed in-tree:**
- **High — `symbol` removed from U10 (Option 1, maintainer).** `effect="symbol"` resolved to a valid iOS rung but rendered nothing (`FxHostedRootView` → `FxEmptyView` without `symbolConfig`) and fired no degradation. A string id must resolve with no extra required config; `SymbolConfig.name` is required, so symbol is a node/config surface → deferred to **U10-002**. Dropped `'symbol'` from `EffectId` / `resolveEffect` / `HOSTED_NATIVE_EFFECT_STRINGS` / `PublicNodeId` and `symbolConfig` from `FxProps`; tests re-pointed.
- **Medium — web crash guard.** `Fx.tsx` cast `Platform.OS` to `ios|android` and called `select()`; on web `node.lower.web` is undefined → throw. Now guards non-native platforms → `{via:'none'}` adapter degradation (the web no-op bindings).

Checklist:
- [x] spec'd ([README](./tasks/U10-001/README.md))
- [x] rules-gated (#1 no per-frame JS / #2 agnostic ids + platform-native realization / #3 select() picks substrate / #4 no RN content hosting / #5 effect prop front door / #7 Expo Modules only / #9 reads layout never writes)
- [x] implemented (`src/effects/effects.ts` resolver + `src/surface/Fx.tsx` callable + `EdgeGlow`; `Fx.Scroll` preserved)
- [x] commented (iceberg — adapter-degradation discriminable from native load failure; ref absent/inert on hosted path)
- [x] headless-done (packages tsc/build/lint green; 114 tests pass incl. resolver suite; example tsc green; gates re-run by reviewer after the symbol/web folds)
- [x] device-verified (2026-06-19, maintainer-delegated) — **6/6 PASS on iOS 18 sim + POCO F1 (Android 15/API 35)**: decorative hosted shader, interactive shader (press + `load:`), glass, mesh-gradient, EdgeGlow, `composition="background"`. Harness `example/screens/effect-surface.tsx`; evidence in [`evidence/device.md`](./tasks/U10-001/evidence/device.md) + 7 screenshots. **Reviewer finding:** the interactive-shader Row 2 first used `aurora` (hosted-only on iOS → `onFxError`, NOT sim-only — `FxSurfaceView.swift:334-343` implements an interactive raster subset: fractal-clouds/ink-smoke/liquid-chrome/loop/dots); harness re-pointed to `dots` and re-checked on the iOS sim (`load: dots` + grid renders). U10 behaves correctly (load XOR error; native reason discriminable from adapter `unsupported`).
- [x] reviewed (planner, 2026-06-19) — gates re-run independently; symbol/web folds + the harness-shader fix verified; the iOS interactive-raster subset documented in `50`
- [x] docs-closed — `50 §V1 shader catalog` flipped to "shipped + device-verified (U10-001)" and records the iOS interactive subset; Phase-S section intro updated (Fx/EdgeGlow shipped); `src/index.ts` exports confirmed; resolver is the single id→node source. `56`/`52` already consistent (no unbuilt marker)
- [x] merged — on integration/0.1.x (this commit)

Proof:
- headless: packages tsc/build/lint + resolver-conformance + `<Fx>` resolution tests + example tsc — all green (re-run by reviewer).
- device: 6/6 PASS both platforms (iOS 18 sim + POCO F1); [`evidence/device.md`](./tasks/U10-001/evidence/device.md).
- docs: `50` surface status + iOS interactive subset; Phase-S intro; `src/index.ts` exports.

**Spawned follow-up (deferred, not a U10 blocker):** the manifest does not model per-shader interactive capability — `<Fx effect="<hosted-only id>" interactionMode="active">` passes `select()` then `onError`s at mount (honest runtime degradation, the U3-009 over-promise class at shader×interactive granularity). A stricter design would degrade at select-time; documented in `50` for now.

## U11-001 — `fx.effect.*` builder + `EffectStack`

Type: `implement` · State: `merged` · Device: yes · Consumes: — · Closes: — (realizes SURF-008/DEF-004, already resolved) · [task](./tasks/U11-001/)

New file: `src/effects/stack.ts` — `Transition`, `SpringSpec`, `EffectStep`, `EffectStack` types + `EffectBuilder` type + `glow`/`glass`/`mesh` factory functions + `makeBuilder` closure + `addRenderTarget` guard.
Modifications: `src/fx.ts` (added `effect: { glow, glass, mesh }` namespace); `src/surface/Fx.tsx` (`FxProps.effect` widened to `EffectId | EffectStack`, stack branch added, hooks-order fix for early-return); `src/index.ts` (added `EffectBuilder`/`EffectStack`/`EffectStep`/`EffectStepId`/`SpringSpec`/`Transition` type exports).
Test: `src/__tests__/effect-builder.test.ts` — 22 tests: factory functions, value semantics, single-render-target guard (warn + no-op + reference identity), animate/defaults, resolution conformance (builder step id == string form via resolveEffect + select).

Checklist:
- [x] spec'd ([README](./tasks/U11-001/README.md))
- [x] rules-gated (#1 stack crosses once as a resolved record / #2 only native-backed steps, no .blur/filter, fill intensity-only / #4 self-contained effects / #5 string form canonical, builder is the escape hatch / #7 Expo Modules only)
- [x] implemented (`src/effects/stack.ts` + `src/fx.ts` + `src/surface/Fx.tsx` + `src/index.ts`)
- [x] commented (iceberg only — no internal ids; guard posture, transition-recorded-not-wired rationale, empty-stack placeholder)
- [x] headless-done (packages tsc/build/lint green; 138 tests pass — 22 new; example tsc green)
- [x] device-verified — builder forms == string forms on iOS 18 sim + POCO F1 (5/5); the 2-target chain renders the first step only. Evidence: [device.md](./tasks/U11-001/evidence/device.md) (harness `77a9b1b`, JS-only / Metro reload). Caveat: the Metro warning text was not captured verbatim — held non-blocking (LogBox toast confirms a warn fired; the first-step-only render is the same guard branch; the warn is headless-unit-covered).
- [x] reviewed — planner cross-checked the four screenshots independently (not the summary); both load-bearing claims hold visually on both platforms.
- [x] docs-closed — `55` Status flipped to shipped (V1 builder form for one effect, single render-target, NOT "composition") + a Shipped note in the V1/Unit-11 scope block; `src/index.ts` exports + `src/fx.ts` `effect` namespace confirmed. `50` needs no change (the string-form catalog, not the builder).
- [x] merged

Proof:
- headless: packages tsc/build/lint + 22 new builder/guard/resolution tests + example tsc — all green.
- device: YES — reuses U10-001 `effect-surface.tsx` harness screen; add a builder-form section: `fx.effect.glow()`, `fx.effect.glass()`, `fx.effect.mesh()` each render identically to their string-form equivalents; a 2-target chain renders only the first step + dev warning in Metro.
- docs: `55` builder status (single render-target, not "composition"); exports; `fx.effect.*` namespace.

## Maintenance

- The table is the **view**; the detail block / `tasks/<id>/` folder is the **store**. On disagreement, the store wins — same discipline as "the source doc closes a ledger row, not the ledger."
- A row reaches `ready-to-merge` (complete) only when its `Closes:` rows are true in their source docs. Until then it sits at `docs-pending`, however green the build.
- Escalate by need: row → add a detail block when the task is active → promote to a `tasks/<id>/` folder when it accrues device evidence.
