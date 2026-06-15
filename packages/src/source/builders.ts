import type { ScrollAxis, ScrollSourceSpec } from './types';

/**
 * The source-driver builders developers compose with. Each returns an unresolved `SourceSpec`
 * — a declaration of *which* native value drives presentation, never a per-frame value. The
 * names mirror the `fx.motion.*` / `fx.effect.*` factory idiom.
 */

/** Binds presentation to a native scroll position. The default axis is `vertical`. */
export function scroll({ axis = 'vertical' }: { axis?: ScrollAxis } = {}): ScrollSourceSpec {
  return { kind: 'scroll', axis };
}
