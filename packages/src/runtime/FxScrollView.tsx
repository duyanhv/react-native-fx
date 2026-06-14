import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ScrollAxis } from '../source/types';

/** One fx-owned effect tile as it crosses the bridge: which effect to draw, its intensity, and
 *  the row height the hosted `ScrollView` lays it out at. */
export type FxScrollTileWire = {
  effect: string;
  intensity: number;
  height: number;
};

/**
 * Props the native `FxScrollView` accepts.
 *
 * The hosted SwiftUI `ScrollView` reads its own scroll position and applies the per-tile
 * scroll transition in the render server; `axis` and the fx-owned `tiles` cross once per
 * change, never per frame. The surface component (`Fx.Scroll`) owns the public shape.
 */
export type NativeFxScrollProps = {
  axis?: ScrollAxis;
  tiles?: FxScrollTileWire[];
  style?: StyleProp<ViewStyle>;
};

/**
 * Binds to the named native hosted scroll surface, keyed by Expo as
 * `ReactNativeFx_FxScrollView`. Registered on iOS only — Android and web resolve the
 * degraded static fallback through the platform-specific files alongside this one.
 */
export const FxScrollView: ComponentType<NativeFxScrollProps> = requireNativeView(
  'ReactNativeFx',
  'FxScrollView'
);
