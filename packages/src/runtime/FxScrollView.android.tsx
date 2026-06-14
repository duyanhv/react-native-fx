import type { ReactElement } from 'react';
import { ScrollView } from 'react-native';

import { FxHostedView } from './FxHostedView';
import type { NativeFxScrollProps } from './FxScrollView';

/**
 * The degraded static fallback for the source rung's empty Android ladder ({via:'none'}).
 *
 * Android has no render-server scroll-linked tier yet (a separate later rung), so the tiles
 * render as plain hosted effects inside a native scroll container — content shows, but its
 * appearance does not animate with scroll. Horizontal axis flips the scroll direction.
 */
export function FxScrollView({
  axis = 'vertical',
  tiles = [],
  style,
}: NativeFxScrollProps): ReactElement {
  return (
    <ScrollView horizontal={axis === 'horizontal'} style={style}>
      {tiles.map((tile, index) => (
        <FxHostedView
          // biome-ignore lint/suspicious/noArrayIndexKey: the fallback tile list is fixed and never reorders
          key={index}
          effect={tile.effect}
          intensity={tile.intensity}
          style={{ height: tile.height }}
        />
      ))}
    </ScrollView>
  );
}
