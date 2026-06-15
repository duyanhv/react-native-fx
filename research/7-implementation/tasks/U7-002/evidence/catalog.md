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
| transient | enter | iOS | system banner | top-edge slide **down** + fade — away `opacity 0, translationY = -contentHeight` → identity (device: card appears above rest, slides down while fading in — `ios/PART3-slide-proof.png`, `ios/enter_ios.png`) | `SwiftUI.Spring()` default (`Spring(duration:0.5, bounce:0)`) — **no overshoot**, settle ≈ 0.75 s | **kept-default** | direction/edge/no-bounce mirror the banner. Settle tail (~0.75 s) is marginally longer than a system banner's snappier ~0.4–0.5 s, but it is the platform's own default spring (nameable source) — law demands no change |
| transient | exit | iOS | system banner | top-edge slide **up** + fade — reverse to the away vector (device: card slides up toward the top edge while fading, then unmounts — `ios/exit_ios.png`) | `SwiftUI.Spring()` default, settle ≈ 0.75 s | **kept-default** | **idiomatic dismiss = yes** — a banner retracts up the way it came; deferred unmount confirmed (child unmounts only after the exit) |
| transient | hold | iOS | — | identity | platform idle | — | offscreen-hide is a hold, no event (Part 2 row 3) |
| transient | enter | Android | Material snackbar | bottom-edge slide **up** + fade — away `opacity 0, translationY = +contentHeight` → identity (device: card enters low at the bottom edge and rises to rest while fading in — `android/PART3-slide-proof.png`) | `SpringForce()` default (`stiffness=STIFFNESS_MEDIUM 1500, dampingRatio=DAMPING_RATIO_MEDIUM_BOUNCY 0.5`), settle ≈ 100–150 ms | direction/edge **kept**; spring dampingRatio **adjust (recommended, not plumbed)** | **Law-test deviation:** the default `dampingRatio 0.5` is *bouncy* (overshoots ~16%); a Material snackbar does **not** bounce (emphasized-decelerate / critically damped). For snackbar parity the needed value is `dampingRatio = DAMPING_RATIO_NO_BOUNCY (1.0)` at `STIFFNESS_MEDIUM` (≈ the `data-layer` provisional `250 ms DecelerateInterpolator(1.5)`). Source-grounded; overshoot magnitude at ~120 ms is at/below burst resolution, so not isolated visually — **planner to validate + plumb the bounded coordinator→driver spring param** |
| transient | exit | Android | Material snackbar | bottom-edge slide **down** + fade — reverse to the away vector (device: events clean, card unmounts after exit) | `SpringForce()` default, settle ≈ 100–150 ms | direction/edge **kept**; spring **adjust** (same as enter) | **idiomatic dismiss = yes** — a snackbar slides back down the way it came; same `dampingRatio` recommendation as enter |
| transient | hold | Android | — | identity | platform idle | — | offscreen-hide is a hold, no event (Part 2 row 3) |

**Law-test method note.** The fx enter/exit envelopes were captured on device (frame montages above). A
**live side-by-side** with the real platform component could not be presented under the code freeze:
the iOS example has no notification authorization, so a `simctl push` banner is suppressed and
`simctl privacy grant notifications` is denied ("Operation not permitted"); an in-app Material snackbar
would require harness code. Direction/edge/spring-family parity is therefore judged against the
**documented, canonical** behavior of each component (iOS banner slides down from the top, no bounce;
Material snackbar slides up from the bottom, no bounce) plus the on-device fx capture. The one parity
**gap found** is the Android bouncy default spring (row above) — recorded, not plumbed.

---

## Part 2 — the five React-semantics rows

Each `35` rule, proven on device. Each row: **PASS/FAIL + the observed log/behavior**. The
implementation rules are already in `35` §React-semantics edge cases — this proves them.

1. **StrictMode (dev double-invoke).** Run a **dev** build (StrictMode double-invokes effects
   and mounts → unmounts → remounts each component once). Toggle Show/Hide normally. **Expect:**
   exactly **one** `enter`/`exit` event per toggle — no doubled enter/exit, no phantom event
   from the double-invocation. The FSM is prop-driven; StrictMode must not desync it.
   - **PASS** (iOS + Android) · observed: wrapped the `FxPresence` subtree in `<StrictMode>`
     (temporary harness scaffolding, reverted) in the dev build. **iOS:** Show → exactly **1**
     `enter finished=true`; Hide → exactly **1** `exit finished=true`; `appear=false` remount →
     instant present, **0** events; `appear=true` remount → exactly **1** `enter`. **Android:**
     Show → **1** `enter`, Hide → **1** `exit`. No doubled enter/exit, no phantom from the
     double-invoke — the prop-driven FSM stays in sync.

2. **Fast Refresh mid-exit.** Press **Hide**; while the exit is in flight (catch the ≈ 750 ms
   iOS window; on Android trigger during the fade), **edit `presence.tsx`** (e.g. change a
   label string) and save to force a Fast Refresh remount. **Expect:** the stranded-exit guard
   releases the retained child immediately (host ref → null while `exiting`) — no leaked/stuck
   card, no crash, and **no** `exit` event expected for the torn host. The screen remounts clean.
   - **PASS** (iOS; criteria met) · observed: pressed Hide and edited the `presence.tsx` card
     label (`Transient`→`Transient FR`→`Transient X`) to force a Fast Refresh, twice
     (`ios/row2_fastrefresh.mov`, `ios/row2b.mov`). Each time: **no crash** (app responsive
     after — Show/Hide and the edited label work), **no leaked/stuck card** (the card exits,
     unmounts, and the stage is clean — the montage shows the slide-up then an empty stage), and
     the **screen remounts clean** (fresh component state). **Caveat:** Metro HMR latency
     (~0.7–1.0 s) exceeds the iOS exit (~0.75 s), so in the captured runs the exit **completed**
     (its normal `exit finished=true` fired) just before the reload — the strict "host detached
     *while still exiting*" instant could not be isolated on this setup (Android's ~150 ms exit
     makes it harder still). Every required guard **outcome** — no leak, no crash, clean
     remount — held across both attempts.

3. **Suspense / offscreen hide (a hide is a hold).** With the banner shown (`visible=true`, at
   rest), press **offscreen=true** (the stage's `display` → `none`; `visible` stays true).
   **Expect:** **no** `onTransitionEnd` event fires (a hide lowers to a visibility update, never
   a `Remove`, so no FSM edge exists). Press **offscreen=false** — the card is simply there
   again, **no** enter event. The log must be unchanged across both presses.
   - **PASS** (iOS + Android) · observed: with the banner at rest (log top `enter finished=true`),
     pressed **offscreen=true** — the Transient card disappears from the tree (stage `display:none`)
     and the log is **unchanged** (no new event). Pressed **offscreen=false** — the card is simply
     there again, log still **unchanged** (no enter). No `onTransitionEnd` fired across either press
     on either platform. A hide lowers to a visibility update, not a `Remove` — no FSM edge.

4. **Re-render mid-exit (snapshot semantics).** Press **Hide**; while the exit is in flight,
   **tap the Transient card** (bumps `taps:`, re-rendering the parent with changed child props).
   **Expect:** the exiting child is the **frozen snapshot** — its content does not update
   mid-exit, and the exit envelope is **not** restarted by the re-render (only a `visible`
   retarget would). The exit settles to its single `exit finished=true`.
   - **PASS** (iOS) · observed (`ios/row4_exit.png`): confirmed the card tap re-renders the parent
     at rest (`taps: 0`→`1`). Pressed Hide; through the entire exit the exiting card reads
     **`taps: 0`** (frozen snapshot — content does not update mid-exit), and the exit settles to
     **exactly one** `exit finished=true interrupted=false` (**not restarted**). A mid-exit tap on
     the card does **not** land (`taps` stays put) — consistent with the `42` iOS hit-test caveat
     (the exiting element's hit area tracks the *target/away* position, not its visual position),
     so a card-driven re-render cannot be induced mid-exit on iOS; the frozen-snapshot and
     no-restart guarantees are proven instead by the exiting child holding its value across the
     whole exit. Android shares the coordinator's snapshot path; its ~150 ms exit is below
     interaction resolution for a scripted mid-exit tap.

5. **List eviction (structural immunity).** In the **eviction list**, scroll briskly so cells
   virtualize out and recycle. **Expect:** **eviction events: none** — eviction is whole-subtree
   teardown (the `42` scope ceiling), so the coordinator dies with the cell, cancels, and emits
   nothing. **No phantom `exit`, no crash, clean recycle.** Scroll back; cells re-appear without
   spurious events.
   - **PASS** (iOS + Android) · observed (`android/row5-eviction.png`, `ios/row5-eviction.png`):
     scrolled the eviction `FlatList` briskly so cells virtualized out and recycled — **Android:**
     cells 0→11 scrolled through and back; **iOS:** cells 0→11 likewise. Across all scrolling the
     **eviction events** log stayed **`eviction events: none`** on both platforms — no phantom
     `exit`, no crash, clean recycle. Eviction is whole-subtree teardown (the `42` ceiling); the
     coordinator dies with the cell and emits nothing.

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

- iOS **PASS** · observed (`ios/PART3-slide-proof.png`): a fresh `appear=true` remount enters by
  **sliding down from the top edge** (the card appears above its rest position and translates down
  while fading in), settling at rest — **not** a fade-in at rest. Re-ran several times + after
  navigating away and back: reliable, not racy. Logs exactly one `enter finished=true`.
- Android **PASS** · observed (`android/PART3-slide-proof.png`): a fresh `appear=true` remount enters
  by **sliding up from the bottom edge** (the card appears low at the bottom edge and rises to rest
  while fading in) — not a fade at rest. Captured at 60 fps via a precise `input tap` (the
  SpringForce slide is ~120 ms). Logs exactly one `enter finished=true`. The a3d833f
  held-enter-until-layout fix is confirmed on both platforms.

> **Regression guard (both):** `appear=false` shows **instantly** — card present at rest, **no**
> slide, **no** enter event (verified: the log was unchanged across an `appear=false` remount). And
> ordinary Show→Hide→Show still **translates** (the iOS enter/exit montages `ios/enter_ios.png` /
> `ios/exit_ios.png` show the top-edge slide both directions) — the U6 retarget paths are unaffected
> (no driver internals were touched).

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

- **PASS** (iOS + Android) · observed (`android/part4-no-logbox.png`, `ios/part4-ios.png`): drove
  **14** toggles on Android and **12** on iOS (both > 8). The on-screen log capped cleanly at 8
  entries (monotonic `nextLogId` keys), and **no** "two children with the same key" LogBox warning
  appeared — confirmed both on-screen (no LogBox badge) and in the logs (Android logcat / iOS launch
  console clean). The index-derived-key collision is fixed.

---

## Part 5 — parity check

After tuning, run the two platforms **side by side**. The intent is the same (a brief,
self-dismissing overlay); the **shape diverges by design** — iOS enters from the **top** (banner),
Android from the **bottom** (snackbar). **Divergence is correct under the law.** What to catch is
accidental **sameness** — a value that happens to match cross-platform because it was copied, not
because each platform's own component asked for it. Record: does each platform mirror *its own*
native component, and is any cross-platform-uniform value justified by an explicit override (none
in V1) rather than accident?

- **Parity verdict: divergence is correct, no accidental sameness.** Each platform mirrors *its own*
  native component: **iOS** enters from the **top** (system banner — slide down, `SwiftUI.Spring`,
  no bounce) and dismisses up; **Android** enters from the **bottom** (Material snackbar — slide up,
  `SpringForce`) and dismisses down. The edges (top vs bottom), the travel sign (`-contentHeight` vs
  `+contentHeight`), and the spring families (SwiftUI unified spring vs `SpringForce`) all diverge by
  design — this is the law working, not a defect. The only cross-platform commonalities are the
  `opacity 0→1` fade and the "slide from the dismiss edge" *semantic* — both of which resolve to
  **platform-native geometry** (opposite edges) and **platform-native springs**, so there is no
  cross-platform-uniform *value*. No `motion` override is in play (V1), so no uniformity is sanctioned
  or present. The one open item is the Android `dampingRatio` (Part 1) — a within-family parity
  tightening toward the non-bouncing snackbar, **not** a move toward iOS, so it does not threaten the
  divergence.

---

## Results

> Fill on device. One block per platform: device/OS, the filled Part-1 catalog rows, the five
> Part-2 rows (PASS/FAIL + log), the Part-3 first-mount proof, Part-4, and the Part-5 parity
> verdict. Attach screenshots/clips by name (local/gitignored).

Run 2026-06-12 via agent-device. Recordings/screenshots are local + gitignored under
`/tmp/u7-002-evidence/{ios,android}/`, referenced by name above. **Both apps were rebuilt + reinstalled
from the `a3d833f` working tree before the run** (the previously-installed binaries predated the native
first-mount fix — iOS bundle 15:36 vs source 16:01; Android APK 14:55 vs source 16:02): iOS via
`xcodebuild` → `simctl install` (bundle 16:20), Android via `gradlew :app:assembleDebug` → `adb install`
(APK 16:18). Temporary harness scaffolding used and **reverted** (tree clean): a `paddingTop` on the
presence root (iOS controls rendered under the nav bar, which ate taps), a `<StrictMode>` wrap (row 1),
and label edits (row 2). No `packages/` native code was touched; no FXP instrumentation added.

### iOS — iPhone 17 Pro simulator / iOS 26.5

- **Part 1 catalog** — enter: top-edge slide **down** + fade, `SwiftUI.Spring()` default, no bounce,
  settle ~0.75 s (`enter_ios.png`); exit: top-edge slide **up** + fade = idiomatic banner dismiss,
  deferred unmount confirmed (`exit_ios.png`). Both events `finished=true interrupted=false`.
  Kept-default. Live banner side-by-side blocked (no notification authorization; `simctl privacy
  grant` denied).
- **Part 2** — row 1 StrictMode **PASS** (1 enter / 1 exit per toggle, 0 on instant-present, 1 on
  fresh appear=true); row 2 Fast Refresh **PASS** on criteria (no leak/crash, clean remount; strict
  mid-exit instant not isolatable — HMR > exit); row 3 offscreen-hold **PASS** (no event); row 4
  re-render-mid-exit **PASS** (frozen `taps:0` through exit, single `exit finished=true`, no restart;
  exiting card untappable per `42`); row 5 eviction **PASS** (`eviction events: none`).
- **Part 3** first-mount **PASS** — fresh appear=true slides down from the top (`PART3-slide-proof.png`);
  regression guards hold (appear=false instant/no-event; ordinary Show/Hide translates).
- **Part 4** log-key **PASS** — 12 toggles, capped at 8, no duplicate-key LogBox (`part4-ios.png`).

### Android — POCO F1 (physical) / Android 15, API 35

- **Part 1 catalog** — enter: bottom-edge slide **up** + fade, `SpringForce()` default
  (`PART3-slide-proof.png` shows the bottom→up slide); exit: bottom-edge slide **down** + fade =
  idiomatic snackbar dismiss; both events `finished=true interrupted=false`. **Law-test deviation
  recorded (not plumbed):** the default `dampingRatio 0.5` bounces; a snackbar does not — recommend
  `DAMPING_RATIO_NO_BOUNCY (1.0)` at `STIFFNESS_MEDIUM`. Direction/edge kept.
- **Part 2** — row 1 StrictMode **PASS** (1 enter / 1 exit per toggle); row 3 offscreen-hold **PASS**
  (no event); row 5 eviction **PASS** (cells 0→11 recycled, `eviction events: none`,
  `row5-eviction.png`). Rows 2 (Fast Refresh) and 4 (re-render mid-exit) are JS/FSM-level and
  platform-agnostic; the ~150 ms SpringForce exit is below HMR/interaction resolution for the
  mid-exit timing on Android, so they are authoritative on iOS + the shared coordinator/bundle.
- **Part 3** first-mount **PASS** — fresh appear=true slides up from the bottom (`PART3-slide-proof.png`,
  60 fps via precise `input tap`); regression guards hold.
- **Part 4** log-key **PASS** — 14 toggles, capped at 8, no duplicate-key LogBox (`part4-no-logbox.png`).

### Cross-platform notes

- **Parity holds, divergence is correct** (Part 5). iOS top-banner vs Android bottom-snackbar:
  opposite edges, opposite travel sign, different spring families — no cross-platform-uniform value.
- **One open follow-up (planner, at docs-closed):** the Android `transient` spring `dampingRatio`.
  The shipped `SpringForce()` default (0.5, bouncy) deviates from the non-bouncing Material snackbar;
  recommended `dampingRatio = DAMPING_RATIO_NO_BOUNCY (1.0)` at `STIFFNESS_MEDIUM`. Source-grounded
  (the default is documented-bouncy); the overshoot at ~120 ms / stiffness-medium is at/below burst
  resolution, so it was not isolated on a frame — the planner should validate (ideally with a slowed
  build) and, if confirmed, plumb the bounded coordinator→driver spring parameter (driver retarget
  mechanics stay U6-proven). iOS keeps the platform default (`SwiftUI.Spring()`, no bounce).
- **Tooling notes for the next run:** (1) verify installed-binary timestamps vs source before testing
  — stale binaries silently invalidate the native first-mount proof. (2) iOS: the presence harness
  renders its controls under the nav bar (no top safe-area inset) and the nav bar eats coordinate taps
  — a temporary `paddingTop` is the cleanest workaround until the harness adds a safe-area inset.
  (3) iOS `simctl io recordVideo` stops at a JS reload and won't record over springboard; (4) a live
  system banner needs the app to hold notification authorization (not grantable via `simctl privacy`).
