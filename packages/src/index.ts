// Public API — the only stability contract. The high-level component vocabulary
// (`fx`, `FxPresence`, `FxView`, `FxPressable`, `Fx`, `FxGroup`, `FxItem`) is
// added as each component is built; the runtime substrate views exported below
// are the low-level native hosts those components are built on.
export type {
  MaterialConfig,
  MaterialVariant,
  ShaderId,
  SymbolAnimation,
  SymbolConfig,
} from './effects/catalog';
export type { EffectId } from './effects/effects';
export {
  isRegisteredShader,
  type RegisterShaderSpec,
  registeredShaderIds,
  registerShader,
  type ShaderSource,
} from './effects/registry';
export type {
  EffectBuilder,
  EffectStack,
  EffectStep,
  EffectStepId,
  SpringSpec,
  Transition,
} from './effects/stack';
export { fx } from './fx';
export type { Edge, MotionSpec, Origin, PresenceMotion, Travel } from './motion/types';
export { FxHostedView, type NativeFxHostedProps } from './runtime/FxHostedView';
export { FxSurfaceView } from './runtime/FxSurfaceView';
export type {
  FxSurfacePressEvent,
  FxSurfaceShaderEvent,
  FxSurfaceViewRef,
  InteractionMode,
  NativeFxSurfaceProps,
} from './runtime/FxSurfaceView.types';
export type { ScrollAxis, ScrollSourceSpec, SourceSpec } from './source/types';
export {
  EdgeGlow,
  Fx,
  FxPresence,
  type FxPresenceProps,
  FxPressable,
  type FxPressableProps,
  type FxProps,
  type FxScrollProps,
  type FxScrollTile,
  type FxTransition,
  type FxTransitionEnd,
  type PresencePreset,
} from './surface';
