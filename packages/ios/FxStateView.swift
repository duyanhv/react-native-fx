import ExpoModulesCore
import UIKit

/// A lightweight native view that wraps RN children and eases between mounted states natively.
///
/// Extends FxNativeView (not FxSurfaceView) to provide state-driven content motion without a
/// Metal surface. Each named state has a target transform/opacity vector; transitions are
/// native springs via FxAnimationDriver on the intermediate container.
internal final class FxStateView: FxNativeView {
  // MARK: - Events

  // Prefixed name avoids React Native's reserved event namespace; the public `onStateChange`
  // prop maps to this in `FxView.tsx`.
  internal let onFxStateChange = EventDispatcher()

  // MARK: - State

  private let intermediateContainer = UIView()
  private var animationDriver: FxAnimationDriver!
  private var stateCoordinator: FxStateViewCoordinator!

  private var pendingState = "idle"
  private var pendingPreset = "lift"
  private var pendingStateMotion: [FxStateMotionEntry]? = nil

  // MARK: - Lifecycle

  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpIntermediateContainer()
    animationDriver = FxAnimationDriver(targetView: intermediateContainer) { [weak self] in
      guard let self else { return }
      self.stateCoordinator.handleDriverCompletion()
    }
    stateCoordinator = FxStateViewCoordinator(view: self)
  }

  // MARK: - Setup

  /// Creates the intermediate container that holds RN children. Fabric does not track
  /// this view, so its transform/opacity cannot be overwritten by React Native commits.
  private func setUpIntermediateContainer() {
    intermediateContainer.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    intermediateContainer.frame = bounds
    addSubview(intermediateContainer)
  }

  // MARK: - Presentation Lifecycle

  internal override func pausePresentationLoop() {
    animationDriver.pause()
  }

  internal override func resumePresentationLoop() {
    guard isAppForegrounded else { return }
    animationDriver.resume()
  }

  // MARK: - Prop Setters

  internal func setState(_ state: String) {
    pendingState = state
  }

  internal func setPreset(_ preset: String) {
    pendingPreset = preset
  }

  internal func setStateMotion(_ stateMotion: [FxStateMotionEntry]?) {
    pendingStateMotion = stateMotion
  }

  // MARK: - Config Application

  internal override func applyResolvedConfig() {
    super.applyResolvedConfig()
    stateCoordinator.update(state: pendingState, preset: pendingPreset, stateMotion: pendingStateMotion)
  }

  // MARK: - Child Mounting (Fabric-invisible wrapper pattern)

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

  // MARK: - Driver Interface (called by FxStateViewCoordinator)

  internal func animateContent(to target: FxAnimationVector) {
    animationDriver.animate(to: target)
  }

  internal func snapContent(to value: FxAnimationVector) {
    animationDriver.snap(to: value)
  }

  internal func dispatchStateChange(state: String, finished: Bool, interrupted: Bool) {
    onFxStateChange(["state": state, "finished": finished, "interrupted": interrupted])
  }
}
