import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CURATED_SHADER_IDS } from '../effects/catalog';
import { manifest } from '../manifest';
import type { NativeFxSurfaceProps } from '../runtime/FxSurfaceView.types';

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

describe('manifest fill node', () => {
  it('declares the gradient/mesh render-target', () => {
    const fill = manifest.nodes.fill;
    expect(fill.kind).toBe('render-target');
    expect(fill.interaction).toBe('none');
  });

  it('exposes no uniforms in V1 — intensity is a surface prop, not a node uniform', () => {
    expect(Object.keys(manifest.nodes.fill.uniforms)).toEqual([]);
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

describe('dragAxis prop plumbing (DEF-011 Phase 1)', () => {
  it('has dragAxis in NativeFxSurfaceProps as an optional union', () => {
    const props: Partial<NativeFxSurfaceProps> = {};
    props.dragAxis = 'horizontal';
    expect(props.dragAxis).toBe('horizontal');
    props.dragAxis = 'vertical';
    expect(props.dragAxis).toBe('vertical');
    props.dragAxis = 'both';
    expect(props.dragAxis).toBe('both');
    props.dragAxis = undefined;
    expect(props.dragAxis).toBeUndefined();
  });

  it('registers dragAxis as a native prop in FxModule.swift', () => {
    const swift = read('ios', 'FxModule.swift');
    expect(swift).toContain('"dragAxis"');
  });

  it('registers dragAxis as a native prop in FxModule.kt', () => {
    const kotlin = read(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'reactnativefx',
      'FxModule.kt'
    );
    expect(kotlin).toContain('"dragAxis"');
  });

  it('has axis-aware shouldFail predicate in FxPressHandler.swift', () => {
    const swift = read('ios', 'FxPressHandler.swift');
    expect(swift).toContain('"horizontal"');
    expect(swift).toContain('"vertical"');
    expect(swift).toContain('"both"');
  });

  it('has axis-aware shouldFail predicate in FxPressHandler.kt', () => {
    const kotlin = read(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'reactnativefx',
      'FxPressHandler.kt'
    );
    expect(kotlin).toContain('"horizontal"');
    expect(kotlin).toContain('"vertical"');
    expect(kotlin).toContain('"both"');
  });
});

describe('drag/tilt uniform ABI (DEF-011 Phase 2)', () => {
  it('appends drag and tilt to the Swift FxUniforms struct', () => {
    const swift = read('ios', 'FxSurfaceView.swift');
    expect(swift).toContain('var drag = SIMD2<Float>.zero');
    expect(swift).toContain('var tilt = SIMD2<Float>.zero');
  });

  it('appends drag and tilt to the MSL FxUniforms struct', () => {
    const metal = read('ios', 'Shaders', 'FxShaders.metal');
    expect(metal).toContain('float2 drag;');
    expect(metal).toContain('float2 tilt;');
  });

  it('adds drag and tilt to every [[stitchable]] signature', () => {
    const metal = read('ios', 'Shaders', 'FxShaders.metal');
    for (const id of CURATED_SHADER_IDS) {
      const functionName = `fx_stitchable_${underscored(id)}`;
      const start = metal.indexOf(functionName);
      expect(start).toBeGreaterThan(-1);
      const signatureEnd = metal.indexOf(')', start);
      const signature = metal.slice(start, signatureEnd + 1);
      expect(signature).toContain('float2 drag');
      expect(signature).toContain('float2 tilt');
    }
  });

  it('passes idle drag/tilt defaults from the hosted SwiftUI call site', () => {
    const swift = read('ios', 'FxShaderView.swift');
    expect(swift).toContain('.float2(0, 0)');
  });

  it('declares drag and tilt uniforms in the AGSL dots shader', () => {
    const agsl = read('android', 'src', 'main', 'assets', 'shaders', 'dots.agsl');
    expect(agsl).toContain('uniform vec2 drag;');
    expect(agsl).toContain('uniform vec2 tilt;');
  });
});

describe('drag/tilt masking math (DEF-011 Phase 2)', () => {
  const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

  function computeDragTilt(
    originUV: { x: number; y: number },
    currentUV: { x: number; y: number },
    dragAxis: 'horizontal' | 'vertical' | 'both'
  ): { drag: { x: number; y: number }; tilt: { x: number; y: number } } {
    const tilt = {
      x: clamp((currentUV.x - 0.5) * 2),
      y: clamp((currentUV.y - 0.5) * 2),
    };
    const dx = clamp(currentUV.x - originUV.x);
    const dy = clamp(currentUV.y - originUV.y);
    const drag =
      dragAxis === 'horizontal'
        ? { x: dx, y: 0 }
        : dragAxis === 'vertical'
          ? { x: 0, y: dy }
          : { x: dx, y: dy };
    return { drag, tilt };
  }

  it('computes full 2D tilt from the current pointer position', () => {
    const { tilt } = computeDragTilt({ x: 0.5, y: 0.5 }, { x: 0.75, y: 0.25 }, 'horizontal');
    expect(tilt).toEqual({ x: 0.5, y: -0.5 });
  });

  it('masks horizontal drag to the x axis only', () => {
    const { drag } = computeDragTilt({ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.9 }, 'horizontal');
    expect(drag.x).toBe(0.5);
    expect(drag.y).toBe(0);
  });

  it('masks vertical drag to the y axis only', () => {
    const { drag } = computeDragTilt({ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.9 }, 'vertical');
    expect(drag.x).toBe(0);
    expect(drag.y).toBeCloseTo(0.4);
  });

  it('keeps both components for dragAxis="both"', () => {
    const { drag } = computeDragTilt({ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.9 }, 'both');
    expect(drag.x).toBe(0.5);
    expect(drag.y).toBeCloseTo(0.4);
  });

  it('clamps drag and tilt to [-1, 1]', () => {
    const { drag, tilt } = computeDragTilt({ x: 0, y: 0 }, { x: 1, y: 1 }, 'both');
    expect(drag).toEqual({ x: 1, y: 1 });
    expect(tilt).toEqual({ x: 1, y: 1 });
  });

  it('returns zero drag when the pointer has not moved', () => {
    const { drag } = computeDragTilt({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 'both');
    expect(drag).toEqual({ x: 0, y: 0 });
  });
});
