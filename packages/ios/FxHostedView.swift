import ExpoModulesCore
import SwiftUI

/// Hosts the platform-native decorative rendering surface for the `hosted` substrate.
///
/// A `UIHostingController` embeds a SwiftUI view selected by the `effect` prop.
/// The host owns sizing and pointer-event passthrough; it never samples or wraps
/// RN content. Props stash in the two-phase Expo pattern and are
/// applied once per batch in `applyResolvedConfig()`.
internal final class FxHostedView: FxNativeView {
  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()

  // MARK: - Hosting state

  private var hostingController: UIHostingController<AnyView>?
  private var pendingEffect: String?
  private var pendingIntensity: Double = 0.8
  private var pendingSymbolConfig: SymbolConfig?

  // MARK: - Props

  internal func setEffect(_ value: String) {
    pendingEffect = value
  }

  internal func setIntensity(_ value: Double) {
    pendingIntensity = value
  }

  internal func setSymbolConfig(_ value: SymbolConfig?) {
    pendingSymbolConfig = value
  }

  internal override func applyResolvedConfig() {
    super.applyResolvedConfig()

    if let symbolConfig = pendingSymbolConfig {
      let view = FxSymbolView(symbolConfig: symbolConfig)
      mountHost(AnyView(view))
      return
    }

    guard let effect = pendingEffect else {
      removeHost()
      return
    }

    let view = makeSwiftUIView(for: effect, intensity: pendingIntensity)
    mountHost(AnyView(view))
  }

  // MARK: - Effect dispatch

  private func makeSwiftUIView(for effect: String, intensity: Double) -> any View {
    switch effect {
    case "fill":
      return FxFillView(intensity: intensity)
    case "material":
      return FxMaterialView(intensity: intensity)
    case "fractal-clouds", "ink-smoke", "liquid-chrome", "loop", "dots",
      "aurora", "noise-field", "plasma", "caustics", "edge-glow":
      return FxShaderView(shaderId: effect, intensity: intensity)
    default:
      return FxEmptyView()
    }
  }

  // MARK: - Host lifecycle

  private func mountHost(_ rootView: AnyView) {
    removeHost()

    let controller = UIHostingController(rootView: rootView)
    controller.view.backgroundColor = .clear
    controller.view.translatesAutoresizingMaskIntoConstraints = false

    addSubview(controller.view)
    NSLayoutConstraint.activate([
      controller.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      controller.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      controller.view.topAnchor.constraint(equalTo: topAnchor),
      controller.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    hostingController = controller
  }

  private func removeHost() {
    hostingController?.view.removeFromSuperview()
    hostingController = nil
  }

  deinit {
    removeHost()
  }
}

/// An inert placeholder for unknown effect ids.
internal struct FxEmptyView: View {
  var body: some View {
    Color.clear
  }
}
