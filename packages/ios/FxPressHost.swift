import UIKit

internal protocol FxPressHost: AnyObject {
  func hitTarget(point: CGPoint) -> Bool
  func handlePressBegin(point: CGPoint, depth: Int)
  func handlePressChanged(point: CGPoint, depth: Int)
  func handlePressEnd(point: CGPoint, includePressEvent: Bool)
  func handlePressCancel(point: CGPoint)
  func handleLongPress(point: CGPoint)
  func attachRecognizer(_ recognizer: UILongPressGestureRecognizer)
  func detachRecognizer(_ recognizer: UILongPressGestureRecognizer)
}
