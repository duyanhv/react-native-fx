import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { MaterialConfig, SymbolConfig } from '../effects/catalog';
import type { FxSurfaceShaderEvent } from './FxSurfaceView.types';

/**
 * Props accepted by the hosted substrate binding.
 */
export type NativeFxHostedProps = {
  effect?: string;
  intensity?: number;
  symbolConfig?: SymbolConfig;
  materialConfig?: MaterialConfig;
  /** Fired when the symbol asset is not registered (missing-asset degradation). */
  onFxError?: (e: FxSurfaceShaderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Binds to the first-registered native view, keyed by Expo under `ReactNativeFx`.
 */
export const FxHostedView: ComponentType<NativeFxHostedProps> = requireNativeView('ReactNativeFx');
