package expo.modules.reactnativefx

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Registers the Android views exposed by the ReactNativeFx Expo module.
 *
 * The first view is Expo's default view and resolves through the bare module
 * name. Additional substrate views resolve through their concrete view names.
 */
class FxModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeFx")

    // Registers bring-your-own shader source for runtime compilation. The source crosses once,
    // here; a null source marks a registered id with no android source (silent `{via:'none'}`).
    Function("registerShader") { id: String, source: String? ->
      FxShaderRegistry.register(id, source)
    }

    View(FxHostedView::class) {
      Events("onFxTransitionEnd", "onFxLoad", "onFxError")

      Prop("effect") { view: FxHostedView, value: String ->
        view.setEffect(value)
      }
      Prop("intensity") { view: FxHostedView, value: Double ->
        view.setIntensity(value)
      }
      Prop("materialConfig") { view: FxHostedView, value: MaterialConfig? ->
        view.setMaterialConfig(value)
      }

      AsyncFunction("snapshot") { view: FxHostedView ->
        return@AsyncFunction view.snapshot()
      }

      OnViewDidUpdateProps { view: FxHostedView ->
        view.applyResolvedConfig()
      }
    }

    View(FxSurfaceView::class) {
      Events(
        "onShaderPress",
        "onShaderPressIn",
        "onShaderPressOut",
        "onShaderLongPress",
        "onFxTransitionEnd",
        "onFxLoad",
        "onFxError"
      )

      Prop("shader") { view: FxSurfaceView, value: String ->
        view.setShader(value)
      }
      Prop("intensity") { view: FxSurfaceView, value: Double ->
        view.setIntensity(value)
      }
      Prop("interactionMode") { view: FxSurfaceView, value: String ->
        view.setInteractionMode(value)
      }
      Prop("contentDistortion") { view: FxSurfaceView, value: String ->
        view.setContentDistortion(value)
      }
      Prop("visible") { view: FxSurfaceView, value: Boolean ->
        view.setVisible(value)
      }
      Prop("preset") { view: FxSurfaceView, value: String ->
        view.setPreset(value)
      }
      Prop("presenceMotion") { view: FxSurfaceView, value: FxPresenceMotion? ->
        view.setPresenceMotion(value)
      }
      Prop("appear") { view: FxSurfaceView, value: Boolean ->
        view.setAppear(value)
      }

      AsyncFunction("snapshot") { view: FxSurfaceView ->
        return@AsyncFunction view.snapshot()
      }

      OnViewDidUpdateProps { view: FxSurfaceView ->
        view.applyResolvedConfig()
      }
    }

    View(FxGroupView::class) {
      Events("onFxTransitionEnd", "onFxLoad", "onFxError")

      AsyncFunction("snapshot") { view: FxGroupView ->
        return@AsyncFunction view.snapshot()
      }

      OnViewDidUpdateProps { view: FxGroupView ->
        view.applyResolvedConfig()
      }
    }
  }
}
