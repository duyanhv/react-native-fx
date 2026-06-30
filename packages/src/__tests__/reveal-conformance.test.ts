import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { manifest } from '../manifest';

// The reveal spine is mostly native, so these tests read the native sources and the public surface
// directly — drift (a dropped scale axis, a leaked anchor prop) fails CI, not a device.

const pkgRoot = join(__dirname, '..', '..');
const read = (...segments: string[]): string => readFileSync(join(pkgRoot, ...segments), 'utf8');

describe('motion non-uniform scale channels', () => {
  it('exposes scaleX and scaleY on the motion node', () => {
    const properties = manifest.nodes.motion.properties as Record<
      string,
      { type: string; default?: number }
    >;
    expect(properties.scaleX).toEqual({ type: 'number', default: 1, range: [0, 4] });
    expect(properties.scaleY).toEqual({ type: 'number', default: 1, range: [0, 4] });
    // The uniform shorthand stays, so presence/state keep one knob.
    expect(properties.scale).toBeDefined();
  });

  it('drives independent scale axes in the iOS spring + driver', () => {
    const spring = read('ios', 'FxSpring.swift');
    expect(spring).toContain('var scaleX');
    expect(spring).toContain('var scaleY');
    // The polar read-back that collapsed non-uniform scale is gone; axes decompose independently.
    const driver = read('ios', 'FxAnimationDriver.swift');
    expect(driver).toContain('fxScaleX');
    expect(driver).toContain('fxScaleY');
    expect(driver).not.toContain('sqrt(a * a + c * c)');
    expect(driver).toContain('applyAnchorPoint');
  });

  it('drives independent scale axes + pivot in the Android driver', () => {
    const driver = read(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'reactnativefx',
      'FxAnimationDriver.kt'
    );
    expect(driver).toContain('val scaleX');
    expect(driver).toContain('val scaleY');
    expect(driver).toContain('seatPivot');
  });
});

describe('reveal native registration', () => {
  it('registers FxRevealView with open on both platforms', () => {
    const ios = read('ios', 'FxModule.swift');
    expect(ios).toContain('View(FxRevealView.self)');
    expect(ios).toContain('"open"');

    const android = read(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'reactnativefx',
      'FxModule.kt'
    );
    expect(android).toContain('View(FxRevealView::class)');
    expect(android).toContain('"open"');
  });
});

describe('reveal surface constraint — preset-owned target, no anchor prop', () => {
  const surface = read('src', 'surface', 'FxReveal.tsx');

  it('exposes the self-owned-shell vocabulary', () => {
    for (const token of ['open', 'collapsed', 'expanded', 'anchoredMorph']) {
      expect(surface).toContain(token);
    }
  });

  it('declares no public placement prop', () => {
    expect(surface).not.toMatch(/\bplacement\??\s*:/);
    expect(surface).not.toMatch(/placement=/);
    expect(surface).not.toContain('FxRevealPlacement');
  });

  it('declares no foreign-anchor prop', () => {
    // The hard surface constraint: the collapsed frame is the shell's own self-read frame, never a
    // cross-tree anchor lookup. A `from`/`anchor` prop must never appear.
    expect(surface).not.toMatch(/\banchor\??\s*:/);
    expect(surface).not.toMatch(/\bfrom\??\s*:/);
    expect(surface).not.toMatch(/anchor=\{/);
  });
});

describe('reveal chrome channel — IR-only, no public leakage', () => {
  it('has a cornerRadius property in manifest motion.properties', () => {
    const properties = manifest.nodes.motion.properties as Record<string, unknown>;
    expect(properties.cornerRadius).toBeDefined();
    expect((properties.cornerRadius as { type: string }).type).toBe('number');
  });

  it('does not expose cornerRadius as a public fx.motion field', () => {
    // The chrome channel is IR-only (like scaleX/scaleY). It must not appear in the
    // public fx.motion builder type or any exported surface API.
    const fxSrc = read('src', 'fx.ts');
    expect(fxSrc).not.toMatch(/\bcornerRadius\b/);
  });

  it('exposes no new public props on FxReveal', () => {
    const surface = read('src', 'surface', 'FxReveal.tsx');
    // Step 2 adds no public props — no radius, clip, chrome, border, or background prop.
    expect(surface).not.toMatch(/\bradius\??\s*:/);
    expect(surface).not.toMatch(/\bclip\??\s*:/);
    expect(surface).not.toMatch(/\bchrome\??\s*:/);
    expect(surface).not.toMatch(/\bborder\??\s*:/);
    expect(surface).not.toMatch(/\bbackground\??\s*:/);
  });

  it('installs Android chrome SpringForce before configuring it', () => {
    const view = read(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'reactnativefx',
      'FxRevealView.kt'
    );

    expect(view).toContain('anim.spring = SpringForce().apply');
    expect(view).not.toContain('anim.spring.stiffness');
  });
});
