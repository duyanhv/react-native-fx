package expo.modules.reactnativefx

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * A passthrough group container for platform-native compound effects.
 *
 * Android has no cross-item glass union, so no merge effect is installed; each child
 * renders its own material surface independently. This is the ratified shape-native
 * divergence from iOS — no simulation of another platform's behavior.
 */
class FxGroupView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {
  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()
}
