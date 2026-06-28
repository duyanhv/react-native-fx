import { glass, glow, mesh, symbol } from './effects/stack';
import { edgeIn, edgeOut, identity, scale } from './motion/builders';
import { scroll } from './source/builders';

/**
 * The builder namespace developers compose with. `fx.motion.*` produces `MotionSpec` shapes
 * for `FxPresence`'s `motion` map; `fx.source.*` produces `SourceSpec` bindings for a hosted
 * scroll context; `fx.effect.*` produces an `EffectStack` for `<Fx effect={…}>`.
 */
export const fx = {
  motion: { edgeIn, edgeOut, scale, identity },
  source: { scroll },
  effect: { glow, glass, mesh, symbol },
} as const;
