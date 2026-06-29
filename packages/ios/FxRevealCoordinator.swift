import CoreGraphics
import UIKit

/// Turns the discrete `open` target into an interruptible collapsed↔expanded reveal on the
/// geometry driver, and reports each phase boundary as a semantic event.
///
/// A plain internal class owned by `FxRevealView`; it never crosses the JS boundary (no
/// `SharedObject`). It drives two `FxAnimationDriver`s — one for the expanded layer's geometry +
/// fade, one for the collapsed layer's counter-fade — and is the geometry driver's completion
/// source. v1 owns both endpoints (the shell's own collapsed frame and a natively computed
/// placement), so it discovers no foreign tree: Boundary A by construction. All work is main-thread.
internal final class FxRevealCoordinator {
  internal enum Phase {
    case collapsed
    case expanding
    case expanded
    case collapsing
  }

  private enum EnvelopePhase {
    case expand
    case collapse
  }

  private unowned let surface: FxRevealView
  private(set) var phase: Phase = .collapsed

  // The first application seats the initial state with no motion; every later edge animates.
  private var isInitialApplication = true

  // True while a fresh open/close is held until the first layout pass lands. The initial prop
  // batch can precede layout, leaving the placement geometry unresolvable; `handleContentLayout`
  // resumes the held edge once the shell has a real size.
  private var pendingTarget: Bool?

  private var placement = "bottom-half"

  internal init(surface: FxRevealView) {
    self.surface = surface
  }

  // MARK: - The discrete target

  /// Applies an `open` (plus latched placement) target, running the reveal transition table.
  internal func update(open: Bool, placement: String) {
    self.placement = placement

    if isInitialApplication {
      isInitialApplication = false
      seatInitial(open: open)
      return
    }

    switch (phase, open) {
    case (.collapsed, true):
      beginExpand()
    case (.expanded, false):
      beginCollapse()
    case (.expanding, false):
      emit(.expand, finished: false, interrupted: true)
      beginCollapse()
    case (.collapsing, true):
      emit(.collapse, finished: false, interrupted: true)
      beginExpand()
    default:
      break  // same-value self-edges are no-ops
    }
  }

  /// The geometry driver reached rest for the active target. Only a settled expand or collapse
  /// advances the FSM and emits; a superseded target never fires the driver completion.
  internal func handleDriverCompletion() {
    switch phase {
    case .expanding:
      phase = .expanded
      emit(.expand, finished: true, interrupted: false)
    case .collapsing:
      phase = .collapsed
      surface.setExpandedInteractive(false)
      emit(.collapse, finished: true, interrupted: false)
    default:
      break
    }
  }

  /// The shell finished a layout pass. Re-seat the resting geometry so a rotation/resize keeps the
  /// inverse transform correct, and resume an edge that was held until the placement could resolve.
  internal func handleContentLayout() {
    guard surface.hasResolvedContentSize else {
      return
    }
    if let target = pendingTarget {
      pendingTarget = nil
      // A deferred initial seat snaps (no animation, no completion) once the placement resolves.
      seatInitial(open: target)
      return
    }
    // Keep a resting state pinned to the current geometry (no animation) across layout changes.
    switch phase {
    case .collapsed:
      surface.snapExpanded(to: collapsedGeometry())
      surface.snapCollapsedOpacity(to: 1)
      surface.setExpandedInteractive(false)
    case .expanded:
      surface.snapExpanded(to: expandedGeometry())
      surface.snapCollapsedOpacity(to: 0)
      surface.setExpandedInteractive(true)
    default:
      break  // an in-flight edge owns the geometry; do not disturb it
    }
  }

  // MARK: - Phase transitions

  private func seatInitial(open: Bool) {
    // Snap the resting state immediately, even before layout resolves: a collapsed seat hides the
    // expanded layer (opacity 0 + non-interactive) at once, so it never flashes at mount; an open
    // seat also keeps the expanded layer hidden until real host geometry resolves, so a
    // non-full-window host mounted open=true never shows the wrong-size flash. The held target
    // re-seats (by snap, no animation) on the first layout pass. No animation, no completion.
    if open {
      phase = .expanded
      surface.snapCollapsedOpacity(to: 0)
      if !surface.hasResolvedContentSize {
        surface.setExpandedInteractive(false)
        pendingTarget = open
        return
      }
      surface.setExpandedInteractive(true)
      surface.snapExpanded(to: expandedGeometry())
    } else {
      phase = .collapsed
      surface.setExpandedInteractive(false)
      surface.snapExpanded(to: collapsedGeometry())
      surface.snapCollapsedOpacity(to: 1)
      if !surface.hasResolvedContentSize {
        pendingTarget = open
      }
    }
  }

  private func beginExpand() {
    let fromCollapsing = (phase == .collapsing)
    phase = .expanding
    guard surface.hasResolvedContentSize else {
      pendingTarget = true
      return
    }
    surface.setExpandedInteractive(true)
    // A fresh expand seats the inverse (collapsed) geometry first; a re-expand mid-collapse keeps
    // the current animated value so the spring retargets rather than snapping back.
    if !fromCollapsing {
      surface.snapExpanded(to: collapsedGeometry())
    }
    surface.animateExpanded(to: expandedGeometry())
    surface.animateCollapsedOpacity(to: 0)
  }

  private func beginCollapse() {
    phase = .collapsing
    guard surface.hasResolvedContentSize else {
      pendingTarget = false
      return
    }
    surface.animateExpanded(to: collapsedGeometry())
    surface.animateCollapsedOpacity(to: 1)
  }

  // MARK: - Geometry resolution

  /// The expanded-at-rest target: the placement filled, geometry identity, content faded in. The
  /// origin pins the transform anchor to the collapsed corner so the inverse shrinks toward it.
  private func expandedGeometry() -> FxAnimationVector {
    return FxAnimationVector(
      opacity: 1, scaleX: 1, scaleY: 1, translationX: 0, translationY: 0, rotation: 0,
      originX: 0, originY: 0)
  }

  /// The collapsed appearance of the expanded layer: the inverse transform that maps the placement
  /// rect back onto the shell's own (collapsed) frame, content faded out. Computed by the
  /// inverse-transform technique so the expanded content rasterizes at full target size and only
  /// the transform shrinks it — sharp when it reaches identity.
  private func collapsedGeometry() -> FxAnimationVector {
    let from = surface.collapsedFrameInShell()
    let to = surface.resolvedPlacementRect(placement)
    guard to.width > 0, to.height > 0 else {
      return FxAnimationVector(
        opacity: 0, scaleX: 1, scaleY: 1, translationX: 0, translationY: 0, rotation: 0,
        originX: 0, originY: 0)
    }
    return FxAnimationVector(
      opacity: 0,
      scaleX: from.width / to.width,
      scaleY: from.height / to.height,
      translationX: from.minX - to.minX,
      translationY: from.minY - to.minY,
      rotation: 0,
      originX: 0,
      originY: 0)
  }

  private func emit(_ phase: EnvelopePhase, finished: Bool, interrupted: Bool) {
    surface.dispatchRevealTransitionEnd(
      phase: phase == .expand ? "expand" : "collapse", finished: finished, interrupted: interrupted)
  }
}
