# U7-001 — device scenario (the presence handshake)

The agent reached `headless-done`; this is the human/agent-device runbook for the
`device-verified` gate. Run on **both** platforms (iPhone + a physical Android). Effects,
animation, and touch do not run headless — this gate is required, not optional.

**Harness:** the example app, task **U7-001 · FxPresence handshake** (`screen: "presence"`,
`example/screens/presence.tsx`). Controls: a **Show/Hide** button (flips `visible`), an
**appear=… · remount** button (toggles `appear` and remounts the subtree), a tappable
**Transient** card, and an on-screen **onTransitionEnd** log (most-recent first, phase +
`finished` + `interrupted`).

**Instrumentation:** follow the established pattern — add temporary `NSLog`/`Log.d` in
`FxPresenceCoordinator.{swift,kt}` (`update`, `beginEnter`/`beginExit`, `handleDriverCompletion`,
`emit`) and in `FxSurfaceView.dispatchPresenceTransitionEnd` if the on-screen log is not enough
to confirm ordering, then **revert it** before the gate closes. The on-screen log alone should
prove most rows.

## What the envelope should look like (provisional — MOT-001 owns the device truth)

- **iOS** `transient`: slides from the **top** edge with a fade (system-banner-like).
- **Android** `transient`: slides from the **bottom** edge with a fade (snackbar-like).

The per-platform shape/timing are provisional `data-layer §3` values, **device-pending**.
This gate proves the *handshake* (deferred unmount, interrupt-as-retarget, event ordering),
not the catalog magnitudes — those are U7-002 / MOT-001.

## The six scenarios

1. **Deferred unmount.** With the card shown (visible=true, at rest), press **Hide**. Expect:
   the exit envelope plays on the card; the child stays on screen *through* the exit; it
   disappears only when the log shows `exit finished=true interrupted=false`. The child must
   not vanish instantly on the press.

2. **Interrupt = retarget, never restart.** Press **Show**, then **Hide → Show** rapidly while
   the enter/exit is mid-flight. Expect: the card eases from wherever it was (no jump to fully
   offscreen then slide). The log should show the cut-short phase with `interrupted=true`
   (e.g. `enter finished=false interrupted=true`) followed by the settling of the new phase
   with `finished=true`. Confirm the ordering is coherent (this is `35`'s open ordering
   question — capture the full log).

3. **`appear=false` shows instantly.** Press **appear=… · remount** until it reads
   `appear=false`; the subtree remounts with visible=true. Expect: the card is present
   immediately (no enter slide), and **no** enter event is logged. Then flip to `appear=true`
   and remount: the enter envelope plays and `enter finished=true` logs.
   - **First-mount translate check.** On the `appear=true` remount, confirm the enter visibly
     **translates** (slides in), not merely fades. The coordinator's first prop batch can run
     before layout lands, so the travel magnitude may fall back to 0 → a fade-only enter; if the
     slide is missing on first mount but present on later toggles, capture it (a layout-timing
     issue for the catalog/driver to address, not a handshake failure).

4. **Tappable at rest.** After an enter settles, tap the **Transient** card repeatedly — the
   `taps:` counter increments. (Mid-flight touch is the documented `34`/`42` caveat: iOS
   hit-tests at the target position, Android at the visual position — do not gate on a
   mid-flight tap landing pixel-exact.)

5. **Teardown-during-exit (no leak, no event, no crash).** Press **Hide** and, while the exit
   is in flight, navigate back out of the task screen (unmount the parent). Expect: no crash,
   no dangling view, and no `onTransitionEnd` fired for the torn-down coordinator. Re-enter the
   screen and confirm it behaves normally.

6. **Reduce-motion → single-frame placement.** Enable the OS setting (iOS Settings →
   Accessibility → Motion → Reduce Motion ON; Android Developer options → Animator duration
   scale = off, or Remove animations). Toggle Show/Hide. Expect: the card appears/disappears in
   one frame (no slide), and `onTransitionEnd` still fires immediately for each phase.

## Out of scope here (do not fold in)

The five React-semantics rows (StrictMode / Fast Refresh / Suspense / re-render-mid-exit /
list eviction) are **U7-002** device rows. This scenario proves the handshake basics only.

## Results

> Fill on device. One block per platform: device/OS, per-scenario PASS/FAIL with the observed
> log lines, and any divergence. Attach screenshots/clips under `evidence/`.

Run 2026-06-12 via agent-device. Both platforms **PASS** all six scenarios. The on-screen
`onTransitionEnd` log is the primary record (newest-first); native `NSLog`/log instrumentation
was added only to diagnose an apparent iOS failure (see iOS note), and reverted before close.
Recordings/screenshots are local under `/tmp` (gitignored, not committed) — referenced by name.

### iOS — iPhone 17 Pro simulator, iOS 26.5 (23F77)

> **Process note (matters for reading this run).** Two simulators were both named "iPhone 17 Pro".
> agent-device resolved the name to a *different* sim than the one the build was installed/driven on,
> so the first iOS pass showed a false "no event fires / child never unmounts" reading — taps and the
> build under observation were on different devices. After deleting the duplicate sim and pinning to a
> single device, every scenario passed. Temporary `NSLog` instrumentation on the correct sim confirmed
> the full native chain fires (`update → beginEnter/beginExit → driver renderServer → completion
> completed=true → handleDriverCompletion → emit → dispatch onFxTransitionEnd`) and that the JS
> `onTransitionEnd` log receives every event. The apparent failure was a sim-routing artifact, not a
> code defect.

- **Envelope observed:** `transient` enters/exits as a **top-edge** slide + fade (away vector
  `translationY = -contentHeight`, native trace showed `ty=-64`); render-server spring settles ≈ 750 ms.
- **S1 — Deferred unmount:** PASS. Show → card mounts, log `enter finished=true interrupted=false`.
  Hide → child stays mounted through the exit (JS retains until the event); it unmounts only when
  `exit finished=true interrupted=false` logs. Native trace: `beginExit ty=-64 → renderServer
  completion completed=true → emit exit finished=true`. (`ios-s1-mid1.png`, settled snapshot.)
- **S2 — Interrupt = retarget:** PASS. Rapid Show→Hide→Show captured both interrupt directions in
  one coherent, in-order log (newest-first):
  ```
  enter finished=true  interrupted=false   ← final settle
  exit  finished=false interrupted=true    ← exit cut short by the last Show
  enter finished=false interrupted=true    ← enter cut short by the Hide
  ```
  The cut-short phase emits `interrupted=true finished=false` at the interrupt edge; the retargeted
  phase later settles `finished=true`. No jump (eases from the current value). **This answers the
  open `view-state` ordering question:** the interrupt event precedes the subsequent settle, strictly
  ordered by occurrence.
- **S3 — appear:** PASS. `appear=false` remount → card present immediately, **no** enter event
  (log unchanged, count steady). `appear=true` remount → enter plays, `enter finished=true` logs.
  **First-mount translate observation (documented, not a failure):** the first mount's enter is
  fade-dominant — the card fades in at its rest position with no visible top-slide (`ios-s3e-1.png`),
  consistent with the first prop batch running before layout lands (`contentHeight → 0 ⇒ ty=0`).
  Later toggles carry the real top-edge translate (native exit trace `ty=-64`). Layout-timing item
  for the catalog/driver, per the runbook.
- **S4 — Tappable at rest:** PASS. Four taps on the settled card → `taps: 4`.
- **S5 — Teardown-during-exit:** PASS. Hide then navigate back mid-exit → no crash (app pid alive,
  no crash report), no event for the torn-down coordinator. Re-enter → fresh empty log, normal
  Show (`enter finished=true`) / Hide (`exit finished=true`).
- **S6 — Reduce-motion:** PASS. Settings ⇒ Reduce Motion ON. Show → card placed in a single frame at
  full opacity (`ios-s6-show-imm.png`, no fade ramp), `enter finished=true` fires immediately. Hide →
  card removed in one frame, `exit finished=true` fires immediately.

### Android — POCO F1 (physical), Android 15 / API 35

- **Envelope observed:** `transient` enters/exits as a **bottom-edge** slide + fade (away vector
  `translationY = +contentHeight`); `SpringForce` settles fast (≈ 50–150 ms — fast enough that the
  slide is below frame-burst resolution; the opacity fade is clearly visible).
- **S1 — Deferred unmount:** PASS. Show → `enter finished=true interrupted=false`. Hide → an
  on-device frame burst caught the card **still mounted and faded mid-exit** with `exit finished=true`
  **not yet** logged (`s1b-1.png`), then unmounted on the next frame exactly as `exit finished=true`
  logged (`s1b-2.png`). Deferred unmount confirmed.
- **S2 — Interrupt = retarget:** PASS. Both directions captured (newest-first):
  exit-interrupt → `exit finished=false interrupted=true` then `enter finished=true interrupted=false`;
  enter-interrupt → `enter finished=false interrupted=true` then `exit finished=true interrupted=false`.
  A mid-exit interrupt burst showed the card caught partway (faded, shifted), then easing back to rest
  with no jump (`s2j-1.png` → `s2j-4.png`).
- **S3 — appear:** PASS. `appear=false` remount → instant present, no event (log unchanged,
  `s3a-1.png`). `appear=true` remount → `enter finished=true` logs. First-mount vs later-toggle enter
  both read fade-dominant at burst resolution (the fast spring makes the slide indistinguishable from
  the fade in frame bursts); the bottom-edge translate is in code (`translationY=+contentHeight`).
- **S4 — Tappable at rest:** PASS. Four taps → `taps: 4`.
- **S5 — Teardown-during-exit:** PASS. Hide then system-back mid-exit → no crash (no FATAL in
  logcat, MainActivity alive), no event. Re-enter → fresh empty log, normal Show/Hide.
- **S6 — Reduce-motion:** PASS. Animator/transition/window scales = 0. Show → single-frame full
  placement (`s6rm-01.png`), `enter finished=true` immediately. Hide → single-frame removal
  (`s6rh-01.png`), `exit finished=true` immediately. Scales restored to 1 after.

### Cross-platform notes

- **Event ordering (the open question), answered identically on both platforms:** a transition that is
  cut short emits its phase event with `finished=false interrupted=true` at the interrupt edge, *before*
  the retargeted phase later emits `finished=true interrupted=false`. Settled transitions emit exactly
  one `finished=true interrupted=false`. No spurious or dropped events were observed.
- **`onTransitionEnd` payload remap holds:** the public `onTransitionEnd` fires on both platforms; the
  native `onFx` prefix never surfaced in JS.
- **Harness-only defect (not the implementation under test):** the example screen's log list keys lines
  by `id: lines.length` then slices to 8, so past 8 entries the keys collide and React raises an
  "Encountered two children with the same key" LogBox warning (seen on both platforms). It lives in
  `example/screens/presence.tsx`, does not affect the FxPresence handshake, and was left unmodified
  (out of scope for this gate).
- **Provisional catalog values** (`transient` shape/timing) are device-pending with MOT-001 / U7-002 —
  this gate proves the handshake, not the magnitudes.
