import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ShaderId } from '../effects/catalog';

/** Defines how the native surface cooperates with touch input. */
export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';

/** Carries semantic press events emitted by the native shader surface. */
export type FxSurfacePressEvent = { nativeEvent: Record<string, never> };

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
  style?: StyleProp<ViewStyle>;
};

/**
 * Binds to the named native shader surface, keyed by Expo as
 * `ReactNativeFx_FxSurfaceView`.
 */
export const FxSurfaceView: ComponentType<NativeFxSurfaceProps> = requireNativeView(
  'ReactNativeFx',
  'FxSurfaceView'
);
