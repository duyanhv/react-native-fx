import { requireNativeView } from 'expo';
import { type ComponentType, forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ShaderId } from '../effects/catalog';
import type { PresenceMotionWire } from '../motion/builders';

/** Defines how the native surface cooperates with touch input. */
export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';

/** Carries semantic press events emitted by the native shader surface. */
export type FxSurfacePressEvent = { nativeEvent: { x: number; y: number } };

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
  // `ShaderId` keeps autocomplete for curated effects; `string & {}` admits a registered
  // bring-your-own id (`registerShader`) at the same call site without widening to plain `string`.
  shader?: ShaderId | (string & {});
  intensity?: number;
  interactionMode?: InteractionMode;
  // A draw-time distortion applied over the wrapped content. `'ripple'` is the only value;
  // Android-only (API 33+) — iOS accepts and ignores it. A deliberately minimal native prop,
  // not the long-term public surface.
  contentDistortion?: 'ripple';
  visible?: boolean;
  preset?: string;
  presenceMotion?: PresenceMotionWire;
  appear?: boolean;
  onShaderPress?: (event: FxSurfacePressEvent) => void;
  onShaderPressIn?: (event: FxSurfacePressEvent) => void;
  onShaderPressOut?: (event: FxSurfacePressEvent) => void;
  onShaderLongPress?: (event: FxSurfacePressEvent) => void;
  onFxLoad?: (event: FxSurfaceShaderEvent) => void;
  onFxError?: (event: FxSurfaceShaderEvent) => void;
  onFxTransitionEnd?: (event: FxTransitionEndEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// The native props accept the empty-string sentinel that clears: the public props are absent or a
// concrete value, but Expo omits an `undefined` prop, so a once-set value could never be cleared
// (the previous value would stick). Coercing absent → `''` keeps every batch carrying the prop.
type NativeProps = Omit<NativeFxSurfaceProps, 'shader' | 'contentDistortion'> & {
  shader: ShaderId | (string & {}) | '';
  contentDistortion: 'ripple' | '';
};

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
  { shader, contentDistortion, ...rest }: NativeFxSurfaceProps,
  ref: Ref<unknown>
): ReactElement {
  return (
    <NativeFxSurfaceView
      ref={ref}
      shader={shader ?? ''}
      contentDistortion={contentDistortion ?? ''}
      {...rest}
    />
  );
}

export const FxSurfaceView = forwardRef(FxSurfaceViewInner);
