package expo.modules.reactnativefx

import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.os.Build
import android.view.Choreographer
import android.view.View

private const val RIPPLE_ASSET_PATH = "shaders/content_ripple.agsl"

/**
 * Applies the private ripple content-distort sampler to a content view as a draw-time [RenderEffect].
 *
 * Because [RenderEffect] is a RenderNode concern, the distortion never touches input dispatch:
 * the children inside the distorted view stay a plain RN view tree and remain tappable. The whole
 * mechanic is gated to API 33+ (RuntimeShader / createRuntimeShaderEffect); below 33 it is inert
 * and the content renders normally. A [Choreographer] loop advances `time` and re-applies the
 * effect each frame so the mutated uniform takes; the host pauses it off-window.
 */
internal class FxContentDistortion(
  private val target: View,
) {
  private var shader: RuntimeShader? = null
  private var isEnabled = false
  private var isLooping = false
  private var intensity = 0.8f
  private var baseTimeNanos = 0L
  private var currentTime = 0f

  // Which uniforms the sampler declares. Writing an undeclared uniform corrupts the native error
  // path inside RuntimeShader and CheckJNI aborts the process on API 33 — so writes are scanned
  // from the source, never probed. The packaged sampler declares all three today; the scan keeps a
  // later edit that drops one from aborting.
  private var declaresResolution = false
  private var declaresTime = false
  private var declaresIntensity = false

  private val frameCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      if (!isLooping) {
        return
      }
      if (baseTimeNanos == 0L) {
        baseTimeNanos = frameTimeNanos
      }
      currentTime = ((frameTimeNanos - baseTimeNanos) % 100_000_000_000L).toFloat() / 1_000_000_000.0f
      refreshEffect()
      Choreographer.getInstance().postFrameCallback(this)
    }
  }

  // The parent dispatches its own onAttachedToWindow before it attaches this content container, so a
  // resume() driven off the parent's signal still sees the container detached and bails. Drive the
  // loop off the container's own attach signal instead, so a mount (or re-navigation) that already
  // has the effect enabled animates without a manual toggle. isLooping/stopLoop keep this idempotent
  // with update()/resume(); the listener shares the helper's lifecycle, so it is never removed.
  init {
    target.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(view: View) {
        if (isEnabled) {
          startLoop()
        }
      }

      override fun onViewDetachedFromWindow(view: View) {
        stopLoop()
      }
    })
  }

  /**
   * Reconciles the distortion target and strength from one resolved prop batch. `'ripple'` is the
   * only recognized value; absent or unrecognized clears the effect. A no-op below API 33.
   */
  fun update(distortion: String, intensityValue: Double) {
    intensity = intensityValue.toFloat().coerceIn(0f, 1f)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return
    }
    val shouldRun = distortion == "ripple"
    if (!shouldRun) {
      isEnabled = false
      stopLoop()
      clearEffect()
      return
    }

    if (isEnabled) {
      return
    }

    if (!ensureShader()) {
      stopLoop()
      clearEffect()
      return
    }

    isEnabled = true
    if (target.isAttachedToWindow) {
      startLoop()
    }
  }

  /** Stops the frame loop while the view is off-window; the effect stays attached, frozen. */
  fun pause() {
    stopLoop()
  }

  /** Resumes the frame loop when the view returns on-window, if the effect is active. */
  fun resume() {
    if (isEnabled && target.isAttachedToWindow) {
      startLoop()
    }
  }

  private fun ensureShader(): Boolean {
    if (shader != null) {
      return true
    }
    val source = loadRippleSource() ?: return false
    shader = try {
      RuntimeShader(source)
    } catch (error: Exception) {
      null
    }
    declaresResolution = declaresUniform(source, "resolution")
    declaresTime = declaresUniform(source, "time")
    declaresIntensity = declaresUniform(source, "intensity")
    return shader != null
  }

  private fun loadRippleSource(): String? {
    return try {
      target.context.assets.open(RIPPLE_ASSET_PATH).bufferedReader().use { it.readText() }
    } catch (error: Exception) {
      null
    }
  }

  private fun startLoop() {
    if (isLooping) {
      return
    }
    isLooping = true
    baseTimeNanos = 0L
    Choreographer.getInstance().postFrameCallback(frameCallback)
  }

  private fun stopLoop() {
    isLooping = false
    Choreographer.getInstance().removeFrameCallback(frameCallback)
  }

  // The container has no size until it is laid out, so the effect attaches on the first frame it
  // has real bounds and re-attaches each frame after. Re-setting the effect (not just invalidate())
  // is the conservative idiom that guarantees the mutated `time` uniform takes.
  private fun refreshEffect() {
    val runtimeShader = shader ?: return
    val width = target.width
    val height = target.height
    if (width == 0 || height == 0) {
      return
    }
    if (declaresResolution) {
      runtimeShader.setFloatUniform("resolution", width.toFloat(), height.toFloat())
    }
    if (declaresTime) {
      runtimeShader.setFloatUniform("time", currentTime)
    }
    if (declaresIntensity) {
      runtimeShader.setFloatUniform("intensity", intensity)
    }
    target.setRenderEffect(RenderEffect.createRuntimeShaderEffect(runtimeShader, "content"))
  }

  private fun clearEffect() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      target.setRenderEffect(null)
    }
  }

  // Matches a `uniform <type> <name>;` declaration, guarding the name with word boundaries so an
  // in-body use of the name does not count as a declaration.
  private fun declaresUniform(source: String, name: String): Boolean {
    return Regex("""\buniform\s+\w+\s+${Regex.escape(name)}\b""").containsMatchIn(source)
  }
}
