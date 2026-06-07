import type { NativeFxSurfaceProps } from './FxSurfaceView';

/**
 * Renders nothing on web because fx native presentation surfaces are mobile-only.
 */
export function FxSurfaceView(_props: NativeFxSurfaceProps): null {
  return null;
}
