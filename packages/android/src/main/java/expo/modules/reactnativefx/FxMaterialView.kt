package expo.modules.reactnativefx

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.view.View
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** Linearly maps `intensity` 1.0 to this blur radius; converted to px at the device density. */
private const val MAX_BLUR_RADIUS_DP = 24f

/** Frost-scrim weight for the `regular` variant — the heavier, more frosted panel. */
private const val REGULAR_SCRIM_WEIGHT = 0.55f

/** Frost-scrim weight for the `clear` variant — lighter, more of the backdrop shows through. */
private const val CLEAR_SCRIM_WEIGHT = 0.28f

/**
 * Frost-scrim base for the dark colorScheme: a very dark near-black gray, approximating
 * the dark adaptive material iOS shows below 26. Light and system use [Color.WHITE].
 */
private val DARK_SCRIM_BASE = Color.argb(255, 28, 28, 30)

/** Top and bottom alphas of the vertical highlight gradient before intensity scaling. */
private const val HIGHLIGHT_TOP_ALPHA = 0.35f
private const val HIGHLIGHT_BOTTOM_ALPHA = 0.05f

/**
 * Renders the Android material as an fx-drawn translucent composition: a frost scrim
 * under a vertical highlight gradient, softened by a blur applied to this view's own
 * `RenderNode` via `setRenderEffect` on API 31+.
 *
 * The blur never samples the backdrop — capturing parent content is costly and
 * stale-prone on Android, and fx never hosts RN content to sample it. Below API 31 the
 * same translucent stack draws without blur, so the material degrades but is never a
 * flat box.
 *
 * `tint` drives the frost-scrim base color; when absent the base follows `colorScheme`
 * (light/system = white, dark = near-black). `interactive` is accepted and ignored: the
 * glass press response is the iOS system's own behavior, and Android has no equivalent.
 */
internal class FxMaterialView(
  context: Context,
  intensity: Double,
  config: MaterialConfig?
) : View(context), FxEffectView {
  private val scrimPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var highlightGradient: LinearGradient? = null
  private var intensity: Float = intensityFor(intensity)
  private var scrimWeight: Float = scrimWeightFor(config?.variant)
  private var scrimBaseColor: Int = scrimBaseColorFor(config?.tint, config?.colorScheme)

  init {
    applyBlur()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    scrimPaint.color = scrimBaseColor
    scrimPaint.alpha = (scrimWeight * intensity * 255).toInt().coerceIn(0, 255)
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), scrimPaint)

    val gradient = highlightGradient ?: createHighlightGradient().also { highlightGradient = it }
    highlightPaint.shader = gradient
    highlightPaint.alpha = (intensity * 255).toInt().coerceIn(0, 255)
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), highlightPaint)
  }

  override fun setIntensity(value: Double) {
    intensity = intensityFor(value)
    applyBlur()
    invalidate()
  }

  // Variant, tint, and colorScheme changes all redraw in place — no remount.
  fun setMaterialConfig(config: MaterialConfig?) {
    val weight = scrimWeightFor(config?.variant)
    val baseColor = scrimBaseColorFor(config?.tint, config?.colorScheme)
    if (weight == scrimWeight && baseColor == scrimBaseColor) {
      return
    }
    scrimWeight = weight
    scrimBaseColor = baseColor
    invalidate()
  }

  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(width, height, oldWidth, oldHeight)
    highlightGradient = null
  }

  // Blur requires API 31; below it the translucent stack draws unblurred — degraded,
  // never a flat box. createBlurEffect rejects non-positive radii, so radius 0 clears
  // the effect instead.
  private fun applyBlur() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return
    }
    val radius = intensity * MAX_BLUR_RADIUS_DP * resources.displayMetrics.density
    setRenderEffect(
      if (radius > 0f) {
        RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP)
      } else {
        null
      }
    )
  }

  private fun createHighlightGradient(): LinearGradient {
    return LinearGradient(
      0f, 0f,
      0f, height.toFloat(),
      intArrayOf(
        Color.argb((HIGHLIGHT_TOP_ALPHA * 255).toInt(), 255, 255, 255),
        Color.argb((HIGHLIGHT_BOTTOM_ALPHA * 255).toInt(), 255, 255, 255)
      ),
      null,
      Shader.TileMode.CLAMP
    )
  }
}

/** Clamps the bridged `intensity` to the 0..1 contract. */
private fun intensityFor(value: Double): Float {
  return value.toFloat().coerceIn(0f, 1f)
}

/** Maps the agnostic variant vocabulary to a frost-scrim weight; unknown values fall back to regular. */
private fun scrimWeightFor(variant: String?): Float {
  return when (variant) {
    "clear" -> CLEAR_SCRIM_WEIGHT
    else -> REGULAR_SCRIM_WEIGHT
  }
}

/**
 * Resolves the frost-scrim base color from tint and colorScheme.
 *
 * tint drives the scrim color directly when set, letting the caller cast the material in
 * any hue. When absent, colorScheme selects the base: dark → near-black, light/system →
 * white (the platform default).
 */
private fun scrimBaseColorFor(tint: String?, colorScheme: String?): Int {
  if (tint != null) {
    return parseHexColor(tint) ?: Color.WHITE
  }
  return if (colorScheme == "dark") DARK_SCRIM_BASE else Color.WHITE
}

/**
 * Parses a hex color (#RGB, #RRGGBB, or #RRGGBBAA) to an ARGB int. The format set and the
 * alpha-last byte order match the iOS parser exactly, so an 8-digit tint renders the same
 * color on both platforms — `Color.parseColor` cannot be used (it rejects #RGB and reads
 * 8-digit hex as #AARRGGBB, alpha-first). Returns null for an unrecognised value.
 */
private fun parseHexColor(hex: String): Int? {
  val h = hex.trim().removePrefix("#")
  val value = h.toLongOrNull(16) ?: return null
  return when (h.length) {
    3 -> Color.rgb(
      (((value shr 8) and 0xF) * 17).toInt(),
      (((value shr 4) and 0xF) * 17).toInt(),
      ((value and 0xF) * 17).toInt())
    6 -> Color.rgb(
      ((value shr 16) and 0xFF).toInt(),
      ((value shr 8) and 0xFF).toInt(),
      (value and 0xFF).toInt())
    8 -> Color.argb(
      (value and 0xFF).toInt(),
      ((value shr 24) and 0xFF).toInt(),
      ((value shr 16) and 0xFF).toInt(),
      ((value shr 8) and 0xFF).toInt())
    else -> null
  }
}

/**
 * The structured configuration for the material effect.
 *
 * Carried as a Record across the Expo bridge; each property uses `@Field` so the bridge
 * converts JS values correctly. `variant` carries the platform-agnostic vocabulary
 * (`regular`/`clear`); `interactive` is inert on Android — there is no system glass
 * press to hand it to, and fx never simulates one.
 */
class MaterialConfig : Record {
  @Field
  var variant: String = "regular"

  @Field
  var interactive: Boolean = false

  @Field
  var tint: String? = null

  @Field
  var colorScheme: String? = null
}
