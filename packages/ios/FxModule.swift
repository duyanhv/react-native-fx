import ExpoModulesCore

// The single Expo module for react-native-fx. The name `ReactNativeFx` is the
// autolinking and `requireNativeView` identity, shared with the Android module.
//
// Scaffolding: registers the interactive shader surface only. The shared base
// view and the remaining substrate views are added as the boundary is built out.
public class FxModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeFx")

    View(FxSurfaceView.self) {
      Events("onShaderPress", "onShaderPressIn", "onShaderPressOut")

      Prop("shader") { (view: FxSurfaceView, value: String) in
        view.setShader(value)
      }
      Prop("intensity") { (view: FxSurfaceView, value: Double) in
        view.setIntensity(value)
      }
      Prop("interactionMode") { (view: FxSurfaceView, value: String) in
        view.setInteractionMode(value)
      }

      OnViewDidUpdateProps { (view: FxSurfaceView) in
        view.applyResolvedConfig()
      }
    }
  }
}
