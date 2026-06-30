import ExpoModulesCore
import UIKit

/// The expo-view substrate for an anchored reveal: an fx-owned shell that fills the app-placed
/// bounds-containing host and grows the collapsed slot's frame into a natively computed placement,
/// using the inverse-transform technique so the expanded content rasterizes at full target size
/// and stays sharp.
///
/// Two fx-owned layers host the content. The collapsed layer fills the shell; the expanded
/// (geometry) layer is sized to the placement (`toRect`, computed in the host's own coordinate
/// space — never written into Yoga, so no siblings reflow) and inverse-transformed to start at
/// the collapsed slot's frame. The reveal animates it to identity and counter-fades the layers.
/// Fabric tracks only the outer view. Both layers are transparent to touches unless a real
/// descendant is the target; the shell itself passes through for non-content taps (Boundary A).
internal final class FxRevealView: FxNativeView {
  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()

  // MARK: - Layers

  /// Holds the collapsed content, sized to the shell's own bounds. Counter-faded against the
  /// expanded layer; never geometry-transformed.
  private let collapsedContainer = UIView()

  /// Holds the expanded content, sized to the resolved placement and driven by the inverse
  /// transform. This is the inner content-motion layer whose geometry the reveal animates.
  private let expandedContainer = UIView()

  /// Outer scale-free chrome/clip boundary. Hosts the inner content-motion layer and clips it
  /// to an animated rounded-rect mask — in the shell's own coordinate space, so the corner
  /// radius never rides the non-uniform inverse transform.
  private let chromeLayer = UIView()

  /// The animated clip mask on `chromeLayer`. Path grows from the collapsed slot's rounded rect
  /// to the placement rounded rect alongside the inverse-transform geometry animation.
  private let chromeMask = CAShapeLayer()

  // MARK: - Drivers

  private var geometryDriver: FxAnimationDriver!
  private var collapsedDriver: FxAnimationDriver!
  private var revealCoordinator: FxRevealCoordinator!

  // MARK: - Pending props

  private var pendingOpen = false
  private var pendingPlacement = "bottom-half"
  private var appliedPlacement = "bottom-half"

  internal required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setUpLayers()
    geometryDriver = FxAnimationDriver(targetView: expandedContainer) { [weak self] in
      self?.revealCoordinator.handleDriverCompletion()
    }
    // The collapsed layer's counter-fade carries no FSM completion; the geometry driver owns it.
    collapsedDriver = FxAnimationDriver(targetView: collapsedContainer) {}
    revealCoordinator = FxRevealCoordinator(surface: self)
  }

  deinit {
    geometryDriver.cancel()
    collapsedDriver.cancel()
  }

  // MARK: - Setup

  /// Adds the two content layers. The chrome layer fills the shell so its mask can address any
  /// rect within it; the expanded content-motion layer lives inside the chrome boundary so the
  /// mask clips it throughout the reveal flight.
  private func setUpLayers() {
    collapsedContainer.frame = bounds
    addSubview(collapsedContainer)

    // The chrome layer matches the shell bounds so mask coordinates are shell-local.
    chromeLayer.frame = bounds
    chromeLayer.clipsToBounds = false
    chromeMask.fillColor = UIColor.black.cgColor
    chromeLayer.layer.mask = chromeMask
    addSubview(chromeLayer)

    // The expanded content lives inside the chrome boundary, clipped by the mask above.
    chromeLayer.addSubview(expandedContainer)
  }

  // MARK: - Props

  internal func setOpen(_ value: Bool) {
    pendingOpen = value
  }

  internal func setPlacement(_ value: String) {
    pendingPlacement = value.isEmpty ? "bottom-half" : value
  }

  internal override func applyResolvedConfig() {
    super.applyResolvedConfig()
    appliedPlacement = pendingPlacement
    revealCoordinator.update(open: pendingOpen, placement: pendingPlacement)
  }

  // MARK: - Layout

  /// True once the shell has a non-zero laid-out size, so the placement geometry resolves to real
  /// magnitudes rather than the pre-layout zero fallback.
  internal var hasResolvedContentSize: Bool {
    return bounds.width > 0 && bounds.height > 0
  }

  internal override func layoutSubviews() {
    super.layoutSubviews()
    collapsedContainer.frame = bounds
    // Keep the chrome layer and its mask frame in sync with the shell on every layout pass.
    chromeLayer.frame = bounds
    chromeMask.frame = chromeLayer.bounds
    // The collapsed slot wrapper is a Fabric-managed child; its frame is set by the layout engine
    // and reflects the app-specified position within the host. Do not override it — the coordinator
    // reads it via collapsedFrameInShell() to derive fromRect.
    //
    // The expanded content fills its placement-sized container so it rasterizes at target size;
    // seatExpandedFrame() handles its geometry when the coordinator seats or animates the layer.
    for child in expandedContainer.subviews {
      child.frame = expandedContainer.bounds
    }
    revealCoordinator.handleContentLayout()
  }

  // MARK: - Geometry (read by the coordinator)

  /// The collapsed `fromRect` in the shell's own coordinate space: the first (and only) child of
  /// the collapsed container, whose frame is the app-specified position of the collapsed slot
  /// within the host (a self-read — the slot wrapper is a direct Fabric child). Falls back to the
  /// zero rect before Fabric commits the initial layout; the coordinator's pending-target mechanism
  /// re-seats the geometry on the first real layout pass.
  internal func collapsedFrameInShell() -> CGRect {
    return collapsedContainer.subviews.first?.frame ?? .zero
  }

  /// The placement `toRect` in the shell's own coordinate space. v1 ships `bottom-half` as the
  /// bottom half of the shell's bounds — host-local, so the target is always within the
  /// app-placed host regardless of its position in the window. An unknown placement (or a shell
  /// with no size yet) falls back to the collapsed frame, degrading to a pure cross-fade.
  internal func resolvedPlacementRect(_ placement: String) -> CGRect {
    guard bounds.width > 0, bounds.height > 0 else {
      return collapsedFrameInShell()
    }
    switch placement {
    case "bottom-half":
      return CGRect(x: 0, y: bounds.height / 2, width: bounds.width, height: bounds.height / 2)
    default:
      return collapsedFrameInShell()
    }
  }

  // MARK: - Geometry application (driven by the coordinator)

  /// Seats the expanded layer at the placement frame, then snaps it to a geometry (no animation).
  internal func snapExpanded(to vector: FxAnimationVector) {
    seatExpandedFrame()
    geometryDriver.snap(to: vector)
  }

  internal func animateExpanded(to vector: FxAnimationVector) {
    geometryDriver.animate(to: vector)
  }

  /// Gates the expanded layer's touch + rendering on the reveal phase, so the content never
  /// intercepts taps (or draws) while collapsed at rest — it sits at opacity 0 there, which iOS
  /// hit-testing already skips, but hiding it keeps parity with Android (where an alpha-0 child
  /// stays in the touch path).
  internal func setExpandedInteractive(_ active: Bool) {
    expandedContainer.isHidden = !active
  }

  internal func snapCollapsedOpacity(to opacity: CGFloat) {
    collapsedDriver.snap(to: opacityVector(opacity))
  }

  internal func animateCollapsedOpacity(to opacity: CGFloat) {
    collapsedDriver.animate(to: opacityVector(opacity))
  }

  /// Sizes the expanded layer to the resolved placement while its transform is identity, so the
  /// later inverse transform maps the full target rect back onto the collapsed frame.
  private func seatExpandedFrame() {
    expandedContainer.transform = .identity
    expandedContainer.frame = resolvedPlacementRect(appliedPlacement)
    for child in expandedContainer.subviews {
      child.frame = expandedContainer.bounds
    }
  }

  private func opacityVector(_ opacity: CGFloat) -> FxAnimationVector {
    return FxAnimationVector(
      opacity: opacity, scale: 1, translationX: 0, translationY: 0, rotation: 0)
  }

  // MARK: - Chrome (coordinator-private)

  /// The clip target for one endpoint of the radius morph. Both rect and radius are in the
  /// shell's own coordinate space — never in the inverse-transformed content layer's space.
  internal struct ChromeTarget {
    let rect: CGRect
    let radius: CGFloat
  }

  /// Snaps the chrome mask to a target with no animation.
  internal func snapChrome(to target: ChromeTarget) {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    chromeMask.path = chromePath(target)
    CATransaction.commit()
  }

  /// Animates the chrome mask toward a target using a critically-damped spring that approximates
  /// the geometry driver's timing, so radius + clip stay visually in lockstep with the transform.
  internal func animateChrome(to target: ChromeTarget) {
    let toPath = chromePath(target)
    let fromPath = (chromeMask.presentation() as? CAShapeLayer)?.path ?? chromeMask.path
    // Set the model layer immediately so reads after this call reflect the target.
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    chromeMask.path = toPath
    CATransaction.commit()
    guard #available(iOS 17, *), !UIAccessibility.isReduceMotionEnabled else {
      return  // already snapped to target above
    }
    let animation = CASpringAnimation(keyPath: "path")
    animation.fromValue = fromPath
    animation.toValue = toPath
    // Critically-damped spring (damping == 2·√(stiffness·mass)) that settles in ~0.5 s,
    // close to the geometry driver's UIKit smooth-spring timing.
    animation.mass = 1
    animation.stiffness = 100
    animation.damping = 20
    animation.initialVelocity = 0
    animation.isRemovedOnCompletion = true
    chromeMask.add(animation, forKey: "fxChromePath")
  }

  private func chromePath(_ target: ChromeTarget) -> CGPath {
    return UIBezierPath(roundedRect: target.rect, cornerRadius: target.radius).cgPath
  }

  // MARK: - Events

  /// Emits the reveal lifecycle completion the coordinator produces, remapped to the public
  /// contract by the surface component. The `onFx` prefix never leaks past JS.
  internal func dispatchRevealTransitionEnd(phase: String, finished: Bool, interrupted: Bool) {
    onFxTransitionEnd([
      "owner": "reveal", "phase": phase, "finished": finished, "interrupted": interrupted,
    ])
  }

  // MARK: - Child routing

  /// Routes the first Fabric-mounted child into the collapsed layer and the rest into the expanded
  /// layer, so the surface component's fixed two-slot order (collapsed, then expanded) lands in the
  /// matching fx-owned container. Neither layer is Fabric-tracked, so the reveal owns their frames.
  internal override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    if index == 0 {
      collapsedContainer.insertSubview(childComponentView, at: 0)
    } else {
      expandedContainer.insertSubview(childComponentView, at: index - 1)
    }
    setNeedsLayout()
  }

  internal override func unmountChildComponentView(_ child: UIView, index: Int) {
    if child.superview == collapsedContainer || child.superview == expandedContainer {
      child.removeFromSuperview()
    }
  }

  // MARK: - Touch

  /// Passes through taps that land in empty space — only real RN descendants (the collapsed card,
  /// the expanded panel content) are valid hit targets. The shell and its container layers are
  /// plain UIViews that would absorb taps and return themselves from `hitTest`; filtering them out
  /// makes the overlay transparent to the app behind it for non-content regions. The expanded
  /// container's `isHidden` gate already prevents it from being traversed while collapsed.
  internal override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    let result = super.hitTest(point, with: event)
    guard result !== self, result !== collapsedContainer, result !== chromeLayer,
          result !== expandedContainer else {
      return nil
    }
    return result
  }

  // MARK: - Lifecycle

  internal override func pausePresentationLoop() {
    geometryDriver.pause()
    collapsedDriver.pause()
  }

  internal override func resumePresentationLoop() {
    let canPlay = window != nil && isAppForegrounded
    if canPlay {
      geometryDriver.resume()
      collapsedDriver.resume()
    } else {
      geometryDriver.pause()
      collapsedDriver.pause()
    }
  }
}
