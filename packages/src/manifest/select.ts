import type { CapabilityNode, Lowering, Platform, SelectCtx } from './types';

/**
 * The result of a successful or degraded selection.
 *
 * A successful selection returns a rung from the ladder. When no rung
 * satisfies the context, the selector returns `{ via: 'none' }` — never throws.
 */
export type SelectResult = Lowering | { via: 'none' };

/**
 * Selects the first satisfiable rung from a node's per-platform fallback ladder.
 *
 * The ladder is walked top-to-bottom. A rung is skipped when its status is
 * `planned` or `out-of-scope`, its OS guard exceeds the device, a required
 * feature flag is absent from `ctx.features`, or its substrate does not match
 * the interactive requirement. For driver nodes, the rung's `target` is matched
 * against `ctx.target` (default `'effect'`).
 *
 * Returns `{ via: 'none' }` when no rung qualifies — never throws.
 */
export function select(node: CapabilityNode, platform: Platform, ctx: SelectCtx): SelectResult {
  const target = ctx.target ?? 'effect';
  const features = ctx.features ?? [];

  for (const rung of node.lower[platform]) {
    if (rung.status === 'planned') {
      continue;
    }
    if (rung.status === 'out-of-scope') {
      continue;
    }
    if (rung.requires.os > ctx.deviceOS) {
      continue;
    }
    if (rung.requires.feature && !features.includes(rung.requires.feature)) {
      continue;
    }
    if (
      ctx.wantInteractive &&
      node.interaction === 'fx' &&
      rung.requires.substrate !== 'expo-view'
    ) {
      continue;
    }
    if (node.kind === 'driver' && rung.target && rung.target !== target) {
      continue;
    }

    return rung;
  }

  return { via: 'none' };
}
