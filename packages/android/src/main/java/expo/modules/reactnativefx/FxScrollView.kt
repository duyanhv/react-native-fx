package expo.modules.reactnativefx

import android.content.Context
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlin.math.max
import kotlin.math.min

/**
 * Hosts the Android source/scroll rung — a native scroll container of fx-owned effect tiles
 * whose presentation is driven by the container's own scroll offset on the UI thread.
 *
 * Mirrors the role FxScrollView.swift / FxScrollRootView.swift play on iOS: a single persistent
 * scroll host, props stashed and applied once per Expo prop batch, tile rebuild only on tile-set
 * change. The offset→opacity/scale mapping runs event-driven in [applyScrollTransition] via
 * [ScrollView.onScrollChanged] / [HorizontalScrollView.onScrollChanged] — no Choreographer loop,
 * no per-frame JS. Fidelity is deliberately lower than the iOS render-server .scrollTransition
 * rung: the platform default here is an event-driven UI-thread edge transition.
 */
class FxScrollView(
  context: Context,
  appContext: AppContext,
) : FxNativeView(context, appContext) {

  // Re-runs measureAndLayout() so the scroll container fills the host bounds when added
  // outside RN's layout pass — without this, ExpoView swallows requestLayout() and the
  // container renders at 0x0.
  override val shouldUseAndroidLayout: Boolean = true

  private var scrollContainer: View? = null
  private var tileViews: List<View> = emptyList()
  private var tilePositions: List<Int> = emptyList()
  private var tilePxHeights: List<Int> = emptyList()
  // Surviving (renderable) tiles, aligned 1-to-1 with tileViews/tilePositions/tilePxHeights.
  private var mountedTiles: List<FxScrollTile> = emptyList()
  private var mountedTileKey: List<Pair<String, Double>>? = null
  private var mountedAxis: String? = null

  private var pendingAxis: String = "vertical"
  private var pendingTiles: List<FxScrollTile> = emptyList()

  // Lay the scroll container explicitly to the RN-assigned host bounds — reading those
  // bounds, never writing layout back to Yoga — then reapply transitions at the current
  // scroll position so the initial state is correct.
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    scrollContainer?.layout(0, 0, width, height)
    applyScrollTransition(currentScrollOffset())
  }

  fun setAxis(value: String) {
    pendingAxis = value
  }

  fun setTiles(value: List<FxScrollTile>?) {
    pendingTiles = value ?: emptyList()
  }

  override fun applyResolvedConfig() {
    super.applyResolvedConfig()

    val tileKey = pendingTiles.map { Pair(it.effect, it.height) }
    val needsRebuild = scrollContainer == null
      || pendingAxis != mountedAxis
      || tileKey != mountedTileKey

    if (needsRebuild) {
      buildScrollContainer(pendingAxis, pendingTiles)
      mountedAxis = pendingAxis
      mountedTileKey = tileKey
    } else {
      // Push intensity updates onto live tile views without remounting — remounting would
      // reset each FxShaderView's shader clock (baseTimeNanos). Iterate mountedTiles (the
      // renderable subset) so indices stay aligned with tileViews.
      mountedTiles.forEachIndexed { i, tile ->
        val view = tileViews.getOrNull(i)
        if (view is FxEffectView) {
          view.setIntensity(tile.intensity)
        }
      }
    }
  }

  // Fan explicit pause/resume to hosted shader tiles so backgrounding stops their loops.
  // Each FxShaderView also self-manages via onDetachedFromWindow/onWindowFocusChanged; this
  // fan-out satisfies the FxNativeView contract for the explicit-pause path.
  override fun pausePresentationLoop() {
    tileViews.filterIsInstance<FxShaderView>().forEach { it.pause() }
  }

  override fun resumePresentationLoop() {
    tileViews.filterIsInstance<FxShaderView>().forEach { it.resume() }
  }

  override fun snapshot(): Map<String, Double> = emptyMap()

  // ── private ─────────────────────────────────────────────────────────────

  private fun buildScrollContainer(axis: String, tiles: List<FxScrollTile>) {
    scrollContainer?.let { removeView(it) }
    tileViews = emptyList()

    val density = resources.displayMetrics.density
    val paddingPx = (16 * density + 0.5f).toInt()
    val spacingPx = (16 * density + 0.5f).toInt()
    val isVertical = axis != "horizontal"

    // Resolve effect views first, dropping unknown ids, so heights/positions/views all derive
    // from the same surviving list — unknown ids would otherwise desync the parallel arrays.
    val renderable = tiles.mapNotNull { tile ->
      val view = createEffectView(context, tile.effect, tile.intensity)
      if (view == null) {
        Log.w("FxScrollView", "Unknown effect id '${tile.effect}' — tile dropped")
        null
      } else {
        Pair(tile, view)
      }
    }

    // Pre-compute tile pixel heights and their start positions along the scroll axis so
    // applyScrollTransition can work without querying child.top after each layout pass.
    val pxHeights = renderable.map { (tile, _) -> (tile.height * density + 0.5f).toInt() }
    val positions = mutableListOf<Int>()
    var cursor = paddingPx
    for (h in pxHeights) {
      positions.add(cursor)
      cursor += h + spacingPx
    }
    tilePxHeights = pxHeights
    tilePositions = positions
    mountedTiles = renderable.map { it.first }

    // Build tile column (orientation matches scroll axis).
    val column = LinearLayout(context).apply {
      orientation = if (isVertical) LinearLayout.VERTICAL else LinearLayout.HORIZONTAL
      setPadding(paddingPx, paddingPx, paddingPx, paddingPx)
      layoutParams = ViewGroup.LayoutParams(
        if (isVertical) ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT,
        if (isVertical) ViewGroup.LayoutParams.WRAP_CONTENT else ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    renderable.forEachIndexed { index, (_, effectView) ->
      val lp = if (isVertical) {
        // height prop = extent along the vertical scroll axis
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          pxHeights[index],
        ).apply { if (index > 0) topMargin = spacingPx }
      } else {
        // height prop = extent along the horizontal scroll axis (the tile's card width)
        LinearLayout.LayoutParams(
          pxHeights[index],
          LinearLayout.LayoutParams.MATCH_PARENT,
        ).apply { if (index > 0) leftMargin = spacingPx }
      }
      effectView.layoutParams = lp
      effectView.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
      column.addView(effectView)
    }
    tileViews = renderable.map { it.second }

    val container: View = if (isVertical) {
      VerticalScrollContainer(context, column) { t -> applyScrollTransition(t) }
    } else {
      HorizontalScrollContainer(context, column) { l -> applyScrollTransition(l) }
    }
    container.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    addView(container)
    scrollContainer = container
    // Initial transition call; no-ops when viewport is 0 (pre-layout).
    applyScrollTransition(0)
  }

  // Maps the native scroll offset to opacity/scale for each tile — the best-effort
  // platform-native edge transition. Tiles fully in view rest at identity (alpha=1, scale=1);
  // tiles crossing the viewport boundary fade and shrink toward (alpha=0, scale=0.85),
  // matching the magnitude range of iOS's render-server .scrollTransition (rule #2).
  private fun applyScrollTransition(scrollOffset: Int) {
    val container = scrollContainer ?: return
    val isVertical = pendingAxis != "horizontal"
    val viewportSize = if (isVertical) container.height else container.width
    if (viewportSize == 0) return

    tileViews.forEachIndexed { i, view ->
      val tileStart = tilePositions.getOrNull(i) ?: return@forEachIndexed
      val tileSize = tilePxHeights.getOrNull(i) ?: return@forEachIndexed
      if (tileSize <= 0) return@forEachIndexed

      val tileEnd = tileStart + tileSize
      val viewStart = scrollOffset.toFloat()
      val viewEnd = viewStart + viewportSize.toFloat()

      // Fraction of the tile visible inside the viewport (0..1).
      val visStart = max(tileStart.toFloat(), viewStart)
      val visEnd = min(tileEnd.toFloat(), viewEnd)
      val fraction = max(0f, visEnd - visStart) / tileSize.toFloat()

      view.alpha = fraction
      val scale = 0.85f + 0.15f * fraction
      view.scaleX = scale
      view.scaleY = scale
    }
  }

  private fun currentScrollOffset(): Int {
    val container = scrollContainer ?: return 0
    return if (pendingAxis != "horizontal") container.scrollY else container.scrollX
  }

  // ── inner scroll containers ──────────────────────────────────────────────

  private class VerticalScrollContainer(
    context: Context,
    column: LinearLayout,
    private val onOffset: (Int) -> Unit,
  ) : ScrollView(context) {
    init {
      isVerticalScrollBarEnabled = false
      addView(column)
    }

    override fun onScrollChanged(l: Int, t: Int, oldl: Int, oldt: Int) {
      super.onScrollChanged(l, t, oldl, oldt)
      onOffset(t)
    }
  }

  private class HorizontalScrollContainer(
    context: Context,
    column: LinearLayout,
    private val onOffset: (Int) -> Unit,
  ) : HorizontalScrollView(context) {
    init {
      isHorizontalScrollBarEnabled = false
      addView(column)
    }

    override fun onScrollChanged(l: Int, t: Int, oldl: Int, oldt: Int) {
      super.onScrollChanged(l, t, oldl, oldt)
      onOffset(l)
    }
  }
}

/**
 * One fx-owned effect tile as it crosses the Expo bridge. [effect] is the effect id (a
 * curated shader id or `"fill"`); [intensity] drives the effect's opacity/depth uniform;
 * [height] is the tile's extent along the scroll axis, in layout units (dp).
 */
data class FxScrollTile(
  @Field val effect: String = "",
  @Field val intensity: Double = 0.8,
  @Field val height: Double = 220.0,
) : Record
