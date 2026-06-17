import type { ReactNode } from 'react';
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
  dragAxis?: 'horizontal' | 'vertical' | 'both';
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

/**
 * Imperative API exposed on the native `FxSurfaceView` ref.
 *
 * `controlled` mode enables these methods; the write is discrete (not per frame) and
 * lands in the same uniform buffer the native render loop already reads.
 */
export type FxSurfaceViewRef = {
  /**
   * Pushes a scalar uniform value to the shader, applied on the next frame.
   *
   * The value crosses the bridge as a discrete target, not per frame. Pass `null`
   * to clear an imperative override and let the prop-derived value win again.
   */
  setUniform(name: string, value: number | null): Promise<void>;

  /**
   * Sets the highlight position in `[0, 1]` y-up UV space and activates the
   * press-depth uniform. Convenience sugar over the `touch` and `pressDepth`
   * uniforms.
   */
  setHighlight(x: number, y: number): Promise<void>;
};
