import { requireNativeView } from 'expo';
import type { ComponentType, ForwardedRef } from 'react';
import { forwardRef, type ReactElement, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface FxPressableProps {
  feedback?: 'native';
  onPressIn?: () => void;
  onPressOut?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

type NativeFxPressableProps = {
  onPressIn?: () => void;
  onPressOut?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  ref?: ForwardedRef<unknown>;
};

const NativeFxPressableView = requireNativeView<NativeFxPressableProps>(
  'ReactNativeFx',
  'FxPressableView'
) as ComponentType<NativeFxPressableProps>;

/**
 * Wraps content and provides native press feedback with semantic events.
 *
 * The wrapped children receive press-in feedback (platform-specific: iOS scale + opacity
 * dip, Android ripple) and emit onPressIn, onPressOut, onPress, and onLongPress events.
 * Cancellation (drag out of bounds, scroll yield) emits onPressOut only, suppressing onPress.
 *
 * `feedback` defaults to `'native'` in V1 and is the only scoped prop. Content motion,
 * state, and effect props are not supported — use `Fx` or `FxView` for those.
 */
const FxPressableBase = forwardRef<unknown, FxPressableProps>(function FxPressable(
  { feedback = 'native', onPressIn, onPressOut, onPress, onLongPress, children, style },
  ref
): ReactElement {
  // V1 ships 'native' only; future feedback variants (e.g. transform) arrive later.
  if (feedback !== 'native') {
    console.warn(`FxPressable: feedback="${feedback}" is not supported in V1; using "native".`);
  }

  return (
    <NativeFxPressableView
      ref={ref}
      style={style}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </NativeFxPressableView>
  );
});

export const FxPressable = FxPressableBase;
