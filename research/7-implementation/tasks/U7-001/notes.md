# U7-001 — notes

## Unverified claims (need device proof)

- All five React-semantics rules are source-grounded, not device-proven — each remains a
  U7-002 device row (StrictMode, Fast Refresh, Suspense hide, re-render mid-exit, eviction).
- The stranded-exit guard's trigger (host ref → null on a Fast Refresh remount mid-exit) is
  inferred from RN/Expo source; verify the ref-detach actually fires in that order on device.
- SPINE-009 (identity across commits) stays device-pending — U9-002.
- (impl) The `transient` envelope shape/timing are provisional `data-layer §3` values, device-
  pending (MOT-001) — only the handshake is proven headless.
- (impl) `onTransitionEnd` ordering under rapid toggles (`35` open question): the FSM emits the
  cut-short phase `interrupted:true` then the settling phase `finished:true` — observed order on
  device is the thing to confirm.
- (impl) Deferred unmount, reduce-motion single-frame, teardown-during-exit, measured-edge travel
  via `FxLayoutObserver` — all animation/layout/lifecycle, device-only. Scenario: `evidence/device.md`.

## 2026-06-11 — references preflight (read-only research + doc corrections, no code)

- Ran the `agents/references-preflight.md` protocol on the `35` handshake / `54` contract;
  fan-out over `references/{reanimated,react-native,expo}` (gesture-handler checked and
  dropped — eager teardown, no precedent). Verdict: **sound** — JS mount retention is
  Fabric's own differ semantics (no `Remove` for a retained child); Reanimated's commit hook
  serves only the no-wrapper, removal-inferred-exit case rule #7 forbids and fx's model
  excludes.
- Wrote `preflight.md` (this folder) — brief, per-reference file:line findings, synthesis,
  verdict, deltas.
- `35`: status line; two new invariants (stranded-exit guard, snapshot semantics); a new
  source-audit bullet (differ + mounted-only events); React-semantics table rewritten from
  open questions to resolved rules; two research questions struck as resolved; falsification
  open question annotated.
- `54`: snapshot-semantics sentence added to the lifecycle contract (rule owned by `35`).
- `decision-ledger.md`: SPINE-009 annotated (reinforced, still device-pending). SPINE-010
  untouched — flip trigger unchanged.
- `progress.md`: U7-001 row annotated (state stays `todo`; still blocked by U6-001).
- `structure.{ios,android}.md`: deliberately untouched — no per-platform mechanic changed;
  the handshake lives in `35`.

## 2026-06-12 — task spec'd (planner)

- Wrote `README.md` — the work order. Carries the five `35` FSM rules, the stranded-exit
  guard, snapshot semantics, and the U6-001 `onContentAnimationCompletion` hook as the
  driver attachment point. Scopes the presence vertical in four pieces: src/motion
  (MotionSpec + the four V1 builders — the TODO blank has no other owner), FxPresence.tsx
  (retention FSM + remap), FxPresenceCoordinator.swift/.kt (the `35` FSM on the driver),
  and the prop boundary (visible/preset/motion/transition/appear).
- Flagged for docs-closed: architecture.md's coordinator row sketches stale FSM state
  names ("holding"/"done"); `35` owns the naming (absent · entering · present · exiting).
- Closes no ledger row: MOT-001 consumed (U7-002 owns its device truth); SPINE-009 stays
  with U9-002.

Next: U6-001 device gate passes and merges → dispatch U7-001 with the cold-start prompt +
`Task: U7-001.`

## 2026-06-12 — implemented to headless-done (agent)

Built the four pieces; drove to `headless-done`. State `todo` → `headless-done`.

### JS — `src/motion`, `src/surface`, `src/fx.ts`, `src/index.ts`
- `motion/types.ts` — replaced the TODO blank with `MotionSpec`/`Edge`/`Origin`/`Travel`/
  `PresenceMotion` (the agnostic shape vocabulary, `41`).
- `motion/builders.ts` — `edgeIn`/`edgeOut`/`scale`/`identity`; the `effectiveMotion` fallback
  (`user ?? preset ?? identity`, no implicit reverse); `toPresenceMotionWire` normalization (the
  `Travel` union → flat `{value}|{measureEdge}` record, which an Expo `Record` can carry).
- `motion/index.ts`, `fx.ts` — barrels; `fx = { motion: {…} }` (effect builders join later).
- `surface/presenceMachine.ts` — the **pure** retention FSM (reducer + `childrenToRender`),
  extracted so it is Tier-1 testable (the test harness has no renderer): deferred unmount,
  interrupt-as-retarget, snapshot, stranded guard.
- `surface/FxPresence.tsx` — the public component: drives the reducer off `visible`, freezes the
  snapshot on hide, remaps `onFxTransitionEnd`→`onTransitionEnd` (prefix never leaks), host-ref
  stranded guard. `transition` accepted (API stability, `54`) but V1 honors the platform-default
  spring (custom authoring is MOT-001) — so it is **not** sent natively (no dead prop).
- `runtime/FxSurfaceView.tsx` — presence props + `onFxTransitionEnd` added to the binding type;
  `forwardRef` so the coordinator can observe host detachment.
- `index.ts` — export `fx`, `FxPresence` + types, the motion types.

### Native — both platforms
- `FxPresenceCoordinator.{swift,kt}` (new) — the `35` FSM on the U6-001 `FxAnimationDriver`,
  attached to its completion as the source. Away vector per phase (`user motion ?? preset ??
  identity`); `transient` is the provisional per-platform shape (iOS top / Android bottom);
  measured-edge travel reads `FxLayoutObserver`. Plain internal class — never a `SharedObject`.
  Carries the `FxTravel/MotionPhase/PresenceMotion` Records (+ `FxTransitionEndEvent` on Android).
- `FxSurfaceView.{swift,kt}` — owns the coordinator; presence setters latched into
  `applyResolvedConfig`; `snapContent` + `dispatchPresenceTransitionEnd`; repurposed
  `onContentAnimationCompletion` to route to the coordinator (was the reserved slot — only stale
  `build-u6` artifacts referenced it).
- `FxAnimationDriver.{swift,kt}` — added `snap(to:)` (instant placement) for the enter-start seat /
  reduce-motion / `appear:false`. No other driver change (U6-001 intact).
- `FxModule.{swift,kt}` — registered the four presence props on `FxSurfaceView`.

### Example
- `screens/presence.tsx` (new) + `data/tasks.ts` (`U7-001`, `screen:"presence"`) +
  `app/(tasks)/[taskId].tsx` — the device-scenario harness.

### Gates (all green)
- `packages/`: tsc, build, lint, test (58 pass — added `presence-machine.test.ts` +
  `motion-builders.test.ts`), `swift:lint`, `git diff --check`.
- Android `:react-native-fx:compileDebugKotlin` SUCCESSFUL; iOS `pod install` + example
  `xcodebuild` (iPhone 17 Pro sim) BUILD SUCCEEDED; `example/` tsc green.

### Decisions
- `motion` **is** wired natively (overrides the preset per phase) — the boundary lists it and it
  makes the builders non-dead; the device scenario here still exercises `transient` only.
- `origin` parsed into the wire but not applied (transient is translate+opacity only; a forward
  slot for the centered-scale `sheet`/`modal` presets).

Next: human runs `evidence/device.md` on iPhone + Android for `device-verified`; then review;
then docs-closed (strike the `35` ordering/source-of-truth questions only as far as the run
answers them; reconcile the `architecture.md` coordinator-row state names to `35`; flip `54`'s
"native mechanics open" status line). Closes no ledger row.

## 2026-06-12 — review round 1 fixes (agent)

Two blocking findings + one watch item, all addressed; gates re-run green.

- **F1 — planning-artifact refs in shipped comments.** Stripped every research-doc id (`35`/`40`/
  `41`/`42`/`34`/`54`), ledger id (DOC-018/MOT-001), and rule ref ("rule #4") from comments across
  8 `packages/` files — content kept, citations reworded to plain capability language ("the
  deferred-unmount handshake", "device-pending with the motion catalog", "the platform's tuned
  default"). Verified clean by grep over `packages/src` + the eight native files. Also reworded the
  example `presence.tsx` docblock to drop the build-unit id (the visible device-runner chip stays).
- **F2 — `transition` advertised inert config.** Narrowed `FxTransition` to `{ spring?: 'native' }`
  (the ratified default, an honest no-op) and **removed** the `FxSpringTransition` union + its
  public export (gone from `src` and `build`); the docblock notes the type widens when the
  device-tuned catalog lands. No driver touched.
- **Watch item — first-mount translate.** Added a check to `evidence/device.md` scenario 3: confirm
  the enter visibly translates (not just fades) on a fresh mount, since the first prop batch can run
  before layout lands (`contentHeight` → 0 fallback). Documented as a layout-timing observation, not
  a handshake failure.

Gates re-run: tsc/build/lint/58 tests/swift:lint/diff-check green; example tsc green; Android
`:react-native-fx:compileDebugKotlin` SUCCESSFUL (comment-only native changes). iOS unchanged at
the compile level (comment-only; prior `xcodebuild` BUILD SUCCEEDED holds, swift:lint green).
