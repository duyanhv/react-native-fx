import SwiftUI

/// The persistent SwiftUI root for the hosted substrate's decorative effects.
///
/// `FxHostedView` mounts this view once inside a long-lived `UIHostingController` and
/// thereafter mutates the observed `FxHostedProps` holder per prop batch. SwiftUI diffs
/// each change into the live tree, so switching effects replaces a branch of this body —
/// never the hosting controller — and in-flight symbol-effect state or the shader clock
/// survives an unrelated prop change. A symbol config wins over `effect` when both are set.
internal struct FxHostedRootView: View {
  @ObservedObject var props: FxHostedProps

  var body: some View {
    if let symbolConfig = props.symbolConfig {
      FxSymbolView(symbolConfig: symbolConfig)
    } else if let effect = props.effect {
      effectView(for: effect)
    } else {
      FxEmptyView()
    }
  }

  // MARK: - Private helpers

  @ViewBuilder
  private func effectView(for effect: String) -> some View {
    switch effect {
    case "fill":
      FxFillView(intensity: props.intensity)
    case "material":
      // On iOS 26 the material effect mounts FxGlassSurfaceView on the UIKit path and
      // never reaches this dispatch; this case is the below-26 fallback.
      FxMaterialView(intensity: props.intensity)
    case "fractal-clouds", "ink-smoke", "liquid-chrome", "loop", "dots",
      "aurora", "noise-field", "plasma", "caustics", "edge-glow":
      FxShaderView(shaderId: effect, intensity: props.intensity)
    default:
      FxEmptyView()
    }
  }
}

/// The observable snapshot of `FxHostedView`'s resolved props.
///
/// Mutated only inside `applyResolvedConfig()` on the main actor — once per Expo prop
/// batch, never per frame. `FxHostedRootView` observes it so the hosting controller can
/// stay mounted across prop changes.
internal final class FxHostedProps: ObservableObject {
  @Published var effect: String?
  @Published var intensity: Double = 0.8
  @Published var symbolConfig: SymbolConfig?
  @Published var materialConfig: MaterialConfig?
}

/// An inert placeholder for unknown effect ids.
internal struct FxEmptyView: View {
  var body: some View {
    Color.clear
  }
}
