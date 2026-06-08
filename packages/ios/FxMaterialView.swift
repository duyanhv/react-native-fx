import SwiftUI

/// A self-contained glass/material effect for the hosted substrate.
///
/// Uses the platform's own glass surface on iOS 26 and falls back to
/// `.ultraThinMaterial` on earlier versions. No layer alpha — intensity
/// selects the material style to vary perceived glass weight.
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
