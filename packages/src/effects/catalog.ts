/**
 * Curated, build-time shaders selected by id. The hosted dispatch in
 * `ios/FxShaderView.swift` and `android/…/FxShaderView.kt` maps each id to
 * its native function.
 */
export type ShaderId =
  | 'fractal-clouds'
  | 'ink-smoke'
  | 'liquid-chrome'
  | 'loop'
  | 'dots'
  | 'aurora'
  | 'noise-field'
  | 'plasma'
  | 'caustics'
  | 'edge-glow';
