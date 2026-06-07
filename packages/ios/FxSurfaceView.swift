import ExpoModulesCore
import MetalKit
import QuartzCore
import simd

// Uniforms passed to the fragment shader. The field order MUST match the
// `FxUniforms` struct in Shaders/*.metal.
struct FxUniforms {
  var time: Float = 0
  var resolution: SIMD2<Float> = .zero
  var intensity: Float = 0.8
  var pressDepth: Float = 0
  var touch = SIMD2<Float>(0.5, 0.5)
}

// The expo-view substrate: a native Metal-backed surface that hosts an MTKView,
// owns the render loop and uniforms, and attaches a cooperative press recognizer.
// JS configures it; the native side renders. JS never drives frames.
final class FxSurfaceView: ExpoView, MTKViewDelegate {
  // Semantic events to JS (names must match Events(...) in FxModule).
  // Prefixed to avoid colliding with React Native's reserved `topPress` event.
  let onShaderPress = EventDispatcher()
  let onShaderPressIn = EventDispatcher()
  let onShaderPressOut = EventDispatcher()

  private let metalView = MTKView()
  private let device = MTLCreateSystemDefaultDevice()
  private var commandQueue: MTLCommandQueue?
  private var library: MTLLibrary?
  private var pipelineCache: [String: MTLRenderPipelineState] = [:]

  private var uniforms = FxUniforms()
  private let startTime = CACurrentMediaTime()

  // Stashed by prop setters, applied once per batch in applyResolvedConfig().
  private var pendingShader = "fractal-clouds"
  private var pendingIntensity: Float = 0.8
  private var pendingMode = "none"

  private var pressRecognizer: UILongPressGestureRecognizer?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpMetal()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    metalView.delegate = nil
    metalView.isPaused = true
  }

  // MARK: Setup

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

  // Curated shaders compile into default.metallib inside the FxShaders bundle.
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

  // MARK: Pipeline (cached per shader id)

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

  // Curated id -> MSL fragment function name. Unknown id falls back to the default.
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

  // MARK: Props (stash now, apply in applyResolvedConfig)

  func setShader(_ value: String) { pendingShader = value }
  func setIntensity(_ value: Double) { pendingIntensity = Float(value) }
  func setInteractionMode(_ value: String) { pendingMode = value }

  func applyResolvedConfig() {
    uniforms.intensity = pendingIntensity
    _ = pipeline(for: pendingShader)  // warm the cache
    updateInteraction(mode: pendingMode)
  }

  // MARK: Interaction (active mode = cooperative press)

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

  private func updateTouch(_ recognizer: UILongPressGestureRecognizer) {
    let location = recognizer.location(in: self)
    let width = max(Float(bounds.width), 1)
    let height = max(Float(bounds.height), 1)
    // Normalize to 0..1 with y up, matching the shader's UV space.
    uniforms.touch = SIMD2<Float>(Float(location.x) / width, 1 - Float(location.y) / height)
  }

  // MARK: Render loop

  func draw(in view: MTKView) {
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

  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  // MARK: Lifecycle — run the loop only while on-window and foregrounded

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      NotificationCenter.default.addObserver(
        self, selector: #selector(pauseLoop),
        name: UIApplication.didEnterBackgroundNotification, object: nil)
      NotificationCenter.default.addObserver(
        self, selector: #selector(resumeLoop),
        name: UIApplication.willEnterForegroundNotification, object: nil)
      resumeLoop()
    } else {
      pauseLoop()
      NotificationCenter.default.removeObserver(self)
    }
  }

  @objc private func pauseLoop() { metalView.isPaused = true }
  @objc private func resumeLoop() { metalView.isPaused = (window == nil) }
}
