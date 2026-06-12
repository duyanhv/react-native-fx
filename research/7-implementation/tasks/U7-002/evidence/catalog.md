# U7-002 — device runbook (the presence catalog + the React-semantics rows)

The agent reached `headless-done` with the two bounded fixes shipped (first-mount translate;
harness log-key). This is the human/agent-device runbook for the `device-verified` gate. Run
on **both** platforms (iPhone + a physical Android). Effects, animation, and touch do not run
headless — this gate is required, not optional.

U7-001 already proved the **handshake** (deferred unmount, interrupt-as-retarget, event
ordering, teardown, reduce-motion) on both platforms — do **not** re-run those as goals. This
task owns the **feel** (the catalog values, law-tested against the real platform component),
the **five React-semantics rows**, and the **first-mount translate** proof.

**Harness:** the example app, task **U7-002 · FxPresence catalog + React-semantics rows**
(`screen: "presence"`, `example/screens/presence.tsx`). Controls:

- **Show / Hide** — flips `visible` on the primary `transient` banner.
- **appear=… · remount** — toggles `appear` and remounts the subtree (fresh mount).
- **offscreen=…** — flips the stage container's `display` to/from `none` while `visible`
  stays true (the Suspense/offscreen-hide row).
- the tappable **Transient** card (`taps:` counter) — the re-render-mid-exit lever.
- **onTransitionEnd** log — primary banner events, newest-first (phase + finished + interrupted).
- the **eviction list** — a virtualized `FlatList` of 12 `transient` cells, each
  `visible` with `appear={false}` (instant-present, so a settled run logs nothing), with its own
  **eviction events** log (newest-first). A clean run reads `eviction events: none`; any phantom
  exit on eviction would surface there.

**Instrumentation:** add temporary `NSLog`/`Log.d` in `FxPresenceCoordinator.{swift,kt}`
(`update`, `beginEnter`/`beginExit`, `handleContentLayout`, `handleDriverCompletion`, `emit`)
only if the on-screen logs are not enough, then **revert it** before the gate closes
(`grep FXP packages/` clean, `git status` clean). The on-screen logs should prove most rows.

**Tooling carryover (from the U7-001 run):** (1) avoid duplicate same-named iOS sims —
agent-device name resolution is ambiguous and silently splits taps vs install/logs; pin by
deleting the dupe. (2) POCO F1 dozes between commands — `settings put system
screen_off_timeout`, `svc power stayon true`, `wm dismiss-keyguard`. (3) iOS spring ≈ 750 ms
(catchable in bursts); Android `SpringForce` ≈ 50–150 ms (the slide is below burst resolution —
read the on-screen log and the opacity fade, not the slide frames). (4) RN `NSLog` does not
reach `simctl log` — capture via `simctl launch --console`.

Recordings/screenshots stay **local and gitignored** (e.g. under `/tmp`) — reference them by
name in Results; do not commit binaries.

---

## Part 1 — the `transient` catalog, law-tested

The deliverable is the per-platform default catalog filled with **device-validated** values,
each row passing the law test (`41`): a nameable platform source, no cross-platform-uniform
invention, parity with the real native component. The law decides the tuning — not taste.

### The law test (run this first, per phase)

1. Trigger the **real** platform component beside the harness:
   - **iOS** — a system **banner** (e.g. a local notification banner, or the share-sheet /
     system toast presentation) sliding in from the top.
   - **Android** — a **Material snackbar** (`Snackbar.make(view, …).show()`) sliding up from
     the bottom.
2. Play the `transient` enter/exit next to it. Judge **direction, edge, travel distance, and
   the spring feel** (rise time, overshoot/settle) side by side.
3. The shipped envelope must **mirror** the platform component within its own spring family. If
   it diverges, that is the value to adjust — and only that value.

### The shipped envelope (the starting point under test)

| field | iOS (`transient`) | Android (`transient`) |
|---|---|---|
| source | system banner | Material snackbar |
| enter shape | top-edge slide + fade — away vector `opacity 0, translationY = -contentHeight` → identity | bottom-edge slide + fade — away vector `opacity 0, translationY = +contentHeight` → identity |
| exit shape | reverse to the top away vector (idiomatic banner dismiss) | reverse to the bottom away vector (idiomatic snackbar dismiss) |
| spring (shipped) | `SwiftUI.Spring()` default — no bounce, settles ≈ 750 ms (render-server first, display-link integrator on retarget) | `SpringForce` default — `dampingRatio` medium, settles ≈ 50–150 ms |

> The shipped spring is the **platform default**, deliberately — V1 honors `transition:
> {spring: 'native'}`. The provisional `data-layer §Presence presets` values
> (iOS `0.25s dampingRatio=0.85 stiffness=197 damping=17`; Android `250ms DecelerateInterpolator(1.5)`)
> are the *targets to validate*, not yet shipped numbers. **If the side-by-side comparison shows
> the default spring is wrong**, plumb the corrected spring parameter from the coordinator to the
> driver as a bounded change (the driver's retarget mechanics stay U6-proven and untouched), and
> record the new value as a platform token here.

### Fill on device

> One row per (preset × phase). Mark each value **kept-default** or **adjusted** (and why), and
> name the platform source it was judged against. Exit must read as the **idiomatic dismiss**,
> judged against the real component — not a blind reverse of enter.

| preset | phase | platform | source | shape (edge / travel) | timing/spring | kept / adjusted | notes |
|---|---|---|---|---|---|---|---|
| transient | enter | iOS | system banner | _fill_ | _fill_ | _fill_ | |
| transient | exit | iOS | system banner | _fill_ | _fill_ | _fill_ | idiomatic dismiss? |
| transient | hold | iOS | — | identity | platform idle | — | |
| transient | enter | Android | snackbar | _fill_ | _fill_ | _fill_ | |
| transient | exit | Android | snackbar | _fill_ | _fill_ | _fill_ | idiomatic dismiss? |
| transient | hold | Android | — | identity | platform idle | — | |

---

## Part 2 — the five React-semantics rows

Each `35` rule, proven on device. Each row: **PASS/FAIL + the observed log/behavior**. The
implementation rules are already in `35` §React-semantics edge cases — this proves them.

1. **StrictMode (dev double-invoke).** Run a **dev** build (StrictMode double-invokes effects
   and mounts → unmounts → remounts each component once). Toggle Show/Hide normally. **Expect:**
   exactly **one** `enter`/`exit` event per toggle — no doubled enter/exit, no phantom event
   from the double-invocation. The FSM is prop-driven; StrictMode must not desync it.
   - PASS/FAIL: ___ · observed: ___

2. **Fast Refresh mid-exit.** Press **Hide**; while the exit is in flight (catch the ≈ 750 ms
   iOS window; on Android trigger during the fade), **edit `presence.tsx`** (e.g. change a
   label string) and save to force a Fast Refresh remount. **Expect:** the stranded-exit guard
   releases the retained child immediately (host ref → null while `exiting`) — no leaked/stuck
   card, no crash, and **no** `exit` event expected for the torn host. The screen remounts clean.
   - PASS/FAIL: ___ · observed: ___

3. **Suspense / offscreen hide (a hide is a hold).** With the banner shown (`visible=true`, at
   rest), press **offscreen=true** (the stage's `display` → `none`; `visible` stays true).
   **Expect:** **no** `onTransitionEnd` event fires (a hide lowers to a visibility update, never
   a `Remove`, so no FSM edge exists). Press **offscreen=false** — the card is simply there
   again, **no** enter event. The log must be unchanged across both presses.
   - PASS/FAIL: ___ · observed: ___

4. **Re-render mid-exit (snapshot semantics).** Press **Hide**; while the exit is in flight,
   **tap the Transient card** (bumps `taps:`, re-rendering the parent with changed child props).
   **Expect:** the exiting child is the **frozen snapshot** — its content does not update
   mid-exit, and the exit envelope is **not** restarted by the re-render (only a `visible`
   retarget would). The exit settles to its single `exit finished=true`.
   - PASS/FAIL: ___ · observed: ___

5. **List eviction (structural immunity).** In the **eviction list**, scroll briskly so cells
   virtualize out and recycle. **Expect:** **eviction events: none** — eviction is whole-subtree
   teardown (the `42` scope ceiling), so the coordinator dies with the cell, cancels, and emits
   nothing. **No phantom `exit`, no crash, clean recycle.** Scroll back; cells re-appear without
   spurious events.
   - PASS/FAIL: ___ · observed: ___

---

## Part 3 — the first-mount translate fix (proof)

The carried bug: the first prop batch can precede layout, so measured travel resolved 0 and the
**first** enter only faded (no slide) — later toggles slid correctly. The fix holds a fresh
enter until the first layout pass lands, then re-seats the now-measured away vector and runs it.

**Run:** press **appear=… · remount** until it reads `appear=true`; the subtree remounts with
`visible=true` (a genuine fresh mount). **Expect:** the **first** enter visibly **translates** —
iOS slides down from the **top** edge, Android slides up from the **bottom** edge — not a
fade-in at the rest position. Re-run a few times (and after navigating away and back) to confirm
it is reliable, not racy.

- iOS PASS/FAIL: ___ · observed: ___
- Android PASS/FAIL: ___ · observed: ___

> Regression guard: also confirm `appear=false` still shows **instantly** (no slide, no enter
> event) and that ordinary Show/Hide toggles still translate — the fix must not have changed the
> already-proven handshake. (No driver internals were touched, so the U6 retarget paths are
> unaffected; a basic Show→Hide→Show retarget is enough to confirm.)

---

## Part 4 — the harness log-key fix (note)

The U7-001 run flagged a benign LogBox "two children with the same key" warning past 8 log
entries (`id: lines.length` collides once the list caps). Fixed: log lines now key off a
monotonic counter (`nextLogId`). **Confirm:** drive more than 8 toggles and verify **no**
duplicate-key LogBox warning appears. Example-only; no runtime behavior change.

- PASS/FAIL: ___ · observed: ___

---

## Part 5 — parity check

After tuning, run the two platforms **side by side**. The intent is the same (a brief,
self-dismissing overlay); the **shape diverges by design** — iOS enters from the **top** (banner),
Android from the **bottom** (snackbar). **Divergence is correct under the law.** What to catch is
accidental **sameness** — a value that happens to match cross-platform because it was copied, not
because each platform's own component asked for it. Record: does each platform mirror *its own*
native component, and is any cross-platform-uniform value justified by an explicit override (none
in V1) rather than accident?

- Parity verdict: ___

---

## Results

> Fill on device. One block per platform: device/OS, the filled Part-1 catalog rows, the five
> Part-2 rows (PASS/FAIL + log), the Part-3 first-mount proof, Part-4, and the Part-5 parity
> verdict. Attach screenshots/clips by name (local/gitignored).

### iOS — _device/OS_

_fill_

### Android — _device/OS_

_fill_

### Cross-platform notes

_fill_
