package expo.modules.reactnativefx

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

// TODO: Hosts the platform-native decorative rendering surface once the hosted
// effect renderer is built.
/**
 * Registers the hosted substrate as the module's default native view.
 */
class FxHostedView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {
  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()
}
