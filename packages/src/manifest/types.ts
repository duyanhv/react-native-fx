// ── shared vocabularies ──────────────────────────────────────────────

export type Platform = 'ios' | 'android';

/** hosted = SwiftUI/Compose host (decorative, Host boundary, pointerEvents passthrough).
 *  expo-view = plain native UIView/ViewGroup (the G runtime; required for interaction). */
export type Substrate = 'hosted' | 'expo-view';

/** how a candidate is realized. */
export type Via = 'native' | 'shader' | 'draw' | 'lib' | 'none';

/** the build-time asset a candidate consumes, if any. */
export type Asset = 'metal' | 'agsl' | 'lottie' | 'none';

/** the time source when the node animates. */
export type Clock =
  | 'timeline'
  | 'display-link'
  | 'frame-nanos'
  | 'infinite-transition'
  | 'none';

export type Phase = 'v1' | 'v2';
export type NodeKind = 'render-target' | 'modifier' | 'driver';

export type Status = 'supported' | 'planned' | 'out-of-scope';

/** none = inert/decorative · self = self-gesturing system component · fx = fx-managed (may demand expo-view). */
export type Interaction = 'none' | 'self' | 'fx';

// ── one rung of the fallback ladder ──────────────────────────────────

export interface Lowering {
  via: Via;
  /** when via:'native' — the concrete symbol, e.g. 'MeshGradient', '.glassEffect'. */
  primitive?: string;
  /** the attachment mechanism / where it applies, e.g. '.colorEffect',
   *  'RenderEffect', '.overlay', 'graphicsLayer.renderEffect', 'MTLRenderPipelineState'. */
  applyVia?: string;
  /** when via:'shader' | 'lib' — the asset it needs. */
  asset?: Asset;
  /** time source when animated; null for static. */
  clock?: Clock;
  /** kind:'driver' rungs only — what this rung animates. The selector matches it to
   *  ctx.target ('content' | 'effect'); stated explicitly, not inferred from substrate. */
  target?: 'content' | 'effect';
  /** the guard — ALL fields must hold for this candidate to be eligible. */
  requires: {
    os: number;
    substrate: Substrate;
    feature?: string;
  };
  /** the phase THIS rung lands in; defaults to the node's `phase`. */
  phase?: Phase;
  status?: Status;
  note?: string;
}

// ── one IR node (capability) ─────────────────────────────────────────

export interface UniformSpec {
  type: 'number' | 'color' | 'vec2' | 'vec4' | 'enum';
  default: unknown;
  range?: [number, number];
  options?: string[];
}

export interface CapabilityNode {
  id: string;
  kind: NodeKind;
  interaction: Interaction;
  phase: Phase;
  uniforms?: Record<string, UniformSpec>;
  properties?: Record<string, UniformSpec>;
  lower: Record<Platform, Lowering[]>;
}

/** the selector's runtime context. `target` chooses a driver node's rung (content vs effect). */
export interface SelectCtx {
  deviceOS: number;
  wantInteractive?: boolean;
  target?: 'content' | 'effect';
  /** available feature flags (e.g. 'm3-expressive'). A rung whose requires.feature
   *  is not in this set is skipped. */
  features?: string[];
}

export interface CapabilityManifest {
  schemaVersion: 1;
  nodes: Record<string, CapabilityNode>;
}
