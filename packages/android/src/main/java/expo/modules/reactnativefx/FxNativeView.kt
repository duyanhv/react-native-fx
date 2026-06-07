package expo.modules.reactnativefx

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * Defines the shared Expo Modules boundary for fx-owned Android views.
 *
 * Prop setters on concrete subclasses stash incoming values, and [applyResolvedConfig]
 * applies one coherent snapshot after Expo finishes the batch.
 */
abstract class FxNativeView(
  context: Context,
  appContext: AppContext
) : ExpoView(context, appContext) {
  open fun applyResolvedConfig() = Unit

  open fun snapshot(): Map<String, Double> {
    return emptyMap()
  }

  open fun pausePresentationLoop() = Unit

  open fun resumePresentationLoop() = Unit

  /**
   * Restarts native presentation work only while Android can display the view.
   */
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    resumePresentationLoop()
  }

  /**
   * Stops native presentation work before Android removes the view from the window.
   */
  override fun onDetachedFromWindow() {
    pausePresentationLoop()
    super.onDetachedFromWindow()
  }
}
