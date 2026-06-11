# data-layer.md — Materialized Data Layer for fx Implementation

*Scope: the actual values that populate the architecture — manifest data, presets, tune formulas, vocabularies, shader catalog, resolved inconsistencies, and confirmed decisions. Read `blueprint.md` (build order) and `architecture.md` (system structure) first; this file supplies the data the architecture consumes.*

> **Breadcrumb conventions:** `[research: <doc-id> §<section>]` = fx research doc. `[ref: <repo>/<path>:<line>]` = battle-tested precedent in `../references/`. `[finding]` = conclusion from cross-referencing. `[device-pending]` = value is provisioned, must be verified on device.

---

## §1 CapabilityManifest Data (G1, M1)

> **[research: 02 §The schema]** The manifest is TypeScript — it doubles as the runtime type consumers import.
> **[research: 02 §Worked examples]** Worked examples exist for `fill`, `shader`, `material`, `motion`, `content-distort`, `shape-morph`.
> **[research: 23-filters.md §Lowering]** `filter` rungs.
> **[research: 24-symbols.md §Lowering]** `symbol` rungs.
> **[finding: U2-003]** The **canonical executable manifest now ships** at
> `packages/src/manifest/manifest.ts` (authored `as const`; typed config derived in
> `config.ts`; held in lockstep with the native dispatch by the conformance test). The block
> below is the design rendering; where the two differ, the shipped file is canonical. Its
> rungs are reconciled to the shipped native — iOS material is UIKit `UIGlassEffect` /
> `UIVisualEffectView`, the Android `shader` hosted rung draws through `Paint.onDraw`, and
> Android material keeps an unblurred `draw` floor. `cadence` annotates each animated rung.

### Shared types

```ts
export type Platform  = 'ios' | 'android';
export type Substrate = 'hosted' | 'expo-view';
export type Via       = 'native' | 'shader' | 'draw' | 'lib' | 'none';
export type Asset     = 'metal' | 'agsl' | 'lottie' | 'none';
export type Clock     = 'timeline' | 'display-link' | 'frame-nanos' | 'infinite-transition' | 'none';
export type Cadence   = 'ambient' | 'display-rate' | 'static';   // coarse scheduling hint above `clock`
export type Phase     = 'v1' | 'v2';
export type NodeKind  = 'render-target' | 'modifier' | 'driver';
export type Status    = 'supported' | 'planned' | 'out-of-scope';
export type Interaction = 'none' | 'self' | 'fx';

export interface Lowering {
  via: Via;
  primitive?: string;
  applyVia?: string;
  asset?: Asset;
  clock?: Clock;
  cadence?: Cadence;        // loop-frequency class when the rung animates (02 decision 16)
  target?: 'content' | 'effect';
  requires: { os: number; substrate: Substrate; feature?: string };
  phase?: Phase;
  status?: Status;
  note?: string;
}

// UniformSpec types are canonical in 02 (§The schema). `'string'` carries open text
// (a symbol name, a BYO id); `range`/`options` are read-only so the manifest authors `as const`.
export interface UniformSpec {
  type: 'number' | 'string' | 'boolean' | 'color' | 'color[]' | 'vec2' | 'vec4' | 'enum';
  default: unknown;
  range?: readonly [number, number];
  options?: readonly string[];
}

export interface CapabilityNode {
  id: string;
  kind: NodeKind;
  interaction: Interaction;
  phase: Phase;
  uniforms?: Record<string, UniformSpec>;
  properties?: Record<string, UniformSpec>;
  lower: Record<Platform, readonly Lowering[]>;
}

export interface SelectCtx {
  deviceOS: number;
  wantInteractive?: boolean;
  target?: 'content' | 'effect';
}

export interface CapabilityManifest {
  schemaVersion: 1;
  nodes: Record<string, CapabilityNode>;
}
```

### Manifest data

```ts
const manifest: CapabilityManifest = {
  schemaVersion: 1,
  nodes: {

    // ──────────────────────────────────────────────────────────────
    // fill (render-target, decorative, gradients + mesh)
    // [research: 20-fills.md]
    // [research: 02 §fill worked example]
    fill: {
      id: 'fill', kind: 'render-target', interaction: 'none', phase: 'v1',
      uniforms: {
        kind:    { type: 'enum',   default: 'gradient', options: ['gradient', 'mesh'] },
        colors:  { type: 'color[]', default: ['#5B8CFF'] },  // gradient/mesh color stops; array of hex strings
        stops:   { type: 'number', default: undefined, range: [0, 1] },
        angle:   { type: 'number', default: 0 },
        width:   { type: 'number', default: 4,  range: [2, 10] },    // mesh grid width
        height:  { type: 'number', default: 4,  range: [2, 10] },    // mesh grid height
        drift:   { type: 'number', default: 0,  range: [0, 1] },     // mesh vertex animation
      },
      lower: {
        ios: [
          { via: 'native', primitive: 'MeshGradient', applyVia: '.overlay', clock: 'timeline',
            requires: { os: 18, substrate: 'hosted' }, note: 'animated mesh vertices + colors' },
          { via: 'native', primitive: 'LinearGradient', applyVia: '.overlay',
            requires: { os: 13, substrate: 'hosted' }, note: 'pre-18 fallback' },
        ],
        android: [
          { via: 'shader', asset: 'agsl', applyVia: 'ShaderBrush', clock: 'frame-nanos',
            requires: { os: 33, substrate: 'hosted' }, note: 'mesh has no native primitive → AGSL' },
          { via: 'native', primitive: 'Brush.sweepGradient', applyVia: 'background',
            requires: { os: 21, substrate: 'hosted' }, note: 'pre-33 fallback' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // material (render-target, self-gesturing, glass/blur)
    // [research: 21-materials-and-glass.md]
    // [research: 02 §material worked example]
    material: {
      id: 'material', kind: 'render-target', interaction: 'self', phase: 'v1',
      uniforms: {
        variant:     { type: 'enum', default: 'regular', options: ['regular', 'clear'] },
        interactive: { type: 'boolean',  default: false },    // system liquid press response
        tintColor:   { type: 'color', default: '#FFFFFF' },
        colorScheme: { type: 'enum', default: 'system', options: ['system', 'light', 'dark'] },
        intensity:   { type: 'number', default: 1, range: [0, 1] },
        weight:      { type: 'enum', default: 'regular', options: ['ultraThin', 'thin', 'regular', 'thick', 'chrome'] },
      },
      lower: {
        ios: [
          { via: 'native', primitive: 'UIGlassEffect', applyVia: 'UIVisualEffectView',
            requires: { os: 26, substrate: 'hosted' }, note: 'Liquid Glass (UIKit rung, U3-002)' },
          { via: 'native', primitive: '.ultraThinMaterial', applyVia: '.background',
            requires: { os: 15, substrate: 'hosted' }, note: 'pre-26 fallback' },
        ],
        android: [
          { via: 'native', primitive: 'RenderEffect.createBlurEffect', applyVia: 'View.setRenderEffect',
            requires: { os: 31, substrate: 'hosted' }, note: 'own-content translucent stack + blur' },
          { via: 'lib', asset: 'none', applyVia: 'Haze',
            requires: { os: 21, substrate: 'hosted' }, status: 'planned', note: 'pre-31 backport; optional peer dep' },
          { via: 'draw',
            requires: { os: 21, substrate: 'hosted' }, note: 'translucent stack without blur — never a flat box' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // shader (render-target, fx-managed interaction, curated + BYO)
    // [research: 22-shaders.md]
    // [research: 02 §shader worked example]
    shader: {
      id: 'shader', kind: 'render-target', interaction: 'fx', phase: 'v1',
      uniforms: {                                        // public JS-set uniforms
        intensity: { type: 'number', default: 0.8, range: [0, 1] },   // matches the native clamp
        colorA:    { type: 'color', default: '#5B8CFF' },
      },
      // [research: 50:129] `time`/`resolution` are native-injected and NEVER in the resolved record.
      // They are runtime uniforms, not public uniforms. The Metal struct (`FxUniforms`) carries
      // them natively; the manifest's `uniforms` block describes only what JS may set.
      lower: {
        ios: [
          { via: 'shader', asset: 'metal', applyVia: '.colorEffect', clock: 'timeline',
            requires: { os: 17, substrate: 'hosted' }, note: 'decorative overlay (Aurora-class)' },
          { via: 'shader', asset: 'metal', applyVia: 'MTLRenderPipelineState', clock: 'display-link',
            requires: { os: 17, substrate: 'expo-view' }, note: 'interactive surface (G runtime)' },
        ],
        android: [
          { via: 'shader', asset: 'agsl', applyVia: 'Paint.onDraw', clock: 'frame-nanos',
            requires: { os: 33, substrate: 'hosted' }, note: 'generative AGSL draws through a Paint in onDraw on a plain View' },
          { via: 'shader', asset: 'agsl', applyVia: 'View.setRenderEffect', clock: 'frame-nanos',
            requires: { os: 33, substrate: 'expo-view' },
            note: 'plain View/ViewGroup (RenderNode-backed setRenderEffect), not a Compose modifier; draw-time, touch-safe' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // filter (modifier, blur/saturation/contrast/brightness/hue/opacity)
    // [research: 23-filters.md §Lowering]
    filter: {
      id: 'filter', kind: 'modifier', interaction: 'none', phase: 'v1',
      uniforms: {
        blur:       { type: 'number', default: 0,  range: [0, 50] },
        saturation: { type: 'number', default: 1,  range: [0, 5] },
        contrast:   { type: 'number', default: 1,  range: [0, 3] },
        brightness: { type: 'number', default: 1,  range: [0, 3] },
        hueRotate:  { type: 'number', default: 0,  range: [0, 360] },
        opacity:    { type: 'number', default: 1,  range: [0, 1] },
      },
      lower: {
        ios: [
          { via: 'native', primitive: '.blur / .saturation / .contrast / .brightness / .hueRotation / .opacity',
            applyVia: 'SwiftUI view modifiers (chained in EffectStack order)',
            requires: { os: 13, substrate: 'hosted' },
            note: 'applies to fx-owned layers only; never wraps live RN content' },
        ],
        android: [
          { via: 'native', primitive: 'RenderEffect chain', applyVia: 'graphicsLayer',
            requires: { os: 31, substrate: 'hosted' },
            note: 'draw-time; could apply over live content but V1 keeps same rule' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // motion (driver, content + effect families)
    // [research: 41-motion-vocabulary.md]
    // [research: 02 §motion worked example]
    motion: {
      id: 'motion', kind: 'driver', interaction: 'none', phase: 'v1',   // [02:292] node phase = v1; per-rung phases override
      properties: {
        opacity:    { type: 'number', default: 1, range: [0, 1] },
        scale:      { type: 'number', default: 1, range: [0, 4] },
        translateX: { type: 'number', default: 0 },
        translateY: { type: 'number', default: 0 },
        rotate:     { type: 'number', default: 0 },
      },
      lower: {
        ios: [
           { via: 'native', primitive: 'CASpringAnimation', applyVia: 'CALayer', clock: 'none',
             target: 'content', phase: 'v2',
             requires: { os: 17, substrate: 'expo-view' },   // [02 Decision #14 — SwiftUI.Spring retarget solver floors the rung at 17 (DOC-009)]
             note: 'intermediate container inside FxSurfaceView; render-server-first springs, FxSpring integrator on retarget; transform-only → touch-safe' },
          { via: 'native', primitive: 'SwiftUI .animation', applyVia: '.animation', clock: 'none',
            target: 'effect', phase: 'v1',
            requires: { os: 16, substrate: 'hosted' },
            note: 'fx own drawn layer; SwiftUI spring' },
        ],
        android: [
           { via: 'native', primitive: 'SpringAnimation', applyVia: 'View (dynamicanimation)', clock: 'none',
             target: 'content', phase: 'v2',
             requires: { os: 21, substrate: 'expo-view' },
             note: 'intermediate container inside FxSurfaceView; androidx.dynamicanimation; touch-safe' },
          { via: 'native', primitive: 'animate*AsState', applyVia: 'Compose', clock: 'infinite-transition',
            target: 'effect', phase: 'v1',
            requires: { os: 21, substrate: 'hosted' },
            note: 'fx own drawn layer; Jetpack Compose / M3 springs' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // symbol (render-target, self-gesturing, SF Symbols; Android planned)
    // [research: 24-symbols.md §Lowering]
    symbol: {
      id: 'symbol', kind: 'render-target', interaction: 'self', phase: 'v1',   // iOS-native; Android planned
      uniforms: {
        name:       { type: 'string', default: 'heart' },  // SF Symbol name or drawable ref (open text)
        animation:  { type: 'enum',   default: 'bounce',
                      options: ['bounce', 'pulse', 'scale', 'variableColor', 'appear', 'disappear', 'breathe', 'rotate', 'wiggle'] },
        trigger:    { type: 'enum',   default: 'value', options: ['value', 'state', 'repeat'] },
        replaceWith: { type: 'string', default: '' },  // symbol→symbol content transition (open text)
      },
      lower: {
        ios: [
          { via: 'native', primitive: '.symbolEffect', applyVia: '.overlay',
            requires: { os: 17, substrate: 'hosted' },
            note: 'breathe/rotate/wiggle need 18; .contentTransition(.symbolEffect) for symbol→symbol' },
        ],
        android: [
          { via: 'native', primitive: 'AnimatedVectorDrawable', applyVia: 'AndroidView',
            requires: { os: 21, substrate: 'hosted' }, status: 'planned',
            note: 'future AVD fallback, simple animations only; Android symbol is deferred from V1' },
          { via: 'lib', asset: 'lottie', applyVia: 'Compose LottieAnimation',
            requires: { os: 21, substrate: 'hosted' }, status: 'planned',
            note: 'future Lottie optional peer dependency; Android symbol is deferred from V1' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // content-distort (modifier, effect-over-live-RN-content)
    // [research: 02 §content-distort worked example]
    // [research: 01 §iOS mutual exclusivity]
    'content-distort': {
      id: 'content-distort', kind: 'modifier', interaction: 'none', phase: 'v2',
      lower: {
        ios: [
          { via: 'native', primitive: '.layerEffect', requires: { os: 17, substrate: 'hosted' },
            status: 'out-of-scope', note: 'hosting RN content to sample it severs RN touch (01, rule #4)' },
        ],
        android: [
          { via: 'shader', asset: 'agsl', applyVia: 'RenderEffect', clock: 'frame-nanos',
            requires: { os: 33, substrate: 'expo-view' }, status: 'planned',
            note: 'RenderEffect is draw-time → touch survives; Android-only capability' },
        ],
      },
    },

    // ──────────────────────────────────────────────────────────────
    // shape-morph (render-target, Android-only M3 Expressive, iOS none)
    // [research: 02 §shape-morph worked example]
    // [research: structure.android.md §shape-morph]
    'shape-morph': {
      id: 'shape-morph', kind: 'render-target', interaction: 'none', phase: 'v2',
      lower: {
        ios: [],   // no native shape-morph on iOS → selector returns { via: 'none' }; [02:257] empty ladder is canonical
        android: [
          { via: 'native', primitive: 'MaterialShapes (morph)', applyVia: 'graphicsLayer',
            clock: 'frame-nanos',
            requires: { os: 21, substrate: 'hosted', feature: 'm3-expressive' },
            note: 'M3 Expressive native shape morph (Android-only)' },
        ],
      },
    },
  },
};
```

---

## §2 select() Implementation (G2, M2)

> **[research: 02 §The selection rule]**

```ts
/**
 * Selects the best satisfiable rung for a capability node on a given platform.
 * Walks the fallback ladder top-to-bottom, takes the first rung whose guard holds.
 * Unavailable → { via: 'none' }, never throws.
 *
 * [research: 02 §The selection rule lines 141-150]
 */
export function select(
  node: CapabilityNode,
  platform: Platform,
  ctx: SelectCtx = { deviceOS: 0, target: 'effect' },
): Lowering {
  const target = ctx.target ?? 'effect';
  const ladder = node.lower[platform] ?? [];

  for (const rung of ladder) {
    // [finding] out-of-scope rungs are skipped; the ladder continues
    // [research: 02 §The selection rule line 143]
    if (rung.status === 'out-of-scope') continue;

    // [finding] V1 runtime: planned rungs are provisionally excluded.
    //    **Provisioned candidate (ledger: SPINE-013, status = `open`).**
    //    Pending 02's decision on whether planned rungs are selectable,
    //    build-gated, or excluded from the executable manifest.
    //    The select() policy is a plane-7 provision, not an 02 decision.
    if (rung.status === 'planned') continue;

    // OS version gate
    // [research: 02 §The selection rule line 144]
    if (rung.requires.os > ctx.deviceOS) continue;

    // Interactive substrate routing
    // Only fx-managed interaction demands expo-view
    // [research: 02 §The selection rule lines 145-146]
    if (ctx.wantInteractive && node.interaction === 'fx' && rung.requires.substrate !== 'expo-view') continue;

    // Motion target matching
    // Driver rungs declare target:'content' | 'effect'
    // [research: 02 §The selection rule line 147]
    if (node.kind === 'driver' && rung.target && rung.target !== target) continue;

    // Optional feature gate
    // e.g. 'm3-expressive' for shape-morph on Android
    if (rung.requires.feature && !hasFeature(rung.requires.feature)) continue;

    return rung;
  }

  // Empty or guarded-out ladder → unavailable, never throw
  // [research: 02 §The selection rule line 149]
  return { via: 'none', requires: { os: 0, substrate: 'hosted' }, note: 'unavailable on this platform' };
}

/**
 * Feature detection. Resolves platform-specific capability flags.
 * V1 strategy: features are compiled-in constants known at build time.
 * If a feature flag is unknown, return false → rung guards out (safe default).
 *
 * Known features:
 *   'm3-expressive' — Android only, set to `true` when the app opts into
 *     Material 3 Expressive (via build config or runtime detection).
 *
 * Future: may become dynamic (e.g. checking AGSL extension availability),
 * but for V1 a build-time constant is sufficient.
 */
function hasFeature(feature: string): boolean {
  // [device-pending] V1: build-time constant; set to true in Android build config
  // when M3 Expressive is opted in. Unknown features → false (safe).
  return FEATURE_FLAGS[feature] ?? false;
}

/** Build-time feature flags. Populated by the build system or module config. */
const FEATURE_FLAGS: Record<string, boolean> = {
  // 'm3-expressive': true,  // set by Android build config
};
```

### Consumer usage

```ts
// Adapter dispatch — the component layer
// [research: 50 §Adapter dispatch]
const rung = select(manifest.nodes['shader'], 'ios', {
  deviceOS: 18,
  wantInteractive: interactionMode !== 'none',
});
// → { via: 'shader', asset: 'metal', applyVia: 'MTLRenderPipelineState', ... }

// Feature-detection — graceful degradation
const result = select(manifest.nodes['shape-morph'], 'ios', { deviceOS: 18 });
// → { via: 'none', ... }  // iOS has no shape-morph

// Motion — content vs effect routing
const contentRung = select(manifest.nodes['motion'], 'ios', {
  deviceOS: 17,
  target: 'content',
});
// → { via: 'native', primitive: 'CASpringAnimation', target: 'content', ... }

const effectRung = select(manifest.nodes['motion'], 'ios', {
  deviceOS: 17,
  target: 'effect',
});
// → { via: 'native', primitive: 'SwiftUI .animation', target: 'effect', ... }
```

---

## §3 Preset Default Catalog (G4, M3)

> **[research: 42 §The per-platform default catalog]**
> **[research: 41 §Verifying the law — operational test]**
> **[ref: apple docs — UISpringTimingParameters, SwiftUI Spring]**
> **[ref: android docs — SpringForce, M3 MotionScheme, snackbar/bottom-sheet/dialog]**

> **The per-platform shape, timing, and spring values in this table are device-pending and
> owned by [MOT-001](../decision-ledger.md#motion).** They are provisioned values, not
> ratified decisions. DOC-005 ratifies the adjacent vocabulary names (§5) only; the spring
> magnitudes and geometries will be validated on device and propagated to `41`/`42` by MOT-001.

### Presence presets (FxPresence)

> **[research: 42 §The presence preset catalog]**
> Presets are behavior-named (`transient`/`sheet`/`modal`), not UI-named (`toast`/`card`).
> The platform owns the geometry — same preset may differ in edge, origin, distance on iOS vs Android.
>
> **V1 ships `transient` only (DOC-018).** The `sheet`/`modal` rows below are the provisional
> catalog targets MOT-001 will device-fill; they are **deferred from the V1 surface** (they name
> screen-scale presentations that collide with presence's scope ceiling, `42`) and resurrect with
> that catalog. They remain here as MOT-001 territory, not V1 shipping values.

| Preset | Phase | iOS Source | iOS Shape | iOS Timing | Android Source | Android Shape | Android Timing |
|--------|-------|-----------|-----------|------------|----------------|---------------|----------------|
| `transient` | enter | System banner | Top edge slide-in, translateY = -view.height | 0.25s, dampingRatio=0.85, mass=1, stiffness=197, damping=17 [device-pending] | Snackbar | Bottom edge slide-up, translateY = view.height | 250ms, `DecelerateInterpolator(1.5)` |
| `transient` | exit | System banner | Top edge slide-out, translateY = -view.height | 0.20s, dampingRatio=0.85 [device-pending] | Snackbar | Bottom edge slide-down, translateY = view.height | 200ms, `AccelerateInterpolator(2.0)` |
| `transient` | hold | — | identity | platform idle | — | identity | platform idle |
| `sheet` | enter | `UISheetPresentationController` | Bottom edge → detent, translateY = view.height → 0 | 0.30s, dampingRatio=0.90 [device-pending] | `ModalBottomSheet` | Bottom edge slide-up, translateY = view.height → 0 | Spring: dampingRatio=0.85, stiffness=400 |
| `sheet` | exit | `UISheetPresentationController` | Bottom edge slide-out, translateY = view.height | 0.25s, dampingRatio=0.90 [device-pending] | `ModalBottomSheet` | Bottom edge slide-down, translateY = 0 → view.height | 250ms, `DecelerateInterpolator` |
| `sheet` | hold | — | identity | platform idle | — | identity | platform idle |
| `modal` | enter | Full-screen sheet | Center scale+fade, scale 0.9→1.0, opacity 0→1 | 0.35s, dampingRatio=0.85 [device-pending] | Dialog | Center scale+fade, scale 0.9→1.0, opacity 0→1 | 225ms, `DecelerateInterpolator` |
| `modal` | exit | Full-screen sheet | Center scale+fade, scale 1.0→0.9, opacity 1→0 | 0.30s, dampingRatio=0.85 [device-pending] | Dialog | Center scale+fade, scale 1.0→0.9, opacity 1→0 | 195ms, `AccelerateInterpolator` |
| `modal` | hold | — | identity | platform idle | — | identity | platform idle |

### State presets (FxView)

> **[research: 57 §FxView]** `lift` preset. States: `idle`, `selected`.

| Preset | State | iOS Shape | iOS Timing | Android Shape | Android Timing |
|--------|-------|-----------|------------|---------------|----------------|
| `lift` | `idle` | identity | — | identity | — |
| `lift` | `selected` | scale 1.03, translateY = -2px | 0.15s, dampingRatio=0.85 [device-pending] | scale 1.03, elevation +4dp | 150ms, `DecelerateInterpolator` |

### Feedback presets (FxPressable)

> **[research: 57 §FxPressable]** `native` feedback. Maps to platform press response.

| Feedback | Phase | iOS Response | Android Response |
|----------|-------|-------------|-----------------|
| `native` | press-in | scale 0.97 + opacity 0.8, 0.05s spring [device-pending] | ripple or scale 0.97, 100ms `DecelerateInterpolator` |
| `native` | press-out | spring back to identity, 0.10s [device-pending] | spring back, 150ms `DecelerateInterpolator` |

### Effect presets (Fx)

> **[research: 56 §The three preset-like bundles]** `edge-glow`, `mesh-gradient`, `glass`.

| Effect ID | Composition | What fx draws |
|-----------|-------------|---------------|
| `edge-glow` | `background` / `overlay` | shader: edge-lit glow around view bounds; catalog entry pending native implementation [research: 22] |
| `mesh-gradient` | `background` | fill: animated mesh gradient with palette, `MeshGradient` (iOS 18) / AGSL (Android 33) |
| `glass` | `surface` | material: Liquid Glass (iOS 26) / blur+overlay (Android); see §10 |
| `fractal-clouds` | `background` / `overlay` | shader: organic noise, slow drift, sky-to-cloud [ref: packages/ios/Shaders/FxShaders.metal:91] |
| `ink-smoke` | `background` / `overlay` | shader: diffused ink on warm paper [ref: packages/ios/Shaders/FxShaders.metal:106] |
| `liquid-chrome` | `background` / `overlay` | shader: reflective steel with specular streaks [ref: packages/ios/Shaders/FxShaders.metal:123] |
| `loop` | `background` / `overlay` | shader: diagonal iridescent stripes with edge glow [ref: packages/ios/Shaders/FxShaders.metal:143] |
| `dots` | `background` / `overlay` / `surface` | shader: wavy 3D dots, interactive finger bulge [ref: packages/ios/Shaders/FxShaders.metal:171] |
| `aurora` | `background` | shader: Aurora-class generative glow [research: 22 §ShaderId] |
| `noise-field` | `background` | shader: [research: 22 §ShaderId] |
| `plasma` | `background` / `overlay` | shader: [research: 22 §ShaderId] |
| `caustics` | `background` / `overlay` | shader: [research: 22 §ShaderId] |

> **Ratified by DOC-007.** The V1 shader catalog contains all ten ids above. The current
> package implements `fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`, and `dots`.
> `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow` need native MSL+AGSL
> implementations before package types/runtime expose them.

---

## §4 tune Scaling Formulas (M4)

> **[research: 41 §The preset / motion / tune / transition split]**
> `tune = { speed, emphasis, distance }` adjusts intent inside the platform family, never raw curves.
>
> **`tune` is deferred from the V1 surface (DOC-019).** These formulas are MOT-001/MOT-002
> territory — provisional, device-pending, and not shipped in V1. They resurrect with the
> device-tuned catalog; V1 exposes `preset`/`motion`/`transition` only.
> **[ref: apple docs — UISpringTimingParameters, SwiftUI Spring]**
> **[ref: android docs — SpringForce, M3 MotionScheme]**

### Platform spring defaults (content motion)

> **[research: structure.android.md line 127]** "M3 Expressive is progressive enhancement over the standard spring." Standard `SpringForce` defaults are the platform baseline; M3 Expressive springs run only behind the `feature:'m3-expressive'` gate.

| Parameter | iOS (CASpringAnimation) | Android (SpringAnimation, standard) |
|-----------|-------------------------|--------------------------|
| mass | 1.0 | 1.0 |
| stiffness | 197 | 1500 (`STIFFNESS_MEDIUM`) |
| damping | 17 | — |
| dampingRatio | 0.85 | 0.75 (`DAMPING_RATIO_MEDIUM_BOUNCY`) |
| initialVelocity | 0.0 | 0 |
| defaultDuration | 0.35s | ~0.5s (spring) / 300ms (tween) |

**M3 Expressive springs** (progressive enhancement, gated by `feature:'m3-expressive'` on Android): dampingRatio=0.85, stiffness=800 (default), 1400 (fast), 300 (slow). Not the default — `REAL-001` pins the concrete floor.

### speed scaling

> `speed` multiplies the animation duration. Applied to both spring and tween animations.

| speed value | duration multiplier |
|-------------|-------------------|
| `'fast'` | × 0.5 |
| `'normal'` | × 1.0 |
| `'slow'` | × 2.0 |

### emphasis scaling

> `emphasis` adjusts spring bounciness. Scales dampingRatio toward 0 (more bounce) or 1 (no bounce).

| emphasis value | iOS dampingRatio | Android dampingRatio (standard) |
|----------------|-----------------|---------------------|
| `'low'` | 1.0 (critically damped, no bounce) | 1.0 |
| `'medium'` | 0.85 (system spring, modest bounce) | 0.75 (`DAMPING_RATIO_MEDIUM_BOUNCY`) |
| `'high'` | 0.5 (bouncy) | 0.5 (`DAMPING_RATIO_HIGH_BOUNCY`) |

Formula:
```
iOS:     dampingRatio = 1.0 - (emphasisLevel * 0.5)
Android: dampingRatio = 1.0 - (emphasisLevel * 0.5)
where emphasisLevel = { low: 0.0, medium: 0.3, high: 1.0 }
```

### distance scaling

> `distance` scales the travel distance. Multiplies the measured edge travel.

| distance value | travel multiplier |
|----------------|-------------------|
| `'compact'` | × 0.5 |
| `'normal'` | × 1.0 |
| `'full'` | × 2.0 |

### Applying tune to a preset

```ts
// Effective timing for a presence enter animation:
// iOS, transient, enter, tune: { speed: 'fast', emphasis: 'medium' }
effectiveDuration = presetDuration * speedMultiplier   // 0.25s * 0.5 = 0.125s
effectiveDamping = emphasisDamping                      // 0.85
effectiveTravel  = measuredEdgeTravel * distanceMultiplier  // view.height * 1.0
```

---

## §5 State + Feedback + Effect Vocabularies (M5, M6, M7)

### FxView state vocabulary

> **[research: 57 §FxView]** State-driven presentation. States: `idle`, `selected` (per preset `lift`).
> **[research: 40 §The reactive / lifecycle channel]** `state` prop on `FxView`.

```tsx
<FxView preset="lift" state={selected ? 'selected' : 'idle'} motion={{
  idle:     fx.motion.identity(),
  selected: fx.motion.scale({ to: 1.03 }),
}} />
```

| Preset | Default States | Description |
|--------|---------------|-------------|
| `lift` | `idle`, `selected` | Selected state: scale 1.03, translateY = -2px |

### FxPressable feedback values

> **[research: 57 §FxPressable]** Feedback presets.

```tsx
<FxPressable feedback="native" onPress={...} />
```

| Feedback | Description |
|----------|-------------|
| `native` | Platform-native press response (iOS: subtle scale+opacity spring; Android: ripple + scale) |

### EffectStack composition

> **[research: 55 §How it works (data-first)] [research: 55 §EffectStep]**

```ts
interface EffectStep {
  node: 'fill' | 'shader' | 'material' | 'filter' | 'symbol';
  uniforms: Record<string, unknown>;
  transition?: Transition;
}

interface EffectStack {
  steps: EffectStep[];
  transition?: Transition;
}
```

```ts
// fx.effect.mesh({ palette: 'aurora' }).glass({ variant: 'regular' }).blur(8)
// → { steps: [
//   { node: 'fill',   uniforms: { kind: 'mesh', colors: auroraPalette, width: 4, height: 4 } },
//   { node: 'material', uniforms: { variant: 'regular' } },
//   { node: 'filter',  uniforms: { blur: 8 } },
// ]}
```

### Transition type

> **[research: 55 §Transition] [research: 41 Decision #11 — per-platform spring authoring (DOC-009)]**

```ts
type Transition = {
  duration?: number;    // ms
  delay?: number;       // ms
  easing?: string;      // 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  spring?: SpringSpec;  // overrides easing; mutually exclusive
};

/** Per-platform native spring authoring (41 Decision #11). Each side uses its platform's
 *  own parameterization; omitting a side keeps that platform's tuned default (the law).
 *  Bridge for internal conversion: bounce ≈ 1 − dampingRatio; stiffness ≈ (2π/duration)². */
type SpringSpec = {
  ios?: {
    duration?: number;  // seconds — the iOS 17 unified spring's perceptual duration
    bounce?: number;    // 0 (no bounce) … 1; negative = overdamped
  };
  android?: {
    stiffness?: number | 'high' | 'medium' | 'mediumLow' | 'low' | 'veryLow';        // SpringForce / Compose tokens
    dampingRatio?: number | 'highBouncy' | 'mediumBouncy' | 'lowBouncy' | 'noBouncy'; // SpringForce tokens
  };
};
```

---

## §5.1 Memoization Guidance (M9)

> **[research: 50/54/55 §Open questions — resolved (SURF-010, DOC-015)]**
> **[ledger: SURF-010 status = `resolved`]** This section materializes the guidance; the decision is
> closed in its owning plane-1 docs (`50`/`54`/`55` §Open questions). Inline builder literals create new objects each render. The native side handles re-configuration gracefully via per-prop equality checking (`previousProps`), so no manual memoization is required. React Compiler (recommended) handles it automatically.
>
> **Verified on SDK 56, iOS + Android (2026-06-08).** `previousProps` compares both primitive props and nested `Record` props by value, not JS object reference. A fresh `{ valueA: 99 }` object with the same effective value does not trigger the native setter. `@Field` defaults fill absent fields predictably on both platforms.

### Native-side safety net

> **[finding] Expo's `ExpoFabricView.updateProps` does per-prop equality checking via the `previousProps` dictionary. If the values inside an EffectStack/MotionSpec are equal, the setter is skipped and `viewDidUpdateProps` does no work.**
> [ref: expo/ios/Fabric/ExpoFabricView.swift:84]

```tsx
// ✅ Inline builder — works fine with or without React Compiler.
//    The native side compares values (not references) via previousProps.
//    If the EffectStack content hasn't changed, no native work is done.
<Fx effect={fx.effect.mesh({ palette: 'aurora' }).glass().blur(8)} />

// ✅ Inline motion spec — same reasoning
<FxPresence motion={{ enter: fx.motion.edgeIn({ from: 'bottom' }) }} />
```

### With React Compiler (recommended)

```tsx
// React Compiler automatically memoizes the builder chain → stable references.
// No manual useMemo/useCallback needed.
<Fx effect={fx.effect.mesh({ palette: 'aurora' }).glass().blur(8)} />
```

### Without React Compiler

```tsx
// Module-level constants for static presets — optional minor optimization.
// The native side handles inline builders correctly either way.
const ENTER_BOTTOM = fx.motion.edgeIn({ from: 'bottom' });
<FxPresence motion={{ enter: ENTER_BOTTOM }} />
```

### Rule

- **fx works with or without React Compiler** — native `previousProps` equality checking (diff-based, not reference-based) ensures unchanged props don't trigger native work. Verified on SDK 56: both primitive and nested `Record` props compare by value.
- **With React Compiler**: no action needed — automatic memoization
- **Without React Compiler**: module-level constants for static presets are an optional optimization; inline builders are safe — `previousProps` value-equality skips unchanged nested records.
- **EffectStack and MotionSpec are value objects** — each `fx.effect.*` / `fx.motion.*` call returns a new immutable instance; the native side compares *values*, not references
- **`useMemo`/`useCallback` are unnecessary** — confirmed on SDK 56, both platforms

### Entity Diagram (What Goes Where)

```
┌── src/manifest/ ───────────────────────┐
│ index.ts                (public API)   │
│ select.ts               (algorithm)    │
│ types.ts                (shared IR)    │
└────────────────────────────────────────┘
         │ imports nothing from src/
         │ consumed by everything
         ▼
┌── src/presets/ ────────────────────────┐
│ defaults.ts   (per-platform catalog)   │
│ palettes.ts   (named color sets)       │
│ themes.ts     (theme config)           │
└────────────────────────────────────────┘
         │ imports: manifest/
         ▼
┌── src/effects/  ─┐ ┌── src/motion/ ───┐
│ catalog.ts       │ │ MotionSpec.ts    │
│ types.ts         │ │ types.ts         │
└──────────────────┘ └──────────────────┘
         │ imports: manifest/
         ▼
┌── src/surface/ ────────────────────────┐
│ FxPresence.tsx │ FxView.tsx           │
│ FxPressable.tsx│ Fx.tsx              │
│ FxGroup.tsx    │ FxItem.tsx           │
└────────────────────────────────────────┘
         │ imports: presets/ + effects/ + motion/
         ▼
┌── src/runtime/ ────────────────────────┐
│ FxHostedView.tsx    (requireNativeView)│
│ FxSurfaceView.tsx   (requireNativeView)│
│ FxGroupView.tsx     (requireNativeView)│
└────────────────────────────────────────┘
         │ imports: surface/ + manifest/
         ▼
┌── src/index.ts ────────────────────────┐
│ Public API:                            │
│   export { FxPresence, FxView, ... }   │
│   export { fx } from '...'              │
└────────────────────────────────────────┘
```

> **[research: 22-shaders.md §Curated ShaderId union]**
> **[ref: packages/ios/Shaders/FxShaders.metal]**
> **[ref: packages/src/FxShader.types.ts]**

### V1 starter set (implemented)

| Shader ID | Metal Function | Description | Touch-Ready? |
|-----------|---------------|-------------|-------------|
| `fractal-clouds` | `fx_fractal_clouds` | Organic noise, slow drift, soft sky → white billows | Yes (MTKView interactive) |
| `ink-smoke` | `fx_ink_smoke` | Diffused, layered ink blooming on warm paper | Yes |
| `liquid-chrome` | `fx_liquid_chrome` | Reflective steel with moving specular streaks | Yes |
| `loop` | `fx_loop` | Diagonal iridescent light streaks, edge glow | Yes |
| `dots` | `fx_dots` | Wavy 3D dots, interactive finger bulge | Yes (`interactionMode: 'active'`) |

### Ratified catalog entries pending implementation

| Shader ID | Research | Description |
|-----------|----------|-------------|
| `aurora` | [research: 22] | Aurora-class generative glow |
| `noise-field` | [research: 22] | Noise-field generative shader |
| `plasma` | [research: 22] | Plasma-like generative shader |
| `caustics` | [research: 22] | Caustics-like generative shader |
| `edge-glow` | [research: 22] | Edge-lit glow around view bounds |

### Shader ID type (unified)

```ts
// V1 starter (implemented)
type V1ShaderId = 'fractal-clouds' | 'ink-smoke' | 'liquid-chrome' | 'loop' | 'dots';

// Ratified catalog entries pending native implementation
type PendingShaderId = 'aurora' | 'noise-field' | 'plasma' | 'caustics' | 'edge-glow';

// Unified
type ShaderId = V1ShaderId | PendingShaderId;
```

The package currently exposes only `V1ShaderId`. It should expose the unified `ShaderId`
after the five pending ids have native implementations on both platforms.

### Uniforms struct (shared across all curated shaders)

> **[ref: packages/ios/Shaders/FxShaders.metal:5-11]**

```c
// Metal
struct FxUniforms {
  float time;           // native-injected, never JS-set
  float2 resolution;    // native-injected, never JS-set
  float intensity;      // JS-set, 0..1
  float pressDepth;     // native-set by recognizer, 0..1
  float2 touch;         // native-set by recognizer, 0..1, y up
};
```

The V1 public shader uniform contract is shared and minimal: `intensity` is public;
`time`, `resolution`, `pressDepth`, and `touch` are native-owned runtime values. Per-shader
public uniform maps are out of V1.

---

## §7 BYO Asset Registration (M8) — Ratified Contract

> **[research: 22 §Decision 6]** The BYO registration contract is ratified in the owning source doc.
> **[research: 52 §Cross-platform shader asset bundling]**
> **[ledger: FX-006 status = `resolved` (U3-004, 2026-06-10).]**

### Registration API

```tsx
// 1. Define uniform table
const myShaderConfig = {
  id: 'my-shader',
  uniforms: {
    speed: { type: 'number', default: 0.5, range: [0, 2] },
    colorA: { type: 'color', default: '#FF5B8C' },
  },
};

// 2. Register with fx (build-time)
import { registerShader } from 'react-native-fx';
registerShader(myShaderConfig);

// 3. Use like any curated shader
<Fx effect="my-shader" uniforms={{ speed: 0.8 }} />
```

### Asset location

BYO assets live in the **fx package's** paths, not the app's:

```
packages/
├── ios/Shaders/
│   └── my-shader.metal         ← developer .metal file (fx package)
├── android/src/main/assets/shaders/
│   └── my-shader.agsl          ← developer .agsl file (fx package)
```

The app's own `ios/` or `android/` directories do not participate — the files must be present in the library's paths at build time so the existing bundling mechanic picks them up.

### Build integration

BYO uses the **same** build mechanism as curated shaders, with no special path. The single-home mechanic lives in `structure.ios.md` §shader and `52` Decision #2:

- **iOS**: `.metal` files compile into `default.metallib` via the existing podspec `resource_bundles` + `MTL_LIBRARY_OUTPUT_DIR` [research: 52 §Cross-platform shader asset bundling]
- **Android**: `.agsl` files ship as packaged assets and are compiled at runtime by `RuntimeShader` [research: 52 §Cross-platform shader asset bundling]
- **compile failure**: `onError` event fires → JS falls back gracefully [research: 22 §Events]

### V1 constraint

There is no config plugin in V1 (`DEF-013`/`SHIP-004` deferred), so BYO assets cannot be injected into the library's bundle from the app side at build time. They must be present in the fx package's resource paths before the library build runs. V2 may add a config plugin or a build-time copy step for app-side BYO asset placement.

### Consumption surface

BYO ids are consumed at the same call site as curated ids: the `effect` prop on `<Fx>`.
The `shader` node is the IR node; the `effect` prop is the JSX call site (`55`).

### Typing idiom

The `effect` prop boundary type is `ShaderId | (string & {})` — curated literals keep
autocomplete; registered BYO ids are admitted. `ShaderId` itself stays exactly the curated
union. The actual TypeScript change is an `implement` task.

### Unregistered-id behavior

Referencing an id that is neither curated nor registered → native compile/load fails
because the `.metal`/`.agsl` file is missing → `onError` fires with a descriptive error.
No hard crash.

### Missing platform guard-out

A BYO shader must supply both `.metal` and `.agsl` files. If one platform's file is
missing, that platform degrades to `{via:'none'}` (honest guard-out per the pair rule;
rule #2).

---

## §8 Inconsistencies Resolved (I1-I7)

> **[research: audit.md §HIGH — Internal Inconsistencies]**

### I1: `motion` node phase mismatch

**Resolution**: The node-level `phase` field is set to `'v1'` per `02:292`. Effect rungs override to `phase: 'v1'`, content rungs to `phase: 'v2'`. The node-level field is documentation, not dispatch — the selector reads `rung.phase`, not `node.phase`.
**Source**: [research: 02 §decision 11]

### I2: `tune` vocabulary mismatch

**Resolution**: `SpringTune` and `tune` are the same concept. `spring` in `SpringTune` maps to `emphasis` in `tune`. The canonical API is `tune = { speed, emphasis, distance }`. `SpringTune` is removed — use `Transition.spring` for raw spring params, `tune` for intent adjustment.
**Source**: [research: 41 §tune] [research: 55 §animate() binding rule]

### I3: Three "interaction" concepts collision

**Resolution**: Three distinct concepts, kept distinct:
- `node.interaction` ('none' | 'self' | 'fx') — manifest-level, determines substrate routing
- `interactionMode` prop ('none' | 'passive' | 'active' | 'controlled') — `<Fx>` component prop, determines recognizer attachment
- Substrate routing — derived from `node.interaction === 'fx' && ctx.wantInteractive`
**Source**: [research: 02 §Canonical IR node vocabulary] [research: 30 §interactionMode contract]

### I4: `symbol` composability rule

**Resolution**: `symbol` is terminal in the EffectStack builder. The TypeScript type enforces it — `EffectStep.node` excludes 'symbol' from multi-step stacks. A stack containing `symbol` can only hold that one render-target (filters may still apply).
**Source**: [research: 55 §EffectStep]

### I5: `content-distort` all-rungs-out-of-scope

**Resolution**: Selector skips `out-of-scope` rungs and continues the ladder. If ALL rungs on a platform are `out-of-scope`, returns `{ via: 'none' }`. This is correct — verified by the worked example in `02`.
**Source**: [research: 02 §content-distort worked example lines 243-253]

### I6: `shape-morph` empty iOS ladder

**Resolution**: Kept as empty array `ios: []` per `02:257`. An empty ladder produces `{ via: 'none' }` via the selector's fallback — the same result as an explicit `out-of-scope` rung. `02` uses empty array as canonical; data-layer.md matches exactly.
**Source**: [research: 02 §shape-morph worked example]

### I7: `via:'lib'` dependency contract

**Partially resolved**: The `via:'lib'` rung declares an **optional peer dependency** — the app installs it or the rung guards out. The install docs (`6-ship/53`) list optional peers. This is resolved per `53 §Decisions #6`.
**Provisioned candidate (ledger: SPINE-007, status = `open`):** whether the manifest names the package + version in `applyVia`/`asset` fields (e.g., `applyVia: 'Haze'`, `asset: 'lottie'`). The data-layer.md uses this naming approach as a provisioned candidate, pending 02's decision.
**Source**: [research: 02 §via:'lib' open question] [research: 53 §Decisions #6]

---

## §9 Decisions Confirmed (D1-D4)

> **[research: audit.md §DECISIONS NEEDING CONFIRMATION]**

### D1: Single `FxModule` vs multiple

**Resolved**: One `FxModule` (`ReactNativeFx`), registering 3 substrate-specific views per `[architecture §2.2]`:
- `FxHostedView` (default) — decorative effects, hosted substrate
- `FxSurfaceView` — interactive effects + content motion wrapper, expo-view substrate
- `FxGroupView` — morph compound, hosted substrate

Each JS component maps to a concrete view class: `<Fx effect>` → `FxHostedView` (decorative) or `FxSurfaceView` (interactive); `<FxPresence>`/`<FxView>`/`<FxPressable>` → `FxSurfaceView`; `<FxGroup>` → `FxGroupView`.

**Source**: [ref: expo/ios/Core/Modules/ModuleDefinition.swift] — first view = default, others = `ModuleName_ViewName`.
**Architecture**: [research/7-implementation/architecture.md §2] [research: 51:38-44]

### D2: `requireNativeView` module name

**Resolved**: Module name changed from `'FxShader'` to `'ReactNativeFx'`. JS bindings use `requireNativeView('ReactNativeFx')` (default) / `requireNativeView('ReactNativeFx', 'FxSurfaceView')` / `requireNativeView('ReactNativeFx', 'FxGroupView')`.
**Source**: [research: 51 §Cross-boundary typing]

### D3: `FxGroup`/`FxItem` Android without Liquid Glass

**Provisioned candidate (ledger: SURF-006, status = `open`). Pending source-doc closure in `57`/`21`.** `FxGroup`/`FxItem` is iOS-only V1 (`.glassEffect` + `GlassEffectContainer`, iOS 26+). Android uses `material` node with blur+overlay fallback, no `FxGroup` morphing. When both platforms have glass morph equivalents, `FxGroup` extends to Android.
**Source**: [research: 21-materials-and-glass.md §Glass morphing] [research: structure.android.md §material]

### D4: `symbol` Android scope

**Resolved (DOC-008, 2026-06-08).** `symbol` is iOS-only in V1 through `.symbolEffect`.
Android AVD/Lottie support is planned/deferred and non-selectable; Android degrades to
`{ via: 'none' }`. Future Android support must define the app-supplied asset contract and
renderer before those rungs become selectable.
**Source**: [research: 24-symbols.md §Lowering] [research: 02 §via:'lib' open question]

---

## §10 FxGroup/FxItem Scope (G5) — Provisioned Candidate

> **[research: 21 §Glass morphing] [research: 57 §FxGroup/FxItem]**
> **[ledger: SURF-006 status = `resolved` (DOC-006, 2026-06-10)]** The scope below is **ratified** in `57`/`21`.

### iOS

- **Requires**: iOS 26 + Liquid Glass (`.glassEffect` + `GlassEffectContainer`)
- **Mechanism**: Each `FxItem` is a real `UIGlassEffect` view. `GlassEffectContainer` morphs them.
- **Fallback**: Below iOS 26, `FxGroup` renders individual glass views without morphing (`.ultraThinMaterial`).
- **Phase**: V1 (iOS 26) / V2 (pre-26 with blur fallback)

### Android

- **No Liquid Glass equivalent**. M3 Expressive provides shape morph but no glass material.
- **V1 approach**: `material` node with blur+overlay fallback (no morphing). `FxGroup` is iOS-only.
- **V2 plan**: `shape-morph` node + Haze/compose together when M3 Expressive matures.
- **Status**: `FxGroup` iOS-only V1; Android uses flat material fallback.

### Surface API

```tsx
// iOS 26+: morphing glass containers
<FxGroup>
  <FxItem><Fx effect="glass" /></FxItem>
  <FxItem><Fx effect="glass" /></FxItem>
</FxGroup>

// Android / pre-26 iOS: individual glass views
<Fx effect="glass" />
```

---

## §11 Web Fallback (M10)

> **[M10 removed]** fx is a full native library targeting iOS and Android. Web is not supported. The web stubs (`FxShaderView.web.tsx`) return null — adequate for V1.

---

## Reference Origins Index

| Decision | Source |
|----------|--------|
| Manifest schema + types | [research: 02 §The schema] |
| select() algorithm | [research: 02 §The selection rule] |
| fill rungs | [research: 02 §fill worked example] [research: 20-fills.md] |
| shader rungs | [research: 02 §shader worked example] [research: 22-shaders.md] |
| material rungs | [research: 02 §material worked example] [research: 21-materials-and-glass.md] |
| filter rungs | [research: 23-filters.md §Lowering] |
| motion rungs | [research: 02 §motion worked example] [research: 41-motion-vocabulary.md] |
| symbol rungs | [research: 24-symbols.md §Lowering] |
| content-distort rungs | [research: 02 §content-distort worked example] |
| shape-morph rungs | [research: 02 §shape-morph worked example] |
| iOS spring defaults | [ref: apple docs — UISpringTimingParameters, SwiftUI Spring] |
| Android spring defaults | [ref: android docs — SpringForce, M3 MotionScheme] |
| iOS presence presets | [ref: apple docs — UISheetPresentationController, system banner] |
| Android presence presets | [ref: android docs — Snackbar, ModalBottomSheet, Dialog] |
| tune scaling | [research: 41 §tune] + derived from spring defaults |
| Preset catalog structure | [research: 42 §The per-platform default catalog] |
| State vocabulary | [research: 57 §FxView] |
| Feedback values | [research: 57 §FxPressable] |
| Effect presets | [research: 56 §The three preset-like bundles] [research: 55 §EffectStack] |
| Curated shader catalog | [research: 22-shaders.md] [ref: packages/ios/Shaders/FxShaders.metal] |
| BYO asset registration | [research: 22 §BYO] [research: 52 §Cross-platform shader asset bundling] |
| Inconsistencies | [research: audit.md §HIGH — Internal Inconsistencies] |
| Decisions | [research: audit.md §DECISIONS] |
| FxGroup scope | [research: 21 §Glass morphing] [research: 57 §FxGroup/FxItem] |
