package expo.modules.reactnativefx

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * Hosts the platform-native decorative rendering surface for the `hosted` substrate.
 *
 * Props stash in the two-phase Expo pattern and are applied once per batch in
 * [applyResolvedConfig]. The fill effect uses a plain [View] with gradient
 * [LinearGradient] drawn in [onDraw] to avoid a Compose compiler dependency
 * at the library level.
 */
class FxHostedView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {
  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()

  private var effectView: View? = null
  private var pendingEffect: String? = null
  private var pendingIntensity: Double = 0.8

  fun setEffect(value: String) {
    pendingEffect = value
  }

  fun setIntensity(value: Double) {
    pendingIntensity = value
  }

  override fun applyResolvedConfig() {
    super.applyResolvedConfig()

    val effect = pendingEffect
    if (effect == null) {
      removeHost()
      return
    }

    mountEffect(effect, pendingIntensity)
  }

  private fun mountEffect(effect: String, intensity: Double) {
    removeHost()

    val view = when (effect) {
      "fill" -> FillView(context, intensity)
      else -> return
    }

    view.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    addView(view)
    effectView = view
  }

  private fun removeHost() {
    effectView?.let { removeView(it) }
    effectView = null
  }
}

/**
 * A plain [View] that draws a blue-to-purple linear gradient fill.
 *
 * Intensity fades from invisible (0f) to full opacity (1f). Uses the
 * Android graphics [LinearGradient] shader, not Compose.
 */
private class FillView(
  context: Context,
  intensity: Double
) : View(context) {
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var gradient: LinearGradient? = null
  private val alpha = (intensity * 255).toInt().coerceIn(0, 255)

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val shader = gradient ?: createGradient().also { gradient = it }
    fillPaint.shader = shader
    fillPaint.alpha = alpha
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), fillPaint)
  }

  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(width, height, oldWidth, oldHeight)
    gradient = null
  }

  private fun createGradient(): LinearGradient {
    return LinearGradient(
      0f, 0f,
      width.toFloat(), height.toFloat(),
      intArrayOf(
        Color.rgb(77, 128, 255),
        Color.rgb(153, 77, 230)
      ),
      null,
      Shader.TileMode.CLAMP
    )
  }
}
