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
export { FxHostedView, type NativeFxHostedProps } from './runtime/FxHostedView';
export {
  type FxSurfacePressEvent,
  type FxSurfaceShaderEvent,
  FxSurfaceView,
  type InteractionMode,
  type NativeFxSurfaceProps,
} from './runtime/FxSurfaceView';
