import CoreGraphics
import ExpoModulesCore
import UIKit

/// A travel magnitude as it crosses the bridge: a fixed delta in points, or a measured edge.
internal struct FxTravelSpec: Record {
  @Field internal var value: Double?
  @Field internal var measureEdge: String?
}

/// One lifecycle phase's shape as it crosses the bridge — the JS `Travel` union flattened.
internal struct FxMotionPhaseSpec: Record {
  @Field internal var opacity: Double?
  @Field internal var scale: Double?
  @Field internal var translateX: FxTravelSpec?
  @Field internal var translateY: FxTravelSpec?
  @Field internal var rotate: Double?
  @Field internal var origin: String?
}

/// An explicit presence envelope override (the `motion` map), per phase.
internal struct FxPresenceMotion: Record {
  @Field internal var enter: FxMotionPhaseSpec?
  @Field internal var exit: FxMotionPhaseSpec?
}

/// Turns the discrete `visible` target into an interruptible enter/exit envelope on the
/// content driver, and reports each phase boundary as a semantic event — the native half of
/// the deferred-unmount handshake.
///
/// A plain internal class owned by `FxSurfaceView`; it never crosses the JS boundary (no
/// `SharedObject`). It drives `FxAnimationDriver` and is the driver's completion source. The
/// envelope shape is resolved per platform from the preset, overridden by an explicit motion
/// map; measured-edge travel resolves from `FxLayoutObserver`. All work is main-thread.
internal final class FxPresenceCoordinator {
  internal enum Phase {
    case absent
    case entering
    case present
    case exiting
  }

  private enum EnvelopePhase {
    case enter
    case exit
  }

  private unowned let surface: FxSurfaceView
  private(set) var phase: Phase = .absent

  // The first application seats the initial state, where `appear` decides enter-vs-snap; every
  // later edge is a genuine transition that always animates.
  private var isInitialApplication = true

  // True while a fresh enter is held until the first layout pass lands. The initial prop batch
  // can precede layout, leaving measured travel at 0 — which would play a fade with no slide.
  // `handleContentLayout` resumes the held enter once the surface has a real size.
  private var enterAwaitingLayout = false

  // Latched config. Per the snapshot-semantics invariant a mid-flight change applies from the
  // next phase, so the away vector is resolved at phase start, not stored pre-resolved.
  private var preset = "transient"
  private var motion: FxPresenceMotion?

  internal init(surface: FxSurfaceView) {
    self.surface = surface
  }

  // MARK: - The discrete target

  /// Applies a `visible` (plus latched config) target, running the presence transition table.
  internal func update(visible: Bool, appear: Bool, preset: String, motion: FxPresenceMotion?) {
    self.preset = preset
    self.motion = motion

    if isInitialApplication {
      isInitialApplication = false
      if visible {
        appear ? beginEnter() : snapToPresent()
      }
      return
    }

    switch (phase, visible) {
    case (.absent, true):
      beginEnter()
    case (.present, false):
      beginExit()
    case (.entering, false):
      // Cut the enter short and retarget to exit from the present animated value.
      emit(.enter, finished: false, interrupted: true)
      beginExit()
    case (.exiting, true):
      // Cut the exit short and retarget back toward present.
      emit(.exit, finished: false, interrupted: true)
      beginEnter()
    default:
      break  // same-value self-edges are no-ops
    }
  }

  /// The driver reached rest for the active target. Only a settled enter or exit advances the
  /// FSM and emits; a superseded target never fires the driver completion.
  internal func handleDriverCompletion() {
    switch phase {
    case .entering:
      phase = .present
      emit(.enter, finished: true, interrupted: false)
    case .exiting:
      phase = .absent
      emit(.exit, finished: true, interrupted: false)
    default:
      break
    }
  }

  /// The surface finished a layout pass. If a fresh enter was held because its travel could not
  /// resolve before layout, re-seat with the now-measured away vector and run the enter.
  internal func handleContentLayout() {
    guard enterAwaitingLayout, surface.hasResolvedContentSize else {
      return
    }
    enterAwaitingLayout = false
    surface.snapContent(to: awayVector(for: .enter))
    surface.animateContent(to: .identity)
  }

  // MARK: - Phase transitions

  private func beginEnter() {
    let fromExiting = (phase == .exiting)
    phase = .entering
    enterAwaitingLayout = false
    // A fresh enter seats the hidden start first; a re-enter mid-exit keeps the current value
    // so the spring retargets rather than jumping offscreen.
    if !fromExiting {
      surface.snapContent(to: awayVector(for: .enter))
      // The content is seated hidden; if travel cannot resolve yet because layout has not landed,
      // hold the animation until the first layout pass rather than play a slide-less fade.
      if !surface.hasResolvedContentSize {
        enterAwaitingLayout = true
        return
      }
    }
    surface.animateContent(to: .identity)
  }

  private func beginExit() {
    enterAwaitingLayout = false
    phase = .exiting
    surface.animateContent(to: awayVector(for: .exit))
  }

  private func snapToPresent() {
    enterAwaitingLayout = false
    phase = .present
    surface.snapContent(to: .identity)
  }

  // MARK: - Envelope resolution

  /// Resolves the hidden/away vector for a phase: the user's `motion` spec, else the preset's
  /// platform-native shape, else identity (the motion-map fallback).
  private func awayVector(for phase: EnvelopePhase) -> FxAnimationVector {
    if let userSpec = userSpec(for: phase) {
      return resolve(userSpec)
    }
    if let presetVector = presetAwayVector() {
      return presetVector
    }
    return .identity
  }

  private func userSpec(for phase: EnvelopePhase) -> FxMotionPhaseSpec? {
    switch phase {
    case .enter: return motion?.enter
    case .exit: return motion?.exit
    }
  }

  /// The provisional per-platform preset shape. iOS `transient` mirrors the system banner: a
  /// top-edge slide with a fade. The magnitudes are device-pending with the motion catalog.
  private func presetAwayVector() -> FxAnimationVector? {
    guard preset == "transient" else {
      return nil
    }
    return FxAnimationVector(
      opacity: 0, scale: 1, translationX: 0, translationY: -contentHeight, rotation: 0)
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

  /// A fixed delta passes through; a measured token resolves its signed magnitude from the
  /// laid-out frame via `FxLayoutObserver`.
  private func resolveTravel(_ travel: FxTravelSpec) -> CGFloat {
    if let value = travel.value {
      return CGFloat(value)
    }
    guard let raw = travel.measureEdge, let edge = FxEdge(rawValue: raw) else {
      return 0
    }
    let distance = surface.layoutObserver.readTravelDistance(to: edge)
    switch edge {
    case .top, .left: return -distance
    case .bottom, .right: return distance
    }
  }

  /// The view's own height, the provisional `transient` travel. Falls back to the live bounds
  /// before the first layout observation lands.
  private var contentHeight: CGFloat {
    let observed = surface.layoutObserver.readFrameInParent().height
    return observed > 0 ? observed : surface.bounds.height
  }

  private func emit(_ phase: EnvelopePhase, finished: Bool, interrupted: Bool) {
    surface.dispatchPresenceTransitionEnd(
      phase: phase == .enter ? "enter" : "exit", finished: finished, interrupted: interrupted)
  }
}
