import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Props accepted by the hosted substrate binding.
 */
export type NativeFxHostedProps = {
  effect?: string;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Binds to the first-registered native view, keyed by Expo under `ReactNativeFx`.
 */
export const FxHostedView: ComponentType<NativeFxHostedProps> = requireNativeView('ReactNativeFx');
