import { requireNativeView } from 'expo';
import { type ComponentType, forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ShaderId } from '../effects/catalog';
import type { PresenceMotionWire } from '../motion/builders';

/** Defines how the native surface cooperates with touch input. */
export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';

/** Carries semantic press events emitted by the native shader surface. */
export type FxSurfacePressEvent = { nativeEvent: Record<string, never> };

/** Carries the shader id (or empty when no shader loaded) for load/error events. */
export type FxSurfaceShaderEvent = { nativeEvent: { shader: string; reason?: string } };

/** Carries the presence/state lifecycle completion the native coordinator emits, per phase. */
export type FxTransitionEndEvent = {
  nativeEvent: {
    owner: 'presence';
    phase: 'enter' | 'exit';
    finished: boolean;
    interrupted: boolean;
  };
};

/**
 * Props the native `FxSurfaceView` accepts.
 *
 * Press events use prefixed names to avoid colliding with React Native's reserved
 * `topPress` event. The presence props (`visible`/`preset`/`presenceMotion`/`appear`) drive the
 * native lifecycle coordinator; the surface component (`FxPresence`) owns their public shape.
 * This binding remains internal to the runtime layer.
 */
export type NativeFxSurfaceProps = {
  shader?: ShaderId;
  intensity?: number;
  interactionMode?: InteractionMode;
  visible?: boolean;
  preset?: string;
  presenceMotion?: PresenceMotionWire;
  appear?: boolean;
  onShaderPress?: (event: FxSurfacePressEvent) => void;
  onShaderPressIn?: (event: FxSurfacePressEvent) => void;
  onShaderPressOut?: (event: FxSurfacePressEvent) => void;
  onFxLoad?: (event: FxSurfaceShaderEvent) => void;
  onFxError?: (event: FxSurfaceShaderEvent) => void;
  onFxTransitionEnd?: (event: FxTransitionEndEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// The native prop accepts the empty-string sentinel that clears the surface; the public
// prop is a curated `ShaderId`. Absent ⟺ empty ⟺ no effect (see the wrapper below).
type NativeProps = Omit<NativeFxSurfaceProps, 'shader'> & { shader: ShaderId | '' };

// `requireNativeView` forwards a ref to the native host but does not type it; the cast adds the
// `ref` slot so the coordinator (presence) can observe host detachment.
const NativeFxSurfaceView = requireNativeView<NativeProps>(
  'ReactNativeFx',
  'FxSurfaceView'
) as ComponentType<NativeProps & { ref?: Ref<unknown> }>;

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
  { shader, ...rest }: NativeFxSurfaceProps,
  ref: Ref<unknown>
): ReactElement {
  return <NativeFxSurfaceView ref={ref} shader={shader ?? ''} {...rest} />;
}

export const FxSurfaceView = forwardRef(FxSurfaceViewInner);
