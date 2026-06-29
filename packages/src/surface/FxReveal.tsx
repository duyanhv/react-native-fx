import { type ReactElement, type ReactNode, useCallback, useState } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { type FxRevealTransitionEndEvent, FxRevealView } from '../runtime/FxRevealView';

/**
 * The behavior preset. `anchoredMorph` is the v1 reveal behavior — collapsed shell morphs into the
 * preset-owned bottom-half target. Kept a single-value union deliberately; richer preset names are
 * not frozen here.
 */
export type FxRevealPreset = 'anchoredMorph';

/**
 * Expert timing, accepted for forward-compatibility. v1 honors the platform's own tuned default
 * spring; the per-platform shape follows the hybrid-timing principle (no detailed transition type
 * is frozen yet), so these fields are carried but not yet forwarded.
 */
export type FxRevealTransition = {
  preset?: string;
  ios?: { preset?: string };
  android?: { preset?: string };
};

/** The completion back-channel payload. The native event prefix never leaks past JS. */
export type FxRevealTransitionEnd = {
  owner: 'reveal';
  phase: 'expand' | 'collapse';
  finished: boolean;
  interrupted: boolean;
};

export type FxRevealProps = {
  /** The discrete target: `false` is collapsed, `true` is the expanded target. */
  open: boolean;
  /** Content shown in the collapsed frame — the shell's own laid-out size. */
  collapsed?: ReactNode;
  /** Content shown at the preset-owned expanded target, rasterized at full target size. */
  expanded?: ReactNode;
  /** The behavior preset; fx resolves the shape + timing per OS. */
  preset?: FxRevealPreset;
  /** Expert timing — accepted for forward-compatibility; v1 honors the platform-default spring. */
  transition?: FxRevealTransition;
  /** Fires per phase as the native envelope settles or is cut short. */
  onTransitionEnd?: (event: FxRevealTransitionEnd) => void;
  /** Style for the collapsed slot wrapper — positions the collapsed content within the host. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Reveals an fx-owned shell from the collapsed slot's app-specified frame to the preset-owned
 * bottom-half target. The shell fills its host; fx reads the collapsed slot/wrapper frame within
 * it (a self-read — never a descendant search or foreign ref), sizes an fx-owned layer to the
 * target (never written into Yoga, so siblings outside the host never reflow), and inverse-
 * transforms it so the expanded content rasterizes at full target size and stays sharp through
 * the morph.
 *
 * **Reveal-host requirement (interactive expanded content).** Mount `<FxReveal>` inside a
 * bounds-containing host — a root-level `StyleSheet.absoluteFill pointerEvents="box-none"` overlay,
 * the app's own portal, or an RN `Modal` — whose bounds span both the collapsed slot and the
 * expanded target. `FxReveal` fills that host (via `StyleSheet.absoluteFill`); the `style` prop
 * positions the collapsed slot within the host. Without a bounds-containing host the expanded
 * panel overflows a smaller parent and is not touch-reachable on Android (`TouchTargetHelper`
 * does not descend for out-of-bounds points). fx creates no host of its own.
 *
 * There is deliberately no `from`/`anchor` prop — the collapsed frame is the slot's own
 * Fabric-laid-out frame, never a cross-tree anchor lookup. Drive the reveal with `open`, never by
 * conditionally rendering `FxReveal` itself.
 */
export function FxReveal({
  open,
  collapsed,
  expanded,
  onTransitionEnd,
  style,
}: FxRevealProps): ReactElement {
  // `preset` and `transition` are accepted for API stability; v1 resolves the anchoredMorph shape
  // and honors the platform-default spring natively.
  const handleTransitionEnd = useCallback(
    (event: FxRevealTransitionEndEvent) => {
      onTransitionEnd?.(event.nativeEvent);
    },
    [onTransitionEnd]
  );

  // The expanded slot must lay out at its full target size so the content rasterizes sharp — Yoga
  // would otherwise size it to the collapsed slot. `onLayout` on FxRevealView reads the host's
  // actual laid-out dimensions so the expanded slot matches the native toRect exactly. Before the
  // first layout pass supplies real host dimensions, the expanded wrapper is 0×0 and non-visible so
  // a non-full-window host mounted open=true never shows the wrong-size flash.
  const [hostSize, setHostSize] = useState<{ width: number; height: number } | null>(null);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setHostSize({ width, height });
  }, []);
  const expandedSize: ViewStyle = hostSize
    ? { width: hostSize.width, height: hostSize.height / 2 }
    : { width: 0, height: 0, opacity: 0 };

  // The two slots cross as a fixed two-child order — collapsed first, expanded second — which the
  // native side routes into its two fx-owned layers. Both wrappers always render so the order is
  // stable even when a slot is empty.
  //
  // FxRevealView fills its host (absoluteFill). The collapsed slot wrapper receives `style` so the
  // app can position the collapsed content within the host — its Fabric-laid-out frame is the
  // self-read fromRect the coordinator uses for the inverse transform. The expanded slot stays
  // absolute (out of flow); native placement positions it at the target within the host.
  return (
    <FxRevealView
      open={open}
      onFxTransitionEnd={handleTransitionEnd}
      onLayout={handleLayout}
      style={StyleSheet.absoluteFill}
    >
      <View style={style} pointerEvents="box-none">
        {collapsed}
      </View>
      <View style={[styles.expanded, expandedSize]} pointerEvents="box-none">
        {expanded}
      </View>
    </FxRevealView>
  );
}

const styles = StyleSheet.create({
  // Out of flow so sizing the expanded content to its target never reflows the surrounding tree.
  expanded: { position: 'absolute', top: 0, left: 0 },
});
