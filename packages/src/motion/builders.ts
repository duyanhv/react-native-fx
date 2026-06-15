import type { Edge, MotionSpec, PresenceMotion, Travel } from './types';

/**
 * The four V1 motion builders. Each returns an unresolved `MotionSpec` — a semantic shape,
 * never timing. Edge builders emit a measured `{ measure: 'edge' }` token the native side
 * fills from the laid-out frame; `scale`/`identity` are fixed deltas. The names stay
 * `edgeIn`/`edgeOut`/`scale`/`identity` rather than borrowing Compose's `fadeIn`/`slideIn`.
 */

/** Slides in from an edge while fading up: the spec describes the *hidden* start. */
export function edgeIn({ from }: { from: Edge }): MotionSpec {
  return { ...edgeTravel(from), opacity: 0 };
}

/** Slides out to an edge: the spec describes the *hidden* end. No implicit fade — the
 * idiomatic dismiss is the platform's, not a blind reverse of enter. */
export function edgeOut({ to }: { to: Edge }): MotionSpec {
  return edgeTravel(to);
}

/** Scales toward a factor about the transform origin (center unless `origin` is set). */
export function scale({ to }: { to: number }): MotionSpec {
  return { scale: to };
}

/** The fallback shape — nothing moves. */
export function identity(): MotionSpec {
  return {};
}

/** Routes an edge to its translate axis as a measured token. */
function edgeTravel(edge: Edge): MotionSpec {
  const token: Travel = { measure: 'edge', edge };
  return edge === 'left' || edge === 'right' ? { translateX: token } : { translateY: token };
}

/**
 * The one motion-map fallback rule, everywhere: a phase resolves to the user's spec, else the
 * preset's, else identity. There is **no implicit reverse** — a missing `exit` is not `enter`
 * reversed unless the preset defines it. The native coordinator mirrors this rule with the
 * platform-resolved preset layer; this is the JS-knowable half (no preset ⇒ identity).
 */
export function effectiveMotion(
  key: string,
  userMotion?: Record<string, MotionSpec | undefined>,
  presetMotion?: Record<string, MotionSpec | undefined>
): MotionSpec {
  return userMotion?.[key] ?? presetMotion?.[key] ?? identity();
}

// ── The native wire form ────────────────────────────────────────────────
// The public `MotionSpec` carries a `Travel` union (number | measured token) that does not
// map cleanly onto an Expo `Record`. The surface normalizes it to a flat record before it
// crosses: a fixed delta becomes `{ value }`, a measured token becomes `{ measureEdge }`.

/** A travel magnitude as it crosses the bridge. */
export type TravelWire = { value?: number; measureEdge?: Edge };

/** A motion phase as it crosses the bridge — the `Travel` union flattened. */
export type MotionWire = {
  opacity?: number;
  scale?: number;
  translateX?: TravelWire;
  translateY?: TravelWire;
  rotate?: number;
  origin?: string;
};

/** A presence envelope as it crosses the bridge. Omitted phases stay omitted so native can
 * apply the preset fallback. */
export type PresenceMotionWire = { enter?: MotionWire; exit?: MotionWire };

/** Normalizes a presence motion map to its wire form, or undefined when nothing is set. */
export function toPresenceMotionWire(motion?: PresenceMotion): PresenceMotionWire | undefined {
  if (!motion) {
    return undefined;
  }
  const wire: PresenceMotionWire = {};
  if (motion.enter) {
    wire.enter = toMotionWire(motion.enter);
  }
  if (motion.exit) {
    wire.exit = toMotionWire(motion.exit);
  }
  return wire.enter || wire.exit ? wire : undefined;
}

function toMotionWire(spec: MotionSpec): MotionWire {
  const wire: MotionWire = {};
  if (spec.opacity !== undefined) {
    wire.opacity = spec.opacity;
  }
  if (spec.scale !== undefined) {
    wire.scale = spec.scale;
  }
  if (spec.translateX !== undefined) {
    wire.translateX = toTravelWire(spec.translateX);
  }
  if (spec.translateY !== undefined) {
    wire.translateY = toTravelWire(spec.translateY);
  }
  if (spec.rotate !== undefined) {
    wire.rotate = spec.rotate;
  }
  if (typeof spec.origin === 'string') {
    wire.origin = spec.origin;
  }
  return wire;
}

function toTravelWire(travel: Travel): TravelWire {
  return typeof travel === 'number' ? { value: travel } : { measureEdge: travel.edge };
}
