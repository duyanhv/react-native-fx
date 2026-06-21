import ExpoModulesCore
import UIKit

/// On iOS 26 installs `UIGlassContainerEffect` on a `UIVisualEffectView` so the system
/// can merge sibling glass surfaces. Uses the UIKit path — not the SwiftUI
/// `GlassEffectContainer` — because the items are UIKit surfaces (`FxGlassSurfaceView`).
/// Children route into `containerEffectView.contentView` (not `self`) so UIKit sees
/// them as direct siblings under the container effect layer.
/// Below iOS 26 or when the class is unavailable at runtime: a plain passthrough.
internal final class FxGroupView: FxNativeView {
  private let containerEffectView = UIVisualEffectView()

  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    containerEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(containerEffectView)
    installContainerEffect()
  }

  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()

  // MARK: - Child routing

  internal override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    containerEffectView.contentView.insertSubview(childComponentView, at: index)
  }

  internal override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }

  // MARK: - Private

  private func installContainerEffect() {
    guard isGlassContainerEffectAvailable() else { return }
    if #available(iOS 26.0, *) {
      #if compiler(>=6.2)
      containerEffectView.effect = UIGlassContainerEffect()
      #endif
    }
  }

  private func isGlassContainerEffectAvailable() -> Bool {
    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      return NSClassFromString("UIGlassContainerEffect") != nil
    }
    #endif
    return false
  }
}
