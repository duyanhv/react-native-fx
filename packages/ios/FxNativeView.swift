import ExpoModulesCore
import UIKit

/// Defines the shared Expo Modules boundary for fx-owned native views.
///
/// Prop setters on concrete subclasses stash incoming values, and
/// `applyResolvedConfig()` applies one coherent snapshot after Expo finishes the
/// batch. The base owns lifecycle pause/resume hooks and the inert ref surface,
/// while concrete views own their event dispatchers so Expo can wire them.
internal class FxNativeView: ExpoView {
  // MARK: - Initializers

  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
  }

  /// Removes base lifecycle observers before the Fabric view is released.
  deinit {
    stopObservingAppLifecycle()
  }

  // MARK: - Prop lifecycle

  internal func applyResolvedConfig() {}

  // MARK: - Ref surface

  internal func snapshot() -> [String: Double] {
    return [:]
  }

  // MARK: - Presentation lifecycle

  internal func pausePresentationLoop() {}

  internal func resumePresentationLoop() {}

  /// Keeps native frame loops tied to view and app visibility rather than JS state.
  internal override func didMoveToWindow() {
    super.didMoveToWindow()

    if window != nil {
      startObservingAppLifecycle()
      resumePresentationLoop()
    } else {
      pausePresentationLoop()
      stopObservingAppLifecycle()
    }
  }

  // MARK: - Private lifecycle helpers

  /// Whether the app is foregrounded, maintained by the background/foreground notifications. A
  /// prop batch can land while the app is backgrounded but still window-attached; subclasses gate
  /// their frame-loop resume on this so such a batch cannot un-pause the loop in the background
  /// (the rule: keep the loop paused off-window or backgrounded).
  internal private(set) var isAppForegrounded = true

  private var observesAppLifecycle = false

  /// Registers app lifecycle notifications once per window attachment period.
  private func startObservingAppLifecycle() {
    guard !observesAppLifecycle else {
      return
    }

    // Sync the flag to the live state in case the view attaches while already backgrounded.
    isAppForegrounded = UIApplication.shared.applicationState != .background

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleDidEnterBackground),
      name: UIApplication.didEnterBackgroundNotification,
      object: nil)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWillEnterForeground),
      name: UIApplication.willEnterForegroundNotification,
      object: nil)
    observesAppLifecycle = true
  }

  /// Removes lifecycle notifications before the view detaches or deinitializes.
  private func stopObservingAppLifecycle() {
    guard observesAppLifecycle else {
      return
    }

    NotificationCenter.default.removeObserver(self)
    observesAppLifecycle = false
  }

  /// Stops presentation work immediately when the app can no longer display it.
  @objc private func handleDidEnterBackground() {
    isAppForegrounded = false
    pausePresentationLoop()
  }

  /// Restarts presentation work only for views still attached to a window.
  @objc private func handleWillEnterForeground() {
    isAppForegrounded = true
    if window != nil {
      resumePresentationLoop()
    }
  }
}
