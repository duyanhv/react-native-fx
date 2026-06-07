import ExpoModulesCore

// TODO: Hosts the glass morph compound surface once grouped material rendering
// is built.
/// Registers the grouped substrate shell for platform-native compound effects.
internal final class FxGroupView: FxNativeView {
  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()
}
