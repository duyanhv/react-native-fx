package expo.modules.reactnativefx

import androidx.dynamicanimation.animation.SpringForce
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** A travel magnitude as it crosses the bridge: a fixed delta in points, or a measured edge. */
data class FxTravelSpec(
  @Field val value: Double? = null,
  @Field val measureEdge: String? = null,
) : Record

/** One lifecycle phase's shape as it crosses the bridge — the JS `Travel` union flattened. */
data class FxMotionPhaseSpec(
  @Field val opacity: Double? = null,
  @Field val scale: Double? = null,
  @Field val translateX: FxTravelSpec? = null,
  @Field val translateY: FxTravelSpec? = null,
  @Field val rotate: Double? = null,
  @Field val origin: String? = null,
) : Record

/** An explicit presence envelope override (the `motion` map), per phase. */
data class FxPresenceMotion(
  @Field val enter: FxMotionPhaseSpec? = null,
  @Field val exit: FxMotionPhaseSpec? = null,
) : Record

/** The payload of the presence lifecycle completion event. */
data class FxTransitionEndEvent(
  @Field val owner: String,
  @Field val phase: String,
  @Field val finished: Boolean,
  @Field val interrupted: Boolean,
) : Record

/**
 * Turns the discrete `visible` target into an interruptible enter/exit envelope on the content
 * driver, and reports each phase boundary as a semantic event — the native half of the
 * deferred-unmount handshake.
 *
 * A plain internal class owned by `FxSurfaceView`; it never crosses the JS boundary. It drives
 * `FxAnimationDriver` and is the driver's completion source. The envelope shape is resolved per
 * platform from the preset, overridden by an explicit motion map; measured-edge travel resolves
 * from `FxLayoutObserver`. All work is on the UI thread.
 */
internal class FxPresenceCoordinator(private val surface: FxSurfaceView) {
  internal enum class Phase {
    ABSENT,
    ENTERING,
    PRESENT,
    EXITING,
  }

  private enum class EnvelopePhase {
    ENTER,
    EXIT,
  }

  var phase: Phase = Phase.ABSENT
    private set

  // The first application seats the initial state, where `appear` decides enter-vs-snap; every
  // later edge is a genuine transition that always animates.
  private var isInitialApplication = true

  // True while a fresh enter is held until the first layout pass lands. The initial prop batch
  // can precede layout, leaving measured travel at 0 — which would play a fade with no slide.
  // `handleContentLayout` resumes the held enter once the surface has a real size.
  private var enterAwaitingLayout = false

  // Latched config; the away vector is resolved at phase start per the snapshot-semantics rule.
  private var preset = "transient"
  private var motion: FxPresenceMotion? = null

  /** Applies a `visible` (plus latched config) target, running the presence transition table. */
  fun update(visible: Boolean, appear: Boolean, preset: String, motion: FxPresenceMotion?) {
    this.preset = preset
    this.motion = motion

    if (isInitialApplication) {
      isInitialApplication = false
      if (visible) {
        if (appear) beginEnter() else snapToPresent()
      }
      return
    }

    when {
      phase == Phase.ABSENT && visible -> beginEnter()
      phase == Phase.PRESENT && !visible -> beginExit()
      phase == Phase.ENTERING && !visible -> {
        // Cut the enter short and retarget to exit from the present animated value.
        emit(EnvelopePhase.ENTER, finished = false, interrupted = true)
        beginExit()
      }
      phase == Phase.EXITING && visible -> {
        // Cut the exit short and retarget back toward present.
        emit(EnvelopePhase.EXIT, finished = false, interrupted = true)
        beginEnter()
      }
      else -> Unit // same-value self-edges are no-ops
    }
  }

  /**
   * The surface finished a layout pass. If a fresh enter was held because its travel could not
   * resolve before layout, re-seat with the now-measured away vector and run the enter.
   */
  internal fun handleContentLayout() {
    if (!enterAwaitingLayout || !surface.hasResolvedContentSize) return
    enterAwaitingLayout = false
    surface.snapContent(awayVector(EnvelopePhase.ENTER))
    surface.animateContentTo(FxAnimationVector(), spring = presetSpring())
  }

  /**
   * The driver reached rest for the active target. Only a settled enter or exit advances the
   * FSM and emits; a superseded target never fires the driver completion.
   */
  fun handleDriverCompletion() {
    when (phase) {
      Phase.ENTERING -> {
        phase = Phase.PRESENT
        emit(EnvelopePhase.ENTER, finished = true, interrupted = false)
      }
      Phase.EXITING -> {
        phase = Phase.ABSENT
        emit(EnvelopePhase.EXIT, finished = true, interrupted = false)
      }
      else -> Unit
    }
  }

  private fun beginEnter() {
    val fromExiting = phase == Phase.EXITING
    phase = Phase.ENTERING
    enterAwaitingLayout = false
    // A fresh enter seats the hidden start first; a re-enter mid-exit keeps the current value so
    // the spring retargets rather than jumping offscreen.
    if (!fromExiting) {
      surface.snapContent(awayVector(EnvelopePhase.ENTER))
      // The content is seated hidden; if travel cannot resolve yet because layout has not landed,
      // hold the animation until the first layout pass rather than play a slide-less fade.
      if (!surface.hasResolvedContentSize) {
        enterAwaitingLayout = true
        return
      }
    }
    surface.animateContentTo(FxAnimationVector(), spring = presetSpring())
  }

  private fun beginExit() {
    enterAwaitingLayout = false
    phase = Phase.EXITING
    surface.animateContentTo(awayVector(EnvelopePhase.EXIT), spring = presetSpring())
  }

  private fun snapToPresent() {
    enterAwaitingLayout = false
    phase = Phase.PRESENT
    surface.snapContent(FxAnimationVector())
  }

  /**
   * Resolves the hidden/away vector for a phase: the user's `motion` spec, else the preset's
   * platform-native shape, else identity (the motion-map fallback).
   */
  private fun awayVector(phase: EnvelopePhase): FxAnimationVector {
    userSpec(phase)?.let { return resolve(it) }
    presetAwayVector()?.let { return it }
    return FxAnimationVector()
  }

  private fun userSpec(phase: EnvelopePhase): FxMotionPhaseSpec? =
    when (phase) {
      EnvelopePhase.ENTER -> motion?.enter
      EnvelopePhase.EXIT -> motion?.exit
    }

  /**
   * The provisional per-platform preset shape. Android `transient` mirrors the snackbar: a
   * bottom-edge slide with a fade. `presetSpring` keeps that envelope non-bouncy.
   */
  private fun presetAwayVector(): FxAnimationVector? {
    if (preset != "transient") return null
    return FxAnimationVector(opacity = 0f, translationY = contentHeight())
  }

  private fun presetSpring(): FxAnimationSpring? {
    if (preset != "transient") return null
    return FxAnimationSpring(
      stiffness = SpringForce.STIFFNESS_MEDIUM,
      dampingRatio = SpringForce.DAMPING_RATIO_NO_BOUNCY,
    )
  }

  private fun resolve(spec: FxMotionPhaseSpec): FxAnimationVector {
    return FxAnimationVector(
      opacity = spec.opacity?.toFloat() ?: 1f,
      scale = spec.scale?.toFloat() ?: 1f,
      translationX = spec.translateX?.let { resolveTravel(it) } ?: 0f,
      translationY = spec.translateY?.let { resolveTravel(it) } ?: 0f,
      // Android `View.rotation` is in degrees, matching the spec — no radian conversion.
      rotation = spec.rotate?.toFloat() ?: 0f,
    )
  }

  /**
   * A fixed delta passes through; a measured token resolves its signed magnitude from the
   * laid-out frame via `FxLayoutObserver`.
   */
  private fun resolveTravel(travel: FxTravelSpec): Float {
    travel.value?.let { return it.toFloat() }
    val edge = travel.measureEdge?.let { runCatching { FxEdge.valueOf(it.uppercase()) }.getOrNull() }
      ?: return 0f
    val distance = surface.layoutObserver.readTravelDistance(edge)
    return when (edge) {
      FxEdge.TOP, FxEdge.LEFT -> -distance
      FxEdge.BOTTOM, FxEdge.RIGHT -> distance
    }
  }

  /**
   * The view's own height, the provisional `transient` travel. Falls back to the live height
   * before the first layout observation lands.
   */
  private fun contentHeight(): Float {
    val observed = surface.layoutObserver.readFrameInParent().height()
    return if (observed > 0) observed.toFloat() else surface.height.toFloat()
  }

  private fun emit(phase: EnvelopePhase, finished: Boolean, interrupted: Boolean) {
    surface.dispatchPresenceTransitionEnd(
      phase = if (phase == EnvelopePhase.ENTER) "enter" else "exit",
      finished = finished,
      interrupted = interrupted,
    )
  }
}
