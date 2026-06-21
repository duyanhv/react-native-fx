import {
  edgeIn,
  edgeOut,
  effectiveMotion,
  identity,
  scale,
  toPresenceMotionWire,
  toStateMotionWire,
} from '../motion/builders';
import type { MotionSpec } from '../motion/types';

// ── the four V1 builders ─────────────────────────────────────────────

describe('fx.motion builders', () => {
  it('edgeIn slides from the named vertical edge and fades up', () => {
    expect(edgeIn({ from: 'bottom' })).toEqual({
      translateY: { measure: 'edge', edge: 'bottom' },
      opacity: 0,
    });
  });

  it('edgeIn routes a horizontal edge to translateX', () => {
    expect(edgeIn({ from: 'left' })).toEqual({
      translateX: { measure: 'edge', edge: 'left' },
      opacity: 0,
    });
  });

  it('edgeOut slides to the named edge with no implicit fade', () => {
    expect(edgeOut({ to: 'top' })).toEqual({ translateY: { measure: 'edge', edge: 'top' } });
  });

  it('scale carries the factor only', () => {
    expect(scale({ to: 1.03 })).toEqual({ scale: 1.03 });
  });

  it('identity is the empty shape', () => {
    expect(identity()).toEqual({});
  });
});

// ── the motion-map fallback ──────────────────────────────────────────

describe('effectiveMotion', () => {
  const userEnter: MotionSpec = { opacity: 0 };
  const presetEnter: MotionSpec = { scale: 0.9 };

  it('prefers the user spec', () => {
    expect(effectiveMotion('enter', { enter: userEnter }, { enter: presetEnter })).toBe(userEnter);
  });

  it('falls back to the preset spec', () => {
    expect(effectiveMotion('enter', {}, { enter: presetEnter })).toBe(presetEnter);
  });

  it('falls back to identity when neither has the phase', () => {
    expect(effectiveMotion('exit', { enter: userEnter }, { enter: presetEnter })).toEqual({});
  });

  it('does not reverse enter into a missing exit', () => {
    // no implicit reverse — a missing exit resolves to identity, never enter flipped
    expect(effectiveMotion('exit', { enter: userEnter })).toEqual({});
  });
});

// ── state motion wire ────────────────────────────────────────────────

describe('toStateMotionWire', () => {
  it('returns undefined when motion is undefined', () => {
    expect(toStateMotionWire(undefined)).toBeUndefined();
  });

  it('returns undefined when the map is empty', () => {
    expect(toStateMotionWire({})).toBeUndefined();
  });

  it('maps each state key to a wire entry', () => {
    const wire = toStateMotionWire({ idle: {}, selected: { scale: 1.03, translateY: -3 } });
    expect(wire).toEqual([
      { state: 'idle', spec: {} },
      { state: 'selected', spec: { scale: 1.03, translateY: { value: -3 } } },
    ]);
  });

  it('normalizes a measured token inside a state spec', () => {
    const wire = toStateMotionWire({ hidden: { translateY: { measure: 'edge', edge: 'bottom' } } });
    expect(wire).toEqual([{ state: 'hidden', spec: { translateY: { measureEdge: 'bottom' } } }]);
  });
});

// ── the native wire normalization ────────────────────────────────────

describe('toPresenceMotionWire', () => {
  it('returns undefined when no motion is set', () => {
    expect(toPresenceMotionWire(undefined)).toBeUndefined();
  });

  it('flattens a measured token to its edge and a fixed delta to a value', () => {
    const wire = toPresenceMotionWire({
      enter: { translateY: { measure: 'edge', edge: 'bottom' }, opacity: 0 },
      exit: { translateX: 24, scale: 0.95, rotate: 5 },
    });
    expect(wire).toEqual({
      enter: { translateY: { measureEdge: 'bottom' }, opacity: 0 },
      exit: { translateX: { value: 24 }, scale: 0.95, rotate: 5 },
    });
  });

  it('omits an absent phase so native can apply the preset fallback', () => {
    expect(toPresenceMotionWire({ enter: { opacity: 0 } })).toEqual({ enter: { opacity: 0 } });
  });
});
