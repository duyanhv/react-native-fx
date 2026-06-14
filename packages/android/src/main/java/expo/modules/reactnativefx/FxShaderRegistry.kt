package expo.modules.reactnativefx

/**
 * Process-wide registry of bring-your-own shader source pushed from JS via `registerShader`.
 *
 * The source crosses the bridge once at registration; the compiled [android.graphics.RuntimeShader]
 * and the frame loop stay native. A registered id whose stored source is null marks a shader with
 * no android source — it degrades to `{via:'none'}` silently, which [isRegistered] keeps distinct
 * from an unknown id (no entry at all). Registration runs on the JS thread while the surfaces read
 * on the UI thread, so access is synchronized.
 */
internal object FxShaderRegistry {
  // id -> AGSL source; null marks a registered id with no android source.
  private val sources = HashMap<String, String?>()

  /** Stores (or replaces) a registered id's source. */
  @Synchronized
  fun register(id: String, source: String?) {
    sources[id] = source
  }

  /** True once an id has been registered, even with a null (source-less) entry. */
  @Synchronized
  fun isRegistered(id: String): Boolean = sources.containsKey(id)

  /** The AGSL source for a registered id, or null when the id is unknown or source-less. */
  @Synchronized
  fun source(id: String): String? = sources[id]
}
