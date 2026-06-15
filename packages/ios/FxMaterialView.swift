import SwiftUI

/// The below-iOS-26 material fallback for the hosted substrate.
///
/// Intensity selects `.ultraThinMaterial` / `.thinMaterial` / `.regularMaterial` to vary
/// perceived material weight. On iOS 26 the material effect renders through
/// `FxGlassSurfaceView` instead; this view never mounts there.
internal struct FxMaterialView: View {
  let intensity: Double

  var body: some View {
    Rectangle()
      .fill(materialForIntensity)
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
