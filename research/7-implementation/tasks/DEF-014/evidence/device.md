# DEF-014 — Device verification

## Result

**SIMULATOR smoke test PASS (5/6 rows); physical device gate still owed.** Per maintainer
direction to skip physical hardware for this task, the runbook was exercised on an **iPhone 17
simulator (iOS 26.x)** at commit `6f9e572`. This is a **non-authoritative smoke test**, not the
device gate — it does not tick `device-verified`. The original physical attempt is recorded below
as BLOCKED (environment fault).

Notable finding: the curated `[[stitchable]]` shaders **do render on this simulator** (current
Metal toolchain) — contrary to the runbook's premise — so the simulator carried far more signal
than expected. What the simulator still cannot prove is the iPhone 14 (A15) GPU's render/scroll
performance; that remains a hardware claim.

| # | Row | Sim result | Evidence |
|---|-----|-----------|----------|
| 1 | Scroll-linked (fade+scale, identity at rest) | PASS (sim) | `sim-row1-scroll-linked.mp4`, `sim-01/02/03` |
| 2 | Zero per-frame JS | PASS (sim) | `logs/sim-row2-js-silence.log` (0 JS lines / 12 swipes; no API callback) |
| 3 | Mapping runs in render server (JS stall) | PASS (sim, strong) | `sim-row3-scroll-under-js-stall.mp4` (~75% JS-thread stall, transition stayed live) |
| 4 | Hosting boundary (sizing + self-gesture) | PASS (sim) | `sim-05-row4-hosting-sized.png` |
| 5 | os<17 / fallback | NOT-RUN | no sub-17 runtime; `if #available(iOS 17.0) … else self` branch is code-reasoned |
| 6 | No regression to shipped hosted effects | PASS (sim) | `sim-06-row6-noregression-glass.png` |

Full write-up: `logs/sim-smoke-test-summary.log`. Build log: `logs/sim-build-install.log`.
Instrumentation for rows 2–3 was example-side and reverted (`source-scroll.tsx` byte-identical to
original; `packages/` untouched).

---

### Physical device attempt — BLOCKED (CoreDevice tunnel down)

The physical iPhone is reachable only over the lockdown/usbmux query path; the CoreDevice tunnel
needed to install, launch, or drive the app is down, which blocks Expo, `devicectl`, and
agent-device alike. This is an environment/connection fault, not a defect in DEF-014 — it needs
maintainer intervention to clear, then a re-run for the true hardware gate.

- Device: **iPhone 14 (iPhone14,7), iOS 26.4.1** — satisfies the iOS 17+ floor.
- Commit under test: `6f9e5724a83c47636b657772e64ec03b809c57eb` (branch `integration/0.1.x`).
- Channel state: `developerModeStatus: enabled`, `pairingState: paired`, **`tunnelState: unavailable`**.
- Root cause: a stale CoreDevice record (`ecid_2854625264943134`, CoreDevice id
  `E4A2BADD-…`) shadows the real device — `devicectl device info apps` fails with
  `CoreDeviceError 1011`, Expo reports "No device matching", and agent-device's XCUITest runner
  fails to launch (instant 61 ms). Bouncing the user-owned `CoreDeviceService` did not clear it.
- Remaining fixes (maintainer-only): physically unlock + replug USB + re-confirm Trust; **or**
  sudo-restart the root-owned `remoted`/`usbmuxd`; **or** remove the stale pairing in
  Xcode › Devices, then re-pair. After that, re-run this runbook.
- Evidence: `evidence/logs/device-connection-diagnostics.log` (full capture),
  `evidence/logs/build-install.log` (Expo discovery failures).

On the physical device **all six rows were NOT-RUN (blocked)** — the connection fault prevented
any install/launch. The rows that *were* exercised (on the simulator) are in the table at the top.
Once the device connection is restored, every row remains executable as written below; nothing in
the DEF-014 surface was changed (`packages/` and `example/screens/source-scroll.tsx` untouched;
signing config added to the gitignored `ios/` prebuild was reverted).

---

PENDING — the hosted SwiftUI render-server path does not run headless. This is the runbook
for the device gate; it needs a **physical iPhone on iOS 17+** (the simulator does not render
the curated stitchable shaders, and render-server scroll fidelity is a hardware claim). iOS
only — Android's ladder is empty (`{via:'none'}`), so there is nothing to device-prove there.

## Build under test

- Branch: `integration/0.1.x`.
- Screen: **DEF-014 · Scroll-linked source rung** (`example/screens/source-scroll.tsx`),
  reached from the task list (`DEF-014` row → `source-scroll`).
- Surface: `<Fx.Scroll source={fx.source.scroll({ axis: 'vertical' })} tiles={…} />` — a vertical
  hosted SwiftUI `ScrollView` of eight fx-owned generative tiles (a gradient fill + seven curated
  shaders), each at 240 pt.
- Native: `FxScrollView` (persistent `UIHostingController`) hosting `FxScrollRootView`
  (`ScrollView` + per-tile `.scrollTransition`).

## Setup

1. Install the example on a physical iPhone (iOS 17+); run the Metro bundler.
2. Open the `DEF-014` task row → the scroll-linked screen.
3. For row 2/3 (JS-silence and render-server proof), add a temporary per-frame `console.log`
   in the screen and a JS busy-loop toggle, then **revert both after capture** (`packages/` and
   the screen must end clean).

## Rows (the six-point scenario)

### 1. Scroll-linked presentation

Scroll the list. As each effect tile crosses the viewport edges its appearance animates — the
SwiftUI default edge transition: **fade + scale**. A tile fully scrolled into the viewport rests
at **identity** (full opacity, unscaled). Capture: a video of a tile entering from the bottom
edge (faded/scaled) settling to identity at center.

PASS if every tile fades/scales at the edges and is identity at rest. FAIL if tiles pop in
abruptly or never reach identity.

### 2. Zero per-frame JS

With a per-frame JS log instrumented, scroll continuously. The JS side must emit **no callback
per frame** — the scroll→presentation mapping is entirely native (`.scrollTransition` in the
render server). Capture: the Metro/JS console showing silence during a sustained scroll.

PASS if no per-frame JS fires while scrolling. FAIL if any per-frame JS callback is observed.
Revert the instrumentation.

### 3. The mapping runs in the render server

Start a JS busy-loop (block the JS thread) and scroll. The tile fade/scale must stay **smooth**
while JS is busy — proof the mapping is off the main/JS thread. Capture: a video scrolling under
a JS stall, transitions still smooth.

PASS if the scroll transition is unaffected by the JS stall. Revert the toggle.

### 4. Hosting boundary

Confirm the hosted `ScrollView` **sizes correctly** through the auto-Host boundary (fills its
styled frame, no 0×0, no clipped tiles) and that its scroll gesture is **self-contained** — it
scrolls on its own and coexists with any outer RN scroller without stealing or losing the
gesture (the §Hosting landmine). Capture: a still showing the sized list + a clip of the
self-contained scroll.

PASS if it sizes correctly and self-gestures.

### 5. os<17 / fallback

On an iOS 16 device (or by lowering the deploy floor), the same screen degrades to **static
content** — tiles render, no scroll-linked motion, no crash. (Android shows the same static
degradation via the empty-ladder fallback.)

PASS if it degrades to static with no crash.

### 6. No regression to the shipped hosted effects

Visit a previously-verified hosted screen (fill / glass / shader catalog) — a hosted glow/glass
tile still renders unchanged.

PASS if the shipped hosted effects are unregressed.

## Notes for the verifier

- Instrument the JS side only temporarily; `packages/` and `example/screens/source-scroll.tsx`
  must be clean at the end of the run.
- Record device, OS version, and commit; place clips/stills under `evidence/`.
