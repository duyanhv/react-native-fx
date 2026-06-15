import ExpoModulesCore

/// Registers the grouped substrate shell for platform-native compound effects.
internal final class FxGroupView: FxNativeView {
  // TODO: hosts the glass morph compound surface once grouped material rendering is built.

  // MARK: - Events

  internal let onFxTransitionEnd = EventDispatcher()
  internal let onFxLoad = EventDispatcher()
  internal let onFxError = EventDispatcher()
}
