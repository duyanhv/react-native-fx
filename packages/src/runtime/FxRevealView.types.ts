import type { ReactNode } from 'react';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';

/** Carries the reveal lifecycle completion the native coordinator emits, per phase. */
export type FxRevealTransitionEndEvent = {
  nativeEvent: {
    owner: 'reveal';
    phase: 'expand' | 'collapse';
    finished: boolean;
    interrupted: boolean;
  };
};

/**
 * Props the native `FxRevealView` accepts.
 *
 * The surface component (`FxReveal`) owns their public shape; this binding stays internal to the
 * runtime layer. The native shell reads its own collapsed frame and computes the expanded
 * target natively — no anchor or foreign-rect prop crosses, by design.
 */
export type NativeFxRevealProps = {
  /** The discrete target: `false` is collapsed, `true` is the expanded target. */
  open?: boolean;
  onFxTransitionEnd?: (event: FxRevealTransitionEndEvent) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};
