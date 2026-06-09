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

  // MARK: - Private state

  private let metalView = MTKView()
  private let device = MTLCreateSystemDefaultDevice()
  private var commandQueue: MTLCommandQueue?
  private var library: MTLLibrary?
  private var pipelineCache: [String: MTLRenderPipelineState] = [:]

  private var uniforms = FxUniforms()
  private let startTime = CACurrentMediaTime()

  // Stashed by prop setters, applied once per batch in `applyResolvedConfig()`.
  private var pendingShader = "fractal-clouds"
  private var pendingIntensity: Float = 0.8
  private var pendingMode = "none"

  private var pressRecognizer: UILongPressGestureRecognizer?

  /// A Fabric-invisible container that holds RN children so Fabric cannot clobber
  /// the animator's transform/opacity. The animator targets this container, not the
  /// outer `FxSurfaceView` that Fabric tracks.
  private let intermediateContainer = UIView()

  /// Initializes the Metal surface and the intermediate container while keeping the loop paused until attachment.
  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpIntermediateContainer()
    setUpMetal()
    bringSubviewToFront(metalView)
  }

  deinit {
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

  /// Creates the Metal view and command resources without starting frame production.
  private func setUpMetal() {
    guard let device else { return }
    commandQueue = device.makeCommandQueue()
    library = loadShaderLibrary(device: device)

    metalView.device = device
    metalView.delegate = self
    metalView.framebufferOnly = true
    metalView.colorPixelFormat = .bgra8Unorm
    metalView.preferredFramesPerSecond = 60
    metalView.enableSetNeedsDisplay = false
    metalView.isPaused = true  // runs only while on-window and foregrounded
    metalView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    metalView.frame = bounds
    addSubview(metalView)
  }

  /// Loads the compiled shader library from the bundled curated Metal assets.
  private func loadShaderLibrary(device: MTLDevice) -> MTLLibrary? {
    if let bundle = shadersBundle() {
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
  private func shadersBundle() -> Bundle? {
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

  /// Tears down the current Metal view attachment and stops future delegate callbacks.
  private func tearDownMetal() {
    metalView.delegate = nil
    metalView.isPaused = true
  }

  // MARK: - Pipeline

  /// Returns the cached render pipeline for a curated shader id.
  private func pipeline(for shaderId: String) -> MTLRenderPipelineState? {
    if let cached = pipelineCache[shaderId] {
      return cached
    }
    guard let device, let library else { return nil }
    guard let vertexFunction = library.makeFunction(name: "fx_fullscreen_vertex"),
      let fragmentFunction = library.makeFunction(name: Self.fragmentName(for: shaderId))
    else {
      return nil
    }

    let descriptor = MTLRenderPipelineDescriptor()
    descriptor.vertexFunction = vertexFunction
    descriptor.fragmentFunction = fragmentFunction
    descriptor.colorAttachments[0].pixelFormat = metalView.colorPixelFormat
    guard let state = try? device.makeRenderPipelineState(descriptor: descriptor) else {
      return nil
    }
    pipelineCache[shaderId] = state
    return state
  }

  /// Maps a curated shader id to its Metal fragment function.
  private static func fragmentName(for shaderId: String) -> String {
    switch shaderId {
    case "fractal-clouds": return "fx_fractal_clouds"
    case "ink-smoke": return "fx_ink_smoke"
    case "liquid-chrome": return "fx_liquid_chrome"
    case "loop": return "fx_loop"
    case "dots": return "fx_dots"
    default: return "fx_fractal_clouds"
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

  internal override func applyResolvedConfig() {
    super.applyResolvedConfig()
    uniforms.intensity = min(max(pendingIntensity, 0), 1)
    updateEffectSurfaceVisibility()
    updateInteraction(mode: pendingMode)
  }

  // MARK: - Child routing

  /// Routes Fabric-mounted children into the intermediate container so React Native
  /// cannot overwrite the animator's transform/opacity.
  internal override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    intermediateContainer.insertSubview(childComponentView, at: index)
  }

  /// Removes a Fabric-mounted child from the intermediate container.
  internal override func unmountChildComponentView(_ child: UIView, index: Int) {
    child.removeFromSuperview()
  }

  // MARK: - Effect surface visibility

  /// Hides the GPU surface when no effect is active so it never obscures the
  /// content-motion container. The effect surface is shown only when a valid
  /// shader pipeline is resolved.
  private func updateEffectSurfaceVisibility() {
    let hasActiveEffect = !pendingShader.isEmpty && pipeline(for: pendingShader) != nil
    metalView.isHidden = !hasActiveEffect
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
    guard let commandQueue,
      let state = pipeline(for: pendingShader),
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
    metalView.isPaused = true
  }

  /// Resumes the Metal display link only while the surface is attached.
  internal override func resumePresentationLoop() {
    metalView.isPaused = (window == nil)
  }
}
