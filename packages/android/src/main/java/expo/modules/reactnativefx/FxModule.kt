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

    // Synchronous capability snapshot read at import time by the JS capabilities module.
    // `lottie` is included when the optional com.airbnb.android:lottie peer is on the classpath.
    Constant("features") {
      detectLottieFeatures()
    }

    // Registers bring-your-own shader source for runtime compilation. The source crosses once,
    // here; a null source marks a registered id with no android source (silent `{via:'none'}`).
    Function("registerShader") { id: String, source: String? ->
      FxShaderRegistry.register(id, source)
    }

    // Registers an app-supplied Lottie JSON for the Android symbol rung. The JSON crosses once,
    // here; per-view only the name crosses (already in symbolConfig). iOS call is a no-op.
    Function("registerSymbol") { name: String, json: String ->
      FxSymbolRegistry.register(name, json)
    }

    View(FxHostedView::class) {
      Events("onFxTransitionEnd", "onFxLoad", "onFxError")

      Prop("effect") { view: FxHostedView, value: String ->
        view.setEffect(value)
      }
      Prop("intensity") { view: FxHostedView, value: Double ->
        view.setIntensity(value)
      }
      Prop("symbolConfig") { view: FxHostedView, value: SymbolConfig? ->
        view.setSymbolConfig(value)
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
      Prop("dragAxis") { view: FxSurfaceView, value: String ->
        view.setDragAxis(value)
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

      AsyncFunction("setUniform") { view: FxSurfaceView, name: String, value: Double? ->
        view.setUniform(name, value)
      }

      AsyncFunction("setHighlight") { view: FxSurfaceView, x: Double, y: Double ->
        view.setHighlight(x, y)
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

    View(FxPressableView::class) {
      Events("onFxPressIn", "onFxPressOut", "onFxPress", "onFxLongPress")

      Prop("feedback") { view: FxPressableView, value: String ->
        view.setFeedback(value)
      }
    }

    View(FxStateView::class) {
      Events("onFxStateChange")

      Prop("state") { view: FxStateView, value: String ->
        view.setState(value)
      }
      Prop("preset") { view: FxStateView, value: String ->
        view.setPreset(value)
      }
      Prop("stateMotion") { view: FxStateView, value: List<FxStateMotionEntry>? ->
        view.setStateMotion(value)
      }

      OnViewDidUpdateProps { view: FxStateView ->
        view.applyResolvedConfig()
      }
    }
  }

  // Resolves the optional Lottie sentinel class once; returns ["lottie"] when present, empty
  // otherwise. Called from Constants so the result is available synchronously at import time.
  // The probe must never crash module load: an absent peer throws ClassNotFoundException, but a
  // half-present or mismatched one can throw a LinkageError — both mean "treat Lottie as absent".
  private fun detectLottieFeatures(): List<String> {
    return try {
      Class.forName("com.airbnb.lottie.LottieComposition")
      listOf("lottie")
    } catch (_: ClassNotFoundException) {
      emptyList()
    } catch (_: LinkageError) {
      emptyList()
    }
  }
}
