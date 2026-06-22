import SwiftUI

/// The below-iOS-26 material fallback for the hosted substrate.
///
/// Intensity selects `.ultraThinMaterial` / `.thinMaterial` / `.regularMaterial` to vary
/// perceived material weight. On iOS 26 the material effect renders through
/// `FxGlassSurfaceView` instead; this view never mounts there.
///
/// `colorScheme` forces light or dark appearance on the system material. `tint` has no
/// equivalent on SwiftUI adaptive materials — it degrades silently on this rung.
internal struct FxMaterialView: View {
  let intensity: Double
  let colorScheme: ColorScheme?

  @ViewBuilder
  var body: some View {
    let base = Rectangle().fill(materialForIntensity)
    if let scheme = colorScheme {
      base.environment(\.colorScheme, scheme)
    } else {
      base
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
