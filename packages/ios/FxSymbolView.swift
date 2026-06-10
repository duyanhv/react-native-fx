import ExpoModulesCore
import SwiftUI

/// A self-contained animated SF Symbol for the hosted substrate.
///
/// Renders via `Image(systemName:)` with `.symbolEffect` on iOS 17+.
/// The `symbolConfig` prop carries `{ name, animation, trigger, replaceWith }` as a structured
/// record; the native side never parses strings. `.contentTransition(.symbolEffect(.automatic))`
/// handles symbol-to-symbol transitions.
///
/// Discrete animations (bounce, pulse, scale, appear, disappear) fire once on mount.
/// Indefinite animations (variableColor, breathe, rotate, wiggle) play while `trigger` is
/// `state` or `repeat`.
///
/// iOS 18-only effects (breathe, rotate, wiggle) degrade to a plain symbol on iOS 17.
/// Below iOS 17 degrades to `Color.clear`.
internal struct FxSymbolView: View {
  let symbolConfig: SymbolConfig

  var body: some View {
    if #available(iOS 17.0, *) {
      body17
    } else {
      Color.clear
    }
  }

  @available(iOS 17.0, *)
  @ViewBuilder
  private var body17: some View {
    if symbolConfig.name.isEmpty {
      Color.clear
    } else {
      let image = Image(systemName: symbolConfig.name)
        .resizable()
        .aspectRatio(contentMode: .fit)

      animatedImage(image)
        .when(symbolConfig.replaceWith != nil) { view in
          view.contentTransition(.symbolEffect(.automatic))
        }
    }
  }

  @available(iOS 17.0, *)
  @ViewBuilder
  private func animatedImage(_ image: some View) -> some View {
    let trigger = symbolConfig.trigger
    let isActive = trigger == "state" || trigger == "repeat"
    let isRepeat = trigger == "repeat"

    switch symbolConfig.animation {
    case "bounce":
      if isRepeat {
        image.symbolEffect(.bounce, options: .repeating)
      } else {
        image.symbolEffect(.bounce)
      }
    case "pulse":
      if isRepeat {
        image.symbolEffect(.pulse, options: .repeating)
      } else {
        image.symbolEffect(.pulse)
      }
    case "scale":
      image.symbolEffect(.scale)
    case "appear":
      image.symbolEffect(.appear)
    case "disappear":
      image.symbolEffect(.disappear)
    case "variableColor":
      if isRepeat {
        image.symbolEffect(.variableColor, options: .repeating, isActive: true)
      } else {
        image.symbolEffect(.variableColor, isActive: isActive)
      }
    case "breathe":
      if #available(iOS 18.0, *) {
        if isRepeat {
          image.symbolEffect(.breathe, options: .repeating, isActive: true)
        } else {
          image.symbolEffect(.breathe, isActive: isActive)
        }
      } else {
        image
      }
    case "rotate":
      if #available(iOS 18.0, *) {
        if isRepeat {
          image.symbolEffect(.rotate, options: .repeating, isActive: true)
        } else {
          image.symbolEffect(.rotate, isActive: isActive)
        }
      } else {
        image
      }
    case "wiggle":
      if #available(iOS 18.0, *) {
        if isRepeat {
          image.symbolEffect(.wiggle, options: .repeating, isActive: true)
        } else {
          image.symbolEffect(.wiggle, isActive: isActive)
        }
      } else {
        image
      }
    default:
      image
    }
  }
}

/// The structured configuration for a symbol effect.
///
/// Carried as a Record across the Expo bridge; each property uses `@Field` so the bridge
/// converts JS values correctly. The native side never string-parses effect ids.
struct SymbolConfig: Record {
  @Field var name: String = ""
  @Field var animation: String = "bounce"
  @Field var trigger: String? = nil
  @Field var replaceWith: String? = nil
}

/// Conditional view modifier helper for chaining.
extension View {
  @ViewBuilder
  fileprivate func when<Content: View>(_ condition: Bool, apply: (Self) -> Content) -> some View {
    if condition {
      apply(self)
    } else {
      self
    }
  }
}
