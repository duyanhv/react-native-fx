import { requireNativeView } from 'expo';
import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Props accepted by the grouped substrate native view. */
export type NativeFxGroupProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Binds to the named native group view, keyed by Expo as `ReactNativeFx_FxGroupView`.
 */
export const FxGroupView: ComponentType<NativeFxGroupProps> = requireNativeView(
  'ReactNativeFx',
  'FxGroupView'
);
