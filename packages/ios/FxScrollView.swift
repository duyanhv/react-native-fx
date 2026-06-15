import ExpoModulesCore
import SwiftUI

/// Hosts the scroll source — a SwiftUI `ScrollView` of fx-owned effect tiles whose presentation
/// is driven by the container's own native scroll position.
///
/// Mounts `FxScrollRootView` inside ONE persistent `UIHostingController`, created lazily on the
/// first resolved config; later prop batches mutate the observed `FxScrollProps` holder and
/// SwiftUI diffs the change in place — remounting per batch would reset the shader clock of any
/// tile. The mapping from scroll position to each tile's appearance runs entirely in SwiftUI's
/// render server (`.scrollTransition`), so nothing crosses the bridge per frame and the JS
/// thread stays free.
///
/// The host is hidden from the accessibility tree — its tiles are presentation-only. The
/// `ScrollView` self-gestures (it owns its own scroll); fx never hosts or samples RN content
/// here, so RN touch outside the surface is untouched.
internal final class FxScrollView: FxNativeView {
  // MARK: - Hosting state

  private let scrollProps = FxScrollProps()
  private var hostingController: UIHostingController<FxScrollRootView>?
  private var pendingAxis: String = "vertical"
  private var pendingTiles: [FxScrollTile] = []

  // MARK: - Props

  internal func setAxis(_ value: String) {
    pendingAxis = value
  }

  internal func setTiles(_ value: [FxScrollTile]) {
    pendingTiles = value
  }

  internal override func applyResolvedConfig() {
    super.applyResolvedConfig()

    mountHostIfNeeded()
    scrollProps.axis = pendingAxis
    scrollProps.tiles = pendingTiles
  }

  // MARK: - Host lifecycle

  /// Creates the persistent hosting controller on the first config; later batches reuse it and
  /// reach the tree through `scrollProps`.
  private func mountHostIfNeeded() {
    guard hostingController == nil else {
      return
    }

    let controller = UIHostingController(rootView: FxScrollRootView(props: scrollProps))
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

  private func removeHost() {
    hostingController?.view.removeFromSuperview()
    hostingController = nil
  }

  deinit {
    removeHost()
  }
}

/// One fx-owned effect tile carried as a Record across the Expo bridge; each property uses
/// `@Field` so the bridge maps it by name. `height` is the tile's extent along the scroll axis.
internal struct FxScrollTile: Record {
  @Field var effect: String = ""
  @Field var intensity: Double = 0.8
  @Field var height: Double = 220
}
