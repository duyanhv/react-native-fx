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
    // A curated asset is build-time bundled, but guard the read and parse so a missing or malformed
    // shader degrades to a transparent {via:'none'} draw rather than crashing the hosted mount.
    shader = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      try {
        val source = context.assets.open(agslAssetPathFor(shaderId)).bufferedReader().use { it.readText() }
        RuntimeShader(source)
      } catch (error: Exception) {
        null
      }
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
    val currentShader = shader ?: return
    if (width == 0 || height == 0) {
      return
    }
    currentShader.setFloatUniform("time", currentTime)
    currentShader.setFloatUniform("resolution", width.toFloat(), height.toFloat())
    currentShader.setFloatUniform("intensity", pendingIntensity)
    paint.shader = currentShader
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
  }

  override fun setIntensity(value: Double) {
    pendingIntensity = value.toFloat()
    invalidate()
  }

  private fun startLoop() {
    if (isCallbackScheduled || shader == null) {
      return
    }
    isActive = true
    isCallbackScheduled = true
    baseTimeNanos = 0L
    Choreographer.getInstance().postFrameCallback(frameCallback)
  }

  private fun stopLoop() {
    isActive = false
    isCallbackScheduled = false
    Choreographer.getInstance().removeFrameCallback(frameCallback)
  }
}

/**
 * The curated, build-time shader ids mapped to their bundled .agsl asset, kept in lockstep with
 * the JS `CURATED_SHADER_IDS` catalog. A curated id reads its bundled asset; any other resolved id
 * is a registered bring-your-own runtime shader.
 */
private val CURATED_SHADER_ASSETS = mapOf(
  "fractal-clouds" to "shaders/fractal_clouds.agsl",
  "ink-smoke"      to "shaders/ink_smoke.agsl",
  "liquid-chrome"  to "shaders/liquid_chrome.agsl",
  "loop"           to "shaders/loop.agsl",
  "dots"           to "shaders/dots.agsl",
  "aurora"         to "shaders/aurora.agsl",
  "noise-field"    to "shaders/noise_field.agsl",
  "plasma"         to "shaders/plasma.agsl",
  "caustics"       to "shaders/caustics.agsl",
  "edge-glow"      to "shaders/edge_glow.agsl"
)

// Derived from the asset map's keys so the id set and the paths cannot drift apart.
internal val CURATED_SHADER_IDS: Set<String> = CURATED_SHADER_ASSETS.keys

// Callers resolve only ids already in CURATED_SHADER_IDS, so a miss is a build-time wiring drift —
// fail closed rather than silently rendering a wrong shader.
internal fun agslAssetPathFor(id: String): String =
  CURATED_SHADER_ASSETS[id] ?: error("no bundled asset for curated shader id: $id")
