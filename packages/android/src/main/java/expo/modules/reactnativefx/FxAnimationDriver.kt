package expo.modules.reactnativefx

import android.animation.ValueAnimator
import android.os.Build
import android.provider.Settings
import android.view.View
import androidx.dynamicanimation.animation.DynamicAnimation
import androidx.dynamicanimation.animation.SpringAnimation
import androidx.dynamicanimation.animation.SpringForce
import kotlin.math.abs

internal data class FxAnimationVector(
  val opacity: Float = 1f,
  val scaleX: Float = 1f,
  val scaleY: Float = 1f,
  val translationX: Float = 0f,
  val translationY: Float = 0f,
  val rotation: Float = 0f,
  // Normalized transform pivot in `[0,1]` of the target's bounds — (0.5, 0.5) is center, the
  // View default every uniform-scale caller relies on. Not an animated channel: the driver pins
  // the pivot once when it seats an envelope, so non-uniform scale shrinks toward this point. The
  // reveal pins it to the collapsed corner.
  val originX: Float = 0.5f,
  val originY: Float = 0.5f,
) {
  /** Uniform-scale convenience: the shape presence and state author, both axes about the center. */
  constructor(
    opacity: Float = 1f,
    scale: Float,
    translationX: Float = 0f,
    translationY: Float = 0f,
    rotation: Float = 0f,
  ) : this(opacity, scale, scale, translationX, translationY, rotation)
}

internal data class FxAnimationSpring(
  val stiffness: Float,
  val dampingRatio: Float,
)

internal class FxAnimationDriver(
  private val targetView: View,
  private val completion: () -> Unit,
) {
  private var envelopeIdentifier = 0
  private var latestCompletionIdentifier = 0
  private var activeAnimations = mutableSetOf<SpringAnimation>()

  // Alpha is the only channel with a bounded platform property; all transform axes
  // keep the platform's unbounded spring behavior.
  private val animations = listOf(
    createAnimation(DynamicAnimation.ALPHA, 0f, 1f),
    createAnimation(DynamicAnimation.SCALE_X),
    createAnimation(DynamicAnimation.SCALE_Y),
    createAnimation(DynamicAnimation.TRANSLATION_X),
    createAnimation(DynamicAnimation.TRANSLATION_Y),
    createAnimation(DynamicAnimation.ROTATION),
  )

  fun animateTo(target: FxAnimationVector, spring: FxAnimationSpring? = null) {
    envelopeIdentifier += 1
    val identifier = envelopeIdentifier

    if (shouldReduceMotion()) {
      cancel()
      apply(target)
      completion()
      return
    }

    seatPivot(target)

    val targets = mapOf(
      animations[0] to target.opacity,
      animations[1] to target.scaleX,
      animations[2] to target.scaleY,
      animations[3] to target.translationX,
      animations[4] to target.translationY,
      animations[5] to target.rotation,
    )

    activeAnimations.clear()
    latestCompletionIdentifier = identifier
    animations.forEach { animation ->
      animation.removeEndListener(animationEndListener)
      animation.addEndListener(animationEndListener)
    }

    targets.forEach { (animation, finalPosition) ->
      if (animation.isRunning || !isAtFinalPosition(animation, finalPosition)) {
        activeAnimations.add(animation)
        applySpring(animation, spring)
        animation.animateToFinalPosition(finalPosition)
      } else {
        setPropertyValue(animation, finalPosition)
      }
    }

    if (activeAnimations.isEmpty()) {
      completion()
      return
    }
  }

  private fun applySpring(animation: SpringAnimation, spring: FxAnimationSpring?) {
    animation.spring.stiffness = spring?.stiffness ?: SpringForce.STIFFNESS_MEDIUM
    animation.spring.dampingRatio = spring?.dampingRatio ?: SpringForce.DAMPING_RATIO_MEDIUM_BOUNCY
  }

  /**
   * Places the target instantly at a value, stopping any in-flight envelope. The presence
   * coordinator seats an enter at its hidden start before animating to present, and settles
   * reduce-motion / `appear:false` without a frame of motion.
   */
  fun snap(target: FxAnimationVector) {
    cancel()
    seatPivot(target)
    apply(target)
  }

  /**
   * Pins the view's transform pivot to the envelope's normalized origin, in pixels. Changing the
   * pivot does not move an untransformed view, so the reveal seats it before snapping the inverse
   * transform. A no-op for the center default the View already uses.
   */
  private fun seatPivot(target: FxAnimationVector) {
    targetView.pivotX = target.originX * targetView.width
    targetView.pivotY = target.originY * targetView.height
  }

  fun cancel() {
    activeAnimations.clear()
    animations.forEach { animation ->
      animation.removeEndListener(animationEndListener)
      animation.cancel()
    }
  }

  /**
   * Leaves physics springs alone while the view is detached; Android's scheduler naturally
   * stops dispatching frames when the app cannot draw, and canceling would lose the target.
   */
  fun pause() = Unit

  fun resume() = Unit

  /**
   * Shares one listener across property springs so completion fires once, after the last
   * axis settles, and only for the newest envelope.
   */
  private val animationEndListener =
    DynamicAnimation.OnAnimationEndListener { animation, canceled, _, _ ->
      val springAnimation = animation as? SpringAnimation ?: return@OnAnimationEndListener
      if (canceled) return@OnAnimationEndListener
      activeAnimations.remove(springAnimation)
      if (activeAnimations.isEmpty() && latestCompletionIdentifier == envelopeIdentifier) {
        completion()
      }
    }

  private fun createAnimation(
    property: DynamicAnimation.ViewProperty,
    minimumValue: Float = -Float.MAX_VALUE,
    maximumValue: Float = Float.MAX_VALUE,
  ): SpringAnimation {
    return SpringAnimation(targetView, property).apply {
      spring = SpringForce()
      setMinValue(minimumValue)
      setMaxValue(maximumValue)
    }
  }

  /**
   * Gates physics springs manually because Android's global animator scale does not stop
   * `SpringAnimation` for the app.
   */
  private fun shouldReduceMotion(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ValueAnimator.areAnimatorsEnabled()) {
      return true
    }

    val resolver = targetView.context.contentResolver
    val animatorScale = readAnimationScale(resolver, Settings.Global.ANIMATOR_DURATION_SCALE)
    val transitionScale = readAnimationScale(resolver, Settings.Global.TRANSITION_ANIMATION_SCALE)
    return animatorScale == 0f || transitionScale == 0f
  }

  private fun readAnimationScale(resolver: android.content.ContentResolver, key: String): Float {
    return try {
      Settings.Global.getFloat(resolver, key, 1f)
    } catch (_: Settings.SettingNotFoundException) {
      1f
    }
  }

  private fun isAtFinalPosition(animation: SpringAnimation, finalPosition: Float): Boolean {
    return abs(readPropertyValue(animation) - finalPosition) < 0.001f
  }

  private fun readPropertyValue(animation: SpringAnimation): Float {
    return when (animation) {
      animations[0] -> targetView.alpha
      animations[1] -> targetView.scaleX
      animations[2] -> targetView.scaleY
      animations[3] -> targetView.translationX
      animations[4] -> targetView.translationY
      else -> targetView.rotation
    }
  }

  private fun setPropertyValue(animation: SpringAnimation, value: Float) {
    when (animation) {
      animations[0] -> targetView.alpha = value
      animations[1] -> targetView.scaleX = value
      animations[2] -> targetView.scaleY = value
      animations[3] -> targetView.translationX = value
      animations[4] -> targetView.translationY = value
      else -> targetView.rotation = value
    }
  }

  private fun apply(target: FxAnimationVector) {
    targetView.alpha = target.opacity
    targetView.scaleX = target.scaleX
    targetView.scaleY = target.scaleY
    targetView.translationX = target.translationX
    targetView.translationY = target.translationY
    targetView.rotation = target.rotation
  }
}
