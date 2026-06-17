import UIKit

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
  private weak var surface: FxSurfaceView?
  private var recognizer: UILongPressGestureRecognizer?
  private var mode: FxPressInteractionMode = .none
  private var origin: CGPoint = .zero
  private var didBeginActivePress = false
  private var didFireLongPress = false
  private var longPressTimer: Timer?

  private let allowableMovement: CGFloat = 10
  private let longPressDuration: TimeInterval = 0.5
  private var dragAxis: String?

  internal init(surface: FxSurfaceView) {
    self.surface = surface
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
    if !skipUniformReset {
      surface?.updatePressUniforms(point: nil, depth: 0)
      surface?.updateDragTiltUniforms(origin: nil, current: nil, dragAxis: nil)
    }
    guard let recognizer else { return }
    surface?.removeGestureRecognizer(recognizer)
    self.recognizer = nil
  }

  private func attach() {
    guard let surface else { return }
    guard recognizer == nil else { return }
    let recognizer = UILongPressGestureRecognizer(target: self, action: #selector(handleRecognizer(_:)))
    recognizer.minimumPressDuration = 0
    recognizer.cancelsTouchesInView = false
    recognizer.delegate = self
    surface.addGestureRecognizer(recognizer)
    self.recognizer = recognizer
  }

  @objc private func handleRecognizer(_ recognizer: UILongPressGestureRecognizer) {
    guard let surface else { return }
    let location = recognizer.location(in: surface)
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
    guard let surface else { return }
    origin = location
    didFireLongPress = false
    guard surface.containsInteractiveShape(point: location) else {
      failRecognizer()
      return
    }
    surface.updatePressUniforms(point: location, depth: mode == .active ? 1 : 0)
    if mode == .active, dragAxis != nil {
      surface.updateDragTiltUniforms(origin: location, current: location, dragAxis: dragAxis)
    }
    guard mode == .active else { return }
    didBeginActivePress = true
    surface.dispatchShaderPressIn(point: location)
    scheduleLongPress()
  }

  private func handleChanged(at location: CGPoint) {
    guard let surface else { return }
    surface.updatePressUniforms(point: location, depth: didBeginActivePress ? 1 : 0)
    if mode == .active, dragAxis != nil {
      surface.updateDragTiltUniforms(origin: origin, current: location, dragAxis: dragAxis)
    }
    if shouldFail(at: location) {
      failRecognizer()
    }
  }

  private func handleEnded(at location: CGPoint) {
    guard let surface else { return }
    longPressTimer?.invalidate()
    longPressTimer = nil
    surface.updatePressUniforms(point: location, depth: 0)
    settleDragTilt()
    guard didBeginActivePress else { return }
    didBeginActivePress = false
    surface.dispatchShaderPressOut(point: location)
    guard !didFireLongPress else { return }
    surface.dispatchShaderPress(point: location)
  }

  private func handleCancelled() {
    guard let surface else { return }
    longPressTimer?.invalidate()
    longPressTimer = nil
    surface.updatePressUniforms(point: nil, depth: 0)
    settleDragTilt()
    guard didBeginActivePress else { return }
    didBeginActivePress = false
    surface.dispatchShaderPressOut(point: origin)
  }

  private func handleFailed() {
    handleCancelled()
  }

  private func settleDragTilt() {
    guard mode == .active, dragAxis != nil else { return }
    surface?.updateDragTiltUniforms(origin: nil, current: nil, dragAxis: nil)
  }

  private func scheduleLongPress() {
    longPressTimer?.invalidate()
    // Added in `.common` mode so the long-press still fires while the run loop is in a tracking
    // mode (an active scroll/drag); a default-mode timer would stall until tracking ends.
    let timer = Timer(timeInterval: longPressDuration, repeats: false) { [weak self] _ in
      guard let self, let surface = self.surface, self.didBeginActivePress, !self.didFireLongPress else { return }
      self.didFireLongPress = true
      surface.dispatchShaderLongPress(point: self.origin)
    }
    RunLoop.main.add(timer, forMode: .common)
    longPressTimer = timer
  }

  private func shouldFail(at location: CGPoint) -> Bool {
    guard let surface else { return true }

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
    return distanceSquared > allowableMovement * allowableMovement || !surface.containsInteractiveShape(point: location)
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
