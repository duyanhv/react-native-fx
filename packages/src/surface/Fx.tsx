import { forwardRef, type ReactElement, type Ref, useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform } from 'react-native';

import type { MaterialConfig } from '../effects/catalog';
import { compositionStyle, type EffectId, resolveEffect } from '../effects/effects';
import { manifest, select } from '../manifest';
import { FxHostedView } from '../runtime/FxHostedView';
import { FxSurfaceView } from '../runtime/FxSurfaceView';
import type {
  FxSurfacePressEvent,
  FxSurfaceShaderEvent,
  FxSurfaceViewRef,
  InteractionMode,
} from '../runtime/FxSurfaceView.types';
import { FxScroll, type FxScrollProps, type FxScrollTile } from './FxScroll';

export type { EffectId, FxScrollProps, FxScrollTile };

export type FxProps = {
  /** The public effect id — the only required prop. */
  effect: EffectId;
  intensity?: number;
  /** Effect-layer position. Default `'surface'` (normal flow). */
  composition?: 'background' | 'overlay' | 'surface';
  /** Default `'none'`. Shader effects support `passive` / `active` / `controlled`. */
  interactionMode?: InteractionMode;
  /** Glass configuration — honored when `effect="glass"`. */
  materialConfig?: MaterialConfig;
  /** Fires on shader compile-load (expo-view path only). */
  onLoad?: (e: FxSurfaceShaderEvent) => void;
  /**
   * Fires on shader-load failure (expo-view path) or adapter degradation.
   * Adapter degradation: `reason: 'unsupported'` — the capability is unavailable on
   * this device or substrate, distinct from a native shader-compile failure.
   */
  onError?: (e: FxSurfaceShaderEvent) => void;
  onPress?: (e: FxSurfacePressEvent) => void;
  onPressIn?: (e: FxSurfacePressEvent) => void;
  onPressOut?: (e: FxSurfacePressEvent) => void;
  onLongPress?: (e: FxSurfacePressEvent) => void;
  style?: StyleProp<ViewStyle>;
};

// Parsed once at module load; the OS version does not change during a session.
const deviceOS = parseInt(String(Platform.Version), 10);

const FxBase = forwardRef<FxSurfaceViewRef, FxProps>(function Fx(
  {
    effect,
    intensity,
    composition = 'surface',
    interactionMode = 'none',
    materialConfig,
    onLoad,
    onError,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    style,
  },
  ref: Ref<FxSurfaceViewRef>
): ReactElement | null {
  const resolution = resolveEffect(effect);
  const node = manifest.nodes[resolution.node];
  const wantInteractive =
    (interactionMode === 'passive' ||
      interactionMode === 'active' ||
      interactionMode === 'controlled') &&
    node.interaction === 'fx';
  // The manifest only lowers for `ios`/`android`; on web (and any other platform) the
  // substrate bindings are no-ops, so degrade rather than index a missing `lower.web`.
  const platform = Platform.OS;
  const rung =
    platform === 'ios' || platform === 'android'
      ? select(node, platform, { deviceOS, wantInteractive })
      : ({ via: 'none' } as const);

  // Mirror onError into a ref so the degradation effect reads the current callback
  // without re-subscribing on every identity change.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (rung.via !== 'none') return;
    onErrorRef.current?.({ nativeEvent: { shader: effect, reason: 'unsupported' } });
  }, [rung.via, effect]);

  if (rung.via === 'none') return null;

  const mergedStyle = [compositionStyle(composition), style];

  if (rung.requires.substrate === 'expo-view') {
    return (
      <FxSurfaceView
        ref={ref}
        shader={resolution.hostedEffect}
        intensity={intensity}
        interactionMode={interactionMode}
        onShaderPress={onPress}
        onShaderPressIn={onPressIn}
        onShaderPressOut={onPressOut}
        onShaderLongPress={onLongPress}
        onFxLoad={onLoad}
        onFxError={onError}
        style={mergedStyle}
      />
    );
  }

  // Hosted path — no native press or lifecycle events are emitted.
  return (
    <FxHostedView
      effect={resolution.hostedEffect}
      intensity={intensity}
      materialConfig={resolution.node === 'material' ? materialConfig : undefined}
      style={mergedStyle}
    />
  );
});

/**
 * The canonical front door for fx effects. Resolves a public effect id to the right
 * substrate and wires the public prop/event/ref surface.
 *
 * The `ref` is forwarded to the native `FxSurfaceView` on the expo-view path
 * (`interactionMode` `active` or `controlled`) and is absent/inert on the hosted path.
 *
 * `Fx.Scroll` carries the hosted scroll context.
 */
export const Fx = Object.assign(FxBase, { Scroll: FxScroll });

/**
 * Thin sugar over `<Fx effect="edge-glow" …/>` — the one named effect component.
 */
export function EdgeGlow(props: Omit<FxProps, 'effect'>): ReactElement | null {
  return <Fx effect="edge-glow" {...props} />;
}
