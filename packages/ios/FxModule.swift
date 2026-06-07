import ExpoModulesCore

/// Registers the native views exposed by the ReactNativeFx Expo module.
///
/// The first view is Expo's default view and resolves through the bare module
/// name. Additional substrate views resolve through their concrete view names.
public class FxModule: Module {
  /// Defines the module name, view registrations, props, events, and ref functions.
  public func definition() -> ModuleDefinition {
    Name("ReactNativeFx")

    View(FxHostedView.self) {
      Events("onFxTransitionEnd", "onFxLoad", "onFxError")

      AsyncFunction("snapshot") { (view: FxHostedView) in
        return view.snapshot()
      }

      OnViewDidUpdateProps { (view: FxHostedView) in
        view.applyResolvedConfig()
      }
    }

    View(FxSurfaceView.self) {
      Events("onShaderPress", "onShaderPressIn", "onShaderPressOut", "onFxTransitionEnd", "onFxLoad", "onFxError")

      Prop("shader") { (view: FxSurfaceView, value: String) in
        view.setShader(value)
      }
      Prop("intensity") { (view: FxSurfaceView, value: Double) in
        view.setIntensity(value)
      }
      Prop("interactionMode") { (view: FxSurfaceView, value: String) in
        view.setInteractionMode(value)
      }

      AsyncFunction("snapshot") { (view: FxSurfaceView) in
        return view.snapshot()
      }

      OnViewDidUpdateProps { (view: FxSurfaceView) in
        view.applyResolvedConfig()
      }
    }

    View(FxGroupView.self) {
      Events("onFxTransitionEnd", "onFxLoad", "onFxError")

      AsyncFunction("snapshot") { (view: FxGroupView) in
        return view.snapshot()
      }

      OnViewDidUpdateProps { (view: FxGroupView) in
        view.applyResolvedConfig()
      }
    }
  }
}
