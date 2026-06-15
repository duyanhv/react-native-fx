/**
 * The curated, build-time shader catalog. This list is the single runtime source
 * the `ShaderId` type derives from; the manifest conformance test holds it in
 * lockstep with the native MSL/AGSL dispatch switches and the on-disk assets.
 */
export const CURATED_SHADER_IDS = [
  'fractal-clouds',
  'ink-smoke',
  'liquid-chrome',
  'loop',
  'dots',
  'aurora',
  'noise-field',
  'plasma',
  'caustics',
  'edge-glow',
] as const;

/**
 * Curated, build-time shaders selected by id. The hosted dispatch in
 * `ios/FxShaderView.swift` and `android/…/FxShaderView.kt` maps each id to
 * its native function.
 */
export type ShaderId = (typeof CURATED_SHADER_IDS)[number];

/**
 * The glass variant vocabulary for the material effect.
 *
 * `regular` is the adaptive system glass; `clear` is the more transparent variant
 * for media-rich backdrops. Both realize the platform's own glass on iOS 26.
 */
export type MaterialVariant = 'regular' | 'clear';

/**
 * Structured configuration for the material effect's glass rung.
 *
 * Carried as a Record across the Expo bridge; the native side never parses strings.
 * `interactive` enables the system's own press response — the glass handles its own
 * gestures, so fx surfaces no press events for it.
 */
export type MaterialConfig = {
  variant?: MaterialVariant;
  interactive?: boolean;
  // TODO: tint, color scheme, and material fallback weight join this config when the
  // full material surface lands.
};

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
