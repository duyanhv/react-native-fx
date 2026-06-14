import ExpoModulesCore
import MetalKit
import QuartzCore
import simd

/// Stores uniforms passed to the fragment shader.
///
/// The field order matches the `FxUniforms` struct in the Metal source so the
/// native buffer can be copied directly into fragment argument memory.
internal struct FxUniforms {
  var time: Float = 0
  var resolution: SIMD2<Float> = .zero
  var intensity: Float = 0.8
  var pressDepth: Float = 0
  var touch = SIMD2<Float>(0.5, 0.5)
}

/// Renders the expo-view substrate through a Metal-backed `MTKView`.
///
/// JS configures semantic targets through props. Native owns the render loop,
/// uniforms, lifecycle pausing, and cooperative press recognizer.
internal final class FxSurfaceView: FxNativeView, MTKViewDelegate {
  // MARK: - Events

  /// Reports a completed shader press with a prefixed name that avoids React Native's reserved event.
  internal let onShaderPress = EventDispatcher()
  internal let onShaderPressIn = EventDispatcher()
  internal let onShaderPressOut = EventDispatcher()
  internal let onShaderLongPress = EventDispatcher()

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()

  // MARK: - Shared Metal context

  // The GPU resources are process-wide, not per-view. The system vends one default device
  // per process, a command queue is thread-safe and reusable, the compiled library is the
  // same bundled `default.metallib` for every surface, and a pipeline state depends only on
  // its two functions and the fixed pixel format below — so it is valid for every instance.
  // Sharing them is what lets a long list of motion wrappers avoid N devices/queues/libraries.
  // All access is on the main thread (Expo prop application and the `MTKView` display link).
  // The context is process-lived and never torn down; `deinit` releases only the per-view loop.
  private static let colorPixelFormat: MTLPixelFormat = .bgra8Unorm
  private static let sharedDevice = MTLCreateSystemDefaultDevice()
  private static let sharedCommandQueue = sharedDevice?.makeCommandQueue()
  private static let sharedLibrary = sharedDevice.flatMap(loadSharedLibrary)
  private static var pipelineCache: [String: MTLRenderPipelineState] = [:]

  // Runtime (bring-your-own) pipelines compiled from registry source via `makeLibrary(source:)`,
  // keyed by the full source string — which encodes the iOS platform, the fixed `fx_fragment`
  // entry point, and the default compile options — so two ids with different source never collide
  // and the same source never recompiles. Kept separate from the curated `pipelineCache` (keyed by
  // id over the bundled library), process-lived like it.
  private static var runtimePipelineCache: [String: MTLRenderPipelineState] = [:]

  // Prepended to every registered MSL source so a bring-your-own fragment can reference the fx
  // raster ABI. The field order MUST match `FxUniforms` above and the bundled `FxShaders.metal`.
  // The author supplies `fragment half4 fx_fragment(VSOut in [[stage_in]], constant FxUniforms &u
  // [[buffer(0)]])`; the bundled `fx_fullscreen_vertex` provides the vertex stage.
  private static let runtimePreamble = """
    #include <metal_stdlib>
    using namespace metal;
    struct FxUniforms { float time; float2 resolution; float intensity; float pressDepth; float2 touch; };
    struct VSOut { float4 position [[position]]; float2 uv; };
    """

  // MARK: - Private state

  // Allocated lazily on the first active shader (see `ensureEffectSurface`). A surface used
  // only as a content-motion wrapper never builds a GPU view, so wrapping a long list costs
  // nothing on the GPU.
  private var metalView: MTKView?

  private var uniforms = FxUniforms()
  private var targetPressDepth: Float = 0
  private let startTime = CACurrentMediaTime()

  // Stashed by prop setters, applied once per batch in `applyResolvedConfig()`.
  // Empty by default: a surface with no `shader` prop runs no effect, so no `MTKView` is
  // allocated and the content-motion container is never obscured. A non-empty default would
  // render a shader the consumer never asked for (and hide the wrapped content behind it).
  private var pendingShader = ""
  private var pendingIntensity: Float = 0.8
  private var pendingMode = "none"

  // Presence targets, stashed by prop setters and forwarded to the coordinator once per batch.
  private var pendingVisible = false
  private var pendingPreset = "transient"
  private var pendingAppear = true
  private var pendingPresenceMotion: FxPresenceMotion?

  // The last shader a load/error event was dispatched for, so the semantic events fire once
  // per change — never a per-frame stream. nil until the first shader is applied.
  private var lastDispatchedShader: String?

  private var pressHandler: FxPressHandler!

  /// A Fabric-invisible container that holds RN children so Fabric cannot clobber
  /// the animator's transform/opacity. The animator targets this container, not the
  /// outer `FxSurfaceView` that Fabric tracks.
  private let intermediateContainer = UIView()

  /// Captures the RN-assigned post-layout frame for synchronous native reads by the
  /// future content-motion driver. Nothing crosses to JS.
  internal private(set) var layoutObserver: FxLayoutObserver!

  /// Routes driver completion to the presence coordinator, the completion source for the FSM.
  internal var onContentAnimationCompletion: (() -> Void)?

  private var contentAnimationDriver: FxAnimationDriver!

  /// Turns the discrete `visible` target into an interruptible enter/exit envelope. A plain
  /// internal object — never bridged to JS.
  private var presenceCoordinator: FxPresenceCoordinator!

  private func makeContentAnimationDriver() -> FxAnimationDriver {
    return FxAnimationDriver(targetView: intermediateContainer) { [weak self] in
      self?.onContentAnimationCompletion?()
    }
  }

  /// Initializes the content-motion container only; the Metal surface is built lazily on the first active shader.
  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpIntermediateContainer()
    layoutObserver = FxLayoutObserver(observing: self)
    contentAnimationDriver = makeContentAnimationDriver()
    presenceCoordinator = FxPresenceCoordinator(surface: self)
    pressHandler = FxPressHandler(surface: self)
    onContentAnimationCompletion = { [weak presenceCoordinator] in
      presenceCoordinator?.handleDriverCompletion()
    }
  }

  deinit {
    contentAnimationDriver.cancel()
    layoutObserver?.invalidate()
    pressHandler.detach()
    tearDownMetal()
  }

  // MARK: - Setup

  /// Creates the intermediate container that holds RN children. Fabric does not track
  /// this view, so its transform/opacity cannot be overwritten by React Native commits.
  private func setUpIntermediateContainer() {
    intermediateContainer.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    intermediateContainer.frame = bounds
    addSubview(intermediateContainer)
  }

  /// Builds the Metal view on demand and adds it above the content container, paused.
  ///
  /// Called only when an effect actually becomes active, so a content-motion-only surface
  /// never allocates a GPU view. The view sits in front of the intermediate container, the
  /// z-order the old eager `bringSubviewToFront` produced.
  private func ensureEffectSurface() -> MTKView? {
    if let metalView {
      return metalView
    }
    guard let device = Self.sharedDevice else {
      return nil
    }

    let view = MTKView()
    view.device = device
    view.delegate = self
    view.framebufferOnly = true
    view.colorPixelFormat = Self.colorPixelFormat
    view.preferredFramesPerSecond = 60
    view.enableSetNeedsDisplay = false
    view.isPaused = true  // runs only while on-window and foregrounded
    view.isUserInteractionEnabled = false
    view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.frame = bounds
    addSubview(view)
    metalView = view
    return view
  }

  /// Loads the compiled shader library from the bundled curated Metal assets.
  private static func loadSharedLibrary(device: MTLDevice) -> MTLLibrary? {
    if let bundle = sharedBundle() {
      if let library = try? device.makeDefaultLibrary(bundle: bundle) {
        return library
      }
      if let url = bundle.url(forResource: "default", withExtension: "metallib"),
        let library = try? device.makeLibrary(URL: url)
      {
        return library
      }
    }
    return device.makeDefaultLibrary()
  }

  /// Resolves the resource bundle that contains the compiled Metal library.
  private static func sharedBundle() -> Bundle? {
    let host = Bundle(for: FxSurfaceView.self)
    let bases = [host.resourceURL, Bundle.main.resourceURL, host.bundleURL, Bundle.main.bundleURL]
    for base in bases.compactMap({ $0 }) {
      let url = base.appendingPathComponent("FxShaders.bundle")
      if let bundle = Bundle(url: url) {
        return bundle
      }
    }
    return nil
  }

  /// Releases the per-view loop. The shared Metal context is process-lived and not torn down.
  private func tearDownMetal() {
    metalView?.delegate = nil
    metalView?.isPaused = true
  }

  // MARK: - Pipeline

  // The curated shader ids, mirrored from the JS `CURATED_SHADER_IDS` catalog (hand-maintained
  // per platform, like the Android `CURATED_SHADER_IDS` set). Enforces "curated ids win": a
  // curated id never falls through to a registry-sourced runtime compile, even when it has no
  // interactive raster fragment.
  private static let curatedShaderIds: Set<String> = [
    "fractal-clouds", "ink-smoke", "liquid-chrome", "loop", "dots",
    "aurora", "noise-field", "plasma", "caustics", "edge-glow",
  ]

  /// Returns the render pipeline for a curated shader id from the process-wide cache,
  /// compiling and caching it on first request. Shared across instances because the library
  /// and pixel format are identical for every surface.
  private static func curatedPipeline(for shaderId: String) -> MTLRenderPipelineState? {
    if let cached = pipelineCache[shaderId] {
      return cached
    }
    guard let device = sharedDevice, let library = sharedLibrary else { return nil }
    guard let fragmentName = fragmentName(for: shaderId),
      let vertexFunction = library.makeFunction(name: "fx_fullscreen_vertex"),
      let fragmentFunction = library.makeFunction(name: fragmentName)
    else {
      return nil
    }

    let descriptor = MTLRenderPipelineDescriptor()
    descriptor.vertexFunction = vertexFunction
    descriptor.fragmentFunction = fragmentFunction
    descriptor.colorAttachments[0].pixelFormat = colorPixelFormat
    guard let state = try? device.makeRenderPipelineState(descriptor: descriptor) else {
      return nil
    }
    pipelineCache[shaderId] = state
    return state
  }

  /// Resolves the pipeline for a shader id. A curated id uses the bundled path only — curated ids
  /// win, so a curated id never falls through to a registry-sourced runtime compile (even a
  /// hosted-only curated id with no raster fragment reports no renderer). Any non-curated id falls
  /// back to a registry-sourced runtime compile. nil means no pipeline / no renderer. Note: despite
  /// the lookup-sounding name this can compile runtime MSL as a side effect (cached by source, so
  /// off the per-frame path — a cache miss runs only at prop-application time).
  private static func pipeline(for shaderId: String) -> MTLRenderPipelineState? {
    if let curated = curatedPipeline(for: shaderId) {
      return curated
    }
    // Curated ids win: never serve a registry source for a curated id. The registry is fed only by
    // `registerShader`, which already rejects curated-id collisions; this makes the rule
    // native-enforced rather than dependent on that JS guard.
    if curatedShaderIds.contains(shaderId) {
      return nil
    }
    guard let source = FxShaderRegistry.shared.source(for: shaderId) else {
      return nil
    }
    return runtimePipeline(forSource: source)
  }

  /// Compiles a registry-sourced MSL fragment at runtime via `makeLibrary(source:)` and links it
  /// with the bundled full-screen vertex, caching the pipeline by source. Returns nil when the
  /// source fails to compile or the bundled vertex is unavailable. Runs at prop-application time,
  /// not per frame, and only on a cache miss.
  private static func runtimePipeline(forSource source: String) -> MTLRenderPipelineState? {
    if let cached = runtimePipelineCache[source] {
      return cached
    }
    guard let device = sharedDevice, let library = sharedLibrary,
      let runtimeLibrary = try? device.makeLibrary(source: runtimePreamble + "\n" + source, options: nil),
      let fragmentFunction = runtimeLibrary.makeFunction(name: "fx_fragment"),
      let vertexFunction = library.makeFunction(name: "fx_fullscreen_vertex")
    else {
      return nil
    }

    let descriptor = MTLRenderPipelineDescriptor()
    descriptor.vertexFunction = vertexFunction
    descriptor.fragmentFunction = fragmentFunction
    descriptor.colorAttachments[0].pixelFormat = colorPixelFormat
    guard let state = try? device.makeRenderPipelineState(descriptor: descriptor) else {
      return nil
    }
    runtimePipelineCache[source] = state
    return state
  }

  /// Maps a curated shader id to its Metal raster fragment function, or nil when the
  /// interactive surface has no renderer for it. The interactive raster path implements a
  /// subset of the curated catalog; the rest render only on the hosted path. A nil here
  /// yields a nil pipeline, which surfaces as `onFxError` rather than a silent wrong shader.
  private static func fragmentName(for shaderId: String) -> String? {
    switch shaderId {
    case "fractal-clouds": return "fx_fractal_clouds"
    case "ink-smoke": return "fx_ink_smoke"
    case "liquid-chrome": return "fx_liquid_chrome"
    case "loop": return "fx_loop"
    case "dots": return "fx_dots"
    default: return nil
    }
  }

  // MARK: - Props

  /// Stashes the shader target until Expo finishes the prop batch.
  internal func setShader(_ value: String) {
    pendingShader = value
  }

  /// Stashes the intensity target until Expo finishes the prop batch.
  internal func setIntensity(_ value: Double) {
    pendingIntensity = Float(value)
  }

  /// Stashes the interaction target until Expo finishes the prop batch.
  internal func setInteractionMode(_ value: String) {
    pendingMode = value
  }

  /// Accepts the content-distort prop and does nothing: distorting live RN content means hosting
  /// it to sample it, which severs RN touch on iOS, so the capability is out-of-scope here. The
  /// setter exists only so the shared prop raises no "unsupported prop" noise; content renders
  /// normally. Android realizes this draw-time, where touch survives.
  internal func setContentDistortion(_ value: String) {}

  /// Stashes the presence visibility target until Expo finishes the prop batch.
  internal func setVisible(_ value: Bool) {
    pendingVisible = value
  }

  /// Stashes the presence preset until Expo finishes the prop batch.
  internal func setPreset(_ value: String) {
    pendingPreset = value
  }

  /// Stashes the explicit presence motion override until Expo finishes the prop batch.
  internal func setPresenceMotion(_ value: FxPresenceMotion?) {
    pendingPresenceMotion = value
  }

  /// Stashes whether the initial visible mount plays the enter envelope.
  internal func setAppear(_ value: Bool) {
    pendingAppear = value
  }

  internal override func applyResolvedConfig() {
    super.applyResolvedConfig()
    uniforms.intensity = min(max(pendingIntensity, 0), 1)
    updateEffectSurfaceVisibility()
    dispatchShaderLoadState()
    updateInteraction(mode: pendingMode)
    presenceCoordinator.update(
      visible: pendingVisible, appear: pendingAppear, preset: pendingPreset,
      motion: pendingPresenceMotion)
  }

  /// True once the surface has a non-zero laid-out size, so measured presence travel resolves to
  /// a real magnitude rather than the pre-layout zero fallback.
  internal var hasResolvedContentSize: Bool {
    return layoutObserver.readFrameInParent().height > 0 || bounds.height > 0
  }

  /// Resumes a presence enter that was held until the surface had a measured size.
  internal override func layoutSubviews() {
    super.layoutSubviews()
    presenceCoordinator.handleContentLayout()
  }

  internal func animateContent(to target: FxAnimationVector) {
    contentAnimationDriver.animate(to: target)
  }

  /// Places the content container instantly, without animation.
  internal func snapContent(to target: FxAnimationVector) {
    contentAnimationDriver.snap(to: target)
  }

  internal func cancelContentAnimation() {
    contentAnimationDriver.cancel()
  }

  /// Emits the presence lifecycle completion the coordinator produces, remapped to the public
  /// contract by the surface component. The `onFx` prefix never leaks past JS.
  internal func dispatchPresenceTransitionEnd(phase: String, finished: Bool, interrupted: Bool) {
    onFxTransitionEnd([
      "owner": "presence", "phase": phase, "finished": finished, "interrupted": interrupted,
    ])
  }

  /// Reports whether the active shader loaded, once per change. A usable curated id (its
  /// pipeline compiles) fires `onFxLoad`; clearing to empty is silent; any other id has no
  /// renderer on the interactive surface and fires `onFxError`. This is the load-bearing
  /// signal a bring-your-own consumer falls back on when its shader fails to load.
  private func dispatchShaderLoadState() {
    guard pendingShader != lastDispatchedShader else { return }
    lastDispatchedShader = pendingShader
    if pendingShader.isEmpty {
      return
    }
    if Self.pipeline(for: pendingShader) != nil {
      onFxLoad(["shader": pendingShader])
      return
    }
    // No pipeline: a registered id with no iOS source degrades to `{via:'none'}` silently (the
    // pair rule). A registered id whose source failed to compile, or an entirely unknown id, errors.
    if FxShaderRegistry.shared.isRegistered(id: pendingShader),
      FxShaderRegistry.shared.source(for: pendingShader) == nil
    {
      return
    }
    let reason =
      FxShaderRegistry.shared.isRegistered(id: pendingShader)
      ? "runtime shader failed to compile" : "no renderer for shader id"
    onFxError(["shader": pendingShader, "reason": reason])
  }

  // MARK: - Child routing

  /// Routes Fabric-mounted children into the intermediate container so React Native
  /// cannot overwrite the animator's transform/opacity.
  internal override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    intermediateContainer.insertSubview(childComponentView, at: index)
  }

  /// Removes a Fabric-mounted child from the intermediate container. The superview guard
  /// defends against a stale or repeated unmount detaching a view fx no longer owns.
  internal override func unmountChildComponentView(_ child: UIView, index: Int) {
    if child.superview == intermediateContainer {
      child.removeFromSuperview()
    }
  }

  // MARK: - Effect surface visibility

  /// True when a non-empty shader resolves to a usable pipeline (curated or runtime-compiled).
  private var hasActiveEffect: Bool {
    !pendingShader.isEmpty && Self.pipeline(for: pendingShader) != nil
  }

  /// Builds the GPU surface on first need and shows it, or hides it when no effect is active so
  /// it never obscures the content-motion container. The loop pauses with it: a hidden but
  /// unpaused `MTKView` still ticks its `CADisplayLink` every frame and congests the main thread
  /// (sluggish UI, laggy touch, gesture-gate timeouts), so it runs only while drawing. When no
  /// shader has ever been set, no `MTKView` exists yet and there is nothing to hide.
  private func updateEffectSurfaceVisibility() {
    guard hasActiveEffect, let view = ensureEffectSurface() else {
      metalView?.isHidden = true
      metalView?.isPaused = true
      return
    }
    view.isHidden = false
    view.isPaused = window == nil
  }

  // MARK: - Interaction

  private func updateInteraction(mode: String) {
    pressHandler.update(mode: mode)
  }

  internal func updatePressUniforms(point: CGPoint?, depth: Float) {
    targetPressDepth = depth
    if let point {
      uniforms.touch = normalizeTouch(point)
    }
  }

  internal func dispatchShaderPressIn(point: CGPoint) {
    onShaderPressIn(pressPayload(point: point))
  }

  internal func dispatchShaderPressOut(point: CGPoint) {
    onShaderPressOut(pressPayload(point: point))
  }

  internal func dispatchShaderPress(point: CGPoint) {
    onShaderPress(pressPayload(point: point))
  }

  internal func dispatchShaderLongPress(point: CGPoint) {
    onShaderLongPress(pressPayload(point: point))
  }

  internal func containsInteractiveShape(point: CGPoint) -> Bool {
    return bounds.contains(point)
  }

  private func normalizeTouch(_ point: CGPoint) -> SIMD2<Float> {
    let width = max(Float(bounds.width), 1)
    let height = max(Float(bounds.height), 1)
    return SIMD2<Float>(Float(point.x) / width, 1 - Float(point.y) / height)
  }

  private func pressPayload(point: CGPoint) -> [String: Double] {
    return ["x": Double(point.x), "y": Double(point.y)]
  }

  internal override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard let result = super.hitTest(point, with: event) else {
      return nil
    }
    // The bare surface is the view itself, the Metal layer, and the always-present
    // wrapper container; only the container view *itself* counts — a mounted RN child
    // inside it is a real target and returns early untouched. Anything bare falls
    // through to the mode/shape gate so a `none` (or outside-shape) touch can reach
    // RN content composited behind the surface.
    if result !== self && result !== metalView && result !== intermediateContainer {
      return result
    }
    guard pendingMode == "passive" || pendingMode == "active" else {
      return nil
    }
    return containsInteractiveShape(point: point) ? result : nil
  }

  // MARK: - Render loop

  /// Encodes one full-screen triangle draw for the current shader target.
  internal func draw(in view: MTKView) {
    guard let commandQueue = Self.sharedCommandQueue,
      let state = Self.pipeline(for: pendingShader),
      let drawable = view.currentDrawable,
      let passDescriptor = view.currentRenderPassDescriptor,
      let commandBuffer = commandQueue.makeCommandBuffer(),
      let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: passDescriptor)
    else {
      return
    }

    uniforms.time = Float(CACurrentMediaTime() - startTime)
    uniforms.resolution = SIMD2<Float>(Float(view.drawableSize.width), Float(view.drawableSize.height))
    uniforms.pressDepth += (targetPressDepth - uniforms.pressDepth) * 0.35

    encoder.setRenderPipelineState(state)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<FxUniforms>.stride, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    commandBuffer.present(drawable)
    commandBuffer.commit()
  }

  /// Accepts drawable-size changes because per-frame uniforms read the current drawable size.
  internal func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
    _ = size
  }

  // MARK: - Lifecycle

  /// Pauses the Metal display link when the surface cannot be displayed.
  internal override func pausePresentationLoop() {
    metalView?.isPaused = true
    contentAnimationDriver.pause()
  }

  /// Resumes the Metal display link only while the surface is attached and an effect is active.
  internal override func resumePresentationLoop() {
    metalView?.isPaused = window == nil || !hasActiveEffect
    contentAnimationDriver.resume()
  }
}
