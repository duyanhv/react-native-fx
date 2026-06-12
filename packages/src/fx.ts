import { edgeIn, edgeOut, identity, scale } from './motion/builders';

/**
 * The builder namespace developers compose with. `fx.motion.*` produces `MotionSpec` shapes
 * for `FxPresence`'s `motion` map. The effect builders (`fx.effect.*`) join this object as the
 * effect chain lands; today it carries motion only.
 */
export const fx = {
  motion: { edgeIn, edgeOut, scale, identity },
} as const;
