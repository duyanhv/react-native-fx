# U5-001 — FxLayoutObserver: native post-layout frame reads

Type: `implement` · State: `merged` · Device: `yes` · Consumes: RT-013 · Closes: RT-013 (**closed 2026-06-11** — device-gated, resolved in `33` + the ledger post-ratification) · Blocked by: — (U4-001 merged)

## Start here

1. **This file** — the work order (spec'd by the planner, 2026-06-11).
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: FxLayoutObserver — "The Read". A passive native observer owned by FxSurfaceView
         that captures the post-layout frame (size, origin, travel, insets) on async
         events and serves it to the future FxAnimationDriver (U6) by synchronous native
         read. Nothing crosses to JS.
- Contract anchors:  research/4-runtime/33-shadow-nodes-and-layout.md (the layout
                     contract — the owning doc; its "when is the post-layout frame
                     available / how does fx read natively" research questions are what
                     this task answers in code), research/4-runtime/36-runtime-architecture.md
                     §The objects (the FxLayoutObserver row: reads layout NEVER writes;
                     long-lived, identity-stable, HybridObject-shaped regardless of
                     binding), blueprint.md Unit 5, architecture.md §6/§8
                     (owns post-layout reads · reads the Yoga/Fabric frame · passive,
                     read on demand by the driver · NOT bridged to JS),
                     decision-ledger.md RT-013.
- Decision:          settled — MIMIC Fabric's own layoutMetrics flow. Fabric resolves
                     Yoga layout BEFORE mounting (verified:
                     references/react-native/.../renderer/mounting/ShadowTree.cpp:417),
                     so the final frame is natively present at mount and on every layout
                     update. fx reads its OWN view's RN-assigned frame — never a child's
                     (the #27846 boundary: children are opaque; per-child measurement is
                     the SPINE-010 trigger, out of scope), never the shadow tree, never
                     via a JS onLayout round-trip.
- Reference (HOW):   references/expo/packages/expo-modules-core — where an
                     ExpoFabricView (iOS) / ExpoView (Android) receives its RN-assigned
                     frame natively (the iOS updateLayoutMetrics/layoutSubviews path;
                     the Android onLayout path). DIFF the actual template code per
                     agents/references-preflight.md discipline — name the exact callback
                     and coordinate space you adopt, with file:line, in the structure
                     pin. REJECT anything that polls or round-trips JS.
- Guides:            Code Style + Code Comments (the code); Testing (headless); Device
                     Verification (the proof scenario); Contributing (merge bar).
- Rules gate:        #9 (READS layout, never writes — no requestLayout/setNeedsLayout
                     storms, no frame writes back into RN-tracked views), #1 (reads are
                     event-driven — mount + layout-change; NEVER per-frame polling, no
                     JS in any loop), #7 (Expo Modules only — no shadow-tree C++/JSI
                     access), #3 (expo-view substrate; RT-013's lean — strictly
                     expo-view, New Architecture only, SDK 56 floor — gets recorded as
                     the stance, device-confirmed later).
- Scope boundaries:  do NOT build — animation (U6), the presence FSM (U7), any public
                     prop/event/JS API (the observer is internal; architecture.md says
                     bridged-to-JS: No), per-child measurement, anything touching flow
                     layout. Do NOT modify the U4 child-routing or the U4-003 Metal
                     paths beyond attaching the observer.
- Internal surface:  what U6 will read (name methods per the Code Style Guide — these
                     name the DATA, not the API): the current frame (size + origin in
                     the parent's space), the origin in window coordinates (edge/travel
                     resolution needs it), the travel distance to a named edge (the
                     measured token `41` {measure:'edge'} consumes), and safe-area
                     insets if natively cheap at read time. Synchronous native getters,
                     read-on-demand; the captured frame refreshes on layout-change
                     events. Lifecycle: created with FxSurfaceView, torn down with it
                     (`31` — no leaks, no observation after detach).
- Device-verify:     (human gate — write the scenario to evidence/, agent-device runs
                     it) prove on BOTH platforms: (1) the frame is correct natively at
                     mount; (2) it refreshes on a real layout change (rotation or a
                     flex-driven resize) via the event path — show the event fired, not
                     a poll; (3) zero JS round-trip (log-instrumented per the
                     established NSLog / Log.i pattern, reverted after); (4) the
                     observer writes nothing — child layout is byte-identical with and
                     without it attached. Record RT-013's two halves: strictly-expo-view
                     reachability and the New-Arch-only stance.
- Closure:           RT-013 is a device-pending ledger row — per the ledger's own rule
                     it closes ONLY on the device check. Record the closure plan in
                     notes.md; flip the row ONLY after the maintainer ticks
                     device-verified (the U3-003/FX-003 precedent).
- Done when:         FxLayoutObserver.swift + FxLayoutObserver.kt exist, owned by
                     FxSurfaceView, capturing mount + layout-change frames natively and
                     exposing the synchronous read surface above;
                     structure.{ios,android}.md pin the per-platform read point (the
                     exact callback, the coordinate space, the window-coordinate
                     conversion) BEFORE the code is written; headless gates + example
                     xcodebuild + compileDebugKotlin green (pod install first — new
                     Swift file); the device scenario written to evidence/.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-11)
- [x] rules-gated (2026-06-11 — #9 reads only, KVO/listener, no layout writes; #1 event-driven captures, no polling/JS; #7 pure Swift/Kotlin — the C++-typed `updateLayoutMetrics` override explicitly rejected; #3 expo-view only; no public JS surface)
- [x] implemented (`ios/FxLayoutObserver.swift` + `android/.../FxLayoutObserver.kt`, owned by `FxSurfaceView`; structure pins written first)
- [x] commented (iceberg — why bounds-KVO not layoutSubviews, why the listener not onLayout, why window reads are live)
- [x] headless-done (2026-06-11 — tsc/build/lint/swift:lint/test green; `pod install` + example xcodebuild BUILD SUCCEEDED; `gradlew :app:assembleDebug` BUILD SUCCESSFUL; no TS file changes — the observer has no JS tier; device scenario written to `evidence/device.md`)
- [x] device-verified (maintainer-ratified 2026-06-11 on the 5/5 PASS run, iOS + Android — `evidence/device.md` §Results; RT-013 two halves recorded)
- [x] reviewed (2026-06-11, approved — `../../reviews/U5-001.md`; gates re-run post-revert, evidence verified against the tree)
- [x] docs-closed (2026-06-11 — `33` research question struck + the two §Open questions bullets resolved (strictly `expo-view`; New Arch only) + the falsification test's layout half marked device-proven; ledger RT-013 flipped to resolved citing `33` and the evidence)
- [x] merged (maintainer, 2026-06-11, on integration/0.1.x) (human gate)

## Proof

- **headless:** from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test`; `git diff --check`. Native: `pod install` (new
  Swift file) then example `xcodebuild` (Debug, iphonesimulator) BUILD SUCCEEDED;
  `gradlew :app:assembleDebug` BUILD SUCCESSFUL. The observer itself has no JS tier —
  if no TS file changes, say so rather than inventing one.
- **device:** the scenario above, written to `evidence/device.md` for the maintainer's
  agent-device run.
