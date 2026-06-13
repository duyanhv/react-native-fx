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
  private var pendingIntensity: Float = 0.8f
  private var pendingPressDepth: Float = 0f
  private var targetPressDepth: Float = 0f
  private var pendingTouchX: Float = 0.5f
  private var pendingTouchY: Float = 0.5f
  private var supportsPressDepthUniform: Boolean = false
  private var supportsTouchUniform: Boolean = false
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
    if (shaderId == value) {
      return
    }
    shaderId = value
    val source = if (value.isNotBlank() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.assets.open(agslAssetPathFor(value)).bufferedReader().use { it.readText() }
    } else {
      null
    }
    shader = source?.let { RuntimeShader(it) }
    scanInteractiveUniforms(source)
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
    currentShader.setFloatUniform("time", currentTime)
    currentShader.setFloatUniform("resolution", width.toFloat(), height.toFloat())
    currentShader.setFloatUniform("intensity", pendingIntensity)
    pendingPressDepth += (targetPressDepth - pendingPressDepth) * 0.35f
    if (supportsPressDepthUniform) {
      currentShader.setFloatUniform("pressDepth", pendingPressDepth)
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

  // Interactive-uniform support is read from the AGSL declarations, never by calling
  // setFloatUniform for an absent uniform to see whether it throws: on API 33 that native
  // error path inside RuntimeShader corrupts the message string and CheckJNI aborts the
  // process. A declared interactive uniform is always safe to write — AGSL strips only UNUSED
  // uniforms, and the interactive shaders both declare and use pressDepth/touch.
  private fun scanInteractiveUniforms(source: String?) {
    supportsPressDepthUniform = source != null && declaresUniform(source, "pressDepth")
    supportsTouchUniform = source != null && declaresUniform(source, "touch")
  }

  // Matches a `uniform <type> <name>;` declaration, not a comment or in-body use of the name:
  // the `uniform` keyword and a word boundary on the name guard the false positive (the local
  // `touchPoint` must not satisfy a `touch` scan).
  private fun declaresUniform(source: String, name: String): Boolean {
    return Regex("""\buniform\s+\w+\s+${Regex.escape(name)}\b""").containsMatchIn(source)
  }
}
