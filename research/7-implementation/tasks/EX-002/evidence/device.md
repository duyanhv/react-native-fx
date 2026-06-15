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

---

## Results — 2026-06-11 · iOS 26.5 sim (iPhone 17 Pro) + Android (POCO F1, API 35), agent-device

Driven via agent-device. The iOS leg used the **U4-003 log-only instrumentation pattern**: three
`NSLog("[FXINSTR] …")` lines — one in the static `sharedDevice`/`sharedCommandQueue` initializers
(device/queue creation, fires once per process), one in `ensureEffectSurface()` (the per-view
`MTKView` allocation point), one on the pipeline-cache **miss** in `pipeline(for:)` (a compile;
omitted on cache hit so the per-frame `draw` path is not logged and the perf read is clean). The
instrumentation has no behavioral effect and was **reverted after the run** — `git diff` on
`packages/` is empty and `swift:lint` + `bun run lint` pass. Artifacts in this folder:
`ios-fxinstr-device-log.txt`, `ios-stress-list-screenful.png`, `ios-stress-list-aurora-blank.png`,
`ios-stress-list-inksmoke-repeat.png`, `ios-a11y-tree.txt`; `android-stress-list-screenful.png`,
`android-stress-list-scrolled.png`, `android-a11y-tree.txt`.

The stress list assigns shader cells at `index % 4 == 0`, id = `SHADER_IDS[floor(index/4) % 10]`
(all ten curated ids cycle). The iOS interactive raster path (`FxSurfaceView.fragmentName`)
implements **five** of them — `fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`, `dots`; the
other five (`aurora`, `noise-field`, `plasma`, `caustics`, `edge-glow`) have no raster fragment.

### (a) Multi-instance shared Metal context — **PASS** (iOS)

Final `[FXINSTR]` tally after launch → EX-002 → full down-and-back traversal of the 100-cell list:

```
MTLDevice created (once per process) = true   ← appears EXACTLY ONCE
MTLCommandQueue created (once per process) = true   ← appears EXACTLY ONCE
pipeline COMPILED  ×5  — fractal-clouds, ink-smoke, liquid-chrome, loop, dots (each ONCE)
allocating MTKView ×28 — every line attributable to a shader cell (see (c))
```

- **One** `MTLDevice` and **one** `MTLCommandQueue` for the whole process, however many shader
  surfaces are live — never one per instance.
- **5 pipeline compiles = the 5 distinct raster ids, each compiled once and never again.** Repeat
  ids reused the cached pipeline with no recompile: e.g. `ink-smoke` first compiled for cell #4 and
  rendered again at cell #44 from the same cached `MTLRenderPipelineState`
  (`ios-stress-list-inksmoke-repeat.png`) — no new COMPILE line. The pipeline cache holds one entry
  per distinct id, valid across instances. This closes the multi-instance half of U4-003 / F11.

### (b) Scroll perf on the mixed list — **PASS (Android hardware)** · **partial (iOS sim)**

- **Android (physical POCO F1) — PASS.** Full-list flick-scroll to the bottom and back, repeated.
  Cumulative gfxinfo over the session: **0.9% dropped / 17,507 frames @ 59.9 Hz**; a dedicated
  scroll window read **0.4% dropped / 11,768 frames**; the heaviest full-list fling window read
  **2.6% dropped / 2,528 frames**. The app's dev HUD held **UI 59.8 fps** with **0 stutters (4+)**
  for the entire session — no sustained frame drops, no jank concentrated when shader/fill/material
  cells scrolled in or out (`android-stress-list-scrolled.png`).
- **iOS (simulator) — partial.** Apple frame-health sampling is unavailable on the simulator
  (tooling limitation; the Device Verification Guide also flags simulator perf as unrepresentative).
  The rule-#1 claim is still observable from the log: native-side work fires only at **mount**
  (allocations) and **once per id** (compiles) — there is **no per-frame `[FXINSTR]` churn** and the
  per-frame `draw` path crosses nothing to JS; scroll was visually smooth. The hardware perf number
  comes from the Android leg above. A representative iOS perf trace wants a physical iPhone.

### (c) Shader-less cells allocate no MTKView at list scale — **PASS** (iOS)

All **28** `MTKView` allocations across the traversal originate in `ensureEffectSurface()`, which is
reached only through `updateEffectSurfaceVisibility()` when `hasActiveEffect` is true — i.e. only
when a shader resolves to a usable pipeline. **Motion-only cells (`#3`, `#7`, `#11`, … — no
`shader` prop) never enter that path, so they allocate zero `MTKView`.** The 28 allocations are
explained entirely by raster shader cells mounting and recycling under scroll (a recycled cell
releases its `MTKView` on unmount and allocates a fresh one on re-entry; the count grows with churn,
bounded per live cell). Motion cells render their wrapped `content only` card correctly with no GPU
surface. This confirms F2 at list scale.

### Accessibility — **PASS** (both platforms)

- **iOS** (`ios-a11y-tree.txt`): decorative shader/fill/material surfaces appear only as unlabeled
  generic `Other` containers — no label, trait, or focusable element; they do not steal focus. The
  motion-only cell's wrapped content is reachable as StaticText (`content only`, `wrapper animates
  this — no Metal`). The list reads in cell order.
- **Android** (`android-a11y-tree.txt`): decorative fx surfaces expose no accessibility node at all;
  the motion-only wrapped content is reachable as its own text nodes; reads in cell order.

### Findings flagged for the maintainer (not blockers for (a)/(b)/(c)/a11y)

1. **Android shader cells render blank** — the stress-list shader cells use the expo-view path
   (`<FxSurfaceView shader=…>`, `stress-list.tsx:90`), and on Android that path's shader renderer is
   **not implemented**: `FxSurfaceView.kt` `updateEffectSurfaceVisibility()` is an explicit `TODO`
   that attaches no render surface (`dispatchShaderLoadState()` only *compiles* the AGSL to fire
   `onFxLoad`/`onFxError`, never draws it). The hosted path (`FxShaderView.kt onDraw` → `RuntimeShader`)
   does render — the hosting-parity `loop`/`aurora` tiles draw — but the **interactive (expo-view)
   shader renderer is a deferred Android phase**. Consequently this scenario doc's claim that the
   Android leg renders "shader cells via AGSL" is **inaccurate** and should be corrected to "fill /
   material render; expo-view shader cells are blank pending the Android interactive renderer."
2. **iOS non-raster shader cells render blank** — `aurora`, `noise-field`, `plasma`, `caustics`,
   `edge-glow` have no raster fragment on the interactive surface, so those shader cells are blank on
   iOS too (`ios-stress-list-aurora-blank.png`, cell #20 `aurora`). This is **by design** — the
   interactive raster path implements a five-id subset (`FxSurfaceView.fragmentName`); the full
   catalog renders only on the hosted path.

### Recommendation

**(a) PASS, (c) PASS, a11y PASS, (b) PASS on Android hardware / partial on iOS sim.** The shared
process-wide Metal context, same-id pipeline reuse, and zero-MTKView-for-motion-cells claims are
proven at list scale. Leave EX-002 `device-pending` for maintainer ratification; address the two
findings above (the Android-renderer gap is pre-existing, not introduced by EX-002).
