package expo.modules.reactnativefx

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * Registers the expo-view substrate shell for interactive shader rendering and
 * content-motion wrapping.
 *
 * RN children are routed into an intermediate container that Fabric does not
 * track, so Fabric cannot overwrite the animator's transform/opacity. The effect
 * surface is hidden when no effect is active so it never obscures the content.
 */
class FxSurfaceView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {
  /**
   * Reports a completed shader press with a prefixed name that avoids React Native's reserved event.
   */
  val onShaderPress by EventDispatcher<Unit>()
  val onShaderPressIn by EventDispatcher<Unit>()
  val onShaderPressOut by EventDispatcher<Unit>()

  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()

  private var pendingShader = ""
  private var pendingIntensity = 0.8
  private var pendingInteractionMode = "none"

  /**
   * A Fabric-invisible container that holds RN children so Fabric cannot clobber
   * the animator's transform/opacity. The animator targets this container, not the
   * outer `FxSurfaceView` that Fabric tracks.
   */
  private val intermediateContainer = FrameLayout(context).apply {
    layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    )
  }

  init {
    addView(intermediateContainer)
  }

  /**
   * Stashes the shader target until Expo finishes the prop batch.
   */
  fun setShader(value: String) {
    pendingShader = value
  }

  /**
   * Stashes the intensity target until Expo finishes the prop batch.
   */
  fun setIntensity(value: Double) {
    pendingIntensity = value
  }

  /**
   * Stashes the interaction target until Expo finishes the prop batch.
   */
  fun setInteractionMode(value: String) {
    pendingInteractionMode = value
  }

  override fun applyResolvedConfig() {
    super.applyResolvedConfig()
    pendingIntensity = pendingIntensity.coerceIn(0.0, 1.0)
    pendingInteractionMode = pendingInteractionMode.ifBlank { "none" }
    updateEffectSurfaceVisibility()
  }

  // MARK: - Child routing

  /**
   * Routes Fabric-mounted children into the intermediate container so React Native
   * cannot overwrite the animator's transform/opacity.
   */
  override fun addView(child: View?) {
    if (child === intermediateContainer) {
      super.addView(child)
      return
    }
    intermediateContainer.addView(child)
  }

  override fun addView(child: View?, index: Int) {
    if (child === intermediateContainer) {
      super.addView(child, index)
      return
    }
    intermediateContainer.addView(child, index)
  }

  override fun addView(child: View?, params: android.view.ViewGroup.LayoutParams?) {
    if (child === intermediateContainer) {
      super.addView(child, params)
      return
    }
    intermediateContainer.addView(child, params)
  }

  override fun addView(child: View?, index: Int, params: android.view.ViewGroup.LayoutParams?) {
    if (child === intermediateContainer) {
      super.addView(child, index, params)
      return
    }
    intermediateContainer.addView(child, index, params)
  }

  override fun addView(child: View?, width: Int, height: Int) {
    if (child === intermediateContainer) {
      super.addView(child, width, height)
      return
    }
    intermediateContainer.addView(child, width, height)
  }

  override fun removeView(view: View?) {
    if (view === intermediateContainer) {
      super.removeView(view)
      return
    }
    intermediateContainer.removeView(view)
  }

  override fun removeViewAt(index: Int) {
    intermediateContainer.removeViewAt(index)
  }

  override fun getChildCount(): Int = intermediateContainer.childCount

  override fun getChildAt(index: Int): View? = intermediateContainer.getChildAt(index)

  override fun indexOfChild(child: View?): Int = intermediateContainer.indexOfChild(child)

  // MARK: - Effect surface visibility

  /**
   * Hides the GPU surface when no effect is active so it never obscures the
   * content-motion container. When the Android shader renderer is implemented,
   * this controls the visibility of the effect surface view.
   */
  private fun updateEffectSurfaceVisibility() {
    val hasActiveEffect = pendingShader.isNotBlank()
    // TODO: when the effect surface view is added, set its visibility here.
    // For now the surface is blank; the visibility rule is recorded so the
    // composition concern (effect + content motion) is not silently dropped.
  }
}
