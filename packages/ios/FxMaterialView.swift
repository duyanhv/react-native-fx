import SwiftUI

/// A self-contained glass/material effect for the hosted substrate.
///
/// Uses available material styles, falling back through platform generations.
/// Intensity fades between a clear background (0) and full material (1).
internal struct FxMaterialView: View {
  let intensity: Double

  var body: some View {
    Rectangle()
      .fill(Color.clear)
      .background {
        if #available(iOS 26.0, *) {
          Rectangle().fill(.regularMaterial)
        } else {
          Rectangle().fill(.ultraThinMaterial)
        }
      }
      .opacity(intensity)
  }
}

/// An inert placeholder for unknown effect ids.
internal struct FxEmptyView: View {
  var body: some View {
    Color.clear
  }
}
