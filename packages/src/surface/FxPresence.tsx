import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { toPresenceMotionWire } from '../motion/builders';
import type { PresenceMotion } from '../motion/types';
import { FxSurfaceView, type FxTransitionEndEvent } from '../runtime/FxSurfaceView';
import {
  childrenToRender,
  initialRetention,
  type RetentionState,
  retentionReducer,
} from './presenceMachine';

/**
 * Expert timing — refines a preset or an explicit motion, never a shape. V1 honors the
 * platform's own tuned default spring (`'native'`); the type widens to per-platform spring
 * authoring when the device-tuned motion catalog lands.
 */
export type FxTransition = {
  spring?: 'native';
};

/** The completion back-channel payload. The native event prefix never leaks past JS. */
export type FxTransitionEnd = {
  owner: 'presence';
  phase: 'enter' | 'exit';
  finished: boolean;
  interrupted: boolean;
};

/** The V1 presence preset vocabulary — behavior-named, not UI-named. `transient` is the only
 * V1 preset; sheet and modal presentations arrive with the device-tuned motion catalog. */
export type PresencePreset = 'transient';

export type FxPresenceProps = {
  /** The discrete lifecycle target. Native runs the envelope; one completion event returns. */
  visible: boolean;
  /** A platform-idiomatic behavior bundle; fx resolves the whole shape + timing per OS. */
  preset?: PresencePreset;
  /** An explicit per-phase shape override — fixes the shape cross-platform. */
  motion?: PresenceMotion;
  /** Expert timing. V1 honors the platform-default spring; richer authoring lands with the
   * device-tuned motion catalog. */
  transition?: FxTransition;
  /** Whether `visible: true` on the initial mount plays the enter envelope. Default true. */
  appear?: boolean;
  /** Fires per phase as the native envelope settles or is cut short. */
  onTransitionEnd?: (event: FxTransitionEnd) => void;
  /** Wrapper/placement style — the app owns placement, not fx. */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * The front door for content entrance/exit. A stateful coordinator (not a dumb wrapper): it
 * keeps the exiting child mounted until the native exit completes, then releases it — the
 * deferred-unmount handshake. It wraps any children in **one** managed host view and animates
 * transform/opacity on it, so hit-testing follows and touch survives; there is no per-child
 * motion.
 *
 * Drive exit with `visible`, never by conditionally rendering `FxPresence` itself —
 * `{show && <FxPresence/>}` unmounts the coordinator before it can animate. The coordinator
 * must live above the thing it animates.
 */
export function FxPresence({
  visible,
  preset = 'transient',
  motion,
  appear = true,
  onTransitionEnd,
  style,
  children,
}: FxPresenceProps): ReactElement {
  // `transition` is accepted for API stability; V1 honors the platform-default spring, and
  // richer spring/timing authoring lands with the device-tuned motion catalog.
  const [state, dispatch] = useReducer(retentionReducer, visible, initialRetention);

  // Mirror state into a ref so the host-detach guard reads the current value without
  // re-subscribing, and freeze the snapshot the moment an exit begins.
  const stateRef = useRef<RetentionState>(state);
  stateRef.current = state;

  const snapshotRef = useRef<ReactNode>(children);
  if (!state.exiting) {
    snapshotRef.current = children;
  }

  // Translate the discrete `visible` edge into a retention event after commit. The reducer
  // initialized to the first `visible`, so the initial mount dispatches nothing.
  const previousVisible = useRef(visible);
  useEffect(() => {
    if (previousVisible.current !== visible) {
      previousVisible.current = visible;
      dispatch(visible ? { type: 'show' } : { type: 'hide' });
    }
  }, [visible]);

  const handleTransitionEnd = useCallback(
    (event: FxTransitionEndEvent) => {
      const payload = event.nativeEvent;
      // The completed exit is the release signal; a cut-short exit (interrupted) keeps the child.
      if (payload.phase === 'exit' && payload.finished) {
        dispatch({ type: 'exitEnd' });
      }
      onTransitionEnd?.(payload);
    },
    [onTransitionEnd]
  );

  // Stranded-exit guard: Expo drops events for a dead view silently, so a host detach mid-exit
  // would strand the retained child. Release it at once — dev-only (Fast Refresh).
  const handleHostRef = useCallback((node: unknown) => {
    if (node === null && stateRef.current.exiting) {
      dispatch({ type: 'stranded' });
    }
  }, []);

  const rendered = childrenToRender(state, children, snapshotRef.current);

  return (
    <FxSurfaceView
      ref={handleHostRef}
      visible={visible}
      preset={preset}
      presenceMotion={toPresenceMotionWire(motion)}
      appear={appear}
      onFxTransitionEnd={handleTransitionEnd}
      style={style}
    >
      {state.rendered ? rendered : null}
    </FxSurfaceView>
  );
}
