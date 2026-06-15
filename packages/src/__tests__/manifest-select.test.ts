import { manifest } from '../manifest';
import { select } from '../manifest/select';

// ── helpers ──────────────────────────────────────────────────────────

const ios = 'ios';
const android = 'android';

describe('select()', () => {
  // ── basic selection ────────────────────────────────────────────

  it('returns the first satisfiable rung', () => {
    const result = select(manifest.nodes.shader, ios, { deviceOS: 18 });
    expect(result.via).toBe('shader');
    expect(result.requires.substrate).toBe('hosted');
  });

  it('returns the first rung whose OS guard holds', () => {
    const result = select(manifest.nodes.fill, ios, { deviceOS: 17 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('LinearGradient');
  });

  // ── status: planned ────────────────────────────────────────────

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
    const result = select(manifest.nodes['content-distort'], ios, { deviceOS: 18 });
    expect(result.via).toBe('none');
  });

  // ── OS guard ───────────────────────────────────────────────────

  it('skips rungs whose OS guard exceeds the device', () => {
    const result = select(manifest.nodes.fill, android, { deviceOS: 30 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('Brush.sweepGradient');
  });

  it('returns none when all rungs are OS-guarded out', () => {
    const result = select(manifest.nodes.fill, ios, { deviceOS: 12 });
    // MeshGradient needs 18, LinearGradient needs 13 — both exceed 12
    expect(result.via).toBe('none');
  });

  // ── wantInteractive ────────────────────────────────────────────

  it('skips hosted rungs for fx interaction when wantInteractive is true', () => {
    const result = select(manifest.nodes.shader, ios, {
      deviceOS: 18,
      wantInteractive: true,
    });
    expect(result.via).toBe('shader');
    expect(result.requires.substrate).toBe('expo-view');
  });

  it('returns hosted rung for fx interaction when wantInteractive is false', () => {
    const result = select(manifest.nodes.shader, ios, {
      deviceOS: 18,
      wantInteractive: false,
    });
    expect(result.requires.substrate).toBe('hosted');
  });

  it('does not enforce expo-view for non-fx interaction nodes', () => {
    const result = select(manifest.nodes.fill, ios, {
      deviceOS: 18,
      wantInteractive: true,
    });
    // fill has interaction: 'none', so wantInteractive should not gate
    expect(result.primitive).toBe('MeshGradient');
    expect(result.requires.substrate).toBe('hosted');
  });

  // ── driver target matching ─────────────────────────────────────

  it('matches driver rung by target (effect, default)', () => {
    const result = select(manifest.nodes.motion, ios, { deviceOS: 18 });
    expect(result.target).toBe('effect');
    expect(result.primitive).toBe('SwiftUI .animation');
  });

  it('matches driver rung by explicit target: content', () => {
    const result = select(manifest.nodes.motion, ios, {
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
    const result = select(manifest.nodes['shape-morph'], ios, { deviceOS: 18 });
    expect(result.via).toBe('none');
  });

  it('degrades to via: none when required feature is not available', () => {
    // deviceOS 23 satisfies the M3 Expressive floor, so the feature flag is the only gate left
    const result = select(manifest.nodes['shape-morph'], android, { deviceOS: 23 });
    expect(result.via).toBe('none');
  });

  it('selects a rung when required feature is available', () => {
    const result = select(manifest.nodes['shape-morph'], android, {
      deviceOS: 23,
      features: ['m3-expressive'],
    });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('MaterialShapes (morph)');
  });

  // ── content-distort: the platform asymmetry ────────────────────

  it('resolves the Android content-distort rung at os 33+', () => {
    const result = select(manifest.nodes['content-distort'], android, { deviceOS: 34 });
    expect(result.via).toBe('shader');
    expect(result.applyVia).toBe('RenderEffect');
    expect(result.requires.substrate).toBe('expo-view');
  });

  it('degrades content-distort to via: none below Android 33', () => {
    const result = select(manifest.nodes['content-distort'], android, { deviceOS: 32 });
    expect(result.via).toBe('none');
  });

  it('keeps content-distort out-of-scope on iOS (via: none)', () => {
    // Hosting RN content to sample it severs RN touch — structurally out on iOS.
    expect(select(manifest.nodes['content-distort'], ios, { deviceOS: 18 }).via).toBe('none');
  });

  // ── material: Android ladder ───────────────────────────────────

  it('selects the blur rung for material on Android 31+', () => {
    const result = select(manifest.nodes.material, android, { deviceOS: 31 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('RenderEffect.createBlurEffect');
    expect(result.applyVia).toBe('View.setRenderEffect');
  });

  it('skips the planned Haze rung and degrades material to the unblurred stack below 31', () => {
    const result = select(manifest.nodes.material, android, { deviceOS: 30 });
    expect(result.via).toBe('draw');
  });

  it('never degrades material to a flat box on Android 21+', () => {
    const result = select(manifest.nodes.material, android, { deviceOS: 21 });
    expect(result.via).not.toBe('none');
  });

  it('selects the glass rung for material on iOS 26', () => {
    const result = select(manifest.nodes.material, ios, { deviceOS: 26 });
    expect(result.primitive).toBe('UIGlassEffect');
  });

  it('falls back to the system material for material below iOS 26', () => {
    const result = select(manifest.nodes.material, ios, { deviceOS: 18 });
    expect(result.primitive).toBe('.ultraThinMaterial');
  });

  // ── symbol: iOS supported, Android planned ─────────────────────

  it('selects symbol rung on iOS 17+', () => {
    const result = select(manifest.nodes.symbol, ios, { deviceOS: 17 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('.symbolEffect');
    expect(result.requires.substrate).toBe('hosted');
  });

  it('degrades to via: none for symbol on iOS below 17', () => {
    const result = select(manifest.nodes.symbol, ios, { deviceOS: 16 });
    expect(result.via).toBe('none');
  });

  it('skips planned rung for symbol on Android', () => {
    const result = select(manifest.nodes.symbol, android, { deviceOS: 34 });
    expect(result.via).toBe('none');
  });

  // ── source: iOS hosted render-server tier only ─────────────────

  it('selects the scroll source rung on iOS 17+', () => {
    const result = select(manifest.nodes.source, ios, { deviceOS: 17 });
    expect(result.via).toBe('native');
    expect(result.primitive).toBe('ScrollView');
    expect(result.applyVia).toBe('.scrollTransition');
    expect(result.target).toBe('effect');
    expect(result.requires.substrate).toBe('hosted');
  });

  it('degrades the scroll source to via: none below iOS 17', () => {
    const result = select(manifest.nodes.source, ios, { deviceOS: 16 });
    expect(result.via).toBe('none');
  });

  it('degrades the scroll source to via: none on Android (empty ladder)', () => {
    const result = select(manifest.nodes.source, android, { deviceOS: 34 });
    expect(result.via).toBe('none');
  });

  it('returns none when the scroll source is asked for the content target', () => {
    // The render-server tier drives fx's own effect, never wrapped RN content.
    const result = select(manifest.nodes.source, ios, { deviceOS: 18, target: 'content' });
    expect(result.via).toBe('none');
  });

  // ── non-driver nodes ignore target ─────────────────────────────

  it('ignores target for non-driver nodes', () => {
    const result = select(manifest.nodes.shader, ios, {
      deviceOS: 18,
      target: 'content',
    });
    expect(result.via).toBe('shader');
    expect(result.requires.substrate).toBe('hosted');
  });
});
