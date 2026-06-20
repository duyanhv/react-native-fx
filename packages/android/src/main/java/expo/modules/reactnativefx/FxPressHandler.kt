package expo.modules.reactnativefx

import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.ViewConfiguration

private enum class FxPressInteractionMode {
  NONE,
  PASSIVE,
  ACTIVE,
  CONTROLLED,
}

internal class FxPressHandler(private val host: FxPressHost, context: android.content.Context) {
  private val handler = Handler(Looper.getMainLooper())
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop.toFloat()
  private val longPressTimeout = ViewConfiguration.getLongPressTimeout().toLong()

  private var mode = FxPressInteractionMode.NONE
  private var dragAxis: String? = null
  private var originX = 0f
  private var originY = 0f
  private var lastX = 0f
  private var lastY = 0f
  private var hasActivePointer = false
  private var didBeginActivePress = false
  private var didFireLongPress = false

  private val longPressRunnable = Runnable {
    if (didBeginActivePress && !didFireLongPress) {
      didFireLongPress = true
      host.handleLongPress(lastX, lastY)
    }
  }

  fun update(rawMode: String, dragAxis: String?) {
    val nextMode = when (rawMode) {
      "passive" -> FxPressInteractionMode.PASSIVE
      "active" -> FxPressInteractionMode.ACTIVE
      "controlled" -> FxPressInteractionMode.CONTROLLED
      else -> FxPressInteractionMode.NONE
    }
    if (nextMode == mode && this.dragAxis == dragAxis) {
      return
    }
    mode = nextMode
    this.dragAxis = dragAxis
    if (mode == FxPressInteractionMode.NONE || mode == FxPressInteractionMode.CONTROLLED) {
      cancel()
    }
  }

  fun handle(event: MotionEvent): Boolean {
    if (mode == FxPressInteractionMode.NONE || mode == FxPressInteractionMode.CONTROLLED) {
      return false
    }
    return when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> handleDown(event)
      MotionEvent.ACTION_MOVE -> handleMove(event)
      MotionEvent.ACTION_UP -> handleUp(event)
      MotionEvent.ACTION_CANCEL -> {
        cancel()
        false
      }
      else -> didBeginActivePress
    }
  }

  private fun handleDown(event: MotionEvent): Boolean {
    originX = event.x
    originY = event.y
    lastX = event.x
    lastY = event.y
    hasActivePointer = host.hitTarget(event.x, event.y)
    if (!hasActivePointer) {
      return false
    }
    (host as? android.view.View)?.parent?.requestDisallowInterceptTouchEvent(true)
    val depth = if (mode == FxPressInteractionMode.ACTIVE) 1 else 0
    host.handlePressBegin(event.x, event.y, depth)
    if (mode == FxPressInteractionMode.ACTIVE) {
      didBeginActivePress = true
      didFireLongPress = false
      handler.postDelayed(longPressRunnable, longPressTimeout)
    }
    return hasActivePointer
  }

  private fun handleMove(event: MotionEvent): Boolean {
    if (!hasActivePointer) {
      return false
    }
    lastX = event.x
    lastY = event.y
    val depth = if (didBeginActivePress) 1 else 0
    host.handlePressChanged(event.x, event.y, depth)
    if (shouldFail(event.x, event.y)) {
      (host as? android.view.View)?.parent?.requestDisallowInterceptTouchEvent(false)
      cancel()
      return false
    }
    return hasActivePointer
  }

  private fun handleUp(event: MotionEvent): Boolean {
    if (!hasActivePointer) {
      return false
    }
    handler.removeCallbacks(longPressRunnable)
    (host as? android.view.View)?.parent?.requestDisallowInterceptTouchEvent(false)
    val shouldEmitPress = didBeginActivePress
    didBeginActivePress = false
    hasActivePointer = false
    if (shouldEmitPress) {
      host.handlePressEnd(event.x, event.y, includePressEvent = !didFireLongPress)
    }
    return shouldEmitPress
  }

  private fun cancel() {
    handler.removeCallbacks(longPressRunnable)
    (host as? android.view.View)?.parent?.requestDisallowInterceptTouchEvent(false)
    if (didBeginActivePress) {
      host.handlePressCancel(lastX, lastY)
    }
    didBeginActivePress = false
    didFireLongPress = false
    hasActivePointer = false
  }

  private fun shouldFail(x: Float, y: Float): Boolean {
    // Axis-aware claiming when dragAxis is set under active mode.
    // The shader claims its configured axis; cross-axis movement past slop
    // that dominates the claimed axis yields the gesture to an ancestor scroller.
    if (mode == FxPressInteractionMode.ACTIVE && dragAxis != null) {
      val deltaX = x - originX
      val deltaY = y - originY
      val absDeltaX = Math.abs(deltaX)
      val absDeltaY = Math.abs(deltaY)
      when (dragAxis) {
        "horizontal" -> {
          if (absDeltaY > touchSlop && absDeltaY > absDeltaX) {
            return true
          }
          return false
        }
        "vertical" -> {
          if (absDeltaX > touchSlop && absDeltaX > absDeltaY) {
            return true
          }
          return false
        }
        "both" -> {
          return false
        }
      }
    }

    // Default: fail on any movement past slop (today's behavior).
    val deltaX = x - originX
    val deltaY = y - originY
    return deltaX * deltaX + deltaY * deltaY > touchSlop * touchSlop || !host.hitTarget(x, y)
  }
}
