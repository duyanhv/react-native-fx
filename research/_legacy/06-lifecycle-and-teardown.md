# Lifecycle & teardown
Status: researched
Feeds: skills/react-native-fx/references/gotchas.md

## Why this matters
fx V1 is an **interactable native iOS Metal `ShaderView`** — an `ExpoView`
(UIKit) backed by `MTKView` / `CAMetalLayer` that **owns a GPU surface and a
native frame loop**. That changes the lifecycle posture completely versus the
old "passive system glass" framing: a passive `UIVisualEffectView` had no loop
to stop and no drawable to lose, so background handling was optional. A
`ShaderView` **owns a set of real GPU resources**, each with its own lifetime:

| Owned resource | Created | Released | Per-frame? |
|---|---|---|---|
| `MTKView` (+ its `CAMetalLayer`) | view init | view dealloc | — |
| `MTLDevice` | once (process-global) | never (just drop the ref) | no |
| `MTLCommandQueue` | once per device | teardown (or kept device-shared) | no |
| `MTLLibrary` (default lib from resource bundle) | once, lazily | teardown | no |
| `MTLRenderPipelineState` | once **per shader id**, cached | teardown / id evict | no |
| Uniform storage (`setFragmentBytes` block or `MTLBuffer`) | once | teardown | reused, not realloc'd |
| `CAMetalDrawable` + `MTLCommandBuffer` | every frame | autorelease-pool drain | **yes — never stored** |

The thesis (README) and doc `08-shader-accents-and-distribution.md` lock the
resource model; this doc owns the **lifecycle contract for each resource**:
when it is created, how it attaches/detaches with the view, when its loop must
**pause** (background / off-window — now mandatory for a GPU loop), and the
**idempotent teardown order** on unmount/recycle. Get this right once on the
`ShaderView` base (`01-expo-modules-view.md`); it is central, not a stub.

The Fabric/Expo lifecycle plumbing (where hooks live, no-flatten, recycling) is
unchanged and still applies; the new weight is the owned Metal resources.

## Research questions
- `MTKView` / `CAMetalLayer`: creation, attach/detach with the view
  (`didMoveToWindow`), and which one V1 uses (lean `MTKView`).
- `MTLCommandQueue`: created once per view or shared per device; lifetime.
- The display loop: `MTKViewDelegate.draw(in:)` vs `CADisplayLink`; start/stop;
  `isPaused` / `enableSetNeedsDisplay` / `preferredFramesPerSecond`.
- Shader library / pipeline cache: when `makeDefaultLibrary` runs (once),
  pipeline state cached per id, release on teardown.
- Uniform `MTLBuffer`s / textures: allocation, reuse across frames, release.
- Background/foreground & off-window pause: which hooks, and why it is now
  non-negotiable for a GPU loop (battery, GPU time, drawable validity).
- Idempotent teardown order + retain cycles (display-link target ↔ self,
  delegate ↔ view); Expo/Fabric hosting hooks; Fabric flattening; view recycling
  (what resets between binds).

## Findings

### 1. `MTKView` / `CAMetalLayer` — the surface object
**V1 uses `MTKView`** (locked in `08`, Decision 1). `MTKView` is a `UIView`
subclass **backed by a `CAMetalLayer`** that creates/configures/displays Metal
objects: it owns the drawable pool, an internal display-link-driven render loop,
and resize handling, and calls a delegate each frame. Choosing it over a raw
`CAMetalLayer` removes the hand-rolled loop/drawable/resize surface — i.e. it
removes most of the teardown surface this doc would otherwise have to specify.
([Apple: `MTKView`](https://developer.apple.com/documentation/metalkit/mtkview))

**Lifecycle of the surface object:**
- **Create once, in the `ShaderView` init** — `let metalView = MTKView()`, set
  `device`, `colorPixelFormat`, `framebufferOnly`, transparency
  (`isOpaque = false`), and start **paused** (`isPaused = true`) so nothing draws
  before the view is on-window (`08` §1). The `CAMetalLayer` is created and owned
  *by* `MTKView` (its backing `layer`); we never instantiate it ourselves on this
  path.
- **Attach/detach is window membership, not alloc/dealloc.** The `MTKView` is a
  subview for the life of the `ShaderView`; it is **not** recreated on
  attach/detach. `didMoveToWindow()` only flips the loop on/off (§3, §6). Frame is
  synced in `layoutSubviews` (`metalView.frame = bounds`).
- **Release with the view.** The `MTKView` (and its `CAMetalLayer`) is released
  when the `ShaderView` deallocs; before that we set `delegate = nil` and
  `isPaused = true` (§7).

The raw **`CAMetalLayer` + `CADisplayLink`** path (override `layerClass` to
return `CAMetalLayer.self`, drive frames yourself) is the documented **fallback**
if we outgrow MTKView's loop; it is exactly Apple's *Creating a custom Metal
view* sample. Its lifecycle differs only in that **we** own the layer and the
display link, so **we** must create the link in `didMoveToWindow` and
`invalidate()` it on detach/`deinit` (§3, §7). The owned-resource contract below
is otherwise identical.
([Apple: Creating a custom Metal view](https://developer.apple.com/documentation/metal/creating-a-custom-metal-view);
[`didMoveToWindow()`](https://developer.apple.com/documentation/uikit/uiview/1622527-didmovetowindow))

### 2. `MTLDevice` and `MTLCommandQueue` — create once, reuse
**`MTLDevice`.** Acquired via `MTLCreateSystemDefaultDevice()`; it is
**process-global and cheap to re-acquire**. Apple: "create only one `MTLDevice`
object per GPU and reuse it." We hold a reference for the life of the renderer
and simply **drop the ref** on teardown — there is nothing to "free."

**`MTLCommandQueue`.** Apple's persistent-objects guidance: "Most apps should
create only **one** `MTLCommandQueue` object per GPU" and reuse it for every
frame — **creating a command queue is expensive**, so it is created **once at
init**, never per-frame. Each frame you call `queue.makeCommandBuffer()` (cheap,
transient), **not** a new queue.
([Apple: Metal Best Practices — Persistent Objects](https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/MTLBestPracticesGuide/PersistentObjects.html);
[`makeCommandQueue()`](https://developer.apple.com/documentation/metal/mtldevice/1433388-makecommandqueue))

**V1 posture (one queue per renderer; safe to share per device).** The `08`
renderer creates the queue in its `init` (`device.makeCommandQueue()`), so today
there is **one queue per `ShaderView`**. That is correct and simple. Because the
ideal is *one queue per GPU*, if profiling ever shows queue churn under
many simultaneous shader views, a **device-shared singleton** (one
`MTLDevice` + one `MTLCommandQueue` cached per process, handed to every renderer)
is the Apple-aligned optimization — and it dovetails with recycling (§7: keep
device/queue across rebinds). Lifetime either way: **created once, reused every
frame, released last in teardown** (or never, if device-shared).

### 3. The display loop — `MTKViewDelegate.draw(in:)`, start/stop
V1 drives frames with **`MTKView`'s internal loop** calling
`MTKViewDelegate.draw(in:)` — we do **not** create a `CADisplayLink` on this
path; `MTKView` owns one internally. Three properties control it:

| Property | Effect |
|---|---|
| `isPaused: Bool` | Master on/off. `true` = stop calling `draw`. The pause switch for background / off-window / idle. |
| `enableSetNeedsDisplay: Bool` | `true` = **on-demand**: a frame is produced only on `setNeedsDisplay()`. `false` (default) = timer-driven **continuous**. |
| `preferredFramesPerSecond: Int` | Target cadence for the timer-driven loop (e.g. 60 / 120 on ProMotion — honor the display max, don't hardcode 60). |

`MTKView`'s three documented drawing modes fall out of these:
- **Continuous** (`isPaused = false`, `enableSetNeedsDisplay = false`): internal
  timer calls `draw(in:)` at `preferredFramesPerSecond`. Use for animated shaders
  (time-driven uniforms) — the V1 default.
- **On-demand** (`isPaused = false`, `enableSetNeedsDisplay = true`): draw only on
  `setNeedsDisplay()`. Far cheaper; the right mode for static shaders or shaders
  that only change on a `setUniform`/touch.
- (Explicit `draw()` calls — `isPaused = true`, `enableSetNeedsDisplay = false` —
  exist but we don't use them; `isPaused` is reserved as our pause switch.)

**Start/stop is purely `isPaused`** — the loop is never destroyed/recreated on
the MTKView path; it is started (unpaused) when on-window+foreground and stopped
(paused) otherwise (§6). Per frame the delegate reads `view.currentDrawable`
(a `CAMetalDrawable`) and `view.currentRenderPassDescriptor`, encodes one command
buffer, then `commit()` + `present(drawable)`. **Drawables are a scarce pooled
resource** — acquire `currentDrawable` as late as possible, bail (`return`) if it
is `nil`, never hold it past the frame, and wrap the frame body in an
`autoreleasepool` so the drawable/command-buffer drain promptly.
([Apple: `MTKView`](https://developer.apple.com/documentation/metalkit/mtkview);
[`isPaused`](https://developer.apple.com/documentation/metalkit/mtkview/ispaused);
[`enableSetNeedsDisplay`](https://developer.apple.com/documentation/metalkit/mtkview/enablesetneedsdisplay);
[`preferredFramesPerSecond`](https://developer.apple.com/documentation/metalkit/mtkview/preferredframespersecond))

**Fallback (`CADisplayLink`).** On the raw-`CAMetalLayer` path the loop is a
`CADisplayLink(target:selector:)` we create in `didMoveToWindow`, control with
`displayLink.isPaused` / `preferredFramesPerSecond`, and **must** `invalidate()`
on detach/`deinit` (it strongly retains its target — §7).
> iOS 17+ adds **`CAMetalDisplayLink`** (QuartzCore), a Metal-aware link with
> `preferredFrameRateRange` / `preferredFrameLatency` for smoother pacing and
> drawable hand-off than plain `CADisplayLink`. Optional polish for the raw-layer
> path; not required for V1.
> ([Apple: `CAMetalDisplayLink.preferredFrameRateRange`](https://developer.apple.com/documentation/quartzcore/cametaldisplaylink/preferredframeraterange))

### 4. Shader library + pipeline cache — built once, released on teardown
The shader machinery (locked in `08`, Decisions 5–7):
- **`MTLLibrary` — built once.** `device.makeDefaultLibrary(bundle:)` against the
  resolved **`FxShaderShaders`** resource bundle, run **once** when the renderer
  initializes (`FxShaderLibrary.load(device:)`), then held for the renderer's
  life. It is **not** re-loaded per shader switch or per frame. Released
  (nil'd) on teardown.
- **`MTLRenderPipelineState` — cached per shader id.** Building a pipeline state
  is an "expensive evaluation of GPU state" (Apple), so each id's pipeline is
  built **once** (`library.makeFunction(name:)` →
  `device.makeRenderPipelineState`) and stored in `pipelineCache[id]`; later
  switches to the same id are a dictionary hit, never a rebuild. Unknown/
  unresolvable id falls back to `.default` once (no crash) — see `08` §5.3.
  ([Apple: Persistent Objects — build pipeline states once](https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/MTLBestPracticesGuide/PersistentObjects.html);
  [Apple: `makeDefaultLibrary(bundle:)`](https://developer.apple.com/documentation/metal/mtldevice/2177054-makedefaultlibrary))

**Lifecycle/teardown:** the library and the whole `pipelineCache` are
reference-counted; **nil the library and empty/drop the cache on teardown** to
free them. On **recycling** (§7) the cache is the thing worth *keeping* across a
rebind when the shader id is unchanged (avoids rebuilding a pipeline on every
bind); it is dropped only on real destroy.

### 5. Uniform storage / textures — allocated once, reused across frames
- **V1 uniforms use the implicit-bytes path, not an allocated `MTLBuffer`.** Per
  `08` §4, the uniform block (`time`, `resolution`, `touch`, JS-set values) is a
  small struct (< 4 KB) bound with `enc.setFragmentBytes(&uniforms, …, index: 0)`.
  Metal copies the bytes into the command buffer each frame, so **there is no
  GPU buffer to allocate, reuse, or release** — the storage is a plain Swift
  `struct` field on the renderer, mutated in place. This deliberately avoids
  triple-buffering and manual buffer lifetime for V1.
  ([Apple: `setFragmentBytes(_:length:index:)`](https://developer.apple.com/documentation/metal/mtlrendercommandencoder/1516192-setfragmentbytes))
- **If/when an explicit `MTLBuffer` is needed** (uniform block grows past 4 KB,
  or we add per-frame-persistent data): `device.makeBuffer` **once** (or a small
  ring of N buffers for in-flight frames), write into it each frame via its
  `contents()` pointer (reuse, never realloc per frame), and **nil it on
  teardown**. Same persistent-object rule as the queue/pipeline.
- **Textures (none in V1):** no input textures are loaded for the curated
  generative shaders. If a future shader samples a texture, it is loaded **once**
  (not per frame) and released on teardown; the per-frame drawable texture
  (`currentDrawable.texture`) is **not** owned — it is borrowed from the pool and
  must not be retained past the frame.

The **per-frame transients** — `CAMetalDrawable`, `MTLCommandBuffer`,
`MTLRenderCommandEncoder` — are created fresh every `draw(in:)` and released when
the frame's `autoreleasepool` drains. The rule is **don't store them**, not
"free them."

### 6. Background / foreground & off-window pause — MANDATORY now
A running Metal loop **must** pause when the app backgrounds or the view leaves
the window. Non-negotiable for a GPU loop, all new versus the passive-glass case:
1. **Battery / GPU.** A 60–120fps loop running off-screen burns GPU/battery for
   nothing.
2. **Drawable validity / OS rules.** Rendering to a `CAMetalDrawable` while
   backgrounded is invalid; `currentDrawable`/`nextDrawable` can stall or the GPU
   submission can be rejected once the app is not foreground. Pausing avoids
   acquiring a drawable you cannot present (the hang others hit when they don't
   pause).
3. **Off-window.** A view removed from the window (covered tab, unmounted screen,
   recycled into the pool) must not keep drawing.

Two pause triggers, wired to two hook layers, combined into one switch:

**A. Off-window (per-view) — `didMoveToWindow`.** When `window == nil`, pause;
when it returns, resume. For `MTKView`, `isPaused = (window == nil)` (combined
with foreground state below). On the raw-layer fallback this is where the
`CADisplayLink` is created (`window != nil`) and `invalidate()`d (`window ==
nil`), mirroring Apple's sample.
([Apple: `didMoveToWindow()`](https://developer.apple.com/documentation/uikit/uiview/1622527-didmovetowindow))

**B. App background/foreground (shared) — `UIApplication` notifications.** Apple's
sample observes `UIApplication.didEnterBackgroundNotification` → paused and
`willEnterForegroundNotification` → resumed. In fx these are surfaced through the
Expo module block as **`OnAppEntersBackground` / `OnAppEntersForeground`**, fanned
out to a **weak registry** of live `ShaderView`s to set their paused flag.
([Apple: `didEnterBackgroundNotification`](https://developer.apple.com/documentation/uikit/uiapplication/didenterbackgroundnotification);
[`willEnterForegroundNotification`](https://developer.apple.com/documentation/uikit/uiapplication/willenterforegroundnotification);
[Expo Modules API lifecycle listeners](https://docs.expo.dev/modules/module-api))

> Combine both into a single `updatePausedState()`: the loop runs **only when**
> `window != nil` **AND** the app is foreground. On resume, **re-acquire a fresh
> drawable each frame — never cache a `CAMetalDrawable` across the pause.**

(Android symmetry, when a future AGSL/Skia backend gains a loop:
`OnActivityEntersBackground` / `OnActivityEntersForeground` + `onDetachedFromWindow`.)

### 7. Teardown / reuse — idempotent order, retain cycles, recycling

**Idempotent teardown order (most transient → most owned):**
1. **Stop the loop first.** `mtkView.isPaused = true` and drop the delegate
   (`mtkView.delegate = nil`) — **or**, on the raw path, `displayLink.invalidate()`
   + nil it. Stopping before releasing guarantees no in-flight `draw` touches a
   half-freed pipeline. (Apple's `stopRenderLoop` = `displayLink.invalidate()`,
   called from `dealloc`.)
2. **Drawables / command buffers: nothing to free.** Per-frame and
   autorelease-pool-managed; the rule is *don't hold them*, so there is nothing to
   release here if §3/§5 are followed.
3. **Release pipeline cache + library + uniform buffers.** Empty/drop
   `pipelineCache`, nil the `MTLLibrary`, nil any explicit uniform `MTLBuffer`(s)
   and textures. Reference-counted; nilling the last strong ref frees them.
4. **Release queue, then device, last.** Drop `MTLCommandQueue`, then the
   `MTLDevice` ref. The device is process-global and cheap to re-acquire; just
   don't leak a strong ref from the weak registry. (If device/queue are
   device-shared singletons per §2, they are **not** dropped per-view.)

`resetToDefault()` performs steps 1+3 and is **safe to run twice** — it runs from
both `deinit` and a recycling reset. `deinit` additionally drops queue/device
(step 4) and the registry entry.

**Retain cycles to break (the Metal-specific ones):**
- **`MTKView.delegate` is `weak`** — MTKView does not retain its delegate
  (confirmed: MetalKit holds the delegate weakly and drives the loop internally).
  The cycle risk is the **reverse**: if a separate renderer/delegate (or a closure
  it owns) holds a **strong** ref back to the view while the view holds the
  renderer, neither deallocs. **Hold the view weakly from the renderer**, or make
  the `ShaderView` itself the delegate (no extra object) and rely on the weak
  delegate. ([Apple: `MTKViewDelegate`](https://developer.apple.com/documentation/metalkit/mtkviewdelegate))
- **`CADisplayLink` retains its target strongly** (raw-layer path only). A link
  created with `displayLink(target: self, selector:)` keeps `self` alive until
  `invalidate()`. Never invalidating ⇒ the view never deallocs (classic leak).
  **Always `invalidate()` on off-window and in `deinit`** (use a weak proxy target
  only if the link must outlive ambiguity; invalidate-on-detach is sufficient for
  fx).
- **Closures** (animation / uniform-update / observer blocks) must capture
  `[weak self]`; nil any stored block on teardown.
- **App-state registry** holds `ShaderView`s **weakly**, so a backgrounded-app
  fan-out never keeps a view alive.

> Diagnostic: **if `deinit` never fires, you have one of the cycles above** — a
> non-invalidated display link or a strong renderer/closure → view back-edge.

**Expo / Fabric hosting hooks** (carried over, still correct). `ShaderView` is an
`ExpoView` subclass; Expo wires Fabric registration, prop dispatch, and events,
but **does not auto-release the Metal objects we attach** — teardown is ours.

| Concern | iOS (`ExpoView`/UIKit) | Android (`ExpoView`) |
|---|---|---|
| Attached to window | `didMoveToWindow()` (window != nil) → start loop | `onAttachedToWindow()` |
| Detached from window | `didMoveToWindow()` (window == nil) → pause loop | `onDetachedFromWindow()` |
| Final dealloc | **`deinit`** → idempotent full teardown | `OnViewDestroys` (Expo) + destructor |

- iOS final cleanup goes in **`deinit`** (Expo's docs say use the native view's
  destructor on iOS, not a module hook).
- Expo's **`OnViewDestroys`** ("called right after the view is no longer used by
  React Native") is **Android-only**; pair with `onDetachedFromWindow()`.
- Module/app lifecycle listeners live in the module `definition()`:
  `OnAppEntersForeground` / `OnAppEntersBackground` (iOS) + `OnActivity…` Android
  twins, plus `OnDestroy`. App-delegate events
  (`applicationDidReceiveMemoryWarning`, …) via `ExpoAppDelegateSubscriber`.
  ([Expo Modules API — module/view lifecycle](https://docs.expo.dev/modules/module-api);
  [App delegate subscribers](https://docs.expo.dev/modules/appdelegate-subscribers))

> Design rule: do **window-tied** work (start/pause loop) in the attach/detach
> pair; do **idempotent final release** in `deinit` (iOS) / `OnViewDestroys` +
> `onDetachedFromWindow` (Android). Final release must be safe to run twice —
> detach can fire before destroy, and recycling reuses the view.

**Fabric view-flattening — RESOLVED, no native opt-out needed.** Flattening only
merges **Layout-Only nodes** — a plain `<View>` (not a subclass) with no event
listeners, no `nativeID`, not an accessibility element, full opacity, no
background color. A **custom native host component backed by a view manager**
(which `ShaderView` is — it owns a Metal surface, declares `Events`, has a real
native footprint) is **never** a flattening candidate.
([RN — View Flattening](https://reactnative.dev/architecture/view-flattening);
[View Flattening on iOS — RN New Arch WG #110](https://github.com/reactwg/react-native-new-architecture/discussions/110))
- The native `ShaderView` does **NOT** auto-flatten and needs **no
  `collapsable={false}`** on itself — opt-out is automatic. Do **not** ship a
  `collapsable` prop on the native side.
- The only risk is the **JS wrapper**: if the public `<ShaderView>` wraps children
  in a plain layout-only RN `<View>`, *that* wrapper can be flattened. Harmless for
  the shader surface (it's the native view); but a child container that must
  survive as a real view (gestures/layout) needs `collapsable={false}` (and
  `collapsableChildren={false}` to protect its children).

**View recycling / reuse (Fabric) — with Metal state.** Fabric **recycles host
views**: an unmounted view enters a pool and is re-bound to a new shadow node.
**On by default on iOS**; on Android behind `enableViewRecycling` +
`setupViewRecycling`.
([RN New Arch — view recycling](https://swmansion.com/blog/react-natives-new-architecture-the-tricky-parts-1-2-bb0c16950f2d/))

A recycled `ShaderView` carries **stale GPU state** (previous pipeline, uniform
contents, paused/animating flag, time origin). The rebind reset must:
- **Keep the expensive, identity-stable resources** — `MTLDevice`,
  `MTLCommandQueue`, the `MTLLibrary`, and (if the shader id is unchanged) the
  cached `MTLRenderPipelineState` — to avoid rebuilding on every rebind.
- **Reset the per-bind state** — re-resolve shader id from fresh props, reset the
  uniform struct/buffer, reset the animation clock (time origin), set `isPaused`
  from fresh props, re-evaluate `enableSetNeedsDisplay` (animated vs static).
- Make **`OnViewDidUpdateProps` fully self-sufficient** — resolve the complete
  shader+uniform config from current props, never assume prior state. That alone
  makes a recycled iOS view correct (recycling is default-on there).
- **Do not opt the fx view into Android `enableViewRecycling` in V1** — Expo
  Modules doesn't yet surface a `prepareToRecycleView` reset hook for us to route
  to `resetToDefault()`; let create/destroy run and revisit if profiling shows
  churn. (iOS leads; the Android Metal backend is later anyway.)

> The recycling pool is cleared under memory pressure, so a view may be **truly
> destroyed at any time** — another reason teardown must be complete and
> idempotent, and a reason to drop the heavy GPU refs (pipeline cache/library/
> buffers) and the registry entry on real destroy even though recycling keeps them.

### 8. Device fragmentation
- **iOS Metal** is available on all supported devices (A7+); no Metal floor for
  V1's iOS-only `ShaderView`. ProMotion devices report higher
  `preferredFramesPerSecond` / wider `preferredFrameRateRange` — honor the
  display's max, don't hardcode 60.
- **Android** has no Metal; a future backend (AGSL `RuntimeShader` API 33+ /
  RenderEffect API 31+ / Skia) is divergent and out of scope here beyond "release
  whatever surface that backend created."

### Teardown snippets

**iOS (Swift) — `ShaderView` base, `ExpoView` subclass, `MTKView` path.** (The
renderer that owns queue/library/pipeline-cache/uniforms lives in `08`; this
focuses on the lifecycle contract.)

```swift
import ExpoModulesCore
import MetalKit

final class ShaderView: ExpoView, MTKViewDelegate {
  private var mtkView: MTKView?
  private var device: MTLDevice?           // process-global; just drop the ref
  private var commandQueue: MTLCommandQueue?   // once per device, reused per frame
  private var library: MTLLibrary?             // makeDefaultLibrary(bundle:) once
  private var pipelineCache: [ShaderId: MTLRenderPipelineState] = [:]  // per id
  private var pipeline: MTLRenderPipelineState?
  private var uniformBuffer: MTLBuffer?    // nil in V1 (setFragmentBytes path)
  private var isForeground = true

  // Start/stop the loop with window membership — pause, not destroy, so a quick
  // re-attach (recycling) doesn't rebuild the pipeline/library.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    updatePausedState()
  }

  func onAppForeground() { isForeground = true;  updatePausedState() }
  func onAppBackground() { isForeground = false; updatePausedState() }

  private func updatePausedState() {
    // Loop runs ONLY when on-window AND foreground. (Mandatory for a GPU loop.)
    mtkView?.isPaused = !(window != nil && isForeground)
  }

  // MTKViewDelegate: acquire the drawable late, never store it; autorelease pool
  // drains the per-frame drawable + command buffer promptly.
  func draw(in view: MTKView) {
    autoreleasepool {
      guard !view.isPaused,
            let drawable = view.currentDrawable,
            let rpd = view.currentRenderPassDescriptor,
            let queue = commandQueue,
            let pipeline = pipeline,
            let cmd = queue.makeCommandBuffer(),
            let enc = cmd.makeRenderCommandEncoder(descriptor: rpd) else { return }
      enc.setRenderPipelineState(pipeline)
      // V1 uniforms: implicit bytes (no MTLBuffer to alloc/reuse/free):
      //   enc.setFragmentBytes(&uniforms, length: ..., index: 0)
      if let ub = uniformBuffer { enc.setFragmentBuffer(ub, offset: 0, index: 0) }
      // ... encode full-screen draw (08 §3) ...
      enc.endEncoding()
      cmd.present(drawable)   // present, not retain
      cmd.commit()
    }
  }

  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  /// Idempotent. Safe from teardown AND from a recycling reset (runs twice).
  /// Steps 1 + 3 of the teardown order; keeps device/queue/library for fast rebind.
  func resetToDefault() {
    mtkView?.isPaused = true          // 1. stop loop first
    mtkView?.delegate = nil           // delegate is weak, but be explicit
    pipeline = nil                    // 3. release pipeline + uniform buffers
    pipelineCache.removeAll()         //    (kept across rebind in recycling; see §7)
    uniformBuffer = nil
    // library kept for fast rebind; dropped in deinit.
  }

  deinit {
    // Final release. deinit not firing => retain cycle:
    //   - CADisplayLink target (raw-layer path) not invalidated, or
    //   - renderer/closure holding the view strongly.
    resetToDefault()
    library = nil                     // 3. drop the default library
    commandQueue = nil                // 4. queue, then device, last
    device = nil
    // remove from the weak app-state registry here.
  }
}
```

**Raw `CAMetalLayer` + `CADisplayLink` fallback** (if not using MTKView),
mirroring Apple's sample — `invalidate()` is the teardown that breaks the display
link's strong hold on `self`:

```swift
override class var layerClass: AnyClass { CAMetalLayer.self }

override func didMoveToWindow() {
  super.didMoveToWindow()
  if window == nil { stopRenderLoop(); return }      // off-window: tear down link
  let link = CADisplayLink(target: self, selector: #selector(render))
  link.preferredFramesPerSecond = 60                 // or display max
  link.isPaused = !isForeground
  link.add(to: .current, forMode: .common)
  displayLink = link
}

@objc private func stopRenderLoop() {
  displayLink?.invalidate()                          // releases strong target ref
  displayLink = nil
}

deinit { stopRenderLoop() }                          // Apple does this too
```

**Android (Kotlin)** — no Metal; a future backend's surface is cleared in an
idempotent `resetToDefault()` wired from `OnViewDestroys` + `onDetachedFromWindow`.
(Out of scope for V1 iOS Metal.)

## Decisions
1. **Surface = `MTKView` (over its `CAMetalLayer`).** Created once in
   `ShaderView` init, started paused, released with the view; attach/detach only
   flips the loop, never re-allocs the surface. Raw `CAMetalLayer` +
   `CADisplayLink` stays documented as the fallback (we'd then own the layer and
   the link, and must `invalidate()` it).
2. **`MTLDevice`/`MTLCommandQueue` created once, reused every frame.** V1: one
   queue per renderer (simple, correct). If many-view churn shows up, switch to a
   **device-shared singleton** (one device + one queue per process) — the
   Apple-aligned "one queue per GPU" posture — and keep them across rebinds.
3. **Loop on `MTKView`'s internal display link via `draw(in:)`.** `isPaused` is
   the master switch; `enableSetNeedsDisplay = true` for static shaders
   (on-demand, cheap), continuous + `preferredFramesPerSecond` for animated ones.
   We do not hand-roll a `CADisplayLink` on this path.
4. **Library once, pipelines cached per id.** `makeDefaultLibrary(bundle:)` against
   `FxShaderShaders` runs **once**; each shader id's `MTLRenderPipelineState` is
   built once and cached; cache/library released on teardown, **kept** across a
   same-id rebind.
5. **Uniforms via `setFragmentBytes` (no `MTLBuffer` in V1).** Mutated in place,
   reused every frame, nothing to alloc/free. Explicit `MTLBuffer` + ring only if
   the block exceeds 4 KB or needs persistence; no input textures in V1.
6. **Background/off-window pause is MANDATORY.** Loop runs **only when**
   `window != nil` **AND** app foreground, via one `updatePausedState()` fed by
   `didMoveToWindow` and `OnAppEntersBackground/Foreground`. Never present or cache
   a `CAMetalDrawable` while paused; re-acquire fresh on resume.
7. **Teardown order & idempotency:** stop loop → drop delegate / invalidate link →
   release pipeline cache + library + uniform buffers/textures → release queue →
   drop device. Per-frame drawables/command buffers are never stored.
   `resetToDefault()` runs from `deinit` and recycling reset; safe to run twice.
8. **Retain-cycle discipline:** rely on `MTKView`'s **weak** delegate; hold the
   view weakly from any separate renderer; **always `invalidate()` the
   `CADisplayLink`** on off-window and `deinit`; `[weak self]` in every closure;
   weak refs in the app-state registry. If `deinit` doesn't fire, find the cycle.
9. **Flattening needs no native opt-out** — `ShaderView` is a custom host
   component, never Layout-Only. Only a JS-side children container that must
   survive carries `collapsable={false}`.
10. **Recycling:** make `OnViewDidUpdateProps` fully self-sufficient so iOS
    recycling (default-on) is correct; on rebind **keep device/queue/library/
    (same-id) pipeline, reset uniforms/clock/paused flag**. Do **not** opt into
    Android `enableViewRecycling` in V1.

## Open questions
- **Drawable behavior on resume — needs-device.** Confirm pausing on background
  then resuming reliably yields a fresh `currentDrawable` with no stall, across
  fast background↔foreground toggles (the failure mode others hit when they do
  *not* pause). Validate in the bottom-sheet / pager demos.
- **One queue per view vs device-shared singleton — needs-device.** Measure
  whether many simultaneous `ShaderView`s create meaningful queue/device churn
  that justifies the device-shared singleton, or whether per-renderer queues are
  fine at V1 scale.
- **`enableSetNeedsDisplay` vs continuous for the press/uniform path.** When a
  touch or `setUniform` should produce exactly one frame, does on-demand
  (`setNeedsDisplay()`) feel responsive enough, or do interactive shaders need a
  short continuous burst? — prototype.
- **`CAMetalDisplayLink` (iOS 17+) adoption.** Worth it over `MTKView`'s loop for
  ProMotion pacing, or unnecessary complexity for V1? — defer/measure.
- **Expo per-view recycling reset hook.** Does the pinned Expo SDK
  (`07-config-plugin-and-install.md`) expose a `prepareToRecycleView` equivalent?
  If so we can opt iOS into an explicit reset and reconsider Android recycling.
- **`deinit` / loop-stop actually firing — needs-device.** Verify in the three V1
  proof demos (aggressive mount/unmount) that the loop stops, drawables release,
  and `deinit` runs (no display-link/closure retain cycle).

## Sources
- Apple — `MTKView` (CAMetalLayer-backed, internal display-link loop, render
  modes, `currentDrawable`, `delegate`):
  https://developer.apple.com/documentation/metalkit/mtkview
- Apple — `MTKView.isPaused`:
  https://developer.apple.com/documentation/metalkit/mtkview/ispaused
- Apple — `MTKView.enableSetNeedsDisplay`:
  https://developer.apple.com/documentation/metalkit/mtkview/enablesetneedsdisplay
- Apple — `MTKView.preferredFramesPerSecond`:
  https://developer.apple.com/documentation/metalkit/mtkview/preferredframespersecond
- Apple — `MTKViewDelegate` (weak delegate; MetalKit drives the loop internally):
  https://developer.apple.com/documentation/metalkit/mtkviewdelegate
- Apple — Metal Best Practices: Persistent Objects (one `MTLDevice`/queue per GPU,
  build pipeline states once, reuse):
  https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/MTLBestPracticesGuide/PersistentObjects.html
- Apple — `makeCommandQueue()` (create once, reuse; `makeCommandBuffer()` per frame):
  https://developer.apple.com/documentation/metal/mtldevice/1433388-makecommandqueue
- Apple — `makeDefaultLibrary(bundle:)` (bundle default Metal library, run once):
  https://developer.apple.com/documentation/metal/mtldevice/2177054-makedefaultlibrary
- Apple — `setFragmentBytes(_:length:index:)` (implicit fragment buffer, <4 KB —
  no `MTLBuffer` in V1):
  https://developer.apple.com/documentation/metal/mtlrendercommandencoder/1516192-setfragmentbytes
- Apple — Creating a custom Metal view (`CAMetalLayer` + `CADisplayLink`,
  `didMoveToWindow`, `stopRenderLoop`/`invalidate`, `didEnterBackground`/
  `willEnterForeground` → paused, `nextDrawable`/`present`/`commit`):
  https://developer.apple.com/documentation/metal/creating-a-custom-metal-view
- Apple — `CAMetalDisplayLink.preferredFrameRateRange` (iOS 17+):
  https://developer.apple.com/documentation/quartzcore/cametaldisplaylink/preferredframeraterange
- Apple — `UIApplication.didEnterBackgroundNotification`:
  https://developer.apple.com/documentation/uikit/uiapplication/didenterbackgroundnotification
- Apple — `UIApplication.willEnterForegroundNotification`:
  https://developer.apple.com/documentation/uikit/uiapplication/willenterforegroundnotification
- Apple — `didMoveToWindow()`:
  https://developer.apple.com/documentation/uikit/uiview/1622527-didmovetowindow
- Expo Modules API — module/view lifecycle (`OnViewDestroys`, `OnDestroy`,
  `OnAppEntersBackground/Foreground`, `OnActivityEntersBackground/Foreground`,
  `ExpoView` base): https://docs.expo.dev/modules/module-api
- Expo — App delegate subscribers (`ExpoAppDelegateSubscriber`):
  https://docs.expo.dev/modules/appdelegate-subscribers
- React Native — View Flattening (Layout-Only criteria):
  https://reactnative.dev/architecture/view-flattening
- RN New Architecture WG — View Flattening on iOS (custom views excluded):
  https://github.com/reactwg/react-native-new-architecture/discussions/110
- RN New Architecture — view recycling, `enableViewRecycling`,
  `setupViewRecycling`, `prepareToRecycleView`:
  https://swmansion.com/blog/react-natives-new-architecture-the-tricky-parts-1-2-bb0c16950f2d/
- Cross-refs: `01-expo-modules-view.md` (ExpoView shell, hooks),
  `04-preset-system.md` (uniform resolution), `05-gestures-and-interaction.md`
  (interaction uniforms), `08-shader-accents-and-distribution.md` (owned resource
  model: library/pipeline cache/uniforms), `09-api-layering.md` (composition).
</content>
</invoke>
