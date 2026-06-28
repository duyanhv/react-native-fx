import { requireNativeModule } from 'expo';

interface NativeFxCapabilities {
  features?: string[];
}

// Resolved once on first call; the capability set does not change during a session.
let resolved: string[] | undefined;

/**
 * Returns the set of optional-peer features confirmed present by the native module.
 *
 * Read once at import time via module Constants (no async, no RPC). Returns an empty
 * array on web and under the test runner where no native module is available.
 */
export function getCapabilityFeatures(): string[] {
  if (resolved !== undefined) return resolved;
  try {
    const mod = requireNativeModule('ReactNativeFx') as NativeFxCapabilities;
    resolved = Array.isArray(mod.features) ? mod.features : [];
  } catch {
    resolved = [];
  }
  return resolved;
}
