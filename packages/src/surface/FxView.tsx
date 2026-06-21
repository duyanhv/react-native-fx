import { type ReactElement, type ReactNode, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { toStateMotionWire } from '../motion/builders';
import type { MotionSpec } from '../motion/types';
import { type FxStateChangeEvent, NativeFxStateView } from '../runtime/FxStateView';

/** The V1 state preset vocabulary — behavior-named, not UI-named. */
export type FxStatePreset = 'lift';

/** The completion back-channel payload. The native event prefix never leaks past JS. */
export type FxStateChange = {
  state: string;
  finished: boolean;
  interrupted: boolean;
};

export type FxViewProps = {
  /** The discrete mounted target. Native eases the content wrapper to its vector. */
  state: string;
  /** A platform-idiomatic state behavior bundle; fx resolves the whole shape + timing per OS. */
  preset?: FxStatePreset;
  /** An explicit per-state shape override — keyed by the same strings as `state`. */
  motion?: Record<string, MotionSpec>;
  /** Expert timing. V1 honors the platform-default spring. */
  transition?: { spring?: 'native' };
  /** Fires once when the transition settles or is cut short. */
  onStateChange?: (event: FxStateChange) => void;
  /** Wrapper/placement style — the app owns placement, not fx. */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Wraps content and eases it between named mounted states using a native spring, returning
 * one settle event per transition. All states are always mounted — there is no deferred-unmount
 * handshake. The native side owns easing; JS sends a discrete `state` target and receives one
 * semantic settle event.
 */
export function FxView({
  state,
  preset = 'lift',
  motion,
  onStateChange,
  style,
  children,
}: FxViewProps): ReactElement {
  // `transition` is accepted for API stability; V1 honors the platform-default spring, and
  // richer spring/timing authoring lands with the device-tuned motion catalog.

  const handleStateChange = useCallback(
    (event: FxStateChangeEvent) => {
      onStateChange?.(event.nativeEvent);
    },
    [onStateChange]
  );

  return (
    <NativeFxStateView
      state={state}
      preset={preset}
      stateMotion={toStateMotionWire(motion)}
      onFxStateChange={handleStateChange}
      style={style}
    >
      {children}
    </NativeFxStateView>
  );
}
