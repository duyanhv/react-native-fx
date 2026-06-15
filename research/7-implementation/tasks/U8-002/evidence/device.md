# U8-002 — device runbook (the RNGH coexistence matrix)

The maintainer's gate. Run every group on **both** platforms (physical Android required —
the cancel path is a real-touch behavior). Fill the PASS/FAIL cells and the sign-off at the
bottom. The planner closes RT-001 only on a both-platform PASS.

Harness: the **coexistence** screen (Tasks tab → U8-002). The fixed top panel is the
**semantic press log** (newest first, millisecond-stamped). The recognizer is frozen from
U8-001 — this run observes it, it does not change it.

## The one definition everything hangs on — the cancel path

> When an ancestor scroller / pager / RNGH pan claims the gesture, the native recognizer is
> **cancelled**: the effect springs back and **no `Press` fires**. In the log a clean cancel
> reads as **`PressIn` then `PressOut` with no `Press`**. A tap-that-succeeds reads
> `PressIn → PressOut → Press`.

iOS delivers `.cancelled`; Android delivers exactly one `ACTION_CANCEL`. The runbook can't
see the native callback name — it infers the cancel from *`PressOut` with no `Press`* plus
the ancestor visibly moving (scroll/page/sheet).

## Before you start — build + triage notes

- **Rebuild the dev client.** The four peers (gesture-handler, reanimated/worklets,
  pager-view, bottom-sheet) autolink natively — a JS reload is not enough. `expo prebuild`
  then `expo run:ios` / `expo run:android` (or an EAS dev build), and `expo start -c` once
  (Metro cache clear for the worklets Babel plugin).
- **Version-compat is a SEPARATE failure class.** If the dev client fails to build, or
  reanimated/worklets throws at launch, that is a peer-version problem (reanimated 4.3.1 /
  worklets 0.8.3 / SDK 56), **not** an RT-001 recognizer failure. Record it under "Build
  triage" below and stop — do not score it as a matrix FAIL.

## The matrix

Score each cell `PASS` / `FAIL` / `—`. "no Press" is the load-bearing assertion on the
cancel rows (1b, 2-swipe, 3-drag, 4-pan).

Run by an agent-device runner. **iOS** = iPhone 17 Pro simulator (SDK 56 dev client), scored
2026-06-13 from the on-screen semantic log (surfaces render no visible pixels on iOS — see
Recognizer-bug flags — so cells are log-derived, targeted by computed coordinates). **Android**
= physical POCO F1, scored 2026-06-13 **after the U8-003 crash fix** (footnote ⁴). The original
2026-06-13 Android run was BLOCKED at row 0 (the screen SIGABRT'd on mount — footnote ³, now
resolved by U8-003); the screen now mounts and all rows were reachable. **Caveat:** the POCO F1
has since been re-flashed from the prior run's LineageOS / Android 13 / API 33 to **Android 15 /
API 35**, so the Android cells below are scored on **API 35, not the API-33 floor**. The cancel
recognizer behaves identically across API levels, but the U8-003 *crash*-fix still owes a
mount proof on a physical API-33 device — see `../U8-003/evidence/device.md`.

| # | Group | Action | Expected (log + visible) | iOS | Android |
|---|---|---|---|---|---|
| 1a | native ScrollView | tap the surface | `PressIn → PressOut → Press`; no scroll | **PASS** | **PASS** ⁴ |
| 1b | native ScrollView | **press + horizontal drag** | scroll moves; `PressIn`/`PressOut`, **no `Press`** | **PASS** (cancel) | **PASS** (cancel) ⁴ |
| 1c | native ScrollView | press, hold still, release | `PressIn → PressOut → Press`; scroll never steals | — not run ¹ | **needs-manual** ⁵ |
| 1d | page (outer) ScrollView | press a surface + **vertical drag** the page | page scrolls; `PressIn`/`PressOut`, **no `Press`** | — not run ¹ | **PASS** (cancel) ⁴ |
| 2a | pager-view | still tap a page | `Press` | **PASS** | **PASS** ⁴ |
| 2b | pager-view | press + **horizontal swipe** | page changes; `PressIn`/`PressOut`, **no `Press`** | **PASS** (cancel ✓; page-advance unconfirmed ²) | **needs-manual** ⁶ |
| 3a | @gorhom sheet | **expand sheet to 55% first**, then drag the sheet up *from its content surface* | sheet moves; `PressIn`/`PressOut`, **no `Press`** (RNGH-pan cancels cleanly — the hard case) | — not run ¹ | **PASS** (cancel) ⁴ |
| 3b | @gorhom sheet | tap the content surface, no drag | `Press`; sheet still | — not run ¹ | **PASS** ⁴ |
| 4 | RNGH `Pan` | press + **drag horizontally** | `rngh-pan · ACTIVATED` logs, then surface `PressOut` with **no `Press`** | — not run ¹ | **needs-manual** ⁷ |
| 4-tap | RNGH `Pan` | still tap | `Press` (no `ACTIVATED`) | — not run ¹ | **PASS** ⁴ |
| 5 | passive in ScrollView | drag across the surface | scroll works; the pointer light follows the finger; **log stays silent** (no semantics) | **PASS** (silent) | **PASS** (silent) ⁴ |
| 6 | controlled in ScrollView | tap and drag the surface | scroller owns it; **log stays silent** (zero double-handling) | **PASS** (silent) | **PASS** (silent) ⁴ |
| 7 | nested surfaces | **first: confirm the inner surface is visibly present**, then tap inner; then tap the outer ring | record exactly which labels log — `nested·INNER` alone, or `nested·OUTER` too | — inconclusive ¹ | **inconclusive** ⁸ |

**⁴ Android run — agent-device, POCO F1, Android 15 / API 35, 2026-06-13** (after the U8-003
crash fix; the device was re-flashed from the API-33 LineageOS of the prior run — see
`../U8-003/evidence/device.md` for the API-33 unavailability flag). Scored from the on-screen
semantic-press log (surfaces are not in the accessibility tree, so surfaces were targeted by
coordinate and the log — which reports each surface's label — was read visually per gesture).
The cancel rows used `agent-device gesture pan` (a press-then-drag that posts `PressIn` on
touch-down, then cancels when the ancestor claims). **The cancel path is demonstrated on three
independent Android ancestors: 1b (inner horizontal ScrollView), 1d (outer vertical ScrollView),
and 3a (the @gorhom/bottom-sheet RNGH pan — the hard case)** — `PressIn → PressOut` with no
`Press` each, ancestor visibly moving. Success taps (1a/2a/3b/4-tap) all logged a clean
`PressIn → PressOut → Press`; silence rows (5/6) stayed silent. Screenshots:
`screenshots/row*-android.png`. The build dropped a large number of frames (debug build + Metro
+ seven animated shader surfaces on a 2018 device) — a perf-of-the-harness observation, not a
recognizer result.

**⁵ 1c needs-manual.** `agent-device longpress` could not reproduce a faithful "press, hold
still, release": the first attempt drifted (local y → −14, above the surface top) and the outer
scroll claimed it (cancel); two retries registered nothing. A plain tap (1a) fires `Press`
cleanly, so the success path is proven — but 1c's specific "a held press is not stolen by the
scroller" assertion needs a human finger.

**⁶ 2b needs-manual.** `gesture pan` (fast and slow) on the pager surface never posted a
`PressIn` — the `react-native-pager-view` recognizer claims the horizontal gesture before the
fx surface's press FSM engages, so the literal `PressIn → PressOut`/no-`Press` cancel signature
could not be captured (and page-advance is unconfirmed). The surface does stay **silent** under
the swipe (no spurious `Press` — no double-handling), which is consistent with correct
coexistence, but the cancel signature itself needs a human press-then-swipe. (The cancel
mechanism is independently proven by 1b/1d/3a.)

**⁷ 4 needs-manual.** Two horizontal `gesture pan`s on the RNGH-`Pan` surface produced the
surface cancel (`rngh-pan · PressIn → PressOut`, no `Press`) but **never logged
`rngh-pan · ACTIVATED`** — the runbook's required proof that the *RNGH pan* (not the surface's
own slop-yield) claimed. The `ACTIVATED` line is emitted via `runOnJS` from the pan's `onStart`;
under the session's severe frame loss (4000+ dropped) that callback appears to drop, or the
synthetic pan did not cross the RNGH activation threshold. Either way the RNGH-pan claim is not
confirmed by the tool, so the row is left for a human finger. **The "RNGH pan claims and the
surface cancels" behavior is independently demonstrated by 3a** (the bottom sheet's RNGH pan).

**⁸ 7 inconclusive.** A center tap inside the inner surface's geometric bounds
(`nestedInset` margin 48/32, inner `fillSurface` 110 tall, centered in the 200-tall outer)
logged **`nested·OUTER` only** — `nested·INNER` never logged in this session. Because both
surfaces render the same `aurora` shader they are visually identical, so the runbook's
precondition ("confirm the inner surface is visibly present") cannot be met and INNER's
independent presence cannot be confirmed. Recorded functional observation: **the OUTER active
surface claims center taps; no INNER semantic event was seen.** Per the runbook's own rule this
stays inconclusive (the nesting policy is observed, not decided).

**⁸ᵃ Row 7 re-observed on API 33 with inner=`dots` (agent-device, AVD `fx_api33`, Android 13 /
API 33, 2026-06-13).** A one-line example tweak set the nested INNER's `shader` to `dots`
(distinct from the outer `aurora`) to make nesting readable; see `../U8-003/evidence/device.md`.
Result, recorded (policy observed, not decided): **the inner `dots` is still not visibly present
— it is occluded by the outer's shader.** The nested surface renders as full-width `aurora`
bands, no `dots` grid (`screenshots/row7-api33-inner-occluded.png`). Root cause from source:
`FxSurfaceView` adds the effect/shader view *above* its content container (`ensureEffectSurfaceView`
→ `super.addView`), so the OUTER's shader paints over its own children, including the INNER. The
Metro bundle does carry `shader: "dots"` on the inner, so this is native compositing, not a JS
miss. Touch: a press-hold at the inner centre → `nested·OUTER PressIn → PressOut` (local ~190,1xx;
`screenshots/row7-api33-inner-press.png`); an outer-ring tap (local x=3) → clean
`nested·OUTER PressIn → PressOut → Press` (`screenshots/row7-api33-outer-tap.png`).
**`nested·INNER` never logged.** So the precondition "confirm the inner is visibly present" still
cannot be met — now because the outer occludes + touch-shadows the inner, not because both are
`aurora`. **Row 7 stays inconclusive for INNER independent presence**, with this concrete root
cause now on record. No crash at any point (pid stable). **dots-write note:** the nested INNER is
a `scan→true` surface — it mounts and runs its frame loop, so `onDraw` writes
`pressDepth`/`touch` per frame, crash-free (the scan→true branch is device-safe; a bad uniform
name would CheckJNI-abort, as the U8-003 Phase-2 revert shows). The *visible* press-bulge is not
observable here because the only `dots` surface is the occluded + touch-shadowed nested INNER.

**¹ iOS rows not run / inconclusive.** The shader surfaces draw no visible pixels on iOS
(interactive but invisible — see Recognizer-bug flags), so the pager/sheet/RNGH/nested
surfaces could only be targeted blind by computed coordinate, and the page-scroll picks up
stray vertical drift from coordinate pans. To honor the gesture-fidelity rule (no faked
PASS), these rows are **left for the maintainer to run by hand** at the mandatory re-gate.
Row 7 is **inconclusive** per the runbook's own rule (the inner surface is not *visibly*
present, so the nesting outcome must not be guessed). The cancel path is already demonstrated
on iOS by 1b (native scroller) and 2b (pager) — two independent ancestors cancelling cleanly.

**² 2b page-advance.** The swipe cancelled cleanly (`pager·0 PressIn → PressOut`, no `Press`),
but a follow-up tap still logged `pager·0`, so the page may have rubber-banded; page-advance
is unconfirmed (invisible surfaces give no visual). The **cancel** — the load-bearing half —
is solid.

**³ Android — every row BLOCKED (original run; RESOLVED by U8-003).** In the first 2026-06-13
Android run, opening the coexistence screen crashed the app process (drop to launcher) on mount,
5/5, before any gesture — a `packages/` native AGSL fault (the `probeInteractiveUniforms`
exception-probe → API-33 CheckJNI abort). U8-003 replaced the probe with a source-declaration
scan; the screen now mounts crash-free (5/5 on API 35, footnote ⁴ + `../U8-003/evidence/`), so
the matrix could run. The Android cells above are the re-run results. (The API-33 *mount* proof
itself is still owed — the repro device is now API 35; see `../U8-003/evidence/device.md`.)

### Per-row disambiguation notes

- **1b vs 1d** — group 1's surface lives in a *horizontal* inner ScrollView, and the whole
  page is a *vertical* ScrollView. 1b tests the inner (horizontal) scroller; 1d tests the
  outer (vertical) one. Both must cancel.
- **Row 4** must be a **horizontal** drag. The pan is omnidirectional but sits inside the
  vertical page scroll; a vertical drag is ambiguous. The `rngh-pan · ACTIVATED` line is the
  proof the *RNGH pan* (not the outer scroll) claimed — if it doesn't fire, you dragged into
  the outer scroller; retry horizontally.
- **Row 7 is inconclusive if the inner surface doesn't render.** An `active` shader-bearing
  surface wrapping a child surface is an unproven combination. If the inner is not visibly
  present, mark row 7 `—` and note it — the nesting policy then needs a follow-up harness
  (e.g. two overlapping siblings), not a guess.
- **passive (5) / controlled (6)** — the assertion is *silence*. The handlers are wired, so
  an empty log is a positive result, not missing instrumentation.

## Build triage (version-compat — fill only if the build/launch fails)

The peer set is **not** the problem — both dev clients built and both launched clean. The
gesture peers load natively without error (logcat: `libreanimated.so`/`libgesturehandler.so`
load OK, `JSI interop installed`, `Initialize gesture handler for root view`). The Tasks list
and a sibling screen (presence) run fine; only the coexistence screen crashes (Android), and
that crash is a `packages/` AGSL fault, not a peer/version fault — see Recognizer-bug flags.

- Dev client builds: iOS ☑  Android ☑
- App launches without a reanimated/worklets runtime error: iOS ☑  Android ☑ (launch is clean;
  the crash is later, on coexistence-screen mount, and is not reanimated/worklets)
- If either fails — symptom + the peer involved: **n/a — no peer/version failure.**

Build note (not a failure, recorded for the maintainer's re-run): the first Android
`expo run:android` failed with `ninja: error: '…/react-native-worklets/…/libworklets.so' …
missing and no known rule to make it` — a **stale CMake `.cxx` cache** in `node_modules`
(worklets rotates its build hash via `finalizedBy(cleanCMakeCache)`, orphaning
expo-modules-core's cached reference; `expo prebuild --clean` does not touch `node_modules`).
Fixed by deleting the stale caches and rebuilding coherently:
`rm -rf node_modules/{expo-modules-core,react-native-worklets}/android/{.cxx,build}
android/app/{.cxx,build}` then `expo run:android`. Second build succeeded. Not a version bump.

## Recognizer-bug flags (fill only if a row fails for a reason internal to the recognizer)

A row that fails because the recognizer behaves wrongly (e.g. it claims movement, or never
cancels) is a **U8-001 rework**, not a harness fix. Record it here; do not patch `packages/`
inside this task.

### FLAG 1 — Android: coexistence screen crashes the app process on mount (native AGSL fault in `packages/`)

**Severity: blocker (Android matrix cannot run). Reproducible 5/5. Not patched (U8-001 is frozen).**

Opening the coexistence screen on the POCO F1 kills the app process (drops to launcher) before
any gesture. No Java `FATAL`/RedBox — it is a **native SIGABRT** (CheckJNI hard-abort, which is
why a JS RedBox never appears). Full tombstone: `evidence/android-crash-tombstone.txt`.

Abort message:
```
JNI DETECTED ERROR IN APPLICATION: input is not valid Modified UTF-8: illegal continuation byte 0xcb
  string:  'unable to find uniform named \20|\333\313\177'
  in call to NewStringUTF
  from void android.graphics.RuntimeShader.nativeUpdateUniforms(long, String, float, float, float, float, int)
```

Crash chain (native frames, top-down):
```
FxSurfaceView.applyResolvedConfig
  → FxSurfaceView.updateEffectSurfaceVisibility
    → FxSurfaceShaderView.setShaderId
      → FxSurfaceShaderView.probeInteractiveUniforms
        → FxSurfaceShaderView.supportsFloatUniform
          → android.graphics.RuntimeShader.setFloatUniform(<garbage name>, …)
            → nativeUpdateUniforms → NewStringUTF(invalid UTF-8) → ART JniAbort → SIGABRT
```

Diagnosis (for the U8-001 owner — not fixed here): `probeInteractiveUniforms` tests whether an
interactive uniform exists by calling `supportsFloatUniform`, which calls
`RuntimeShader.setFloatUniform(name, …)` and relies on the thrown
`IllegalArgumentException("unable to find uniform named <name>")`. When the uniform is absent,
AGSL constructs that message by passing the **name** to `NewStringUTF` — and the name handed in
is corrupt bytes (`… 0x10 0x7c 0xdb 0xcb 0x7f`), not valid Modified UTF-8, so the debug-build
CheckJNI aborts the whole process instead of throwing a catchable exception. Two latent defects:
(a) a corrupt/uninitialised uniform-name string is reaching `setFloatUniform`, and (b) probing
uniform existence via catch-the-exception is unsafe on AGSL (a missing uniform builds an
exception message embedding the name). The coexistence screen is simply the first to mount
`active`-mode shader surfaces at scale, so it is the first to exercise this path.

Nuance the maintainer needs: CheckJNI is **on in debug builds only**. A release build would not
hard-abort on `NewStringUTF`, but the underlying corrupt-name / exception-probe bug is real and
must be fixed regardless (at minimum it throws/logs per surface; the corrupt name points to a
genuine memory/logic fault). iOS (Metal, no `RuntimeShader`) does not hit this path and runs fine.

**This is a U8-001 rework.** RT-001 cannot close until it is fixed and the Android matrix re-runs.

### Observation (not a recognizer bug) — iOS shader surfaces draw no visible pixels

On iOS every `FxSurfaceView shader="aurora"` surface is **interactive but invisible** (press
events fire correctly; no shader output is drawn — the surfaces read as blank/grey). This did
not block the iOS interaction rows (scored from the log) but it made blind-coordinate targeting
of the pager/sheet/RNGH/nested surfaces unreliable and makes row 7's "confirm inner is visibly
present" impossible. Likely a separate rendering issue (shader not drawing on the iOS Metal
path in this build), worth a maintainer look but **out of scope for RT-001** — flagged, not
diagnosed here.

## Results

- iOS device / OS: iPhone 17 Pro simulator, iOS 26 (SDK 56 dev client)
- Android device / OS: physical POCO F1 (beryllium), now LineageOS 22 / **Android 15 / API 35**
  (re-flashed from the prior run's Android 13 / API 33)
- Cancel path (1b/1d/2b/3a/4) holds: **Android ☑ on three ancestors** — 1b (inner h-scroll),
  1d (outer v-scroll), **3a (@gorhom RNGH-pan hard case)** all cancel cleanly; 2b/4 needs-manual
  (tool can't post `PressIn`/capture `ACTIVATED`, mechanism proven by 1b/1d/3a). iOS partial
  (1b ✓, 2b cancel ✓; 1d/3a/4 needs-manual).
- @gorhom hard case (3a) cancels cleanly: ☑ **Android PASS** (sheet's RNGH pan claims, surface
  `PressIn → PressOut` no `Press`, sheet visibly moves); iOS not run (needs manual)
- pager claim (2b) cancels + changes page: Android **needs-manual** (pager claims before
  `PressIn`; surface stays silent — no double-handling); iOS ☑ cancel / ☐ page-change unconfirmed
- passive/controlled silent (5/6): ☑ **Android PASS** (both silent); ☑ **iOS PASS** (both silent)
- nesting outcome (7) observed: INNER-only ☐ / both ☐ / **inconclusive ☑** (Android: center tap →
  `nested·OUTER` only, INNER never logged, but both `aurora` so INNER presence unconfirmable; iOS
  surfaces invisible)
- Android tally: **9 PASS** (1a, 1b, 1d, 2a, 3a, 3b, 4-tap, 5, 6) · **3 needs-manual** (1c, 2b, 4)
  · **1 inconclusive** (7)
- Overall: PASS ☐ / **PASS-with-waivers ☑ (Android matrix substantially cleared — cancel path
  proven on 3 ancestors incl. the hard case; 4 rows need a human finger or an API-33/dots harness)**
  / FAIL ☐. **Not closing RT-001** — owed: the 3 needs-manual + 1 inconclusive Android rows by
  hand, the iOS remainder on a physical iPhone, and the U8-003 API-33 *mount* proof.

### Runner summary (agent-device, 2026-06-13)

- **Android: hard-blocked.** The coexistence screen crashes the process on mount — a `packages/`
  native AGSL fault (`FxSurfaceShaderView.probeInteractiveUniforms` → `RuntimeShader` JNI abort).
  See Recognizer-bug flags FLAG 1 + `android-crash-tombstone.txt`. **U8-001 rework required.**
- **iOS: harness functional, cancel path demonstrated.** 6 rows scored from the live log:
  1a tap → `Press` ✓; 1b h-drag → cancel ✓; 2a pager tap → `Press` ✓; 2b pager swipe → cancel ✓;
  5 passive → silent ✓; 6 controlled → silent ✓. Remaining iOS rows left for manual re-gate
  (invisible surfaces; see footnote ¹). Screenshots: `evidence/screenshots/row*-ios.png`,
  `ios-coex-rendered.png`; Android crash: `android-crash-to-launcher.png`.
- **Dev clients built + installed on both devices** and left in place (`example/ios`,
  `example/android` regenerated via `expo prebuild --clean`) for the maintainer's hand re-run.
- **RT-001 not closed.** Matrix incomplete; re-gate both platforms after the U8-001 Android fix.

### Android re-run summary (agent-device, 2026-06-13, after U8-003)

- **Android matrix now runs.** The U8-003 crash fix lets the coexistence screen mount; the full
  matrix was exercised on the POCO F1 (now **API 35** — the repro device was re-flashed off
  API 33; the U8-003 *crash* proof on API 33 is still owed, see `../U8-003/evidence/device.md`).
- **9/13 cleared automatically.** Cancel path proven on **three** independent ancestors —
  1b inner horizontal ScrollView, 1d outer vertical ScrollView, **3a @gorhom/bottom-sheet RNGH
  pan (the hard case)** — each `PressIn → PressOut`, no `Press`, ancestor visibly moving. Success
  taps 1a/2a/3b/4-tap → clean `Press`; silence rows 5/6 → silent. The load-bearing cancel
  assertion holds on Android, including the RNGH-pan hard case (which iOS left needs-manual).
- **4 rows left for the maintainer's hand:** 1c (longpress can't hold still — drifts/no-register),
  2b (pager claims before `PressIn`; surface stays silent but no captured cancel signature),
  4 (`rngh-pan · ACTIVATED` never logged under severe frame loss — surface-cancel seen, RNGH-pan
  claim unconfirmed; mechanism proven by 3a), 7 (center tap → `nested·OUTER` only; both `aurora`
  so INNER presence unconfirmable — inconclusive per the runbook).
- **Method:** surfaces are not in the AX tree, so each surface was targeted by coordinate and the
  semantic-press log (which labels each surface) was read from per-gesture screenshots
  (`screenshots/row*-android.png`). `gesture pan` reliably posts `PressIn` then cancels for
  scroller ancestors (1b/1d/3a); it does **not** post `PressIn` for the pager (2b) and the
  `ACTIVATED` `runOnJS` log drops for RNGH-`Pan` (4) under the harness's heavy frame loss.
- **Build:** `npx expo run:android` → BUILD SUCCESSFUL, no `libworklets.so` ninja hiccup (`.cxx`
  caches already coherent). No `packages/` or `example/` source touched — device-runner only.
- **RT-001 still open.** Awaiting the 4 hand rows + iOS remainder on a physical iPhone + the
  U8-003 API-33 mount proof.

Maintainer sign-off: ____________________  Date: __________
