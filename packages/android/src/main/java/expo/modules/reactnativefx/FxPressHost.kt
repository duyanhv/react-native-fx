package expo.modules.reactnativefx

import android.view.GestureDetector

internal interface FxPressHost {
  fun hitTarget(x: Float, y: Float): Boolean
  fun handlePressBegin(x: Float, y: Float, depth: Int)
  fun handlePressChanged(x: Float, y: Float, depth: Int)
  fun handlePressEnd(x: Float, y: Float, includePressEvent: Boolean)
  fun handlePressCancel(x: Float, y: Float)
  fun handleLongPress(x: Float, y: Float)
  fun attachRecognizer(recognizer: GestureDetector)
  fun detachRecognizer(recognizer: GestureDetector)
}
