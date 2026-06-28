import type { MaterialConfig, SymbolConfig } from './catalog';

/** Per-platform spring parameters. Omit a platform side to keep its tuned default. */
export type SpringSpec = {
  ios?: { duration?: number; bounce?: number };
  android?: { stiffness?: number; dampingRatio?: number };
};

/** Timing for one effect step or the whole stack. */
export type Transition = {
  duration?: number;
  delay?: number;
  easing?: string;
  spring?: SpringSpec;
};

/** Base fields shared by every step variant. */
interface BaseStep {
  readonly transition?: Transition;
}

interface GlowStep extends BaseStep {
  readonly id: 'edge-glow';
  readonly intensity?: number;
}

interface MeshStep extends BaseStep {
  readonly id: 'mesh-gradient';
  readonly intensity?: number;
}

interface GlassStep extends BaseStep {
  readonly id: 'glass';
  readonly config?: MaterialConfig;
  readonly intensity?: number;
}

/**
 * A symbol step — `name` is required (it is the visual identity, not optional config)
 * so a nameless symbol is unrepresentable at compile time. Symbol carries no `intensity`;
 * it is not a shader or fill, and its motion is driven by `trigger`/`animation` natively.
 */
export interface SymbolStep extends BaseStep {
  readonly id: 'symbol';
  readonly config: SymbolConfig;
}

/** All discriminated step id values in the V1 effect vocabulary. */
export type EffectStepId = GlowStep['id'] | MeshStep['id'] | GlassStep['id'] | SymbolStep['id'];

/**
 * One visual layer in an effect stack, discriminated on `id`.
 *
 * Each variant carries only the fields relevant to that render-target:
 * glass and symbol carry typed config; glow/mesh/glass carry intensity.
 * Symbol uses no `intensity` and routes through `symbolConfig`, not `effect`.
 *
 * `transition` is recorded for API stability; V1 does not apply it to native rendering
 * (no effect-transition channel exists on the substrate views).
 */
export type EffectStep = GlowStep | MeshStep | GlassStep | SymbolStep;

/**
 * An ordered set of visual effect layers produced by `fx.effect.*`. V1 holds exactly one
 * render-target step; the shape supports multiple steps for a future native compositor.
 *
 * `transition` is recorded for API stability; V1 does not apply it to native rendering.
 */
export interface EffectStack {
  readonly steps: readonly EffectStep[];
  readonly transition?: Transition;
}

/**
 * An immutable builder for `EffectStack` with chaining methods. Extends `EffectStack` so
 * it is directly accepted by `<Fx effect={…}>`. Obtained via `fx.effect.glow()`,
 * `fx.effect.glass()`, `fx.effect.mesh()`, or `fx.effect.symbol()`.
 *
 * Calling a second render-target method on a builder that already holds one step emits a
 * dev warning and returns the original builder unchanged — multi-layer compositing is
 * deferred to future native compositor support.
 *
 * `.animate()` and `.defaults()` record timing in the stack; V1 does not wire them to
 * native rendering (no effect-transition channel exists on the substrate views).
 */
export type EffectBuilder = EffectStack & {
  /** Adds a shader step (`edge-glow`). Warns and no-ops if a render-target step already exists. */
  glow(config?: { intensity?: number }): EffectBuilder;
  /** Adds a material step (`glass`). Warns and no-ops if a render-target step already exists. */
  glass(config?: MaterialConfig): EffectBuilder;
  /**
   * Adds a fill step (`mesh-gradient`), intensity only.
   * Warns and no-ops if a render-target step already exists.
   */
  mesh(config?: { intensity?: number }): EffectBuilder;
  /**
   * Adds a symbol step. `config.name` is required — a nameless symbol is a compile error,
   * not a runtime default. Warns and no-ops if a render-target step already exists.
   */
  symbol(config: SymbolConfig): EffectBuilder;
  /** Binds a timing override to the most recently added step. Safe to call on any builder. */
  animate(transition: Transition): EffectBuilder;
  /** Sets the stack-level timing default. */
  defaults(transition: Transition): EffectBuilder;
};

/** Clones and deep-freezes a `Transition`, including the per-platform `spring`. */
function freezeTransition(transition: Transition): Transition {
  const spring = transition.spring
    ? Object.freeze({
        ios: transition.spring.ios ? Object.freeze({ ...transition.spring.ios }) : undefined,
        android: transition.spring.android
          ? Object.freeze({ ...transition.spring.android })
          : undefined,
      })
    : undefined;
  return Object.freeze({ ...transition, spring });
}

/**
 * Clones and deep-freezes a step, including its nested `config` / `transition` payloads, so a
 * caller cannot mutate the stack by reference. The clone also decouples the stored payload
 * from the caller's original object.
 */
function freezeStep(step: EffectStep): EffectStep {
  if (step.id === 'glass') {
    return Object.freeze({
      ...step,
      config: step.config ? Object.freeze({ ...step.config }) : undefined,
      transition: step.transition ? freezeTransition(step.transition) : undefined,
    });
  }
  if (step.id === 'symbol') {
    return Object.freeze({
      ...step,
      config: Object.freeze({ ...step.config }),
      transition: step.transition ? freezeTransition(step.transition) : undefined,
    });
  }
  return Object.freeze({
    ...step,
    transition: step.transition ? freezeTransition(step.transition) : undefined,
  });
}

function makeBuilder(steps: EffectStep[], stackTransition?: Transition): EffectBuilder {
  // Freeze the array, each step, and the nested config/transition so the guard cannot be
  // bypassed by mutating the returned stack; value semantics are enforced, not just claimed.
  const frozenSteps = Object.freeze(steps.map(freezeStep));
  const builder: EffectBuilder = {
    steps: frozenSteps,
    transition: stackTransition ? freezeTransition(stackTransition) : undefined,
    glow(config) {
      return addRenderTarget(builder, { id: 'edge-glow', intensity: config?.intensity });
    },
    glass(config) {
      return addRenderTarget(builder, { id: 'glass', config });
    },
    mesh(config) {
      return addRenderTarget(builder, { id: 'mesh-gradient', intensity: config?.intensity });
    },
    symbol(config) {
      return addRenderTarget(builder, { id: 'symbol', config });
    },
    animate(transition) {
      if (frozenSteps.length === 0) return builder;
      const newSteps = [...frozenSteps] as EffectStep[];
      newSteps[newSteps.length - 1] = {
        ...newSteps[newSteps.length - 1],
        transition,
      } as EffectStep;
      return makeBuilder(newSteps, stackTransition);
    },
    defaults(transition) {
      return makeBuilder([...frozenSteps], transition);
    },
  };
  return Object.freeze(builder);
}

function addRenderTarget(current: EffectBuilder, step: EffectStep): EffectBuilder {
  if (current.steps.length > 0) {
    if (__DEV__) {
      console.warn(
        'fx: multi-layer effect composition is not supported in V1. The second render-target step is ignored. Pass a single fx.effect.* call to <Fx effect={…}>.'
      );
    }
    return current;
  }
  return makeBuilder([step]);
}

/** Produces an immutable one-step stack with a shader step (`edge-glow`). */
export function glow(config?: { intensity?: number }): EffectBuilder {
  return makeBuilder([{ id: 'edge-glow', intensity: config?.intensity }]);
}

/** Produces an immutable one-step stack with a material step (`glass`). */
export function glass(config?: MaterialConfig): EffectBuilder {
  return makeBuilder([{ id: 'glass', config }]);
}

/**
 * Produces an immutable one-step stack with a fill step (`mesh-gradient`), intensity only.
 * Full fill configuration (colors, angle, kind) is deferred until the fill renderer
 * gains complete config support.
 */
export function mesh(config?: { intensity?: number }): EffectBuilder {
  return makeBuilder([{ id: 'mesh-gradient', intensity: config?.intensity }]);
}

/**
 * Produces an immutable one-step stack with a symbol step. `config.name` is required —
 * it is the visual identity of the symbol, not optional config. Symbol is terminal:
 * the builder emits a dev warn and no-ops if chained onto an existing render-target.
 */
export function symbol(config: SymbolConfig): EffectBuilder {
  return makeBuilder([{ id: 'symbol', config }]);
}
