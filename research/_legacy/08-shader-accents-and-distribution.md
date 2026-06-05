# iOS Metal shader surface & distribution
Status: researched
Feeds: skills/react-native-fx/references/shader-view.md

## Why this matters
This is the **core** of fx V1: an interactable native iOS Metal `ShaderView`.
The view is a UIKit/Expo view backed by a Metal surface (`MTKView` over a
`CAMetalLayer`) that renders **curated, build-time `.metal` fragment functions**
selected by id from JS. The native side owns the render loop, the per-frame
uniform updates (`time`/`resolution` + JS-set uniforms + native interaction),
and lifecycle. **JS does not drive frames.** This doc pins how that Metal engine
is hosted, how it renders, how uniforms reach the shader, and — the part this
pass **finalizes** — exactly how curated shaders are **bundled, loaded, and
selected by id** in the real scaffold (`packages/`), and what that forces on
`00` (scaffold/podspec) and `07` (config plugin).

This is the keystone distribution doc. The decisions in `## Decisions` are
final for V1 and feed `07`, `00`, and `04`. The scaffold is now real
(`packages/ios/FxShader.podspec`, `FxShaderModule.swift`, `FxShaderView.swift`,
`packages/expo-module.config.json`), so the bundling call is verified against
the **actual** pod (`name = FxShader`, `static_framework = true`), not a
hypothetical.

The previous framing of this doc — SwiftUI `.layerEffect`/`colorEffect` accents
over a glass base driven by `TimelineView` — is now **secondary** (a glass-accent
alternative, see §7 and `02-ios-glass-materials.md`). The default path is the
UIKit + Metal surface engine described here, because hosting RN content through
SwiftUI risks severing RN/RNGH touch (cross-ref `05-gestures-and-interaction.md`,
README constraint #4).

## Research questions
- How is the Metal surface **hosted** inside the Expo/UIKit `FxShaderView`
  (`ExpoView`)? `MTKView` (+ `MTKViewDelegate`) vs a raw `CAMetalLayer`?
- How do **RN children** layer around the surface (background-behind /
  overlay-pass-through / shader-only) per the thesis?
- What is the **render pipeline**: device, command queue, pipeline state,
  full-screen vertex stage + curated fragment shader, the per-frame encode?
- How is the **native render loop** owned and paused when idle/backgrounded
  (cross-ref `06-lifecycle-and-teardown.md`)?
- How do **uniforms** (`time`/`resolution` + JS-set + interaction) reach the
  fragment shader via an `MTLBuffer` / `setFragmentBytes`? Two-phase prop →
  uniform-buffer update (cross-ref `04-preset-system.md`).
- **(finalized this pass)** Where do `.metal` files **live**, and how does the
  **podspec** get the consumer's Xcode to compile them? `source_files` (into the
  app/pod default library) vs `resource_bundles` (a separate `.metallib` in a
  named resource bundle)?
- **(finalized this pass)** How are they **loaded at runtime**, and **which
  `Bundle`** do we pass for an Expo module shipped as a CocoaPods
  `static_framework`?
- **(finalized this pass)** How are functions **selected by id from JS** —
  registry shape, caching, unknown-id behavior?
- **(finalized this pass)** **App-local shaders vs curated-only** in V1.
- The iOS curated-`.metallib` vs Android-runtime (AGSL) distribution paths, and
  what runtime shader compilation is actually *possible* on each (it is possible
  on both — see §5.4).

## Findings

### 1. Hosting the Metal surface — `MTKView` is the default
`MTKView` (MetalKit) is "a view that creates, configures, and displays Metal
objects." It is **backed by a `CAMetalLayer`**, manages the drawable pool and an
internal `CADisplayLink`-driven render loop, and calls a delegate each frame.
This removes the boilerplate of hand-managing a `CAMetalLayer` (drawable
acquisition, resize, display link), so **V1 hosts an `MTKView` child inside the
`FxShaderView` `ExpoView`** rather than a raw layer.

Decisive `MTKView` properties (verified against Apple docs):

- `device: MTLDevice?` — must be set before drawing.
- `delegate: MTKViewDelegate?` — receives `draw(in:)` + `drawableSizeWillChange`.
- `currentDrawable: CAMetalDrawable?` — the drawable for the current frame.
- `currentRenderPassDescriptor: MTLRenderPassDescriptor?` — a pre-configured
  pass whose color attachment is the current drawable's texture; **accessing it
  implicitly acquires `currentDrawable`** for this frame.
- `colorPixelFormat` — default `.bgra8Unorm`; must match the pipeline state's
  color attachment format.
- `framebufferOnly` — default `true`; fine for render-only output.
- `isPaused` / `enableSetNeedsDisplay` / `preferredFramesPerSecond` — the loop
  controls (see §3/§6).
- `isOpaque` / `layer` (the `CAMetalLayer`) — set `isOpaque = false` for a
  **transparent shader surface** so background composition (RN children behind)
  shows through; also set the layer/clear color alpha accordingly.
- `presentsWithTransaction` — when `true`, present synchronously inside a
  `CATransaction` (relevant only if we ever need to sync Metal output with UIKit
  layout changes in the same frame; default `false` for V1).

Raw `CAMetalLayer` is the escape hatch (more control over drawable timing,
`maximumDrawableCount`, `EDR`), but it forces us to own the display link and
resize plumbing. **Decision: `MTKView` for V1; keep `CAMetalLayer` notes for a
later low-level pass.** This refines the open question carried from
`01-expo-modules-view.md` (MTKView child vs CAMetalLayer ownership).

```swift
// FxShaderView.swift — hosting the MTKView (extends the 01 shell)
import ExpoModulesCore
import MetalKit

open class FxShaderView: ExpoView {
  let metalView = MTKView()
  private var renderer: FxMetalRenderer?

  required public init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    guard let device = MTLCreateSystemDefaultDevice() else { return }
    metalView.device = device
    metalView.colorPixelFormat = .bgra8Unorm
    metalView.framebufferOnly = true
    metalView.isOpaque = false                  // transparent surface for composition
    metalView.layer.isOpaque = false
    metalView.clearColor = MTLClearColorMake(0, 0, 0, 0)
    metalView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    metalView.enableSetNeedsDisplay = false     // continuous loop (see §3)
    metalView.isPaused = true                   // start paused; unpause on attach
    insertSubview(metalView, at: 0)             // index 0 = background composition
    renderer = FxMetalRenderer(device: device, view: metalView)
    metalView.delegate = renderer
  }

  open override func layoutSubviews() {
    super.layoutSubviews()
    metalView.frame = bounds
  }
}
```

### 2. RN child composition modes
The Metal surface is a normal UIKit subview; RN children remain real RN/native
views layered around it — **not** sampled by the shader (README thesis; the
`shaderOnly | background | overlay` enum from `01`). Composition is native
view-ordering, not JS magic:

- **`background`** — `metalView` inserted at z-index 0 (`insertSubview(_, at:0)`);
  RN children render above it. The shader is a live animated backdrop. Surface is
  transparent only where the shader outputs alpha < 1.
- **`overlay`** — `metalView` inserted **above** RN children
  (`addSubview`), with **pass-through hit-testing** so touches reach the RN
  content below. Implemented by returning `nil` from the surface's `hitTest`
  unless `interactionMode` claims the gesture (cross-ref `05`). The shader
  decorates (sheen/grain/glow) over content it does not sample.
- **`shaderOnly`** — the surface fills the view and is the single interactive
  unit; no RN children participate in interaction.

> Pass-through detail: for `overlay`, set the `MTKView` (or `FxShaderView`)
> `hitTest` to ignore touches in non-interactive regions so RN children stay
> touchable. Live content-sampling of the RN subtree while preserving child touch
> remains the hard, out-of-scope problem (README; `05`).

### 3. Render pipeline
One-time setup (in the renderer init), then a per-frame encode.

**One-time objects:**
- `MTLDevice` — `MTLCreateSystemDefaultDevice()`.
- `MTLCommandQueue` — `device.makeCommandQueue()`; created **once**, reused every
  frame (never per-frame).
- `MTLLibrary` — the curated shaders, loaded from the **build-time metallib in
  the module's resource bundle** (see §5).
- `MTLRenderPipelineState` — built from a `MTLRenderPipelineDescriptor` whose
  `vertexFunction` is the shared full-screen vertex stage and `fragmentFunction`
  is the **selected curated fragment function**; its
  `colorAttachments[0].pixelFormat` must equal `metalView.colorPixelFormat`.
  Built once per selected shader (rebuild only when `shader` id changes) and
  **cached per id** (see §5.3); for a transparent surface, configure
  `colorAttachments[0]` blending if needed.

**Full-screen geometry — no vertex buffer.** The vertex stage generates a
full-screen triangle from `vertex_id` (3 invocations, covers the viewport), so
there is no vertex buffer to bind and the fragment shader runs once per pixel.

```metal
// FxFullscreen.metal — shared vertex stage (shipped once)
#include <metal_stdlib>
using namespace metal;

struct VSOut { float4 position [[position]]; float2 uv; };

vertex VSOut fx_fullscreen_vertex(uint vid [[vertex_id]]) {
  // Oversized triangle covering clip space; uv in [0,1].
  float2 p = float2((vid << 1) & 2, vid & 2);   // (0,0),(2,0),(0,2)
  VSOut o;
  o.position = float4(p * 2.0 - 1.0, 0.0, 1.0);
  o.uv = float2(p.x, 1.0 - p.y);
  return o;
}
```

```metal
// Aurora.metal — a curated fragment function (selected by id from JS)
#include <metal_stdlib>
using namespace metal;

struct FxUniforms {            // MUST match the Swift layout (§4)
  float  time;
  float2 resolution;
  float2 touch;                // native interaction (see 05)
  float  intensity;            // example JS-set uniform
};

fragment half4 fx_aurora(VSOut in [[stage_in]],
                         constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  float t = u.time;
  // ... generative output, uses u.resolution / u.touch / u.intensity ...
  half3 c = half3(0.5 + 0.5 * cos(t + uv.xyx + half3(0,2,4)));
  return half4(c, 1.0h);
}
```

**Per-frame encode (in `draw(in:)`):**
1. `guard let drawable = view.currentDrawable,
   let rpd = view.currentRenderPassDescriptor else { return }` — bail if the
   drawable pool is exhausted (don't block).
2. `let cmd = commandQueue.makeCommandBuffer()`.
3. `let enc = cmd.makeRenderCommandEncoder(descriptor: rpd)`.
4. `enc.setRenderPipelineState(pipelineState)`.
5. Bind uniforms (§4): `enc.setFragmentBytes(&uniforms, length: ..., index: 0)`.
6. `enc.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)`.
7. `enc.endEncoding()`.
8. `cmd.present(drawable)` then `cmd.commit()`.

```swift
// FxMetalRenderer.swift
final class FxMetalRenderer: NSObject, MTKViewDelegate {
  private let device: MTLDevice
  private let queue: MTLCommandQueue
  private var pipeline: MTLRenderPipelineState?
  private var pipelineCache: [ShaderId: MTLRenderPipelineState] = [:]   // §5.3
  private let library: MTLLibrary?                                       // §5.2
  private var uniforms = FxUniforms()        // mirrors the MSL struct (§4)
  private let start = CACurrentMediaTime()

  init?(device: MTLDevice, view: MTKView) {
    self.device = device
    guard let q = device.makeCommandQueue() else { return nil }
    self.queue = q
    self.library = FxShaderLibrary.load(device: device)   // §5.2 — resource bundle
    super.init()
    setShader(.default)
  }

  func setShader(_ id: ShaderId) {
    if let cached = pipelineCache[id] { pipeline = cached; return }      // §5.3
    guard let lib = library,
          let vfn = lib.makeFunction(name: "fx_fullscreen_vertex"),
          let ffn = lib.makeFunction(name: id.functionName) else {
      // §5.4 unknown / missing → fall back to default if not already trying it
      if id != .default { setShader(.default) }
      return
    }
    let d = MTLRenderPipelineDescriptor()
    d.vertexFunction = vfn
    d.fragmentFunction = ffn
    d.colorAttachments[0].pixelFormat = view.colorPixelFormat
    guard let state = try? device.makeRenderPipelineState(descriptor: d) else { return }
    pipelineCache[id] = state
    pipeline = state
  }

  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
    uniforms.resolution = SIMD2(Float(size.width), Float(size.height))
  }

  func draw(in view: MTKView) {
    guard let pipeline,
          let drawable = view.currentDrawable,
          let rpd = view.currentRenderPassDescriptor,
          let cmd = queue.makeCommandBuffer(),
          let enc = cmd.makeRenderCommandEncoder(descriptor: rpd) else { return }
    uniforms.time = Float(CACurrentMediaTime() - start)   // native-injected
    enc.setRenderPipelineState(pipeline)
    enc.setFragmentBytes(&uniforms, length: MemoryLayout<FxUniforms>.stride, index: 0)
    enc.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    enc.endEncoding()
    cmd.present(drawable)
    cmd.commit()
  }
}
```

### 4. Uniforms — native-injected + JS-set + interaction
All shader inputs travel in **one small `MTLBuffer`-equivalent struct** bound at
fragment buffer index 0. For V1 the struct is well under the **4 KB limit** for
`setFragmentBytes`, so we use the implicit-bytes path (no explicit `MTLBuffer`
allocation, no manual triple-buffering). If the uniform block ever exceeds 4 KB
or needs persistence, switch to an explicit `device.makeBuffer` +
`setFragmentBuffer(_:offset:index:)` with a ring of buffers.

Three uniform sources, all updated **natively**, never per-frame from JS:

- **`time`** — injected by the renderer each `draw(in:)` from `CACurrentMediaTime`
  (or the frame's `targetTimestamp`). This is the only thing that must change
  every frame, and it never crosses the bridge.
- **`resolution`** — set in `drawableSizeWillChange` (pixel drawable size).
- **JS-set uniforms** (`intensity`, color, …) — flow through the **two-phase
  prop rule** from `04`: JS resolves preset + overrides into one flat `uniforms`
  Record; `Prop("uniforms")` **stashes** it; `OnViewDidUpdateProps` writes it
  **once** into the renderer's `uniforms` struct (a coherent snapshot, on the UI
  thread). The render loop then simply reads the latest struct each frame.
- **Interaction uniforms** (`touch`, `pressed`/highlight) — written by the native
  press recognizer's callbacks (cross-ref `05`); `setHighlight`/`setPressed`
  `AsyncFunction`s (from `01`) and the recognizer both mutate the same struct.
  Because the render loop reads the struct every frame, interaction is reflected
  immediately with **no per-pointer bridge traffic**.

```swift
// Swift mirror of the MSL FxUniforms (field order + alignment MUST match).
struct FxUniforms {
  var time: Float = 0
  var resolution: SIMD2<Float> = .zero
  var touch: SIMD2<Float> = .zero
  var intensity: Float = 1
}
// applied once per batch (phase 2):
func applyResolvedConfig() {
  renderer?.setShader(pending.shader)                 // rebuild/select pipeline if id changed
  renderer?.setUniforms(pending.uniforms)             // write JS-resolved values
}
```

> Alignment caveat (needs-device): MSL packs `float2` on an 8-byte boundary;
> keep the Swift `struct` and the MSL `struct` field order identical and verify
> `MemoryLayout.stride` matches the shader's expectation, or pad explicitly.

### 5. Curated build-time shader distribution — FINALIZED for the real scaffold
**Runtime MSL compilation *is* possible on iOS** via
`MTLDevice.makeLibrary(source:options:)`, a public, App-Store-safe API that
compiles MSL source on-device into an `MTLLibrary`
([Apple docs](https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary)).
The "build-time only" wall applies **only** to the SwiftUI
`.layerEffect`/`ShaderLibrary` path (§7), which needs a precompiled `.metallib` —
not to the `MTKView` + `MTLRenderPipelineState` engine fx actually uses. So fx
*could* compile dev-supplied MSL at runtime; **V1 instead ships curated `.metal`
files compiled at build time by the consumer's Xcode** — a deliberate scope
choice (see §5.4 / Decision 8), not a platform limit. At runtime we load that
prebuilt library and select functions **by id from JS**. The subtle parts of the
curated path are (a) how the **podspec** makes Xcode compile the `.metal` and
**where the metallib lands** given `static_framework = true`, and (b) **which
`Bundle`** to read at runtime.

#### 5.1 Where `.metal` lives + the exact podspec change
- **Location:** `packages/ios/Shaders/<Name>.metal` — the shared vertex stage
  `Shaders/FxFullscreen.metal` plus one file per curated fragment
  (`Shaders/Aurora.metal`, `Shaders/Ripple.metal`, `Shaders/Spotlight.metal`).

- **`source_files` is the wrong home for a static framework.** Putting `.metal`
  in `source_files` makes Xcode compile them into a `default.metallib`, but a
  **static framework / static library has no framework bundle to write that
  metallib into** — it ends up next to the `.a` with no reliable, named lookup
  target. The current podspec glob (`"**/*.{h,m,mm,swift,hpp,cpp}"`) doesn't even
  match `.metal`, so today they wouldn't compile at all. **Do not rely on the
  default-library-into-the-app-target path** for a redistributable Expo module.

- **Decision — `resource_bundles` + `METAL_LIBRARY_OUTPUT_DIR`.** Declare a
  named resource bundle and redirect the Metal compiler's output into it. This
  produces a `default.metallib` inside a stable `FxShaderShaders.bundle`,
  regardless of static-vs-dynamic linkage. Exact podspec change (replaces the
  single `source_files` line in `packages/ios/FxShader.podspec`):

  ```ruby
  # Compile Swift/ObjC as before; .metal handled via the resource bundle below.
  s.source_files   = "**/*.{h,m,mm,swift,hpp,cpp}"

  # Curated build-time shaders → a named resource bundle holding default.metallib.
  s.resource_bundles = {
    'FxShaderShaders' => ['Shaders/**/*.metal']
  }

  # Redirect the Metal compiler output into that bundle so the metallib is
  # discoverable at runtime. (static framework: write into the .bundle root.)
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaderShaders.bundle',
  }
  ```

  > Notes for `00`: `resource_bundles` (plural, hash form) is required so the
  > `.metallib` is namespaced and not clobbered under static linking. The
  > `Shaders/**/*.metal` glob is the build *input*; the metallib is the build
  > *output* CocoaPods packages into `FxShaderShaders.bundle`. The xcconfig key
  > is the modern `MTL_LIBRARY_OUTPUT_DIR` (older docs show
  > `METAL_LIBRARY_OUTPUT_DIR`; both have been used — `00` should verify the
  > active spelling against the toolchain in the pinned SDK 56 build and adjust
  > if the bundle comes out empty). Keep `s.platforms` iOS-only-relevant for
  > Metal; tvOS inherits.

#### 5.2 How to load at runtime — which `Bundle`
With a resource bundle, the compiled library is `default.metallib` **inside
`FxShaderShaders.bundle`**, not in the framework's own default library. So:

- **Locate the resource bundle** relative to the module's framework bundle, with
  a fallback to the main app bundle (covers both linkage modes: a static lib
  copies the `.bundle` into the **app**'s resources; a dynamic framework keeps it
  in the **framework**'s resources). The anchor class is from the pod:
  `Bundle(for: FxShaderModule.self)`.
- **Create the library** via `device.makeDefaultLibrary(bundle:)` on the
  **resource bundle** (it loads that bundle's `default.metallib`). Equivalent
  fallback: resolve the `default.metallib` URL and call `device.makeLibrary(URL:)`.

```swift
// FxShaderLibrary.swift — robust resource-bundle lookup for an Expo CocoaPod.
import Metal

enum FxShaderLibrary {
  private static let bundleName = "FxShaderShaders"   // matches the podspec key

  static func resourceBundle() -> Bundle? {
    let candidates: [URL?] = [
      Bundle(for: FxShaderModule.self).resourceURL,   // dynamic framework case
      Bundle.main.resourceURL,                        // static-lib-into-app case
      Bundle.main.bundleURL,
    ]
    for base in candidates.compactMap({ $0 }) {
      let url = base.appendingPathComponent("\(bundleName).bundle")
      if let b = Bundle(url: url) { return b }
    }
    return nil
  }

  static func load(device: MTLDevice) -> MTLLibrary? {
    guard let bundle = resourceBundle() else { return nil }
    // Reads default.metallib inside FxShaderShaders.bundle.
    if let lib = try? device.makeDefaultLibrary(bundle: bundle) { return lib }
    if let url = bundle.url(forResource: "default", withExtension: "metallib") {
      return try? device.makeLibrary(URL: url)
    }
    return nil
  }
}
```

> Why **not** plain `device.makeDefaultLibrary(bundle: Bundle(for: FxShaderModule.self))`
> alone: for a *static* framework the metallib is not in the framework bundle's
> default library — it's in the **resource bundle** we redirected it into. The
> resource-bundle lookup above is the linkage-agnostic mechanism. (Needs-device:
> confirm the bundle name CocoaPods emits — historically `<BundleKey>.bundle` —
> for the pinned SDK 56 / RN 0.85 / CocoaPods setup; adjust `bundleName` if it's
> name-mangled.)

#### 5.3 Function selection by id — the curated registry
A single curated registry is the source of truth, mirrored on both sides:

- **TS (cross-ref `04`/`09`):** a string-literal union is the public `shader`
  prop type, e.g.
  `export type ShaderId = 'aurora' | 'ripple' | 'spotlight';`
  (`'default'` aliases the first). JS resolves preset + overrides into the flat
  `uniforms` Record per `04`; only the **id string** crosses to native.
- **Native:** a `ShaderId: String, Enumerable` enum maps each id to its MSL
  function name. This enum **is** the registry; adding a curated shader = add a
  `.metal` file (§5.1) + one enum case.

```swift
enum ShaderId: String, Enumerable {
  case `default`, aurora, ripple, spotlight
  var functionName: String {
    switch self {
    case .default, .aurora: return "fx_aurora"
    case .ripple:           return "fx_ripple"
    case .spotlight:        return "fx_spotlight"
    }
  }
}
```

- **Resolve → pipeline → cache.** `setShader(id)` looks up `pipelineCache[id]`
  first; on miss it `library.makeFunction(name: id.functionName)`, builds the
  `MTLRenderPipelineState`, and **caches it per id** (built once, reused on every
  later switch — no per-switch recompile after the first). Optionally
  pre-warm all curated pipelines at init (startup cost vs first-switch hitch —
  see Open questions).
- **Unknown / missing id → default fallback (no crash).** Because `Enumerable`
  already rejects strings outside the union at the bridge, an "unknown id" in
  practice means a curated id whose function failed to resolve (e.g. metallib not
  found, name typo). `setShader` then falls back to `.default` exactly once
  (guarded against infinite recursion). Net: the surface always renders
  *something*; it never hard-fails on a bad id.

#### 5.4 No dev-authored MSL source in V1 — by scope choice, not platform limit
No `source={msl}` prop in V1. This is a **deliberate scope / product decision**,
**not** an iOS capability gap: runtime MSL compilation *is* feasible on iOS via
[`MTLDevice.makeLibrary(source:options:)`](https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary)
(public, App-Store-safe), so a runtime `source` prop — iOS `makeLibrary(source:)`
+ Android AGSL `RuntimeShader` — is a feasible **post-V1 escape hatch on both
platforms**. V1 stays curated-only because curation *is* the value, and a runtime
user-shader path adds real cost: async (slower) MSL compile → first-frame jank
(must cache pipelines), compile-error fallback UX, maintaining the MSL-vs-AGSL
authoring split, and security/validation of arbitrary GPU code. See §3 of
`## Decisions` for the full curated-only ruling and the post-V1 path.

**iOS (curated `.metallib`) vs Android (runtime AGSL) — the V1 distribution
paths** (Android is a later backend). Both platforms *can* compile shader source
at runtime; the table reflects what V1 actually *uses*, not what's possible:

| | iOS (MSL) | Android (AGSL) |
|---|---|---|
| Shader form | `.metal` functions | AGSL string/resource |
| Compiled (V1 path) | **build time** → `default.metallib` in `FxShaderShaders.bundle` | **runtime** → `RuntimeShader("…")` from a string |
| Loaded by | `makeDefaultLibrary(bundle:)` + `makeFunction(name:)` | `RuntimeShader` ctor |
| Runtime source possible? | ✅ yes — `makeLibrary(source:)` (async compile; not used in V1 by choice) | ✅ yes — it's a string |
| Selection | function name by id | the curated AGSL string by id |

Each curated shader is therefore a **`{ ios: "<msl fn name>", android: "<agsl>" }`
pair** maintained by us. A build-pipeline single-source (author once in
GLSL/SkSL, transpile to MSL+AGSL via SPIRV-Cross/naga) stays an option but is not
required for the initial small set; it does **not** ship Skia.

### 6. The native render loop (cross-ref `06`)
The loop is **owned natively** by `MTKView`'s internal `CADisplayLink`:
`enableSetNeedsDisplay = false` → continuous; `draw(in:)` is called each display
frame. `time` is injected there. The loop must **pause when idle/backgrounded**:

- Pause via `metalView.isPaused = true` (or `enableSetNeedsDisplay` + explicit
  `setNeedsDisplay()` for on-demand). Start paused; unpause when the view is
  attached and on-screen.
- Tie pause/resume to the lifecycle hooks pinned in `06`: `didMoveToWindow`
  (pause when `window == nil`), and the module-level
  `OnAppEntersBackground`/`OnAppEntersForeground` fan-out to a weak registry of
  live shader views. A backgrounded app stops compositing anyway, but pausing the
  display link avoids needless GPU work and battery drain.
- `preferredFramesPerSecond` caps the rate (e.g. 30/60) for cheaper effects.
- Teardown (`06`): on `deinit`/destroy, set `delegate = nil`, `isPaused = true`,
  drop the renderer (which releases pipeline cache, library, command queue).
  Final release must be idempotent.

This makes the V1 GPU surface a real owned resource — so the `06` background/
pause hook that was "empty for V1" under the glass framing now has a concrete
consumer: **pause the Metal loop**.

### 7. Secondary: SwiftUI `.layerEffect` glass-accent alternative
Demoted from the previous core framing. A SwiftUI-hosted accent —
`TimelineView(.animation)` driving a `[[stitchable]]` `.colorEffect`/
`.layerEffect`/`.distortionEffect` over a system-material/glass base — remains a
**secondary, glass-accent-only** option for the case where you want a generative
overlay on top of an interactive Liquid Glass surface **without** owning a Metal
engine. `TimelineView` is the loop (auto-pauses offscreen); inject `time` from
`context.date` and `size` from the `.visualEffect` proxy. **This is the one path
that is genuinely build-time-only:** `.layerEffect`/`ShaderLibrary` resolve
`[[stitchable]]` functions from a precompiled `.metallib` and have no runtime-MSL
entry point — unlike the `MTKView` engine above, which *can* compile MSL at
runtime via `makeLibrary(source:)`. That build-time constraint is part of why
this path stays secondary. **It is not the default
path** because hosting RN content in SwiftUI risks severing RN/RNGH touch
(README #4; `05`). For the interactive surface use the UIKit + `MTKView` engine
above. Detail of the glass base lives in `02-ios-glass-materials.md`.

## Decisions

1. **Default = UIKit + `MTKView` engine.** Host an `MTKView` (CAMetalLayer-backed)
   inside the `FxShaderView` `ExpoView`; the renderer is the `MTKViewDelegate`.
   Raw `CAMetalLayer` is a later low-level option.

2. **Full-screen-triangle vertex stage (no vertex buffer) + curated fragment
   function**; one `MTLRenderPipelineState` per selected shader, **cached per id**
   (rebuilt only on first use of an id, never re-encoded after); command queue
   created once and reused.

3. **Native-owned render loop** via `MTKView`'s display link; `time` injected in
   `draw(in:)`; **paused when idle/backgrounded** (ties to `06`). JS never drives
   frames.

4. **One uniform struct at fragment buffer index 0** via `setFragmentBytes`
   (under 4 KB); `time`/`resolution` native-injected; JS uniforms applied once in
   `OnViewDidUpdateProps` (two-phase, `04`); interaction uniforms written by the
   native recognizer (`05`). No per-frame/per-pointer bridge traffic.

5. **Bundling (FINAL).** Curated `.metal` live in `packages/ios/Shaders/<Name>.metal`.
   The podspec ships them via **`resource_bundles`** (NOT `source_files`), with the
   Metal compiler output redirected into that bundle:
   ```ruby
   s.resource_bundles = { 'FxShaderShaders' => ['Shaders/**/*.metal'] }
   s.pod_target_xcconfig = {
     'DEFINES_MODULE' => 'YES',
     'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaderShaders.bundle',
   }
   ```
   This produces `default.metallib` inside `FxShaderShaders.bundle` regardless of
   `static_framework`. `source_files` is rejected because the pod is
   `static_framework = true`, so a default library has no framework bundle to land
   in. (Mechanism + xcconfig verified against CocoaPods + Metal shipping guides;
   see Sources.)

6. **Runtime load (FINAL).** Resolve `FxShaderShaders.bundle` by checking, in
   order, `Bundle(for: FxShaderModule.self).resourceURL`, then
   `Bundle.main.resourceURL`/`bundleURL` (linkage-agnostic), then call
   **`device.makeDefaultLibrary(bundle:)`** on that resource bundle (fallback:
   `makeLibrary(URL:)` on `default.metallib`). Do **not** pass
   `Bundle(for: FxShaderModule.self)` directly to `makeDefaultLibrary` — for a
   static framework the metallib is in the resource bundle, not the framework's
   own default library. Pipeline states cached per id.

7. **Id selection (FINAL).** Curated registry = a TS string-literal union
   `ShaderId` (public `shader` prop, resolved in JS per `04`/`09`) mirrored by a
   native `ShaderId: String, Enumerable` enum mapping id → MSL function name.
   Native resolves `library.makeFunction(name:)` → `MTLRenderPipelineState`,
   cached per id. **Unknown / unresolvable id → fall back to `.default` once
   (no crash); the surface always renders.**

8. **Curated-library-only in V1 (FINAL) — a scope choice, not a platform limit.**
   The app developer does **not** author `.metal`. Only the library ships shaders
   (build-time compiled, selected by id). No `source={msl}` prop, no app-local
   `.metal` directory, no runtime user MSL **in V1**.
   Rationale (NOT "iOS can't"): runtime MSL compilation *is* possible on iOS via
   [`MTLDevice.makeLibrary(source:options:)`](https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary)
   — the build-time-only constraint is specific to the SwiftUI `.layerEffect`/
   `ShaderLibrary` path (§7), not the `MTKView` engine fx uses. V1 is curated-only
   because **curation is the product value**, and it keeps the **podspec, the
   config plugin (`07`), and the loader** simple while removing an entire class of
   cost: async-compile jank (must cache pipelines), compile-error fallback UX, the
   MSL-vs-AGSL authoring split, and security/validation of arbitrary GPU code.
   **Post-V1 path (deferred, FEASIBLE on both platforms):** a runtime `source`
   escape hatch — iOS `makeLibrary(source:)` (+ optionally app `.metal` compiled
   by the *app target* and discovered via the main bundle's default library), and
   Android AGSL `RuntimeShader`. Not in V1, but never impossible on iOS.

9. **Composition is native view-ordering** — background-behind / overlay-pass-
   through / shader-only; the shader does **not** sample RN children in V1.

10. **SwiftUI `.layerEffect`/`TimelineView` is a secondary glass-accent
    alternative**, not the default (cross-ref `02`).

### Feeds back into 07 and 00

These are the explicit, finalized asks the next wave must thread.

**00 (library standards & publishing — podspec / package scaffold) must:**
- Edit `packages/ios/FxShader.podspec` to add the curated shaders as a
  **resource bundle**, not source files:
  ```ruby
  s.resource_bundles = { 'FxShaderShaders' => ['Shaders/**/*.metal'] }
  ```
  and add `'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaderShaders.bundle'`
  to the existing `s.pod_target_xcconfig` (alongside `DEFINES_MODULE`). Verify the
  active xcconfig key spelling (`MTL_LIBRARY_OUTPUT_DIR` vs legacy
  `METAL_LIBRARY_OUTPUT_DIR`) against the SDK 56 toolchain; if the bundle comes
  out empty, switch spelling.
- Keep `s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"` for Swift/ObjC (it does
  **not** need to match `.metal`).
- Create `packages/ios/Shaders/` with `FxFullscreen.metal` + the curated
  fragments, and ensure the npm **`files` allowlist** (package.json / `.npmignore`
  — currently there is only `.npmignore`) **ships `ios/Shaders/**/*.metal`** so the
  `.metal` sources reach consumers. Confirm `ios/**` is published.
- `packages/expo-module.config.json` **stays as-is** (`{"platforms":["apple"],
  "apple":{"modules":["FxShaderModule"]}}`); no change needed for shader bundling.

**07 (config plugin & install) must:**
- **Drop the "app-local shader directory" open question.** V1 is
  curated-library-only (Decision 8), so the config plugin needs **NO** handling
  for app-provided `.metal` files: no copying app shaders into the project, no
  extra Xcode build phase for app MSL, no `.metal` directory option in the plugin
  config. Distribution is entirely inside the pod's resource bundle, compiled by
  the consumer's normal pod build. The plugin's iOS scope stays limited to
  whatever install/permissions wiring `07` already covers.
- If/when the post-V1 app-provided-shaders escape hatch lands, that becomes a new
  `07` open question — explicitly out of scope for V1.

## Open questions
- **Resource-bundle name (needs-device):** confirm CocoaPods emits the bundle as
  literally `FxShaderShaders.bundle` (not name-mangled) for the pinned SDK 56 /
  RN 0.85 / CocoaPods toolchain, and that `MTL_LIBRARY_OUTPUT_DIR` lands
  `default.metallib` at the bundle root (iOS) — adjust `bundleName` / output
  subpath if not. Ties to `00`/`07`.
- **Uniform struct alignment (needs-device):** confirm the Swift `struct` ↔ MSL
  `struct` layout/stride match (MSL `float2`/`float4` alignment vs Swift `SIMD`),
  or pad explicitly; verify `setFragmentBytes` length.
- **Transparent surface compositing (needs-device):** does an `isOpaque = false`
  `MTKView` with premultiplied-alpha clear color composite cleanly over RN
  children in `background` mode without halos? Confirm blend state on
  `colorAttachments[0]`.
- **Overlay pass-through (needs-device):** verify `hitTest` returning `nil` over
  the `MTKView` leaves RN children below fully touchable while `interactionMode`
  regions still claim gestures (ties to `05`).
- **Drawable starvation / cost:** confirm bailing when `currentDrawable` is `nil`
  is correct under load; profile `preferredFramesPerSecond` caps for cheap
  effects; verify the loop truly pauses on background (ties to `06`,
  **needs-device**).
- **Pipeline cache warm-up:** whether to pre-build all curated pipeline states at
  init vs lazily on first `shader` selection (startup cost vs first-switch hitch).

## Sources
- Apple — `MTKView` (CAMetalLayer-backed, `device`, `delegate`,
  `currentDrawable`, `currentRenderPassDescriptor`, `colorPixelFormat`,
  `framebufferOnly`, `isPaused`, `enableSetNeedsDisplay`,
  `preferredFramesPerSecond`, `presentsWithTransaction`, `isOpaque`):
  https://developer.apple.com/documentation/metalkit/mtkview
- Apple — `MTKViewDelegate` (`draw(in:)`, `mtkView(_:drawableSizeWillChange:)`):
  https://developer.apple.com/documentation/metalkit/mtkviewdelegate
- Apple — `currentDrawable`:
  https://developer.apple.com/documentation/metalkit/mtkview/currentdrawable
- Apple — Metal Best Practices: Drawables (acquire late, present + commit):
  https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/MTLBestPracticesGuide/Drawables.html
- Apple — `makeDefaultLibrary(bundle:)` (bundle's default Metal library, iOS 10+):
  https://developer.apple.com/documentation/metal/mtldevice/2177054-makedefaultlibrary
- Apple — `makeDefaultLibrary()` (no-arg reads the **main** app bundle's default
  library — why we pass the resource bundle instead):
  https://developer.apple.com/documentation/metal/mtldevice/1433380-makedefaultlibrary
- Apple — `makeLibrary(source:options:)` (compiles MSL **source at runtime**
  on-device into an `MTLLibrary`; public, App-Store-safe — proves iOS runtime MSL
  compilation is possible for the `MTKView` engine, making a post-V1 `source` prop
  feasible; the build-time-only constraint is specific to the SwiftUI
  `.layerEffect`/`ShaderLibrary` path):
  https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary
- Apple — `setFragmentBytes(_:length:index:)` (implicit fragment buffer, <4 KB):
  https://developer.apple.com/documentation/metal/mtlrendercommandencoder/1516192-setfragmentbytes
- Shipping `.metal` in a CocoaPod via `resource_bundles` +
  `METAL_LIBRARY_OUTPUT_DIR`, loading the metallib from the pod's bundle (the
  exact bundling mechanism finalized in §5/Decision 5–6):
  https://medium.com/techpro-studio/shipping-metal-shaders-within-a-cocoapod-a5ea4e70df91
- MetalPetal podspec (real-world `.metal` + resource-bundle precedent):
  https://github.com/MetalPetal/MetalPetal/blob/master/MetalPetal.podspec.json
- CocoaPods — Podspec syntax reference (`resource_bundles` vs `resources`,
  `pod_target_xcconfig`, static framework resource packaging):
  https://guides.cocoapods.org/syntax/podspec.html
- CocoaPods static-library/static-framework resource-bundle placement +
  `Bundle(for:)` runtime lookup (linkage-agnostic loader rationale):
  https://ajkmr7.medium.com/resource-bundling-in-cocoapods-decoded-81056270b145 ·
  https://developer.apple.com/forums/thread/52287
- Full-screen triangle from `vertex_id` (no vertex buffer):
  https://metalbyexample.com/up-and-running-2/
- Android AGSL runtime `RuntimeShader` (asymmetry note, later backend):
  https://developer.android.com/develop/ui/views/graphics/agsl/using-agsl
- Cross-refs: `00-library-standards-and-publishing.md` (podspec/`files`),
  `01-expo-modules-view.md` (ExpoView shell, two-phase props),
  `04-preset-system.md` (uniform resolution + shader id in JS),
  `05-gestures-and-interaction.md` (native interaction uniforms),
  `06-lifecycle-and-teardown.md` (loop pause/teardown),
  `07-config-plugin-and-install.md` (no app-local shader handling),
  `02-ios-glass-materials.md` (secondary glass-accent base),
  `09-api-layering.md` (`ShaderId` union, composition modes).
