import type { NativeFxHostedProps } from './FxHostedView';

/**
 * Renders nothing on web because fx native presentation surfaces are mobile-only.
 */
export function FxHostedView(_props: NativeFxHostedProps): null {
  return null;
}
