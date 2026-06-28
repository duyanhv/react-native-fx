import type { EffectId } from '../effects/effects';
import { resolveEffect } from '../effects/effects';
import type { EffectStepId } from '../effects/stack';
import { fx } from '../fx';
import { manifest, select } from '../manifest';

/** Narrows a builder step id to its string-form `EffectId`; symbol has no string id. */
function asEffectId(id: EffectStepId): EffectId {
  if (id === 'symbol') throw new Error('symbol has no string effect id');
  return id;
}

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
    const step = fx.effect.glow({ intensity: 0.7 }).steps[0];
    expect(step.id).toBe('edge-glow');
    if (step.id === 'edge-glow') {
      expect(step.intensity).toBe(0.7);
    }
  });

  it('glass forwards MaterialConfig into the step', () => {
    const step = fx.effect.glass({ variant: 'clear', interactive: true }).steps[0];
    expect(step.id).toBe('glass');
    if (step.id === 'glass') {
      expect(step.config).toEqual({ variant: 'clear', interactive: true });
    }
  });

  it('glass forwards tint and colorScheme into the step', () => {
    const step = fx.effect.glass({ tint: '#ff6b6b', colorScheme: 'dark' }).steps[0];
    expect(step.id).toBe('glass');
    if (step.id === 'glass') {
      expect(step.config).toEqual({ tint: '#ff6b6b', colorScheme: 'dark' });
    }
  });

  it('mesh forwards intensity into the step', () => {
    const step = fx.effect.mesh({ intensity: 0.5 }).steps[0];
    expect(step.id).toBe('mesh-gradient');
    if (step.id === 'mesh-gradient') {
      expect(step.intensity).toBe(0.5);
    }
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
    const step = fx.effect
      .glass(config)
      .animate({ duration: 200, spring: { ios: { bounce: 0.2 } } }).steps[0];
    expect(step.id).toBe('glass');
    if (step.id === 'glass') {
      expect(Object.isFrozen(step.config)).toBe(true);
      // The stored config is a clone — it is not the caller's object.
      expect(step.config).not.toBe(config);
    }
    expect(Object.isFrozen(step.transition)).toBe(true);
    expect(Object.isFrozen(step.transition?.spring)).toBe(true);
    expect(Object.isFrozen(step.transition?.spring?.ios)).toBe(true);
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
    const fromBuilder = resolveEffect(asEffectId(step.id));
    const fromString = resolveEffect('edge-glow');
    expect(fromBuilder).toEqual(fromString);
    expect(fromBuilder.node).toBe('shader');
  });

  it('glass step id resolves to node:material, matching the string form', () => {
    const step = fx.effect.glass().steps[0];
    const fromBuilder = resolveEffect(asEffectId(step.id));
    const fromString = resolveEffect('glass');
    expect(fromBuilder).toEqual(fromString);
    expect(fromBuilder.node).toBe('material');
  });

  it('mesh step id resolves to node:fill, matching the string form', () => {
    const step = fx.effect.mesh().steps[0];
    const fromBuilder = resolveEffect(asEffectId(step.id));
    const fromString = resolveEffect('mesh-gradient');
    expect(fromBuilder).toEqual(fromString);
    expect(fromBuilder.node).toBe('fill');
  });

  it('each builder step id resolves to an existing manifest node', () => {
    for (const builder of [fx.effect.glow(), fx.effect.glass(), fx.effect.mesh()]) {
      const { node } = resolveEffect(asEffectId(builder.steps[0].id));
      expect(manifest.nodes[node]).toBeDefined();
    }
  });

  it('glow builder form selects the same substrate as the string form on iOS 17', () => {
    const step = fx.effect.glow().steps[0];
    const { node } = resolveEffect(asEffectId(step.id));
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

// ── Symbol step — factory ──────────────────────────────────────────────────

describe('fx.effect.symbol — factory', () => {
  it('produces a one-step stack with id symbol', () => {
    const stack = fx.effect.symbol({ name: 'heart', animation: 'bounce' });
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('symbol');
  });

  it('carries the SymbolConfig on the step', () => {
    const config = { name: 'star', animation: 'pulse' as const };
    const step = fx.effect.symbol(config).steps[0];
    expect(step.id).toBe('symbol');
    if (step.id === 'symbol') {
      expect(step.config).toEqual(config);
    }
  });

  // `name` is required at the type level — proven by the tsc-checked `SymbolNameIsRequired`
  // assertion in `manifest/config.ts` (the test suite cannot assert it; `__tests__` is excluded
  // from `tsc`).

  it('symbol step and its config are frozen', () => {
    const stack = fx.effect.symbol({ name: 'heart', animation: 'bounce' });
    expect(Object.isFrozen(stack)).toBe(true);
    expect(Object.isFrozen(stack.steps)).toBe(true);
    const step = stack.steps[0];
    expect(Object.isFrozen(step)).toBe(true);
    expect(step.id).toBe('symbol');
    if (step.id === 'symbol') {
      expect(Object.isFrozen(step.config)).toBe(true);
    }
  });
});

// ── Symbol step — resolution conformance ──────────────────────────────────

describe('fx.effect.symbol — resolution conformance', () => {
  it('manifest.nodes.symbol exists', () => {
    expect(manifest.nodes.symbol).toBeDefined();
  });

  it('symbol node selects the native rung on iOS 17', () => {
    const rung = select(manifest.nodes.symbol, 'ios', { deviceOS: 17, wantInteractive: false });
    expect(rung.via).not.toBe('none');
  });

  it('symbol node selects {via:none} on iOS below 17', () => {
    const rung = select(manifest.nodes.symbol, 'ios', { deviceOS: 16, wantInteractive: false });
    expect(rung.via).toBe('none');
  });

  it('symbol node selects {via:none} on Android (planned rung only)', () => {
    const rung = select(manifest.nodes.symbol, 'android', { deviceOS: 21, wantInteractive: false });
    expect(rung.via).toBe('none');
  });
});

// ── Symbol step — terminal guard ───────────────────────────────────────────

describe('fx.effect.symbol — terminal guard', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it('symbol + second render-target returns the original builder unchanged', () => {
    const original = fx.effect.symbol({ name: 'heart', animation: 'bounce' });
    const result = original.glow();
    expect(result).toBe(original);
  });

  it('symbol + second render-target does not add a step', () => {
    const stack = fx.effect.symbol({ name: 'heart', animation: 'bounce' }).glass();
    expect(stack.steps).toHaveLength(1);
    expect(stack.steps[0].id).toBe('symbol');
  });

  it('symbol + second render-target emits a dev warn', () => {
    fx.effect.symbol({ name: 'heart', animation: 'bounce' }).mesh();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('multi-layer'));
  });

  it('builder .symbol method goes through the terminal guard', () => {
    const original = fx.effect.glow();
    const result = original.symbol({ name: 'heart', animation: 'bounce' });
    expect(result).toBe(original);
  });
});
