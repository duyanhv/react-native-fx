import SwiftUI

/// A self-contained generative gradient fill for the hosted substrate.
///
/// Renders as a decorative layer that never samples RN content.
/// When intensity is 0 the gradient is invisible; at 1 it covers the full surface.
internal struct FxFillView: View {
  let intensity: Double

  var body: some View {
    ZStack {
      if #available(iOS 18.0, *) {
        MeshGradient(
          width: 3,
          height: 3,
          points: meshPoints,
          colors: meshColors
        )
        .opacity(intensity)
      } else {
        LinearGradient(
          colors: [
            Color(red: 0.3, green: 0.5, blue: 1.0),
            Color(red: 0.6, green: 0.3, blue: 0.9),
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
        .opacity(intensity)
      }
    }
  }

  private var meshPoints: [SIMD2<Float>] {
    [
      .init(0.0, 0.0), .init(0.5, 0.2), .init(1.0, 0.0),
      .init(0.1, 0.5), .init(0.5, 0.5), .init(0.9, 0.5),
      .init(0.0, 1.0), .init(0.5, 0.8), .init(1.0, 1.0),
    ]
  }

  private var meshColors: [Color] {
    [
      Color(red: 0.3, green: 0.5, blue: 1.0),
      Color(red: 0.6, green: 0.3, blue: 0.9),
      Color(red: 0.9, green: 0.3, blue: 0.6),
      Color(red: 0.5, green: 0.6, blue: 0.9),
      Color(red: 0.4, green: 0.3, blue: 0.8),
      Color(red: 0.8, green: 0.4, blue: 0.7),
      Color(red: 0.2, green: 0.4, blue: 1.0),
      Color(red: 0.7, green: 0.3, blue: 0.5),
      Color(red: 0.4, green: 0.7, blue: 0.9),
    ]
  }
}
