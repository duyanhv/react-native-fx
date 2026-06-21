import type { ReactElement, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { FxGroupView } from '../runtime/FxGroupView';

export type FxGroupProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export type FxItemProps = {
  children?: ReactNode;
};

/**
 * The glass morph compound container. On iOS 26 the system merges sibling glass
 * surfaces when placed close; on Android and pre-26 iOS each item renders individually.
 */
export function FxGroup({ style, children }: FxGroupProps): ReactElement {
  return <FxGroupView style={style}>{children}</FxGroupView>;
}

/**
 * A transparent slot in an `FxGroup`. No native wrapper is added — the child mounts
 * as directly as possible under the group container so the system can treat sibling
 * glass surfaces as merge candidates. Size and position the child via its own `style`.
 */
export function FxItem({ children }: FxItemProps): ReactElement {
  return <>{children}</>;
}
