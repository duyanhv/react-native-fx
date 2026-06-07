package expo.modules.reactnativefx

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * Registers the expo-view substrate shell for interactive shader rendering.
 *
 * The Android renderer is intentionally blank in this boundary pass; props are
 * still stashed so the two-phase Expo Modules contract is present.
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

  private var pendingShader = "fractal-clouds"
  private var pendingIntensity = 0.8
  private var pendingInteractionMode = "none"

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
    pendingShader = pendingShader.ifBlank { "fractal-clouds" }
    pendingIntensity = pendingIntensity.coerceIn(0.0, 1.0)
    pendingInteractionMode = pendingInteractionMode.ifBlank { "none" }
  }
}
