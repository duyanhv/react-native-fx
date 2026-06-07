import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ShaderId } from '../effects/catalog';

/** How an interactive surface handles touch */
export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';

export type FxEffectPressEvent = { nativeEvent: Record<string, never> };

/**
 * Props the native `FxSurfaceView` accepts. The press events use prefixed names
 * to avoid colliding with React Native's reserved `topPress` event. This is the
 * internal binding shape, not the public surface.
 */
export type NativeFxEffectProps = {
  shader?: ShaderId;
  intensity?: number;
  interactionMode?: InteractionMode;
  onShaderPress?: (event: FxEffectPressEvent) => void;
  onShaderPressIn?: (event: FxEffectPressEvent) => void;
  onShaderPressOut?: (event: FxEffectPressEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Binding to the native interactive shader surface (`FxSurfaceView`, registered
 * by `FxModule` under the module name `ReactNativeFx`). The public `<Fx>`
 * component is built on top of this binding.
 */
export const FxEffectView: ComponentType<NativeFxEffectProps> = requireNativeView('ReactNativeFx');
