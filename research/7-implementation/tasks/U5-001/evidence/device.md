# U5-001 — device verification scenario

Status: **awaiting device gate** (headless-done; layout/lifecycle behavior does not run
headless).

Platforms under test: **iOS and Android** — the observer ships on both, and RT-013's
closure needs both halves recorded. Build: example app, Debug, on a real device or
simulator/emulator (no GPU required — the observer is layout-only).

Instrumentation: the observer is **internal** — it has no JS surface and no consumer until
the animation driver lands, so every scenario reads it through **temporary log lines**
(`NSLog` on iOS, `Log.i` on Android), added for the run and **reverted after**, per the
established log-instrumented pattern:

- iOS: one `NSLog` in the `FxLayoutObserver` bounds-observation handler logging the new
  `capturedFrame`; one in a temporary read probe (see scenario 2) logging
  `readFrameInParent()` / `readOriginInWindow()` / `readTravelDistance(to:)`.
- Android: the same two lines — one in `onLayoutChange`, one in the read probe.

A convenient read probe with zero new surface: log the synchronous reads from an existing
per-change call site (`applyResolvedConfig()` on either platform), driven by toggling any
prop (e.g. `intensity`) from the example screen. Discrete, user-driven, per-change — not a
poll.

## Scenarios

### 1. The frame is correct natively at mount

- **Steps:** Open a screen with a laid-out `FxSurfaceView` of known JS dimensions (e.g. the
  content-motion screen; note the style's width/height and position). Launch with the
  capture log live.
- **Expected:** Before/at first paint, the capture log reports a frame matching the
  RN-assigned layout: size equals the styled size (points on iOS; px = dp × density on
  Android), origin equals the view's position in its parent. No JS round-trip appears
  anywhere in the path (no `onLayout` prop, no bridge traffic for the read).
- **Failure signs:** zero/stale frame at mount (the mount-time capture missed); a frame in
  the wrong coordinate space (window instead of parent); any JS-side involvement.

### 2. The captured frame refreshes on a real layout change, via the event path

- **Steps:** Trigger a real layout change: rotate the device, and/or drive a flex-driven
  resize (e.g. toggle a sibling that reflows the surface, or change the container's
  padding). Watch the capture log, then probe the reads.
- **Expected:** Each layout change fires the capture log **once per applied layout** (the
  event path: the iOS bounds observation, the Android layout-change listener) with the new
  parent-space frame — including **origin-only** moves (sibling above grows; size unchanged).
  The subsequent read probe returns the refreshed frame, a window origin consistent with
  the new on-screen position, and edge-travel distances consistent with window size minus
  position (spot-check `bottom`: window height − window-origin y).
- **Failure signs:** the log fires continuously (a poll or layout storm — must be
  event-driven); it never fires on rotation/resize (the event path is dead and a read would
  serve stale geometry); origin-only moves don't capture.

### 3. Zero JS round-trip

- **Steps:** With the capture log live, exercise scenarios 1–2 while watching Metro/bridge
  activity (no `onLayout` prop is wired on the example surface; keep it that way).
- **Expected:** All captures and reads happen native-side only; nothing crosses to JS per
  layout event — JS sees no new events, calls, or re-renders attributable to the observer.
- **Failure signs:** any per-layout JS traffic.

### 4. The observer writes nothing

- **Steps:** On a screen with a child layout sensitive to measurement (e.g. nested flex
  rows in the surface), capture the child layout twice — once on this build, once on a
  build with the observer creation line commented out (iOS `init`, Android property).
  Compare via the accessibility/element tree dump or screenshots.
- **Expected:** Child layout is **byte-identical** with and without the observer attached —
  no `setNeedsLayout`/`requestLayout` storms, no extra layout passes (the Android listener
  and iOS KVO are passive reads).
- **Failure signs:** any layout delta, repeated layout passes in the log, or jank
  attributable to the observer.

### 5. Accessibility (required of every `device: yes` task)

- **Steps:** With VoiceOver/TalkBack (or the accessibility tree dump), inspect a surface
  with the observer attached.
- **Expected:** The observer adds no view and no accessibility node; the wrapped child's
  tree is unchanged from scenario 4's baseline.
- **Failure signs:** any new element or focus change attributable to the observer.

## RT-013 — the two halves to record on the run

RT-013 (ledger: content-motion reachability) closes **only** on this device gate, never at
headless-done. The run records:

1. **Strictly `expo-view` reachability:** the post-layout read works on `FxSurfaceView`
   (the expo-view substrate) with no hosted-substrate involvement — confirming the lean
   that content motion (and its layout read) is strictly `expo-view`.
2. **New-Architecture-only stance:** the run is on the New Architecture (Fabric — the
   example app's only configuration; SDK 56 floor). No Paper fallback is tested or
   supported; the read point exists only in Fabric's mounting flow.

On a pass, the maintainer ticks `device-verified`; RT-013 then closes in `33` (its owning
doc — strike the answered research questions) and the ledger row flips, per the closure
plan in `notes.md`.

## What a pass proves

The layout contract's two open research questions in `33` are answered in running code:
the post-layout frame is available natively at mount and on every layout update (Fabric
resolves layout before mounting), and fx reads size/position/travel natively with zero JS
round-trip — the read surface the animation driver consumes when it lands.

## Results

Date: 2026-06-11. Drove both platforms via agent-device; the observer is internal, so each
scenario read it through temporary log lines (`NSLog` / `Log.i`) added for the run and
**fully reverted after** (working tree diff-clean except this writeup and the evidence
artifacts; `swift:lint` + Biome both green post-revert). The U4-002 (content-motion) screen
was temporarily augmented with three driver controls (Intensity = a prop batch to fire the
`applyResolvedConfig` read probe; Resize = a size+origin layout change; Spacer = an
origin-only move) and reverted via `git checkout`. The two read points are pinned in
`structure.{ios,android}.md` §Layout read.

- **iOS:** iPhone 17 Pro simulator, iOS 26 (logical 402×874 pt). Layout-only, no GPU, so the
  simulator is sufficient per the verification guide.
- **Android:** physical device `69424da8`, 1080-px-wide portrait (density 2.75; 200 dp →
  550 px), New Architecture. APK built via `gradlew :app:assembleDebug` + `adb install`
  (timestamp-verified), never `expo run:android`.

Log tags: `FXOBS capture` = the event-path capture (iOS `\.bounds` KVO / Android
`OnLayoutChangeListener`); `FXREAD` = the synchronous read probe from `applyResolvedConfig`.

### Scenario 1 — frame correct natively at mount — **PASS** (both)

- iOS: on navigation to U4-002, init seeds `capturedFrame=(0,0,0,0)` (pre-layout), then the
  KVO capture fires `capturedFrame=(101.0, 383.0, 200.0, 200.0)` — size = the styled 200×200
  pt, origin x=101 = (402−200)/2 (centered, parent space). The mount-time `FXREAD` reports
  `window=(0,0)` because prop application runs before window attach (the `view.window == nil`
  guard returns zero) — expected; real window values appear once on-window (Scenario 2).
- Android: `FXOBS capture capturedFrame=265,718,815,1268 (550x550)` — 550 px = 200 dp × 2.75,
  origin x=265 = (1080−550)/2 (centered, parent-space px). Mount `FXREAD` fires pre-layout
  (empty), same ordering as iOS.
- No `onLayout` prop is wired and the path is pure native `NSLog`/`Log.i` — no JS round-trip.
- Evidence: `ios/` mount logs (in this run), `android/s1-mount.png`.

### Scenario 2 — captured frame refreshes on a real layout change, via the event path — **PASS** (both)

Each applied layout fired the capture **exactly once**; an intensity toggle (a prop batch,
no relayout) fired **zero** captures — confirming event-driven, not a poll.

- **On-window read (iOS):** `parent=(101,383,200,200) window=(101,383) travelTop=583
  travelBottom=491` — travelTop = 383+200, travelBottom = 874−383 (window height 874 pt). The
  bottom spot-check matches "window height − window-origin y" exactly.
- **On-window read (Android):** `parent=Rect(265,718-815,1268) window=Point(265,958)
  travelTop=1508 travelBottom=1288 insets={top=86,bottom=66}` — window y includes the
  status-bar/header ancestor offset; real system-bar insets via `getRootWindowInsets`.
- **Flex-driven resize (size+origin):** iOS one capture `(51,353,300,260)` (x=51=(402−300)/2);
  Android one capture `128,636,953,1351 (825x715)` (825=300 dp×2.75, 715=260 dp×2.75,
  x=128=(1080−825)/2). Read probe returns the refreshed frame.
- **Origin-only move (spacer; size unchanged):** iOS one capture `(51,440.67,300,260)` — only
  origin-y shifted 353→440.67; Android one capture `128,878,953,1593 (825x715)` — only y
  shifted 636→878. This is the load-bearing case: iOS sets `center` then `bounds`, so the
  `\.bounds` KVO notifies even on an origin-only relayout (handler reads the already-current
  `frame.origin`); Android's `OnLayoutChangeListener` dispatches from `View.layout()`
  independent of the no-super `onLayout` override.
- **Real device rotation:** iOS (landscape-enabled build) one capture `(337,154,200,200)`,
  x=337=(874−200)/2 confirming the landscape window width 874. Android (rotation-enabled
  build, forced via `user_rotation`) settled to `848,159,1398,709 (550x550)`,
  x=848=(2246−550)/2 confirming the landscape window 2246 px; a handful of captures over the
  ~40 ms rotation transition (the discrete relayout + inset-settling passes, then silence —
  not a continuous poll/storm).
- Evidence: `{ios,android}/s2d-landscape.png`, `s2d-rotate-state.png`, run logs.

### Scenario 3 — zero JS round-trip — **PASS** (both)

Established by construction and observed on the run: the example surface wires no `onLayout`
prop, and `FxLayoutObserver` exposes no `EventDispatcher`/JS callback — every capture and
read is native-only. Each layout change produced exactly one native `FXOBS` line and no
layout event was dispatched to JS; the only JS in the loop is the explicit driver prop
toggle, which is the test harness, not the observer.

### Scenario 4 — the observer writes nothing — **PASS** (both)

Captured the wrapped child's layout twice — once with the observer attached, once on a
variant build with the observer creation line commented out (iOS `init`, Android property;
the read probe was disabled alongside it since it references the observer). Variants were
rebuilt, installed, and reverted.

- iOS: with vs without — child "Tap me" nodes identical at `{x:101, y:383, w:200, h:200}`
  across all three nesting depths (normalized rect set byte-identical).
- Android: with vs without — ViewGroup `{x:265, y:958, w:550, h:550}` and both TextViews at
  identical rects (normalized rect set byte-identical).
- No `setNeedsLayout`/`requestLayout` storm, no extra passes — the KVO/listener reads are
  passive.
- Evidence: `{ios,android}/s4-with-observer-child.txt`, `s4-without-observer-child.txt`,
  `s4-without-observer.png`.

### Scenario 5 — accessibility — **PASS** (both)

The observer adds no view and no accessibility node: the surface's accessibility tree shows
only the wrapped child (iOS three "Tap me" nodes; Android one ViewGroup + two TextViews),
identical to Scenario 4's baseline, with nothing attributable to the observer. Evidence:
`{ios,android}/s5-with-observer.png`.

### RT-013 — the two halves recorded

- **Strictly `expo-view` reachability:** every `FXREAD` fired on `FxSurfaceView` (the
  expo-view substrate, an `FxNativeView`/`ExpoView`) with no hosted-substrate
  (`FxHostedView`) involvement — the post-layout read is reachable on `expo-view` exactly as
  the lean predicted.
- **New-Architecture-only stance:** the run is on Fabric — the iOS runtime log prints
  `Running "main" with {... "fabric":true}` and `newArchEnabled=true`; the example app's only
  configuration (SDK 56 floor). No Paper fallback tested or supported.
- Recordings: `ios/rt013-ios.mp4`, `android/rt013-android.mp4` — each drives Intensity →
  Resize → Spacer while the read probe logs reads on `FxSurfaceView`.

### Net verdict

All five scenarios PASS on iOS and Android; RT-013's two halves recorded on both. The
maintainer owns the `device-verified` tick and RT-013 closure — not recorded here.
