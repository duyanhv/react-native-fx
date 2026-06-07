package expo.modules.reactnativefx

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The Android peer of the iOS FxModule. The name `ReactNativeFx` is the
// autolinking and `requireNativeView` identity, shared with iOS.
//
// Scaffolding: the Android skeleton. The base view, substrate views, renderers,
// and curated .agsl assets are added as the boundary is built out.
class FxModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeFx")
  }
}
