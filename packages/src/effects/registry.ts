import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

import type { UniformSpec } from '../manifest/types';
import { CURATED_SHADER_IDS } from './catalog';

/**
 * A bring-your-own shader's inline source, one entry per platform. A platform whose
 * source is absent degrades to `{via:'none'}` on that platform (the pair rule); fx does
 * not author the missing language — single-source authoring is the deferred cross-compiler.
 */
export type ShaderSource = {
  /** Metal Shading Language. The author defines `fx_fragment` against the fx raster ABI. */
  ios?: string;
  /** AGSL. The author defines `half4 main(float2 fragCoord)` and declares the uniforms it uses. */
  android?: string;
};

/**
 * The argument to {@link registerShader}: a bring-your-own shader id, an optional uniform
 * declaration table, and the inline per-platform source. The `id` is consumed at the same call
 * site as a curated id — `<FxSurfaceView shader="id" />` — never as a `source` prop.
 */
export interface RegisterShaderSpec {
  id: string;
  /**
   * Declares the shader's semantic uniforms. V1 wires only `intensity` (as curated shaders do);
   * the table is retained for the registration contract and forward use.
   */
  uniforms?: Record<string, UniformSpec>;
  source: ShaderSource;
}

interface RegisteredShader {
  id: string;
  uniforms?: Record<string, UniformSpec>;
  source: ShaderSource;
}

interface FxNativeModule {
  registerShader(id: string, source: string | null): void;
}

const registry = new Map<string, RegisteredShader>();
const curatedIds = new Set<string>(CURATED_SHADER_IDS);

// Resolved once and memoized. Absent on web and under the test runner, where there is no native
// module to compile against; registration there is a JS-registry-only no-op on the native side.
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

function platformSource(source: ShaderSource): string | undefined {
  return Platform.OS === 'ios' ? source.ios : source.android;
}

// The current platform's source decides whether this platform compiles or degrades to
// {via:'none'}. The id is always pushed (even with a null source) so native can tell a
// registered-but-source-less id — silent degradation — from an unknown id, which errors.
function pushToNative(id: string, source: ShaderSource): void {
  getNativeModule()?.registerShader(id, platformSource(source) ?? null);
}

/**
 * Registers a bring-your-own shader with inline source for runtime compilation. The shader is
 * consumed at the same call site as a curated id (`<FxSurfaceView shader="id" />`); the source
 * crosses the bridge once here, never per frame, and the compiled artifact and frame loop stay
 * native.
 *
 * Collision: a registered id that matches a curated id is rejected with a dev warning — the
 * curated id wins. Pair rule: an id registered with only one platform's source renders there and
 * degrades to `{via:'none'}` on the other. Re-registration: a new source for an existing id is a
 * clean dev-time replacement (the next mount compiles it); identical source is an idempotent
 * no-op. Both-absent source is rejected with a dev warning (nothing to register).
 */
export function registerShader(spec: RegisterShaderSpec): void {
  if (curatedIds.has(spec.id)) {
    console.warn(
      `[react-native-fx] registerShader: "${spec.id}" collides with a curated shader id; the curated shader wins and the registration is ignored.`
    );
    return;
  }
  if (!spec.source || (!spec.source.ios && !spec.source.android)) {
    console.warn(
      `[react-native-fx] registerShader: "${spec.id}" has no ios or android source; nothing to register.`
    );
    return;
  }

  const existing = registry.get(spec.id);
  if (
    existing &&
    existing.source.ios === spec.source.ios &&
    existing.source.android === spec.source.android
  ) {
    return;
  }

  registry.set(spec.id, { id: spec.id, uniforms: spec.uniforms, source: spec.source });
  pushToNative(spec.id, spec.source);
}

/** Reports whether an id has been registered as a bring-your-own runtime shader. */
export function isRegisteredShader(id: string): boolean {
  return registry.has(id);
}

/** The registered bring-your-own shader ids, in registration order. For diagnostics and tests. */
export function registeredShaderIds(): string[] {
  return [...registry.keys()];
}
