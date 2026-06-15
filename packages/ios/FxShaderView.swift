import SwiftUI

/// Renders a curated shader through the hosted `.colorEffect` / `ShaderLibrary`
/// path on iOS 17+.
///
/// The `[[stitchable]]` functions live in the fx pod's
/// `FxShaders.bundle/default.metallib` — the library is resolved against
/// that bundle using the same search list `FxSurfaceView` uses, never
/// `ShaderLibrary.default`. `TimelineView(.animation)` injects the native
/// clock; the absolute date is wrapped to a 100 s window so Float32 retains
/// per-frame precision. pressDepth and touch stay idle defaults on the
/// decorative path.
internal struct FxShaderView: View {
  let shaderId: String
  let intensity: Double

  /// Resolves the fx pod's `FxShaders.bundle/default.metallib` so
  /// `ShaderLibrary` can find the `fx_stitchable_*` functions.
  @available(iOS 17.0, *)
  private static let fxShaderLibrary: ShaderLibrary = {
    let host = Bundle(for: FxHostedView.self)
    let bases = [host.resourceURL, Bundle.main.resourceURL, host.bundleURL, Bundle.main.bundleURL]
    for base in bases.compactMap({ $0 }) {
      let url =
        base
        .appendingPathComponent("FxShaders.bundle")
        .appendingPathComponent("default.metallib")
      if FileManager.default.fileExists(atPath: url.path) {
        return ShaderLibrary(url: url)
      }
    }
    return ShaderLibrary.default
  }()

  var body: some View {
    if #available(iOS 17.0, *) {
      TimelineView(.animation) { timeline in
        let rawTime = timeline.date.timeIntervalSinceReferenceDate
        let time = Float(rawTime.truncatingRemainder(dividingBy: 100.0))
        GeometryReader { proxy in
          let resolution = proxy.size
          if let shader = shaderFor(id: shaderId, time: time, resolution: resolution) {
            Rectangle()
              .colorEffect(shader)
          } else {
            Color.clear
          }
        }
      }
    } else {
      Color.clear
    }
  }

  @available(iOS 17.0, *)
  private func shaderFor(id: String, time: Float, resolution: CGSize) -> Shader? {
    guard let name = mslFunctionName(for: id) else { return nil }
    return FxShaderView.fxShaderLibrary[dynamicMember: name](
      .float(time),
      .float2(
        Float(resolution.width),
        Float(resolution.height)),
      .float(Float(intensity)),
      .float(0),
      .float2(0.5, 0.5))
  }
}

/// Maps the public agnostic shader id to its `[[stitchable]]` MSL function name, or nil for an
/// unknown id — which fails closed (renders nothing) rather than silently showing a wrong shader.
private func mslFunctionName(for id: String) -> String? {
  switch id {
  case "fractal-clouds": return "fx_stitchable_fractal_clouds"
  case "ink-smoke": return "fx_stitchable_ink_smoke"
  case "liquid-chrome": return "fx_stitchable_liquid_chrome"
  case "loop": return "fx_stitchable_loop"
  case "dots": return "fx_stitchable_dots"
  case "aurora": return "fx_stitchable_aurora"
  case "noise-field": return "fx_stitchable_noise_field"
  case "plasma": return "fx_stitchable_plasma"
  case "caustics": return "fx_stitchable_caustics"
  case "edge-glow": return "fx_stitchable_edge_glow"
  default: return nil
  }
}
