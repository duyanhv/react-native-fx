import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CURATED_SHADER_IDS } from '../effects/catalog';
import { manifest } from '../manifest';

// The curated catalog (`CURATED_SHADER_IDS`) is the agnostic naming authority; every
// platform dispatch must cover it, or selecting an id silently renders the wrong shader.
// These tests read the native sources directly so drift fails CI, not a device.

const pkgRoot = join(__dirname, '..', '..');
const read = (...segments: string[]): string => readFileSync(join(pkgRoot, ...segments), 'utf8');

/** The native function/asset names underscore the hyphenated agnostic id. */
const underscored = (id: string): string => id.replace(/-/g, '_');

// The iOS interactive raster surface implements a documented subset (5 of 10); the rest
// have no raster fragment function and fire onFxError there. The hosted path does all 10.
const RASTER_SHADER_IDS = ['fractal-clouds', 'ink-smoke', 'liquid-chrome', 'loop', 'dots'] as const;

describe('curated shader catalog conformance', () => {
  it('lists ten unique curated ids', () => {
    expect(new Set(CURATED_SHADER_IDS).size).toBe(10);
  });

  it('has an MSL [[stitchable]] function for every id', () => {
    const metal = read('ios', 'Shaders', 'FxShaders.metal');
    for (const id of CURATED_SHADER_IDS) {
      expect(metal).toContain(`fx_stitchable_${underscored(id)}`);
    }
  });

  it('maps every id in the iOS hosted dispatch switch', () => {
    const swift = read('ios', 'FxShaderView.swift');
    for (const id of CURATED_SHADER_IDS) {
      expect(swift).toContain(`"${id}"`);
    }
  });

  it('maps every id in the Android AGSL dispatch switch', () => {
    const kotlin = read(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'reactnativefx',
      'FxShaderView.kt'
    );
    for (const id of CURATED_SHADER_IDS) {
      expect(kotlin).toContain(`"${id}"`);
    }
  });

  it('ships an .agsl asset file for every id', () => {
    for (const id of CURATED_SHADER_IDS) {
      const path = join(
        pkgRoot,
        'android',
        'src',
        'main',
        'assets',
        'shaders',
        `${underscored(id)}.agsl`
      );
      expect(existsSync(path)).toBe(true);
    }
  });

  it('covers its documented raster subset on the iOS interactive surface', () => {
    const surface = read('ios', 'FxSurfaceView.swift');
    for (const id of RASTER_SHADER_IDS) {
      expect(CURATED_SHADER_IDS).toContain(id);
      expect(surface).toContain(`"${id}"`);
    }
  });
});

describe('manifest shader node', () => {
  it('declares the fx-managed shader render-target', () => {
    const shader = manifest.nodes.shader;
    expect(shader.kind).toBe('render-target');
    expect(shader.interaction).toBe('fx');
  });

  it('exposes intensity as its only public uniform', () => {
    expect(Object.keys(manifest.nodes.shader.uniforms)).toEqual(['intensity']);
  });
});

describe('manifest source node', () => {
  it('declares the third driver, hosted-only and effect-targeted', () => {
    const source = manifest.nodes.source;
    expect(source.kind).toBe('driver');
    // The hosted ScrollView self-gestures.
    expect(source.interaction).toBe('self');
  });

  it('ships only the iOS render-server rung; Android is an empty ladder', () => {
    const source = manifest.nodes.source;
    expect(source.lower.android).toEqual([]);
    expect(source.lower.ios).toHaveLength(1);

    const rung = source.lower.ios[0];
    expect(rung.target).toBe('effect');
    expect(rung.requires).toEqual({ os: 17, substrate: 'hosted' });
    // Scroll is the clock — no perpetual loop, so no cadence.
    expect(rung.clock).toBe('none');
    expect('cadence' in rung).toBe(false);
  });
});
