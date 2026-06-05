# iOS: the system-material / glass alternative surface (Liquid Glass + containers + material fallback)
Status: researched (secondary)
Feeds: skills/react-native-fx/references/glass-view.md

## Why this matters

> **SECONDARY / ALTERNATIVE SURFACE — NOT the V1 core.** The V1 core is the
> Metal `ShaderView` (`08-shader-accents-and-distribution.md`,
> `09-api-layering.md`): a real native iOS UIKit view backed by
> `MTKView`/`CAMetalLayer` that renders curated build-time `.metal` shader
> functions, owns a native frame loop and native uniform updates, and responds
> to native press/highlight as one native unit. **System glass/materials are an
> *optional alternative backend*** a dev reaches for when they specifically want
> real Apple *system* glass — interactive, backdrop-sampling, system-adaptive —
> *instead of* a Metal shader surface. This doc is reference for that alternative
> path; it is not the thing V1 leads with.

This is the **system-material alternative** on iOS: a glass surface that **stays
fully interactive** while its backdrop blurs live. On iOS that surface is,
exactly, a `UIVisualEffectView` — a real UIKit view (interactive by default):
on iOS 26 it carries `UIGlassEffect` (Liquid Glass, optionally **interactive**)
and can be grouped under `UIGlassContainerEffect` so sibling glass shapes
**morph/merge**; below iOS 26 the *same host view* swaps to a `UIBlurEffect`
material so the alternative still delivers real glass, not a flat box.

**How it relates to the core.** Because `UIVisualEffectView` is a normal,
interactive UIKit view, glass slots into fx two ways without touching the Metal
core:
1. **As an alternative `kind` of surface** — a dev picks the system-glass
   backend instead of the Metal `ShaderView` when they want Apple's adaptive
   system material rather than a custom shader (see the effect-capability matrix
   in `README.md`: "System material / glass" = optional/secondary).
2. **As a base that a Metal-shader accent overlays** — the glass view can be the
   interactive backdrop with a non-interactive Metal shader accent composited on
   top (cross-ref `08`/`09`). The shader provides the generative accent; the
   glass provides the system look and interaction.

Either way, glass is **not** the V1 headline. The Metal `ShaderView` is.

fx positions this alternative as the **cross-platform superset
of [`@callstack/liquid-glass`](https://github.com/callstack/liquid-glass) and
[`expo-glass-effect`](https://docs.expo.dev/versions/latest/sdk/glass-effect/)** —
both excellent, both **iOS 26-only, glass-only**, both falling back to a plain
`View` below iOS 26. fx instead promises **premium glass everywhere** (material
fallback on iOS 13–25, `RenderEffect` on Android — see
`03-android-rendereffect.md`) plus interaction and curated presets those libs
don't expose.

One platform fact worth pinning even for this secondary path: **why
`UIVisualEffectView`/`UIGlassEffect` stay interactive while sampling live
backdrop content.** A `UIVisualEffectView` is a *real UIKit view* — children
live in its `contentView`, hit-testing is normal UIKit hit-testing, and
`UIGlassEffect.isInteractive` is an explicit opt-in to the system's own
press/morph response. A custom content-sampling shader applied to RN content via
SwiftUI `.layerEffect`, by contrast, hosts the content in SwiftUI and **swallows
RN touch** (full treatment in `05-gestures-and-interaction.md`). That is why,
when a dev needs an *interactive + live-content-sampling* effect, the
system-glass backend is the answer — not because glass is the core, but because
content-sampling shaders on iOS can't be interactive. (The V1 core `ShaderView`
sidesteps this entirely: it does **not** sample live RN content by default; it
renders curated Metal functions as its own interactive native surface.)

> Re-frame note: an earlier draft framed Liquid Glass as fx's *headline*
> "interactive native-effect view." The current thesis (`README.md`) supersedes
> that: the headline is the Metal `ShaderView` (`08`/`09`), and Liquid Glass +
> materials is a **secondary/alternative backend**. All API and availability
> findings below remain correct and are kept as reference.

## Research questions
- **Interactivity (mechanism):** *why* does a `UIVisualEffectView`/`UIGlassEffect`
  stay interactive (touch + live backdrop sampling) where a content-sampling
  shader applied to RN content cannot? Pin the mechanism: real UIKit view,
  `contentView` children, normal hit-testing, `UIGlassEffect.isInteractive` —
  this is what makes the system-glass backend a viable *interactive* alternative.
- **`UIGlassEffect` (iOS 26):** exact initializer, the style type and its cases
  (`.regular` / `.clear`), `tintColor`, `isInteractive`. Availability + runtime
  guard.
- **`UIGlassContainerEffect` / containers + morphing:** the container
  that makes multiple glass elements **morph/merge** into one shape when close —
  exact API, how `spacing`/proximity drives the merge, how to host children.
- **The <iOS 26 fallback as a first-class promise:** the `UIVisualEffectView`
  material path — full `UIBlurEffect.Style` list + vibrancy — as the graceful
  degrade, contrasted with the prior-art libs' fall-back-to-`View`.
- **Prior-art API map:** the public surface of `@callstack/liquid-glass` and
  `expo-glass-effect` so fx's props are a *conscious superset*.
- Intensity control: `UIBlurEffect` has no intensity knob — confirm the paused
  `UIViewPropertyAnimator` `fractionComplete` trick (cheap, animatable).
- Tinting without killing the blur (glass `tintColor` vs overlay vs vibrancy).
- Backdrop sampling: confirm `UIVisualEffectView` samples the content *behind* it
  automatically — the key iOS/Android asymmetry.
- Children, corners (`cornerConfiguration`), shadow, interaction pass-through.

## Findings

### 0. Why the glass *alternative* stays interactive — the enabling fact

The system-glass backend is viable as an *interactive* alternative because of
one platform fact. A `UIVisualEffectView` (and the `UIGlassEffect` it carries on
iOS 26) is **a normal UIKit view**, so all three properties this surface needs
come for free:

1. **Children mount in a real view tree (`contentView`), with normal
   hit-testing.** Subviews added to `effectView.contentView` participate in
   ordinary UIKit `hitTest(_:with:)`, so taps, scroll pans, and RNGH all reach
   them. The effect view does **not** eat touches by default (§7).
2. **Backdrop sampling is live and free** (§6) — the blur reads the content
   *behind* the view in the same window, updating as it scrolls.
3. **`UIGlassEffect.isInteractive`** is an explicit opt-in to the system's own
   "liquid" press/expand/highlight response on top of (2) and (1).

Contrast with a **custom content-sampling MSL shader applied to RN content**: on
iOS such a shader can only reach RN content via SwiftUI `.layerEffect`, which
hosts that content inside SwiftUI (`UIHostingController`) and **swallows RN
touch** — you get the pixels but lose the gesture pipeline. (Android
`RenderEffect` does *not* swallow; that asymmetry and the full interaction/swallow
matrix live in `05-gestures-and-interaction.md`.) So on iOS:

> **Interactive + live-content-sampling effect ⇒ system materials / Liquid Glass
> only.** That is *why* the system-glass backend is the right *alternative* when
> a dev needs an interactive effect that samples live backdrop content. It does
> **not** make glass the V1 core: the core Metal `ShaderView`
> (`08`/`09`) is interactive without sampling live RN content — it renders
> curated `.metal` functions as its own native surface. Where a generative shader
> *does* need to sit over live content, it survives as a non-interactive
> pass-through overlay (`08-shader-accents-and-distribution.md`), optionally on
> top of this glass base (§ "How it relates to the core").

[Apple — UIVisualEffectView](https://developer.apple.com/documentation/uikit/uivisualeffectview),
[Apple — UIGlassEffect](https://developer.apple.com/documentation/uikit/uiglasseffect)

### 1. Liquid Glass (iOS 26) — `UIGlassEffect`

`UIGlassEffect` is a `UIVisualEffect` subclass (sibling of `UIBlurEffect` /
`UIVibrancyEffect`) that you assign to a normal `UIVisualEffectView.effect`.
Verified symbols/behavior:

- **`init(style:)`** — the initializer takes a `UIGlassEffect.Style`. Verified
  signature (from a current UIKit-26 API walkthrough):
  ```swift
  class UIGlassEffect: UIVisualEffect {
      init(style: UIGlassEffect.Style)
      var isInteractive: Bool { get set }   // default false
      var tintColor: UIColor? { get set }
  }
  extension UIGlassEffect {
      enum Style: Int { case regular = 0; case clear = 1 }
  }
  ```
  `.regular` is the default frosted glass; `.clear` is the more transparent
  variant. (Both prior-art libs surface exactly these via a `'clear' |
  'regular' | 'none'` prop, where `'none'` is *their* abstraction for "no
  effect," not a UIKit `Style` case.)
- **`tintColor`** (`UIColor?`) — a "stained-glass" tint composited *into* the
  material; it does **not** kill the blur/backdrop sampling.
- **`isInteractive`** (`Bool`, default `false`) — when `true`, "the glass
  expands and various highlights are applied when the user taps." This is the
  system's built-in interactive response; fx's own `EffectPressable`
  (`05-gestures-and-interaction.md`) layers on top of, not instead of, it.
- **Shape via `cornerConfiguration`** — iOS 26 adds
  `var cornerConfiguration: UICornerConfiguration` on `UIView` (so on
  `UIVisualEffectView` too). Use `.containerRelative` / a
  `containerConcentric(minimum:)` radius to keep corners concentric with the
  container automatically as the view moves — the blessed way to round glass,
  replacing hand-rolled `layer.cornerRadius`.

```swift
if #available(iOS 26.0, *) {
    let glass = UIGlassEffect(style: .regular)
    glass.isInteractive = true                 // opt into the liquid press response
    glass.tintColor = tint                      // optional; keeps the blur
    effectView.effect = glass                   // effectView is a UIVisualEffectView
    effectView.cornerConfiguration = .containerRelative()  // concentric corners
}
```

> Correction vs the prior draft: the verified initializer is **`init(style:)`**
> (not `init(glass:isInteractive:)`), with `isInteractive`/`tintColor` set as
> properties; the `Style` enum has **`.regular`/`.clear` only** — a `.identity`
> case appears in one secondary reference and is *unverified* (Open questions).

**Availability + fallback.** `UIGlassEffect` is `@available(iOS 26.0, *)`. Two
guards:
1. **Version guard:** `if #available(iOS 26.0, *) { … }`.
2. **Beta-safety runtime guard:** some early iOS 26 betas shipped without the
   symbol; gate with an `isGlassEffectAPIAvailable`-style check (mirrors
   `expo-glass-effect`'s own exported `isGlassEffectAPIAvailable()` /
   `isLiquidGlassAvailable()`, and `@callstack/liquid-glass`'s
   `isLiquidGlassSupported`) before instantiating, e.g.
   `NSClassFromString("UIGlassEffect") != nil`. Confirm on a real device which
   build drew the fix (Open questions).

[Apple — UIGlassEffect](https://developer.apple.com/documentation/uikit/uiglasseffect),
[Seb Vidal — What's new in UIKit 26 (`UIGlassEffect` init/style/tintColor/isInteractive)](https://sebvidal.com/blog/whats-new-in-uikit-26/),
[Apple — UICornerConfiguration](https://developer.apple.com/documentation/uikit/uicornerconfiguration-c.class),
[Apple — UIView.cornerConfiguration](https://developer.apple.com/documentation/uikit/uiview/cornerconfiguration-7l0ja),
[WWDC25 — Build a UIKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/284/)

### 2. `UIGlassContainerEffect` — containers + morphing/merging

This is the marquee feature both prior-art libs expose (`LiquidGlassContainerView`,
`GlassContainer`) and the reason a *single* glass view isn't the whole story.
`UIGlassContainerEffect` is itself a `UIVisualEffect`: you put it on an
**outer** `UIVisualEffectView`, then add **child** `UIVisualEffectView`s (each
carrying its own `UIGlassEffect`) into the container's `contentView`. While the
children are far apart they read as separate glass shapes; as they animate close
together they **blend and morph into one fluid shape — "like small droplets of
water"** — with consistent, uniform blur/lighting across the group.

```swift
if #available(iOS 26.0, *) {
    let containerEffect = UIGlassContainerEffect()
    containerEffect.spacing = 12                 // merge-distance threshold (pt)

    let container = UIVisualEffectView(effect: containerEffect)

    let a = UIVisualEffectView(effect: UIGlassEffect(style: .regular))
    let b = UIVisualEffectView(effect: UIGlassEffect(style: .regular))
    container.contentView.addSubview(a)          // children go in contentView
    container.contentView.addSubview(b)
    // animate a/b frames toward each other → they merge into one shape
}
```

- **`spacing`** — the proximity threshold that drives the merge: elements within
  `spacing` of each other start blending; outside it they stay distinct. Larger
  `spacing` = merge from farther apart. This is exactly what
  `@callstack/liquid-glass` (`LiquidGlassContainerView.spacing: number`,
  default `0`) and `expo-glass-effect` (`GlassContainer.spacing?: number`)
  expose to JS — fx maps a `spacing` prop straight onto `containerEffect.spacing`.
- **Children must each be glass.** Every merging child is its own
  `UIVisualEffectView` with a `UIGlassEffect`; the container governs *grouping*
  and uniform adaptation, not the per-child material.
- **Uniform adaptation.** The container "enforces a uniform adaptation": all
  grouped glass adapts to the shared backdrop consistently rather than each
  child resolving light/dark independently — important for toolbars/clustered
  controls.
- **SwiftUI mirror (for cross-reading docs, not used here):** the SwiftUI
  equivalent is `GlassEffectContainer(spacing:)` with `.glassEffect()` on
  children and `.glassEffectID(_:in:)` + `@Namespace` for morph identity across
  state changes. fx uses the **UIKit** container so the children stay RN-hosted
  and interactive.

Use cases: toolbars, segmented/clustered button groups, a FAB that splits into a
menu. A single `GlassView` surface does **not** need the container — fx exposes
it as a separate `GlassContainer` wrapper (superset parity), not as overhead on
every glass view.

[Apple — UIGlassContainerEffect](https://developer.apple.com/documentation/uikit/uiglasscontainereffect),
[DEV — Understanding GlassEffectContainer in iOS 26 (spacing/morph semantics, `glassEffectID`)](https://dev.to/arshtechpro/understanding-glasseffectcontainer-in-ios-26-2n8p),
[Apple Developer Forums — Using GlassEffectContainer with UIKit](https://developer.apple.com/forums/thread/791540)

### 3. The <iOS 26 fallback as a first-class promise — `UIVisualEffectView` materials

This is fx's differentiator vs the libs we supersede. Both
`@callstack/liquid-glass` and `expo-glass-effect` render a **plain `View`** below
iOS 26 (see §4). fx instead falls back to the **same `UIVisualEffectView` host**
with a `UIBlurEffect(style:)` material — still real, backdrop-sampling,
adaptive glass — so the promise is **"premium glass everywhere," not
"iOS-26-or-a-flat-box."** The host view is identical across the version split;
only `effect` swaps.

#### 3a. `UIBlurEffect.Style` — the full material list + light/dark adaptation

`UIBlurEffect(style:)` is the iOS 13+ material system. Three families:

**Legacy, non-adaptive (iOS 8+, effectively deprecated — do not use):**
`.extraLight`, `.light`, `.dark`, plus `.regular` / `.prominent` (iOS 10+).
`.regular` and `.prominent` *do* adapt to light/dark; the older three do not.

**Adaptive materials (iOS 13+) — auto-switch with `userInterfaceStyle`:**
`.systemUltraThinMaterial`, `.systemThinMaterial`, `.systemMaterial`,
`.systemThickMaterial`, `.systemChromeMaterial`.

**Always-Light variants (iOS 13+) — locked light:**
`.systemUltraThinMaterialLight`, `.systemThinMaterialLight`,
`.systemMaterialLight`, `.systemThickMaterialLight`, `.systemChromeMaterialLight`.

**Always-Dark variants (iOS 13+) — locked dark:**
`.systemUltraThinMaterialDark`, `.systemThinMaterialDark`,
`.systemMaterialDark`, `.systemThickMaterialDark`, `.systemChromeMaterialDark`.

The five adaptive styles run **thinnest → thickest → most opaque** (`UltraThin`
most see-through; `Chrome` the densest nav-bar look). The adaptive forms read
`traitCollection.userInterfaceStyle` and re-render automatically on a light/dark
switch — free dark mode by using the un-suffixed names and **not** locking a
`colorScheme`.
[Apple — UIBlurEffect.Style](https://developer.apple.com/documentation/uikit/uiblureffect/style),
[Kyle Howells — UIBlurEffectStyles](https://ikyle.me/blog/2022/uiblureffectstyle)

**Maps to preset `material`** (`04-preset-system.md`): `material:
"systemUltraThin"` … `"systemChrome"` map 1:1 onto the adaptive names; only fall
to `*Light`/`*Dark` when `colorScheme` is pinned.

#### 3b. `UIVibrancyEffect` — the highlight / vibrant-content layer

`UIVibrancyEffect` is a **second** `UIVisualEffectView` nested inside the blur
view's `contentView`. It does not blur; it amplifies the contrast of *its*
content against the blurred backdrop so labels/separators/fills "pop." It **must**
be built from the **same** `UIBlurEffect` instance via
`UIVibrancyEffect(blurEffect:style:)`. `UIVibrancyEffectStyle` cases (iOS 13+):
`.label`, `.secondaryLabel`, `.tertiaryLabel`, `.quaternaryLabel`, `.fill`,
`.secondaryFill`, `.tertiaryFill`, `.separator`. Structure:

```
UIVisualEffectView(blur)
└─ .contentView
   └─ UIVisualEffectView(vibrancy)   // vibrancy made from the same blur
      └─ .contentView
         └─ <vibrant labels / highlight strokes / separators>
```

[Hacking with Swift — blur + vibrancy](https://www.hackingwithswift.com/example-code/uikit/how-to-add-blur-and-vibrancy-using-uivisualeffectview),
[Nutrient — Blur Effect Materials on iOS](https://www.nutrient.io/blog/blur-effect-materials-on-ios/)

**Maps to preset `highlight: true`:** a `UIVibrancyEffect(blurEffect:style:.fill)`
layer holding a 1px top hairline / gradient stroke that adapts to the backdrop.
On iOS 26, `UIGlassEffect` renders its own specular edge → `highlight` is largely
a no-op there.

### 4. Prior-art API map — fx's surface is a conscious superset

Both libs are **Expo Modules / Fabric native wrappers, iOS 26+ only**, and both
**fall back to a plain `View`** below iOS 26. fx mirrors their prop names (so
their users feel at home) and then *extends*: material fallback (§3),
`intensity` scrub (§5), tint on iOS<26 (§6), preset layer (`04`),
`EffectPressable` + `controlled` mode (`05`), Android (`03`), shader accents
(`08`).

**`@callstack/liquid-glass`** — [GitHub](https://github.com/callstack/liquid-glass)
(RN ≥ 0.80, Xcode ≥ 26, iOS 26+; below 26 → `View`):

| Component | Prop | Type | Default |
|---|---|---|---|
| `LiquidGlassView` | `interactive` | `boolean` | `false` |
| | `effect` | `'clear' \| 'regular' \| 'none'` | `'regular'` |
| | `tintColor` | `ColorValue` | — |
| | `colorScheme` | `'light' \| 'dark' \| 'system'` | `'system'` |
| | `animated` | `boolean` | `true` |
| | `animationDuration` | `number` (ms) | — |
| `LiquidGlassContainerView` | `spacing` | `number` | `0` |
| _export_ | `isLiquidGlassSupported` | `boolean` | — |

**`expo-glass-effect`** —
[Expo docs](https://docs.expo.dev/versions/latest/sdk/glass-effect/) (iOS/tvOS,
iOS 26+; unsupported → `View`):

| Component | Prop | Type | Default |
|---|---|---|---|
| `GlassView` | `glassEffectStyle` | `GlassStyle \| GlassEffectStyleConfig` | `'regular'` |
| | `isInteractive` | `boolean` | `false` |
| | `tintColor` | `string` | — |
| | `colorScheme` | `'auto' \| 'light' \| 'dark'` | `'auto'` |
| `GlassContainer` | `spacing` | `number` (optional) | — |
| _types_ | `GlassStyle` | `'clear' \| 'regular' \| 'none'` | — |
| | `GlassEffectStyleConfig` | `{ style; animate?: boolean; animationDuration?: number (s) }` | — |
| _exports_ | `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()` | `() => boolean` | — |

Notes that shape fx's API:
- Both center on `'clear' | 'regular' | 'none'` → matches `UIGlassEffect.Style`
  (`'none'` = "no effect" abstraction). fx adopts the same vocabulary.
- Both expose `isInteractive`/`interactive` → fx's `interactive` prop drives
  `UIGlassEffect.isInteractive` on 26 *and* gates `EffectPressable` everywhere.
- Both expose container `spacing` → fx's `GlassContainer spacing` →
  `UIGlassContainerEffect.spacing` (§2).
- `animationDuration` units differ (callstack **ms**, expo **s**); fx picks one
  (ms) and documents it.
- Expo's `GlassEffectStyleConfig.animate` ↔ callstack's top-level `animated`.
- **fx-only superset:** `intensity` (§5), material fallback (§3), `preset`
  (`04`), `mode="controlled"` + imperative highlight (`05`), Android backend
  (`03`), generative accents (`08`).

### 5. Intensity control — no `intensity` property; use `fractionComplete`

`UIBlurEffect` exposes **no** intensity property, and lowering
`UIVisualEffectView.alpha` fades the whole view (wrong). Drive the effect through
a **paused** `UIViewPropertyAnimator` and scrub `fractionComplete` 0→1:

```swift
final class FxBlurView: UIVisualEffectView {
    private var animator: UIViewPropertyAnimator?
    private let style: UIBlurEffect.Style

    init(style: UIBlurEffect.Style) {
        self.style = style
        super.init(effect: nil)               // start with NO effect
        rebuildAnimator()
    }

    private func rebuildAnimator() {
        animator?.stopAnimation(true)
        animator = UIViewPropertyAnimator(duration: 1, curve: .linear) { [self] in
            effect = UIBlurEffect(style: style) // 0 → full material
        }
        animator?.pausesOnCompletion = true     // hold the frame
    }

    var intensity: CGFloat = 1 {                // 0…1 → preset low/medium/high
        didSet { animator?.fractionComplete = intensity }
    }
}
```

Cheap (paused animator, just interpolates), animatable (canonical way to fade
blur in/out — bind to a spring or `EffectPressable` press depth later). Gotcha:
keep `pausesOnCompletion = true` or the animator self-completes and
`fractionComplete` stops responding; rebuild on `traitCollectionDidChange` so a
light/dark switch re-resolves the material. On iOS 26 the same scrub fades a
`UIGlassEffect` in/out (both are `UIVisualEffect`); intensity is otherwise better
expressed via `.regular` vs `.clear` + `tintColor` alpha.

**Maps to preset `intensity`/`blur`** (`04-preset-system.md`): discrete
`low|medium|high` (and numeric `blur: 28`) → a 0–1 `fractionComplete` target on
the chosen material — a normalized presence, **not** literal gaussian pixels.
[SO — UIBlurEffect intensity](https://stackoverflow.com/questions/28140781/how-to-edit-the-uiblureffect-intensity),
[darrarski — intensity gist](https://gist.github.com/darrarski/29a2a4515508e385c90b3ffe6f975df7)

### 6. Tinting without killing the blur

In order of preference:
1. **iOS 26 `UIGlassEffect.tintColor`** — correct, blur-preserving (system
   composites tint into the material). Use whenever available.
2. **Material path (iOS < 26): a thin tint overlay inside `contentView`** —
   subview filling `contentView`, `backgroundColor = tint.withAlphaComponent(α)`,
   small α (~0.1–0.25). Lives *in* the effect view so it reads as part of the
   material; blur still samples the backdrop. Keep α low (high α = flat panel).
3. **Vibrancy-tinted overlay** — a `.fill` vibrancy layer for a backdrop-adaptive
   tint. Subtler, more setup.

**Avoid:** `backgroundColor` on the `UIVisualEffectView` *itself*, and lowering
`alpha` to "tint" (fades the blur, §5).

**Maps to preset `tint`** → `UIGlassEffect.tintColor` (26) / low-α
`contentView` overlay (<26). `saturation` has **no** UIKit knob (system
materials saturate already) → iOS-advisory only.

### 7. Backdrop sampling — the key iOS/Android asymmetry (CONFIRMED)

`UIVisualEffectView` **automatically samples the content rendered behind it** and
blurs *that* — intrinsic to the class, no snapshotting/wiring, updates live as
the backdrop scrolls. This is the biggest divergence from Android, whose
`RenderEffect` blurs a view's **own** content, so true backdrop blur requires
capturing the parent (costly, stale-prone — the #1 risk in
`03-android-rendereffect.md`). On iOS we get real, live, free backdrop blur.
Document in `glass-view.md` as *the* reason iOS/Android glass can't be
pixel-identical — equal polish, not parity.
[Apple — UIVisualEffectView](https://developer.apple.com/documentation/uikit/uivisualeffectview),
[Kodeco — UIVisualEffectView tutorial](https://www.kodeco.com/16125723-uivisualeffectview-tutorial-getting-started)

### 8. Children, corners, shadow, interaction pass-through

- **Children mount in `contentView`.** Anything added directly to a
  `UIVisualEffectView` (not its `.contentView`) "will not be drawn correctly."
  `FxGlassView` reparents RN children into `effectView.contentView` — and that is
  also what keeps them in a real, hit-testable view tree (§0).
- **Corner radius / masking.** Material path: `layer.cornerRadius` +
  `clipsToBounds = true` (or `layer.maskedCorners`). Liquid Glass path: prefer
  `cornerConfiguration` (`.containerRelative` / `containerConcentric(minimum:)`)
  for concentric corners; the glass shape API is the blessed route.
- **Shadow.** `clipsToBounds = true` clips the shadow. Put the
  `UIVisualEffectView` inside a non-clipped wrapper `UIView` that carries the
  shadow; the effect view clips its own corners inside. Liquid Glass renders its
  own ambient shadow — usually skip the manual one.
- **Interaction pass-through.** A `UIVisualEffectView` does not eat touches by
  default; with no recognizer and default `isUserInteractionEnabled`, touches
  reach the children. Exactly what `EffectPressable`
  (`05-gestures-and-interaction.md`) needs — it attaches its
  `UILongPressGestureRecognizer` cooperatively without the glass view stealing
  gestures. iOS 26 `isInteractive` glass adds the system's own press response on
  top.
[Hacking with Swift — contentView requirement](https://www.hackingwithswift.com/example-code/uikit/how-to-add-blur-and-vibrancy-using-uivisualeffectview)

### 9. No Metal *inside* the glass effect itself

The glass/material **effect** is pure system: no Metal goes *into* the
`UIVisualEffectView` to produce the blur/glass. The system path covers adaptive
materials, light/dark, vibrancy highlight, backdrop sampling, tint, animatable
intensity, concentric shapes, shadows, the iOS 26 specular look, *and*
interaction. Bespoke refraction/displacement "fake liquid glass" on iOS<26 to
imitate iOS 26 is an explicit **non-goal** — the alternative falls back to native
materials, which look native, not an off-brand imitation.

This is **not** a statement about the product. The V1 core *is* Metal — the
`ShaderView` (`08`/`09`). The point here is narrower: this *secondary glass
backend* generates its effect via system APIs, not MSL. A Metal-shader **accent**
can still be composited *over* a glass base as a separate, non-interactive
overlay (`08-shader-accents-and-distribution.md`; § "How it relates to the
core") — the Metal lives in that overlay, not in the glass effect.

## Decisions

> These decisions govern the **secondary system-glass backend**, not the V1
> core. The core `ShaderView` decisions live in `08`/`09`.

1. **The glass alternative is a single `UIVisualEffectView` host, two effects.**
   iOS 26+: `effect = UIGlassEffect(style:)` (+ `isInteractive`, `tintColor`,
   `cornerConfiguration`). iOS 13–25: `effect = UIBlurEffect(style:)` driven by a
   paused `UIViewPropertyAnimator`. Gate with `#available(iOS 26.0, *)` **plus** a
   runtime symbol guard for beta safety. This surface is exposed as an
   alternative `kind`, and/or as a base under a Metal-shader accent overlay
   (`08`/`09`) — not as the V1 default.
2. **Material fallback is a first-class promise, not "nothing."** Below iOS 26 we
   keep the same host and degrade to a material blur — *premium glass
   everywhere* — explicitly beating `@callstack/liquid-glass` /
   `expo-glass-effect` falling back to a plain `View`.
3. **`GlassContainer` ships as a real wrapper over `UIGlassContainerEffect`**
   (`spacing` → merge threshold), so multi-element morph/merge — the prior-art
   headline — is in fx's superset, not just single surfaces.
4. **API is a conscious superset of the two libs.** Adopt their vocabulary
   (`effect`/`glassEffectStyle` `'clear'|'regular'|'none'`, `interactive`/
   `isInteractive`, `tintColor`, `colorScheme`, container `spacing`,
   `animated`/`animationDuration` in **ms**); add fx-only `intensity`, material
   fallback, `preset`, `mode="controlled"`, Android, accents.
5. **`material` → adaptive `UIBlurEffect.Style`** (un-suffixed; dark mode free);
   `*Light`/`*Dark` only when `colorScheme` pinned. On iOS 26, `material`/`effect`
   → `UIGlassEffect.Style` (`.regular`/`.clear`).
6. **`intensity`/`blur` → `fractionComplete`** on the paused animator (cheap,
   animatable; normalized 0–1, not pixels; `pausesOnCompletion = true`).
7. **`tint` →** `UIGlassEffect.tintColor` (26) / low-α (`~0.1–0.25`) `contentView`
   overlay (<26). Never via the effect view's `backgroundColor`/`alpha`.
   `saturation` iOS-advisory only.
8. **`highlight: true` →** `.fill` vibrancy hairline on the material path; no-op
   on iOS 26 (glass renders its own specular edge).
9. **Children reparent into `contentView`** (also what keeps them interactive);
   corners via `cornerConfiguration` (26) / `cornerRadius`+`clipsToBounds`
   (earlier); shadows on a non-clipped wrapper; no gesture stealing.
10. **No Metal inside the glass effect.** The glass surface generates its effect
    via system APIs only; a Metal-shader accent may be composited *over* it as a
    separate, non-interactive overlay (`08`). (The V1 core, by contrast, *is*
    Metal — `08`/`09`.)
11. **Prior-art libs are the reference, not a dependency.** fx implements its own
    `UIVisualEffectView` host because it needs the material fallback, intensity
    scrub, container, `EffectPressable`, and `controlled` mode none of them
    provide.

## Open questions
- **`UIGlassEffect.Style` exact case set & init label:** verified as
  `init(style:)` with `enum Style: Int { regular, clear }` from a current
  UIKit-26 walkthrough; a `.identity` case appears in *one* secondary reference
  and is **unverified** — confirm against the real iOS 26 SDK headers
  (Apple docs are JS-rendered; couldn't read raw). (Needs-device / Xcode 26.)
- **`UIGlassContainerEffect` exact property surface:** `spacing` is confirmed
  from multiple secondary references and both libs' wrappers, but the canonical
  Apple page is JS-rendered and didn't return body text — confirm `spacing`'s
  exact name/type/default and whether there are additional grouping properties
  against the SDK. (Needs-device.)
- **`cornerConfiguration` symbol forms:** `UICornerConfiguration` (type) and
  `containerConcentric(minimum:)` confirmed; `.containerRelative` vs
  `.containerRelative()` call form still varies across sources — pin against the
  SDK. (Needs-device.)
- **iOS 26 beta crash guard:** which exact build added `UIGlassEffect`? Confirm
  the `isGlassEffectAPIAvailable`/`NSClassFromString` guard on a real iOS 26
  device/sim before relying on `#available` alone. (Needs-device.)
- **Container merge fidelity in RN:** verify that RN-hosted child glass views
  (Fabric subviews) animate/morph through `UIGlassContainerEffect` as smoothly as
  native SwiftUI `.glassEffectID` morphs — RN's frame updates may not trigger the
  same transition path. (Needs-device.)
- **`fractionComplete` + `UIGlassEffect`:** confirm scrubbing a glass effect's
  presence behaves like a blur (expected; both `UIVisualEffect`). (Needs-device.)
- **Tint compositing under Liquid Glass:** verify `tintColor` α behavior and
  whether high α preserves backdrop sampling. (Needs-device.)
- **Saturation:** whether any iOS 26 material exposes saturation beyond style
  choice — currently assumed no.

## Sources
- Apple — UIVisualEffectView (auto-samples content behind it; contentView): https://developer.apple.com/documentation/uikit/uivisualeffectview
- Apple — UIGlassEffect (iOS 26 glass; isInteractive, tintColor): https://developer.apple.com/documentation/uikit/uiglasseffect
- Apple — UIGlassContainerEffect (container/merge): https://developer.apple.com/documentation/uikit/uiglasscontainereffect
- Apple — UICornerConfiguration: https://developer.apple.com/documentation/uikit/uicornerconfiguration-c.class
- Apple — UIView.cornerConfiguration (.containerRelative / containerConcentric): https://developer.apple.com/documentation/uikit/uiview/cornerconfiguration-7l0ja
- Apple — UIBlurEffect.Style (full material list): https://developer.apple.com/documentation/uikit/uiblureffect/style
- Apple WWDC25 — Build a UIKit app with the new design (UIGlassEffect, cornerConfiguration, container): https://developer.apple.com/videos/play/wwdc2025/284/
- Seb Vidal — What's new in UIKit 26 (UIGlassEffect init(style:)/Style enum/isInteractive/tintColor/cornerConfiguration): https://sebvidal.com/blog/whats-new-in-uikit-26/
- DEV — Understanding GlassEffectContainer in iOS 26 (spacing/morph semantics, glassEffectID): https://dev.to/arshtechpro/understanding-glasseffectcontainer-in-ios-26-2n8p
- Apple Developer Forums — Using GlassEffectContainer with UIKit: https://developer.apple.com/forums/thread/791540
- conorluddy — iOS 26 Liquid Glass Reference (UIGlassEffect, #available iOS 26): https://github.com/conorluddy/LiquidGlassReference
- @callstack/liquid-glass — LiquidGlassView/LiquidGlassContainerView API, isLiquidGlassSupported, iOS 26+, fallback to View, RN ≥ 0.80: https://github.com/callstack/liquid-glass
- Expo — GlassEffect SDK (GlassView/GlassContainer, glassEffectStyle/tintColor/isInteractive/colorScheme/spacing, isGlassEffectAPIAvailable, iOS 26+, fallback to View): https://docs.expo.dev/versions/latest/sdk/glass-effect/
- JuniperPhoton — Adopting Liquid Glass: Experiences and Pitfalls (cornerConfiguration, tint, isGlassEffectAPIAvailable): https://juniperphoton.substack.com/p/adopting-liquid-glass-experiences
- Kyle Howells — UIBlurEffectStyles (adaptive/light/dark/legacy grouping): https://ikyle.me/blog/2022/uiblureffectstyle
- Hacking with Swift — blur + vibrancy, contentView requirement: https://www.hackingwithswift.com/example-code/uikit/how-to-add-blur-and-vibrancy-using-uivisualeffectview
- Nutrient — An In-Depth Look at Blur Effect Materials on iOS (vibrancy styles): https://www.nutrient.io/blog/blur-effect-materials-on-ios/
- Stack Overflow — How to edit the UIBlurEffect intensity? (fractionComplete): https://stackoverflow.com/questions/28140781/how-to-edit-the-uiblureffect-intensity
- darrarski — UIVisualEffectView intensity gist (paused UIViewPropertyAnimator): https://gist.github.com/darrarski/29a2a4515508e385c90b3ffe6f975df7
- Kodeco — UIVisualEffectView tutorial: https://www.kodeco.com/16125723-uivisualeffectview-tutorial-getting-started
