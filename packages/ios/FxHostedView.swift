import ExpoModulesCore
import SwiftUI

/// Hosts the platform-native decorative rendering surface for the `hosted` substrate.
///
/// Most effects mount as a SwiftUI view inside a `UIHostingController`. The iOS 26 glass
/// surface instead mounts `FxGlassSurfaceView` directly as a UIKit subview, because the
/// system glass delivers its own press response only through a real, hit-testable view —
/// a hosted SwiftUI shape cannot carry it. The two mount paths are exclusive; switching
/// effects tears down whichever one is active. The host owns sizing and pointer-event
/// passthrough; it never samples or wraps RN content. Props stash in the two-phase Expo
/// pattern and are applied once per batch in `applyResolvedConfig()`.
///
/// `layoutSubviews()` pushes the host layer's `cornerRadius` into the glass surface so
/// the glass shape tracks late Fabric layout passes without remounting; a radius of 0
/// falls back to a sharp rectangle.
internal final class FxHostedView: FxNativeView {
  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()

  // MARK: - Hosting state

  private var hostingController: UIHostingController<AnyView>?
  // Stored as UIView because @available cannot annotate a stored property; every use
  // casts back to FxGlassSurfaceView under an iOS 26 check.
  private var glassSurfaceView: UIView?
  private var pendingEffect: String?
  private var pendingIntensity: Double = 0.8
  private var pendingSymbolConfig: SymbolConfig?
  private var pendingMaterialConfig: MaterialConfig?

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

  internal func setMaterialConfig(_ value: MaterialConfig?) {
    pendingMaterialConfig = value
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
      removeGlassSurface()
      return
    }

    if effect == "material", #available(iOS 26.0, *) {
      mountGlassSurface()
      return
    }

    let view = makeSwiftUIView(for: effect, intensity: pendingIntensity)
    mountHost(AnyView(view))
  }

  // MARK: - Layout reactivity

  internal override func layoutSubviews() {
    super.layoutSubviews()

    if #available(iOS 26.0, *), let surface = glassSurfaceView as? FxGlassSurfaceView {
      surface.setCornerRadius(self.layer.cornerRadius)
    }
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
    removeGlassSurface()

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

  @available(iOS 26.0, *)
  private func mountGlassSurface() {
    removeHost()

    let surface: FxGlassSurfaceView
    if let existing = glassSurfaceView as? FxGlassSurfaceView {
      surface = existing
    } else {
      surface = FxGlassSurfaceView(frame: bounds)
      surface.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      addSubview(surface)
      glassSurfaceView = surface
    }

    surface.setMaterialConfig(pendingMaterialConfig)
    surface.setCornerRadius(self.layer.cornerRadius)
  }

  private func removeHost() {
    hostingController?.view.removeFromSuperview()
    hostingController = nil
  }

  private func removeGlassSurface() {
    glassSurfaceView?.removeFromSuperview()
    glassSurfaceView = nil
  }

  deinit {
    removeHost()
    removeGlassSurface()
  }
}

/// An inert placeholder for unknown effect ids.
internal struct FxEmptyView: View {
  var body: some View {
    Color.clear
  }
}
