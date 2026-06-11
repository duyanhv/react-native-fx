# U4-003 — lazy Metal + shared static device/queue/pipeline cache

Type: `rework` · Device: `yes` · Consumes: — · Closes: — (no ledger row) · Blocked by: —

Origin: critique F2 (HIGH) + the sharing half of F11 (MEDIUM)
(`research/wip/critique-2026-06-10.md` §F2, §F11, ranked recommendation #2).

## The defect

`FxSurfaceView` is the `expo-view` substrate every V2 motion/press/presence component
rides (per DOC-014: presence/state/press are `expo-view` over `FxSurfaceView`). On iOS the
view allocates Metal **eagerly and per-instance**:

- `init` unconditionally calls `setUpMetal()` — it creates the `MTKView`, a command queue,
  and resolves + loads the shader library (`FxSurfaceView.swift:61-66, 83-98`).
- `device`, `commandQueue`, `library`, and `pipelineCache` are **per-instance**
  (`FxSurfaceView.swift:37-40`).

So in V2, `<FxView preset="lift">` around 50 list cards allocates 50 `MTKView`s and 50
command queues to animate 50 transforms — none of which draw a shader. RN's own native
driver allocates nothing per view. This is the list-scale cost the wrapper cannot pay.

## The fix (two parts, iOS-only)

1. **Lazy Metal.** Do not build the `MTKView` in `init`. Allocate it the first time an
   effect is actually active (a non-empty `shader` that resolves to a pipeline). A surface
   used purely as a content-motion wrapper (no `shader`) allocates **zero** GPU resources.
   The `pendingShader == ""` guard that already gates *drawing* moves up to gate
   *allocation*. The `intermediateContainer` stays eager — content motion needs it.
2. **Shared static Metal context.** `device`, `commandQueue`, `library`, and the
   `pipelineCache` become process-wide statics shared by every instance:
   - the system vends one default device per process;
   - the command queue is thread-safe and reusable;
   - the compiled library is identical for every surface (one bundled `default.metallib`);
   - a pipeline state depends only on its two functions and the color pixel format, which
     is the fixed `.bgra8Unorm` for every surface — so a pipeline compiled once is valid
     for all instances. Keyed by `shaderId`, the cache is shared.

   The shared context is **never torn down** (process-lived); `deinit` only releases the
   per-instance `MTKView` delegate + loop.

### Android — no change

`FxSurfaceView.kt` is a pure `FrameLayout` shell; it holds no GPU resources (the Android
shader lane is the hosted `RuntimeShader` path, not this view). F2/F11's per-instance Metal
cost is iOS-only, so Android `FxSurfaceView` needs no rework here.

### Out of scope

The **cadence** half of F11 (ambient 30 fps vs display-rate, a `clock`/per-effect schema
hint) is split to **U2-003**, not this task. This task is allocation timing + resource
sharing only; `preferredFramesPerSecond` stays 60.

## Authority chain

- **Contract:** blueprint Unit 4 (the intermediate-layer/`expo-view` wrapper mechanic);
  `0-spine/04` (fx owns presentation state, reads layout); `31` (pause off-window /
  backgrounded; tear down on deinit).
- **Decision:** `fx-original` — an allocation/resource-lifetime refinement of the shipped
  U4-001/U4-002 mechanic. No vocabulary or API change; props, events, and child routing are
  untouched.
- **Platform mechanic (the single home):** `5-realization/structure.ios.md` §Lifecycle
  (the `MTKView`/pipeline teardown rule). This task adds the lazy-allocation + shared-static
  context rule there.
- **Reference (HOW):** Apple Metal idiom — one process device (`MTLCreateSystemDefaultDevice`
  vends a shared default device), a reused command queue, cached `MTLRenderPipelineState`.
  The existing `FxSurfaceView` draw/pipeline code is the proven shape; this only changes
  *when* and *how widely* those resources live.

## Rules gate

- **#1 native owns the frame loop** — unchanged; no per-frame JS introduced.
- **#3 two substrates** — `FxSurfaceView` stays the `expo-view` substrate; lazy allocation
  does not blur it into `hosted`.
- **#7 Expo Modules / Fabric, no JSI/C++** — pure Swift; no boundary change.
- **#9 reads layout, never writes** — unchanged; the wrapper still animates above layout.

The change is a performance rework with no rule tension.

## Lifecycle

- [x] spec'd
- [x] rules-gated (no rule tension — perf rework; #1/#3/#7/#9 all hold)
- [x] implemented (lazy `MTKView`; static shared device/queue/library/pipeline cache)
- [x] commented (iceberg only — why lazy, why shared/process-lived, main-thread cache access)
- [x] headless-done (tsc / build / lint / swift:lint / test + native xcodebuild compile green)
- [x] device-verified (maintainer-ratified 2026-06-11 on the PASS evidence — `evidence/device.md` §Results; multi-instance shared-context proof rides EX-002)
- [x] reviewed (2026-06-11, approved — `../../reviews/U4-003.md`)
- [x] docs-closed (`structure.ios.md` §Lifecycle records the lazy + shared-static mechanic; no ledger row)
- [ ] merged (human gate)

## Proof

- **headless:** from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test`; `git diff --check`. Native compile: local
  `xcodebuild` (Debug, iphonesimulator) on the example → BUILD SUCCEEDED. Effects do not run
  headless — the GPU behavior is the device gate.
- **device:** see the scenario in `evidence/device.md`. In short:
  1. **Content-motion-only allocates no GPU** — mount a `FxSurfaceView` with a child and
     **no** `shader` (the existing `content-motion` screen). The child mounts, lays out, and
     takes taps exactly as before; with the Metal HUD / GPU-frame capture, **no** `MTKView` /
     command buffer is created for that view.
  2. **Lazy first-render is correct** — set a non-empty `shader` on a surface that mounted
     without one; the effect renders correctly on first activation (no blank/black, correct
     size), `time` advances, and switching shader ids has no stale pixels.
  3. **Shared context across instances** — mount several shader surfaces at once; all render
     correctly from the one shared device/queue/library and the shared pipeline cache (a
     second instance of an already-compiled shader does not recompile).
  4. **Lifecycle still holds** — navigate away / background and back: the loop pauses and
     resumes; teardown on unmount does not affect sibling surfaces (shared context survives).
  5. **a11y** (every `device:yes` task answers this) — the lazy `MTKView`, when present, is a
     decorative GPU surface and must remain absent from / not interfere with the
     accessibility tree; the wrapped RN child stays reachable.
- **docs:** `5-realization/structure.ios.md` §Lifecycle — add the lazy-allocation +
  shared-static-context rule. No ledger row (rework; no `Closes:`).

## Done when

The contract is satisfied (props/events/child routing unchanged), the rules hold, a
content-motion-only surface allocates no GPU resources and a shader surface renders
correctly from the shared lazy context, `structure.ios.md` records the mechanic, and the
device scenario is verified by the maintainer.
