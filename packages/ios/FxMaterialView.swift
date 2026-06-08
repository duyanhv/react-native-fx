import SwiftUI

/// A self-contained glass/material effect for the hosted substrate.
///
/// Uses `.glassEffect` on iOS 26 and falls back to `.ultraThinMaterial`
/// on earlier versions. Intensity fades between a clear background (0)
/// and full material (1).
internal struct FxMaterialView: View {
  let intensity: Double

  var body: some View {
    Rectangle()
      .fill(Color.clear)
      .background(materialBackground.opacity(intensity))
  }

  @ViewBuilder
  private var materialBackground: some ShapeStyle {
    if #available(iOS 26.0, *) {
      // TODO: `.glassEffect` requires a UIGlassEffect style —
      // placeholder until the exact API is confirmed on device (FX-002).
      Rectangle().fill(.regularMaterial)
    } else {
      Rectangle().fill(.ultraThinMaterial)
    }
  }
}

/// An inert placeholder for unknown effect ids.
internal struct FxEmptyView: View {
  var body: some View {
    Color.clear
  }
}
