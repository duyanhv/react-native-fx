import ExpoModulesCore
import SwiftUI

/// Hosts the platform-native decorative rendering surface for the `hosted` substrate.
///
/// Most effects mount as `FxHostedRootView` inside ONE persistent `UIHostingController`,
/// created lazily on the first resolved config. Prop batches mutate the observed
/// `FxHostedProps` holder and SwiftUI diffs the change in place — remounting the
/// controller per batch would reset symbol-effect state and the shader clock. The iOS 26
/// glass surface instead mounts `FxGlassSurfaceView` directly as a UIKit subview, because
/// the system glass delivers its own press response only through a real, hit-testable
/// view — a hosted SwiftUI shape cannot carry it. The two mount paths are exclusive;
/// crossing between them tears down whichever one is active, and that crossing (or
/// unmount) is the only time the hosting controller is destroyed.
///
/// The decorative SwiftUI path is hidden from the accessibility tree — its output is
/// presentation-only, and hosted content (an SF Symbol image, for example) would
/// otherwise surface VoiceOver elements of its own. The host owns sizing and
/// pointer-event passthrough; it never samples or wraps RN content. Props stash in the
/// two-phase Expo pattern and are applied once per batch in `applyResolvedConfig()`.
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

  private let hostedProps = FxHostedProps()
  private var hostingController: UIHostingController<FxHostedRootView>?
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

    // A symbol config rides the SwiftUI path even when `effect` is also set; only a
    // symbol-free `material` crosses to the UIKit glass surface.
    if pendingSymbolConfig == nil {
      guard let effect = pendingEffect else {
        removeHost()
        removeGlassSurface()
        return
      }

      if effect == "material", #available(iOS 26.0, *) {
        mountGlassSurface()
        return
      }
    }

    mountHostIfNeeded()
    hostedProps.effect = pendingEffect
    hostedProps.intensity = pendingIntensity
    hostedProps.symbolConfig = pendingSymbolConfig
    hostedProps.materialConfig = pendingMaterialConfig
  }

  // MARK: - Layout reactivity

  internal override func layoutSubviews() {
    super.layoutSubviews()

    if #available(iOS 26.0, *), let surface = glassSurfaceView as? FxGlassSurfaceView {
      surface.setCornerRadius(self.layer.cornerRadius)
    }
  }

  // MARK: - Host lifecycle

  /// Creates the persistent hosting controller on the first SwiftUI-path config; later
  /// batches reuse it and reach the tree through `hostedProps`.
  private func mountHostIfNeeded() {
    removeGlassSurface()

    guard hostingController == nil else {
      return
    }

    let controller = UIHostingController(rootView: FxHostedRootView(props: hostedProps))
    controller.view.backgroundColor = .clear
    controller.view.accessibilityElementsHidden = true
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
