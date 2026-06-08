package expo.modules.reactnativefx

import android.content.Context
import android.view.Gravity
import android.widget.FrameLayout
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * Hosts the platform-native decorative rendering surface for the `hosted` substrate.
 *
 * A [ComposeView] embeds a composable selected by the `effect` prop. The host
 * owns sizing and touch passthrough; it never samples or wraps RN content (rule #4).
 * Props stash in the two-phase Expo pattern and are applied once per batch in
 * [applyResolvedConfig].
 */
class FxHostedView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {
  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()

  private var composeView: ComposeView? = null
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

    mountHost(effect, pendingIntensity)
  }

  private fun mountHost(effect: String, intensity: Double) {
    removeHost()

    val view = ComposeView(context)
    view.layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    ).apply {
      gravity = Gravity.FILL
    }

    view.setContent {
      when (effect) {
        "fill" -> FillEffect(intensity = intensity.toFloat())
        // Android material is out of scope — owned by U3-003 / FX-003.
        else -> { /* empty — unknown effect id, render nothing */ }
      }
    }

    addView(view)
    composeView = view
  }

  private fun removeHost() {
    composeView?.let {
      removeView(it)
      it.disposeComposition()
    }
    composeView = null
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // Compose disposal is handled by removeHost; pause presentation on detach.
  }
}

/**
 * A self-contained generative gradient fill for the hosted substrate.
 *
 * Renders a linear gradient from blue to purple. [intensity] fades the
 * gradient from invisible (0f) to full opacity (1f).
 */
@androidx.compose.runtime.Composable
private fun FillEffect(intensity: Float) {
  val colors = remember {
    listOf(
      Color(0.3f, 0.5f, 1.0f, 1.0f),
      Color(0.6f, 0.3f, 0.9f, 1.0f)
    )
  }

  Canvas(modifier = Modifier.fillMaxSize()) {
    val brush = Brush.linearGradient(
      colors = colors,
      start = Offset(0f, 0f),
      end = Offset(size.width, size.height)
    )
    drawRect(brush = brush, alpha = intensity)
  }
}
