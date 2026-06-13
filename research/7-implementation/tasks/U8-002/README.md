# U8-002 — the RNGH coexistence matrix + cancel path

Type: `device-verify` · State: `todo` (spec'd) · Device: `yes` · Consumes: — · Closes: RT-001 · Blocked by: U8-001 (merged 2026-06-13)

## Why this task exists

U8-001 shipped the cooperative press recognizer (`FxPressHandler.{swift,kt}`), the SDF
hit-test, and the four `onShader*` events behind `interactionMode`. Its device gate ran
exactly **one** coexistence row — a plain native `ScrollView` yield — and deferred the rest
here. RT-001's whole claim is the category differentiator: *"coexistence with RNGH is free
because the surface is a plain native view."* That claim is unproven until the full matrix
runs on hardware against the real RN gesture ecosystem — RNGH, `@gorhom/bottom-sheet`, and a
pager — not just a built-in `ScrollView`.

This is a **device-verify** task, but it carries a real headless prerequisite: the example
app ships **none** of the gesture libraries the matrix needs. The agent builds the
coexistence **harness** (example-only JS — the recognizer already ships) to `headless-done`,
writes the device runbook, and hands the matrix to the maintainer. No `packages/` native
changes: if a row surfaces a *recognizer* defect, that is a U8-001-style rework — flag it,
do not silently patch it here.

## Authority links

```
Subtask: the RNGH coexistence matrix + cancel-path device validation (blueprint Unit 8).
- Contract anchors:  30-interaction-and-gestures.md §Open questions (the three device
                     targets: cancel-path validation = `.cancelled`/one `ACTION_CANCEL`
                     the instant a scroller claims; the `@gorhom/bottom-sheet` RNGH-pan
                     "hard case"; pager horizontal claim) + §The cooperative principle +
                     Decision 4 (cancellation = spring-back, no onPress) + Decision 6 (the
                     surface is ONE interactive unit → the nesting policy this task
                     decides),
                     32-host-safe-hittest-and-sdf.md (SDF coords — already device-proven
                     in U8-001; consumed here as the tap-target convention, not re-proven),
                     _legacy/05-gestures-and-interaction.md §Coexistence test matrix (the
                     canonical 11-row matrix `30` Sources cites — the literal scenario
                     list; loaded because `30` explicitly points here for the matrix),
                     decision-ledger.md RT-001 (closes here), RT-002 (deferred — the deep
                     RNGH-composition / drag-tilt rows are NOT in scope).
- Decision:          device-verify — NO new recognizer code. U8-001 already ships the FSM,
                     the slop-yield, the hitTest/onTouchEvent SDF gate, and the four
                     onShader* events. This task (a) builds the example coexistence harness
                     and (b) runs the matrix. Reject: re-implementing or "improving" the
                     recognizer; pulling RNGH into `packages/` (rule #7 — coexistence is
                     free precisely because we add no RNGH dependency to the library).
- Harness (headless prereq, example-only): add the gesture-ecosystem peers to `example/`
                     — react-native-gesture-handler, react-native-reanimated (the
                     @gorhom peer), @gorhom/bottom-sheet, react-native-pager-view — wrap
                     the root in GestureHandlerRootView, and build a `coexistence` screen
                     that places an `active`-mode <FxSurfaceView shader> inside each matrix
                     container, logging onShaderPressIn/Out/Press/LongPress so the maintainer
                     reads the cancel-vs-press outcome live. Register it in
                     `example/data/tasks.ts` + `app/(tasks)/[taskId].tsx` like the sibling
                     screens.
- Reference (HOW):   the existing example screens (`example/screens/presence.tsx`,
                     `stress-list.tsx`) for the screen + registration idiom;
                     @gorhom/bottom-sheet + react-native-pager-view docs for setup;
                     references/react-native-gesture-handler for GestureDetector(Pan).
- Rules gate:        #1 native owns touch (no per-pointer JS — the harness logs only
                     semantic events); #3 interaction is expo-view-only; #7 NO RNGH/
                     reanimated in `packages/` — they are EXAMPLE peers only; #9 reads
                     layout. Keep FxShaders pixels. The recognizer is frozen — observe it,
                     don't change it.
- Scope (the matrix — both platforms, agent-device, physical Android):
                     1. native ScrollView/FlatList — (a) tap child surface → onShaderPress
                        once, no scroll; (b) press+drag → cancel/spring-back past slop, NO
                        onShaderPress (iOS `.cancelled`; Android one `ACTION_CANCEL`);
                        (c) press, hold still, release → In→Out→Press, scroll never steals.
                     2. pager (react-native-pager-view) — press+horizontal swipe →
                        spring-back as the pager claims, page changes, NO onShaderPress;
                        a still vertical tap → onShaderPress.
                     3. @gorhom/bottom-sheet (RNGH pan — the hard case) — (a) press content
                        then drag the sheet → spring-back as the RNGH pan claims, sheet
                        moves, cancelled cleanly; (b) tap content (no drag) → onShaderPress,
                        sheet still.
                     4. RNGH GestureDetector(Pan) wrapping the surface — press then pan →
                        the RNGH pan activates past slop, our press cancels/springs back.
                     5. passive mode inside a ScrollView — drag across the surface → the
                        pointer uniform follows the finger, scroll still works, NO onShader*
                        semantics at all.
                     6. controlled mode inside a ScrollView — no recognizer attached; confirm
                        zero double-handling (the surface emits nothing; the scroller owns
                        the gesture outright).
                     7. nested fx surfaces — tap the inner surface → observe whether inner
                        alone enters or both; the planner DECIDES the nesting policy from the
                        observation and documents it in `30`.
- Scope boundaries (OUT — RT-002 / G3, deferred): the matrix's "developer wants both"
                     row (`simultaneousWithExternalGesture` / `NativeGesture` first-class
                     binding) is DOCUMENTED-ONLY, not required for default coexist; drag/tilt
                     axis-aware claiming is RT-002 (DEF-011). No `packages/` native edit.
- Device-verify:     the seven matrix groups above, both platforms. The load-bearing
                     assertion is the cancel path: exactly one `.cancelled`/`ACTION_CANCEL`
                     the instant the ancestor claims, spring-back rendered natively, and NO
                     onShaderPress on any cancelled gesture. Write evidence/device.md.
- Closure:           on the maintainer's PASS the planner closes RT-001 in `30` (strike the
                     three §Open questions: cancel-path validated, @gorhom hard case
                     confirmed, pager confirmed), records the nesting-policy decision in `30`,
                     writes reviews/U8-002.md, ticks through merged. With RT-001 closed, the
                     V1 interaction contract is device-complete.
- Done when:         the coexistence harness ships in `example/` (the four peers + the
                     `coexistence` screen + registration), example `bunx tsc --noEmit` green,
                     the recognizer untouched in `packages/`, and the seven-group device
                     runbook is written in evidence/device.md for the maintainer.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-13)
- [x] rules-gated (planner, 2026-06-13 — #1 harness logs semantic events only, no per-frame JS; #3 interaction on FxSurfaceView/expo-view; #7 the four gesture peers are EXAMPLE-only, `packages/` stays RNGH-free; #9 reads layout. Recognizer frozen.)
- [x] implemented (the example coexistence harness — JS only — agent, 2026-06-13; `example/screens/coexistence.tsx` + the four gesture peers + root `GestureHandlerRootView` + the worklets Babel plugin, registered in `data/tasks.ts` and `app/(tasks)/[taskId].tsx`)
- [x] commented (iceberg — agent, 2026-06-13; the screen docblock states the cancel-path observation; each section caption names its expected outcome; the always-wired handlers comment explains why passive/controlled silence is a live proof)
- [x] headless-done (agent, 2026-06-13 — example `bunx tsc --noEmit` green; `packages/` tsc + build + lint + swift:lint green and `git status` clean under `packages/`)
- [x] device-verified (maintainer-ratified 2026-06-13 — every distinct mechanism proven across both platforms: scroll/pager/`@gorhom` RNGH-pan hard case cancel cleanly, taps fire once, passive/controlled silent, nesting → outer claims; per-platform-redundant rows waived; the Android probe crash en route fixed + proven via U8-003; `evidence/device.md`)
- [x] reviewed (planner, 2026-06-13 — `../../reviews/U8-002.md`)
- [x] docs-closed (RT-001 resolved in `30` §Resolved + ledger; nesting policy recorded in `30` Decision 6; waivers documented)
- [ ] merged (maintainer, on integration/0.1.x)

## Proof

- **headless:** example `bunx tsc --noEmit` green (the harness is JS-only; `packages/`
  native is frozen — re-run packages `tsc`/build/lint only to prove nothing there moved).
- **device:** `evidence/device.md` — the seven-group matrix above, both platforms, physical
  Android, agent-device. The cancel path is the load-bearing row.
- **docs:** RT-001 closed in `30` §Open questions; the nesting policy recorded in `30`
  Decision 6's neighborhood; the ledger row flipped.
```
