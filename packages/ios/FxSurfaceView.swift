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

  // MARK: - Private state

  // Allocated lazily on the first active shader (see `ensureEffectSurface`). A surface used
  // only as a content-motion wrapper never builds a GPU view, so wrapping a long list costs
  // nothing on the GPU.
  private var metalView: MTKView?

  private var uniforms = FxUniforms()
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

  private var pressRecognizer: UILongPressGestureRecognizer?

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
    onContentAnimationCompletion = { [weak presenceCoordinator] in
      presenceCoordinator?.handleDriverCompletion()
    }
  }

  deinit {
    contentAnimationDriver.cancel()
    layoutObserver?.invalidate()
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

  /// Returns the render pipeline for a curated shader id from the process-wide cache,
  /// compiling and caching it on first request. Shared across instances because the library
  /// and pixel format are identical for every surface.
  private static func pipeline(for shaderId: String) -> MTLRenderPipelineState? {
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
    } else {
      onFxError(["shader": pendingShader, "reason": "no renderer for shader id"])
    }
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

  /// True when a non-empty shader resolves to a usable pipeline.
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

  /// Installs or removes the cooperative press recognizer for active interaction.
  private func updateInteraction(mode: String) {
    if mode == "active" {
      guard pressRecognizer == nil else { return }
      let recognizer = UILongPressGestureRecognizer(target: self, action: #selector(handlePress(_:)))
      recognizer.minimumPressDuration = 0
      recognizer.cancelsTouchesInView = false
      addGestureRecognizer(recognizer)
      pressRecognizer = recognizer
    } else if let recognizer = pressRecognizer {
      removeGestureRecognizer(recognizer)
      pressRecognizer = nil
      uniforms.pressDepth = 0
    }
  }

  /// Updates shader uniforms and semantic events for a press recognizer transition.
  @objc private func handlePress(_ recognizer: UILongPressGestureRecognizer) {
    updateTouch(recognizer)  // tracks the finger on .began and every .changed (drag)
    switch recognizer.state {
    case .began:
      uniforms.pressDepth = 1
      onShaderPressIn()
    case .ended:
      uniforms.pressDepth = 0
      onShaderPressOut()
      onShaderPress()
    case .cancelled, .failed:
      uniforms.pressDepth = 0
      onShaderPressOut()
    default:
      break  // .changed: touch already updated above
    }
  }

  /// Converts the current touch location into shader UV coordinates.
  private func updateTouch(_ recognizer: UILongPressGestureRecognizer) {
    let location = recognizer.location(in: self)
    let width = max(Float(bounds.width), 1)
    let height = max(Float(bounds.height), 1)
    // Normalize to 0..1 with y up, matching the shader's UV space.
    uniforms.touch = SIMD2<Float>(Float(location.x) / width, 1 - Float(location.y) / height)
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
