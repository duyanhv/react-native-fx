# DEF-009 — notes (executor, headless-done)

## Unverified claims (need the Android device gate)

- The ripple AGSL **visibly distorts** the wrapped RN content (amplitude `0.012 * intensity` may
  need tuning on device — the README sketch's value, kept as-is).
- A `Pressable`/`TouchableOpacity` inside the distorted content **still fires** (the load-bearing
  draw-time-touch-survives proof).
- The distortion **animates** (`time` advances on the Choreographer loop).
- The **per-frame refresh idiom**: this ships the conservative path — re-call
  `setRenderEffect(createRuntimeShaderEffect(...))` every frame. Whether `invalidate()` alone
  (re-attach once) suffices is the one framework unknown to confirm on device; if it does, the
  loop can relax to a single attach + `invalidate()`.
- The loop **pauses off-window/backgrounded** (wired through `pausePresentationLoop`/
  `resumePresentationLoop`; verify it actually stops the frame callback).
- **Below API 33** (or guarded path): content renders normally, no crash.
- **iOS**: silent no-op (prop accepted, nothing happens).

## What changed and why

- `packages/android/.../FxContentDistortion.kt` (new): the mechanic. Inline `RIPPLE_AGSL` sampler
  (`uniform shader content` + `resolution`/`time`/`intensity`, radial sine ripple, center direction
  guarded against a zero-vector normalize). Applies
  `target.setRenderEffect(RenderEffect.createRuntimeShaderEffect(shader, "content"))` to the content
  container; clears with `setRenderEffect(null)`. Choreographer loop advances `time` (mirrors
  `FxSurfaceShaderView`'s `baseTimeNanos`→`currentTime`); strength rides `intensity`. Uniform writes
  guarded by the `declaresUniform` source-scan (no `setFloatUniform` probe — the API-33 CheckJNI
  abort). Whole helper gated `>= TIRAMISU`; inert below 33.
- `packages/android/.../FxSurfaceView.kt`: `pendingContentDistortion` field + `setContentDistortion`
  setter; one `FxContentDistortion(intermediateContainer)` instance (targets the content container,
  not the Fabric-tracked outer view); `contentDistortion.update(...)` in `applyResolvedConfig`;
  `pause()`/`resume()` hooked into `pausePresentationLoop`/`resumePresentationLoop`.
- `packages/android/.../FxModule.kt`: `Prop("contentDistortion")` → `setContentDistortion`.
- `packages/ios/FxModule.swift`: `Prop("contentDistortion")` → `setContentDistortion`.
- `packages/ios/FxSurfaceView.swift`: empty `setContentDistortion(_:)` — accepts and ignores so the
  shared prop raises no "unsupported prop" noise (iOS out-of-scope, rule #4).
- `packages/src/runtime/FxSurfaceView.tsx`: `contentDistortion?: 'ripple'` on the native props;
  coerced `?? ''` (mirrors `shader`) so toggling off clears the native value rather than sticking.
- `packages/src/manifest/manifest.ts`: removed `status: 'planned'` from the Android `content-distort`
  rung → now selectable. iOS rung stays `out-of-scope`.
- `research/0-spine/02-capability-ir-and-lowering.md`: same flip in the worked-example code block.
- `packages/src/__tests__/manifest-select.test.ts`: replaced the two stale content-distort
  assertions (which asserted Android→none under `planned`) with: Android resolves the rung at
  `os:34` (`via:shader`, `applyVia:RenderEffect`, `substrate:expo-view`), degrades to `none` below
  33, and iOS stays `none` (out-of-scope). Generic planned-skip coverage stays on the synthetic
  node + symbol-android tests.
- `example/screens/content-distort.tsx` (new) + registered in `example/data/tasks.ts` (DEF-009 row,
  screen `content-distort`) and `example/app/(tasks)/[taskId].tsx`: ripple toggle, intensity slider,
  and two tappable counters inside the surface — the device-proof surface.

## Headless gates (all green)

- packages: `lint` clean (36 files) · `tsc --noEmit` exit 0 · `build` exit 0 · `swift:lint` clean ·
  `test` 73 passed / 5 suites (incl. the new content-distort `select()` conformance).
- Android (from `example/android`): `:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL ·
  `:app:assembleDebug` BUILD SUCCESSFUL.
- iOS: `pod install` complete · `xcodebuild ... reactnativefxexample` ** BUILD SUCCEEDED ** (no-op
  prop compiles).
- example: `tsc --noEmit` exit 0.

## Fix-round (executor, 2026-06-14, post-review)

- **Finding 1 (rule #1).** `FxSurfaceView.kt`: added an `onWindowFocusChanged` override that
  `super`s then calls `resumePresentationLoop()`/`pausePresentationLoop()` on focus gain/loss — the
  content-distort loop was only paused on attach/detach, so an attached-but-unfocused window
  (backgrounded, over a system dialog) left it running off-screen. Mirrors
  `FxSurfaceShaderView`'s own `onWindowFocusChanged`; idempotent with the effect surface's
  start/stop re-entry guards. `FxContentDistortion.kt` / `FxNativeView.kt` untouched.
- **Finding 2 (provenance).** `example/screens/content-distort.tsx`: stripped `(DEF-009)` from the
  header code comment; the id now lives in a rendered `<Text>content-distort · DEF-009</Text>`
  muted caption at the top of the screen, matching `presence.tsx`/`hosting-parity.tsx`.
- **Re-gate (green):** packages lint clean / tsc 0 / build 0 / swift:lint clean / 73 tests; example
  tsc 0; Android `:react-native-fx:compileDebugKotlin --rerun-tasks` (forced, not UP-TO-DATE) BUILD
  SUCCESSFUL + `:app:assembleDebug` BUILD SUCCESSFUL. iOS unchanged, not rebuilt.

## Rework (executor, 2026-06-15, post-device-gate)

- **Blocking defect (device-confirmed): ripple inert on initial mount and after navigating back.**
  `startLoop()` is gated on `target.isAttachedToWindow` (the `intermediateContainer` child). The
  parent `FxNativeView.onAttachedToWindow → resume()` fires *before* the child attaches — a
  ViewGroup dispatches its own `onAttachedToWindow` ahead of attaching children — so `resume()` saw
  `attached=false` and bailed, and nothing retried once the child attached. Background→foreground
  worked only because the view stayed attached. The sibling `FxSurfaceShaderView` dodges this by
  being a `View` with its own `onAttachedToWindow`; the helper is not a `View`. (Device evidence:
  `evidence/device.md` + `evidence/logs/choreographer-lifecycle.md`.)
- **Fix (`FxContentDistortion.kt` only).** Added an `init` block registering a
  `View.OnAttachStateChangeListener` on `target`: `onViewAttachedToWindow → startLoop()` when
  `isEnabled`, `onViewDetachedFromWindow → stopLoop()`. This gives the helper the container's *own*
  attach signal at the correct moment, independent of the parent's premature `onAttachedToWindow`.
  `update()`/`pause()`/`resume()` unchanged — `startLoop`'s `isLooping` guard and `stopLoop`'s
  idempotence make the now-redundant calls safe; the listener shares the helper's lifecycle, so no
  removal. Below API 33 `isEnabled` never flips, so the listener's `startLoop` never fires (inert).
  `FxSurfaceView.kt` / `FxNativeView.kt` / iOS untouched; the rule-#1 `onWindowFocusChanged` and
  pause/resume wiring kept.
- **Re-gate (green):** packages lint clean / tsc --noEmit 0 / build 0 / swift:lint clean / 73 tests;
  Android `:react-native-fx:compileDebugKotlin --rerun-tasks` (forced, 58 tasks executed, not
  UP-TO-DATE) BUILD SUCCESSFUL + `:app:assembleDebug` BUILD SUCCESSFUL. iOS unchanged, not rebuilt.
- **Next:** re-run the Android device gate, focused on the regressed rows — ripple animates on
  initial mount *without* a toggle, and animates again after navigating away and back — plus a
  quick re-confirm of background/foreground pause (must still stop off-window).

## Deferred to docs-closed (planner, after device — README step 6, not done here)

- `02` prose note still reads "merely planned on Android" (the worked-example *data* is flipped;
  the narrative note is the docs-closed gate).
- `23` open question, `data-layer` I5 / content-distort entry, ledger FX-008 → resolved.

Next: run the Android device gate (API 33+ ripple distortion + live child touch + animation +
off-window pause + pre-33 normal + iOS no-op), then planner closes the docs (README step 6).
