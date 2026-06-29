import { requireNativeView } from 'expo';
import type { ReactElement } from 'react';

import type { NativeFxRevealProps } from './FxRevealView.types';

export type { FxRevealTransitionEndEvent, NativeFxRevealProps } from './FxRevealView.types';

const NativeFxRevealView = requireNativeView<NativeFxRevealProps>('ReactNativeFx', 'FxRevealView');

/**
 * Binds to the native anchored-reveal surface, keyed by Expo as `ReactNativeFx_FxRevealView`.
 *
 * The two content slots cross as the view's children in a fixed order — collapsed first, expanded
 * second — which the native side routes into its two fx-owned layers.
 */
export function FxRevealView(props: NativeFxRevealProps): ReactElement {
  return <NativeFxRevealView {...props} />;
}
