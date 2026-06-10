import ExpoModulesCore
import SwiftUI

/// A self-contained glass/material effect for the hosted substrate.
///
/// On iOS 26 the `materialConfig` prop selects the system glass variant and its
/// press response; intensity has no effect on that path. On earlier iOS,
/// intensity selects `.ultraThinMaterial` / `.thinMaterial` / `.regularMaterial`
/// to vary perceived material weight.
internal struct FxMaterialView: View {
  let intensity: Double
  let materialConfig: MaterialConfig?

  var body: some View {
    if #available(iOS 26.0, *) {
      Rectangle()
        .glassEffect(resolvedGlass)
    } else {
      Rectangle()
        .fill(materialForIntensity)
    }
  }

  @available(iOS 26.0, *)
  private var resolvedGlass: Glass {
    let glass: Glass
    switch materialConfig?.variant {
    case "clear":
      glass = .clear
    default:
      glass = .regular
    }
    return glass.interactive(materialConfig?.interactive ?? false)
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

/// The structured configuration for the material effect's glass rung.
///
/// Carried as a Record across the Expo bridge; each property uses `@Field` so the bridge
/// converts JS values correctly. `variant` carries the platform-agnostic vocabulary
/// (`regular`/`clear`); unknown values fall back to the regular glass.
struct MaterialConfig: Record {
  @Field var variant: String = "regular"
  @Field var interactive: Bool = false
}
