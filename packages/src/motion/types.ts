/**
 * The agnostic motion vocabulary — the `MotionSpec` shape `fx.motion.*` produces and
 * `FxPresence`'s `motion` map accepts. A spec is a *shape only*: which agnostic channels
 * move. Timing is `transition`; the lifecycle phase is the owning map key. Measured
 * channels carry a token the native side resolves from the post-layout frame, so JS never
 * needs the view's size.
 */

/** A window edge an enter/exit slides from or to. */
export type Edge = 'top' | 'bottom' | 'left' | 'right';

/** The transform anchor for scale/rotate. Center unless overridden. */
export type Origin =
  | 'center'
  | Edge
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | { x: number; y: number };

/**
 * A translate magnitude. Either a JS-fixed delta in points (uniform across platforms), or a
 * token whose magnitude the native side resolves from the post-layout frame — so "slide from
 * the bottom" works without JS ever knowing the view's size.
 */
export type Travel = number | { measure: 'edge'; edge: Edge };

/** A SHAPE only — agnostic channels; measured channels defer their magnitude to native. */
export type MotionSpec = {
  opacity?: number;
  scale?: number;
  translateX?: Travel;
  translateY?: Travel;
  /** degrees */
  rotate?: number;
  origin?: Origin;
};

/** A presence envelope: a spec per lifecycle phase. Omitted phases fall back per `effectiveMotion`. */
export type PresenceMotion = {
  enter?: MotionSpec;
  exit?: MotionSpec;
};
