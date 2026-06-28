import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * The argument to {@link registerSymbol}: a cross-platform semantic name and an Android
 * Lottie JSON payload. The `type` discriminant reserves room for a future `'avd'` rung;
 * only `'lottie'` is accepted now.
 *
 * The JSON crosses the bridge once at registration via {@link registerSymbol}; per-view,
 * only `name` crosses (already in `symbolConfig`). iOS registration is a no-op — SF
 * Symbols serve the iOS role.
 */
export type RegisterSymbolSpec = {
  name: string;
  android: { type: 'lottie'; source: object };
};

interface RegisteredSymbol {
  name: string;
  sourceJson: string;
}

interface FxNativeModule {
  registerSymbol(name: string, json: string): void;
}

const registry = new Map<string, RegisteredSymbol>();

// Resolved once and memoized; absent on web and under the test runner.
let nativeModule: FxNativeModule | null | undefined;
function getNativeModule(): FxNativeModule | null {
  if (nativeModule === undefined) {
    try {
      nativeModule = requireNativeModule('ReactNativeFx') as FxNativeModule;
    } catch {
      nativeModule = null;
    }
  }
  return nativeModule;
}

/**
 * Registers an app-supplied Lottie animation by name for the Android symbol rung.
 *
 * The JSON crosses the bridge once here, keyed by name; per-view, only the name string
 * crosses (it is already in `symbolConfig`). iOS registration is a safe no-op — the
 * Android-only native registry ignores the call; iOS symbols remain SF Symbols.
 *
 * Guards: empty name is rejected with a dev warning. Missing android payload is rejected
 * with a dev warning. Re-registration with identical JSON is an idempotent no-op; a new
 * JSON for an existing name replaces it (the next mount picks it up).
 */
export function registerSymbol(spec: RegisterSymbolSpec): void {
  if (!spec.name) {
    console.warn('[react-native-fx] registerSymbol: name is required.');
    return;
  }
  if (!spec.android?.source) {
    console.warn(
      `[react-native-fx] registerSymbol: "${spec.name}" has no android source; nothing to register.`
    );
    return;
  }

  const newJson = JSON.stringify(spec.android.source);
  const existing = registry.get(spec.name);
  if (existing && existing.sourceJson === newJson) {
    return;
  }

  registry.set(spec.name, { name: spec.name, sourceJson: newJson });

  // Only push to native on Android; iOS registration is a no-op at the native level.
  if (Platform.OS === 'android') {
    getNativeModule()?.registerSymbol(spec.name, newJson);
  }
}

/** Reports whether a name has been registered via {@link registerSymbol}. */
export function isRegisteredSymbol(name: string): boolean {
  return registry.has(name);
}

/** The registered symbol names, in registration order. For diagnostics and tests. */
export function registeredSymbolNames(): string[] {
  return [...registry.keys()];
}
