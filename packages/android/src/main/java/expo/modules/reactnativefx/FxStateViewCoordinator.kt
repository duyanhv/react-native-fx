package expo.modules.reactnativefx

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** A motion spec entry for one named state, as it crosses the bridge. */
data class FxStateMotionEntry(
  @Field val state: String = "",
  @Field val spec: FxMotionPhaseSpec? = null,
) : Record

/** The settle/interrupt event payload. */
data class FxStateChangeEvent(
  @Field val state: String = "",
  @Field val finished: Boolean = false,
  @Field val interrupted: Boolean = false,
) : Record

/**
 * Turns the discrete `state` target into an interruptible N-state envelope on the content
 * driver, and reports each transition boundary as a semantic settle event.
 *
 * A plain internal class owned by `FxStateView`; it drives `FxAnimationDriver` and is the
 * driver's completion source. The envelope shape is resolved per state from the preset,
 * overridden by an explicit motion map. All work is on the UI thread.
 */
internal class FxStateViewCoordinator(private val view: FxStateView) {
  // The state we are currently animating toward, or have last settled at.
  private var targetState: String? = null
  private var isAnimating = false

  // The first application seats the initial state with no animation.
  private var isFirstApplication = true

  // Latched config. Per the snapshot-semantics invariant, the target vector is resolved at
  // transition start, not stored pre-resolved.
  private var preset = "lift"
  private var stateMotion: List<FxStateMotionEntry>? = null

  /** Applies a `state` (plus latched config) target, driving the transition. */
  fun update(state: String, preset: String, stateMotion: List<FxStateMotionEntry>?) {
    this.preset = preset
    this.stateMotion = stateMotion

    if (isFirstApplication) {
      isFirstApplication = false
      targetState = state
      view.snapContent(targetVector(state))
      return
    }

    if (state == targetState) return // same-target self-edges are no-ops

    if (isAnimating) {
      val prev = targetState
      if (prev != null) {
        emit(prev, finished = false, interrupted = true)
      }
    }

    targetState = state
    isAnimating = true
    view.animateContent(targetVector(state))
  }

  /** The driver reached rest. Emits a settle event for the current target. */
  fun handleDriverCompletion() {
    if (!isAnimating) return
    isAnimating = false
    val state = targetState ?: return
    emit(state, finished = true, interrupted = false)
  }

  // MARK: - Target vector resolution

  /**
   * Resolves the target vector for a named state: user spec, else preset, else identity.
   */
  private fun targetVector(state: String): FxAnimationVector {
    userSpec(state)?.let { return resolve(it) }
    presetVector(state)?.let { return it }
    return FxAnimationVector()
  }

  private fun userSpec(state: String): FxMotionPhaseSpec? =
    stateMotion?.firstOrNull { it.state == state }?.spec

  // `View.translationY` is pixels; scale fixed travel by density so a motion value reads as an
  // RN layout unit, matching iOS points.
  private val density: Float
    get() = view.resources.displayMetrics.density

  /**
   * The provisional per-platform `lift` preset shape. The magnitudes are device-pending
   * with the motion catalog and will be tuned at the device gate.
   */
  private fun presetVector(state: String): FxAnimationVector? {
    if (preset != "lift") return null
    return when (state) {
      "idle" -> FxAnimationVector()
      "selected" -> FxAnimationVector(scale = 1.04f, translationY = -6f * density)
      else -> null
    }
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

  private fun resolveTravel(travel: FxTravelSpec): Float {
    travel.value?.let { return it.toFloat() * density }
    // TODO: resolve measured-edge travel from a layout observer when a state uses it.
    return 0f
  }

  private fun emit(state: String, finished: Boolean, interrupted: Boolean) {
    view.dispatchStateChange(state, finished, interrupted)
  }
}
