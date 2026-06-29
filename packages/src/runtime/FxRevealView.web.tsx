import type { NativeFxRevealProps } from './FxRevealView.types';

/**
 * Renders nothing on web because fx native presentation surfaces are mobile-only.
 */
export function FxRevealView(_props: NativeFxRevealProps): null {
  return null;
}
