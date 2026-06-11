import QuartzCore
import UIKit

internal final class FxAnimationDriver {
  internal typealias Completion = () -> Void

  private weak var targetView: UIView?
  private let completion: Completion

  private var envelopeIdentifier = 0
  private var displayLink: CADisplayLink?
  private var displayLinkTarget: FxAnimationVector?
  private var displayLinkValue = FxAnimationVector.identity
  private var displayLinkVelocity = FxAnimationVector.zero
  private var lastDisplayLinkTimestamp: CFTimeInterval?

  private var renderServerStartValue = FxAnimationVector.identity
  private var renderServerTarget = FxAnimationVector.identity
  private var renderServerStartTime: CFTimeInterval?

  /// Drives one transform/opacity envelope on the fx-owned container.
  ///
  /// All entry points run on the main thread because UIKit, Core Animation model-layer
  /// writes, and `CADisplayLink` callbacks are main-run-loop work.
  internal init(targetView: UIView, completion: @escaping Completion) {
    self.targetView = targetView
    self.completion = completion
  }

  deinit {
    stopDisplayLink()
  }

  // MARK: - Animation

  internal func animate(to target: FxAnimationVector) {
    guard let targetView else {
      completion()
      return
    }

    envelopeIdentifier += 1
    let identifier = envelopeIdentifier

    if shouldReduceMotion || !isSpringAvailable {
      stopDisplayLink()
      targetView.layer.removeAllAnimations()
      apply(target)
      completion()
      return
    }

    if displayLink != nil || targetView.layer.animationKeys()?.isEmpty == false {
      retarget(to: target, identifier: identifier)
      return
    }

    startRenderServerAnimation(to: target, identifier: identifier)
  }

  internal func cancel() {
    guard let targetView else {
      stopDisplayLink()
      return
    }

    let currentValue = readPresentationValue() ?? readModelValue()
    stopDisplayLink()
    displayLinkTarget = nil
    renderServerStartTime = nil
    targetView.layer.removeAllAnimations()
    apply(currentValue)
  }

  internal func pause() {
    stopDisplayLink()
  }

  internal func resume() {
    guard displayLinkTarget != nil else {
      return
    }
    startDisplayLink()
  }

  // MARK: - Render-server path

  private func startRenderServerAnimation(to target: FxAnimationVector, identifier: Int) {
    guard let targetView else {
      return
    }
    guard #available(iOS 17.0, *) else {
      apply(target)
      completion()
      return
    }

    renderServerStartValue = readModelValue()
    renderServerTarget = target
    renderServerStartTime = CACurrentMediaTime()

    let spring = FxSpring()
    UIView.animate(
      springDuration: spring.duration,
      bounce: 0,
      initialSpringVelocity: 0,
      delay: 0,
      options: [.allowUserInteraction, .beginFromCurrentState]
    ) { [weak self] in
      self?.apply(target)
    } completion: { [weak self] completed in
      guard let self, completed, identifier == envelopeIdentifier else {
        return
      }
      renderServerStartTime = nil
      completion()
    }
  }

  private func retarget(to target: FxAnimationVector, identifier: Int) {
    guard #available(iOS 17.0, *) else {
      apply(target)
      completion()
      return
    }

    let spring = FxSpring()
    let presentationValue = readPresentationValue() ?? readModelValue()
    let predictedVelocity = readPredictedVelocity(spring: spring)
    // From this point on, velocity comes from the display-link integrator. Keeping
    // render-server provenance past the handoff would corrupt a second retarget.
    renderServerStartTime = nil
    let carriedVelocity = spring.clippingOpposingInertia(
      velocity: predictedVelocity, from: presentationValue, to: target)

    // The retarget branch writes model-layer state each tick so hit-testing follows
    // the visual position while the in-app integrator owns the envelope.
    targetView?.layer.removeAllAnimations()
    displayLinkValue = presentationValue
    displayLinkVelocity = carriedVelocity
    displayLinkTarget = target
    apply(displayLinkValue)
    startDisplayLink()
  }

  /// Predicts velocity for the first retarget because Core Animation exposes presentation
  /// position but not presentation velocity.
  ///
  /// Later retargets happen inside the display-link loop, where `displayLinkVelocity`
  /// is already the live velocity from the previous tick.
  @available(iOS 17.0, *)
  private func readPredictedVelocity(spring: FxSpring) -> FxAnimationVector {
    guard let renderServerStartTime else {
      return displayLinkVelocity
    }
    let elapsedTime = CACurrentMediaTime() - renderServerStartTime
    let state = spring.advance(
      value: renderServerStartValue,
      velocity: .zero,
      target: renderServerTarget,
      elapsedTime: elapsedTime)
    return state.velocity
  }

  // MARK: - Display link path

  private func startDisplayLink() {
    guard displayLink == nil else {
      return
    }
    lastDisplayLinkTimestamp = nil
    let link = CADisplayLink(target: self, selector: #selector(handleDisplayLink(_:)))
    link.add(to: .main, forMode: .common)
    displayLink = link
  }

  private func stopDisplayLink() {
    displayLink?.invalidate()
    displayLink = nil
    lastDisplayLinkTimestamp = nil
  }

  @objc private func handleDisplayLink(_ link: CADisplayLink) {
    guard #available(iOS 17.0, *), let target = displayLinkTarget else {
      stopDisplayLink()
      return
    }

    let previousTimestamp = lastDisplayLinkTimestamp ?? link.timestamp
    let deltaTime = max(0, min(link.timestamp - previousTimestamp, 1.0 / 30.0))
    lastDisplayLinkTimestamp = link.timestamp

    let spring = FxSpring()
    spring.update(value: &displayLinkValue, velocity: &displayLinkVelocity, target: target, deltaTime: deltaTime)
    apply(displayLinkValue)

    // A newer target supersedes the old envelope; completion belongs only to the
    // active target that reaches rest.
    guard displayLinkValue.isResting(at: target, velocity: displayLinkVelocity) else {
      return
    }

    stopDisplayLink()
    displayLinkTarget = nil
    apply(target)
    renderServerStartTime = nil
    completion()
  }

  // MARK: - State reads

  private var isSpringAvailable: Bool {
    if #available(iOS 17.0, *) {
      return true
    }
    return false
  }

  private var shouldReduceMotion: Bool {
    return UIAccessibility.isReduceMotionEnabled
  }

  private func readModelValue() -> FxAnimationVector {
    guard let targetView else {
      return .identity
    }
    return FxAnimationVector(
      opacity: targetView.alpha,
      scale: targetView.transform.fxScale,
      translationX: targetView.transform.tx,
      translationY: targetView.transform.ty,
      rotation: targetView.transform.fxRotation)
  }

  private func readPresentationValue() -> FxAnimationVector? {
    guard let presentation = targetView?.layer.presentation() else {
      return nil
    }
    let transform = presentation.affineTransform()
    return FxAnimationVector(
      opacity: CGFloat(presentation.opacity),
      scale: transform.fxScale,
      translationX: transform.tx,
      translationY: transform.ty,
      rotation: transform.fxRotation)
  }

  private func apply(_ value: FxAnimationVector) {
    targetView?.alpha = value.opacity
    targetView?.transform = value.transform()
  }
}

extension CGAffineTransform {
  fileprivate var fxScale: CGFloat {
    return sqrt(a * a + c * c)
  }

  fileprivate var fxRotation: CGFloat {
    return atan2(b, a)
  }
}
