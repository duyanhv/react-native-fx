import { requireNativeView } from 'expo';
import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { StateMotionWire } from '../motion/builders';

/** The payload that arrives on the native `onFxStateChange` event. */
export type FxStateChangeEvent = {
  nativeEvent: {
    state: string;
    finished: boolean;
    interrupted: boolean;
  };
};

/** Props the native `FxStateView` accepts. The public shape lives in `FxView.tsx`. */
export type NativeFxStateProps = {
  state: string;
  preset?: string;
  stateMotion?: StateMotionWire;
  onFxStateChange?: (event: FxStateChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Binds to the native state-driven content host, keyed by Expo as
 * `ReactNativeFx_FxStateView`.
 */
export const NativeFxStateView = requireNativeView<NativeFxStateProps>(
  'ReactNativeFx',
  'FxStateView'
) as ComponentType<NativeFxStateProps>;
