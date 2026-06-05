import type { StyleProp, ViewStyle } from 'react-native';

/** Curated, build-time shaders selected by id. */
export type ShaderId =
  | 'fractal-clouds'
  | 'ink-smoke'
  | 'liquid-chrome'
  | 'loop'
  | 'dots';

/** How the surface handles touch. */
export type ShaderInteractionMode = 'none' | 'passive' | 'active' | 'controlled';

export type ShaderPressEvent = { nativeEvent: Record<string, never> };

/** Public props for the `ShaderView` component. */
export type ShaderViewProps = {
  /** Curated shader, selected by id. Default `'aurora'`. */
  shader?: ShaderId;
  /** Overall effect intensity, 0..1. Default `0.8`. */
  intensity?: number;
  /** Touch handling. Default `'none'`. */
  interactionMode?: ShaderInteractionMode;
  /** Fires when a press completes (down, then up). */
  onPress?: (event: ShaderPressEvent) => void;
  onPressIn?: (event: ShaderPressEvent) => void;
  onPressOut?: (event: ShaderPressEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Props passed to the native view. The press events use a prefixed name to avoid
 * colliding with React Native's reserved `topPress` event; the public component
 * maps `onPress*` to these.
 */
export type NativeShaderViewProps = {
  shader?: ShaderId;
  intensity?: number;
  interactionMode?: ShaderInteractionMode;
  onShaderPress?: (event: ShaderPressEvent) => void;
  onShaderPressIn?: (event: ShaderPressEvent) => void;
  onShaderPressOut?: (event: ShaderPressEvent) => void;
  style?: StyleProp<ViewStyle>;
};
