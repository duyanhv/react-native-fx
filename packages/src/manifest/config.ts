import type { MaterialConfig, SymbolConfig } from '../effects/catalog';
import type { manifest } from './manifest';
import type { UniformSpec } from './types';

/**
 * Per-effect typed config, derived from the manifest's `uniforms`/`properties`.
 *
 * The manifest is the canonical declaration of every node's typed inputs; these
 * types are generated from it by the compiler rather than a codegen step, so the
 * config a developer passes and the config the manifest describes cannot drift.
 * The `…Conforms…` assertions below fail the build if a derived config and the
 * hand-written public catalog type (`MaterialConfig`, `SymbolConfig`) disagree.
 */
export type Manifest = typeof manifest;
export type NodeId = keyof Manifest['nodes'];

/** Maps one `UniformSpec` to the TypeScript type a developer sets for it. */
type UniformTSType<U extends UniformSpec> = U['type'] extends 'number'
  ? number
  : U['type'] extends 'string'
    ? string
    : U['type'] extends 'boolean'
      ? boolean
      : U['type'] extends 'color'
        ? string
        : U['type'] extends 'color[]'
          ? readonly string[]
          : U['type'] extends 'vec2'
            ? readonly [number, number]
            : U['type'] extends 'vec4'
              ? readonly [number, number, number, number]
              : U['type'] extends 'enum'
                ? EnumValue<U>
                : never;

/** An `enum` uniform's value is its `options` union; an empty list widens to `string`. */
type EnumValue<U> = U extends { options: readonly (infer O)[] }
  ? [O] extends [never]
    ? string
    : O
  : string;

/** A node's config: every declared uniform/property as an optional, typed channel. */
type ConfigFromSpecs<Specs> = {
  [K in keyof Specs]?: Specs[K] extends UniformSpec ? UniformTSType<Specs[K]> : never;
};

/** The typed config for a node — from its `uniforms`, or a driver's `properties`. */
export type ConfigFor<N extends NodeId> = Manifest['nodes'][N] extends { uniforms: infer U }
  ? ConfigFromSpecs<U>
  : Manifest['nodes'][N] extends { properties: infer P }
    ? ConfigFromSpecs<P>
    : Record<string, never>;

export type FillConfig = ConfigFor<'fill'>;
export type MaterialEffectConfig = ConfigFor<'material'>;
export type ShaderConfig = ConfigFor<'shader'>;
export type FilterConfig = ConfigFor<'filter'>;
export type MotionConfig = ConfigFor<'motion'>;
export type SymbolEffectConfig = ConfigFor<'symbol'>;

// ── conformance: derived config vs the shipped public catalog types ──

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** True only when the derived config and the catalog type share keys and value types. */
type ConfigMatches<Derived, Catalog> =
  Equal<keyof Derived, keyof Catalog> extends true
    ? Derived extends Catalog
      ? Catalog extends Derived
        ? true
        : false
      : false
    : false;

// A build failure here means the manifest and the public catalog type have drifted apart.
export type MaterialConfigConformsToManifest = Expect<
  ConfigMatches<MaterialEffectConfig, Partial<MaterialConfig>>
>;
export type SymbolConfigConformsToManifest = Expect<
  ConfigMatches<SymbolEffectConfig, Partial<SymbolConfig>>
>;
