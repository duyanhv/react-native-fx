import { edgeIn, edgeOut, identity, scale } from './motion/builders';
import { scroll } from './source/builders';

/**
 * The builder namespace developers compose with. `fx.motion.*` produces `MotionSpec` shapes
 * for `FxPresence`'s `motion` map; `fx.source.*` produces `SourceSpec` bindings for a hosted
 * scroll context. The effect builders (`fx.effect.*`) join this object as the effect chain
 * lands.
 */
export const fx = {
  motion: { edgeIn, edgeOut, scale, identity },
  source: { scroll },
} as const;
