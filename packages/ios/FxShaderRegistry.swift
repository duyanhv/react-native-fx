import Foundation

/// Process-wide registry of bring-your-own shader source pushed from JS via `registerShader`.
///
/// The source crosses the bridge once at registration; the compiled pipeline and the frame loop
/// stay native. A registered id whose stored source is nil marks a shader with no iOS source — it
/// degrades to `{via:'none'}` silently, which `isRegistered` distinguishes from an unknown id (an
/// unknown id has no entry at all and surfaces as an error). Access is locked because registration
/// runs on the JS thread while the surfaces read on the main thread.
internal final class FxShaderRegistry {
  internal static let shared = FxShaderRegistry()

  private var sources: [String: String?] = [:]
  private let lock = NSLock()

  /// Stores (or replaces) a registered id's source. A nil source records a registered id with no
  /// iOS source, kept distinct from an absent key.
  internal func register(id: String, source: String?) {
    lock.lock()
    defer { lock.unlock() }
    sources[id] = source
  }

  /// True once an id has been registered, even with a nil (source-less) entry.
  internal func isRegistered(id: String) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return sources.index(forKey: id) != nil
  }

  /// The MSL source for a registered id, or nil when the id is unknown or registered without an
  /// iOS source.
  internal func source(for id: String) -> String? {
    lock.lock()
    defer { lock.unlock() }
    return sources[id] ?? nil
  }
}
