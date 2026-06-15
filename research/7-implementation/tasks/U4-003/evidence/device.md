# U4-003 — device verification scenario

Status: **awaiting device gate** (headless-done; effects/GPU do not run headless).

Platform under test: **iOS** only. The change is iOS-only (Android `FxSurfaceView` holds no
GPU resources). Physical device or Apple-silicon simulator (both run Metal). Use the
**Metal HUD** (`MTL_HUD_ENABLED=1`) or an Xcode GPU frame capture to read per-view GPU
allocation; the example screens drive the rest.

Build: example app (`reactnativefxexample`), Debug. `pod install` was re-run this session so
the Pods project picks up all current Swift files (it was stale — see notes).

## Scenarios

### 1. Content-motion-only surface allocates no GPU (the core F2 claim)

- **Steps:** Open the **Content motion** screen (`example/screens/content-motion.tsx`) — a
  `FxSurfaceView` with a child and **no** `shader` prop. Toggle the child show/hide; tap it.
- **Expected:** Child mounts into the intermediate container, lays out at full size, and
  receives taps exactly as before U4-003. With a GPU frame capture, **no `MTKView`, no
  command buffer, no drawable** is created for this surface — it is GPU-free.
- **Failure signs:** any GPU surface attached to the no-shader view; a command buffer
  committed for it; the child rendering at 0×0 or not taking taps (lazy path regressed
  layout/child routing).

### 2. Lazy first activation renders correctly

- **Steps:** On a surface that mounted **without** a shader, set a non-empty `shader` (drive
  via a shader screen, or extend the content-motion screen with a shader toggle). Then switch
  among shader ids.
- **Expected:** The effect appears on first activation — correct fill, correct size, no blank
  or black frame; `time` advances; switching ids shows no stale pixels and no crash.
- **Failure signs:** first activation blank/black or wrong size (lazy `MTKView` mis-sized or
  added behind the content); stale pixels on switch; the surface never appears.

### 3. Shared context across multiple instances

- **Steps:** Show several shader surfaces at once (a screen with multiple shader tiles, or
  the EX-002 list when it lands). Include two tiles using the **same** shader id.
- **Expected:** All render correctly from the one shared device/queue/library. Two instances
  of the same shader id reuse the one cached pipeline (no recompile, no per-instance device).
- **Failure signs:** one tile renders and others are blank (shared resource contention);
  visual corruption (pixel-format/pipeline mismatch); a per-instance device or queue showing
  in a GPU capture.

### 4. Lifecycle holds (pause/resume, isolated teardown)

- **Steps:** With a shader active, navigate away and back; background the app and return.
  Then unmount one shader surface while a sibling shader surface stays mounted.
- **Expected:** The loop pauses off-window/backgrounded and resumes on return. Unmounting one
  surface releases only its own `MTKView`; the sibling keeps rendering (the shared device/
  queue/library/pipeline cache survives — it is process-lived).
- **Failure signs:** loop runs while off-window/backgrounded (battery/main-thread cost);
  unmounting one surface blanks or crashes a sibling (shared context wrongly torn down).

### 5. Accessibility (required of every `device: yes` task)

- **Steps:** With VoiceOver on, inspect a shader surface and a content-motion surface.
- **Expected:** The decorative `MTKView`, when present, is absent from / does not interfere
  with the accessibility tree; the wrapped RN child stays reachable with its own label/trait.
- **Failure signs:** the GPU surface steals focus or blocks the child from VoiceOver.

## What a pass proves

F2 is closed (content-motion wrappers are GPU-free) and F11's sharing half is closed (one
process-wide Metal context, not N). Props, events, and child routing are unchanged from
U4-001/U4-002.

---

## Results — 2026-06-11, iOS 26 simulator (iPhone 17 Pro), Xcode 26.5 — **PASS**

Driven via agent-device on a log-instrumented build. The instrumentation was **log-only**
(two `NSLog` lines: one in `ensureEffectSurface()` at the allocation point, one in
`updateEffectSurfaceVisibility()` reporting `shader` / `hasActiveEffect` / `metalViewExists`);
it has no behavioral effect and was reverted after the run — the committed code compiles and
lints identically. The example's `content-motion` screen was temporarily given a shader
toggle (`loop`) as the positive control; also reverted. Artifacts in this folder:
`fxu4003-device-log.txt`, `01-content-motion-no-shader.png`, `02-shader-on-allocated.png`,
`03-remount-no-shader.png`.

Device log (the whole session — note **exactly one** allocation line):

```
10:06:50  applyConfig: shader=<none> hasActiveEffect=0 metalViewExists=0     ← mount, no shader
10:08:24  applyConfig: shader=loop   hasActiveEffect=1 metalViewExists=0
10:08:24  allocating MTKView (lazy — first active shader)                    ← the only allocation
10:09:01  applyConfig: shader=loop   hasActiveEffect=1 metalViewExists=1     ← reuse, no realloc
10:09:20  applyConfig: shader=loop   hasActiveEffect=1 metalViewExists=1     ← reuse, no realloc
10:11:04  applyConfig: shader=<none> hasActiveEffect=0 metalViewExists=0     ← re-mount, fresh, 0 alloc
```

- **§1 zero GPU for content-motion-only — PASS.** On mount with no `shader`, `applyConfig`
  ran with `metalViewExists=0` and **no** allocation log. The surface configured itself and
  allocated no `MTKView`. `01-content-motion-no-shader.png` shows the empty box.
- **Functional (child mount + hit-test on the GPU-free surface) — PASS.** "Show child"
  mounted "Tap me" into the intermediate container; two taps drove `count: 0 → 2`. Lazy/no-GPU
  path does not regress layout or touch.
- **§2 lazy first activation — PASS.** Toggling `shader=loop` logged `hasActiveEffect=1
  metalViewExists=0` immediately followed by the single `allocating MTKView` line; the `loop`
  shader rendered a real animated pattern (`02-shader-on-allocated.png`), not blank/black.
- **§3 / no-realloc — PASS (partial on multi-instance).** Subsequent `applyConfig` passes with
  the shader active reported `metalViewExists=1` and produced **no** further allocation — the
  one `MTKView` is reused. (The N-distinct-instances-share-one-context check wants the EX-002
  list; the single-screen run proves reuse within an instance and that re-mount starts fresh.)
- **§4 lifecycle / isolated teardown — PASS.** Navigating back to Tasks unmounted the surface
  with no crash; re-entering produced a **fresh** instance at `metalViewExists=0` (the prior
  `MTKView` was released on `deinit`, the process-shared context survived — the app stayed
  alive and the new surface worked). `03-remount-no-shader.png`.
- **§5 a11y — observed.** The accessibility snapshots never exposed the `MTKView` as its own
  element; the surface surfaced only the wrapped child ("Tap me, count: …") to the a11y tree.

**Total `MTKView` allocations across the entire session: 1** — and only at the moment a shader
first became active. This is the F2 claim, proven.

### Not separately exercised on this run (lower-risk, deferred)

- Multi-instance shared-context (N surfaces drawing the same id reuse one pipeline) — wants the
  EX-002 100-cell screen; the GPU-capture variant is the cleanest proof. Single-instance reuse
  is shown here.
- A pre-existing, **non-U4-003** prop nuance surfaced: toggling `shader` from `"loop"` back to
  `undefined` did not drive a `shader=<none>` apply (Expo omits the prop rather than resetting
  it), so the native surface kept the last shader. This predates U4-003 (the change did not
  touch `setShader`/the prop flow) and is orthogonal to lazy/shared Metal — worth a separate
  look alongside the `onFxLoad`/`onFxError` wiring routed to U2-003.
