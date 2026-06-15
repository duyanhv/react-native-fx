import UIKit

/// Names a window edge for native travel measurement.
internal enum FxEdge: String {
  case top
  case bottom
  case left
  case right
}

/// Captures the React-Native-assigned frame of a surface view and serves it to the
/// native animation driver by synchronous read. Reads layout, never writes it.
///
/// React Native applies layout by setting `center` and then `bounds` on the component
/// view, so observing `bounds` sees every applied frame — including origin-only moves —
/// with the origin already current when the observation fires. Window-space values are
/// computed at read time because an ancestor scroll moves the view in the window without
/// a local layout event. All captures and reads happen on the main thread.
internal final class FxLayoutObserver {
  /// The most recent React-Native-assigned frame: origin in the parent's space, in points.
  internal private(set) var capturedFrame: CGRect = .zero

  // Unowned because the view owns this observer, so the observer never outlives it.
  private unowned let view: UIView
  private var boundsObservation: NSKeyValueObservation?

  internal init(observing view: UIView) {
    self.view = view
    capturedFrame = view.frame
    boundsObservation = view.observe(\.bounds, options: [.new]) { [weak self] view, change in
      guard let newBounds = change.newValue else {
        return
      }
      self?.capturedFrame = CGRect(origin: view.frame.origin, size: newBounds.size)
    }
  }

  deinit {
    invalidate()
  }

  /// Returns the captured post-layout frame in the parent's coordinate space, in points.
  internal func readFrameInParent() -> CGRect {
    return capturedFrame
  }

  /// Returns the view's origin in window coordinates, or zero when detached.
  internal func readOriginInWindow() -> CGPoint {
    guard view.window != nil else {
      return .zero
    }
    return view.convert(view.bounds.origin, to: nil)
  }

  /// Returns the distance the view travels to fully clear the named window edge — the
  /// magnitude an edge-based enter or exit resolves natively. Zero when detached.
  internal func readTravelDistance(to edge: FxEdge) -> CGFloat {
    guard let window = view.window else {
      return 0
    }
    let frameInWindow = view.convert(view.bounds, to: nil)
    switch edge {
    case .top:
      return frameInWindow.maxY
    case .bottom:
      return window.bounds.height - frameInWindow.minY
    case .left:
      return frameInWindow.maxX
    case .right:
      return window.bounds.width - frameInWindow.minX
    }
  }

  /// Returns the safe-area insets currently applied to the view.
  internal func readSafeAreaInsets() -> UIEdgeInsets {
    return view.safeAreaInsets
  }

  /// Stops observing. Safe to call more than once.
  internal func invalidate() {
    boundsObservation?.invalidate()
    boundsObservation = nil
  }
}
