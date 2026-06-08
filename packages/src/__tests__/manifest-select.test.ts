import { select } from '../manifest/select';
import type { CapabilityManifest } from '../manifest/types';

const fixture: CapabilityManifest = {
  schemaVersion: 1,
  nodes: {
    // ── shader: multi-rung with planned + out-of-scope rungs ──────────
    shader: {
      id: 'shader',
      kind: 'render-target',
      interaction: 'fx',
      phase: 'v1',
      lower: {
        ios: [
          {
            via: 'shader',
            asset: 'metal',
            applyVia: '.colorEffect',
            clock: 'timeline',
            requires: { os: 17, substrate: 'hosted' },
            note: 'decorative overlay',
          },
          {
            via: 'shader',
            asset: 'metal',
            applyVia: 'MTLRenderPipelineState',
            clock: 'display-link',
            requires: { os: 17, substrate: 'expo-view' },
            note: 'interactive surface',
          },
        ],
        android: [
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'RenderEffect',
            clock: 'frame-nanos',
            requires: { os: 33, substrate: 'hosted' },
          },
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'View.setRenderEffect',
            clock: 'frame-nanos',
            requires: { os: 33, substrate: 'expo-view' },
          },
        ],
      },
    },

    // ── content-distort: planned on Android, out-of-scope on iOS ──────
    'content-distort': {
      id: 'content-distort',
      kind: 'modifier',
      interaction: 'none',
      phase: 'v2',
      lower: {
        ios: [
          {
            via: 'native',
            primitive: '.layerEffect',
            requires: { os: 17, substrate: 'hosted' },
            status: 'out-of-scope',
            note: 'hosting RN content severs touch',
          },
        ],
        android: [
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'RenderEffect',
            clock: 'frame-nanos',
            requires: { os: 33, substrate: 'expo-view' },
            status: 'planned',
            note: 'RenderEffect is draw-time → touch survives',
          },
        ],
      },
    },

    // ── shape-morph: empty ladder on iOS ──────────────────────────────
    'shape-morph': {
      id: 'shape-morph',
      kind: 'render-target',
      interaction: 'none',
      phase: 'v2',
      lower: {
        ios: [],
        android: [
          {
            via: 'native',
            primitive: 'MaterialShapes (morph)',
            applyVia: 'graphicsLayer',
            clock: 'frame-nanos',
            requires: { os: 21, substrate: 'hosted', feature: 'm3-expressive' },
          },
        ],
      },
    },

    // ── motion: driver node with content + effect rungs ───────────────
    motion: {
      id: 'motion',
      kind: 'driver',
      interaction: 'none',
      phase: 'v1',
      lower: {
        ios: [
          {
            via: 'native',
            primitive: 'CASpringAnimation',
            applyVia: 'CALayer',
            clock: 'none',
            target: 'content',
            phase: 'v2',
            requires: { os: 13, substrate: 'expo-view' },
          },
          {
            via: 'native',
            primitive: 'SwiftUI .animation',
            applyVia: '.animation',
            clock: 'none',
            target: 'effect',
            phase: 'v1',
            requires: { os: 16, substrate: 'hosted' },
          },
        ],
        android: [
          {
            via: 'native',
            primitive: 'SpringAnimation',
            applyVia: 'View (dynamicanimation)',
            clock: 'none',
            target: 'content',
            phase: 'v2',
            requires: { os: 21, substrate: 'expo-view' },
          },
          {
            via: 'native',
            primitive: 'animate*AsState',
            applyVia: 'Compose',
            clock: 'infinite-transition',
            target: 'effect',
            phase: 'v1',
            requires: { os: 21, substrate: 'hosted' },
          },
        ],
      },
    },

    // ── fill: OS-gated ladder with no special statuses ────────────────
    fill: {
      id: 'fill',
      kind: 'render-target',
      interaction: 'none',
      phase: 'v1',
      lower: {
        ios: [
          {
            via: 'native',
            primitive: 'MeshGradient',
            applyVia: '.overlay',
            clock: 'timeline',
            requires: { os: 18, substrate: 'hosted' },
          },
          {
            via: 'native',
            primitive: 'LinearGradient',
            applyVia: '.overlay',
            requires: { os: 13, substrate: 'hosted' },
            note: 'pre-18 fallback',
          },
        ],
        android: [
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'ShaderBrush',
            clock: 'frame-nanos',
            requires: { os: 33, substrate: 'hosted' },
          },
          {
            via: 'native',
            primitive: 'Brush.sweepGradient',
            applyVia: 'background',
            requires: { os: 21, substrate: 'hosted' },
            note: 'pre-33 fallback',
          },
        ],
      },
    },
  },
};

// ── helpers ──────────────────────────────────────────────────────────

const ios = 'ios';
const android = 'android';

describe('select()', () => {
  // ── basic selection ────────────────────────────────────────────

  it('returns the first satisfiable rung', () => {
    const result = select(fixture.nodes.shader, ios, { deviceOS: 18 });
    expect(result.via).toBe('shader');
    expect(result.requires.substrate).toBe('hosted');
  });

  it('returns the first rung whose OS guard holds', () => {
    const result = select(fixture.nodes.fill, ios, { deviceOS: 17 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('LinearGradient');
  });

  // ── status: planned ────────────────────────────────────────────

  it('skips status: planned rungs', () => {
    const result = select(fixture.nodes['content-distort'], android, { deviceOS: 34 });
    expect(result.via).toBe('none');
  });

  it('skips a planned rung and returns the next supported rung', () => {
    const node = {
      id: 'test',
      kind: 'render-target' as const,
      interaction: 'none' as const,
      phase: 'v1' as const,
      lower: {
        ios: [
          {
            via: 'native' as const,
            requires: { os: 13, substrate: 'hosted' as const },
            status: 'planned' as const,
          },
          {
            via: 'shader' as const,
            asset: 'metal' as const,
            requires: { os: 13, substrate: 'hosted' as const },
          },
        ],
        android: [],
      },
    };
    const result = select(node, ios, { deviceOS: 18 });
    expect(result.via).toBe('shader');
  });

  // ── status: out-of-scope ───────────────────────────────────────

  it('skips status: out-of-scope rungs', () => {
    const result = select(fixture.nodes['content-distort'], ios, { deviceOS: 18 });
    expect(result.via).toBe('none');
  });

  // ── OS guard ───────────────────────────────────────────────────

  it('skips rungs whose OS guard exceeds the device', () => {
    const result = select(fixture.nodes.fill, android, { deviceOS: 30 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('Brush.sweepGradient');
  });

  it('returns none when all rungs are OS-guarded out', () => {
    const result = select(fixture.nodes.fill, ios, { deviceOS: 12 });
    // MeshGradient needs 18, LinearGradient needs 13 — both exceed 12
    expect(result.via).toBe('none');
  });

  // ── wantInteractive ────────────────────────────────────────────

  it('skips hosted rungs for fx interaction when wantInteractive is true', () => {
    const result = select(fixture.nodes.shader, ios, {
      deviceOS: 18,
      wantInteractive: true,
    });
    expect(result.via).toBe('shader');
    expect(result.requires.substrate).toBe('expo-view');
  });

  it('returns hosted rung for fx interaction when wantInteractive is false', () => {
    const result = select(fixture.nodes.shader, ios, {
      deviceOS: 18,
      wantInteractive: false,
    });
    expect(result.requires.substrate).toBe('hosted');
  });

  it('does not enforce expo-view for non-fx interaction nodes', () => {
    const result = select(fixture.nodes.fill, ios, {
      deviceOS: 18,
      wantInteractive: true,
    });
    // fill has interaction: 'none', so wantInteractive should not gate
    expect(result.primitive).toBe('MeshGradient');
    expect(result.requires.substrate).toBe('hosted');
  });

  // ── driver target matching ─────────────────────────────────────

  it('matches driver rung by target (effect, default)', () => {
    const result = select(fixture.nodes.motion, ios, { deviceOS: 18 });
    expect(result.target).toBe('effect');
    expect(result.primitive).toBe('SwiftUI .animation');
  });

  it('matches driver rung by explicit target: content', () => {
    const result = select(fixture.nodes.motion, ios, {
      deviceOS: 18,
      target: 'content',
    });
    expect(result.target).toBe('content');
    expect(result.primitive).toBe('CASpringAnimation');
  });

  it('returns none when driver has no rung for the requested target', () => {
    const node = {
      id: 'driver-only-effect',
      kind: 'driver' as const,
      interaction: 'none' as const,
      phase: 'v1' as const,
      lower: {
        ios: [
          {
            via: 'native' as const,
            target: 'effect' as const,
            requires: { os: 13, substrate: 'hosted' as const },
          },
        ],
        android: [],
      },
    };
    const result = select(node, ios, { deviceOS: 18, target: 'content' });
    expect(result.via).toBe('none');
  });

  // ── empty / fully-guarded ladders ──────────────────────────────

  it('degrades to via: none for an empty ladder', () => {
    const result = select(fixture.nodes['shape-morph'], ios, { deviceOS: 18 });
    expect(result.via).toBe('none');
  });

  it('degrades to via: none when required feature is not available', () => {
    const result = select(fixture.nodes['shape-morph'], android, { deviceOS: 21 });
    expect(result.via).toBe('none');
  });

  it('selects a rung when required feature is available', () => {
    const result = select(fixture.nodes['shape-morph'], android, {
      deviceOS: 21,
      features: ['m3-expressive'],
    });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('MaterialShapes (morph)');
  });

  it('degrades to via: none when all rungs are planned or out-of-scope', () => {
    // content-distort on iOS: out-of-scope; on Android: planned
    expect(select(fixture.nodes['content-distort'], ios, { deviceOS: 18 }).via).toBe('none');
    expect(select(fixture.nodes['content-distort'], android, { deviceOS: 34 }).via).toBe('none');
  });

  // ── non-driver nodes ignore target ─────────────────────────────

  it('ignores target for non-driver nodes', () => {
    const result = select(fixture.nodes.shader, ios, {
      deviceOS: 18,
      target: 'content',
    });
    expect(result.via).toBe('shader');
    expect(result.requires.substrate).toBe('hosted');
  });
});
