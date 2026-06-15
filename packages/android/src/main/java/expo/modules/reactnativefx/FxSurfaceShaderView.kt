package expo.modules.reactnativefx

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RuntimeShader
import android.os.Build
import android.view.Choreographer
import android.view.View
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView

internal class FxSurfaceShaderView(
  context: Context,
) : View(context), ReactPointerEventsView {
  private val paint = Paint()
  private var shader: RuntimeShader? = null
  private var shaderId: String = ""
  // The registry source resolved on the last set, so a same-id `registerShader` replacement
  // (its source changed under an unchanged id) recompiles instead of short-circuiting.
  private var lastRegistrySource: String? = null
  private var pendingIntensity: Float = 0.8f
  private var pendingPressDepth: Float = 0f
  private var targetPressDepth: Float = 0f
  private var pendingTouchX: Float = 0.5f
  private var pendingTouchY: Float = 0.5f
  private var supportsTimeUniform: Boolean = false
  private var supportsResolutionUniform: Boolean = false
  private var supportsIntensityUniform: Boolean = false
  private var supportsPressDepthUniform: Boolean = false
  private var supportsTouchUniform: Boolean = false
  private var declaredUniforms: Set<String> = emptySet()
  private val customUniforms = mutableMapOf<String, Float>()
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
    isClickable = false
  }

  // Purely decorative: this view draws shader pixels and is never a touch target. NONE makes
  // TouchTargetHelper skip it entirely as it walks the surface's children, so a `none`-mode tap
  // passes through to content behind and an RN child stays tappable even under an active shader.
  override val pointerEvents: PointerEvents = PointerEvents.NONE

  fun setShaderId(value: String) {
    // Recompile when the id OR the registry source changes. A curated id reads a stable bundled
    // asset (registry source null), so an id match alone short-circuits it — no per-batch asset
    // read during, e.g., an intensity drag. A registered id's source can be replaced under the
    // same id, which the source comparison catches.
    val registrySource = if (CURATED_SHADER_IDS.contains(value)) null else FxShaderRegistry.source(value)
    if (shaderId == value && registrySource == lastRegistrySource) {
      return
    }
    shaderId = value
    lastRegistrySource = registrySource
    val source = resolveShaderSource(value)
    // A registered source can be malformed; constructing the RuntimeShader parses the AGSL and
    // throws on a syntax error. Guard so a bad bring-your-own source degrades to no draw rather
    // than crashing — the load/error event is dispatched separately by the surface.
    shader = source?.let {
      try {
        RuntimeShader(it)
      } catch (error: Exception) {
        null
      }
    }
    scanUniforms(source)
    visibility = if (shader == null) GONE else VISIBLE
    if (shader == null) {
      stopLoop()
    } else if (isAttachedToWindow) {
      startLoop()
    }
    invalidate()
  }

  fun setIntensity(value: Double) {
    pendingIntensity = value.toFloat()
    invalidate()
  }

  fun setPressUniforms(touchX: Float, touchY: Float, pressDepth: Float) {
    pendingTouchX = touchX.coerceIn(0f, 1f)
    pendingTouchY = touchY.coerceIn(0f, 1f)
    targetPressDepth = pressDepth.coerceIn(0f, 1f)
    invalidate()
  }

  /**
   * Writes a scalar uniform value into the live shader, or clears it when `value` is null.
   *
   * Only the known scalar uniforms `intensity` and `pressDepth` are supported in this cut.
   * The write is guarded by the source-declaration scan: an unknown or non-scalar uniform name
   * is a no-op. Only `controlled` mode is expected to call this path.
   */
  fun setUniform(name: String, value: Double?) {
    // Only known scalar uniforms are supported; `resolution` and `touch` are vec2 and cannot
    // be written through this scalar path.
    if (name != "intensity" && name != "pressDepth") {
      return
    }
    if (name !in declaredUniforms) {
      return
    }
    if (value != null) {
      customUniforms[name] = value.toFloat()
    } else {
      customUniforms.remove(name)
    }
    invalidate()
  }

  /**
   * Sets the highlight position in `[0, 1]` y-up UV space and activates the press depth.
   * Convenience sugar over the `touch` and `pressDepth` uniforms.
   */
  fun setHighlight(x: Double, y: Double) {
    pendingTouchX = x.toFloat().coerceIn(0f, 1f)
    pendingTouchY = y.toFloat().coerceIn(0f, 1f)
    targetPressDepth = 1f
    invalidate()
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
      resumePresentationLoop()
    } else {
      pausePresentationLoop()
    }
  }

  fun pausePresentationLoop() {
    stopLoop()
  }

  fun resumePresentationLoop() {
    startLoop()
  }

  override fun onDraw(canvas: Canvas) {
    val currentShader = shader ?: return
    if (width == 0 || height == 0) {
      return
    }
    if (supportsTimeUniform) {
      currentShader.setFloatUniform("time", currentTime)
    }
    if (supportsResolutionUniform) {
      currentShader.setFloatUniform("resolution", width.toFloat(), height.toFloat())
    }
    val intensity = customUniforms["intensity"] ?: pendingIntensity
    if (supportsIntensityUniform) {
      currentShader.setFloatUniform("intensity", intensity)
    }
    pendingPressDepth += (targetPressDepth - pendingPressDepth) * 0.35f
    val pressDepth = customUniforms["pressDepth"] ?: pendingPressDepth
    if (supportsPressDepthUniform) {
      currentShader.setFloatUniform("pressDepth", pressDepth)
    }
    if (supportsTouchUniform) {
      currentShader.setFloatUniform("touch", pendingTouchX, pendingTouchY)
    }
    paint.shader = currentShader
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
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

  // Resolves the AGSL source for an id: a curated id reads its bundled asset; any other id is a
  // registered bring-your-own shader whose source comes from the in-memory registry (null when the
  // id has no android source or is unknown). Below API 33 nothing resolves. The curated asset read
  // is the only file I/O — bring-your-own source is already in memory.
  private fun resolveShaderSource(id: String): String? {
    if (id.isBlank() || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return null
    }
    if (CURATED_SHADER_IDS.contains(id)) {
      // The bundled asset read can fail (missing/unreadable). Degrade to no draw rather than
      // throwing out of the prop setter — the surface reports the load/error event separately.
      return try {
        context.assets.open(agslAssetPathFor(id)).bufferedReader().use { it.readText() }
      } catch (error: Exception) {
        null
      }
    }
    return FxShaderRegistry.source(id)
  }

  // Which uniforms the loaded AGSL declares — read from the source, never probed by calling
  // setFloatUniform for an absent uniform to see whether it throws: on API 33 that native error
  // path inside RuntimeShader corrupts the message string and CheckJNI aborts the process. A
  // declared uniform is always safe to write — AGSL strips only UNUSED uniforms. Curated shaders
  // declare and use all of these; a bring-your-own shader may omit any, so every write is guarded.
  private fun scanUniforms(source: String?) {
    declaredUniforms = source?.let { extractUniformNames(it) } ?: emptySet()
    supportsTimeUniform = "time" in declaredUniforms
    supportsResolutionUniform = "resolution" in declaredUniforms
    supportsIntensityUniform = "intensity" in declaredUniforms
    supportsPressDepthUniform = "pressDepth" in declaredUniforms
    supportsTouchUniform = "touch" in declaredUniforms
  }

  // Extracts every declared uniform name from the AGSL source. Curated shaders declare and use
  // all known uniforms; a bring-your-own shader may omit any, so every write is guarded.
  private fun extractUniformNames(source: String): Set<String> {
    return Regex("""\buniform\s+\w+\s+(\w+)\b""").findAll(source).map { it.groupValues[1] }.toSet()
  }
}
