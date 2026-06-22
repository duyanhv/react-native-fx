import CoreGraphics
import ExpoModulesCore

/// A motion spec entry for one named state, as it crosses the bridge.
internal struct FxStateMotionEntry: Record {
  @Field internal var state: String = ""
  @Field internal var spec: FxMotionPhaseSpec?
}

/// Turns the discrete `state` target into an interruptible N-state envelope on the content
/// driver, and reports each transition boundary as a semantic settle event.
///
/// A plain internal class owned by `FxStateView`; it drives `FxAnimationDriver` and is the
/// driver's completion source. The envelope shape is resolved per state from the preset,
/// overridden by an explicit motion map. All work is main-thread.
internal final class FxStateViewCoordinator {
  private unowned let view: FxStateView

  // The state we are currently animating toward, or have last settled at.
  private var targetState: String? = nil
  private var isAnimating = false

  // The first application seats the initial state with no animation.
  private var isFirstApplication = true

  // Latched config. Per the snapshot-semantics invariant, the target vector is resolved at
  // transition start, not stored pre-resolved.
  private var preset = "lift"
  private var stateMotion: [FxStateMotionEntry]? = nil

  internal init(view: FxStateView) {
    self.view = view
  }

  // MARK: - The discrete target

  /// Applies a `state` (plus latched config) target, driving the transition.
  internal func update(state: String, preset: String, stateMotion: [FxStateMotionEntry]?) {
    self.preset = preset
    self.stateMotion = stateMotion

    if isFirstApplication {
      isFirstApplication = false
      targetState = state
      view.snapContent(to: targetVector(for: state))
      return
    }

    guard state != targetState else {
      return  // same-target self-edges are no-ops
    }

    if isAnimating, let prev = targetState {
      emit(state: prev, finished: false, interrupted: true)
    }

    targetState = state
    isAnimating = true
    view.animateContent(to: targetVector(for: state))
  }

  /// The driver reached rest. Emits a settle event for the current target.
  internal func handleDriverCompletion() {
    guard isAnimating, let state = targetState else {
      return
    }
    isAnimating = false
    emit(state: state, finished: true, interrupted: false)
  }

  // MARK: - Target vector resolution

  /// Resolves the target vector for a named state: user spec, else preset, else identity.
  private func targetVector(for state: String) -> FxAnimationVector {
    if let userSpec = userSpec(for: state) {
      return resolve(userSpec)
    }
    if let presetVec = presetVector(for: state) {
      return presetVec
    }
    return .identity
  }

  private func userSpec(for state: String) -> FxMotionPhaseSpec? {
    return stateMotion?.first(where: { $0.state == state })?.spec
  }

  /// The provisional per-platform `lift` preset shape. The magnitudes are device-pending
  /// with the motion catalog and will be tuned at the device gate.
  private func presetVector(for state: String) -> FxAnimationVector? {
    guard preset == "lift" else {
      return nil
    }
    switch state {
    case "idle":
      return .identity
    case "selected":
      // Provisional: subtle scale + float. Device-tuned at the gate.
      return FxAnimationVector(opacity: 1, scale: 1.03, translationX: 0, translationY: -3, rotation: 0)
    default:
      return nil
    }
  }

  private func resolve(_ spec: FxMotionPhaseSpec) -> FxAnimationVector {
    var vector = FxAnimationVector.identity
    if let opacity = spec.opacity {
      vector.opacity = CGFloat(opacity)
    }
    if let scale = spec.scale {
      vector.scale = CGFloat(scale)
    }
    if let translateX = spec.translateX {
      vector.translationX = resolveTravel(translateX)
    }
    if let translateY = spec.translateY {
      vector.translationY = resolveTravel(translateY)
    }
    if let rotate = spec.rotate {
      vector.rotation = CGFloat(rotate) * .pi / 180
    }
    return vector
  }

  private func resolveTravel(_ travel: FxTravelSpec) -> CGFloat {
    if let value = travel.value {
      return CGFloat(value)
    }
    // TODO: resolve measured-edge travel from a layout observer when a state uses it.
    return 0
  }

  // MARK: - Event dispatch

  private func emit(state: String, finished: Bool, interrupted: Bool) {
    view.dispatchStateChange(state: state, finished: finished, interrupted: interrupted)
  }
}
