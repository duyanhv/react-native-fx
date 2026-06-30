package expo.modules.reactnativefx

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Outline
import android.graphics.Rect
import android.graphics.RectF
import android.os.Build
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import androidx.dynamicanimation.animation.FloatValueHolder
import androidx.dynamicanimation.animation.SpringAnimation
import androidx.dynamicanimation.animation.SpringForce
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactPointerEventsView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlin.math.roundToInt

/**
 * The expo-view substrate for an anchored reveal: an fx-owned shell that fills the app-placed
 * bounds-containing host and grows the collapsed slot's frame into a natively computed placement,
 * using the inverse-transform technique so the expanded content rasterizes at full target size
 * and stays sharp.
 *
 * Two fx-owned layers host the content. The collapsed layer fills the shell; the expanded
 * (geometry) layer is sized to the placement (`toRect`, computed in the host's own coordinate
 * space — never written into Yoga, so no siblings reflow) and inverse-transformed to start at the
 * collapsed slot's frame. The reveal animates it to identity and counter-fades the layers. Both
 * layers are [BOX_NONE][PointerEvents.BOX_NONE], so only real RN children are touch targets and
 * non-content taps fall through (Boundary A).
 */
class FxRevealView(
  context: Context,
  appContext: AppContext
) : FxNativeView(context, appContext), ReactPointerEventsView {

  override val shouldUseAndroidLayout: Boolean = true

  val onFxTransitionEnd by EventDispatcher<FxTransitionEndEvent>()

  private var pendingOpen = false
  private var pendingPlacement = "bottom-half"
  private var appliedPlacement = "bottom-half"
  private var expandedInteractive = false

  // Holds the collapsed content, sized to the shell's own bounds; counter-faded, never transformed.
  private val collapsedContainer = FxRevealLayer(context)

  // Holds the expanded content, sized to the resolved placement; the layer the geometry drives.
  private val expandedContainer = FxRevealLayer(context)

  // Scale-free chrome/clip boundary wrapping the inner content-motion layer. The outline clip
  // grows from the collapsed slot's rounded rect to the placement rounded rect alongside the
  // inverse-transform animation, so the radius never rides the non-uniform transform.
  private val chromeContainer = FxRevealChromeContainer(context)

  // Spring animations for the chrome outline rect and radius. Stiffness and damping must match the
  // geometry driver defaults (STIFFNESS_MEDIUM + DAMPING_RATIO_MEDIUM_BOUNCY) so chrome and
  // transform settle on the same trajectory and do not visibly desync at the tail of the morph.
  private val chromeLeftHolder = FloatValueHolder(0f)
  private val chromeTopHolder = FloatValueHolder(0f)
  private val chromeRightHolder = FloatValueHolder(0f)
  private val chromeBottomHolder = FloatValueHolder(0f)
  private val chromeRadiusHolder = FloatValueHolder(0f)
  private val chromeLeftAnim = SpringAnimation(chromeLeftHolder)
  private val chromeTopAnim = SpringAnimation(chromeTopHolder)
  private val chromeRightAnim = SpringAnimation(chromeRightHolder)
  private val chromeBottomAnim = SpringAnimation(chromeBottomHolder)
  private val chromeRadiusAnim = SpringAnimation(chromeRadiusHolder)
  private val chromeAnims = listOf(
    chromeLeftAnim, chromeTopAnim, chromeRightAnim, chromeBottomAnim, chromeRadiusAnim
  )

  private val geometryDriver = FxAnimationDriver(expandedContainer) {
    revealCoordinator.handleDriverCompletion()
  }

  // The collapsed layer's counter-fade carries no FSM completion; the geometry driver owns it.
  private val collapsedDriver = FxAnimationDriver(collapsedContainer) {}

  private val revealCoordinator = FxRevealCoordinator(this)

  init {
    // The expanded layer overflows the shell once expanded, so the shell must not clip its children.
    clipChildren = false
    clipToPadding = false
    super.addView(
      collapsedContainer,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
    // expandedContainer lives inside the chrome boundary so the outline clips it.
    chromeContainer.addView(
      expandedContainer,
      LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
    )
    super.addView(
      chromeContainer,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
    // Wire chrome spring update listeners so every frame tick updates the outline clip.
    chromeAnims.forEach { anim ->
      anim.spring = SpringForce().apply {
        stiffness = SpringForce.STIFFNESS_MEDIUM
        dampingRatio = SpringForce.DAMPING_RATIO_MEDIUM_BOUNCY
      }
      anim.addUpdateListener { _, _, _ ->
        chromeContainer.setChrome(
          chromeLeftHolder.value, chromeTopHolder.value,
          chromeRightHolder.value, chromeBottomHolder.value,
          chromeRadiusHolder.value
        )
      }
    }
  }

  // MARK: - Props

  fun setOpen(value: Boolean) {
    pendingOpen = value
  }

  fun setPlacement(value: String) {
    pendingPlacement = value.ifBlank { "bottom-half" }
  }

  override fun applyResolvedConfig() {
    super.applyResolvedConfig()
    appliedPlacement = pendingPlacement
    revealCoordinator.update(pendingOpen, pendingPlacement)
  }

  // BOX_NONE: the full-bounds shell lets non-content taps fall through to the app behind it.
  // Each internal FxRevealLayer is also BOX_NONE, so only real RN children (the collapsed card,
  // the expanded panel) become TouchTargetHelper targets — the layers themselves are never the hit.
  override val pointerEvents: PointerEvents
    get() = PointerEvents.BOX_NONE

  // MARK: - Layout

  /** True once the shell has a non-zero laid-out size, so the placement geometry resolves. */
  internal val hasResolvedContentSize: Boolean
    get() = width > 0 && height > 0

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val w = MeasureSpec.getSize(widthMeasureSpec)
    val h = MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(w, h)
    collapsedContainer.measure(
      MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
    )
    chromeContainer.measure(
      MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
    )
    // `width`/`height` are zero until layout settles; use the spec values for the initial measure
    // of the expanded container so it is measured at full target size on the first pass.
    val to = if (w > 0 && h > 0) Rect(0, h / 2, w, h) else Rect(0, 0, 0, 0)
    measureExpandedFrame(to)
  }

  /**
   * Lays the collapsed layer to the shell bounds and lets the coordinator re-seat the expanded
   * layer (whose frame is the placement, owned by [seatExpandedFrame]). Does NOT call super: the
   * base `ExpoView` is a `LinearLayout` whose `onLayout` casts children to its own LayoutParams,
   * but the children carry `FrameLayout` params — delegating would crash (the FxSurfaceView gotcha).
   */
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    collapsedContainer.layout(0, 0, right - left, bottom - top)
    chromeContainer.layout(0, 0, right - left, bottom - top)
    revealCoordinator.handleContentLayout()
  }

  // MARK: - Geometry (read by the coordinator)

  /**
   * The collapsed `fromRect` in shell-local px: the first (and only) child of the collapsed
   * container, whose frame is the app-specified position of the collapsed slot within the host
   * (a self-read — the slot wrapper is a direct Fabric child). Falls back to an empty rect before
   * Fabric commits the initial layout; the coordinator's pending-target mechanism re-seats the
   * geometry on the first real layout pass.
   */
  internal fun collapsedFrameInShell(): Rect {
    val child = collapsedContainer.getChildAt(0)
    return if (child != null) Rect(child.left, child.top, child.right, child.bottom) else Rect(0, 0, 0, 0)
  }

  /**
   * The placement `toRect` in the shell's own coordinate space. v1 ships `bottom-half` as the
   * bottom half of the shell's bounds — host-local, so the target is always within the app-placed
   * host regardless of its position in the window. An unknown placement (or a shell with no size
   * yet) falls back to the collapsed frame, degrading to a pure cross-fade.
   */
  internal fun resolvedPlacementRect(placement: String): Rect {
    if (placement != "bottom-half" || width <= 0 || height <= 0) {
      return collapsedFrameInShell()
    }
    return Rect(0, height / 2, width, height)
  }

  // MARK: - Geometry application (driven by the coordinator)

  /** Seats the expanded layer at the placement frame, then snaps it to a geometry (no animation). */
  internal fun snapExpanded(vector: FxAnimationVector) {
    seatExpandedFrame()
    geometryDriver.snap(vector)
  }

  internal fun animateExpanded(vector: FxAnimationVector) {
    geometryDriver.animateTo(vector, presetSpring())
  }

  /**
   * Gates the expanded layer's touch + rendering on the reveal phase. Android does not skip an
   * alpha-0 child in hit-testing, so the hidden expanded content would otherwise intercept taps
   * while collapsed at rest; the flat child accessors expose expanded content only while this gate
   * is active.
   */
  internal fun setExpandedInteractive(active: Boolean) {
    expandedInteractive = active
    expandedContainer.visibility = if (active) View.VISIBLE else View.INVISIBLE
  }

  internal fun snapCollapsedOpacity(opacity: Float) {
    collapsedDriver.snap(FxAnimationVector(opacity = opacity))
  }

  internal fun animateCollapsedOpacity(opacity: Float) {
    collapsedDriver.animateTo(FxAnimationVector(opacity = opacity), presetSpring())
  }

  /**
   * Sizes the expanded layer to the resolved placement with its transform reset, so the later
   * inverse transform maps the full target rect back onto the collapsed frame. Measuring and
   * laying the layer here keeps the expanded content at full target size regardless of the shell's
   * own (collapsed) measured size.
   */
  private fun seatExpandedFrame() {
    val to = resolvedPlacementRect(appliedPlacement)
    expandedContainer.scaleX = 1f
    expandedContainer.scaleY = 1f
    expandedContainer.translationX = 0f
    expandedContainer.translationY = 0f
    expandedContainer.rotation = 0f
    measureExpandedFrame(to)
    expandedContainer.layout(0, 0, overlayWidth(to), overlayHeight(to))
    layoutExpandedChildren(to)
  }

  private fun measureExpandedFrame(to: Rect) {
    val overlayWidth = overlayWidth(to)
    val overlayHeight = overlayHeight(to)
    expandedContainer.measure(
      MeasureSpec.makeMeasureSpec(overlayWidth, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(overlayHeight, MeasureSpec.EXACTLY)
    )
    for (index in 0 until expandedContainer.childCount) {
      expandedContainer.getChildAt(index).measure(
        MeasureSpec.makeMeasureSpec(to.width(), MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(to.height(), MeasureSpec.EXACTLY)
      )
    }
  }

  private fun layoutExpandedChildren(to: Rect) {
    for (index in 0 until expandedContainer.childCount) {
      expandedContainer.getChildAt(index).layout(to.left, to.top, to.right, to.bottom)
    }
  }

  private fun overlayWidth(to: Rect): Int = maxOf(width, to.left + to.width(), to.right, 1)

  private fun overlayHeight(to: Rect): Int = maxOf(height, to.top + to.height(), to.bottom, 1)

  // The reveal honors the platform-default spring in v1; a non-bouncy emphasis is provisional and
  // device-tuned at the gate, like the presence presets.
  private fun presetSpring(): FxAnimationSpring? = null

  // MARK: - Chrome (coordinator-private)

  internal fun snapChrome(rect: Rect, radius: Float) {
    chromeAnims.forEach { it.cancel() }
    chromeLeftHolder.value = rect.left.toFloat()
    chromeTopHolder.value = rect.top.toFloat()
    chromeRightHolder.value = rect.right.toFloat()
    chromeBottomHolder.value = rect.bottom.toFloat()
    chromeRadiusHolder.value = radius
    chromeContainer.setChrome(
      rect.left.toFloat(), rect.top.toFloat(),
      rect.right.toFloat(), rect.bottom.toFloat(),
      radius
    )
  }

  internal fun animateChrome(rect: Rect, radius: Float) {
    if (shouldReduceMotion()) {
      snapChrome(rect, radius)
      return
    }
    chromeLeftAnim.animateToFinalPosition(rect.left.toFloat())
    chromeTopAnim.animateToFinalPosition(rect.top.toFloat())
    chromeRightAnim.animateToFinalPosition(rect.right.toFloat())
    chromeBottomAnim.animateToFinalPosition(rect.bottom.toFloat())
    chromeRadiusAnim.animateToFinalPosition(radius)
  }

  private fun shouldReduceMotion(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ValueAnimator.areAnimatorsEnabled()) return true
    val resolver = context.contentResolver
    val animatorScale = try {
      Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
    } catch (_: Settings.SettingNotFoundException) { 1f }
    val transitionScale = try {
      Settings.Global.getFloat(resolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f)
    } catch (_: Settings.SettingNotFoundException) { 1f }
    return animatorScale == 0f || transitionScale == 0f
  }

  // MARK: - Events

  /**
   * Emits the reveal lifecycle completion the coordinator produces, remapped to the public
   * contract by the surface component. The `onFx` prefix never leaks past JS.
   */
  internal fun dispatchRevealTransitionEnd(phase: String, finished: Boolean, interrupted: Boolean) {
    onFxTransitionEnd(FxTransitionEndEvent("reveal", phase, finished, interrupted))
  }

  // MARK: - Child routing

  // The surface component renders a fixed two-slot order: the collapsed content at index 0, the
  // expanded content at index 1. Routing keys on that index so each slot lands in its fx-owned
  // layer; the flat child accessors below present the two layers' children as one list (collapsed
  // first) so Fabric's mounting manager reconciles consistently.

  override fun addView(child: View?) {
    routeAdd(child) { container, view -> container.addView(view) }
  }

  override fun addView(child: View?, index: Int) {
    if (child === collapsedContainer || child === chromeContainer) {
      super.addView(child, index)
      return
    }
    if (index == 0) {
      collapsedContainer.addView(child, 0)
    } else {
      expandedContainer.addView(child, index - 1)
    }
  }

  override fun addView(child: View?, params: android.view.ViewGroup.LayoutParams?) {
    routeAdd(child) { container, view -> container.addView(view, params) }
  }

  override fun addView(child: View?, index: Int, params: android.view.ViewGroup.LayoutParams?) {
    if (child === collapsedContainer || child === chromeContainer) {
      super.addView(child, index, params)
      return
    }
    if (index == 0) {
      collapsedContainer.addView(child, 0, params)
    } else {
      expandedContainer.addView(child, index - 1, params)
    }
  }

  override fun addView(child: View?, width: Int, height: Int) {
    routeAdd(child) { container, view -> container.addView(view, width, height) }
  }

  // Non-indexed adds fill the collapsed slot first, then the expanded slot — the same leading
  // order the flat accessors present.
  private inline fun routeAdd(child: View?, add: (FrameLayout, View?) -> Unit) {
    when {
      child === collapsedContainer || child === chromeContainer -> super.addView(child)
      collapsedContainer.childCount == 0 -> add(collapsedContainer, child)
      else -> add(expandedContainer, child)
    }
  }

  override fun removeView(view: View?) {
    if (view === collapsedContainer || view === chromeContainer) {
      super.removeView(view)
      return
    }
    if (collapsedContainer.indexOfChild(view) >= 0) {
      collapsedContainer.removeView(view)
    } else {
      expandedContainer.removeView(view)
    }
  }

  override fun removeViewAt(index: Int) {
    if (index < collapsedContainer.childCount) {
      collapsedContainer.removeViewAt(index)
    } else {
      expandedContainer.removeViewAt(index - collapsedContainer.childCount)
    }
  }

  override fun removeAllViews() {
    collapsedContainer.removeAllViews()
    expandedContainer.removeAllViews()
  }

  override fun removeAllViewsInLayout() {
    collapsedContainer.removeAllViewsInLayout()
    expandedContainer.removeAllViewsInLayout()
  }

  override fun getChildCount(): Int =
    collapsedContainer.childCount + if (expandedInteractive) expandedContainer.childCount else 0

  override fun getChildAt(index: Int): View? =
    if (index < collapsedContainer.childCount) {
      collapsedContainer.getChildAt(index)
    } else {
      expandedContainer.getChildAt(index - collapsedContainer.childCount)
    }

  override fun indexOfChild(child: View?): Int {
    val collapsedIndex = collapsedContainer.indexOfChild(child)
    if (collapsedIndex >= 0) {
      return collapsedIndex
    }
    val expandedIndex = expandedContainer.indexOfChild(child)
    return if (expandedIndex >= 0) collapsedContainer.childCount + expandedIndex else -1
  }

  // MARK: - Lifecycle

  override fun pausePresentationLoop() {
    geometryDriver.pause()
    collapsedDriver.pause()
  }

  override fun resumePresentationLoop() {
    geometryDriver.resume()
    collapsedDriver.resume()
  }
}

/**
 * Outer scale-free chrome/clip boundary. Wraps the inner content-motion layer and clips it
 * to an animated rounded rect that grows from the collapsed slot's frame to the placement target.
 * BOX_NONE keeps it out of TouchTargetHelper's search; the outline clip is purely visual.
 */
private class FxRevealChromeContainer(context: Context) : ViewGroup(context), ReactPointerEventsView {
  private var outlineLeft = 0f
  private var outlineTop = 0f
  private var outlineRight = 0f
  private var outlineBottom = 0f
  private var outlineRadius = 0f

  init {
    clipToOutline = true
    clipToPadding = false
    outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) {
        val l = outlineLeft.roundToInt()
        val t = outlineTop.roundToInt()
        val r = outlineRight.roundToInt()
        val b = outlineBottom.roundToInt()
        if (r > l && b > t) {
          outline.setRoundRect(l, t, r, b, outlineRadius)
        }
      }
    }
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  // Children are laid out by FxRevealView.seatExpandedFrame() — no delegate needed here.
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = Unit

  override val pointerEvents: PointerEvents = PointerEvents.BOX_NONE

  fun setChrome(left: Float, top: Float, right: Float, bottom: Float, radius: Float) {
    outlineLeft = left; outlineTop = top; outlineRight = right
    outlineBottom = bottom; outlineRadius = radius
    invalidateOutline()
  }
}

/**
 * A full-bounds content layer for one reveal slot. BOX_NONE keeps the layer itself off
 * TouchTargetHelper's search while leaving its RN children targetable, so a bare tap falls through
 * to content behind the reveal yet a child inside stays tappable.
 */
private class FxRevealLayer(context: Context) : FrameLayout(context), ReactPointerEventsView {
  init {
    clipChildren = false
    clipToPadding = false
  }

  override val pointerEvents: PointerEvents = PointerEvents.BOX_NONE
}
