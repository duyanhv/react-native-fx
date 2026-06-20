package expo.modules.reactnativefx

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.ShapeDrawable
import android.graphics.drawable.shapes.RectShape
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher

/** Payload for press events dispatched to JS. */
data class FxPressPressEvent(
  @Field val payload: String = ""
) : Record

/**
 * A lightweight view wrapping RN children and providing native press feedback.
 *
 * Extends FxNativeView to sit on the Expo Modules boundary. Routes RN children into
 * an intermediate FrameLayout container that Fabric does not track, and dispatches
 * four press events (onPressIn, onPressOut, onPress, onLongPress) to JS. RippleDrawable
 * provides the native feedback.
 */
internal class FxPressableView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext), FxPressHost {

  /**
   * Re-runs measureAndLayout() so the intermediate container fills the host bounds
   * and Fabric children receive a real size.
   */
  override val shouldUseAndroidLayout: Boolean = true

  // Prefixed names avoid React Native's reserved `topPress`; the public `onPress*` props map
  // to these in `FxPressable.tsx`, mirroring the shader surface's `onShaderPress*`.
  val onFxPressIn by EventDispatcher<FxPressPressEvent>()
  val onFxPressOut by EventDispatcher<FxPressPressEvent>()
  val onFxPress by EventDispatcher<FxPressPressEvent>()
  val onFxLongPress by EventDispatcher<FxPressPressEvent>()

  /**
   * A Fabric-invisible container that holds RN children so Fabric cannot clobber
   * the press feedback. RippleDrawable is set as the foreground.
   */
  private val intermediateContainer = FrameLayout(context).apply {
    layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    )
  }

  private val pressHandler = FxPressHandler(this, context)

  private var rippleDrawable: RippleDrawable? = null

  init {
    super.addView(
      intermediateContainer,
      LayoutParams(
        LayoutParams.MATCH_PARENT,
        LayoutParams.MATCH_PARENT
      )
    )
    setUpRipple()
    pressHandler.update("active", null)
  }

  internal fun setFeedback(feedback: String) {
    // V1 supports "native" feedback; other values ignored for now.
  }

  // MARK: - Child Mounting

  /**
   * Routes Fabric-mounted children to the intermediate container instead of the
   * outer FxPressableView, so Fabric's layout machinery cannot clobber the press
   * feedback drawable.
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
   * ExpoView is a LinearLayout, and its onLayout iterates the (proxied) child accessors
   * and casts each child to LinearLayout.LayoutParams — but the children live in the
   * container with FrameLayout.LayoutParams, so delegating crashes. The container is
   * already sized by onMeasure; laying it to the host bounds here is sufficient.
   */
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    intermediateContainer.layout(0, 0, right - left, bottom - top)
  }

  // MARK: - Touch Dispatch

  /**
   * Intercepts touch events and delegates to the press handler. If the handler consumes
   * the event, returns true to prevent further dispatch to the wrapped child.
   *
   * This is intentional: FxPressableView owns the press interaction. The wrapped child
   * is presentational and receives its own press feedback via the press events. Consuming
   * touch events prevents the child from duplicating press handling.
   */
  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (pressHandler.handle(event)) {
      return true
    }
    return super.dispatchTouchEvent(event)
  }

  // MARK: - FxPressHost Implementation

  override fun hitTarget(x: Float, y: Float): Boolean {
    return x >= 0 && x <= width && y >= 0 && y <= height
  }

  // The FSM consumes the touch, so these feed the container the hotspot and pressed flag the
  // framework would otherwise supply to drive its foreground ripple.
  override fun handlePressBegin(x: Float, y: Float, depth: Int) {
    intermediateContainer.drawableHotspotChanged(x, y)
    intermediateContainer.isPressed = true
    onFxPressIn(FxPressPressEvent())
  }

  override fun handlePressChanged(x: Float, y: Float, depth: Int) {
    intermediateContainer.drawableHotspotChanged(x, y)
  }

  override fun handlePressEnd(x: Float, y: Float, includePressEvent: Boolean) {
    intermediateContainer.isPressed = false
    onFxPressOut(FxPressPressEvent())
    if (includePressEvent) {
      onFxPress(FxPressPressEvent())
    }
  }

  override fun handlePressCancel(x: Float, y: Float) {
    intermediateContainer.isPressed = false
    onFxPressOut(FxPressPressEvent())
  }

  // Long press keeps the pressed feedback; it clears only on the actual up/cancel.
  override fun handleLongPress(x: Float, y: Float) {
    onFxLongPress(FxPressPressEvent())
  }

  // Android drives the FSM through `dispatchTouchEvent`, so there is no recognizer to attach.
  override fun attachRecognizer(recognizer: android.view.GestureDetector) {}

  override fun detachRecognizer(recognizer: android.view.GestureDetector) {}

  // MARK: - Ripple Setup

  /**
   * Initializes the RippleDrawable foreground with the material highlight color. The radius
   * is set in `onSizeChanged` once the view has a real size — computing it here (from `init`,
   * before layout) would lock it to the 0-dimension fallback.
   */
  private fun setUpRipple() {
    val color = try {
      context.obtainStyledAttributes(intArrayOf(android.R.attr.colorControlHighlight))
        .use { ta ->
          ta.getColor(0, 0x20000000)
        }
    } catch (e: Exception) {
      0x20000000
    }

    // A concrete full-bounds mask: a default `ShapeDrawable()` has a null shape, which can let the
    // ripple fill the whole foreground. Null content keeps the foreground transparent at rest.
    val mask = ShapeDrawable(RectShape()).apply { paint.color = Color.WHITE }
    rippleDrawable = RippleDrawable(
      ColorStateList.valueOf(color),
      null,
      mask
    )

    intermediateContainer.foreground = rippleDrawable
  }

  /**
   * Sizes the ripple to roughly half the smaller dimension, once the view has a real size.
   * The ripple radius cannot be computed in `init` because the view has no dimensions yet.
   */
  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(width, height, oldWidth, oldHeight)
    val radius = (kotlin.math.min(width, height) / 2).coerceAtLeast(1)
    rippleDrawable?.setRadius(radius)
  }
}
