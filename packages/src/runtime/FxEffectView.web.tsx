import type { NativeFxEffectProps } from './FxEffectView';

// The effect surface is native-only (Metal/AGSL). Web is not a supported target,
// so it renders nothing.
export function FxEffectView(_props: NativeFxEffectProps) {
  return null;
}
