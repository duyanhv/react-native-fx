# EX-002 — device verification scenario (standing)

Status: **awaiting device gate** (headless-done; effects/GPU/scroll perf do not run headless).

This is the standing stress scenario the F14 critique asked for — kept, not thrown away. It is
where U4-003's deferred multi-instance proof gets run, and where the F1/F2 critique costs become
measured rather than theoretical.

Platform under test:
- **iOS** — owns proofs (a), (b), (c). The shared-Metal-context and lazy-MTKView claims are
  iOS-only (Android `FxSurfaceView` holds no GPU resources). **Physical device strongly preferred
  for the perf proof** (simulator GPU/CPU perf is not representative — Device Verification Guide
  §Simulator vs physical). A GPU frame capture or the Metal HUD (`MTL_HUD_ENABLED=1`) reads
  per-view allocation.
- **Android** — runs proof (b) only (scroll perf on the mixed list); fill/material render via the
  Android paths, shader cells via AGSL. No GPU-allocation proof (no MTKView on Android).

Build: example app (`reactnativefxexample`), Debug. Navigate **Tasks → EX-002** (or open
`/EX-002`). The screen is `example/screens/stress-list.tsx`: 100 cells, four kinds cycling by
`index % 4` (#0 shader, #1 fill, #2 material, #3 motion-only, repeating). Each cell's caption names
its kind and, for shader cells, the shader id.

## Scenarios

### (a) Multi-instance shared Metal context — the U4-003 deferral

- **Steps:** Scroll so several **shader** cells (#0, #4, #8, …) are on screen together. With an
  Xcode GPU frame capture (or the Metal HUD), inspect the live Metal objects. Note that the shader
  ids cycle through the ten curated ids, so on-screen shader cells include both **distinct** ids
  and, as you scroll the full list, **repeats** of the same id (e.g. #0 and #40 are both
  `fractal-clouds`).
- **Expected:** Exactly **one** `MTLDevice` and **one** `MTLCommandQueue` for the whole process,
  no matter how many shader surfaces are live — never one per instance. Two cells drawing the
  **same** shader id share the **one** cached `MTLRenderPipelineState` (no recompile on the second
  instance). The pipeline cache holds one entry per distinct id seen, keyed by shader id, valid
  across instances (fixed `bgra8Unorm` pixel format).
- **Failure signs:** a per-instance device or queue in the capture; a pipeline recompiled per
  instance of the same id; some shader cells blank while others render (shared-resource
  contention); visual corruption (pixel-format/pipeline mismatch).

### (b) Scroll perf on the mixed list — F1/F2 made measurable

- **Steps:** From the top, flick-scroll the full 100-cell list to the bottom and back, a few
  times, at a natural reading pace and then as fast as the list will fling. Capture a perf trace
  across the scroll (agent-device `perf` / `trace`, or an Xcode/Instruments timeline). Watch the
  JS thread and the UI/render thread.
- **Expected:** Smooth scroll — no sustained frame drops, no per-frame JS spikes correlated with
  shader cells entering/leaving (rule #1: native owns the frame loop; nothing crosses the bridge
  per frame). Mounting/unmounting shader cells under fling does not stutter the list. Memory does
  not climb without bound as cells recycle (MTKViews release on cell unmount; the shared context
  is process-lived and bounded).
- **Failure signs:** dropped frames or visible jank concentrated when shader cells scroll in/out;
  a JS-thread spike per frame (per-frame bridge traffic — a rule-#1 breach); unbounded memory
  growth across repeated full-list scrolls (leaked MTKViews / pipelines).

### (c) Shader-less cells allocate no MTKView at list scale

- **Steps:** Scroll so several **motion-only** cells (#3, #7, #11, …) are on screen. Each is a
  `FxSurfaceView` wrapping content with **no** `shader`. With a GPU frame capture (or the U4-003
  log instrumentation — one `NSLog` at `ensureEffectSurface()`), count `MTKView` allocations
  attributable to these cells as they mount under scroll.
- **Expected:** **Zero** `MTKView`, command buffer, or drawable for any motion-only cell, at any
  point, however many scroll into view. The wrapper hosts and lays out its child and stays
  GPU-free. The content inside renders (the "content only" card is visible and laid out).
- **Failure signs:** any GPU surface attached to a motion-only cell; an allocation logged as one
  scrolls in; the child rendering at 0×0 or absent (lazy path regressed layout/child routing at
  scale).

### Accessibility (required of every `device: yes` task)

- **Steps:** With VoiceOver (iOS) / TalkBack (Android) on, swipe through a screenful that mixes
  all four cell kinds.
- **Expected:** The decorative shader / fill / material surfaces are absent from (or inert in) the
  accessibility tree; the motion-only cell's wrapped content ("content only" / "wrapper animates
  this") is reachable with its text. The list scrolls and reads in cell order.
- **Failure signs:** a decorative GPU/hosted surface stealing focus or announcing itself; the
  motion-only child unreachable.

## What a pass proves

- (a) closes the multi-instance half of U4-003 / F11 — one process-wide Metal context backs N live
  shader surfaces; same-id instances share one cached pipeline.
- (b) converts the F1/F2 scroll-cost critique from theoretical to measured — a real 100-cell mixed
  feed scrolls without per-frame JS or jank, rule #1 intact under load.
- (c) confirms F2 at list scale — a shader-less surface is GPU-free no matter how many mount.

## Suggested capture artifacts

Drop into this folder on a run: the GPU frame capture (or HUD screenshot) for (a)/(c), the perf
trace for (b), and a screenshot of a mixed screenful with captions legible. Append a dated
**Results** section below (follow U4-003's `evidence/device.md` shape — PASS/FAIL per scenario,
with the allocation count called out).
