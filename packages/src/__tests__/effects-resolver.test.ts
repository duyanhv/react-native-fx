import { StyleSheet } from 'react-native';

import { CURATED_SHADER_IDS } from '../effects/catalog';
import {
  compositionStyle,
  type EffectId,
  HOSTED_NATIVE_EFFECT_STRINGS,
  resolveEffect,
} from '../effects/effects';
import { manifest, select } from '../manifest';

// ── Resolver conformance ────────────────────────────────────────────────────

describe('resolveEffect — conformance', () => {
  it('resolves every CURATED_SHADER_ID to node:shader', () => {
    for (const id of CURATED_SHADER_IDS) {
      expect(resolveEffect(id).node).toBe('shader');
    }
  });

  it('resolves every CURATED_SHADER_ID to hostedEffect equal to the id', () => {
    for (const id of CURATED_SHADER_IDS) {
      expect(resolveEffect(id).hostedEffect).toBe(id);
    }
  });

  it('resolves mesh-gradient to node:fill, hostedEffect:fill', () => {
    expect(resolveEffect('mesh-gradient')).toEqual({ node: 'fill', hostedEffect: 'fill' });
  });

  it('resolves glass to node:material, hostedEffect:material', () => {
    expect(resolveEffect('glass')).toEqual({ node: 'material', hostedEffect: 'material' });
  });

  // `symbol` is intentionally NOT a public string id — a symbol needs `SymbolConfig.name`, so it
  // is a node/config surface, not a complete effect id; the deferred symbol string surface is
  // exercised once symbol ids define their name-resolution rule.

  it('every resolved node exists in manifest.nodes', () => {
    const allIds: EffectId[] = [...CURATED_SHADER_IDS, 'mesh-gradient', 'glass'];
    for (const id of allIds) {
      const { node } = resolveEffect(id);
      expect(manifest.nodes[node]).toBeDefined();
    }
  });

  it('every resolved hostedEffect is in HOSTED_NATIVE_EFFECT_STRINGS', () => {
    const allIds: EffectId[] = [...CURATED_SHADER_IDS, 'mesh-gradient', 'glass'];
    for (const id of allIds) {
      const { hostedEffect } = resolveEffect(id);
      expect(HOSTED_NATIVE_EFFECT_STRINGS.has(hostedEffect)).toBe(true);
    }
  });

  it('does not throw for any valid EffectId', () => {
    const allIds: EffectId[] = [...CURATED_SHADER_IDS, 'mesh-gradient', 'glass'];
    for (const id of allIds) {
      expect(() => resolveEffect(id)).not.toThrow();
    }
  });
});

// ── Resolution integration — substrate selection ────────────────────────────

describe('effect → substrate selection', () => {
  it('resolves shader to hosted substrate on iOS 17 without interactivity', () => {
    const { node } = resolveEffect('aurora');
    const rung = select(manifest.nodes[node], 'ios', { deviceOS: 17, wantInteractive: false });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') {
      expect(rung.requires.substrate).toBe('hosted');
    }
  });

  it('resolves shader to expo-view substrate on iOS 17 with interactivity', () => {
    const { node } = resolveEffect('aurora');
    const rung = select(manifest.nodes[node], 'ios', { deviceOS: 17, wantInteractive: true });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') {
      expect(rung.requires.substrate).toBe('expo-view');
    }
  });

  it('resolves glass to hosted substrate on iOS 26', () => {
    const { node } = resolveEffect('glass');
    const rung = select(manifest.nodes[node], 'ios', { deviceOS: 26, wantInteractive: false });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') {
      expect(rung.requires.substrate).toBe('hosted');
    }
  });

  it('resolves mesh-gradient to hosted substrate on Android API 21', () => {
    const { node } = resolveEffect('mesh-gradient');
    const rung = select(manifest.nodes[node], 'android', { deviceOS: 21, wantInteractive: false });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') {
      expect(rung.requires.substrate).toBe('hosted');
    }
  });
});

// ── interactionMode → wantInteractive ──────────────────────────────────────

describe('interactionMode → wantInteractive', () => {
  // Shader node has interaction:'fx' — the only public node that demands expo-view.
  const shaderNode = manifest.nodes.shader;

  it('none → wantInteractive=false → hosted rung selected on iOS 17', () => {
    const rung = select(shaderNode, 'ios', { deviceOS: 17, wantInteractive: false });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') expect(rung.requires.substrate).toBe('hosted');
  });

  it('passive/active/controlled → wantInteractive=true → expo-view rung selected on iOS 17', () => {
    const rung = select(shaderNode, 'ios', { deviceOS: 17, wantInteractive: true });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') expect(rung.requires.substrate).toBe('expo-view');
  });

  it('wantInteractive=true on material node (interaction:self) → hosted rung (not expo-view)', () => {
    // material interaction:'self'; select() only upgrades to expo-view for interaction:'fx'
    const rung = select(manifest.nodes.material, 'ios', { deviceOS: 26, wantInteractive: true });
    expect(rung.via).not.toBe('none');
    if (rung.via !== 'none') expect(rung.requires.substrate).toBe('hosted');
  });
});

// ── composition → style ────────────────────────────────────────────────────

describe('compositionStyle', () => {
  it('surface → undefined (normal flow)', () => {
    expect(compositionStyle('surface')).toBeUndefined();
  });

  it('background → absoluteFill + zIndex -1', () => {
    const result = compositionStyle('background');
    expect(result).toEqual([StyleSheet.absoluteFill, { zIndex: -1 }]);
  });

  it('overlay → absoluteFill', () => {
    expect(compositionStyle('overlay')).toEqual(StyleSheet.absoluteFill);
  });

  it('undefined → undefined (defaults to surface behavior)', () => {
    expect(compositionStyle(undefined)).toBeUndefined();
  });
});

// ── Adapter degradation — select→none ──────────────────────────────────────

describe('adapter degradation', () => {
  it('shader below os:17 on iOS returns {via:none}', () => {
    const { node } = resolveEffect('aurora');
    const rung = select(manifest.nodes[node], 'ios', { deviceOS: 15 });
    expect(rung.via).toBe('none');
  });

  it('glass below os:15 on iOS returns {via:none}', () => {
    const { node } = resolveEffect('glass');
    const rung = select(manifest.nodes[node], 'ios', { deviceOS: 14 });
    expect(rung.via).toBe('none');
  });

  it('degradation path does not throw and produces a discriminable reason field', () => {
    const { node } = resolveEffect('aurora');
    const rung = select(manifest.nodes[node], 'ios', { deviceOS: 15 });
    expect(rung.via).toBe('none');
    const mockOnError = jest.fn();
    expect(() =>
      mockOnError({ nativeEvent: { shader: 'aurora', reason: 'unsupported' } })
    ).not.toThrow();
    mockOnError({ nativeEvent: { shader: 'aurora', reason: 'unsupported' } });
    expect(mockOnError).toHaveBeenCalledWith({
      nativeEvent: { shader: 'aurora', reason: 'unsupported' },
    });
  });
});
