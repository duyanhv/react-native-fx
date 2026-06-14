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
export { fx } from './fx';
export type { Edge, MotionSpec, Origin, PresenceMotion, Travel } from './motion/types';
export { FxHostedView, type NativeFxHostedProps } from './runtime/FxHostedView';
export {
  type FxSurfacePressEvent,
  type FxSurfaceShaderEvent,
  FxSurfaceView,
  type InteractionMode,
  type NativeFxSurfaceProps,
} from './runtime/FxSurfaceView';
export type { ScrollAxis, ScrollSourceSpec, SourceSpec } from './source/types';
export {
  Fx,
  FxPresence,
  type FxPresenceProps,
  type FxScrollProps,
  type FxScrollTile,
  type FxTransition,
  type FxTransitionEnd,
  type PresencePreset,
} from './surface';
