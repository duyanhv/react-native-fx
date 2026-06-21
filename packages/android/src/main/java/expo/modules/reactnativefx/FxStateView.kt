package expo.modules.reactnativefx

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * A lightweight native view that wraps RN children and eases between mounted states natively.
 *
 * Extends FxNativeView to sit on the Expo Modules boundary. Routes RN children into an
 * intermediate FrameLayout container that Fabric does not track, and drives its transform/opacity
 * between named states via FxAnimationDriver. One settle event returns per transition.
 */
internal class FxStateView(
  context: Context,
  appContext: AppContext,
) : FxNativeView(context, appContext) {

  /**
   * Re-runs measureAndLayout() so the intermediate container fills the host bounds
   * and Fabric children receive a real size.
   */
  override val shouldUseAndroidLayout: Boolean = true

  // Prefixed name avoids React Native's reserved event namespace; the public `onStateChange`
  // prop maps to this in `FxView.tsx`.
  val onFxStateChange by EventDispatcher<FxStateChangeEvent>()

  /**
   * A Fabric-invisible container that holds RN children so Fabric cannot clobber
   * the state animation.
   */
  private val intermediateContainer = FrameLayout(context).apply {
    layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    )
  }

  private val animationDriver = FxAnimationDriver(intermediateContainer) {
    stateCoordinator.handleDriverCompletion()
  }

  private val stateCoordinator = FxStateViewCoordinator(this)

  private var pendingState = "idle"
  private var pendingPreset = "lift"
  private var pendingStateMotion: List<FxStateMotionEntry>? = null

  init {
    super.addView(
      intermediateContainer,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
  }

  // MARK: - Presentation Lifecycle

  override fun pausePresentationLoop() {
    animationDriver.pause()
  }

  override fun resumePresentationLoop() {
    animationDriver.resume()
  }

  // MARK: - Prop Setters

  internal fun setState(state: String) {
    pendingState = state
  }

  internal fun setPreset(preset: String) {
    pendingPreset = preset
  }

  internal fun setStateMotion(stateMotion: List<FxStateMotionEntry>?) {
    pendingStateMotion = stateMotion
  }

  // MARK: - Config Application

  override fun applyResolvedConfig() {
    stateCoordinator.update(pendingState, pendingPreset, pendingStateMotion)
  }

  // MARK: - Child Routing (Fabric-invisible wrapper pattern)

  /**
   * Routes Fabric-mounted children to the intermediate container instead of FxStateView
   * itself, so Fabric's layout machinery cannot clobber the state animation.
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

  // MARK: - Driver Interface (called by FxStateViewCoordinator)

  internal fun animateContent(to: FxAnimationVector) {
    animationDriver.animateTo(to)
  }

  internal fun snapContent(to: FxAnimationVector) {
    animationDriver.snap(to)
  }

  internal fun dispatchStateChange(state: String, finished: Boolean, interrupted: Boolean) {
    onFxStateChange(FxStateChangeEvent(state = state, finished = finished, interrupted = interrupted))
  }
}
