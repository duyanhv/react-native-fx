import ExpoModulesCore

// TODO: Hosts the platform-native decorative rendering surface once the hosted
// effect renderer is built.
/// Registers the hosted substrate as the module's default native view.
internal final class FxHostedView: FxNativeView {
  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()
}
