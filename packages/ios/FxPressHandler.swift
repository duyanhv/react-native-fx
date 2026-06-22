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

internal enum FxPressInteractionMode {
  case none
  case passive
  case active
  case controlled

  internal init(rawValue: String) {
    switch rawValue {
    case "passive":
      self = .passive
    case "active":
      self = .active
    case "controlled":
      self = .controlled
    default:
      self = .none
    }
  }
}

internal final class FxPressHandler: NSObject, UIGestureRecognizerDelegate {
  private weak var host: FxPressHost?
  private var recognizer: UILongPressGestureRecognizer?
  private var mode: FxPressInteractionMode = .none
  private var origin: CGPoint = .zero
  private var didBeginActivePress = false
  private var didFireLongPress = false
  private var longPressTimer: Timer?

  private let allowableMovement: CGFloat = 10
  private let longPressDuration: TimeInterval = 0.5
  private var dragAxis: String?

  internal init(host: FxPressHost) {
    self.host = host
  }

  internal func update(mode rawMode: String, dragAxis: String?) {
    let nextMode = FxPressInteractionMode(rawValue: rawMode)
    guard nextMode != mode || self.dragAxis != dragAxis else { return }
    mode = nextMode
    self.dragAxis = dragAxis
    if mode == .passive || mode == .active {
      attach()
    } else {
      detach(skipUniformReset: mode == .controlled)
    }
  }

  internal func detach(skipUniformReset: Bool = false) {
    longPressTimer?.invalidate()
    longPressTimer = nil
    didBeginActivePress = false
    didFireLongPress = false
    guard let recognizer else { return }
    host?.detachRecognizer(recognizer)
    self.recognizer = nil
  }

  private func attach() {
    guard let host else { return }
    guard recognizer == nil else { return }
    let recognizer = UILongPressGestureRecognizer(target: self, action: #selector(handleRecognizer(_:)))
    recognizer.minimumPressDuration = 0
    recognizer.cancelsTouchesInView = false
    recognizer.allowableMovement = .greatestFiniteMagnitude
    recognizer.delegate = self
    host.attachRecognizer(recognizer)
    self.recognizer = recognizer
  }

  @objc private func handleRecognizer(_ recognizer: UILongPressGestureRecognizer) {
    guard let host, let view = host as? UIView else { return }
    let location = recognizer.location(in: view)
    switch recognizer.state {
    case .began:
      handleBegan(at: location)
    case .changed:
      handleChanged(at: location)
    case .ended:
      handleEnded(at: location)
    case .cancelled:
      handleCancelled()
    case .failed:
      handleFailed()
    default:
      break
    }
  }

  private func handleBegan(at location: CGPoint) {
    guard let host else { return }
    origin = location
    didFireLongPress = false
    guard host.hitTarget(point: location) else {
      failRecognizer()
      return
    }
    let depth = mode == .active ? 1 : 0
    host.handlePressBegin(point: location, depth: depth)
    guard mode == .active else { return }
    didBeginActivePress = true
    scheduleLongPress()
  }

  private func handleChanged(at location: CGPoint) {
    guard let host else { return }
    let depth = didBeginActivePress ? 1 : 0
    host.handlePressChanged(point: location, depth: depth)
    if shouldFail(at: location) {
      failRecognizer()
    }
  }

  private func handleEnded(at location: CGPoint) {
    guard let host else { return }
    longPressTimer?.invalidate()
    longPressTimer = nil
    if didBeginActivePress {
      didBeginActivePress = false
      let includePressEvent = !didFireLongPress
      host.handlePressEnd(point: location, includePressEvent: includePressEvent)
    } else {
      host.handlePressEnd(point: location, includePressEvent: false)
    }
  }

  private func handleCancelled() {
    guard let host else { return }
    longPressTimer?.invalidate()
    longPressTimer = nil
    if didBeginActivePress {
      didBeginActivePress = false
      host.handlePressCancel(point: origin)
    } else {
      host.handlePressEnd(point: origin, includePressEvent: false)
    }
  }

  private func handleFailed() {
    handleCancelled()
  }

  private func scheduleLongPress() {
    longPressTimer?.invalidate()
    // Added in `.common` mode so the long-press still fires while the run loop is in a tracking
    // mode (an active scroll/drag); a default-mode timer would stall until tracking ends.
    let timer = Timer(timeInterval: longPressDuration, repeats: false) { [weak self] _ in
      guard let self, let host = self.host, self.didBeginActivePress, !self.didFireLongPress else { return }
      self.didFireLongPress = true
      host.handleLongPress(point: self.origin)
    }
    RunLoop.main.add(timer, forMode: .common)
    longPressTimer = timer
  }

  private func shouldFail(at location: CGPoint) -> Bool {
    guard let host else { return true }

    // Axis-aware claiming when dragAxis is set under active mode.
    // The shader claims its configured axis; cross-axis movement past slop
    // that dominates the claimed axis yields the gesture to an ancestor scroller.
    if mode == .active, let axis = dragAxis {
      let deltaX = location.x - origin.x
      let deltaY = location.y - origin.y
      let absDeltaX = abs(deltaX)
      let absDeltaY = abs(deltaY)
      switch axis {
      case "horizontal":
        if absDeltaY > allowableMovement && absDeltaY > absDeltaX {
          return true
        }
        return false
      case "vertical":
        if absDeltaX > allowableMovement && absDeltaX > absDeltaY {
          return true
        }
        return false
      case "both":
        return false
      default:
        break
      }
    }

    // Default: fail on any movement past slop (today's behavior).
    let deltaX = location.x - origin.x
    let deltaY = location.y - origin.y
    let distanceSquared = deltaX * deltaX + deltaY * deltaY
    return distanceSquared > allowableMovement * allowableMovement || !host.hitTarget(point: location)
  }

  private func failRecognizer() {
    guard let recognizer else { return }
    recognizer.isEnabled = false
    recognizer.isEnabled = true
  }

  internal func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    return true
  }
}
