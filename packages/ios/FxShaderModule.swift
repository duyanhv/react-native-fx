import ExpoModulesCore

public class FxShaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FxShader")

    View(FxShaderView.self) {
      Events("onShaderPress", "onShaderPressIn", "onShaderPressOut")

      Prop("shader") { (view: FxShaderView, value: String) in
        view.setShader(value)
      }
      Prop("intensity") { (view: FxShaderView, value: Double) in
        view.setIntensity(value)
      }
      Prop("interactionMode") { (view: FxShaderView, value: String) in
        view.setInteractionMode(value)
      }

      OnViewDidUpdateProps { (view: FxShaderView) in
        view.applyResolvedConfig()
      }
    }
  }
}
