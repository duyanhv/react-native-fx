package expo.modules.reactnativefx

import android.content.Context
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.airbnb.lottie.LottieAnimationView
import com.airbnb.lottie.LottieCompositionFactory
import com.airbnb.lottie.LottieDrawable
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/**
 * The Android symbol rung: a [FrameLayout] that guards an app-registered Lottie animation,
 * resolved by name and rendered into a child [LottieAnimationView].
 *
 * It is a plain group rather than a [LottieAnimationView] subclass because Fabric preallocates
 * this view before any JS selector runs — so it must be class-loadable and constructible even when
 * the optional Lottie peer is absent. Touching a Lottie type at class-load or `<init>` would link
 * the missing superclass and crash before [onError] could fire. The peer is probed once into
 * [lottieAvailable]; every Lottie reference lives behind that guard, and the child is created
 * lazily only when a real composition is about to mount.
 *
 * A bare [View.layout] from the host does not measure descendants, so the child would collapse to
 * 0x0. [onLayout] measures and lays the child out to the host bounds explicitly, mirroring the
 * plain-View layout contract the host applies one level up.
 *
 * Play-mode collapses by animation class, not trigger alone: an indefinite animation
 * (`variableColor|breathe|rotate|wiggle`) loops while active when its trigger is `'repeat'`/`'state'`;
 * a discrete animation (`bounce|pulse|scale|appear|disappear`) always plays once. The asset defines
 * the look; the animation enum only selects loop vs once.
 *
 * [configure] is idempotent per applied config — an unchanged batch neither replays the animation nor
 * re-warns, mirroring the effect path's mounted-id guard.
 *
 * Absent peer or missing asset → renders nothing, emits a [Log.w] in the asset case, and calls
 * [onError] so the host can fire `onFxError(reason:'unsupported')`.
 */
internal class FxSymbolView(
  context: Context,
  private val onError: () -> Unit,
) : FrameLayout(context) {
  private var lottieView: LottieAnimationView? = null
  private var mountedName: String? = null
  private var lastApplied: AppliedConfig? = null

  init {
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun configure(config: SymbolConfig) {
    val resolvedName = config.replaceWith?.takeIf { it.isNotEmpty() } ?: config.name
    val incoming = AppliedConfig(resolvedName, config.animation, config.trigger)
    if (incoming == lastApplied) return
    lastApplied = incoming

    if (resolvedName.isEmpty()) {
      clear()
      return
    }

    // The crash guard: return before referencing any Lottie type when the peer is absent.
    if (!lottieAvailable) {
      clear()
      onError()
      return
    }

    val json = FxSymbolRegistry.source(resolvedName)
    if (json == null) {
      Log.w(TAG, "[react-native-fx] symbol '$resolvedName' is not registered; call registerSymbol() before mounting.")
      clear()
      onError()
      return
    }

    val existing = lottieView
    if (resolvedName == mountedName && existing?.composition != null) {
      applyPlayMode(config)
      return
    }

    mountSymbol(resolvedName, json, config)
  }

  private fun mountSymbol(name: String, json: String, config: SymbolConfig) {
    clear()
    mountedName = name
    val view = LottieAnimationView(context).apply {
      layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }
    addView(view)
    lottieView = view

    // Null cache key forces a re-parse of the in-hand JSON; keying by name would return a stale
    // composition after the same name is re-registered with new source.
    LottieCompositionFactory.fromJsonString(json, null).addListener { result ->
      view.setComposition(result)
      applyPlayMode(config)
    }
  }

  private fun applyPlayMode(config: SymbolConfig) {
    val view = lottieView ?: return
    val trigger = config.trigger ?: "value"
    val shouldLoop = isIndefinite(config.animation) && (trigger == "repeat" || trigger == "state")
    view.repeatCount = if (shouldLoop) LottieDrawable.INFINITE else 0
    view.playAnimation()
  }

  // The host lays this view out with a bare layout() and no measure pass; the child needs an
  // explicit measure+layout to the host bounds or it collapses to 0x0.
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    val w = r - l
    val h = b - t
    lottieView?.let {
      it.measure(
        MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
      )
      it.layout(0, 0, w, h)
    }
  }

  private fun clear() {
    lottieView?.let {
      it.cancelAnimation()
      removeView(it)
    }
    lottieView = null
    mountedName = null
  }

  // The applied tuple guarding replay/re-warn: a batch matching the last one is a no-op.
  private data class AppliedConfig(
    val name: String,
    val animation: String,
    val trigger: String?,
  )

  companion object {
    private const val TAG = "FxSymbolView"
    private val INDEFINITE_ANIMATIONS = setOf("variableColor", "breathe", "rotate", "wiggle")

    private fun isIndefinite(animation: String): Boolean = animation in INDEFINITE_ANIMATIONS

    // Probed once: an absent peer throws ClassNotFoundException, a half-present one a LinkageError.
    // Both mean "treat Lottie as absent" — every Lottie reference stays behind this flag.
    private val lottieAvailable: Boolean = try {
      Class.forName("com.airbnb.lottie.LottieComposition")
      true
    } catch (_: ClassNotFoundException) {
      false
    } catch (_: LinkageError) {
      false
    }
  }
}

/**
 * The structured configuration for a symbol effect.
 *
 * Carried as a Record across the Expo bridge; each property uses [@Field] so the bridge
 * converts JS values correctly. Mirrors the iOS `SymbolConfig` record.
 */
class SymbolConfig : Record {
  @Field
  var name: String = ""

  @Field
  var animation: String = "bounce"

  @Field
  var trigger: String? = null

  @Field
  var replaceWith: String? = null
}
