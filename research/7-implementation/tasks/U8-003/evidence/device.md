# U8-003 — device verification scenario (for the maintainer)

The fix is a pure-Kotlin rendering-path change, but the bug it removes is a **device-only**
native abort (AGSL's API-33 error path → CheckJNI SIGABRT). Headless proves the code compiles
and that the scan returns the right flags by reading the source; only a physical device proves
the mount no longer aborts. Run this on **two** physical Android devices — **API 33** (the
`minSdk` floor for `RuntimeShader`, where U8-002 crashed 5/5) and **API 35** (U8-001's original
gate). The crash was API-version-specific, so both floors must be exercised.

## Headless scan result (read from the AGSL fixtures, not run on device)

The scan matches a `uniform <type> <name>;` declaration in the loaded AGSL source:

- `aurora.agsl` declares `time` / `resolution` / `intensity` only → **`supportsPressDepthUniform = false`, `supportsTouchUniform = false`** → `onDraw` writes neither interactive uniform.
- `dots.agsl` declares `uniform float pressDepth;` and `uniform vec2 touch;` (and uses both) → **`supportsPressDepthUniform = true`, `supportsTouchUniform = true`** → `onDraw` writes both.

`dots`'s local `vec2 touchPoint` is an in-body use, not a `uniform` declaration, and the
word-boundary guard keeps it from satisfying the `touch` scan.

## Steps — run on API 33 AND API 35

1. **Mount crash-free (the blocker is gone).** Launch the example app and open the
   **coexistence** screen (`example/screens/coexistence.tsx`). On API 33 this killed the
   process with a native SIGABRT on mount, 5/5, before any gesture.
   - **PASS:** the screen mounts and stays up; the matrix containers and the semantic-press
     log render. No process death, no SIGABRT in `logcat`.

2. **Interactive-write regression — `dots` still responds, `aurora` is silent and stable.**
   - Press-and-hold on an `active`-mode `dots` surface: the bulge/press response is visible
     (the `pressDepth`/`touch` uniforms are still being written per frame). **PASS** =
     visible press response.
   - A non-interactive `aurora` surface renders its ribbons normally and never crashes.
     **PASS** = aurora animates, no abort, no press artifacts.

3. **U8-002 Android matrix is now reachable (smoke).** With the screen mounted, confirm the
   five matrix rows (native ScrollView, pager-view, bottom-sheet, RNGH `GestureDetector(Pan)`,
   nested) can be exercised — i.e. the full U8-002 Android matrix run can proceed. This task
   proves only that the crash is fixed so that gate can run; the full matrix **scoring** stays
   U8-002's gate, not this task's.

## What this does NOT cover

- The full U8-002 Android gesture-coexistence matrix scoring (that re-runs under U8-002, and
  RT-001 closes there, not here).
- iOS — untouched by this task (Metal uploads a fixed `FxUniforms` struct via `setFragmentBytes`
  with no name lookup, so it cannot hit this path).

On a PASS on both API levels, hand back to the planner: pin is already in
`structure.android.md`; the planner writes `reviews/U8-003.md`, ticks through merged, and
U8-002's Android matrix re-runs.

---

## Run results — agent-device runner, 2026-06-13 (API 35 only; **API 33 UNAVAILABLE**)

### ⚠️ The mandatory API-33 leg could not be run — flag for the maintainer

The crash repro device — the POCO F1 (beryllium) that SIGABRT'd 5/5 in the U8-002 run — has
since been **re-flashed to LineageOS 22 / Android 15 / API 35** (`ro.build.version.sdk=35`,
`ro.build.version.release=15`). It is no longer the API-33 device the U8-002 tombstone was
captured on. No other API-33 surface is available on this machine: the only emulator AVD is
API 36 (Pixel_8), and only `android-34` / `android-36` system images are installed — no
`android-33`.

Consequence: **the load-bearing crash-resolution proof (mount crash-free on API 33, the exact
floor where it aborted) was not obtained this session.** API 35 cannot stand in for it —
U8-001 already gated API 35 with the *old* exception-probe and it did **not** abort there
(the probe "happened not to abort" on 35). So an API-35 mount-success is consistent with the
fix but does **not** isolate it: the pre-fix build also mounted on API 35. What the API-35 run
below proves is **regression-safety** (the source-scan rewrite did not break the working
API-35 path and renders the formerly-crashing `aurora`/scan→false path cleanly), **not**
crash-resolution. **The API-33 mount must still be run by the maintainer on a physical
API-33 device (or an API-33 AVD) before this gate can pass.**

### Build / install (API 35)

- `bun install` → ok. `npx expo run:android` → **BUILD SUCCESSFUL** (`:app:assembleDebug`),
  APK installed on POCO F1, dev client opened against Metro. The rewritten library Kotlin
  compiled into the fresh build.
- The known `libworklets.so` ninja hiccup did **not** occur — the `.cxx` caches were already
  coherent from the prior run, so no cache clear was needed.

### Step 1 — mount crash-free (API 35): **5/5 PASS**

Opened the coexistence screen (Tasks → U8-002) five times (open → confirm mount → back), the
same count the prior run crashed 5/5. Every open mounted: the semantic-press-log panel and all
matrix sections rendered; the `aurora` shader surfaces drew visibly (animated bands — note
Android draws them, unlike the iOS sim). Evidence:

- `mount-cycle1-api35.png` … `mount-cycle5-api35.png` — the mounted screen each cycle.
- `mount-logcat-api35.txt` — logcat buffer cleared immediately before the cycles; grep for
  `JniAbort|SIGABRT|nativeUpdateUniforms|unable to find uniform|FATAL EXCEPTION|signal 6`
  across the whole capture → **0 matches**.
- App pid stable at **8454** across all five cycles (no crash + restart).

This is the exact path that aborted on API 33: the harness shader is `aurora` (decorative —
declares no `pressDepth`/`touch`), so every surface exercises the scan→false branch that the
old probe walked into `setFloatUniform("pressDepth", …)` and the API-33 CheckJNI abort. On
API 35 it now mounts and renders clean (as it also would have pre-fix — see the caveat above).

### Step 2 — interactive-write regression

- **`aurora` (scan→false): PASS on device.** Renders its ribbons, no crash, no press artifacts
  — the surfaces in the coexistence harness are all `aurora`, proven above.
- **`dots` (scan→true) write path: NOT exercised on device — headless-only; flag.** No example
  screen renders `dots` in `active` (interactive `expo-view`) mode. `coexistence.tsx` uses
  `SHADER = "aurora"` for every surface; `shader-catalog.tsx` renders `dots` via `FxHostedView`
  (the hosted/decorative path — no `interactionMode`, no press handler), so it never writes
  `pressDepth`/`touch`. The scan→true branch (both flags set → `onDraw` writes both uniforms)
  is verified at **headless** only (the scan matches `uniform float pressDepth;` +
  `uniform vec2 touch;` in `dots.agsl`). Per the task instruction this was **not fabricated**;
  the maintainer decides whether a `dots`-active example harness is wanted to prove the write
  path on a device.

### Step 3 — U8-002 Android matrix reachable: confirmed

With the screen mounting, the full U8-002 Android matrix was run this session (see
`../U8-002/evidence/device.md`). The rows are now reachable; 9/13 cleared automatically, the
rest are gesture-fidelity needs-manual.

### Verdict (API 35 leg)

- API 35: mount **5/5 crash-free**, `aurora`/scan→false renders clean, no abort — **regression-safe**.
- API 33 (mandatory): see the API-33 AVD run below — **now covered**.
- `dots`-active write path: see the API-33 run below.

---

## Run results — agent-device runner, 2026-06-13 (the mandatory **API 33** leg, on an AVD)

### The repro is now reachable on an API-33 AVD built this session

No physical API-33 device exists on this machine (the repro POCO F1 was re-flashed to API 35),
so this leg was run on a fresh API-33 AVD built for the purpose: `system-images;android-33;
google_apis;arm64-v8a` (AVD `fx_api33`, Android 13 / API 33). **Architecture note:** the task
suggested `x86_64`, but this is an Apple-silicon (arm64) host where x86_64 emulation does not run
usably; `arm64-v8a` is the faithful choice — the binding constraints (API 33 + a hardware GPU so
AGSL/`RuntimeShader` actually runs) are both met. The AVD was created with `hw.gpu.mode=host`.

**Sanity — AGSL runs on this AVD:** with the fix, the coexistence screen renders the `aurora`
surfaces (animated bands) — `api33-sanity-aurora.png`. An AVD that could not run AGSL would
prove nothing; this one does.

### Phase 2 — the AVD is a FAITHFUL repro (fix reverted → it crashes with the exact signature)

The fix was reverted in the working tree (`git stash` of `FxSurfaceShaderView.kt`, restoring the
old `probeInteractiveUniforms`/`supportsFloatUniform` exception-probe — verified by `grep`), the
buggy build was put on the AVD, and the coexistence screen was opened. **The process died on
mount with a native SIGABRT**, the exact tombstone signature as the physical POCO F1:

```
JNI DETECTED ERROR IN APPLICATION: input is not valid Modified UTF-8: illegal start byte 0xbb
    string: 'unable to find uniform named  <0xbb> ...'
    in call to NewStringUTF
    from void android.graphics.RuntimeShader.nativeUpdateUniforms(...)
```

Chain: `RuntimeShader.setFloatUniform` → `nativeUpdateUniforms` → `UpdateFloatUniforms` (libhwui)
→ `ThrowIAEFmt` → `jniThrowExceptionFmt` → `CheckJNI::NewStringUTF` → `JniAbort` → `abort` →
**signal 6 (Aborted)**. The `Abort message` even captures the garbage input bytes the platform
builds into the "unable to find uniform named …" string. Full capture: `api33-crash-logcat.txt`;
drop-to-launcher: `api33-crash-drop-to-launcher.png`. **Only because the AVD reproduces the crash
does a crash-free mount with the fix mean anything.** The fix was then restored (`git stash pop`)
and hard-verified present (`scanInteractiveUniforms` back, the probe gone, stash empty) before
the with-fix build.

### Phase 3(a) — fix mount **5/5 crash-free** on API 33 (the load-bearing proof)

With the fix rebuilt onto the AVD (`:react-native-fx:compileDebugKotlin` recompiled fresh,
BUILD SUCCESSFUL), the coexistence screen was opened five times (open → confirm mount → back):

- **5/5 mounted.** The bottom-sheet content + matrix sections rendered each cycle
  (`api33-mount-cycle1.png` … `api33-mount-cycle5.png`).
- App pid **stable across all five cycles** (no crash + restart).
- `logcat -b main/system/crash -d` over the whole run, grep
  `JniAbort|JNI DETECTED ERROR|nativeUpdateUniforms|unable to find uniform|signal 6 (Aborted)|SIGABRT|FATAL EXCEPTION`
  → **0 matches** (`api33-mount-fix-logcat.txt`). This is the path that aborted on API 33 pre-fix;
  it now mounts and renders clean. **This is the API-33 crash-resolution proof U8-003 was owed.**

### Phase 3(b) — interactive-write regression on API 33

- **`aurora` (scan→false): PASS.** Renders bands, no writes, no crash, no press artifacts —
  proven across the 5 mount cycles and all the gesture interaction below.
- **`dots` (scan→true) write path: exercised crash-free, but the *visible bulge* is not
  observable in this harness — see the nesting finding.** The harness's only `dots` surface is
  the nested INNER (the Phase-0 edit). It is a `scan→true` surface: it mounts and runs its frame
  loop every cycle, so `onDraw` issues `setFloatUniform("pressDepth", …)` / `setFloatUniform("touch", …)`
  **per frame** (the guarded writes fire because both flags are set for `dots`), and the app never
  crashes. That per-frame write executing crash-free is the device evidence that the scan→true
  branch is **safe** (a wrong/absent uniform name would CheckJNI-abort exactly as Phase 2 shows).
  The *value-change bulge* on press could not be captured because the nested INNER is both
  occluded by and touch-shadowed by its OUTER (next section).

### Phase 3(c) — row-7 nesting (inner=`dots`, outer=`aurora`) — observed, not decided

The Phase-0 edit set the nested INNER to `dots` to make nesting readable. Two findings, recorded
(the nesting policy is observed here, not decided):

1. **The inner `dots` is not visibly present — it is occluded by the outer's shader.** The
   nested surface renders as full-width `aurora` bands with no `dots` grid anywhere
   (`api33-nested-section.png`, zoom `api33-nested-zoom-occluded.png`). Root cause, read from
   source: `FxSurfaceView` adds its content container in `init`, then `ensureEffectSurfaceView`
   adds the effect (shader) view with `super.addView(view)` — i.e. **above** the content
   container. So the OUTER's `aurora` paints over its own children, including the nested INNER.
   The served JS bundle does carry `shader: "dots"` on the inner (confirmed by grepping the Metro
   bundle), so this is a native compositing consequence, not a JS/bundle miss.
2. **The OUTER claims the touch; the INNER never logs.** A press-and-hold at the inner's
   geometric centre logged `nested·OUTER PressIn → PressOut` (local ~190,1xx), no bulge, no crash
   (`api33-nested-press-log.png`, video `api33-nested-press.mp4`). A tap on the outer ring
   (far-left strip, local x=3) logged a clean `nested·OUTER PressIn → PressOut → Press`
   (`api33-nested-outer-tap-log.png`). **`nested·INNER` never logged in any interaction.**

So with inner=`dots` the runbook precondition "confirm the inner surface is visibly present"
**still cannot be met** — not because both are `aurora` (the prior reason), but because the
outer's shader occludes the inner and the outer's recognizer claims the touches. Row 7 stays
**observed-but-inconclusive for INNER independent presence**, now with a concrete root cause for
the maintainer/planner to weigh (a shader-bearing surface nested inside another is occluded +
touch-shadowed by the outer). No crash at any point — pid stable throughout.

### Verdict (API 33 leg)

- **API 33 mount with the fix: 5/5 crash-free, 0 abort signatures, pid stable — PASS.** The
  load-bearing crash-resolution proof on the exact floor that aborted is now obtained.
- **Repro validated:** the reverted/buggy build SIGABRTs on the same AVD with the exact physical
  tombstone signature, so the crash-free mount is meaningful.
- `aurora` (scan→false) renders clean and never crashes; `dots` (scan→true) writes per-frame
  crash-free (safe), but its visible press-bulge is not observable here because the only `dots`
  surface is the occluded + touch-shadowed nested INNER.
- Row 7 nesting: inner-region press → `nested·OUTER`; outer-ring tap → `nested·OUTER` (Press);
  `nested·INNER` never logs; inner not visibly distinct (occluded). Inconclusive per the runbook,
  with a concrete root cause recorded.

Maintainer sign-off (API 33 mount + accept API-35 regression): ____________________  Date: __________
