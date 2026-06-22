import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { CURATED_SHADER_IDS, type ShaderId } from './catalog';

/** The manifest node that backs a public effect id. */
export type PublicNodeId = 'fill' | 'material' | 'shader';

/** Maps a public id to the manifest node and the native hosted-dispatch string. */
export type EffectResolution = {
  /** The manifest node `select()` walks. */
  node: PublicNodeId;
  /** The native `effect` string `FxHostedView` dispatches on. */
  hostedEffect: string;
};

/**
 * Every public effect id — the 10 curated shaders plus the named effect surfaces.
 *
 * `symbol` is intentionally absent: a string id must resolve to something native draws with no
 * extra required config, but a symbol needs `SymbolConfig.name`. The symbol string surface is
 * deferred until symbol ids define their own name-resolution rule.
 */
export type EffectId = ShaderId | 'mesh-gradient' | 'glass';

/**
 * Native `effect` strings the hosted dispatch accepts.
 * Fill/material map to their own strings; shaders map to their curated id.
 */
export const HOSTED_NATIVE_EFFECT_STRINGS: ReadonlySet<string> = new Set([
  'fill',
  'material',
  ...CURATED_SHADER_IDS,
]);

/**
 * Maps the `composition` prop to a style fragment.
 *
 * `background` and `overlay` use `absoluteFill`; `surface` is normal document flow.
 * The effect layer positions itself, not content — `<Fx>` draws the visual whole.
 */
export function compositionStyle(
  composition: 'background' | 'overlay' | 'surface' | undefined
): StyleProp<ViewStyle> {
  if (composition === 'background') return [StyleSheet.absoluteFill, { zIndex: -1 }];
  if (composition === 'overlay') return StyleSheet.absoluteFill;
  return undefined;
}

/**
 * Maps a public effect id to the manifest node and native hosted-dispatch string.
 *
 * The single id-to-realization source — `<Fx>` never contains a hand-coded switch
 * that can drift from the manifest.
 */
export function resolveEffect(id: EffectId): EffectResolution {
  switch (id) {
    case 'mesh-gradient':
      return { node: 'fill', hostedEffect: 'fill' };
    case 'glass':
      return { node: 'material', hostedEffect: 'material' };
    default:
      return { node: 'shader', hostedEffect: id };
  }
}
