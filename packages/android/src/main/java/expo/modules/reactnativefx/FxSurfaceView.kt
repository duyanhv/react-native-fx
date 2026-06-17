package expo.modules.reactnativefx

import android.content.Context
import android.graphics.RuntimeShader
import android.os.Build
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher

/** Payload for the shader load/error events: the resolved id, and a reason on failure. */
data class FxShaderEvent(
  @Field val shader: String,
  @Field val reason: String? = null,
) : Record

/** Payload for semantic shader press events in view points. */
data class FxShaderPressEvent(
  @Field val x: Double,
  @Field val y: Double,
) : Record

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
) : FxNativeView(context, appContext), ReactPointerEventsView {

  /**
   * The content-motion container holds a Fabric-mounted child tree; it is added outside
   * RN's layout pass. Without this, ExpoView swallows the container's requestLayout() and
   * the child renders at 0x0 (blank). true re-runs measureAndLayout() so the container
   * fills the host bounds.
   */
  override val shouldUseAndroidLayout: Boolean = true

  /**
   * Reports a completed shader press with a prefixed name that avoids React Native's reserved event.
   */
  val onShaderPress by EventDispatcher<FxShaderPressEvent>()
  val onShaderPressIn by EventDispatcher<FxShaderPressEvent>()
  val onShaderPressOut by EventDispatcher<FxShaderPressEvent>()
  val onShaderLongPress by EventDispatcher<FxShaderPressEvent>()

  val onFxTransitionEnd by EventDispatcher<FxTransitionEndEvent>()
  val onFxLoad by EventDispatcher<FxShaderEvent>()
  val onFxError by EventDispatcher<FxShaderEvent>()

  private var pendingShader = ""
  private var pendingIntensity = 0.8
  private var pendingInteractionMode = "none"
  private var pendingDragAxis: String? = null
  private var pendingContentDistortion = ""

  // The hit-target verdict TouchTargetHelper reads when it walks the view tree. BOX_NONE keeps the
  // surface itself off the target search while leaving RN children inside targetable, so a `none`
  // touch falls through to content composited behind the surface; AUTO claims it for the press
  // handler. Finalized in applyResolvedConfig off the same applied mode the handler reads — never
  // computed per event.
  private var appliedPointerEvents = PointerEvents.BOX_NONE

  // Presence targets, stashed by prop setters and forwarded to the coordinator once per batch.
  private var pendingVisible = false
  private var pendingPreset = "transient"
  private var pendingAppear = true
  private var pendingPresenceMotion: FxPresenceMotion? = null

  // The last shader a load/error event was dispatched for, so the semantic events fire once
  // per change — never a per-frame stream. null until the first shader is applied. The registry
  // source is tracked alongside the id because `registerShader` can replace the same id's source
  // (valid->broken or broken->valid), which must re-emit even though the id is unchanged.
  private var lastDispatchedShader: String? = null
  private var lastDispatchedSource: String? = null
  private var effectSurfaceView: FxSurfaceShaderView? = null
  private val pressHandler = FxPressHandler(this)

  // Tracks which uniforms have been imperatively overridden via `setUniform` so that
  // `applyResolvedConfig` does not clobber them on a later prop batch. The key is the uniform
  // name; clearing a value removes the key, letting the prop-derived value win again.
  internal val imperativeOverrides = mutableSetOf<String>()

  // Tracks the current interaction mode so leaving `controlled` can clear the imperative
  // overrides and restore prop-derived values.
  private var currentInteractionMode = "none"

  /**
   * A Fabric-invisible container that holds RN children so Fabric cannot clobber
   * the animator's transform/opacity. The animator targets this container, not the
   * outer `FxSurfaceView` that Fabric tracks.
   */
  private val intermediateContainer = FxPassthroughContainer(context).apply {
    layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    )
  }

  init {
    super.addView(
      intermediateContainer,
      LayoutParams(
        LayoutParams.MATCH_PARENT,
        LayoutParams.MATCH_PARENT
      )
    )
  }

  /**
   * Captures the RN-assigned post-layout frame for synchronous native reads by the
   * content-motion driver and the presence coordinator. Nothing crosses to JS.
   */
  internal val layoutObserver = FxLayoutObserver(this)

  /** Routes driver completion to the presence coordinator, the completion source for the FSM. */
  internal var onContentAnimationCompletion: (() -> Unit)? = null

  private val contentAnimationDriver = FxAnimationDriver(intermediateContainer) {
    onContentAnimationCompletion?.invoke()
  }

  // Distorts the content container's own rendered output with a draw-time RenderEffect, so the
  // RN children inside stay a plain, tappable view tree. Android-only; a no-op below API 33.
  private val contentDistortion = FxContentDistortion(intermediateContainer)

  /**
   * Turns the discrete `visible` target into an interruptible enter/exit envelope. A plain
   * internal object — never bridged to JS.
   */
  private val presenceCoordinator = FxPresenceCoordinator(this).also { coordinator ->
    onContentAnimationCompletion = { coordinator.handleDriverCompletion() }
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
    effectSurfaceView?.measure(
      View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
    )
  }

  /**
   * Lays the intermediate container to the host bounds. Does NOT call super: the base
   * `ExpoView` is a `LinearLayout`, and its `onLayout` iterates the (proxied) child
   * accessors and casts each child to `LinearLayout.LayoutParams` — but the children live
   * in the container with `FrameLayout.LayoutParams`, so delegating crashes. The container
   * is already sized by `onMeasure`; laying it to the host bounds here is sufficient.
   */
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    intermediateContainer.layout(0, 0, right - left, bottom - top)
    effectSurfaceView?.layout(0, 0, right - left, bottom - top)
    presenceCoordinator.handleContentLayout()
  }

  /**
   * True once the surface has a non-zero laid-out size, so measured presence travel resolves to a
   * real magnitude rather than the pre-layout zero fallback.
   */
  internal val hasResolvedContentSize: Boolean
    get() = layoutObserver.readFrameInParent().height() > 0 || height > 0

  // The prop setters stash their target; `applyResolvedConfig` reconciles the whole batch once Expo
  // finishes it (the two-phase Expo prop pattern). Only constraints the signature can't carry are
  // commented.
  fun setShader(value: String) {
    pendingShader = value
  }

  fun setIntensity(value: Double) {
    pendingIntensity = value
  }

  fun setInteractionMode(value: String) {
    pendingInteractionMode = value
  }

  fun setDragAxis(value: String) {
    pendingDragAxis = value.ifBlank { null }
  }

  // `'ripple'` is the only recognized value; absent or unrecognized leaves the content undistorted.
  fun setContentDistortion(value: String) {
    pendingContentDistortion = value
  }

  fun setVisible(value: Boolean) {
    pendingVisible = value
  }

  fun setPreset(value: String) {
    pendingPreset = value
  }

  fun setPresenceMotion(value: FxPresenceMotion?) {
    pendingPresenceMotion = value
  }

  // Whether the initial visible mount plays the enter envelope.
  fun setAppear(value: Boolean) {
    pendingAppear = value
  }

  override fun applyResolvedConfig() {
    super.applyResolvedConfig()
    pendingIntensity = pendingIntensity.coerceIn(0.0, 1.0)
    pendingInteractionMode = pendingInteractionMode.ifBlank { "none" }
    appliedPointerEvents = when (pendingInteractionMode) {
      "passive", "active" -> PointerEvents.AUTO
      // TODO: `controlled` collapses to the none path for now (out of V1 scope); it may want AUTO
      // when controlled mode ships.
      else -> PointerEvents.BOX_NONE
    }
    updateEffectSurfaceVisibility()
    dispatchShaderLoadState()
    contentDistortion.update(pendingContentDistortion, pendingIntensity)
    pressHandler.update(pendingInteractionMode, pendingDragAxis)
    if (currentInteractionMode == "controlled" && pendingInteractionMode != "controlled") {
      imperativeOverrides.clear()
      effectSurfaceView?.clearCustomUniforms()
      effectSurfaceView?.setIntensity(pendingIntensity)
    }
    currentInteractionMode = pendingInteractionMode
    presenceCoordinator.update(pendingVisible, pendingAppear, pendingPreset, pendingPresenceMotion)

    // A config batch can land while the window is unfocused (app backgrounded, behind a dialog) but
    // still attached, where the shader and content-distort loops start on attach. Re-pause so a
    // batch never resumes a frame loop while the window lacks focus (rule #1); focus-gain resumes
    // via onWindowFocusChanged. (The content-motion springs self-suspend off-window — see
    // FxAnimationDriver.pause.)
    if (!hasWindowFocus()) {
      pausePresentationLoop()
    }
  }

  override val pointerEvents: PointerEvents
    get() = appliedPointerEvents

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    val consumedByFx = pressHandler.handle(event)
    return consumedByFx || super.dispatchTouchEvent(event)
  }

  internal fun animateContentTo(target: FxAnimationVector, spring: FxAnimationSpring? = null) {
    contentAnimationDriver.animateTo(target, spring)
  }

  /** Places the content container instantly, without animation. */
  internal fun snapContent(target: FxAnimationVector) {
    contentAnimationDriver.snap(target)
  }

  internal fun cancelContentAnimation() {
    contentAnimationDriver.cancel()
  }

  /**
   * Emits the presence lifecycle completion the coordinator produces, remapped to the public
   * contract by the surface component. The `onFx` prefix never leaks past JS.
   */
  internal fun dispatchPresenceTransitionEnd(phase: String, finished: Boolean, interrupted: Boolean) {
    onFxTransitionEnd(FxTransitionEndEvent("presence", phase, finished, interrupted))
  }

  internal fun updatePressUniforms(x: Float?, y: Float?, depth: Float) {
    val width = width.coerceAtLeast(1).toFloat()
    val height = height.coerceAtLeast(1).toFloat()
    val touchX = (x ?: (width * 0.5f)) / width
    val touchY = 1f - ((y ?: (height * 0.5f)) / height)
    effectSurfaceView?.setPressUniforms(touchX, touchY, depth)
  }

  /**
   * Writes a scalar uniform value into the live shader, or clears the override when `value` is null.
   *
   * Only `controlled` mode enables this path; the write is observed on the next frame and
   * survives host re-renders because `applyResolvedConfig` skips uniforms that are overridden.
   * Unknown uniform names are silently ignored (no new error channel).
   */
  fun setUniform(name: String, value: Double?) {
    if (pendingInteractionMode != "controlled") {
      return
    }
    if (value != null) {
      imperativeOverrides.add(name)
    } else {
      imperativeOverrides.remove(name)
    }
    effectSurfaceView?.setUniform(name, value)
  }

  /**
   * Sets the highlight position in `[0, 1]` y-up UV space and activates the press depth.
   * Convenience sugar over the `touch` and `pressDepth` uniforms.
   */
  fun setHighlight(x: Double, y: Double) {
    if (pendingInteractionMode != "controlled") {
      return
    }
    effectSurfaceView?.setHighlight(x, y)
  }

  // Touch coordinates arrive in physical pixels; the JS event payload reports view points (dp) to
  // match the RN locationX/Y convention and iOS. The internal shape/uniform math stays in pixels.
  private fun toPoints(value: Float): Double {
    return (value / context.resources.displayMetrics.density).toDouble()
  }

  internal fun dispatchShaderPressIn(x: Float, y: Float) {
    onShaderPressIn(FxShaderPressEvent(toPoints(x), toPoints(y)))
  }

  internal fun dispatchShaderPressOut(x: Float, y: Float) {
    onShaderPressOut(FxShaderPressEvent(toPoints(x), toPoints(y)))
  }

  internal fun dispatchShaderPress(x: Float, y: Float) {
    onShaderPress(FxShaderPressEvent(toPoints(x), toPoints(y)))
  }

  internal fun dispatchShaderLongPress(x: Float, y: Float) {
    onShaderLongPress(FxShaderPressEvent(toPoints(x), toPoints(y)))
  }

  internal fun containsInteractiveShape(x: Float, y: Float): Boolean {
    return x >= 0f && y >= 0f && x <= width.toFloat() && y <= height.toFloat()
  }

  /**
   * Reports whether the active shader loaded, once per change — never a per-frame stream.
   * The curated AGSL asset is opened and compiled to prove the load; success fires onFxLoad,
   * failure fires onFxError — the signal a bring-your-own consumer falls back on when a shader
   * fails to load. Below API 33 the shader rung degrades to {via:'none'}, a graceful no-op,
   * not an error.
   */
  private fun dispatchShaderLoadState() {
    val currentSource = FxShaderRegistry.source(pendingShader)
    if (pendingShader == lastDispatchedShader && currentSource == lastDispatchedSource) return
    lastDispatchedShader = pendingShader
    lastDispatchedSource = currentSource
    if (pendingShader.isBlank()) return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

    val curated = CURATED_SHADER_IDS.contains(pendingShader)
    if (!curated && !FxShaderRegistry.isRegistered(pendingShader)) {
      onFxError(FxShaderEvent(pendingShader, "no renderer for shader id"))
      return
    }

    val source = if (curated) {
      try {
        context.assets.open(agslAssetPathFor(pendingShader)).bufferedReader().use { it.readText() }
      } catch (error: Exception) {
        onFxError(FxShaderEvent(pendingShader, error.message ?: "shader load failed"))
        return
      }
    } else {
      // Registered: a null source is a registered id with no android source — degrade silently
      // to {via:'none'} per the pair rule, no event.
      FxShaderRegistry.source(pendingShader) ?: return
    }

    try {
      RuntimeShader(source)
      onFxLoad(FxShaderEvent(pendingShader))
    } catch (error: Exception) {
      onFxError(FxShaderEvent(pendingShader, error.message ?: "shader compile failed"))
    }
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

  override fun updateViewLayout(view: View?, params: android.view.ViewGroup.LayoutParams?) {
    if (view === intermediateContainer) {
      super.updateViewLayout(view, toHostLayoutParams(params))
      return
    }
    intermediateContainer.updateViewLayout(view, params)
  }

  override fun removeViewAt(index: Int) {
    intermediateContainer.removeViewAt(index)
  }

  override fun removeViews(start: Int, count: Int) = intermediateContainer.removeViews(start, count)

  override fun removeViewsInLayout(start: Int, count: Int) = intermediateContainer.removeViewsInLayout(start, count)

  override fun removeAllViews() = intermediateContainer.removeAllViews()

  override fun removeAllViewsInLayout() = intermediateContainer.removeAllViewsInLayout()

  override fun getChildCount(): Int = intermediateContainer.childCount

  override fun getChildAt(index: Int): View? = intermediateContainer.getChildAt(index)

  override fun indexOfChild(child: View?): Int = intermediateContainer.indexOfChild(child)

  // MARK: - Helpers

  private fun toHostLayoutParams(params: android.view.ViewGroup.LayoutParams?): LayoutParams = when (params) {
    null -> LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    is LayoutParams -> params
    else -> LayoutParams(params)
  }

  // MARK: - Effect surface visibility

  /**
   * Pushes the active shader id and intensity onto the effect surface view, creating it on first
   * use. The view shows itself only when the id resolves to a real shader and goes `GONE`
   * otherwise, so a blank, unknown, source-less, or malformed id never leaves an empty overlay
   * obscuring the content-motion container.
   */
  private fun updateEffectSurfaceVisibility() {
    val hasShaderProp = pendingShader.isNotBlank()
    val view = if (hasShaderProp) ensureEffectSurfaceView() else effectSurfaceView ?: return
    view.setShaderId(if (hasShaderProp) pendingShader else "")
    if (!imperativeOverrides.contains("intensity")) {
      view.setIntensity(pendingIntensity)
    }
  }

  private fun ensureEffectSurfaceView(): FxSurfaceShaderView {
    effectSurfaceView?.let { return it }
    val view = FxSurfaceShaderView(context).apply {
      layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    }
    super.addView(view)
    effectSurfaceView = view
    return view
  }

  // A continuous loop must pause on background, not only on detach: an attached-but-unfocused
  // window (app backgrounded, over a system dialog) still keeps the view attached, so detach
  // alone would leave the content-distort frame loop running off-screen.
  override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
    super.onWindowFocusChanged(hasWindowFocus)
    if (hasWindowFocus) {
      resumePresentationLoop()
    } else {
      pausePresentationLoop()
    }
  }

  override fun pausePresentationLoop() {
    effectSurfaceView?.pausePresentationLoop()
    contentAnimationDriver.pause()
    contentDistortion.pause()
  }

  override fun resumePresentationLoop() {
    effectSurfaceView?.resumePresentationLoop()
    contentAnimationDriver.resume()
    contentDistortion.resume()
  }
}

/**
 * Full-bounds wrapper for the RN child tree. BOX_NONE keeps the wrapper itself off
 * TouchTargetHelper's target search while leaving its RN children targetable, so a bare `none`-mode
 * tap finds no child here and falls through to content composited behind the surface, yet an RN
 * child inside stays tappable.
 */
private class FxPassthroughContainer(context: Context) : FrameLayout(context), ReactPointerEventsView {
  override val pointerEvents: PointerEvents = PointerEvents.BOX_NONE
}
