package expo.modules.reactnativefx

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.ShapeDrawable
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

  /** Fired when a press begins. */
  val onPressIn by EventDispatcher<FxPressPressEvent>()

  /** Fired when a press exits (touch lifted or cancelled). */
  val onPressOut by EventDispatcher<FxPressPressEvent>()

  /** Fired on touch lift if the press was not cancelled or long-pressed. */
  val onPress by EventDispatcher<FxPressPressEvent>()

  /** Fired if the touch is held long enough. */
  val onLongPress by EventDispatcher<FxPressPressEvent>()

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
  }

  /**
   * Stops press tracking when the view is removed from the window.
   */
  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
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
   * the event, returns true to prevent further dispatch. Otherwise, defers to super.
   */
  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (pressHandler.handle(event)) {
      return true
    }
    return super.dispatchTouchEvent(event)
  }

  // MARK: - FxPressHost Implementation

  /**
   * Reports whether the given point is within the hit target bounds.
   * Returns true for full bounds (no shape testing required for FxPressableView).
   */
  override fun hitTarget(x: Float, y: Float): Boolean {
    return true
  }

  /**
   * Handles the start of a press: activates ripple and dispatches onPressIn.
   */
  override fun handlePressBegin(x: Float, y: Float, depth: Int) {
    rippleDrawable?.state = intArrayOf(android.R.attr.state_pressed)
    onPressIn(FxPressPressEvent())
  }

  /**
   * Handles press movement. No feedback change on move for FxPressableView.
   */
  override fun handlePressChanged(x: Float, y: Float, depth: Int) {
    // No-op: no feedback changes on press moved
  }

  /**
   * Handles the end of a press: deactivates ripple, dispatches onPressOut and
   * optionally onPress if the press should fire (not cancelled, not long-pressed).
   */
  override fun handlePressEnd(x: Float, y: Float, includePressEvent: Boolean) {
    rippleDrawable?.state = intArrayOf()
    onPressOut(FxPressPressEvent())
    if (includePressEvent) {
      onPress(FxPressPressEvent())
    }
  }

  /**
   * Handles press cancellation: deactivates ripple and dispatches onPressOut.
   */
  override fun handlePressCancel(x: Float, y: Float) {
    rippleDrawable?.state = intArrayOf()
    onPressOut(FxPressPressEvent())
  }

  /**
   * Handles long press: dispatches onLongPress.
   */
  override fun handleLongPress(x: Float, y: Float) {
    onLongPress(FxPressPressEvent())
  }

  /**
   * No-op on Android; touch dispatch is handled in dispatchTouchEvent.
   */
  override fun attachRecognizer(recognizer: android.view.GestureDetector) {
    // No-op on Android
  }

  /**
   * No-op on Android; touch dispatch is handled in dispatchTouchEvent.
   */
  override fun detachRecognizer(recognizer: android.view.GestureDetector) {
    // No-op on Android
  }

  // MARK: - Ripple Setup

  /**
   * Initializes the RippleDrawable foreground with a bounded radius and material color.
   *
   * The ripple radius is approximately half the smaller of width/height (bounded to the
   * container size). The color is derived from ?colorControlHighlight or defaults to #20000000.
   */
  private fun setUpRipple() {
    val minDimension = kotlin.math.min(width, height)
    val radius = (minDimension / 2).coerceAtLeast(1)

    val color = try {
      context.obtainStyledAttributes(intArrayOf(android.R.attr.colorControlHighlight))
        .use { ta ->
          ta.getColor(0, 0x20000000)
        }
    } catch (e: Exception) {
      0x20000000
    }

    rippleDrawable = RippleDrawable(
      ColorStateList.valueOf(color),
      ShapeDrawable(),
      null
    ).apply {
      setRadius(radius)
    }

    intermediateContainer.foreground = rippleDrawable
  }
}
