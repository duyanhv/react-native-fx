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

- **iOS** (device / OS): _pending_
- **Android** (device / OS): _pending_
