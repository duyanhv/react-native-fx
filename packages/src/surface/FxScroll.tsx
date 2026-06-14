import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ShaderId } from '../effects/catalog';
import { FxScrollView } from '../runtime/FxScrollView';
import type { ScrollSourceSpec } from '../source/types';

/** One fx-owned generative tile in a hosted scroll context. `intensity` defaults to the
 *  effect's own default; `height` is the row height the tile lays out at. */
export type FxScrollTile = {
  effect: ShaderId | 'fill';
  intensity?: number;
  height?: number;
};

export type FxScrollProps = {
  /** The native source driving the tiles' presentation — `fx.source.scroll({ axis })`. */
  source: ScrollSourceSpec;
  /** The fx-owned effect tiles to scroll. They are fx's own content, never wrapped RN views —
   *  describe them as data, not children. */
  tiles: FxScrollTile[];
  /** Wrapper/placement style — the app owns placement, not fx. */
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_INTENSITY = 0.8;
const DEFAULT_TILE_HEIGHT = 220;

/**
 * The minimal fx-owned hosted scroll context — a SwiftUI `ScrollView` that drives the
 * presentation of its own effect tiles from its native scroll position. On iOS 17+ each tile
 * carries SwiftUI's standard scroll transition (edge fade + scale), computed in the render
 * server with no per-frame JS; below 17 and on Android the tiles render static.
 *
 * This is deliberately not the general JSX compound (`Fx.Stack`): it is the smallest container
 * that gives a per-tile scroll transition a SwiftUI `ScrollView` ancestor. The tiles are fx's
 * own generative content; live RN content cannot be scroll-linked without hosting it, which
 * would sever RN touch.
 */
export function FxScroll({ source, tiles, style }: FxScrollProps): ReactElement {
  const wireTiles = tiles.map((tile) => ({
    effect: tile.effect,
    intensity: tile.intensity ?? DEFAULT_INTENSITY,
    height: tile.height ?? DEFAULT_TILE_HEIGHT,
  }));

  return <FxScrollView axis={source.axis} tiles={wireTiles} style={style} />;
}

/**
 * The fx surface namespace. Provisional home for the hosted scroll context as `Fx.Scroll`
 * until the general `<Fx>` effect surface lands and absorbs it.
 */
export const Fx = {
  Scroll: FxScroll,
} as const;
