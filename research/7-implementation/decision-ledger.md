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

**Plane `7` also materializes.** `data-layer.md` and `architecture.md` provision concrete values and structures (the preset catalog with springs, the `tune` formulas, the five-view object model, the folder layout) ahead of the plane docs, to unblock the build. Provisioning is **not** closure: where a value is materialized in `data-layer.md`/`architecture.md` but its owning plane doc still frames the question open, the row stays open and the residual work is *propagate the value back to the source doc, then close it*. The [Reconciliation with plane `7`](#reconciliation-with-plane-7-materialized-pending-closure) section is that punch-list.

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
| SPINE-001 | open | `00` | Where curation ends and BYO begins. Lean: a small curated catalog, grown on real demand. | catalog scope (`FX-004`) | a written curation-vs-BYO threshold in `00` (catalog size, or the capability trigger that flips to BYO) |
| SPINE-002 | open | `00`/`50`/`52` | Palettes/themes as a shareable distribution artifact (a `lab` surface of their own). | presets surface | a ship-or-`lab` decision recorded in `52` |
| SPINE-003 | resolved | `02`/`50` | Where per-effect typed config lives, and how the surface gets its TS types. Lean: canonical in the manifest, generate TS from it. | surface typing, BYO uniforms (`FX-006`) | **Resolved (U2-002, 2026-06-08).** `02` UniformSpec widened to include `boolean` and `color[]` to match `data-layer.md`. Types in `packages/src/manifest/types.ts` kept in sync manually. Provisional mismatch note removed from `data-layer.md`. |
| SPINE-004 | open | `02`/`50` | Where `composition` (background/overlay/surface) sits. Lean: an API-layer prop, not the manifest. | — | placement decided in `02`/`50`; confirmed not to leak into Yoga ownership |
| SPINE-005 | open | `02` | The `feature`-flag vocabulary (enumerate vs free-form) and multiple-assets-per-rung (`assets: Asset[]`). | — | pinned when a real shader/feature case forces it |
| SPINE-006 | open | `02` | Manifest partitioning — one file vs split per node/layer as the node count grows. | how `structure.*` render | a structure chosen at implementation |
| SPINE-007 | open | `02`/`53` | `via:'lib'` — whether the manifest names the package + version. The optional-peer rule is resolved; only naming is open. | — | a naming convention chosen for `lib` rungs |
| SPINE-008 | deferred | `03` | The compiler — its IR surface, the concrete build trigger, and emitter targets (shaders only vs +binding stubs). | author-once BYO/novel composition | BYO/novel-composition demand triggers the build-time emitter |
| SPINE-009 | device-pending | `04`/`05`/`33`/`35`/`36` | **The falsification test.** Coordinator/wrapper identity holds across Fabric commits, and fx reads the post-layout frame natively on async events. Source-audit PASS; device proof pending. | the Expo-Modules-sufficiency default (the whole no-Nitro bet) | on-device proof identity holds and layout reads natively; failure triggers `SPINE-010` |
| SPINE-010 | deferred | `05`/`33`/`42` | Per-child control (staggered children, child-anchored `menu`/`tooltip`) is the trigger to re-evaluate Nitro / raw Fabric vs Expo Modules. | anchored presence (`MOT-009`) | a re-run of the boundary decision the day per-child control is needed |
| SPINE-012 | device-pending | `01` | The hosted-substrate device unknowns — Android `RNHostView` touch/sizing parity with iOS; self-gesturing system components (glass `.interactive()`) inside RN scrollers; performance of many hosted boundaries vs one grouped `Host`. | hosting correctness at scale | the Android hosting matrix and a many-boundaries perf check pass on device |
| SPINE-013 | resolved | `02` | **Planned-rung selection policy.** `select()` skips both `out-of-scope` and `status:'planned'` rungs by default — planned rungs stay documented in the manifest but are not selectable at runtime. | the executable V1 manifest | **Implemented (U2-001, 2026-06-08).** `select()` skips `planned` and `out-of-scope` rungs. `02` selection rule updated. Typed `select()` in `packages/src/manifest/select.ts` with 17 Jest tests. |

## Surface — owner: `1-surface`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| SURF-001 | resolved | `56` | Whether `GlassView` stays a curated-effect-component candidate. Lean: remove (glass stays `<Fx effect="glass">`). | V1 API naming | **Resolved (DOC-001, 2026-06-08).** `GlassView` removed from `56` — `56` no longer lists un-ratified component names. |
| SURF-002 | open | `56`/`52` | Whether to ship the named effect-component sugar at all (`EdgeGlow`/`MeshGradient`/…). Lean: a small curated set, sugar over `<Fx effect="…">`. | the V1 export map (`SHIP-001`) | a ship decision recorded in `6-ship` |
| SURF-003 | open | `50`/`56` | The V1 `preset`/`feedback`/`effect` value vocabularies (`transient`/`lift`/`native`/…), behavior-named. | the surface API | the V1 vocabulary pinned (pairs with `MOT-001`) |
| SURF-004 | open | `57`/`40`/`56` | The `FxView` named-state vocabulary (`idle`/`selected`/…) and its `MotionSpec` map per preset. | `FxView` state API | the per-preset state set pinned |
| SURF-005 | open | `57` | `FxPressable` `feedback` values (`native` plus any named variants). | `FxPressable` API | the feedback vocabulary pinned (+ defaults in `MOT-001`) |
| SURF-006 | open | `57`/`21` | `FxGroup` morph scope (which effects beyond glass support cross-item morph) and the `spacing`/merge-threshold contract. | the glass compound API | morph scope and merge semantics defined |
| SURF-007 | deferred | `54` | A root overlay/portal for `transient`/`modal`. Lean: the app's job in V1. | — | revisit post-V1 only if placement proves insufficient |
| SURF-008 | deferred | `55` | The `Fx.Stack` JSX-compound skin over the identical `EffectStack`. | — | build on real demand |
| SURF-009 | resolved | `55`/`41` | The `SpringTune` shape — how spring/emphasis map to platform spring families. | — | **Resolved (DOC-001, 2026-06-08).** `SpringTune` removed from `55`; `Transition.spring` uses raw spring parameters. Canonical `tune` API (`speed`/`emphasis`/`distance`) covers intent adjustment (`data-layer.md` I2). |
| SURF-010 | resolved | `50`/`54`/`55` | Memoization guidance — inline `uniforms`/`tune`/stack literals re-resolve each render; `data-layer` §5.1 claims native `previousProps` value-equality makes manual memo unnecessary. | — | **Verified on SDK 56, iOS + Android (2026-06-08).** `previousProps` compares both primitive and nested `Record` props by value. `@Field` defaults fill omitted fields. Guidance ratified in `data-layer` §5.1. |

## Effects — owner: `2-effects`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| FX-001 | resolved | `20`/`50` | Mesh control-point ergonomics (full `width×height` grid vs N-stop sugar); whether `drift` is mesh-only. | — | **Resolved (DOC-007, 2026-06-08).** V1 exposes the full `width × height` mesh grid. N-stop auto-placement sugar stays out of V1. `drift` is mesh-only; plain gradients stay static unless a later capability adds explicit animated-gradient semantics. |
| FX-002 | device-pending | `21` | `UIGlassEffect.Style` case set — `.regular`/`.clear` confirmed, `.identity` unverified. | — | a device check on Xcode 26 |
| FX-003 | open | `21`/`structure.android` | Android glass fallback default (own-content blur vs `Haze`; `RenderEffect` is stale-prone) and `intensity` normalization to 0–1 across iOS `fractionComplete` and Android blur radius. | Android glass contract | the Android glass default + uniform mapping pinned |
| FX-004 | resolved | `22`/`50` | The curated `ShaderId` V1 catalog and its uniforms (reconcile the historical sets). | shader shipping | **Resolved (DOC-007, 2026-06-08).** V1 catalog is `fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`, `dots`, `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow`. Public V1 uniforms are shared/minimal (`intensity`); `time`, `resolution`, `pressDepth`, and `touch` stay native-owned. The last five ids require native implementation before package exposure (tracked by U3-006). |
| FX-005 | device-pending | `22` | Uniform struct alignment Swift↔MSL field order/stride, and the AGSL binding equivalent. | — | on-device Metal/AGSL integration |
| FX-006 | open | `22`/`03`/`53` | The BYO asset registration contract — `.metal`+`.agsl` pair, uniform table, build step, manifest entry. | BYO shipping | the BYO contract and build wiring defined |
| FX-007 | deferred | `22` | Runtime shader compilation (possible on both platforms). | — | post-V1 feature |
| FX-008 | deferred | `23` | An Android content-filter wrapper (touch-safe, draw-time). | — | resolved with `content-distort` scoping (V2) |
| FX-009 | resolved | `24` | Android `symbol` scope — ship via Lottie/AVD or stay iOS-only in V1 — plus the cross-platform asset-sourcing contract. | the Android `symbol` rung (`REAL` renders it `status:planned`) | **Resolved (DOC-008, 2026-06-08).** `symbol` is iOS-only in V1 through `.symbolEffect`. Android AVD/Lottie support stays planned/deferred and non-selectable; Android degrades to `{via:'none'}`. The future Android asset contract does not ship in V1. SPINE-007 remains open for the broader `via:'lib'` naming convention. |

## Motion — owner: `3-motion`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| MOT-001 | device-pending | `41`/`42`/`56`/`57`/`structure.*` | **The per-platform default catalog.** Every `(preset × phase/state)` row's named platform source, shape, and spring — device-filled, passing `41`'s law test. | the shape-native law's audit; `preset`/`feedback` shipping (`SURF-003`/`005`) | the catalog filled on device and parity-checked against each platform |
| MOT-002 | open | `41` | The `tune` dimension vocabulary (`speed`/`emphasis`/`distance` — enough?) and the minimal animatable-property set. | `tune` API | the `tune` vocabulary and property set pinned |
| MOT-003 | open | `41` | Which semantic primitives ship V1 (`appear`/`dismiss` certain; `emphasis`/`pressResponse` V1 or V2) and whether to borrow Compose's `fadeIn`/`slideIn` names. | the V1 motion primitive set | the V1 primitive set and naming pinned |
| MOT-004 | deferred | `41` | Partial-override sugar (`edge`/`origin`). It is binary for now: `preset` *or* explicit `motion`. | — | reconsider as scoped `FxPresence` sugar only if demand is real |
| MOT-005 | open | `40` | `transition` scope — all uniforms, or per-uniform easing config. | — | the `transition` config shape decided |
| MOT-006 | open | `40` | The Regime-C option-1 native-source-read API (track a native scroll/pager natively); V1 or V2. | — | the surface and phase decided |
| MOT-007 | deferred | `40` | The Regime-C option-2 UI-thread channel (Reanimated shared values bound to a uniform). | — | post-V1, additive over the same uniform names |
| MOT-008 | open | `40`/`34` | How a BYO author declares an intro/outro envelope in `.metal`/`.agsl`, not hardcoded to the curated glow. | BYO envelopes | an envelope-declaration contract |
| MOT-009 | open | `42`/`35` | Named states beyond binary `visible` (multi-step intro→hold→outro; one-shot bursts). | — | the extended state model decided (V1 or V2) |
| MOT-010 | open | — (gap → `3-motion`) | **Coverage gap (no doc covers this yet):** honor OS reduce-motion / animation-scale settings (iOS `UIAccessibility.isReduceMotionEnabled`, Android animator-duration-scale) — degrade to instant or opacity-only envelopes. | accessible motion shipping | a reduce-motion policy recorded in `41`/`42` and honored by the driver (`34`) |

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
| RT-016 | device-pending | `34` | Animator sufficiency — whether `CASpringAnimation`/`dynamicanimation` give enough control, or a custom displacement integrator is needed (open in `34`). | the driver's primitive choice (RT-007) | on-device proof the platform animators handle the harder retarget cases, or a decision to build the integrator |
| RT-008 | open | `36` | Runtime-object granularity — one driver with two families vs two objects; `FxEffectRenderer` decorative-vs-interactive split; shared vs per-object scheduling. Lean: one driver, two families, shared scheduling. | the object graph (Unit 9) | the object graph finalized at implementation |
| RT-009 | resolved | `51`/`01` | The exact Expo path to author a hosted view (mount a SwiftUI/Compose host, pass props/children; expo/expo#46549). | the hosted substrate | **Resolved (U3-001, 2026-06-08).** `FxHostedView` embeds `UIHostingController` (iOS) and plain `View`-based renderer (Android). Props cross the Expo boundary. Device-verified on iOS 26+ and Android. `51` open question closed. Compose deferred — V1 uses `View.onDraw()`. |
| RT-010 | resolved | `51` | One vs several native view classes. Lean: several substrate-specific (`FxHostedView`/`FxSurfaceView`); only registration ergonomics remain. | blueprint Unit 1, `IMPL-001` | **Verified on SDK 56, iOS + Android (2026-06-08).** Three views resolve without duplicate-registration errors. Fast refresh clean. |
| RT-011 | resolved | `51` | `@Field` `Record` coercion of absent uniforms on the pinned SDK. | — | **Verified on SDK 56, iOS + Android (2026-06-08).** `@Field` defaults fill omitted fields on both platforms. |
| RT-012 | open | `35` | Whether the handshake generalizes to a general native-eased declarative-state primitive, or stays presence-specific in V1. | — | V1 stays presence-specific unless demand appears |
| RT-013 | device-pending | `33` | Content-motion hosted-reachability (strictly `expo-view`?) and New-Architecture-only vs a Paper fallback. Lean: `expo-view` + New Arch only (SDK 56 floor). | — | confirmed on device |
| RT-014 | device-pending | `33`/blueprint Unit 4 | The `mountChildComponentView` override that routes RN children into the fx-owned, Fabric-invisible container — the mechanic that makes the wrapper wrap anything. | the content wrapper (blueprint Units 4–7) | the override verified on Fabric on device |
| RT-015 | open | `33`/`34` (+ `structure.{ios,android}` for platform mechanics) | **The exact wrapper mechanic — native container vs sublayer.** `architecture`/`data-layer` (consumers) mix "layout-transparent container", "native sublayer", and `contentView.layer.addSublayer(animatedLayer)`; the object the animator actually targets is left implicit — too load-bearing to leave so. | the content-motion runtime (blueprint Units 4–6) | `33`/`34` decide the exact object the animator targets, how children ride along, and the hit-testing guarantee — then `architecture`/`data-layer` are reconciled to match |

## Realization — owner: `5-realization`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| REAL-001 | device-pending | `structure.android` | Pin the concrete M3 Expressive floor. It is progressive enhancement over the standard spring, version-fluid until pinned. | Android motion defaults | a concrete minimum pinned and the standard-spring fallback verified |
| REAL-002 | device-pending | `52`/`structure.ios` | CocoaPods emits `FxShaders.bundle` unmangled and `MTL_LIBRARY_OUTPUT_DIR` lands `default.metallib` at the bundle root on SDK 56. | iOS shader loading | build verification on the pinned toolchain |
| REAL-003 | open | `52`/`structure.android` | The exact AGSL asset packaging path (assets vs res/raw) and the runtime read API. | Android shader loading | the path pinned with `structure.android` |
| REAL-004 | resolved | `52`/`03` | Single source for the curated shaders — author once (GLSL/SkSL) and transpile, or hand-maintain the MSL+AGSL pair. | — | **Resolved (DOC-013, 2026-06-08).** V1 curated shaders are hand-maintained MSL+AGSL pairs. The author-once compiler remains additive V2 build-time codegen per `03`; SPINE-008 stays deferred for compiler IR/build-trigger details. |

## Ship — owner: `6-ship`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| SHIP-001 | resolved | `52` | `package.json` — the root-only `exports` map, the `files` allowlist (including both shader asset trees), `publishConfig` public, and corrected metadata (drop `FxShader`). | any publish; `IMPL-001` | `package.json` matches `52` — **done (U1-001):** root `exports`, `files` allowlist shipping both asset trees, `publishConfig` public, `FxShader` dropped; `npm pack --dry-run` verified |
| SHIP-002 | open | `53` | The runtime guard UX when no rung is satisfiable — a no-op, a static fallback, or a dev warning. | — | the no-rung degradation behavior recorded in `53` |
| SHIP-003 | resolved | `53` | A bare React Native + Fabric example in CI so the install path does not rot. | — | **Done (U1-004, 2026-06-07/08).** `example-bare/` wired into `.github/workflows/ci.yml` — all 4 jobs green (ts, swift, bare-ios compile, bare-android autolink). Recorded in `53`. |
| SHIP-004 | deferred | `53` | A config plugin, introduced only when a real V2 native mod forces it. | — | a V2 native mod triggers it |

## Implementation / cross-cutting — owner: `7-implementation`

| id | status | source | decision / pending work | blocks | close condition |
|---|---|---|---|---|---|
| IMPL-001 | implementation-pending | `6-ship` review; `52`/`53`/`51`; blueprint Unit 1 | The package-identity and scaffolding pass: rename `FxShader*` natives to `Fx*` + substrate-specific view classes; add the Android module + `android` platform to `expo-module.config.json`; rename the podspec to `ReactNativeFx` with `resource_bundles`; create `packages/android/` (`.agsl`); restructure `packages/src/` into the layered `surface`/`motion`/`effects`/`presets`/`manifest`/`runtime` + root `index.ts`. **Scaffolding pass done (U1-001, headless):** identity rename, podspec `ReactNativeFx`, `android` platform + module skeleton, layered `src/` + root `index.ts`; `tsc`/`build` green. **Residual before close:** the substrate-specific view-class registration (`RT-010`, U1-002) and the native build/autolink proof (`REAL-002`, device). | a research-aligned, publishable package | the package builds and describes itself per `52`/`53`/`51`; Consumes `SHIP-001` (resolved), `REAL-002`, `RT-010` |

## Reconciliation with plane 7 (materialized, pending closure)

`data-layer.md` and `architecture.md` provision concrete values and structures for many rows above, ahead of the plane docs, to unblock the build. Per the closure rule, **provisioning is not closure.** This is a **ratification queue, not a propagation queue**: plane `7` can provision a value, but it cannot close a source-plane decision by itself. Several provisioned values are still `[finding]`s or device-pending, so each row names the action required *before* its source doc can close it:

- **propagate** — the value is sound; copy it into the source doc and close the row.
- **ratify** — plane `7` made a call the source doc still frames open; confirm the *design* first, then propagate.
- **device-verify** — the value is provisional; prove it on device before it can close.
- **rework** — the value is questionable and likely needs redesign.

| row | provisioned in | plane-`7` provisioned value | action |
|---|---|---|---|
| SPINE-003 | `data-layer` §1 | uniforms inlined per node; `motion` uses `properties` | **resolved** — `02` widened to include `boolean`/`color[]` (U2-002). TypeScript types are manually maintained alongside the manifest per blueprint Unit 2, not generated. |
| SPINE-007 | `data-layer` §8 (I7) | the manifest names the lib package via `applyVia`/`asset` (`Haze`, `lottie`) | **ratify** — `applyVia:'Haze'` appearing is not a closed naming convention; decide it, then propagate to `02` |
| SURF-003 | `data-layer` §3/§5 | V1 vocab (`transient`/`sheet`/`modal`; `lift`; `native`; `edge-glow`/`mesh-gradient`/`glass`) | **ratify** the V1 set, then propagate to `50`/`56`; springs **device-verify** (→ MOT-001) |
| SURF-004 | `data-layer` §5 | `lift` states `idle`/`selected` | **ratify** — confirm the V1 state set, then propagate to `57` |
| SURF-005 | `data-layer` §5 | `native` feedback | **ratify** — confirm, then propagate to `57` |
| SURF-006 | `data-layer` §9 (D3) / §10 | `FxGroup` iOS-only V1; Android flat fallback | **ratify** — morph scope is still open; confirm before propagating to `57`/`21` |
| SURF-009 | `data-layer` §8 (I2) | `SpringTune` removed — use `Transition.spring` + `tune` | **resolved** — propagated to `55` (DOC-001). `41` already clean. |
| SURF-010 | `data-layer` §5.1 | native `previousProps` value-equality → no manual memo | **propagate** — verified on SDK 56; both primitive and nested Record props compare by value. Guidance ratified in `data-layer` §5.1. |
| MOT-001 | `data-layer` §3 | the full preset catalog (iOS springs `[device-pending]`) | **device-verify** before source closure; then propagate confirmed values |
| MOT-002 | `data-layer` §4 | `tune` = `speed`/`emphasis`/`distance` + scaling formulas | **device-verify** the spring constants; then propagate to `41` |
| FX-001 | `data-layer` §1 | `fill` exposes the full `width×height` mesh grid + `drift` | **resolved** — propagated to `20`/`50` (DOC-007). Full-grid mesh is V1; N-stop sugar is out of V1; `drift` is mesh-only. |
| FX-003 | `data-layer` §1 | `intensity` 0–1; Android `RenderEffect` blur + `Haze` below 31 | **device-verify** `RenderEffect` staleness; **ratify** the intensity mapping |
| FX-004 | `data-layer` §6 | a V1 shader starter set (5 implemented) + reserved vocabulary | **resolved** — propagated to `22`/`50` (DOC-007). The catalog has 10 ids; five are implemented starter shaders, and five need native implementation before package exposure. |
| FX-006 | `data-layer` §7 | `registerShader` API + asset locations + build integration | **ratify** — BYO is still open; confirm the contract before propagating to `22` |
| FX-009 | `data-layer` §9 (D4) | Android `symbol` = Lottie + AVD fallback, else `{via:'none'}` | **resolved** — propagated to `24` and `structure.android` (DOC-008). V1 is iOS-only; Android AVD/Lottie stays planned/deferred and non-selectable. |
| RT-008 | `data-layer` §9 (D1) + `architecture` §2 | the five-view object model | **propagate** the view model; residual driver family-split + scheduling stays open in `36` |
| RT-010 | `data-layer` §9 (D1/D2) + `architecture` §1 | one module `ReactNativeFx`, several named views; rename `FxShader`→`ReactNativeFx` | **propagate** — reconciled during U1-002; SDK-verified on U1-003. `architecture.md` already reflects several views (quoting `51 §Decisions #5`). Registration keying confirmed. |
| RT-015 | `architecture` §2 / `data-layer` §1 | the wrapper-mechanic terms (container vs sublayer vs `addSublayer`) — internally inconsistent | **rework** — plane `7` mixed three descriptions; `33`/`34` decide the real target object, then reconcile `architecture`/`data-layer` |

**Default to `ratify`/`rework` over `propagate` when in doubt.** The cost of laundering a plane-`7` guess into a source-of-truth decision is higher than a second look. RT-015 (the wrapper mechanic) is the standing example: a plane-`7` materialization that is internally inconsistent, not yet a decision — which is why it carries `rework`, not `propagate`.

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
- **No config plugin in V1; `via:'lib'` is an optional peer dependency** (`53`) — the rule is settled; only package/version naming is open (`SPINE-007`).
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
