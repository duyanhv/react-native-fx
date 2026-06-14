import type { NativeFxScrollProps } from './FxScrollView';

/**
 * Renders nothing on web because fx native presentation surfaces are mobile-only.
 */
export function FxScrollView(_props: NativeFxScrollProps): null {
  return null;
}
