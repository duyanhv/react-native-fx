import { requireNativeView } from 'expo';
import { type ComponentType, forwardRef, type ReactElement, type Ref } from 'react';

import type { FxSurfaceViewRef, NativeFxSurfaceProps } from './FxSurfaceView.types';

export type {
  FxSurfacePressEvent,
  FxSurfaceShaderEvent,
  FxSurfaceViewRef,
  FxTransitionEndEvent,
  InteractionMode,
  NativeFxSurfaceProps,
} from './FxSurfaceView.types';

// The native props accept the empty-string sentinel that clears: the public props are absent or a
// concrete value, but Expo omits an `undefined` prop, so a once-set value could never be cleared
// (the previous value would stick). Coercing absent → `''` keeps every batch carrying the prop.
type NativeProps = Omit<NativeFxSurfaceProps, 'shader' | 'contentDistortion'> & {
  shader: string | '';
  contentDistortion: 'ripple' | '';
};

// `requireNativeView` forwards a ref to the native host but does not type it; the cast adds the
// `ref` slot so the coordinator (presence) can observe host detachment.
const NativeFxSurfaceView = requireNativeView<NativeProps>(
  'ReactNativeFx',
  'FxSurfaceView'
) as ComponentType<NativeProps & { ref?: Ref<FxSurfaceViewRef> }>;

/**
 * Binds to the named native shader surface, keyed by Expo as
 * `ReactNativeFx_FxSurfaceView`.
 *
 * `shader` is coerced to a concrete value (`''` when absent) so the prop is always
 * present in the batch. Expo omits an `undefined` prop, so without this an effect
 * could never be cleared back to none — the previously set shader would stick. The ref is
 * forwarded to the native host so a coordinator (presence) can detect host detachment.
 */
function FxSurfaceViewInner(
  { shader, contentDistortion, ...rest }: NativeFxSurfaceProps,
  ref: Ref<FxSurfaceViewRef>
): ReactElement {
  return (
    <NativeFxSurfaceView
      ref={ref}
      shader={shader ?? ''}
      contentDistortion={contentDistortion ?? ''}
      {...rest}
    />
  );
}

export const FxSurfaceView = forwardRef(FxSurfaceViewInner);
