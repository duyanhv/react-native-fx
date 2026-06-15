# U8-003 — notes

## Unverified claims (need the device gate)

- The coexistence screen mounts crash-free on API 33 (and API 35) — the SIGABRT is gone. The
  scan is pure Kotlin and compiles; the abort is a device behavior, so the mount is the real
  proof. See `evidence/device.md`.
- `dots` still receives `pressDepth`/`touch` writes (press → visible response) and `aurora`
  renders with none — device-pending.

## Changed

- `packages/android/.../FxSurfaceShaderView.kt`:
  - Replaced `probeInteractiveUniforms()` (which called `setFloatUniform` for an absent uniform
    inside a try/catch on `IllegalArgumentException` — the API-33 CheckJNI abort) with
    `scanInteractiveUniforms(source: String?)`, which sets the two support flags from a
    source-declaration scan of the in-hand AGSL text.
  - Added `declaresUniform(source, name)` — matches a `uniform <type> <name>;` declaration via
    `\buniform\s+\w+\s+<name>\b`; the `uniform` keyword + word boundary guard against an in-body
    mention (e.g. `dots`'s local `touchPoint` does not satisfy a `touch` scan).
  - Deleted the `RuntimeShader.supportsFloatUniform` extension and the now-unused
    `import java.lang.IllegalArgumentException`. Grep confirmed no other caller.
  - `setShaderId`: hoisted `source` to a nullable `val` (read once, as before), built `shader`
    from it via `source?.let { RuntimeShader(it) }`, and passed `source` to the scan. `onDraw`,
    the frame loop, the flags' consumers, and the rest of `setShaderId` are unchanged — only how
    the two flags are computed changed.
- `research/5-realization/structure.android.md` §`shader`: pinned the mechanic — interactive-
  uniform support is read from the AGSL source declaration, never probed by a `setFloatUniform`
  write (which CheckJNI-aborts on API 33). Includes the AGSL-strips-only-unused-uniforms safety
  rationale and the declaration-vs-mention guard.

## Scope honored

- One source file touched + the structure.android.md pin. iOS untouched, press FSM /
  `FxPressHandler` untouched, no AGSL/manifest/example edits, no new uniforms.

## Gates (all green, 2026-06-13)

- packages: `bunx tsc --noEmit` clean · `bun run build` ok · `bun run lint` (27 files) clean ·
  `bun run swift:lint` clean · `bun run test` 58/58 pass.
- android (from `example/android`): `./gradlew :react-native-fx:compileDebugKotlin` — BUILD
  SUCCESSFUL, the rewritten file recompiled (task executed, not up-to-date).

Next: maintainer runs the device gate in `evidence/device.md` on API 33 + API 35; on PASS the planner writes `reviews/U8-003.md` and U8-002's Android matrix re-runs (RT-001 still closes at U8-002).

## Device run log — agent-device runner, 2026-06-13 (later same day, after headless)

- **⚠️ API 33 NOT run — flag.** The repro POCO F1 was re-flashed to **Android 15 / API 35**
  since the prior run (was API 33). No API-33 device/emulator/system-image on hand (AVD is
  API 36; images are android-34/36). The mandatory API-33 *mount* proof is **owed to the
  maintainer**. API 35 proves regression-safety only (the old probe also didn't abort on 35).
- **Rebuilt + ran on API 35.** `bun install`; `npx expo run:android` → BUILD SUCCESSFUL, APK
  installed, no `libworklets.so` ninja hiccup (caches coherent).
- **Mount 5/5 crash-free on API 35.** Opened coexistence 5× (open→confirm→back); mounts every
  time, app pid stable (8454), logcat (buffer cleared first) → **0** matches for
  `JniAbort|SIGABRT|nativeUpdateUniforms|unable to find uniform|FATAL`. Evidence:
  `evidence/mount-cycle{1..5}-api35.png`, `evidence/mount-logcat-api35.txt`.
- **aurora (scan→false) renders clean on device** — the exact path that aborted on API 33.
- **dots (scan→true) write path NOT exercised on device** — no example screen renders `dots`
  in `active` mode (coexistence uses `aurora`; shader-catalog uses `FxHostedView` decorative).
  Not fabricated; verified at headless (scan matches `dots.agsl` declarations). Flagged for the
  maintainer (a `dots`-active harness would prove the write path on a device).
- Touched only the regenerated native build output + the two evidence files + this log. No
  `packages/` or `example/` source change.

Next (unchanged): maintainer runs the **API-33** mount (the owed leg) + accepts the API-35 regression; on PASS the planner writes `reviews/U8-003.md`. Do NOT tick device-verified on API-35 alone.

## Device run log — agent-device runner, 2026-06-13 (API-33 AVD leg, the owed proof)

Ran the mandatory API-33 leg on a fresh AVD built this session (no physical API-33 device exists
on this machine). Device-runner role: owned no tick, closed no row.

- **AVD build.** Installed `system-images;android-33;google_apis;arm64-v8a` and created AVD
  `fx_api33` (Android 13 / API 33, `hw.gpu.mode=host`). **arm64-v8a, not x86_64** — this is an
  Apple-silicon host where x86_64 emulation does not run usably; the binding constraints (API 33
  + a hardware GPU so AGSL runs) are met by arm64. `npx expo run:android --device fx_api33` →
  BUILD SUCCESSFUL. Sanity: `aurora` renders on the AVD (`evidence/api33-sanity-aurora.png`), so
  the AVD can run AGSL/`RuntimeShader` — a precondition for the crash to be meaningful.
- **Phase 0 (example only).** Set the nested INNER `FxSurfaceView` `shader` to `dots` (one line,
  prop after the spread so it wins) in `example/screens/coexistence.tsx`; `bunx tsc --noEmit`
  green. Only example edit.
- **Phase 2 — repro validated.** `git stash`-ed `FxSurfaceShaderView.kt` (old probe back —
  grep-verified), rebuilt buggy onto the AVD, opened coexistence → **process died on mount with
  the exact physical tombstone**: `JNI DETECTED ERROR … not valid Modified UTF-8` /
  `unable to find uniform named <garbage>` / `NewStringUTF` / `nativeUpdateUniforms` / CheckJNI
  `JniAbort` / signal 6 (`evidence/api33-crash-logcat.txt`, `api33-crash-drop-to-launcher.png`).
  **Restored the fix immediately** (`git stash pop`) and hard-verified: `scanInteractiveUniforms`
  present, `probeInteractiveUniforms`/`supportsFloatUniform` gone, `git stash list` empty.
- **Phase 3(a) — the load-bearing proof.** Rebuilt with the fix (`:react-native-fx:compileDebugKotlin`
  recompiled fresh). Coexistence screen opened 5× (open→back): **5/5 mounted, pid stable, 0 abort
  signatures** in `logcat -b main/system/crash -d` (`evidence/api33-mount-cycle{1..5}.png`,
  `api33-mount-fix-logcat.txt`). **API-33 crash resolution is now proven on the floor that aborted.**
- **Phase 3(b)/(c) — dots + nesting.** The harness's only `dots` surface is the nested INNER.
  Finding: the inner `dots` is **occluded** by the outer's `aurora` shader (FxSurfaceView adds the
  effect view above its content container) and the **OUTER claims the touch** — a press-hold at the
  inner centre → `nested·OUTER` (no bulge, no crash); an outer-ring tap → `nested·OUTER Press`;
  `nested·INNER` never logs. The served bundle does carry `shader: "dots"` on the inner (grep of the
  Metro bundle), so this is native compositing, not a JS miss. The `dots` (scan→true) surface still
  mounts and writes `pressDepth`/`touch` per frame crash-free (write path device-safe); the visible
  bulge is not observable because the only `dots` surface is the occluded + touch-shadowed inner.
  Evidence: `api33-nested-section.png`, `api33-nested-zoom-occluded.png`, `api33-nested-press-log.png`,
  `api33-nested-press.mp4`, `api33-nested-outer-tap-log.png`.
- **Operational note.** A stale Metro (started before the Phase-0 edit) was restarted with
  `expo start -c` so the edit was served. The AVD process died once mid-run and was rebooted
  (cold boot) and the with-fix app reopened crash-free; the 5/5 mount proof predates that and is
  intact. The 4 `FATAL EXCEPTION` lines in logcat are agent-device's own multitouch instrumentation
  (`com.callstack.agentdevice.multitouchhelper`), **not** the fx app (which never crashed).
- **Working tree:** the U8-003 fix is **restored and present**; the Phase-0 one-line example tweak
  is in place; regenerated native build output. No other `packages/` change. Did NOT tick
  device-verified/reviewed/merged, did NOT change `progress.md`, did NOT close RT-001.

Maintainer sign-off: ____________________  Date: __________
