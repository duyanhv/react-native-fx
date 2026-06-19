import { resolveEffect } from '../effects/effects';
import { fx } from '../fx';
import { manifest, select } from '../manifest';

// ── Factory functions ───────────────────────────────────────────────────────

describe('fx.effect factory functions', () => {
  it('glow produces a one-step stack with id edge-glow', () => {
    const stack = fx.effect.glow();
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('edge-glow');
  });

  it('glass produces a one-step stack with id glass', () => {
    const stack = fx.effect.glass();
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('glass');
  });

  it('mesh produces a one-step stack with id mesh-gradient', () => {
    const stack = fx.effect.mesh();
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('mesh-gradient');
  });

  it('glow forwards intensity into the step', () => {
    const stack = fx.effect.glow({ intensity: 0.7 });
    expect(stack.steps[0].intensity).toBe(0.7);
  });

  it('glass forwards MaterialConfig into the step', () => {
    const stack = fx.effect.glass({ variant: 'clear', interactive: true });
    expect(stack.steps[0].config).toEqual({ variant: 'clear', interactive: true });
  });

  it('mesh forwards intensity into the step', () => {
    const stack = fx.effect.mesh({ intensity: 0.5 });
    expect(stack.steps[0].intensity).toBe(0.5);
  });
});

// ── Value semantics ─────────────────────────────────────────────────────────

describe('EffectBuilder — value semantics', () => {
  it('each factory call returns a new object', () => {
    expect(fx.effect.glow()).not.toBe(fx.effect.glow());
    expect(fx.effect.glass()).not.toBe(fx.effect.glass());
    expect(fx.effect.mesh()).not.toBe(fx.effect.mesh());
  });

  it('animate returns a new builder and does not mutate the original', () => {
    const original = fx.effect.glow();
    const animated = original.animate({ duration: 300 });
    expect(animated).not.toBe(original);
    expect(original.steps[0].transition).toBeUndefined();
    expect(animated.steps[0].transition).toEqual({ duration: 300 });
  });

  it('defaults returns a new builder and does not mutate the original', () => {
    const original = fx.effect.glow();
    const withDefaults = original.defaults({ delay: 100 });
    expect(withDefaults).not.toBe(original);
    expect(original.transition).toBeUndefined();
    expect(withDefaults.transition).toEqual({ delay: 100 });
  });

  it('the builder implements EffectStack — steps and transition are present', () => {
    const stack = fx.effect.glow();
    expect(Array.isArray(stack.steps)).toBe(true);
    // transition is optional — absent on a fresh builder
    expect('transition' in stack || stack.transition === undefined).toBe(true);
  });

  it('the returned builder, its steps array, and each step are frozen', () => {
    // Freezing is what enforces the single-render-target guard — a consumer cannot bypass it
    // by mutating `stack.steps.push(...)` or `stack.steps[0].id`.
    const stack = fx.effect.glow();
    expect(Object.isFrozen(stack)).toBe(true);
    expect(Object.isFrozen(stack.steps)).toBe(true);
    expect(Object.isFrozen(stack.steps[0])).toBe(true);
  });

  it('nested config and transition payloads are cloned and deep-frozen', () => {
    const config = { variant: 'clear' as const };
    const stack = fx.effect
      .glass(config)
      .animate({ duration: 200, spring: { ios: { bounce: 0.2 } } });
    expect(Object.isFrozen(stack.steps[0].config)).toBe(true);
    expect(Object.isFrozen(stack.steps[0].transition)).toBe(true);
    expect(Object.isFrozen(stack.steps[0].transition?.spring)).toBe(true);
    expect(Object.isFrozen(stack.steps[0].transition?.spring?.ios)).toBe(true);
    // The stored config is a clone — it is not the caller's object.
    expect(stack.steps[0].config).not.toBe(config);
  });
});

// ── Single-render-target guard ──────────────────────────────────────────────

describe('EffectBuilder — single-render-target guard', () => {
  // The guard warns on every second render-target call; suppress it across the block so the
  // run stays quiet, and keep the spy for the assertion test.
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it('second render-target call returns the original builder unchanged', () => {
    const original = fx.effect.glow();
    const result = original.glass();
    expect(result).toBe(original);
  });

  it('second render-target call does not add a step', () => {
    const stack = fx.effect.glow().glass();
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('edge-glow');
  });

  it('second mesh call is also a no-op', () => {
    const stack = fx.effect.glass().mesh();
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('glass');
  });

  it('second render-target call emits a console.warn in dev', () => {
    fx.effect.glow().glass();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('multi-layer'));
  });
});

// ── animate / defaults ──────────────────────────────────────────────────────

describe('EffectBuilder — animate and defaults', () => {
  it('animate binds a transition to the last step', () => {
    const stack = fx.effect.glow().animate({ duration: 400, delay: 50 });
    expect(stack.steps[0].transition).toEqual({ duration: 400, delay: 50 });
  });

  it('defaults sets the stack-level transition', () => {
    const stack = fx.effect.mesh().defaults({ duration: 500 });
    expect(stack.transition).toEqual({ duration: 500 });
    expect(stack.steps[0].transition).toBeUndefined();
  });

  it('animate and defaults are independent', () => {
    const stack = fx.effect
      .glass({ variant: 'regular' })
      .animate({ delay: 200 })
      .defaults({ duration: 600 });
    expect(stack.steps[0].transition).toEqual({ delay: 200 });
    expect(stack.transition).toEqual({ duration: 600 });
  });
});

// ── Resolution conformance ──────────────────────────────────────────────────

describe('EffectBuilder — resolution conformance', () => {
  it('glow step id resolves to node:shader, matching the string form', () => {
    const step = fx.effect.glow().steps[0];
    const fromBuilder = resolveEffect(step.id);
    const fromString = resolveEffect('edge-glow');
    expect(fromBuilder).toEqual(fromString);
    expect(fromBuilder.node).toBe('shader');
  });

  it('glass step id resolves to node:material, matching the string form', () => {
    const step = fx.effect.glass().steps[0];
    const fromBuilder = resolveEffect(step.id);
    const fromString = resolveEffect('glass');
    expect(fromBuilder).toEqual(fromString);
    expect(fromBuilder.node).toBe('material');
  });

  it('mesh step id resolves to node:fill, matching the string form', () => {
    const step = fx.effect.mesh().steps[0];
    const fromBuilder = resolveEffect(step.id);
    const fromString = resolveEffect('mesh-gradient');
    expect(fromBuilder).toEqual(fromString);
    expect(fromBuilder.node).toBe('fill');
  });

  it('each builder step id resolves to an existing manifest node', () => {
    for (const builder of [fx.effect.glow(), fx.effect.glass(), fx.effect.mesh()]) {
      const { node } = resolveEffect(builder.steps[0].id);
      expect(manifest.nodes[node]).toBeDefined();
    }
  });

  it('glow builder form selects the same substrate as the string form on iOS 17', () => {
    const step = fx.effect.glow().steps[0];
    const { node } = resolveEffect(step.id);
    const fromBuilder = select(manifest.nodes[node], 'ios', {
      deviceOS: 17,
      wantInteractive: false,
    });
    const { node: stringNode } = resolveEffect('edge-glow');
    const fromString = select(manifest.nodes[stringNode], 'ios', {
      deviceOS: 17,
      wantInteractive: false,
    });
    expect(fromBuilder).toEqual(fromString);
  });
});
