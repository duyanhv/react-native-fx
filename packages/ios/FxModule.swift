import ExpoModulesCore

/// Registers the native views exposed by the ReactNativeFx Expo module.
///
/// The first view is Expo's default view and resolves through the bare module
/// name. Additional substrate views resolve through their concrete view names.
public class FxModule: Module {
  /// Defines the module name, view registrations, props, events, and ref functions.
  public func definition() -> ModuleDefinition {
    Name("ReactNativeFx")

    // Registers bring-your-own shader source for runtime compilation. The source crosses once,
    // here; a nil source marks a registered id with no iOS source (silent `{via:'none'}`).
    Function("registerShader") { (id: String, source: String?) in
      FxShaderRegistry.shared.register(id: id, source: source)
    }

    View(FxHostedView.self) {
      Events("onFxTransitionEnd", "onFxLoad", "onFxError")

      Prop("effect") { (view: FxHostedView, value: String) in
        view.setEffect(value)
      }
      Prop("intensity") { (view: FxHostedView, value: Double) in
        view.setIntensity(value)
      }
      Prop("symbolConfig") { (view: FxHostedView, value: SymbolConfig?) in
        view.setSymbolConfig(value)
      }
      Prop("materialConfig") { (view: FxHostedView, value: MaterialConfig?) in
        view.setMaterialConfig(value)
      }

      AsyncFunction("snapshot") { (view: FxHostedView) in
        return view.snapshot()
      }

      OnViewDidUpdateProps { (view: FxHostedView) in
        view.applyResolvedConfig()
      }
    }

    View(FxSurfaceView.self) {
      Events(
        "onShaderPress", "onShaderPressIn", "onShaderPressOut", "onShaderLongPress",
        "onFxTransitionEnd", "onFxLoad", "onFxError")

      Prop("shader") { (view: FxSurfaceView, value: String) in
        view.setShader(value)
      }
      Prop("intensity") { (view: FxSurfaceView, value: Double) in
        view.setIntensity(value)
      }
      Prop("interactionMode") { (view: FxSurfaceView, value: String) in
        view.setInteractionMode(value)
      }
      Prop("contentDistortion") { (view: FxSurfaceView, value: String) in
        view.setContentDistortion(value)
      }
      Prop("visible") { (view: FxSurfaceView, value: Bool) in
        view.setVisible(value)
      }
      Prop("preset") { (view: FxSurfaceView, value: String) in
        view.setPreset(value)
      }
      Prop("presenceMotion") { (view: FxSurfaceView, value: FxPresenceMotion?) in
        view.setPresenceMotion(value)
      }
      Prop("appear") { (view: FxSurfaceView, value: Bool) in
        view.setAppear(value)
      }

      AsyncFunction("snapshot") { (view: FxSurfaceView) in
        return view.snapshot()
      }

      OnViewDidUpdateProps { (view: FxSurfaceView) in
        view.applyResolvedConfig()
      }
    }

    View(FxScrollView.self) {
      Prop("axis") { (view: FxScrollView, value: String) in
        view.setAxis(value)
      }
      Prop("tiles") { (view: FxScrollView, value: [FxScrollTile]) in
        view.setTiles(value)
      }

      AsyncFunction("snapshot") { (view: FxScrollView) in
        return view.snapshot()
      }

      OnViewDidUpdateProps { (view: FxScrollView) in
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
