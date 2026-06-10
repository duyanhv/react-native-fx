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

/**
 * The animation vocabulary for the symbol effect.
 *
 * Discrete effects (bounce, pulse, scale, appear, disappear) fire once per trigger.
 * Indefinite effects (variableColor, breathe, rotate, wiggle) repeat while held.
 */
export type SymbolAnimation =
  | 'bounce'
  | 'pulse'
  | 'scale'
  | 'variableColor'
  | 'appear'
  | 'disappear'
  | 'breathe'
  | 'rotate'
  | 'wiggle';

/**
 * Structured configuration for a symbol effect.
 *
 * Carried as a Record across the Expo bridge; the native side never parses strings.
 * The JS surface resolves preset ids to this structured record before crossing.
 */
export type SymbolConfig = {
  name: string;
  animation: SymbolAnimation;
  trigger?: 'value' | 'state' | 'repeat';
  replaceWith?: string;
};
