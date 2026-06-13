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
import java.lang.IllegalArgumentException

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
    shader = if (value.isNotBlank() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val source = context.assets.open(agslAssetPathFor(value)).bufferedReader().use { it.readText() }
      RuntimeShader(source)
    } else {
      null
    }
    probeInteractiveUniforms()
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

  private fun probeInteractiveUniforms() {
    val currentShader = shader
    supportsPressDepthUniform = currentShader?.supportsFloatUniform("pressDepth", 0f) == true
    supportsTouchUniform = currentShader?.supportsFloatUniform("touch", 0.5f, 0.5f) == true
  }

  private fun RuntimeShader.supportsFloatUniform(name: String, vararg values: Float): Boolean {
    return try {
      if (values.size == 1) {
        setFloatUniform(name, values[0])
      } else {
        setFloatUniform(name, values)
      }
      true
    } catch (_: IllegalArgumentException) {
      false
    }
  }
}
