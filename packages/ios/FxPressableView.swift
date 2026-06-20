import ExpoModulesCore
import UIKit

/// A lightweight native view that wraps RN children and provides native press feedback.
///
/// Extends FxNativeView (not FxSurfaceView) to provide press semantics without a Metal
/// surface. Press feedback is scale + opacity spring animation, emitted to JS as four
/// discrete events: onPressIn, onPressOut, onPress (if no long press fired), and
/// onLongPress (after 0.5s held).
internal final class FxPressableView: FxNativeView, FxPressHost {
  // MARK: - Events

  internal let onPressIn = EventDispatcher()
  internal let onPressOut = EventDispatcher()
  internal let onPress = EventDispatcher()
  internal let onLongPress = EventDispatcher()

  // MARK: - State

  private let intermediateContainer = UIView()
  private var pressHandler: FxPressHandler!

  /// Feedback magnitudes (device-tunable, stored for later notes.md).
  private let pressScaleTarget: CGFloat = 0.97
  private let pressOpacityTarget: CGFloat = 0.8

  // MARK: - Lifecycle

  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpIntermediateContainer()
    pressHandler = FxPressHandler(host: self)
    pressHandler.update(mode: "active", dragAxis: nil)
  }

  deinit {
    pressHandler.detach()
  }

  // MARK: - Setup

  /// Creates the intermediate container that holds RN children. Fabric does not track
  /// this view, so its transform/opacity cannot be overwritten by React Native commits.
  private func setUpIntermediateContainer() {
    intermediateContainer.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    intermediateContainer.frame = bounds
    addSubview(intermediateContainer)
  }

  // MARK: - Configuration

  internal func setFeedback(_ feedback: String) {
    // V1 supports "native" feedback; other values ignored for now.
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

  // MARK: - FxPressHost Implementation

  internal func hitTarget(point: CGPoint) -> Bool {
    return bounds.contains(point)
  }

  internal func handlePressBegin(point: CGPoint, depth: Int) {
    applyPressDown()
    onPressIn([:])
  }

  internal func handlePressChanged(point: CGPoint, depth: Int) {
    // No feedback change on press moved (unlike shader surface).
  }

  internal func handlePressEnd(point: CGPoint, includePressEvent: Bool) {
    restorePressUp()
    onPressOut([:])
    if includePressEvent {
      onPress([:])
    }
  }

  internal func handlePressCancel(point: CGPoint) {
    restorePressUp()
    onPressOut([:])
  }

  internal func handleLongPress(point: CGPoint) {
    onLongPress([:])
  }

  internal func attachRecognizer(_ recognizer: UILongPressGestureRecognizer) {
    addGestureRecognizer(recognizer)
  }

  internal func detachRecognizer(_ recognizer: UILongPressGestureRecognizer) {
    removeGestureRecognizer(recognizer)
  }

  // MARK: - Press Feedback (Scale + Opacity Spring)

  /// Applies press-down animation: scale to 0.97 and opacity to 0.8 over 0.1s easeOut.
  private func applyPressDown() {
    intermediateContainer.layer.removeAnimation(forKey: "scaleSpring")
    intermediateContainer.layer.removeAnimation(forKey: "opacitySpring")
    intermediateContainer.layer.removeAnimation(forKey: "pressDown")

    let scaleAnim = CABasicAnimation(keyPath: "transform.scale")
    scaleAnim.fromValue = 1.0
    scaleAnim.toValue = pressScaleTarget
    scaleAnim.duration = 0.1
    scaleAnim.timingFunction = CAMediaTimingFunction(name: .easeOut)
    scaleAnim.fillMode = .forwards
    scaleAnim.isRemovedOnCompletion = false

    let opacityAnim = CABasicAnimation(keyPath: "opacity")
    opacityAnim.fromValue = 1.0
    opacityAnim.toValue = pressOpacityTarget
    opacityAnim.duration = 0.1
    opacityAnim.timingFunction = CAMediaTimingFunction(name: .easeOut)
    opacityAnim.fillMode = .forwards
    opacityAnim.isRemovedOnCompletion = false

    let group = CAAnimationGroup()
    group.animations = [scaleAnim, opacityAnim]
    group.duration = 0.1
    group.fillMode = .forwards
    group.isRemovedOnCompletion = false
    intermediateContainer.layer.add(group, forKey: "pressDown")
  }

  /// Restores press-up animation: spring back to scale 1.0 and opacity 1.0 with proper
  /// from-current-value handling so rapid re-presses don't glitch. Uses CASpringAnimation
  /// per property with clean cancellation.
  private func restorePressUp() {
    intermediateContainer.layer.removeAnimation(forKey: "pressDown")

    let scaleAnim = CASpringAnimation(keyPath: "transform.scale")
    scaleAnim.damping = 0.7
    scaleAnim.stiffness = 100
    scaleAnim.mass = 1
    let currentScale = intermediateContainer.layer.presentation()?.value(forKey: "transform.scale")
    scaleAnim.fromValue = currentScale ?? pressScaleTarget
    scaleAnim.toValue = 1.0
    scaleAnim.fillMode = .forwards
    scaleAnim.isRemovedOnCompletion = false

    let opacityAnim = CASpringAnimation(keyPath: "opacity")
    opacityAnim.damping = 0.7
    opacityAnim.stiffness = 100
    opacityAnim.mass = 1
    let currentOpacity = intermediateContainer.layer.presentation()?.opacity
    opacityAnim.fromValue = currentOpacity ?? pressOpacityTarget
    opacityAnim.toValue = 1.0
    opacityAnim.fillMode = .forwards
    opacityAnim.isRemovedOnCompletion = false

    intermediateContainer.layer.add(scaleAnim, forKey: "scaleSpring")
    intermediateContainer.layer.add(opacityAnim, forKey: "opacitySpring")
  }
}
