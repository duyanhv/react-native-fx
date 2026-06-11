# U7-001 — presence handshake preflight (design disposition, not closure)

A spec-time `references-preflight` (per `agents/references-preflight.md`) on the `FxPresence`
JS-mount-retention handshake — the `35` lifecycle FSM and the `54` coordinator contract — run
before U7-001 builds it. This is the pre-flight rule #7 was written to be stress-tested by:
the proven prior art (Reanimated exiting animations) rides a C++ commit hook fx forbids.

Status: **preflight done (2026-06-11); U7-001 remains `todo` (blocked by U6-001).** The five
`35` React-semantics rows are resolved to implementation rules and fed back into `35`/`54`;
ledger `SPINE-009` annotated. Device proof stays with U7-002 / U9-002.

## The verdict question

Does JS-mount-retention presence — keep the exiting child mounted in a JS ref, play the exit
natively, release on `onTransitionEnd` — survive contact with how the references actually ship
exit animations, **without** Reanimated's `MountingOverrideDelegate` / commit-hook mechanism
(rule #7)? `sound / needs-correction / invalid`.

Accepted constraint, not a finding: the `42` scope ceiling (whole-subtree teardown — navigator
pop, a parent conditional above the coordinator, list-cell eviction — kills the exit) is the
documented boundary of the JS-held model (DOC-018), and this pre-flight does not re-litigate it.

## Verdict

**SOUND.** The core mechanic is validated by all three deep references; no forbidden mechanism
is needed. JS mount retention is not an emulation of the commit hook — it is Fabric's own
semantics: the differ emits `Remove`/`Delete` only when a child leaves the rendered output, so
a retained child produces **no mutation at all** (zero-cost, no interception). The commit hook
exists to serve the one case fx's model excludes by design: animating exits *inferred from
removal* with no wrapper above the view. Deltas (fed into `35`/`54`, not architecture changes):

1. **The five React-semantics rows resolve to rules** (below) — each either falls out of the
   `visible`-only trigger structurally, or gets one explicit guard.
2. **Stranded-exit guard (new invariant, `35`)** — completion events deliver **only while the
   native view is mounted** (Expo's dispatcher drops events for a dead view silently); if the
   native view detaches while the JS FSM is `exiting` and JS did not release, JS releases the
   child immediately and expects no event.
3. **Snapshot semantics (new rule, `35`; stated in the `54` contract)** — the retained child is
   the element tree captured when `visible` flipped false; later re-renders do not propagate
   into the exiting child.

## The mechanic under test (the frame)

`FxPresence` — a JS-held stateful coordinator over `FxSurfaceView` (`expo-view` substrate).
On `visible:false`: JS keeps the child mounted (a ref across the render), native
`FxPresenceCoordinator` plays the interruptible exit envelope, emits one `onTransitionEnd`,
JS releases the child to unmount. Two coupled FSMs (native `absent · entering · present ·
exiting`; JS `rendered · released`); interrupt-as-retarget; stable child key. Hard constraints:
rule #1 (the envelope runs native; JS sees semantic events only), rule #7 (Expo Modules +
Fabric only — no commit hook, no JSI, no worklets, no synchronous read), rule #9 (React owns
the tree; fx defers unmount, never seizes it).

## Per-reference findings

Paths are relative to each reference clone.

### `references/reanimated` — the hook is the mechanism, and it exists for the no-wrapper case

- **The commit-hook path, end to end.** `LayoutAnimationsProxy_Legacy` implements
  `MountingOverrideDelegate` (`Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.h:198-203`);
  `pullTransaction` intercepts the full mutation list
  (`LayoutAnimationsProxy_Legacy.cpp:23-63`), `handleRemovals` suppresses `Remove`/`Delete`
  for animating views (`:234-265`), `endLayoutAnimation` marks the node `DEAD` on the JS
  completion callback (`:95-130`), and `endAnimationsRecursively` re-emits the suppressed
  mutations in the *next* transaction (`:426-445`). Lifecycle states
  `WAITING · ANIMATING · DEAD · MOVED · DELETED` (`LayoutAnimationsProxy_Legacy.h:27-34`) —
  the native-side model `35` already adopts (the FSM), minus the mutation surgery.
- **No JS mount-retention path ships on native.** `LayoutAnimationConfig` is a skip-flag
  context, not retention (`src/component/LayoutAnimationConfig.tsx`). But the **web** target —
  where no commit hook exists — retains the removed element as a `dummyClone` in the DOM
  *after* React unmounts it (`src/layoutReanimation/web/componentUtils.ts:413-476`).
  Where the hook is unavailable, even Reanimated's answer is retention; fx's *pre-unmount*
  variant is the cleaner half of that trade (React always knows the true tree).
- **`skipExiting` is the cost of inferring exits from `Remove` mutations.** The library
  cannot tell a virtualization recycle from a logical removal — the comment says so
  outright (`src/component/LayoutAnimationConfig.tsx:33-38`: the wrapper "doesn't know if
  it is going to be unmounted"), so `Animated.FlatList` blanket-wraps cells in
  `skipEntering skipExiting` (`src/component/FlatList.tsx:148-157`) and
  `shouldAnimateExitingForTag_` gates the hook per tag
  (`LayoutAnimationsManager.cpp:44-52`, checked at `LayoutAnimationsProxy_Legacy.cpp:486`).
- **Re-render mid-flight retargets, never restarts.** An `Update` for an animating tag with
  no layout change folds into the running animation via `updateOngoingAnimationTarget`
  (`LayoutAnimationsProxy_Legacy.cpp:332-359`, `:753-757` — rewrite `finalView`, keep flying).
- **Reparenting and ancestor teardown need dedicated machinery.** `MOVED` state + new-parent
  tracking (`:199-210`, `:295-312`) and `maybeDropAncestors` cascade cleanup (`:447-469`) —
  all consequences of holding views the owner already removed.
- **The edge cases.** StrictMode: explicitly tested, no special guard — resilience comes from
  cancellation + re-registration (`__tests__/LayoutAnimations.web.test.tsx:47-143`).
  Fast Refresh: no handling found; the in-flight animation is cancelled — an accepted dev-only
  limitation. Suspense/offscreen: no handling — a hide produces no `Remove`, so the trigger
  never fires (the only `activityState` reference is RNS screens,
  `SharedTransitions.cpp`).

### `references/react-native` — retention is normal rendering; the hook is the only alternative

- **`Remove` detaches, `Delete` destroys/recycles**, in that order per transaction
  (iOS `RCTMountingManager.mm:94-100`; Android `FabricMountingManager.cpp:636-651`); mutation
  ordering is Update → Remove (reversed) → Delete → Create → Insert
  (`react/renderer/mounting/Differentiator.cpp:1355-1383`) — so the exiting-target prop update
  always lands before any same-commit structural change.
- **The load-bearing finding: the differ emits `Remove` only when the child leaves the
  rendered output** (`Differentiator.cpp:330-384` — mutations are generated from the
  old-vs-new pair walk; a child present in both produces nothing). A JS component that keeps
  rendering the child via a ref **never generates the mutation**. Mount retention is the
  platform's own semantics, not a workaround — zero overhead, no native cooperation needed.
- **`MountingOverrideDelegate` is the only post-commit interception seam**
  (`react/renderer/mounting/MountingOverrideDelegate.h:16-44`, called from
  `MountingCoordinator.cpp:100-130`), it is C++-registered inside Fabric, and **it is not
  reachable from Expo Modules**. Paper's `LayoutAnimation` is not a Fabric path. There is no
  third mechanism.
- **A hide is never a removal.** `display: none` lowers to an `Update` mutation that sets
  `view.hidden` (`UIView+ComponentViewProtocol.mm:117-119`); the view stays in the tree. So
  suspension/offscreen can never masquerade as an unmount at the native layer.
- **No recycle risk while retained.** Recycling happens on `Delete` only, pooled by
  `componentHandle` (`RCTComponentViewRegistry.mm:90-120`); a retained child's tag stays in
  the live registry. `unmountChildComponentView` is notification-only
  (`RCTComponentViewProtocol.h:53-65`) — a parent view is told, never asked.

### `references/expo` — the boundary carries the handshake while mounted; events die silently after

- **Coordinator identity holds** — `shouldBeRecycled() = false`
  (`expo-modules-core/ios/Fabric/ExpoFabricView.swift:166-171`), reconfirming the `35`
  source-audit PASS.
- **Event delivery is mounted-only, and failure is silent.** `dispatchEvent` no-ops when
  `_eventEmitter` is gone (`ios/Fabric/ExpoFabricViewObjC.mm:142-152`); the Swift dispatcher
  holds the view `[weak self]` and logs-and-drops when it is deallocated
  (`ios/Fabric/ExpoFabricView.swift:151-157`); Android emission fails silently on a dead
  context (`android/.../views/ViewEvent.kt:24-62`). There is **no deferred event queue and no
  will-unmount lifecycle hook** (`ios/Core/Views/ViewLifecycleMethod.swift:6-8` —
  `didUpdateProps` only). This is the shape `35`'s teardown-during-exit invariant already
  assumes (receiver gone → emit nothing) — but it also means a lost completion event would
  *strand* a retained child if the native view ever died while JS still waited. Hence the
  stranded-exit guard (deltas, above). The alternative corrections the gap might suggest — a
  synchronous "exit done?" read, or a blocking pre-unmount phase — are exactly what rules
  #1/#7 forbid; the JS-side guard is the fx-legal answer.
- **A shipped deferred-teardown precedent exists, on Android, children-only.**
  `ExpoComposeView` keeps transitioning children's compose scope alive across
  `startViewTransition`/`endViewTransition` (RNS screen pop, expo/expo#45914;
  `android/src/compose/expo/modules/kotlin/views/ExpoComposeView.kt:224-250`). Precedent that
  deferred child teardown is a shipped Expo pattern — not fx's mechanism, since JS retention
  means fx's exiting child is never removed mid-exit at all.
- **Prop updates precede structural changes** within a Fabric transaction
  (`ios/Fabric/ExpoFabricViewObjC.mm:118-138` + the Differentiator ordering above) — the
  `exiting` target reaches the coordinator before any same-commit unmount could.

### `references/gesture-handler` — dropped (no precedent, proven)

Teardown is eager and synchronous: `componentWillUnmount` drops the handler immediately
(`src/handlers/createHandler.tsx:197`), `NodeManager.dropGestureHandler` destroys and deletes
in place (`src/web/tools/NodeManager.ts:52-61`); no wrapper defers child unmounting anywhere.
Dropped per the protocol — three deep diffs beat four thin ones.

## Synthesis

- **Convergence.** All references agree on the dichotomy: after React commits a removal, the
  *only* way to defer it natively is the C++ commit hook (closed by rule #7); *before* React
  commits, retention is just rendering — the differ produces no mutation for a retained child.
  There is no third path, and fx needs none.
- **Divergence = deliberate fx constraint, not bug.** Reanimated infers exits from `Remove`
  mutations so any annotated view can animate out with no wrapper — and that single choice
  breeds the machinery: the hook itself, `skipExiting` (recycle vs removal is
  indistinguishable), `MOVED`/reparenting transfer, ancestor cascades. fx infers exits from
  one `visible` prop on a coordinator that stays mounted — every piece of that machinery maps
  to a case fx's model makes *structurally impossible*, not silently unhandled. The trade is
  the `42` scope ceiling, already accepted (DOC-018).
- **Rule-#7 filter.** The proven hook pattern is forbidden; the fx-legal analogue (JS mount
  retention) is validated as platform semantics rather than emulation — Reanimated's own web
  target uses retention where the hook does not exist. The flip trigger is unchanged and
  untouched by this pre-flight: per-child control (`SPINE-010`, `0-spine/05`).

## The five React-semantics rows — resolved rules

Each row from `35` §React-semantics edge cases, answered with the rule the FSM adopts.

| case | rule fx adopts | grounding |
|---|---|---|
| **StrictMode** | No guard needed: the FSM is **prop-driven** — `visible` and the native FSM live outside the double-invoked effects, and StrictMode's double effect invocation does not remount host views. JS effects must stay idempotent (subscribe/unsubscribe only); they never imperatively trigger enter/exit. | Reanimated ships no StrictMode guard either — only cancellation resilience (`LayoutAnimations.web.test.tsx:47-143`) |
| **Fast Refresh** | **Remount-as-release (the stranded-exit guard):** if the native view detaches (host ref → null) while the JS FSM is `exiting` and JS did not release, release the retained child immediately; no envelope, no event expected. Dev-only path; production never reaches it while the `54` stay-mounted contract holds. | Reanimated cancels and accepts the dev limitation (no handling found); the guard is needed because Expo events die silently with the view (`ExpoFabricView.swift:151-157`) |
| **Suspense / offscreen** | **A hide is a hold.** Presence keys exclusively off `visible`; native never infers exit from a child detach or hidden state. An offscreen hide is an `Update` (`view.hidden`), never a `Remove` — no FSM edge exists for it, structurally. | `UIView+ComponentViewProtocol.mm:117-119`; Reanimated likewise never fires (no `Remove`) |
| **Re-render mid-exit** | **Snapshot semantics + latched config.** The retained child is the element tree captured when `visible` flipped false — later re-renders do not propagate into it. Envelope config (`preset`/`motion`/`transition`) latches at phase start; a change mid-flight applies from the next phase, never restarts the current one. `visible` retargets remain the only mid-flight FSM edges. | Reanimated's analogue merges the new target into the running animation, never restarts (`LayoutAnimationsProxy_Legacy.cpp:753-757`) |
| **List eviction** | **Structurally immune.** Eviction is whole-subtree teardown — the `42` ceiling: cancel, release, emit nothing. fx needs no `skipExiting` because it never infers exit from removal; an evicted row's `visible` never flipped, so no phantom exit can fire. | Reanimated must blanket-opt-out because it cannot distinguish recycle from removal (`LayoutAnimationConfig.tsx:33-38`, `FlatList.tsx:148-157`) |

## Feed-back ledger

- [x] `35` — edge-case rows resolved to the rules above; stranded-exit guard + snapshot
  semantics added to the FSM invariants; source-audit strengthened (the differ finding,
  mounted-only event delivery); answered research/open questions annotated.
- [x] `54` — snapshot semantics stated in the lifecycle contract (rule owned by `35`).
- [x] `structure.{ios,android}.md` — **no edit, deliberately**: the handshake is
  boundary-level and lives in `35` (both docs already cite it); no per-platform mechanic
  changed.
- [x] `decision-ledger.md` — `SPINE-009` annotated (source audit reinforced; still
  device-pending). `SPINE-010` untouched — the flip trigger is unchanged.
- [x] `progress.md` — U7-001 row annotated (preflight done, verdict in one clause).
- [ ] Carry the five rules into the U7-001 task spec when the task unblocks (U6-001).
- [ ] Device rows: U7-002 (preset catalog + the five rows on device), U9-002 (`SPINE-009`
  identity proof).

## References consulted

- `references/reanimated` — `LayoutAnimationsProxy_Legacy.{h,cpp}`,
  `LayoutAnimationsManager.{h,cpp}`, `ReanimatedModuleProxy.cpp`,
  `src/component/LayoutAnimationConfig.tsx`, `src/component/FlatList.tsx`,
  `src/layoutReanimation/animationsManager.ts`, `web/componentUtils.ts`,
  `__tests__/LayoutAnimations.web.test.tsx`.
- `references/react-native` — `Differentiator.cpp`, `MountingOverrideDelegate.h`,
  `MountingCoordinator.cpp`, `RCTMountingManager.mm`, `RCTComponentViewRegistry.mm`,
  `UIView+ComponentViewProtocol.mm`, `RCTComponentViewProtocol.h`,
  `FabricMountingManager.cpp`.
- `references/expo` — `ExpoFabricView.swift`, `ExpoFabricViewObjC.mm`,
  `ViewLifecycleMethod.swift`, `ExpoViewEventEmitter.cpp`, `ViewEvent.kt`,
  `ExpoComposeView.kt`.
- `references/gesture-handler` — `createHandler.tsx`, `NodeManager.ts` (dropped after the
  absence was proven).
