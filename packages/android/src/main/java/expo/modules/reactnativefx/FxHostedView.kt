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
  val onFxError by EventDispatcher<FxShaderEvent>()

  private var effectView: View? = null
  private var mountedEffectId: String? = null
  private var pendingEffect: String? = null
  private var pendingIntensity: Double = 0.8
  private var pendingSymbolConfig: SymbolConfig? = null
  private var pendingMaterialConfig: MaterialConfig? = null

  // A decorative child swapped in on a later prop batch is added outside RN's layout
  // pass; without this, ExpoView swallows its requestLayout() and the child renders at
  // 0x0. true re-runs measureAndLayout() so swapped-in children fill the host bounds.
  override val shouldUseAndroidLayout: Boolean = true

  // measureAndLayout() alone is not guaranteed to size children accurately (per ExpoView),
  // so the decorative child is laid out explicitly to the RN-assigned host bounds — reading
  // those bounds, never writing layout back to Yoga.
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    effectView?.layout(0, 0, width, height)
  }

  fun setEffect(value: String) {
    pendingEffect = value
  }

  fun setIntensity(value: Double) {
    pendingIntensity = value
  }

  fun setSymbolConfig(value: SymbolConfig?) {
    pendingSymbolConfig = value
  }

  fun setMaterialConfig(value: MaterialConfig?) {
    pendingMaterialConfig = value
  }

  override fun applyResolvedConfig() {
    super.applyResolvedConfig()

    // Symbol config takes precedence; update the live FxSymbolView in place or mount a new one.
    val symbolConfig = pendingSymbolConfig
    if (symbolConfig != null) {
      val current = effectView
      if (current is FxSymbolView) {
        current.configure(symbolConfig)
      } else {
        mountSymbol(symbolConfig)
      }
      return
    }

    val effect = pendingEffect
    if (effect == null) {
      removeHost()
      return
    }

    // When only intensity or config changed, push it onto the live child instead of
    // remounting — a slider drag mutates one uniform per frame rather than recreating the
    // view, which would flash a blank frame, reset the shader clock, and reparse the AGSL
    // each tick.
    val current = effectView
    if (effect == mountedEffectId && current is FxEffectView) {
      current.setIntensity(pendingIntensity)
      if (current is FxMaterialView) {
        current.setMaterialConfig(pendingMaterialConfig)
      }
      return
    }

    mountEffect(effect, pendingIntensity)
  }

  private fun mountSymbol(config: SymbolConfig) {
    removeHost()
    val view = FxSymbolView(context) {
      onFxError(FxShaderEvent("symbol", "unsupported"))
    }
    view.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    view.importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    addView(view)
    effectView = view
    view.configure(config)
  }

  private fun mountEffect(effect: String, intensity: Double) {
    removeHost()

    val view = when (effect) {
      "fill" -> FxFillView(context, intensity)
      "material" -> FxMaterialView(context, intensity, pendingMaterialConfig)
      "fractal-clouds", "ink-smoke", "liquid-chrome", "loop", "dots",
      "aurora", "noise-field", "plasma", "caustics", "edge-glow" -> {
        FxShaderView(context, effect, intensity)
      }
      else -> return
    }

    view.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    // Decorative effect output is presentation-only; keep it out of the TalkBack tree.
    view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    addView(view)
    effectView = view
    mountedEffectId = effect
  }

  private fun removeHost() {
    effectView?.let { removeView(it) }
    effectView = null
    mountedEffectId = null
  }
}

/**
 * A plain [View] that draws a blue-to-purple linear gradient fill.
 *
 * Intensity fades from invisible (0f) to full opacity (1f). Uses the
 * Android graphics [LinearGradient] shader, not Compose.
 */
private class FxFillView(
  context: Context,
  intensity: Double
) : View(context), FxEffectView {
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var gradient: LinearGradient? = null
  private var alpha = alphaFor(intensity)

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val shader = gradient ?: createGradient().also { gradient = it }
    fillPaint.shader = shader
    fillPaint.alpha = alpha
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), fillPaint)
  }

  // Intensity drives opacity here; the gradient itself is intensity-independent, so a
  // change only re-derives alpha and redraws — no gradient regen.
  override fun setIntensity(value: Double) {
    alpha = alphaFor(value)
    invalidate()
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

/** Maps fill `intensity` (0..1) to an 8-bit paint alpha. */
private fun alphaFor(intensity: Double): Int {
  return (intensity * 255).toInt().coerceIn(0, 255)
}
