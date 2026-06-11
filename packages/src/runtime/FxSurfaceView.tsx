import { requireNativeView } from 'expo';
import type { ReactElement, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ShaderId } from '../effects/catalog';

/** Defines how the native surface cooperates with touch input. */
export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';

/** Carries semantic press events emitted by the native shader surface. */
export type FxSurfacePressEvent = { nativeEvent: Record<string, never> };

/** Carries the shader id (or empty when no shader loaded) for load/error events. */
export type FxSurfaceShaderEvent = { nativeEvent: { shader: string; reason?: string } };

/**
 * Props the native `FxSurfaceView` accepts.
 *
 * Press events use prefixed names to avoid colliding with React Native's reserved
 * `topPress` event. This binding remains internal to the runtime layer.
 */
export type NativeFxSurfaceProps = {
  shader?: ShaderId;
  intensity?: number;
  interactionMode?: InteractionMode;
  onShaderPress?: (event: FxSurfacePressEvent) => void;
  onShaderPressIn?: (event: FxSurfacePressEvent) => void;
  onShaderPressOut?: (event: FxSurfacePressEvent) => void;
  onFxLoad?: (event: FxSurfaceShaderEvent) => void;
  onFxError?: (event: FxSurfaceShaderEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// The native prop accepts the empty-string sentinel that clears the surface; the public
// prop is a curated `ShaderId`. Absent ⟺ empty ⟺ no effect (see the wrapper below).
type NativeProps = Omit<NativeFxSurfaceProps, 'shader'> & { shader: ShaderId | '' };

const NativeFxSurfaceView = requireNativeView<NativeProps>('ReactNativeFx', 'FxSurfaceView');

/**
 * Binds to the named native shader surface, keyed by Expo as
 * `ReactNativeFx_FxSurfaceView`.
 *
 * `shader` is coerced to a concrete value (`''` when absent) so the prop is always
 * present in the batch. Expo omits an `undefined` prop, so without this an effect
 * could never be cleared back to none — the previously set shader would stick.
 */
export function FxSurfaceView({ shader, ...rest }: NativeFxSurfaceProps): ReactElement {
  return <NativeFxSurfaceView shader={shader ?? ''} {...rest} />;
}
