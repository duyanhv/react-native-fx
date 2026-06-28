package expo.modules.reactnativefx

import android.content.Context
import android.view.View
import com.facebook.react.views.view.ReactViewGroup
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * A passthrough group container for platform-native compound effects.
 *
 * Android has no cross-item glass union, so no merge effect is installed; each child
 * renders its own material surface independently. This is the ratified shape-native
 * divergence from iOS — no simulation of another platform's behavior.
 *
 * Routes Fabric-mounted children into an intermediate ReactViewGroup container so that
 * the base LinearLayout (ExpoView) does not re-layout absolutely-positioned Fabric
 * children by its own flow rules. ReactViewGroup's no-op onLayout preserves the
 * Fabric/Yoga frames for multiple absolutely-positioned children — a flow or gravity
 * container (LinearLayout or FrameLayout) would re-stack them at the origin.
 */
class FxGroupView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext) {

  override val shouldUseAndroidLayout: Boolean = true

  val onFxTransitionEnd by EventDispatcher<Unit>()
  val onFxLoad by EventDispatcher<Unit>()
  val onFxError by EventDispatcher<Unit>()

  /**
   * Holds RN children so neither the base LinearLayout nor a gravity-based
   * FrameLayout re-arranges them. ReactViewGroup's no-op onLayout leaves
   * children where Fabric placed them.
   */
  private val intermediateContainer = ReactViewGroup(context)

  init {
    super.addView(
      intermediateContainer,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
  }

  // MARK: - Child Routing (Fabric-invisible wrapper pattern)

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

  override fun removeView(view: View?) {
    if (view === intermediateContainer) {
      super.removeView(view)
      return
    }
    intermediateContainer.removeView(view)
  }

  /**
   * Measures the host to the incoming specs and then measures the intermediate container
   * with exact dimensions so the RN child tree receives a real size.
   */
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val width = View.MeasureSpec.getSize(widthMeasureSpec)
    val height = View.MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(width, height)
    intermediateContainer.measure(
      View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
    )
  }

  /**
   * Lays the intermediate container to the host bounds. Does NOT call super: the base
   * ExpoView is a LinearLayout whose onLayout would re-stack the children. The container
   * is already sized by onMeasure; laying it to the host bounds here is sufficient.
   */
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    intermediateContainer.layout(0, 0, right - left, bottom - top)
  }
}
