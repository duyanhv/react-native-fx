# Decision ledger
Status: researched
Phase: v1 + v2
Feeds: blueprint.md, subtask-protocol.md, a future implementation-plan.md
Owns: the cross-plane index of in-flight decisions — each with a status, an owner, what it blocks, and the condition that closes it.

## Why this matters

Planes `0`–`6` record *what is true and what fx believes*. This is plane `7`: the orchestration layer — *what to build, what blocks it, and what proof closes it.* Every other folder scatters its loose ends across an "Open questions" section; nothing reads them as one list, so the same decision gets re-litigated and device-bound claims drift into reading like settled fact.

This ledger is the single index of every decision still in flight. It is **not a todo list**: each row names the decision, who owns closing it, what it blocks, and the exact condition that flips it to `resolved`. A future `implementation-plan.md` consumes these IDs (a build unit declares `Consumes:` and `Closes:` against them), so the ledger is the seam between research and the build order.

It does not restate the research. A row points at its source doc and carries only the decision and its close condition; the reasoning lives in the source.

**The closure rule.** A row is closed only when its close condition is true **in the source doc** — not when this ledger says so. The ledger *indexes* state; the owning doc *closes* it. Flip a row to `resolved` only after the owning plane doc records the decision, so the ledger never becomes a second source of truth.

**Plane `7` also materializes.** `data-layer.md` and `architecture.md` provision concrete values and structures (the preset catalog with springs, the `tune` formulas, the three-view object model, the folder layout) ahead of the plane docs, to unblock the build. Provisioning is **not** closure: where a value is materialized in `data-layer.md`/`architecture.md` but its owning plane doc still frames the question open, the row stays open and the residual work is *propagate the value back to the source doc, then close it*. The [Reconciliation with plane `7`](#reconciliation-with-plane-7-materialized-pending-closure) section is that punch-list.

## How to read a row

Rows are grouped by **owner** (the plane that closes the decision). Each table carries:

- **id** — stable, plane-prefixed (`SPINE`, `SURF`, `FX`, `MOT`, `RT`, `REAL`, `SHIP`, `IMPL`). An `implementation-plan.md` unit references these.
- **status** — one of:
  - `resolved` — decided and applied; kept only as an anchor other rows close against.
  - `open` — a genuine undecided design question.
  - `deferred` — intentionally postponed (usually to V2 / post-V1); the trigger to revisit is named.
  - `device-pending` — the design is set; it needs on-device proof (effects and animations do not run headless).
  - `implementation-pending` — settled in design; it just needs to be built.
  - `doc-cleanup` — a doc still says something stale or contradictory and needs a wording fix.
- **source** — the doc(s) that own the reasoning.
- **decision / pending work** — one line; includes the doc's stated `Lean:` where it has one.
- **blocks** — what stays unsettled until this closes (`—` if nothing downstream waits on it).
- **close condition** — the concrete proof that flips it to `resolved`.

A `device-pending` row closes only with a device check; a `doc-cleanup` row closes when the named wording lands; an `open` row closes when the decision is recorded in its source doc.

## Spine — owner: `0-spine`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| SPINE-001 | resolved | `00` | Where curation ends and BYO begins. Lean: a small curated catalog, grown on real demand. | catalog scope (`FX-004`) | **Resolved (DOC-003, 2026-06-09).** `00` Decision #6: the V1 threshold is the 10 curated shader ids + the ratified preset/feedback/effect vocabularies. BYO is the `shader` node with developer-supplied assets; the compiler remains deferred until real demand triggers it. |
| SPINE-002 | resolved | `00`/`50`/`52` | Palettes/themes as a shareable distribution artifact (a `lab` surface of their own). | presets surface | **Resolved (DOC-003, 2026-06-09).** `52` Decision #11: palettes/themes as a shareable artifact are deferred to V2. Pure-config palettes resolve in JS within the core package (`presets/`). A distribution surface would live in `@react-native-fx/lab` if demand justifies the split. Propagated to `50` and `00`. |
| SPINE-003 | resolved | `02`/`50` | Where per-effect typed config lives, and how the surface gets its TS types. Lean: canonical in the manifest, generate TS from it. | surface typing, BYO uniforms (`FX-006`) | **Resolved (U2-002, 2026-06-08).** `02` UniformSpec widened to include `boolean` and `color[]` to match `data-layer.md`. Types in `packages/src/manifest/types.ts` kept in sync manually. Provisional mismatch note removed from `data-layer.md`. |
| SPINE-004 | resolved | `02`/`50` | `composition` (background/overlay/surface) is an **API-layer prop**, not a manifest field. The component resolves it before the manifest is consulted. | — | **Resolved (DOC-002, 2026-06-09).** `02` Decision 12: `composition` lives on the effect surface (`50` / `<Fx>`), not in the node schema. By construction it is a z-order/compositing concern (rule #9) and never touches Yoga layout. |
| SPINE-005 | deferred | `02` | The `feature`-flag vocabulary (enumerate vs free-form) and multiple-assets-per-rung (`assets: Asset[]`). | — | **Deferred (DOC-002, 2026-06-09).** No real shader or feature case forces it in V1. Revisit when the manifest or a rung needs a non-OS capability flag (e.g., Metal feature set, AGSL extension) or multiple assets per rung. |
| SPINE-006 | deferred | `02` | Manifest partitioning — one file vs split per node/layer as the node count grows. | — | **Deferred (DOC-002, 2026-06-09).** The manifest stays one file for V1; split when the node count makes rendering unwieldy. Revisit when the node count grows beyond the current 8 nodes or the rendering of `structure.*` becomes hard to maintain. |
| SPINE-007 | resolved | `02`/`53` | `via:'lib'` naming: `applyVia` names the library (e.g., `Haze`), `asset` names the asset type (e.g., `lottie`). Version is **not** in the manifest — managed by the app's optional peer dependency (`53` decision 6). | — | **Resolved (DOC-002, 2026-06-09).** `02` Decision 13: `applyVia` = library name, `asset` = asset type, no version in manifest. The optional-peer rule is settled in `53` decision 6. |
| SPINE-008 | deferred | `03` | The compiler — its IR surface, the concrete build trigger, and emitter targets (shaders only vs +binding stubs). | author-once BYO/novel composition | BYO/novel-composition demand triggers the build-time emitter |
| SPINE-009 | device-pending | `04`/`05`/`33`/`35`/`36` | **The falsification test.** Coordinator/wrapper identity holds across Fabric commits, and fx reads the post-layout frame natively on async events. Source-audit PASS; device proof pending. Reinforced by the U7-001 preflight (2026-06-11): a JS-retained child generates no `Remove` mutation (Fabric's differ) and Expo view events deliver while mounted — the handshake needs no commit hook ([preflight](./tasks/U7-001/preflight.md)). | the Expo-Modules-sufficiency default (the whole no-Nitro bet) | on-device proof identity holds and layout reads natively; failure triggers `SPINE-010` |
| SPINE-010 | deferred | `05`/`33`/`42` | Per-child control (staggered children, child-anchored `menu`/`tooltip`) is the trigger to re-evaluate Nitro / raw Fabric vs Expo Modules. | anchored presence (`MOT-009`) | a re-run of the boundary decision the day per-child control is needed |
| SPINE-012 | resolved | `01` | The hosted-substrate device unknowns — Android `RNHostView` touch/sizing parity with iOS; self-gesturing system components (glass `.interactive()`) inside RN scrollers; performance of many hosted boundaries vs one grouped `Host`. | hosting correctness at scale | **Resolved (U3-002 device gate, 2026-06-10).** Android parity: sweep B2 pass (POCO F1/API 35 — 12-cell grid, no blank hosts, layout-sized tiles, ~60 fps). Many boundaries: sweep A4 pass (12 mixed hosts, UI/JS 60 fps; one caveat — ~40 fps on the interactive-glass stage, noted, not a blocker). Self-gesturing coexistence: the shipped UIKit glass rung delivers its press via the system press machinery and lets drags beginning on the glass pan the parent scroller (scroll-through); capture-on-drag was a SwiftUI-rung behavior only. Recorded in `01` decision 6 and `structure.ios.md` §material. |
| SPINE-013 | resolved | `02` | **Planned-rung selection policy.** `select()` skips both `out-of-scope` and `status:'planned'` rungs by default — planned rungs stay documented in the manifest but are not selectable at runtime. | the executable V1 manifest | **Implemented (U2-001, 2026-06-08).** `select()` skips `planned` and `out-of-scope` rungs. `02` selection rule updated. Typed `select()` in `packages/src/manifest/select.ts` with 17 Jest tests. |

## Surface — owner: `1-surface`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| SURF-001 | resolved | `56` | Whether `GlassView` stays a curated-effect-component candidate. Lean: remove (glass stays `<Fx effect="glass">`). | V1 API naming | **Resolved (DOC-001, 2026-06-08).** `GlassView` removed from `56` — `56` no longer lists un-ratified component names. |
| SURF-002 | resolved | `56`/`52` | Whether to ship the named effect-component sugar at all. `EdgeGlow` ships as a component; `MeshGradient` is a fill, reached via `<Fx>`. The criterion is: drawn whole by fx, standalone-useful, canonical API remains `<Fx effect="…">`. | the V1 export map (`SHIP-001`) | **Resolved (DOC-004, 2026-06-09).** `56` Decision 4 records the criterion; `52` Decision 12 records the V1 set. `EdgeGlow` is the only component; `MeshGradient` is a fill, reached via `<Fx effect="mesh-gradient">`. |
| SURF-003 | resolved | `50`/`56` | The V1 `preset`/`feedback`/`effect` value vocabularies (`transient`/`lift`/`native`/…), behavior-named. | the surface API | **Resolved (DOC-005, 2026-06-09); presence set narrowed (DOC-018, 2026-06-11).** V1 vocabulary ratified in `50`/`56`: `transient` (presence); `lift` (state); `native` (feedback). `sheet`/`modal` (presence) deferred to MOT-001 — designed but held back (they name screen-scale presentations that collide with presence's scope ceiling, `42`). Effect vocab already ratified by DOC-007. Per-platform spring magnitudes remain device-pending with MOT-001. |
| SURF-004 | resolved | `57`/`40`/`56` | The `FxView` named-state vocabulary (`idle`/`selected`/…) and its `MotionSpec` map per preset. | `FxView` state API | **Resolved (DOC-005, 2026-06-09).** V1 state set for `lift` ratified in `57`/`41`: `idle` · `selected`. Per-platform spring magnitudes remain device-pending with MOT-001. |
| SURF-005 | resolved | `57` | `FxPressable` `feedback` values (`native` plus any named variants). | `FxPressable` API | **Resolved (DOC-005, 2026-06-09).** V1 feedback value ratified in `57`: `native`. Per-platform spring magnitudes remain device-pending with MOT-001. |
| SURF-006 | resolved | `57`/`21` | **Resolved (DOC-006, 2026-06-10).** `FxGroup` cross-item morph is glass-only in V1, iOS 26+ via the system's `GlassEffectContainer`. No other effect nodes support cross-item morph in V1. Merge-threshold and `spacing` semantics are system-owned in V1; explicit `spacing` control is deferred to V2. Android and pre-26 iOS degrade to flat material (no morphing). | — | **Resolved (DOC-006, 2026-06-10).** `57` Decision 6 and `21` Decision 5 record the scope; merge contract deferred to V2; `57`/`21` Open questions struck. |
| SURF-007 | deferred | `54` | A root overlay/portal for `transient`/`modal`. Lean: the app's job in V1. | — | revisit post-V1 only if placement proves insufficient |
| SURF-008 | deferred | `55` | The `Fx.Stack` JSX-compound skin over the identical `EffectStack`. | — | build on real demand |
| SURF-009 | resolved | `55`/`41` | The `SpringTune` shape — how spring/emphasis map to platform spring families. | — | **Resolved (DOC-001, 2026-06-08).** `SpringTune` removed from `55`; `Transition.spring` uses raw spring parameters. Canonical `tune` API (`speed`/`emphasis`/`distance`) covers intent adjustment (`data-layer.md` I2). |
| SURF-010 | resolved | `50`/`54`/`55` | Memoization guidance — inline `uniforms`/`tune`/stack literals re-resolve each render; native `previousProps` value-equality makes manual memo unnecessary. | — | **Verified on SDK 56, iOS + Android (2026-06-08).** `previousProps` compares both primitive and nested `Record` props by value. `@Field` defaults fill omitted fields. Guidance recorded in the owning plane-1 docs `50`/`54`/`55` §Open questions (propagated from `data-layer` §5.1 by DOC-015). |

## Effects — owner: `2-effects`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| FX-001 | resolved | `20`/`50` | Mesh control-point ergonomics (full `width×height` grid vs N-stop sugar); whether `drift` is mesh-only. | — | **Resolved (DOC-007, 2026-06-08).** V1 exposes the full `width × height` mesh grid. N-stop auto-placement sugar stays out of V1. `drift` is mesh-only; plain gradients stay static unless a later capability adds explicit animated-gradient semantics. |
| FX-002 | resolved | `21` | `UIGlassEffect.Style` case set — `.regular`/`.clear` confirmed, `.identity` unverified. | — | **Resolved (U3-002 device gate, 2026-06-10).** `.regular`/`.clear` confirmed on device (iOS 26, Xcode 26.5) via `UIGlassEffect` on the shipped UIKit rung — visually distinct over a moving backdrop, no dark box. `.identity` is moot: `21` ships `regular`/`clear` only and fx does not adopt it. |
| FX-003 | resolved | `21`/`structure.android` | Android glass fallback default (own-content blur vs `Haze`; `RenderEffect` is stale-prone) and `intensity` normalization to 0–1 across iOS `fractionComplete` and Android blur radius. | Android glass contract | **Resolved (U3-003 device gate, 2026-06-11).** `21` Decision 6: own-content blur default (Haze stays the planned optional-peer rung), `intensity` 0–1 on both platforms (iOS `fractionComplete`; Android blur radius + alpha). Staleness device-checked clean on POCO F1. |
| FX-004 | resolved | `22`/`50` | The curated `ShaderId` V1 catalog and its uniforms (reconcile the historical sets). | shader shipping | **Resolved (DOC-007, 2026-06-08).** V1 catalog is `fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`, `dots`, `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow`. Public V1 uniforms are shared/minimal (`intensity`); `time`, `resolution`, `pressDepth`, and `touch` stay native-owned. The last five ids require native implementation before package exposure (tracked by U3-006). |
| FX-005 | resolved | `22` | Uniform struct alignment Swift↔MSL field order/stride, and the AGSL binding equivalent. | — | **Resolved (U3-002 device gate, 2026-06-10).** Metal: sweep A3 pass — the multi-uniform `loop` shader renders ordered stripes with no garbling/offset on iOS 26 (field order/stride aligned). AGSL: sweep B2 — the same shader catalog (`ink-smoke`/`loop`/`aurora`) renders correctly on Android (POCO F1/API 35), exercising the AGSL uniform binding. |
| FX-006 | resolved | `22`/`03`/`53` | The BYO asset registration contract — `.metal`+`.agsl` pair, uniform table, build step, manifest entry, consumption surface, typing idiom, and unregistered-id behavior. | BYO shipping | **Resolved (U3-004, 2026-06-10).** `22` Decision 6 records the full contract: registration path (`registerShader`), asset locations, build wiring, missing-platform guard-out, `onLoad`/`onError` events, consumption surface (`<Fx effect="id">`), typing idiom (`ShaderId | (string & {})`), and unregistered-id behavior (`onError`, no crash). V1 BYO is build-time `.metal`/`.agsl` pairs only; runtime compilation remains deferred (`DEF-008`). `data-layer.md` §7 reconciled.
| FX-007 | deferred | `22` | Runtime shader compilation (possible on both platforms). | — | post-V1 feature |
| FX-008 | deferred | `23` | An Android content-filter wrapper (touch-safe, draw-time). | — | resolved with `content-distort` scoping (V2) |
| FX-009 | resolved | `24` | Android `symbol` scope — ship via Lottie/AVD or stay iOS-only in V1 — plus the cross-platform asset-sourcing contract. | the Android `symbol` rung (`REAL` renders it `status:planned`) | **Resolved (DOC-008, 2026-06-08).** `symbol` is iOS-only in V1 through `.symbolEffect`. Android AVD/Lottie support stays planned/deferred and non-selectable; Android degrades to `{via:'none'}`. The future Android asset contract does not ship in V1. The `via:'lib'` naming convention is resolved separately (SPINE-007, DOC-002). |

## Motion — owner: `3-motion`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| MOT-001 | device-pending | `41`/`42`/`56`/`57`/`structure.*` | **The per-platform default catalog.** Every `(preset × phase/state)` row's named platform source, shape, and spring — device-filled, passing `41`'s law test. **Also owns the `sheet`/`modal` presence presets deferred from V1 (DOC-018)** — they resurrect with this catalog once presence-under-navigation is settled. | the shape-native law's audit; `preset`/`feedback` shipping (`SURF-003`/`005`) | the catalog filled on device and parity-checked against each platform |
| MOT-002 | open | `41` | The `tune` dimension vocabulary (`speed`/`emphasis`/`distance` — enough?) and the minimal animatable-property set. | `tune` API | the `tune` vocabulary and property set pinned. **`tune` is deferred from the V1 surface (DOC-019, 2026-06-11)** — it resurrects with MOT-001's device-tuned catalog; this row stays open and is no longer a V1 blocker (V1 ships `preset`/`motion`/`transition`). |
| MOT-003 | resolved | `41` | The V1 primitive layer is the **driver vocabulary** (`target`/`clock`/`source`), not a Compose-style enter/exit set: V1 ships the ratified presets (DOC-005) + `fx.motion.*` builders over the `target` driver; `emphasis` lives in `tune`, press response in `feedback`; Compose names not borrowed. | the V1 motion primitive set | **Resolved (DOC-009, 2026-06-10).** `41` Decision #12; multi-step/one-shot primitives arrive with the `clock` driver (`42` Decision #6). |
| MOT-004 | deferred | `41` | Partial-override sugar (`edge`/`origin`). It is binary for now: `preset` *or* explicit `motion`. | — | reconsider as scoped `FxPresence` sugar only if demand is real |
| MOT-005 | resolved | `40` | `transition` stays **surface-scoped** — one timing for all the uniforms of its step/component; per-property control is a driver *binding*, never a per-uniform easing config inside `transition`. | — | **Resolved (DOC-009, 2026-06-10).** `40` Decision #7. |
| MOT-006 | resolved | `40` | The native-source-read is the **`source` driver** — phase V2 (after `target`+`clock`), substrate-tiered: zero per-frame JS everywhere; render-server-fidelity mapping only on iOS `hosted` (`visualEffect`/`scrollTransition`); UI-thread-mapped elsewhere. | — | **Resolved (DOC-009, 2026-06-10).** `40` Decision #7; `02` Decision #14. |
| MOT-007 | deferred | `40` | The Regime-C option-2 UI-thread channel (Reanimated shared values bound to a uniform). Reframed (DOC-009): the post-V1 **UI-thread tier of the `source` driver** — same uniform names. | — | post-V1, additive over the same uniform names |
| MOT-008 | open | `40`/`34` | How a BYO author declares an intro/outro envelope in `.metal`/`.agsl`, not hardcoded to the curated glow. | BYO envelopes | an envelope-declaration contract |
| MOT-009 | resolved | `42`/`35` | Extended states are **`clock`-driver timelines** (native keyframe/phase sequences, loops, one-shot bursts); V1 stays binary `visible` + `FxView`'s named `state`. | — | **Resolved (DOC-009, 2026-06-10).** `42` Decision #6 — V2, with the `clock` driver, never more presence surface. |
| MOT-010 | resolved | `41`/`42`/`34` | V1 reduce-motion is instant degradation: when the OS reduce-motion / animation-scale setting is active, the driver sets all motion envelopes to 0 duration — snap to target, no interpolation. iOS `UIAccessibility.isReduceMotionEnabled`; Android `TRANSITION_ANIMATION_SCALE`/`ANIMATOR_DURATION_SCALE` = 0.0. Opacity-only degradation is a deferred V2 refinement. | — | **Resolved (DOC-010, 2026-06-09).** Policy recorded in `41` Decision #9, `42` §Reduce-motion, and `34` §Findings — reduce-motion. |

## Runtime — owner: `4-runtime`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| RT-001 | device-pending | `30` | The cancel path and the full RNGH coexistence matrix (including `@gorhom/bottom-sheet` pan). | — | the device coexistence matrix passes |
| RT-002 | deferred | `30` | Drag/tilt (G3) axis-aware claiming, resolved via `controlled` + RNGH relations. | — | post-V1 |
| RT-003 | device-pending | `31` | GPU-loop device items — drawable-on-resume with no stall; one queue per view vs a shared singleton; on-demand vs continuous frames for the press/uniform path. | — | device benchmarks |
| RT-004 | resolved | `31`/`53` | The Expo per-view recycling reset hook (a `prepareToRecycleView` equivalent on the pinned SDK). | — | **Verified on SDK 56 (2026-06-08).** `shouldBeRecycled() = false` is sufficient — no reset hook needed. |
| RT-005 | open | `32` | The SDF source — reuse the shader's shape uniform vs a separately declared hit-shape — and coordinate-unit normalization across `hitTest`/events/`setHighlight`. Lean: reuse the shader's shape. | — | the SDF source and coordinate space pinned |
| RT-006 | device-pending | `32` | SDF feather/threshold tuning and per-frame `hitTest` cost under rapid touch. | — | device tuning and a cost check |
| RT-007 | implementation-pending | `34` | The interruptible-spring retarget contract (no snap, no double-animation). | `FxAnimationDriver` (blueprint Unit 6) | the contract implemented and device-verified per platform |
| RT-016 | device-pending | `34` | Animator sufficiency — design disposition recorded (DOC-009, 2026-06-10; `34` §Findings, `structure.*`): Android stock (`animateToFinalPosition()` carries value+velocity); iOS render-server-first with the `FxSpring` integrator (`SwiftUI.Spring`, iOS 17 floor) on retarget. | the driver's primitive choice (RT-007) | on-device proof of the retarget cases (U6-002) — the disposition is design-time, not device truth |
| RT-008 | open | `36` | Runtime-object granularity — one driver with two families vs two objects; `FxEffectRenderer` decorative-vs-interactive split; shared vs per-object scheduling. Lean: one driver, two families, shared scheduling. | the object graph (Unit 9) | the object graph finalized at implementation |
| RT-009 | resolved | `51`/`01` | The exact Expo path to author a hosted view (mount a SwiftUI/Compose host, pass props/children; expo/expo#46549). | the hosted substrate | **Resolved (U3-001, 2026-06-08).** `FxHostedView` embeds `UIHostingController` (iOS) and plain `View`-based renderer (Android). Props cross the Expo boundary. Device-verified on iOS 26+ and Android. `51` open question closed. Compose deferred — V1 uses `View.onDraw()`. |
| RT-010 | resolved | `51` | One vs several native view classes. Lean: several substrate-specific (`FxHostedView`/`FxSurfaceView`); only registration ergonomics remain. | blueprint Unit 1, `IMPL-001` | **Verified on SDK 56, iOS + Android (2026-06-08).** Three views resolve without duplicate-registration errors. Fast refresh clean. |
| RT-011 | resolved | `51` | `@Field` `Record` coercion of absent uniforms on the pinned SDK. | — | **Verified on SDK 56, iOS + Android (2026-06-08).** `@Field` defaults fill omitted fields on both platforms. |
| RT-012 | open | `35` | Whether the handshake generalizes to a general native-eased declarative-state primitive, or stays presence-specific in V1. | — | V1 stays presence-specific unless demand appears |
| RT-013 | device-pending | `33` | Content-motion hosted-reachability (strictly `expo-view`?) and New-Architecture-only vs a Paper fallback. Lean: `expo-view` + New Arch only (SDK 56 floor). | — | confirmed on device |
| RT-014 | resolved | `33`/blueprint Unit 4 | The `mountChildComponentView` override that routes RN children into the fx-owned, Fabric-invisible container — the mechanic that makes the wrapper wrap anything. | the content wrapper (blueprint Units 4–7) | **Resolved (U4-002, 2026-06-09).** Override verified on Fabric on device (iOS + Android). Reimplemented to the proven Expo templates (`ExpoBlurTargetView` Android / `expo-glass`+symmetric-pair iOS); the per-platform mechanic + proven-template rules are pinned in `structure.{ios,android}.md`. |
| RT-015 | resolved | `33`/`34` (+ `structure.{ios,android}` for platform mechanics) | **The intermediate container.** `33`/`34` decide the exact object: a native view inside `FxSurfaceView` that Fabric does not track, so Fabric cannot clobber its `transform`/`opacity`. `FxSurfaceView` overrides `mountChildComponentView` to route RN children into this container. The animator targets the container, not the outer `FxSurfaceView`. `architecture`/`data-layer`/`blueprint.md` reconciled; `structure.ios`/`structure.android` pinned. | the content-motion runtime (blueprint Units 4–6) | **Resolved (U4-001, 2026-06-09).** `33`/`34` record the intermediate container; `architecture.md` §5.1, `data-layer.md`, and `blueprint.md` Unit 4 reconciled to match; `structure.ios`/`structure.android` pin the per-platform mechanic. |

## Realization — owner: `5-realization`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| REAL-001 | device-pending | `structure.android` | Pin the concrete M3 Expressive floor. It is progressive enhancement over the standard spring, version-fluid until pinned. | Android motion defaults | a concrete minimum pinned and the standard-spring fallback verified |
| REAL-002 | resolved | `52`/`structure.ios` | CocoaPods emits `FxShaders.bundle` unmangled and `MTL_LIBRARY_OUTPUT_DIR` lands `default.metallib` at the bundle root on SDK 56. | — | **Resolved (U3-005, 2026-06-09).** Build-verified on Xcode 26.5 / Swift 6.3.2: `FxShaders.bundle/default.metallib` (194 KB) emitted at bundle root in Debug-iphonesimulator build products. `structure.ios.md` §Render paths records the bundle resolution + `ShaderLibrary(url:)` loader; `52` Open questions cleared. |
| REAL-003 | resolved | `52`/`structure.android` | The AGSL asset path is `src/main/assets/shaders/`, read via `context.assets.open("shaders/<id>.agsl")` at runtime; no build-time compile step. Below API 33 the shader rung is unavailable. | — | **Resolved (U3-005, 2026-06-09).** Path recorded in `structure.android.md` §Render paths; `52` Open questions cleared. Device-verified on API 35 (U3-006). |
| REAL-004 | resolved | `52`/`03` | Single source for the curated shaders — author once (GLSL/SkSL) and transpile, or hand-maintain the MSL+AGSL pair. | — | **Resolved (DOC-013, 2026-06-08).** V1 curated shaders are hand-maintained MSL+AGSL pairs. The author-once compiler remains additive V2 build-time codegen per `03`; SPINE-008 stays deferred for compiler IR/build-trigger details. |

## Ship — owner: `6-ship`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| SHIP-001 | resolved | `52` | `package.json` — the root-only `exports` map, the `files` allowlist (including both shader asset trees), `publishConfig` public, and corrected metadata (drop `FxShader`). | any publish; `IMPL-001` | `package.json` matches `52` — **done (U1-001):** root `exports`, `files` allowlist shipping both asset trees, `publishConfig` public, `FxShader` dropped; `npm pack --dry-run` verified |
| SHIP-002 | resolved | `53` | The runtime guard UX when no rung is satisfiable — a no-op, a static fallback, or a dev warning. | — | **Resolved (DOC-012, 2026-06-10).** `53` Decision 7 records the policy: silent omission in production, `__DEV__` console warning. Motion no-rung maps to instant placement. No static fallback invented unless the ladder itself defines one. |
| SHIP-003 | resolved | `53` | A bare React Native + Fabric example in CI so the install path does not rot. | — | **Done (U1-004, 2026-06-07/08).** `example-bare/` wired into `.github/workflows/ci.yml` — all 4 jobs green (ts, swift, bare-ios compile, bare-android autolink). Recorded in `53`. |
| SHIP-004 | deferred | `53` | A config plugin, introduced only when a real V2 native mod forces it. | — | a V2 native mod triggers it |

## Implementation / cross-cutting — owner: `7-implementation`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| IMPL-001 | resolved | `6-ship` review; `52`/`53`/`51`; blueprint Unit 1 | The package-identity and scaffolding pass: rename `FxShader*` natives to `Fx*` + substrate-specific view classes; add the Android module + `android` platform to `expo-module.config.json`; rename the podspec to `ReactNativeFx` with `resource_bundles`; create `packages/android/` (`.agsl`); restructure `packages/src/` into the layered `surface`/`motion`/`effects`/`presets`/`manifest`/`runtime` + root `index.ts`. **Scaffolding pass done (U1-001, headless).** All three residual rows now resolved: `RT-010` (substrate view registration, U1-003), `REAL-002` (native build / metallib bundling, U3-005 — build-verified on Xcode 26.5, not device as previously stated), `SHIP-001` (package identity, U1-001). | — | **Resolved (U3-005, 2026-06-09).** All consumed rows resolved; `52`/`53`/`51` consistent with shipped package. U1-001 is thereby unblocked — its closure is a separate handoff. |

## Reconciliation with plane 7 (materialized, pending closure)

`data-layer.md` and `architecture.md` provision concrete values and structures for many rows above, ahead of the plane docs, to unblock the build. Per the closure rule, **provisioning is not closure.** This is a **ratification queue, not a propagation queue**: plane `7` can provision a value, but it cannot close a source-plane decision by itself. Several provisioned values are still `[finding]`s or device-pending, so each row names the action required *before* its source doc can close it:

- **propagate** — the value is sound; copy it into the source doc and close the row.
- **ratify** — plane `7` made a call the source doc still frames open; confirm the *design* first, then propagate.
- **device-verify** — the value is provisional; prove it on device before it can close.
- **rework** — the value is questionable and likely needs redesign.

| row | provisioned in | plane-`7` provisioned value | action |
|---|---|---|---|
| SPINE-003 | `data-layer` §1 | uniforms inlined per node; `motion` uses `properties` | **resolved** — `02` widened to include `boolean`/`color[]` (U2-002). TypeScript types are manually maintained alongside the manifest per blueprint Unit 2, not generated. |
| SPINE-007 | `data-layer` §8 (I7) | the manifest names the lib package via `applyVia`/`asset` (`Haze`, `lottie`) | **resolved** — `02` Decision 13: `applyVia` = library name, `asset` = asset type, no version in manifest. |
| SURF-003 | `data-layer` §3/§5 | V1 vocab (`transient`; `lift`; `native`; `edge-glow`/`mesh-gradient`/`glass`) | **resolved (DOC-005, 2026-06-09); presence narrowed (DOC-018, 2026-06-11)** — V1 set ratified in `50`/`56`; `sheet`/`modal` deferred to MOT-001; springs remain device-verify (→ MOT-001) |
| SURF-004 | `data-layer` §5 | `lift` states `idle`/`selected` | **resolved (DOC-005, 2026-06-09)** — V1 state set ratified in `57`/`41` |
| SURF-005 | `data-layer` §5 | `native` feedback | **resolved (DOC-005, 2026-06-09)** — V1 feedback value ratified in `57` |
| SURF-006 | `data-layer` §9 (D3) / §10 | `FxGroup` iOS-only V1; Android flat fallback | **resolved (DOC-006, 2026-06-10)** — morph scope ratified in `57`/`21` |
| SURF-009 | `data-layer` §8 (I2) | `SpringTune` removed — use `Transition.spring` + `tune` | **resolved** — propagated to `55` (DOC-001). `41` already clean. |
| SURF-010 | `data-layer` §5.1 | native `previousProps` value-equality → no manual memo | **resolved (DOC-015, 2026-06-09)** — guidance propagated from `data-layer` §5.1 into the owning plane-1 source docs; `50`/`54`/`55` §Open questions now record the resolution, so the row closes in source, not in plane 7. |
| MOT-001 | `data-layer` §3 | the full preset catalog (iOS springs `[device-pending]`) | **device-verify** before source closure; then propagate confirmed values |
| MOT-002 | `data-layer` §4 | `tune` = `speed`/`emphasis`/`distance` + scaling formulas | **device-verify** the spring constants; then propagate to `41` |
| FX-001 | `data-layer` §1 | `fill` exposes the full `width×height` mesh grid + `drift` | **resolved** — propagated to `20`/`50` (DOC-007). Full-grid mesh is V1; N-stop sugar is out of V1; `drift` is mesh-only. |
| FX-003 | `data-layer` §1 | `intensity` 0–1; Android `RenderEffect` blur + `Haze` below 31 | **resolved (U3-003 device gate, 2026-06-11)** — staleness clean on hardware; intensity mapping ratified in `21` Decision 6 |
| FX-004 | `data-layer` §6 | a V1 shader starter set (5 implemented) + reserved vocabulary | **resolved** — propagated to `22`/`50` (DOC-007). The catalog has 10 ids; five are implemented starter shaders, and five need native implementation before package exposure. |
| FX-006 | `data-layer` §7 | `registerShader` API + asset locations + build integration | **resolved (U3-004, 2026-06-10)** — contract ratified in `22` Decision 6; `data-layer.md` §7 reconciled. |
| FX-009 | `data-layer` §9 (D4) | Android `symbol` = Lottie + AVD fallback, else `{via:'none'}` | **resolved** — propagated to `24` and `structure.android` (DOC-008). V1 is iOS-only; Android AVD/Lottie stays planned/deferred and non-selectable. |
| RT-008 | `data-layer` §9 (D1) + `architecture` §2 | the view model — **3 registered views** (`FxHostedView`/`FxSurfaceView`/`FxGroupView`); presence/state/press lower to `FxSurfaceView` + a coordinator/recognizer object and ship as `src/surface/` components, not dedicated views | **propagate** — the view model is reconciled to 3 views (D1 + RT-010 resolved; phantom binding refs swept by DOC-014). Residual **runtime-object granularity** (driver family-split + scheduling) stays open in `36` — that is RT-008's actual subject. |
| RT-010 | `data-layer` §9 (D1/D2) + `architecture` §1 | one module `ReactNativeFx`, several named views; rename `FxShader`→`ReactNativeFx` | **resolved** — reconciled during U1-002; SDK-verified on U1-003. `architecture.md` §1 lists the three real views (`FxHostedView`/`FxSurfaceView`/`FxGroupView`); registration keying confirmed. (The phantom `FxPresenceView`/`FxManagedView`/`FxPressableView` entries that previously sat alongside them in §1 were removed by DOC-014 — never an RT-010 residual.) |
| RT-015 | `architecture` §2 / `data-layer` §1 | the wrapper-mechanic terms reconciled to "intermediate container" | **resolved** — `33`/`34` decide the real target object; `architecture`/`data-layer`/`blueprint.md` reconciled; `structure.ios`/`structure.android` pinned |

**Default to `ratify`/`rework` over `propagate` when in doubt.** The cost of laundering a plane-`7` guess into a source-of-truth decision is higher than a second look.

## Resolved baseline (anchors)

Load-bearing decisions that are closed. They are not the focus — they are here so close conditions and build units have stable anchors to reference. Each carries status `resolved`.

- **Thesis** (`00`) — fx is a native presentation runtime, not a UI kit, shader engine, or canvas; it owns the slice between layout and pixels, for effects and motion.
- **Two substrates** (`01`) — `hosted` (decorative) vs `expo-view`; fx-managed interaction *and* wrapped-content motion require `expo-view`.
- **The manifest is the single source of truth** (`02`) — node ids are the naming authority; a node with no satisfiable rung degrades to `{via:'none'}`, never throws.
- **Motion is one driver node** (`02`/`41`) — content rung + effect rung; `presence` and the chain's `.animate()` are orchestrations over it, not new primitives.
- **The law is shape-native** (`41`/`04`) — platform-native shape *and* timing; only an explicit `motion` override goes cross-platform-uniform (and fixes the *semantic* shape; measured magnitudes still resolve natively).
- **The contract** (`40`/`04`) — targets in, native owns frames, events out; no per-frame JS in either direction.
- **Five owners** (`04`) — fx owns presentation only; it reads layout never writes it, coordinates unmount never seizes it, owns the wrapper never the child.
- **Expo Modules + Fabric is the default boundary** (`05`/`33`) — no JSI/C++; source-audit PASS (identity holds, layout readable); fx animates an fx-owned, Fabric-invisible wrapper.
- **Native emits, JS releases** (`35`) — the deferred-unmount handshake; React owns the tree.
- **Adapter is V1, compiler is additive V2** (`03`) — both consume the same manifest.
- **No config plugin in V1; `via:'lib'` is an optional peer dependency** (`53`) — the rule is settled; the optional-peer rule is resolved in `53` decision 6 and the naming convention is resolved in `02` Decision 13 (SPINE-007).
- **One publishable package, root export for V1** (`52`) — subpaths are optional V2 polish.
- **M3 Expressive is progressive enhancement, not the default** (`structure.android`) — the platform standard spring is the default.
- **iOS glass is the SwiftUI-hosted `.glassEffect` rung** (`structure.ios`/`21`) — backed by the system glass UIKit surfaces as `UIGlassEffect`; one rung, not two.
- **`controlled` mode writes are discrete or UI-thread** (`30`/`40`) — never per-frame `setUniform` from the JS thread.

## Maintenance

- **Add a row** when a doc raises a decision that outlives its own page — anything another plane or a build unit waits on. Keep the reasoning in the source doc; the row carries only the decision and its close condition.
- **Close a row** only after the close condition is true in the source doc — never on this ledger's authority alone (the closure rule). Then flip the status to `resolved`. A `doc-cleanup` row closes when the wording lands; a `device-pending` row closes when the device check passes; an `open` row closes when the decision is written into its source. A value materialized in `data-layer.md` does not close a row until its plane doc records it (see Reconciliation).
- **Do not duplicate.** One decision is one row, owned by one plane, even when several docs touch it (the per-platform default catalog and the falsification test are single rows by design). Cross-reference with the other docs' IDs rather than forking the entry.

## Sources

- Every plane's "Open questions" / "Open research targets" sections (`0-spine` through `6-ship`), harvested into one index.
- `blueprint.md` (the build units these decisions gate), `subtask-protocol.md` (the authority chain a unit traces), `research/README.md` (the plane model this ledger sits at the top of).
