import ExpoModulesCore
import UIKit

/// Renders the iOS 26 system glass as a real, hit-testable UIKit surface.
///
/// A SwiftUI `.glassEffect` over a clear-filled shape never installs the system's glass
/// interaction view, so a clear backdrop and the interactive press response are mutually
/// exclusive on that path. A `UIVisualEffectView` carrying `UIGlassEffect` presents both
/// at once: the effect view is hittable, `isInteractive` hands the press to the system's
/// own interaction view, and fx installs no recognizer.
///
/// `UIGlassEffect` must be (re)created during `layoutSubviews()` — creating it in
/// `didMoveToWindow()` does not render (https://github.com/expo/expo/issues/43732) —
/// and toggling `isInteractive` requires clearing the prior effect before reassigning.
@available(iOS 26.0, *)
internal final class FxGlassSurfaceView: UIView {
  private let effectView = UIVisualEffectView()
  private var variant: String = "regular"
  private var interactive: Bool = false
  private var tint: String?
  private var colorScheme: String?
  private var cornerRadius: CGFloat = 0

  /// Tracks whether the view has had a layout pass for the current window attachment;
  /// the glass renders correctly only when the effect is created during one.
  private var hasLaidOut = false

  internal override init(frame: CGRect) {
    super.init(frame: frame)
    effectView.frame = bounds
    effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(effectView)
    // Decorative glass is presentation-only and starts hidden from the accessibility
    // tree; setMaterialConfig re-admits it when the glass turns interactive.
    accessibilityElementsHidden = true
  }

  internal required init?(coder: NSCoder) {
    fatalError("FxGlassSurfaceView does not support NSCoder initialization")
  }

  // MARK: - Configuration

  internal func setMaterialConfig(_ config: MaterialConfig?) {
    let newVariant = config?.variant ?? "regular"
    let newInteractive = config?.interactive ?? false
    let newTint = config?.tint
    let newColorScheme = config?.colorScheme
    guard newVariant != variant || newInteractive != interactive
            || newTint != tint || newColorScheme != colorScheme else {
      return
    }

    // Changing isInteractive leaves the prior glass behind unless UIKit fully tears
    // it down first; an empty UIVisualEffect forces the teardown.
    if newInteractive != interactive {
      effectView.effect = UIVisualEffect()
    }
    variant = newVariant
    interactive = newInteractive
    tint = newTint
    colorScheme = newColorScheme
    // The interactive glass carries the system press response, so it stays reachable
    // to assistive technologies; only the decorative variant is hidden.
    accessibilityElementsHidden = !newInteractive
    applyEffect()
  }

  internal func setCornerRadius(_ radius: CGFloat) {
    guard radius != cornerRadius else {
      return
    }

    cornerRadius = radius
    applyCornerConfiguration()
  }

  // MARK: - Lifecycle

  internal override func layoutSubviews() {
    super.layoutSubviews()
    if !hasLaidOut {
      hasLaidOut = true
      // Clears the stale effect so UIKit fully tears down the prior glass before a
      // fresh one is applied (https://github.com/expo/expo/issues/43732).
      effectView.effect = UIVisualEffect()
      applyEffect()
    }
  }

  internal override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      hasLaidOut = false
    } else {
      // layoutSubviews may not fire on re-entry when geometry is unchanged, so a
      // layout pass is requested explicitly to re-create the glass.
      setNeedsLayout()
    }
  }

  // MARK: - Private helpers

  private func applyEffect() {
    guard hasLaidOut else {
      return
    }

    let glassEffect = UIGlassEffect(style: resolveStyle())
    glassEffect.isInteractive = interactive
    glassEffect.tintColor = uiColorFrom(tint)
    // colorScheme rides the effect view, not the UIGlassEffect (mirrors GlassView.swift).
    effectView.overrideUserInterfaceStyle = userInterfaceStyleFrom(colorScheme)
    effectView.effect = glassEffect
    applyCornerConfiguration()
  }

  private func resolveStyle() -> UIGlassEffect.Style {
    switch variant {
    case "clear":
      return .clear
    default:
      return .regular
    }
  }

  /// Parses a CSS hex color string (#RGB, #RRGGBB, or #RRGGBBAA) to UIColor.
  /// Returns nil for a nil or unrecognised value, which leaves the glass untinted.
  private func uiColorFrom(_ hex: String?) -> UIColor? {
    guard var h = hex else { return nil }
    h = h.trimmingCharacters(in: .whitespacesAndNewlines)
    if h.hasPrefix("#") { h = String(h.dropFirst()) }
    guard let value = UInt64(h, radix: 16) else { return nil }
    switch h.count {
    case 3:
      let r = CGFloat((value >> 8) & 0xF) / 15
      let g = CGFloat((value >> 4) & 0xF) / 15
      let b = CGFloat(value & 0xF) / 15
      return UIColor(red: r, green: g, blue: b, alpha: 1)
    case 6:
      return UIColor(
        red:   CGFloat((value >> 16) & 0xFF) / 255,
        green: CGFloat((value >>  8) & 0xFF) / 255,
        blue:  CGFloat( value        & 0xFF) / 255,
        alpha: 1)
    case 8:
      return UIColor(
        red:   CGFloat((value >> 24) & 0xFF) / 255,
        green: CGFloat((value >> 16) & 0xFF) / 255,
        blue:  CGFloat((value >>  8) & 0xFF) / 255,
        alpha: CGFloat( value        & 0xFF) / 255)
    default:
      return nil
    }
  }

  private func userInterfaceStyleFrom(_ scheme: String?) -> UIUserInterfaceStyle {
    switch scheme {
    case "light": return .light
    case "dark":  return .dark
    default:      return .unspecified
    }
  }

  private func applyCornerConfiguration() {
    let radius = UICornerRadius(floatLiteral: cornerRadius)
    effectView.cornerConfiguration = .corners(
      topLeftRadius: radius,
      topRightRadius: radius,
      bottomLeftRadius: radius,
      bottomRightRadius: radius)
  }
}

/// The structured configuration for the material effect's glass rung.
///
/// Carried as a Record across the Expo bridge; each property uses `@Field` so the bridge
/// converts JS values correctly. `variant` carries the platform-agnostic vocabulary
/// (`regular`/`clear`); unknown values fall back to the regular glass.
struct MaterialConfig: Record {
  @Field var variant: String = "regular"
  @Field var interactive: Bool = false
  @Field var tint: String?
  @Field var colorScheme: String?
}
