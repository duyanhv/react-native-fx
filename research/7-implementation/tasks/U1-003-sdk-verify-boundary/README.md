# U1-003 · SDK-verify Expo boundary behaviors

Unit 1 · type: `device-verify` · state: `blocked` · device: yes
Consumes: RT-010, RT-011 · Closes: SURF-010, RT-010, RT-011, RT-004 · Blocked by: U1-002, U1-004

> **This task does not build new capabilities.** All four claims verify that the Expo Modules
> SDK (56) behaves as documented. The agent writes the device scenarios; the human runs them
> on device and closes the ledger rows.

Four provisional values from the reconciliation queue (decision-ledger.md §Reconciliation) are
materialized in `data-layer.md` §5.1 / `architecture.md` §2 but not yet device-proven. This
task proves them on SDK 56 and closes the corresponding ledger rows. No renderers, no content
motion, no new native feature — pure boundary-behavior verification.

## Start here (cold-start)

A fresh session: read in order, then construct.

1. **This file** — the work order + device scenarios.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking, § Task types (`device-verify`).
3. **Per-gate guides** (binding — read the one for the gate you are on):
   - `scenario-written` → `guides/Device Verification Guide.md`
   - `device-verified` → _human gate — no agent guide_
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - (`implemented` / `commented` → N/A this task)
4. **Contract + Reference** — below.

## Authority links

```
Subtask: SDK-verify Expo boundary behaviors (blueprint Unit 1, device-verify gate)
- Contract anchors:  51 (Record coercion open question, line 85; registration ergonomics
                     line 84), 31 (GPU-loop lifecycle), 53 (SDK floor / recycle),
                     data-layer.md §5.1 (SURF-010 — previousProps value-equality).
- Decision:          device-verify all four Provisional values. No new code — observe the
                     pinned SDK (56) behavior.
- Reference (HOW):   architecture.md §2.1 (previousProps mechanism, lines 166-188);
                     architecture.md §2.2 (multi-view registration, lines 191-206);
                     data-layer.md §5.1 (memoization guidance provisional, lines 633-679);
                     51 (open questions lines 84-86);
                     references/expo/.../ExpoFabricView.swift:167 (shouldBeRecycled = false).
- Guides:            Device Verification Guide (device gate); Code Style Guide / Code Comments
                     Guide N/A (no new code); Writing Style Guide (doc-cleanup).
- Rules gate:        #7 (Expo Modules + Fabric only — this verifies the boundary, does
                     not breach it).
- Device-verify:     yes — four scenarios, all on SDK 56. Agent writes scenarios; human
                     executes on device.
- Done when:         all four scenarios executed on device with observed results; each
                     ledger row closed in its source doc; SURF-010 guidance ratified.
```

## Lifecycle

For a `device-verify` task, the lifecycle gates differ (subtask-protocol §Task types):

- [x] spec'd
- [x] rules-gated
- [x] scenario-written (device scenario defined for each claim)
- [ ] device-verified (human gate — all four scenarios observed on device)
- [ ] docs-closed (propagate results to source docs; close ledger rows)
- [ ] reviewed
- [ ] merged

## Proof

- **headless:** N/A — all four claims require runtime/device observation. No logic/FSM surface to unit-test.
- **device:** four scenarios described below; the agent handoff lives in
  `tasks/U1-003-sdk-verify-boundary/evidence/headless.md`. Human observations
  go in `tasks/U1-003-sdk-verify-boundary/evidence/device.md`, with screenshots
  or logs beside it.
- **docs:**
  - SURF-010 → `data-layer.md` §5.1 (ratify or rework memoization guidance); `decision-ledger.md` SURF-010 (close).
  - RT-010 → `51` (decisions #5 — close the open question); `decision-ledger.md` RT-010 (close) and clear the stale reconciliation note that still describes `architecture.md` as a single-routing-orchestrator doc.
  - RT-011 → `51` (open questions — close); `decision-ledger.md` RT-011 (close).
  - RT-004 → `31`/`53` (confirm SDK behavior); `decision-ledger.md` RT-004 (close).

## Work

### Device scenarios (agent writes, human executes)

---

### Scenario 1 · RT-010 — multi-view registration resolves correctly

U1-002 registered three native views under one module (`FxHostedView` as the default,
`FxSurfaceView` and `FxGroupView` as named). Expo keys the default under the bare module
name and named views under `ModuleName_ViewName`. This scenario proves the keying works
at runtime on SDK 56.

**Prerequisite:** A runnable SDK 56 app with `react-native-fx` autolinked. The app may
be bare or managed CNG; this scenario only proves native-view registration. The `example/`
app suffices once U1-004 supplies a runnable app.

**Steps:**
1. In `example/App.tsx`, import the internal runtime bindings directly for this
   device-verification session:
   ```tsx
   import type { ComponentType } from 'react';
   import { FxGroupView } from '../packages/src/runtime/FxGroupView';
   import { FxHostedView } from '../packages/src/runtime/FxHostedView';
   import {
     FxSurfaceView,
     type NativeFxSurfaceProps,
   } from '../packages/src/runtime/FxSurfaceView';
   ```
2. Mount `<FxHostedView style={{ width: 100, height: 100 }} />`.
3. Mount `<FxSurfaceView shader="fractal-clouds" style={{ width: 200, height: 200 }} />`.
4. Mount `<FxGroupView style={{ width: 50, height: 50 }} />`.
5. Run the same screen on iOS and Android.
6. Fast refresh the app. All three views remount without "Tried to register two views
   with the same name" errors.

**Expected:**
- No crash on mount on iOS or Android — all three native views resolve.
- `FxHostedView` renders its empty shell (blank native host view — no SwiftUI/Compose host yet).
- `FxSurfaceView` mounts without error (Metal rendering on iOS is a bonus, not
  RT-010's close condition — pixel rendering is REAL-002 / U3-005).
- `FxGroupView` renders its empty shell.
- Fast refresh works without duplicate-registration errors on iOS and Android.

**RT-010 close claim:** the three registered views resolve at runtime without crashing
on both platforms.
Metal pixel rendering is a separate concern.

**Failure modes:**
- "Tried to register two views with the same name" on fast refresh — implies
  `requireCachedNativeComponent` cache key is wrong.
- Metro cannot resolve `../packages/src/runtime/...` — the example's monorepo resolver
  or watch-folder setup is wrong, not the native registration keying.
- Blank square with no Metal rendering — implies `FxShaders.bundle` not found;
  `loadShaderLibrary` failed (REAL-002 issue).
- "Couldn't find the property for event 'onFxTransitionEnd'" in log — implies
  EventDispatcher declared on a base class (Mirror bug).

**Proves:** Registration ergonomics confirmed on SDK 56. RT-010 closes.

---

### Scenario 2 · RT-011 — `@Field` Record coercion fills absent fields

The data-layer memoization guidance (§5.1) is conditional on `@Field` defaults filling
omitted fields. If absent fields aren't default-filled, `previousProps` value-equality
may report a change when the effective data hasn't changed — the inline-builder-without-
memo pattern breaks. This scenario proves `@Field` behaves as documented.

**Prerequisite:** Minimal test `Record` types and a prop registered on `FxSurfaceView`
on both platforms:

```swift
// iOS: add to FxSurfaceView.swift for this test (remove after verification):
struct BoundaryTestRecord: Record {
  @Field var valueA: Int = 42
  @Field var valueB: String = "default"
}
```

```swift
// iOS: add in FxModule.swift FxSurfaceView View block:
Prop("_testRecord") { (view: FxSurfaceView, record: BoundaryTestRecord) in
  view.setBoundaryTestRecord(record)
}
```

```kotlin
// Android: add to FxSurfaceView.kt for this test (remove after verification):
class BoundaryTestRecord : Record {
  @Field
  var valueA: Int = 42

  @Field
  var valueB: String = "default"
}
```

```kotlin
// Android: add in FxModule.kt FxSurfaceView View block:
Prop("_testRecord") { view: FxSurfaceView, record: BoundaryTestRecord ->
  view.setBoundaryTestRecord(record)
}
```

In the debug screen, temporarily widen the internal surface binding for the private
test prop:

```tsx
type BoundaryTestRecordProps = {
  _testRecord?: { valueA?: number; valueB?: string };
};

const DebugFxSurfaceView = FxSurfaceView as ComponentType<
  NativeFxSurfaceProps & BoundaryTestRecordProps
>;
```

**Steps:**
1. Run the scenario on iOS.
2. Send `{ _testRecord: { valueA: 99 } }` from JS (omit `valueB`).
3. Pause at the prop breakpoint or inspect the debug log. `record.valueB` should be
   `"default"`.
4. Send `{ _testRecord: { valueA: 99, valueB: "custom" } }` from JS.
5. Inspect `record.valueB` — should be `"custom"`.
6. Repeat steps 2-5 on Android.

**Expected:**
- Absent fields are filled with their `@Field` default values.
- Explicit fields override the defaults.
- iOS and Android behave the same on the pinned SDK.

**Failure mode:**
- Absent field stays `nil`/`0` instead of the `@Field` default — `Record` coercion is
  partial on SDK 56, and `data-layer.md` §5.1 guidance must recommend `useMemo`.
- SURF-010 flips to `rework`.
- Only one platform fills defaults — the boundary contract becomes platform-specific,
  and the source docs must record the divergence before closure.

**Proves:** Record coercion fills absent fields as documented. RT-011 closes.

---

### Scenario 3 · RT-004 — view recycling is disabled (no reset hook needed)

Expo's `ExpoFabricView.shouldBeRecycled()` returns `false` on SDK 56, meaning Expo views
are never recycled. fx inherits this — no per-view reset hook is needed.

**Prerequisite:** Same example app as Scenario 1.

**Steps:**
1. Add debug logs in `FxSurfaceView` construction, prop application, and deinit/detach:
   native object identity, React tag if visible, shader, intensity, and interaction mode.
   On iOS, use LLDB or `ObjectIdentifier(self)`. On Android, use
   `System.identityHashCode(this)`.
2. Mount multiple `FxSurfaceView` rows in a `FlatList`, each with a distinct shader and
   intensity.
3. Scroll far enough that rows leave the mounted window, then scroll back.
4. Toggle a conditional mount/unmount via React state.
5. Repeat on iOS and Android.

**Expected:**
- A native view instance is not rebound to a different React row/tag with stale shader,
  intensity, or interaction mode.
- Unmount/remount either keeps the same logical row stable while mounted or creates a
  fresh native view. It does not reuse an old instance with stale per-bind state.
- A `prepareToRecycleView` override is unnecessary — fx views are never recycled.

**Failure mode:**
- A native object identity appears under a different row/tag with prior shader config.
- A recycling-related crash occurs in Fabric's `RecyclingUIManager` when the fx module
  is loaded.

**Proves:** `shouldBeRecycled() = false` is sufficient. RT-004 closes.

---

### Scenario 4 · SURF-010 — `previousProps` value-equality skips unchanged props

The data-layer §5.1 guidance claims that inline builder literals (`fx.effect.mesh({...})`)
work without manual `useMemo` because native `previousProps` compares values (not JS
object references). This scenario proves that claim.

**Prerequisite:** Add observation hooks in `FxSurfaceView` on both platforms (debug-only,
remove after test). Reuse the `_testRecord` prop from Scenario 2:

**Risk note:** this is the highest-risk verification in U1-003. The expected result may
fail if Expo compares nested `Record` props by reference or by partially coerced values.
That is a valid outcome: keep SURF-010 open, rewrite the memoization guidance, and record
the result as `rework` instead of treating the run as a failed test setup.

```swift
// iOS: add temporaries in FxSurfaceView.swift:
private var setShaderCallCount = 0
private var setIntensityCallCount = 0
private var setBoundaryTestRecordCallCount = 0
private var applyConfigCallCount = 0
```

In `setShader()`: increment `setShaderCallCount`.
In `setIntensity()`: increment `setIntensityCallCount`.
In `setBoundaryTestRecord()`: increment `setBoundaryTestRecordCallCount` and store
or print the record.
In `applyResolvedConfig()`: increment `applyConfigCallCount`.

```kotlin
// Android: add equivalent counters in FxSurfaceView.kt:
private var setShaderCallCount = 0
private var setIntensityCallCount = 0
private var setBoundaryTestRecordCallCount = 0
private var applyConfigCallCount = 0
```

**Steps:**
1. Mount `<FxSurfaceView shader="fractal-clouds" intensity={0.8} />`.
2. Note baseline `setShaderCallCount` (= 1, initial prop).
3. Trigger a React re-render that does NOT change the props (for example, press a
   button that increments unrelated state).
4. After re-render, `setShaderCallCount` should still be 1 — the setter was skipped
   because the value didn't change.
5. Re-render with `intensity={0.9}` (changed prop).
6. `setShaderCallCount` still 1 (unchanged); `setIntensityCallCount` = 1 (changed).
7. Re-render with `intensity={0.9}` again (same value).
8. `setIntensityCallCount` still 1 — skipped.
9. Mount `<DebugFxSurfaceView _testRecord={{ valueA: 99 }} />`.
10. Re-render with a fresh JS object carrying the same effective value:
    `_testRecord={{ valueA: 99 }}`.
11. `setBoundaryTestRecordCallCount` should remain 1. The setter was skipped for a
    new JS object whose native record value is equal to the previous native record.
12. Re-render with `_testRecord={{ valueA: 99, valueB: "custom" }}`.
13. `setBoundaryTestRecordCallCount` should become 2.
14. Repeat on iOS and Android.

**Expected:**
- Prop setter fires only when the prop value changed from the previous render.
- `previousProps` compares primitive props and nested `Record` props by value, not JS
  object reference.
- `applyResolvedConfig()` only has changed pending values to apply. If it fires after an
  unchanged render, the resolved native work is a cheap no-op.

**Failure modes:**
- Setter fires on every render for identical values — `previousProps` uses reference
  comparison (===) instead of value comparison.
- Primitive props skip but `_testRecord` does not — SURF-010 remains open because the
  ledger requires nested records/value objects.
- `data-layer.md` §5.1 guidance must be rewritten to require `useMemo` for nested
  object props like EffectStack. SURF-010 flips to `rework`.

**Proves:** `previousProps` value-equality works. SURF-010 closes; the memoization
guidance in `data-layer.md` §5.1 is ratified.

---

### Cleanup

After all four scenarios are confirmed, remove the test instrumentation:

- Remove `BoundaryTestRecord`, `setBoundaryTestRecord`, `_testRecord`, debug logs, and
  call-count temporaries from the iOS and Android native files.
- Confirm the package builds cleanly after cleanup (`bunx tsc --noEmit`, `bun run build`,
  `bun run swift:lint`, and the native app build used for device verification).

## Scope guard

- No new code beyond minimal temporary test instrumentation (`Record` types, a private
  prop, logs, and counters). All verification is observation of existing SDK behavior.
- Does NOT build renderers, content motion, or any new native capability.
- Does NOT modify the public API exported from `index.ts`.
- The test instrumentation is temporary — removed after verification per the cleanup
  step above.

## Done when

- All four scenarios executed on device with observed results documented in
  `tasks/U1-003-sdk-verify-boundary/evidence/`.
- SURF-010 ratified in `data-layer.md` §5.1 (or flagged for rework if props leak).
- RT-010, RT-011, RT-004 closed in `decision-ledger.md`, including the stale RT-010
  reconciliation note that still says `architecture.md` needs the single-orchestrator rework.
- `51` open questions cleared (registration ergonomics + Record coercion).
- Test instrumentation removed.
- `progress.md` closes column corrected to `RT-004` (not `RT-005`).
