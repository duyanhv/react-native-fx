import SwiftUI

/// A self-contained glass/material effect for the hosted substrate.
///
/// Uses `.glassEffect()` on iOS 26 (intensity has no effect on this path —
/// glass-weight-by-intensity needs `UIGlassEffect.Style`; deferred to U3-002).
/// On earlier iOS, intensity selects `.ultraThinMaterial` / `.thinMaterial` /
/// `.regularMaterial` to vary perceived material weight.
internal struct FxMaterialView: View {
  let intensity: Double

  var body: some View {
    if #available(iOS 26.0, *) {
      Rectangle()
        .glassEffect()
    } else {
      Rectangle()
        .fill(materialForIntensity)
    }
  }

  private var materialForIntensity: Material {
    if intensity > 0.7 {
      return .regularMaterial
    } else if intensity > 0.3 {
      return .thinMaterial
    } else {
      return .ultraThinMaterial
    }
  }
}
