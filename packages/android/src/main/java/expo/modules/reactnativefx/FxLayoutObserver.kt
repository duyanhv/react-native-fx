package expo.modules.reactnativefx

import android.graphics.Point
import android.graphics.Rect
import android.view.View
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/** Names a window edge for native travel measurement. */
internal enum class FxEdge {
  TOP,
  BOTTOM,
  LEFT,
  RIGHT,
}

/**
 * Captures the React-Native-assigned frame of a surface view and serves it to the
 * native animation driver by synchronous read. Reads layout, never writes it.
 *
 * React Native's mounting layer assigns the frame through `view.layout(...)`, which
 * dispatches layout-change listeners independently of the host's `onLayout` override —
 * the capture stays decoupled from the intermediate-container layout mechanic. The view
 * holds the listener on itself, so the observation lives exactly as long as the view and
 * survives the transient detach/reattach React Native performs on Android. Window-space
 * values are computed at read time because an ancestor scroll moves the view in the
 * window without a local layout event. All captures and reads happen on the UI thread.
 */
internal class FxLayoutObserver(private val view: View) : View.OnLayoutChangeListener {
  private val capturedFrame = Rect()

  init {
    view.addOnLayoutChangeListener(this)
    if (view.isLaidOut) {
      capturedFrame.set(view.left, view.top, view.right, view.bottom)
    }
  }

  override fun onLayoutChange(
    changedView: View,
    left: Int,
    top: Int,
    right: Int,
    bottom: Int,
    oldLeft: Int,
    oldTop: Int,
    oldRight: Int,
    oldBottom: Int,
  ) {
    capturedFrame.set(left, top, right, bottom)
  }

  /** Returns the captured post-layout frame in the parent's coordinate space, in px. */
  fun readFrameInParent(): Rect = Rect(capturedFrame)

  /** Returns the view's origin in window coordinates, in px. */
  fun readOriginInWindow(): Point {
    val location = IntArray(2)
    view.getLocationInWindow(location)
    return Point(location[0], location[1])
  }

  /**
   * Returns the distance the view travels to fully clear the named window edge — the
   * magnitude an edge-based enter or exit resolves natively.
   */
  fun readTravelDistance(edge: FxEdge): Float {
    val root = view.rootView ?: return 0f
    val location = IntArray(2)
    view.getLocationInWindow(location)
    return when (edge) {
      FxEdge.TOP -> (location[1] + view.height).toFloat()
      FxEdge.BOTTOM -> (root.height - location[1]).toFloat()
      FxEdge.LEFT -> (location[0] + view.width).toFloat()
      FxEdge.RIGHT -> (root.width - location[0]).toFloat()
    }
  }

  /** Returns the window's system-bar and cutout insets, or zero when unavailable. */
  fun readSafeAreaInsets(): Insets {
    val rootInsets = ViewCompat.getRootWindowInsets(view) ?: return Insets.NONE
    return rootInsets.getInsets(
      WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
    )
  }

  /** Stops observing layout changes. */
  fun detach() {
    view.removeOnLayoutChangeListener(this)
  }
}
