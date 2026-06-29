import CoreGraphics
import Foundation
import SwiftUI

internal struct FxAnimationVector: Equatable {
  var opacity: CGFloat
  var scaleX: CGFloat
  var scaleY: CGFloat
  var translationX: CGFloat
  var translationY: CGFloat
  var rotation: CGFloat

  // Normalized transform anchor in `[0,1]` of the target's bounds — (0.5, 0.5) is center, the
  // legacy behavior every uniform-scale caller depends on. It is a static property of the
  // envelope, not an animated channel: the spring never integrates it (see `update`), so the
  // origin a target carries is applied once when the driver seats the envelope. The reveal pins
  // it to the collapsed corner so non-uniform scale shrinks toward that corner, not the center.
  var originX: CGFloat
  var originY: CGFloat

  internal init(
    opacity: CGFloat, scaleX: CGFloat, scaleY: CGFloat, translationX: CGFloat, translationY: CGFloat,
    rotation: CGFloat, originX: CGFloat = 0.5, originY: CGFloat = 0.5
  ) {
    self.opacity = opacity
    self.scaleX = scaleX
    self.scaleY = scaleY
    self.translationX = translationX
    self.translationY = translationY
    self.rotation = rotation
    self.originX = originX
    self.originY = originY
  }

  /// Uniform-scale convenience: the shape every pre-reveal caller (presence, state) authors, where
  /// the two axes move together about the center.
  internal init(
    opacity: CGFloat, scale: CGFloat, translationX: CGFloat, translationY: CGFloat, rotation: CGFloat
  ) {
    self.init(
      opacity: opacity, scaleX: scale, scaleY: scale, translationX: translationX,
      translationY: translationY, rotation: rotation)
  }

  /// Reads/writes both axes together, so a uniform-scale caller keeps a single `scale` knob.
  internal var scale: CGFloat {
    get { return scaleX }
    set {
      scaleX = newValue
      scaleY = newValue
    }
  }

  internal static let identity = FxAnimationVector(opacity: 1, scale: 1, translationX: 0, translationY: 0, rotation: 0)
  internal static let zero = FxAnimationVector(opacity: 0, scale: 0, translationX: 0, translationY: 0, rotation: 0)

  internal func transform() -> CGAffineTransform {
    return CGAffineTransform.identity
      .translatedBy(x: translationX, y: translationY)
      .rotated(by: rotation)
      .scaledBy(x: scaleX, y: scaleY)
  }

  internal func isResting(at target: FxAnimationVector, velocity: FxAnimationVector) -> Bool {
    return abs(opacity - target.opacity) < 0.001
      && abs(scaleX - target.scaleX) < 0.001
      && abs(scaleY - target.scaleY) < 0.001
      && abs(translationX - target.translationX) < 0.1
      && abs(translationY - target.translationY) < 0.1
      && abs(rotation - target.rotation) < 0.001
      && velocity.maximumMagnitude < 0.01
  }

  private var maximumMagnitude: CGFloat {
    return [opacity, scaleX, scaleY, translationX, translationY, rotation].map(abs).max() ?? 0
  }
}

@available(iOS 17.0, *)
internal struct FxSpring {
  private let spring: Spring

  internal init() {
    spring = Spring()
  }

  internal var duration: TimeInterval {
    return spring.duration
  }

  internal var settlingDuration: TimeInterval {
    return spring.settlingDuration
  }

  internal func update(
    value: inout FxAnimationVector, velocity: inout FxAnimationVector, target: FxAnimationVector,
    deltaTime: TimeInterval
  ) {
    updateScalar(value: &value.opacity, velocity: &velocity.opacity, target: target.opacity, deltaTime: deltaTime)
    updateScalar(value: &value.scaleX, velocity: &velocity.scaleX, target: target.scaleX, deltaTime: deltaTime)
    updateScalar(value: &value.scaleY, velocity: &velocity.scaleY, target: target.scaleY, deltaTime: deltaTime)
    updateScalar(
      value: &value.translationX, velocity: &velocity.translationX, target: target.translationX, deltaTime: deltaTime)
    updateScalar(
      value: &value.translationY, velocity: &velocity.translationY, target: target.translationY, deltaTime: deltaTime)
    updateScalar(value: &value.rotation, velocity: &velocity.rotation, target: target.rotation, deltaTime: deltaTime)
  }

  internal func advance(
    value: FxAnimationVector, velocity: FxAnimationVector, target: FxAnimationVector, elapsedTime: TimeInterval
  )
    -> (value: FxAnimationVector, velocity: FxAnimationVector)
  {
    var currentValue = value
    var currentVelocity = velocity
    var remainingTime = max(0, elapsedTime)

    while remainingTime > 0 {
      let deltaTime = min(remainingTime, 1.0 / 120.0)
      update(value: &currentValue, velocity: &currentVelocity, target: target, deltaTime: deltaTime)
      remainingTime -= deltaTime
    }

    return (currentValue, currentVelocity)
  }

  internal func clippingOpposingInertia(
    velocity: FxAnimationVector,
    from value: FxAnimationVector,
    to target: FxAnimationVector
  ) -> FxAnimationVector {
    return FxAnimationVector(
      opacity: clippedVelocity(velocity.opacity, value: value.opacity, target: target.opacity),
      scaleX: clippedVelocity(velocity.scaleX, value: value.scaleX, target: target.scaleX),
      scaleY: clippedVelocity(velocity.scaleY, value: value.scaleY, target: target.scaleY),
      translationX: clippedVelocity(velocity.translationX, value: value.translationX, target: target.translationX),
      translationY: clippedVelocity(velocity.translationY, value: value.translationY, target: target.translationY),
      rotation: clippedVelocity(velocity.rotation, value: value.rotation, target: target.rotation))
  }

  private func updateScalar(value: inout CGFloat, velocity: inout CGFloat, target: CGFloat, deltaTime: TimeInterval) {
    var doubleValue = Double(value)
    var doubleVelocity = Double(velocity)
    spring.update(value: &doubleValue, velocity: &doubleVelocity, target: Double(target), deltaTime: deltaTime)
    value = CGFloat(doubleValue)
    velocity = CGFloat(doubleVelocity)
  }

  /// Drops velocity only for axes already moving away from the new target.
  ///
  /// A retarget should preserve momentum when it helps the new envelope, but carrying
  /// opposing inertia makes the content visibly recoil before it moves toward the target.
  private func clippedVelocity(_ velocity: CGFloat, value: CGFloat, target: CGFloat) -> CGFloat {
    let displacement = target - value
    guard abs(displacement) > 0.0001 else {
      return 0
    }
    return displacement.sign == velocity.sign ? velocity : 0
  }
}
