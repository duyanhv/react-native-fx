package expo.modules.reactnativefx

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

// TODO: Hosts the glass morph compound surface once grouped material rendering
// is built.
/**
 * Registers the grouped substrate shell for platform-native compound effects.
 */
class FxGroupView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {
  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()
}
