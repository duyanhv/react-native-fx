package expo.modules.reactnativefx

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RuntimeShader
import android.os.Build
import android.view.Choreographer
import android.view.View

/**
 * Renders a curated AGSL shader on the hosted substrate by drawing the
 * [RuntimeShader] through a [Paint] in [onDraw] — the documented path for a
 * generative shader that produces its own pixels. (`RenderEffect`/
 * `createRuntimeShaderEffect` is for *filtering existing* view content via an
 * `eval`'d input shader, which a generative shader does not use.)
 *
 * A [Choreographer.FrameCallback] advances `time` and invalidates each frame so
 * the clock runs natively without JS driving frames. `time` is elapsed seconds
 * from the first frame, wrapped to a 100 s window so Float32 keeps per-frame
 * precision. The callback is scheduled idempotently and pauses when the view
 * detaches from the window or loses window focus.
 *
 * Below API 33 the view stays transparent — matches the manifest
 * `{via:'none'}` degradation.
 */
internal class FxShaderView(
  context: Context,
  shaderId: String,
  intensity: Double
) : View(context), FxEffectView {
  private val shader: RuntimeShader?
  private val paint = Paint()
  private var pendingIntensity: Float = intensity.toFloat()
  private var isActive: Boolean = false
  private var isCallbackScheduled: Boolean = false
  private var baseTimeNanos: Long = 0L
  private var currentTime: Float = 0f

  private val frameCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      if (!isActive) {
        isCallbackScheduled = false
        return
      }
      if (baseTimeNanos == 0L) {
        baseTimeNanos = frameTimeNanos
      }
      val elapsedNanos = frameTimeNanos - baseTimeNanos
      currentTime = (elapsedNanos % 100_000_000_000L).toFloat() / 1_000_000_000.0f
      invalidate()
      Choreographer.getInstance().postFrameCallback(this)
    }
  }

  init {
    setWillNotDraw(false)
    shader = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val assetPath = agslAssetPathFor(shaderId)
      val source = context.assets.open(assetPath).bufferedReader().use { it.readText() }
      RuntimeShader(source)
    } else {
      null
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    startLoop()
  }

  override fun onDetachedFromWindow() {
    stopLoop()
    super.onDetachedFromWindow()
  }

  override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
    super.onWindowFocusChanged(hasWindowFocus)
    if (hasWindowFocus) {
      startLoop()
    } else {
      stopLoop()
    }
  }

  override fun onDraw(canvas: Canvas) {
    val s = shader ?: return
    if (width == 0 || height == 0) {
      return
    }
    s.setFloatUniform("time", currentTime)
    s.setFloatUniform("resolution", width.toFloat(), height.toFloat())
    s.setFloatUniform("intensity", pendingIntensity)
    paint.shader = s
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
  }

  override fun setIntensity(value: Double) {
    pendingIntensity = value.toFloat()
    invalidate()
  }

  private fun startLoop() {
    if (isCallbackScheduled) {
      return
    }
    isActive = true
    isCallbackScheduled = true
    baseTimeNanos = 0L
    Choreographer.getInstance().postFrameCallback(frameCallback)
  }

  private fun stopLoop() {
    isActive = false
  }
}

/** Maps the public agnostic shader id to its bundled .agsl asset path. */
internal fun agslAssetPathFor(id: String): String {
  return when (id) {
    "fractal-clouds" -> "shaders/fractal_clouds.agsl"
    "ink-smoke"      -> "shaders/ink_smoke.agsl"
    "liquid-chrome"  -> "shaders/liquid_chrome.agsl"
    "loop"           -> "shaders/loop.agsl"
    "dots"           -> "shaders/dots.agsl"
    "aurora"         -> "shaders/aurora.agsl"
    "noise-field"    -> "shaders/noise_field.agsl"
    "plasma"         -> "shaders/plasma.agsl"
    "caustics"       -> "shaders/caustics.agsl"
    "edge-glow"      -> "shaders/edge_glow.agsl"
    else             -> "shaders/fractal_clouds.agsl"
  }
}
