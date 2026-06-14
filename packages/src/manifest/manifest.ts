import type { CapabilityManifest } from './types';

/**
 * The capability manifest — the single source of truth for how every agnostic
 * effect node lowers to a native primitive per platform, what it requires, and
 * what it falls back to. Every consumer (adapter dispatch, substrate selection,
 * clock wiring, build scaffolding) is a pure function of this data.
 *
 * Authored `as const` so the per-effect typed config can be derived from each
 * node's `uniforms`/`properties` at the type level (see `./config`) — the
 * manifest stays the canonical declaration and TypeScript generates the config
 * types from it. The ladders are read top-to-bottom by `select()`; order them
 * best-first and let `requires` filter the rest.
 *
 * Where this and the native dispatch could drift, the lockstep is guarded by the
 * manifest conformance test, not by convention.
 */
export const manifest = {
  schemaVersion: 1,
  nodes: {
    // ── fill — gradients + mesh, decorative ──────────────────────────
    fill: {
      id: 'fill',
      kind: 'render-target',
      interaction: 'none',
      phase: 'v1',
      uniforms: {
        kind: { type: 'enum', default: 'gradient', options: ['gradient', 'mesh'] },
        colors: { type: 'color[]', default: ['#5B8CFF'] },
        angle: { type: 'number', default: 0 },
        width: { type: 'number', default: 4, range: [2, 10] },
        height: { type: 'number', default: 4, range: [2, 10] },
        drift: { type: 'number', default: 0, range: [0, 1] },
      },
      lower: {
        ios: [
          {
            via: 'native',
            primitive: 'MeshGradient',
            applyVia: '.overlay',
            clock: 'timeline',
            cadence: 'ambient',
            requires: { os: 18, substrate: 'hosted' },
            note: 'animated mesh vertices + colors',
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
            cadence: 'display-rate',
            requires: { os: 33, substrate: 'hosted' },
            note: 'mesh has no native primitive → AGSL',
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

    // ── material — glass / blur, self-gesturing ──────────────────────
    // iOS realizes the iOS-26 rung through UIKit (UIVisualEffectView + UIGlassEffect); see
    // FxGlassSurfaceView.swift. Android keeps an unblurred translucent floor so it never
    // degrades to a flat box.
    material: {
      id: 'material',
      kind: 'render-target',
      interaction: 'self',
      phase: 'v1',
      uniforms: {
        variant: { type: 'enum', default: 'regular', options: ['regular', 'clear'] },
        interactive: { type: 'boolean', default: false },
      },
      lower: {
        ios: [
          {
            via: 'native',
            primitive: 'UIGlassEffect',
            applyVia: 'UIVisualEffectView',
            requires: { os: 26, substrate: 'hosted' },
            note: 'Liquid Glass',
          },
          {
            via: 'native',
            primitive: '.ultraThinMaterial',
            applyVia: '.background',
            requires: { os: 15, substrate: 'hosted' },
            note: 'material fallback below 26',
          },
        ],
        android: [
          {
            via: 'native',
            primitive: 'RenderEffect.createBlurEffect',
            applyVia: 'View.setRenderEffect',
            requires: { os: 31, substrate: 'hosted' },
            note: 'own-content translucent stack + blur',
          },
          {
            via: 'lib',
            asset: 'none',
            applyVia: 'Haze',
            requires: { os: 21, substrate: 'hosted' },
            status: 'planned',
            note: 'true backdrop blur via optional peer — deferred',
          },
          {
            via: 'draw',
            requires: { os: 21, substrate: 'hosted' },
            note: 'translucent stack without blur — never a flat box',
          },
        ],
      },
    },

    // ── shader — curated + BYO, fx-managed interaction ───────────────
    // One node, both substrates: a hosted decorative rung and an expo-view
    // interactive rung; intended use selects. `intensity` is the only public
    // uniform — time/resolution/pressDepth/touch are native-owned. Its range and
    // default match the native clamp (both platforms clamp to 0–1, default 0.8).
    shader: {
      id: 'shader',
      kind: 'render-target',
      interaction: 'fx',
      phase: 'v1',
      uniforms: {
        intensity: { type: 'number', default: 0.8, range: [0, 1] },
      },
      lower: {
        ios: [
          {
            via: 'shader',
            asset: 'metal',
            applyVia: '.colorEffect',
            clock: 'timeline',
            cadence: 'ambient',
            requires: { os: 17, substrate: 'hosted' },
            note: 'decorative overlay (Aurora-class)',
          },
          {
            via: 'shader',
            asset: 'metal',
            applyVia: 'MTLRenderPipelineState',
            clock: 'display-link',
            cadence: 'display-rate',
            requires: { os: 17, substrate: 'expo-view' },
            note: 'interactive surface (G runtime)',
          },
        ],
        android: [
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'Paint.onDraw',
            clock: 'frame-nanos',
            cadence: 'display-rate',
            requires: { os: 33, substrate: 'hosted' },
            note: 'generative AGSL draws through a Paint in onDraw on a plain View',
          },
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'View.setRenderEffect',
            clock: 'frame-nanos',
            cadence: 'display-rate',
            requires: { os: 33, substrate: 'expo-view' },
            note: 'RenderNode-backed setRenderEffect; draw-time, touch-safe',
          },
        ],
      },
    },

    // ── filter — blur / saturation / contrast / …, modifier ──────────
    filter: {
      id: 'filter',
      kind: 'modifier',
      interaction: 'none',
      phase: 'v1',
      uniforms: {
        blur: { type: 'number', default: 0, range: [0, 50] },
        saturation: { type: 'number', default: 1, range: [0, 5] },
        contrast: { type: 'number', default: 1, range: [0, 3] },
        brightness: { type: 'number', default: 1, range: [0, 3] },
        hueRotate: { type: 'number', default: 0, range: [0, 360] },
        opacity: { type: 'number', default: 1, range: [0, 1] },
      },
      lower: {
        ios: [
          {
            via: 'native',
            primitive: '.blur / .saturation / .contrast / .brightness / .hueRotation / .opacity',
            applyVia: 'SwiftUI view modifiers (chained in EffectStack order)',
            requires: { os: 13, substrate: 'hosted' },
            note: 'applies to fx-owned layers only; never wraps live RN content',
          },
        ],
        android: [
          {
            via: 'native',
            primitive: 'RenderEffect chain',
            applyVia: 'graphicsLayer',
            requires: { os: 31, substrate: 'hosted' },
            note: 'draw-time; V1 keeps the fx-owned-layers rule',
          },
        ],
      },
    },

    // ── motion — the animatable-property driver ──────────────────────
    // A content rung (animate the fx-owned wrapper carrying RN content, touch-safe,
    // v2) and an effect rung (fx's own drawn layer, v1); the selector matches a
    // rung's `target`, not its substrate. Springs ease discrete targets, so there
    // is no perpetual clock — these rungs carry no `cadence`.
    motion: {
      id: 'motion',
      kind: 'driver',
      interaction: 'none',
      phase: 'v1',
      properties: {
        opacity: { type: 'number', default: 1, range: [0, 1] },
        scale: { type: 'number', default: 1, range: [0, 4] },
        translateX: { type: 'number', default: 0 },
        translateY: { type: 'number', default: 0 },
        rotate: { type: 'number', default: 0 },
      },
      lower: {
        ios: [
          {
            via: 'native',
            primitive: 'CASpringAnimation',
            applyVia: 'CALayer',
            clock: 'none',
            target: 'content',
            phase: 'v2',
            requires: { os: 17, substrate: 'expo-view' },
            note: 'render-server-first springs, SwiftUI.Spring integrator on retarget; transform-only ⇒ touch-safe',
          },
          {
            via: 'native',
            primitive: 'SwiftUI .animation',
            applyVia: '.animation',
            clock: 'none',
            target: 'effect',
            phase: 'v1',
            requires: { os: 16, substrate: 'hosted' },
            note: "fx's own drawn layer; SwiftUI spring",
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
            note: 'androidx.dynamicanimation; touch-safe',
          },
          {
            via: 'native',
            primitive: 'animate*AsState',
            applyVia: 'Compose',
            clock: 'infinite-transition',
            cadence: 'ambient',
            target: 'effect',
            phase: 'v1',
            requires: { os: 21, substrate: 'hosted' },
            note: "fx's own drawn layer; Jetpack Compose, M3 springs where present",
          },
        ],
      },
    },

    // ── source — a native scroll value driving presentation ──────────
    // The third driver node (target / clock / source). A native scroll position maps to
    // fx's own hosted effect tiles entirely in the render server — zero per-frame JS *and*
    // zero per-frame main-thread work, the guarantee that holds only on iOS hosted. The
    // rung drives fx-owned content, never wrapped RN content. Scroll is the clock,
    // so there is no perpetual loop and no `cadence`. Android's ladder is empty → {via:'none'}
    // (a separate later rung), as is the ambient-RN-scroll best-effort tier.
    source: {
      id: 'source',
      kind: 'driver',
      interaction: 'self',
      phase: 'v2',
      properties: {
        opacity: { type: 'number', default: 1, range: [0, 1] },
        scale: { type: 'number', default: 1, range: [0, 4] },
      },
      lower: {
        ios: [
          {
            via: 'native',
            primitive: 'ScrollView',
            applyVia: '.scrollTransition',
            clock: 'none',
            target: 'effect',
            requires: { os: 17, substrate: 'hosted' },
            note: "render-server scroll-linked presentation of fx's own hosted tiles; SwiftUI's standard edge transition is the default",
          },
        ],
        android: [],
      },
    },

    // ── symbol — SF Symbols on iOS; Android planned ──────────────────
    symbol: {
      id: 'symbol',
      kind: 'render-target',
      interaction: 'self',
      phase: 'v1',
      uniforms: {
        name: { type: 'string', default: 'heart' },
        animation: {
          type: 'enum',
          default: 'bounce',
          options: [
            'bounce',
            'pulse',
            'scale',
            'variableColor',
            'appear',
            'disappear',
            'breathe',
            'rotate',
            'wiggle',
          ],
        },
        trigger: { type: 'enum', default: 'value', options: ['value', 'state', 'repeat'] },
        replaceWith: { type: 'string', default: '' },
      },
      lower: {
        ios: [
          {
            via: 'native',
            primitive: '.symbolEffect',
            applyVia: '.symbolEffect',
            requires: { os: 17, substrate: 'hosted' },
            note: 'breathe/rotate/wiggle need 18; .contentTransition(.symbolEffect) for symbol→symbol',
          },
        ],
        android: [
          {
            via: 'lib',
            asset: 'lottie',
            applyVia: 'Lottie',
            requires: { os: 21, substrate: 'hosted' },
            status: 'planned',
            note: 'AVD/Lottie is a planned future lowering',
          },
        ],
      },
    },

    // ── content-distort — the platform asymmetry, encoded as data ────
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
            note: 'hosting RN content to sample it severs RN touch',
          },
        ],
        android: [
          {
            via: 'shader',
            asset: 'agsl',
            applyVia: 'RenderEffect',
            clock: 'frame-nanos',
            cadence: 'display-rate',
            requires: { os: 33, substrate: 'expo-view' },
            status: 'planned',
            note: 'RenderEffect is draw-time → touch survives; Android-only capability',
          },
        ],
      },
    },

    // ── shape-morph — Android-only, empty iOS ladder ─────────────────
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
            cadence: 'display-rate',
            requires: { os: 23, substrate: 'hosted', feature: 'm3-expressive' },
            note: 'M3 Expressive native shape morph (Android-only)',
          },
        ],
      },
    },
  },
} as const satisfies CapabilityManifest;
