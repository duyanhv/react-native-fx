import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Props accepted by the grouped substrate binding before compound rendering is built.
 */
export type NativeFxGroupProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Binds to the named native group view, keyed by Expo as `ReactNativeFx_FxGroupView`.
 */
export const FxGroupView: ComponentType<NativeFxGroupProps> = requireNativeView(
  'ReactNativeFx',
  'FxGroupView'
);
