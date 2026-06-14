import SwiftUI

/// The persistent SwiftUI root for the hosted scroll source.
///
/// `FxScrollView` mounts this once inside a long-lived `UIHostingController` and mutates the
/// observed `FxScrollProps` holder per prop batch. The `ScrollView` reads its own scroll
/// position and SwiftUI applies each tile's `.scrollTransition` in the render server — no
/// `CADisplayLink`, no per-frame bridge traffic. The scroll is the clock: at rest nothing
/// advances. Tiles are fx's own generative content; live RN content is never hosted here.
internal struct FxScrollRootView: View {
  @ObservedObject var props: FxScrollProps

  var body: some View {
    ScrollView(props.axis == "horizontal" ? .horizontal : .vertical) {
      stack {
        ForEach(Array(props.tiles.enumerated()), id: \.offset) { _, tile in
          tileContent(for: tile)
            .frame(maxWidth: .infinity)
            .frame(height: tile.height)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .scrollLinked()
        }
      }
      .padding(16)
    }
  }

  // MARK: - Private helpers

  /// Lays tiles along the scroll axis.
  @ViewBuilder
  private func stack<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    if props.axis == "horizontal" {
      LazyHStack(spacing: 16) { content() }
    } else {
      LazyVStack(spacing: 16) { content() }
    }
  }

  /// Renders one fx-owned effect tile. The dispatch mirrors the hosted effect surface; only
  /// the generative effects (a gradient fill or a curated shader) are tileable.
  @ViewBuilder
  private func tileContent(for tile: FxScrollTile) -> some View {
    switch tile.effect {
    case "fill":
      FxFillView(intensity: tile.intensity)
    case "fractal-clouds", "ink-smoke", "liquid-chrome", "loop", "dots",
      "aurora", "noise-field", "plasma", "caustics", "edge-glow":
      FxShaderView(shaderId: tile.effect, intensity: tile.intensity)
    default:
      FxEmptyView()
    }
  }
}

extension View {
  /// Applies SwiftUI's own standard scroll transition — the platform-native default (the law):
  /// a tile fades and scales as it crosses the viewport edges and rests at identity when fully
  /// scrolled in. Below iOS 17 there is no scroll transition, so the tile renders static — the
  /// empty-ladder degradation.
  @ViewBuilder
  fileprivate func scrollLinked() -> some View {
    if #available(iOS 17.0, *) {
      scrollTransition { content, phase in
        content
          .opacity(phase.isIdentity ? 1 : 0)
          .scaleEffect(phase.isIdentity ? 1 : 0.85)
      }
    } else {
      self
    }
  }
}

/// The observable snapshot of `FxScrollView`'s resolved props.
///
/// Mutated only inside `applyResolvedConfig()` on the main actor — once per Expo prop batch,
/// never per frame. `FxScrollRootView` observes it so the hosting controller stays mounted
/// across prop changes.
internal final class FxScrollProps: ObservableObject {
  @Published var axis: String = "vertical"
  @Published var tiles: [FxScrollTile] = []
}
