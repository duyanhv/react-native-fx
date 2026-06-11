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
