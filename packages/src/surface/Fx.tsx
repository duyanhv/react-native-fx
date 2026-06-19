import { forwardRef, type ReactElement, type Ref, useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform } from 'react-native';

import type { MaterialConfig } from '../effects/catalog';
import { compositionStyle, type EffectId, resolveEffect } from '../effects/effects';
import type { EffectStack } from '../effects/stack';
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
  /** The public effect id or an `EffectStack` produced by `fx.effect.*`. */
  effect: EffectId | EffectStack;
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
  // Resolve the active effect id, intensity, and material config from either the string
  // form or the stack form. The stack path takes the single backed step and runs the
  // same resolveEffect→select→mount sequence as the string form.
  const isStack = typeof effect !== 'string';
  const step = isStack ? effect.steps[0] : undefined;
  // A hand-built `EffectStack` bypasses the `fx.effect.*` builder's single-render-target guard,
  // so enforce it here too: V1 renders the first step only.
  const stepCount = isStack ? effect.steps.length : 0;
  // For the empty-stack edge case (not reachable via public API), effectId needs a stable
  // value for hook deps; 'edge-glow' is a placeholder — the empty-stack null is checked
  // after all hooks complete.
  const effectId: EffectId = step?.id ?? (isStack ? 'edge-glow' : (effect as EffectId));
  const effectIntensity = step ? step.intensity : intensity;
  const effectConfig = step ? step.config : materialConfig;

  const resolution = resolveEffect(effectId);
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
    onErrorRef.current?.({ nativeEvent: { shader: effectId, reason: 'unsupported' } });
  }, [rung.via, effectId]);

  useEffect(() => {
    if (__DEV__ && stepCount > 1) {
      console.warn(
        'fx: <Fx effect={stack}> renders a single render-target in V1; the stack has multiple steps, so only the first is used. Multi-layer composition is not supported yet.'
      );
    }
  }, [stepCount]);

  if ((isStack && !step) || rung.via === 'none') return null;

  const mergedStyle = [compositionStyle(composition), style];

  if (rung.requires.substrate === 'expo-view') {
    return (
      <FxSurfaceView
        ref={ref}
        shader={resolution.hostedEffect}
        intensity={effectIntensity}
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
      intensity={effectIntensity}
      materialConfig={resolution.node === 'material' ? effectConfig : undefined}
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
