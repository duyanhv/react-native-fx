package expo.modules.reactnativefx

/**
 * Turns the discrete `open` target into an interruptible collapsed↔expanded reveal on the geometry
 * driver, and reports each phase boundary as a semantic event.
 *
 * A plain internal class owned by [FxRevealView]; it never crosses the JS boundary. It drives two
 * [FxAnimationDriver]s — one for the expanded layer's geometry + fade, one for the collapsed
 * layer's counter-fade — and is the geometry driver's completion source. v1 owns both endpoints
 * (the shell's own collapsed frame and a natively computed placement), so it discovers no foreign
 * tree: Boundary A by construction. All work is on the UI thread.
 */
internal class FxRevealCoordinator(private val surface: FxRevealView) {
  internal enum class Phase {
    COLLAPSED,
    EXPANDING,
    EXPANDED,
    COLLAPSING,
  }

  private enum class EnvelopePhase {
    EXPAND,
    COLLAPSE,
  }

  var phase: Phase = Phase.COLLAPSED
    private set

  // The first application seats the initial state with no motion; every later edge animates.
  private var isInitialApplication = true

  // Holds an open/close edge until the first layout pass lands, when the placement can resolve.
  private var pendingTarget: Boolean? = null

  private var placement = "bottom-half"

  /** Applies an `open` (plus latched placement) target, running the reveal transition table. */
  fun update(open: Boolean, placement: String) {
    this.placement = placement

    if (isInitialApplication) {
      isInitialApplication = false
      seatInitial(open)
      return
    }

    when {
      phase == Phase.COLLAPSED && open -> beginExpand()
      phase == Phase.EXPANDED && !open -> beginCollapse()
      phase == Phase.EXPANDING && !open -> {
        emit(EnvelopePhase.EXPAND, finished = false, interrupted = true)
        beginCollapse()
      }
      phase == Phase.COLLAPSING && open -> {
        emit(EnvelopePhase.COLLAPSE, finished = false, interrupted = true)
        beginExpand()
      }
      else -> Unit // same-value self-edges are no-ops
    }
  }

  /**
   * The geometry driver reached rest for the active target. Only a settled expand or collapse
   * advances the FSM and emits; a superseded target never fires the driver completion.
   */
  fun handleDriverCompletion() {
    when (phase) {
      Phase.EXPANDING -> {
        phase = Phase.EXPANDED
        emit(EnvelopePhase.EXPAND, finished = true, interrupted = false)
      }
      Phase.COLLAPSING -> {
        phase = Phase.COLLAPSED
        surface.setExpandedInteractive(false)
        emit(EnvelopePhase.COLLAPSE, finished = true, interrupted = false)
      }
      else -> Unit
    }
  }

  /**
   * The shell finished a layout pass. Re-seat resting geometry so a rotation/resize keeps the
   * inverse transform correct, and resume an edge held until the placement could resolve.
   */
  fun handleContentLayout() {
    if (!surface.hasResolvedContentSize) return
    pendingTarget?.let { target ->
      pendingTarget = null
      // A deferred initial seat snaps (no animation, no completion) once the placement resolves.
      seatInitial(target)
      return
    }
    when (phase) {
      Phase.COLLAPSED -> {
        surface.snapExpanded(collapsedGeometry())
        surface.snapCollapsedOpacity(1f)
        surface.setExpandedInteractive(false)
      }
      Phase.EXPANDED -> {
        surface.snapExpanded(expandedGeometry())
        surface.snapCollapsedOpacity(0f)
        surface.setExpandedInteractive(true)
      }
      else -> Unit // an in-flight edge owns the geometry; do not disturb it
    }
  }

  private fun seatInitial(open: Boolean) {
    // Snap the resting state immediately, even before layout resolves: a collapsed seat hides the
    // expanded layer (opacity 0 + non-interactive) at once, so it never flashes at mount; an open
    // seat also keeps the expanded layer hidden until real host geometry resolves, so a
    // non-full-window host mounted open=true never shows the wrong-size flash. The held target
    // re-seats (by snap, no animation) on the first layout pass. No animation, no completion.
    if (open) {
      phase = Phase.EXPANDED
      surface.snapCollapsedOpacity(0f)
      if (!surface.hasResolvedContentSize) {
        surface.setExpandedInteractive(false)
        pendingTarget = open
        return
      }
      surface.setExpandedInteractive(true)
      surface.snapExpanded(expandedGeometry())
    } else {
      phase = Phase.COLLAPSED
      surface.setExpandedInteractive(false)
      surface.snapExpanded(collapsedGeometry())
      surface.snapCollapsedOpacity(1f)
      if (!surface.hasResolvedContentSize) {
        pendingTarget = open
      }
    }
  }

  private fun beginExpand() {
    val fromCollapsing = phase == Phase.COLLAPSING
    phase = Phase.EXPANDING
    if (!surface.hasResolvedContentSize) {
      pendingTarget = true
      return
    }
    surface.setExpandedInteractive(true)
    // A fresh expand seats the inverse (collapsed) geometry first; a re-expand mid-collapse keeps
    // the current animated value so the spring retargets rather than snapping back.
    if (!fromCollapsing) {
      surface.snapExpanded(collapsedGeometry())
    }
    surface.animateExpanded(expandedGeometry())
    surface.animateCollapsedOpacity(0f)
  }

  private fun beginCollapse() {
    phase = Phase.COLLAPSING
    if (!surface.hasResolvedContentSize) {
      pendingTarget = false
      return
    }
    surface.animateExpanded(collapsedGeometry())
    surface.animateCollapsedOpacity(1f)
  }

  /**
   * The expanded-at-rest target: the placement filled, geometry identity, content faded in. The
   * pivot pins the transform anchor to the collapsed corner so the inverse shrinks toward it.
   */
  private fun expandedGeometry(): FxAnimationVector =
    FxAnimationVector(
      opacity = 1f, scaleX = 1f, scaleY = 1f, translationX = 0f, translationY = 0f, rotation = 0f,
      originX = 0f, originY = 0f,
    )

  /**
   * The collapsed appearance of the expanded layer: the inverse transform mapping the placement
   * rect back onto the shell's own (collapsed) frame, content faded out. Built so the expanded
   * content rasterizes at full target size and only the transform shrinks it — sharp at identity.
   */
  private fun collapsedGeometry(): FxAnimationVector {
    val from = surface.collapsedFrameInShell()
    val to = surface.resolvedPlacementRect(placement)
    if (to.width() <= 0 || to.height() <= 0) {
      return FxAnimationVector(
        opacity = 0f, scaleX = 1f, scaleY = 1f, translationX = 0f, translationY = 0f, rotation = 0f,
        originX = 0f, originY = 0f,
      )
    }
    val scaleX = from.width().toFloat() / to.width().toFloat()
    val scaleY = from.height().toFloat() / to.height().toFloat()
    return FxAnimationVector(
      opacity = 0f,
      scaleX = scaleX,
      scaleY = scaleY,
      translationX = from.left.toFloat() - (to.left.toFloat() * scaleX),
      translationY = from.top.toFloat() - (to.top.toFloat() * scaleY),
      rotation = 0f,
      originX = 0f,
      originY = 0f,
    )
  }

  private fun emit(phase: EnvelopePhase, finished: Boolean, interrupted: Boolean) {
    surface.dispatchRevealTransitionEnd(
      phase = if (phase == EnvelopePhase.EXPAND) "expand" else "collapse",
      finished = finished,
      interrupted = interrupted,
    )
  }
}
