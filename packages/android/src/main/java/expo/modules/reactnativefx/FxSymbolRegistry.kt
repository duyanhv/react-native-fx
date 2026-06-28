package expo.modules.reactnativefx

/**
 * Process-wide registry of app-supplied Lottie JSON pushed from JS via `registerSymbol`.
 *
 * The JSON crosses the bridge once at registration; the Lottie composition and the frame loop
 * stay native. Access is synchronized because registration runs on the JS thread while
 * [FxSymbolView] reads on the UI thread.
 */
internal object FxSymbolRegistry {
  // name -> Lottie JSON string
  private val sources = HashMap<String, String>()

  /** Stores (or replaces) a registered name's Lottie JSON. */
  @Synchronized
  fun register(name: String, json: String) {
    sources[name] = json
  }

  /** True once a name has been registered. */
  @Synchronized
  fun isRegistered(name: String): Boolean = sources.containsKey(name)

  /** The Lottie JSON for a registered name, or null when the name is unknown. */
  @Synchronized
  fun source(name: String): String? = sources[name]
}
