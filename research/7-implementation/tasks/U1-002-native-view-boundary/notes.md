# U1-002 notes

## Unverified claims (need the device / CI gate)

- **Default-view registration keying.** Expo keys the first-registered view under the bare
  module name (`ReactNativeFx`), not `ReactNativeFx_FxHostedView`. Verified by reading
  `ModuleDefinition.swift:92` and `NativeViewManagerAdapter.native.tsx:161` — the keys match
  at the code level, but the actual runtime lookup (whether `requireNativeView('ReactNativeFx')`
  resolves correctly when `FxHostedView` is the default) is unverified headless. This is the
  RT-010 SDK-verify half, deferred to U1-003.
- **Android Kotlin registration.** `FxModule.kt` registers three view classes that extend
  `ExpoView`, but the Kotlin source is never compiled headless (`tsc`/`swift:lint`/`bun run build`
  check only JS + Swift formatting). Android registration is an unverified claim — same pattern as
  U1-001.
- **iOS Swift compilation and registration.** `swift:lint` runs swift-format (whitespace/style
  only, not swiftc). The `FxNativeView` base, the reparented `FxSurfaceView`, the new
  `FxHostedView`/`FxGroupView` shells, and the `FxModule` trio registration are not compiled or
  runtime-checked headless. Swift source is verified structurally + by swift-format only; true
  compilation and registration resolution needs Xcode (device/CI gate). Same caveat as Android:
  registration is a runtime fact for U1-003.

## What changed and why

- **Spec'd** — created `tasks/U1-002-native-view-boundary/README.md` from the subtask template.
  Authority links filled from `51`, `04`, `05`, `01`. Decision: `use` Expo Modules, register
  separate native view classes. Reference: `ModuleDefinition.swift:50-54`.

- **Audit (2026-06-07) — five findings, all applied:**
  - **Critical 1 (default-view JS binding).** Step 6 and the architecture/doc bindings called
    `requireNativeView('ReactNativeFx', 'FxHostedView')` for the default view — but Expo keys
    the first-registered view under the bare module name, so the second-argument form looks up
    `ReactNativeFx_FxHostedView` → undefined → crash. Fixed: the default binds with
    `requireNativeView('ReactNativeFx')` (no second argument); named views use the
    `('ReactNativeFx', 'FxSurfaceView')` form. Fixed the same bug in `architecture.md`
    (lines 123, 210, 273) and `data-layer.md` (line 888) — step 8 now owns all four fixes.
  - **Critical 2 (RT-010 cannot close headless).** RT-010's close condition requires SDK-verify
    registration ("confirmed on SDK 56"), which is a runtime fact tsc/build/swift:lint cannot
    prove. RT-010 closure is split: U1-002 does doc reconciliation + code + headless build;
    U1-003 owns the SDK-verify half. RT-010 stays `open` until U1-003. This mirrors how U1-001
    correctly carries IMPL-001.
  - **Moderate 3 (Android over-build).** Switched from "full Kotlin classes" to minimal
    `ExpoView` subclasses (same altitude as iOS shells). Kotlin is not compiled headless — full
    classes that do nothing are unverifiable over-build. Each shell opens with a `// TODO:`.
    Android registration is recorded as unverified headless.
  - **Moderate 4 (inert event surface).** Shared transition/load/error events + `snapshot()`
    are inert — no emitters call them until U3/U5/U7. Step 1 now documents this; step 5
    requires each View block's `Events(...)` to match the concrete view's dispatchers.
  - **Minor (file naming, TODO convention).** Step 6 now creates three separate binding files
    in `src/runtime/` (`FxHostedView.tsx`, `FxSurfaceView.tsx`, `FxGroupView.tsx`) — each
    file name matches its primary export. Steps 3/4/7 require minimal shells to open with
    `// TODO:` comments naming the slot and future work.

- **Second audit (2026-06-07) — four residual/new findings, all applied:**
  - **M1 (RT-010 orphaned).** After Critical-2 fix, no task closed RT-010 — U1-003 added
    `Consumes: RT-010` and `Closes: SURF-010, RT-010, RT-011, RT-005`. Tracker invariant
    restored ("every in-flight ledger row is closed by exactly one task"). U1-002 advances
    the doc-reconciliation half; U1-003 proves the SDK-verify half on device.
  - **M2 (iOS registration equally unverified).** Only Android flagged as unverified
    headless; iOS `swift:lint` is format-only, not swiftc. Expanded iOS unverified-claim
    bullet in notes.md to match Android's prominence. Updated progress.md proof line to
    state plainly what each command proves (and doesn't prove).
  - **m3 (TODO instructions embed build-unit ids).** Steps 3/4 said "per U3" and step 5
    said "expanded in U3" — replaced with capability-only language ("renderer not built
    yet"). The `// TODO:` instructions that go into code comments now name only the
    capability, no internal ids.
  - **m4 (step 8 work list stale).** Step 8 listed four fixes as if pending, but all
    four were already applied in the same session. Rewritten as a verify-already-applied
    checklist with ✅ marks. Added U1-003 as the RT-010 closer in the RT-010 carry note.

- **Third audit (2026-06-07) — one critical + two minor, all applied:**
  - **Critical (EventDispatchers on base silently don't wire).** `Mirror(reflecting: view).children`
    (EventDispatcher.swift:67) reflects only the concrete type's own stored properties — never
    walks `superclassMirror`. The Obj-C `responds(to:)` fallback (line 73) doesn't save it:
    Swift `EventDispatcher` properties aren't `@objc` selectors. So dispatchers declared on
    `FxNativeView` are invisible to `installEventDispatcher` on every concrete subclass
    instance. Fix: EventDispatcher stored properties live on each concrete view (FxHostedView,
    FxSurfaceView, FxGroupView each declare their own `onTransitionEnd`, `onLoad`, `onError`;
    later renamed to prefixed native names after the event-name collision review).
    The base holds none. Steps 1–5 rewritten. Added EventDispatcher.swift ref to authority links.
  - **Citation precision.** Authority links cited ModuleDefinition.swift:50-54 for view-name
    keying, but the actual `ModuleName_ViewName` format is on line 92. Split the ref to
    cite both lines separately.
  - **Init contract.** Added `required init(appContext: AppContext? = nil)` contract note
    to step 1 and the concrete-view shell steps (ExpoFabricView.swift:50).

- **Fourth audit (2026-06-07) — one doc-consistency finding, applied:**
  - **architecture.md §2 contradicted the EventDispatcher fix.** The third audit moved the
    shared dispatchers off the base in the spec, but `architecture.md` §2 still said the base
    "provides EventDispatcher" (line 98) and "all three share … EventDispatcher" (line 111) —
    so a reader of the doc (not the task file) would re-introduce the silent-wiring bug.
    Reworded §2 (lines 98, 111) so the base provides two-phase props, lifecycle, and the
    `AsyncFunction` surface, while each concrete view declares its own `EventDispatcher`
    properties; augmented the §2.3 mechanism finding with the `Mirror` superclass caveat
    (EventDispatcher.swift:67-79). Step 8 now records this reconciliation.

- **Implementation pass (2026-06-07) — headless-done:**
  - Added **packages/ios/FxNativeView.swift** as the shared Expo Modules base with two-phase
    prop-batch hook, snapshot stub, and lifecycle pause/resume hooks.
  - Reparented **packages/ios/FxSurfaceView.swift** to `FxNativeView`, kept the Metal shader
    path intact, and added concrete shared event dispatchers so Expo can wire events by
    reflecting the concrete type.
  - Added **packages/ios/FxHostedView.swift** and **packages/ios/FxGroupView.swift** as minimal
    registered shells with concrete `EventDispatcher` properties and TODO markers for future
    hosted/group renderers.
  - Registered `FxHostedView` first in **packages/ios/FxModule.swift** and
    **packages/android/src/main/java/expo/modules/reactnativefx/FxModule.kt**, then registered
    `FxSurfaceView` and `FxGroupView` as named views.
  - Added Android peer shells under
    **packages/android/src/main/java/expo/modules/reactnativefx/** so the boundary shape stays
    cross-platform; Android renderer/runtime behavior remains unverified headless.
  - Replaced **packages/src/runtime/FxEffectView.tsx** and its web stub with per-view bindings:
    `FxHostedView` uses `requireNativeView('ReactNativeFx')`, while `FxSurfaceView` and
    `FxGroupView` use named native views.
  - Reconciled stale implementation-doc names in **architecture.md** and **data-layer.md** so
    they point at `FxHostedView`, `FxSurfaceView`, and `FxGroupView` instead of the deleted
    `FxEffectView`.
  - Verified `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, and
    `bun run test` are green. The first `bun run test` hit sandboxed Watchman state; the
    approved rerun passed with no tests found.

- **Review feedback pass (2026-06-07) — lifecycle/doc cleanup:**
  - Reconciled **research/5-realization/structure.android.md** so Android detach/background
    pauses frame callbacks and does not clear backend resources on ordinary detach. Concrete
    renderer resources release only from the backend surface destruction or invalidation
    callback, with lazy re-create on the next attach/surface-available callback.
  - Aligned **packages/android/src/main/java/expo/modules/reactnativefx/FxNativeView.kt** with
    that mechanic by removing `tearDownPresentationResources()` from `onDetachedFromWindow()`.
  - Removed the unused iOS base teardown hook and `FxSurfaceView` override. `FxSurfaceView`
    still releases Metal resources directly in `deinit`.
  - Moved the `pipeline(for:)` Swift doc comment directly onto the declaration.
  - Re-verified `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
    and `bun run test`; all passed, with tests still reporting no tests found.

- **Critical iOS hook collision review (2026-06-07):**
  - Renamed the fx prop-batch hook from `viewDidUpdateProps()` to `applyResolvedConfig()` on
    iOS and Android. Expo already owns `ExpoFabricView.viewDidUpdateProps()` on iOS and uses
    it to dispatch `OnViewDidUpdateProps` closures, so the fx hook must not shadow that name.
  - Updated `FxModule` on both platforms so `OnViewDidUpdateProps` calls
    `view.applyResolvedConfig()`.
  - Renamed inert native shared events to `onFxTransitionEnd`, `onFxLoad`, and `onFxError`.
    This keeps the native direct-event surface away from React Native core event names while
    future JS wrappers can expose semantic public props.
  - Re-verified `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
    and `bun run test`; all passed, with tests still reporting no tests found.

- **Comments/style review pass (2026-06-07):**
  - Trimmed restatement docblocks from native shell initializers, empty base hooks, and inert
    shared event properties. Kept comments that explain prop batching, lifecycle ownership,
    event-name collision, and drawable-size handling.
  - Deleted no-op prop-batch overrides from iOS and Android hosted/group shells. `FxModule`
    still invokes the inherited base hook for those views.
  - Confirmed the `pipeline(for:)` doc comment is attached directly to the declaration.
  - Reconciled iOS/Android `intensity` validation so both clamp to `0...1`.
  - Left the inert `snapshot()` numeric return shape unchanged. The real snapshot contract
    needs widening when phase-bearing snapshots land.
  - Re-verified `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
    and `bun run test`; all passed, with tests still reporting no tests found.

## Next: Review U1-002, then run U1-003 device/SDK registration proof.
