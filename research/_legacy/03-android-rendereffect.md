# Android RenderEffect + backdrop blur (secondary / later)
Status: researched (secondary / later)
Feeds: skills/react-native-fx/references/glass-view.md, references/gotchas.md

## Why this matters

> **⚠️ Android is secondary and later.** Under the current thesis (see
> [`README.md`](./README.md)), fx V1 is an **interactable native iOS Metal
> `ShaderView`** (MTKView/CAMetalLayer, build-time `.metal`, native loop +
> interaction). **iOS is the lead platform.** This document is **reference
> material for an eventual *divergent* Android backend**, not a V1 deliverable.
> Nothing here should constrain the iOS Metal architecture: Android reaches a
> *different native substrate* later, and its limitations (no in-tree backdrop
> blur, RenderScript deprecation, AGSL API floors) must not shape the iOS design.
>
> **Where Android lands relative to the iOS `ShaderView`:** the Android analog of
> the iOS Metal `ShaderView` is **AGSL `RuntimeShader`** (runtime-compiled GPU
> shaders, API 33+) driven through `RenderEffect` or a drawn surface
> (`SurfaceView`/`TextureView` + a render loop). That is a *separate* native path
> from Metal — runtime-compiled rather than build-time `.metal` — and is the real
> future-Android equivalent of the lead-platform shader view. The
> backdrop-blur/glass material findings below remain valid as the **Android glass
> story**, but they are a **future-Android concern**, not part of iOS V1.

The remainder of this doc is preserved as reference for that eventual divergent
backend. Its original focus — Android backdrop blur — was once framed as the
program's "#1 technical risk"; under the iOS-lead thesis it is **deferred**, not
a V1 risk. The core finding stands: `RenderEffect.createBlurEffect` blurs a
view's *own* content, not arbitrary backdrop behind it. True in-tree backdrop
blur (the thing iOS gives for free via system materials) requires capturing the
parent's rendering — costly and bug-prone. When Android work begins, it must
**decide and document explicitly**: ship a capture strategy, or be honest that
Android uses approximate/translucent glass.

This doc makes that call **for the future Android backend**. **TL;DR: Android
should ship "honest approximate glass" by default, with an opt-in `backdrop`
capture mode behind an explicit `<GlassBackdropTarget>` wrapper — the same shape
the ecosystem (expo-blur, Dimezis BlurView V3) converged on.** Reasoning and
user-facing docs are in `## Decisions`. All of this is later-backend planning;
none of it gates the iOS Metal `ShaderView`.

## Research questions
- `RenderEffect.createBlurEffect(radiusX, radiusY, edgeTreatment)` — API level
  (31 / Android 12), how to apply via `View.setRenderEffect`, what it actually
  blurs (own content/children only — confirm).
- Backdrop capture strategies and their costs:
  - drawing the parent into a `RenderNode` / bitmap and blurring that
  - `PixelCopy` (window-level, async, expensive, staleness)
  - cross-window blur: `Window.setBackgroundBlurRadius` / `blurBehindRadius`
    (API 31+, dialogs/windows only — does NOT help in-tree views)
  - is there any "blur what's behind this in-tree view" primitive? (expected:
    no, before AGSL-based hacks)
- Approximate glass without backdrop sampling: translucent fill + noise +
  `RenderEffect` on own content + highlight stroke. How close does it get?
- Fallbacks below API 31 (no `RenderEffect`): translucent-only? legacy
  RenderScript blur (deprecated)? what's the floor we support?
- AGSL `RuntimeShader` (API 33+) — the **Android analog of the iOS Metal
  `ShaderView`** (runtime-compiled shaders via `RenderEffect`/a drawn surface).
  Relevant to a *future* Android shader backend, but is it relevant to Android
  *glass* specifically, or only the later custom-shader surface?
- Clipping, transparency, rounded corners (`clipToOutline`), and overdraw /
  battery cost of stacked translucent blurred surfaces on low-end devices.

## Findings

### 1. `RenderEffect.createBlurEffect` blurs OWN content — confirmed

`RenderEffect` and `View.setRenderEffect(RenderEffect)` were both **added in API
level 31 (Android 12)**. `setRenderEffect(null)` is the removal path — there is
**no separate `clearRenderEffect`**; you pass `null`.

What it blurs is unambiguous: it hooks into the hardware-accelerated pipeline at
the **`RenderNode`** level (the node that backs every `View`). The pipeline
*"renders the contents offscreen, applies the blur, and then copies the blurred
result to the original destination"* — i.e. it blurs the **view's own content
and its children**, never what is painted behind it in the parent. There is no
parameter for "source from the backdrop." (Chet Haase, *Blurring the Lines* /
*RenderNode for Bigger, Better Blurs*; Android `View` reference.)

```kotlin
// API 31+. Applies blur to THIS view's own drawing (and its children).
val blur = RenderEffect.createBlurEffect(
    24f, 24f,                 // radiusX, radiusY (px)
    Shader.TileMode.CLAMP     // edgeTreatment — how to sample past the edge
)
view.setRenderEffect(blur)
// remove:
view.setRenderEffect(null)
```

`createBlurEffect` overloads (API 31):
- `createBlurEffect(float radiusX, float radiusY, Shader.TileMode edgeTreatment)`
- `createBlurEffect(float radiusX, float radiusY, RenderEffect inputEffect, Shader.TileMode edgeTreatment)` — chains onto another effect.

`edgeTreatment` (`Shader.TileMode`): `CLAMP` / `MIRROR` / `REPEAT` / `DECAL`
controls how pixels beyond the layer edge are sampled (matters because blur
reads neighbours past the bounds). `CLAMP`/`MIRROR` avoid a transparent halo at
the edges of a glass surface.

**Implication for GlassView:** calling `setRenderEffect(blur)` on the GlassView
itself blurs the GlassView's *children* (our highlight/tint/noise and any RN
children), which is the opposite of glass. So a true frosted look requires the
blur to be applied to a node that contains the **backdrop**, not the surface —
that's the whole problem below.

### 2. There is NO in-tree "blur what's behind this view" primitive

Confirmed across sources: nothing in the framework samples the backdrop of an
in-tree `View` for you. The options are:

**(a) Window / cross-window blur — does NOT help in-tree views.**
`Window.setBackgroundBlurRadius(int)` and
`WindowManager.LayoutParams.setBlurBehindRadius(int)` (`FLAG_BLUR_BEHIND`) exist
from **API 31**, but they operate at the **window** level only:
- `setBackgroundBlurRadius` blurs the screen *within the window's own bounds*
  (frosted-glass dialog/popup background).
- `blurBehindRadius` blurs *everything behind the whole window* (like `dimAmount`).

Both need a **separate, non-opaque window** (Dialog, PopupWindow, or a window
whose `Surface` is translucent). A normal in-tree `GlassView` inside the app's
main window cannot use these to blur a sibling/parent. They are also **gated by
the system**: only available when the device + user enable cross-window blur
(`WindowManager.isCrossWindowBlurEnabled()`), it's *"an expensive operation,
supported only on selected devices,"* and disabled in battery-saver / by
developer options. Recommended radii: ~20px (blur-behind depth), ~80px (frosted
background); avoid >150px. (AOSP *Window blurs*.)

→ Useful later for a true full-screen modal/dialog scrim, **not** for an in-tree
card/nav-bar GlassView. Park it.

**(b) AGSL `RuntimeShader` + `createRuntimeShaderEffect(shader, "background")`
— still own-content.** API **33 (Android 13)**. The named uniform
(`"background"`) is eval'd to read *the RenderNode's own content* at a coord,
not the backdrop. It lets you write custom pixel filtering of the view's own
content; it does **not** introduce a backdrop source. So AGSL does not solve
backdrop blur either, and it belongs to the later Android custom-shader surface —
which is itself the future-Android analog of the iOS `ShaderView` (see #6), not
the Android glass path. (Android `RuntimeShader` ref; Haase, *AGSL: Made in the
Shade(r)*.)

**Conclusion:** the only way to blur the real backdrop in-tree is to **capture
it and blur the capture.**

### 3. Backdrop capture strategies and their real costs

**(a) Snapshot the backdrop into a `RenderNode`/Picture, blur that (the Dimezis
BlurView V3 approach — the ecosystem standard).**
You designate a container as the "blur target," record its drawing into a
`RenderNode` (or `Canvas`/`Picture`), set a `createBlurEffect` on that node, and
draw the blurred node as the GlassView's *background*, beneath unblurred
children. This is hardware-accelerated snapshotting with *"near zero overhead"*
relative to RenderScript, and the library *"updates its blurred content when
changes in the view hierarchy are detected… never invalidates itself or other
Views."* (Dimezis/BlurView README.)

Costs / sharp edges, all confirmed:
- **You must wrap the backdrop** in an explicit target view. The blur target and
  the GlassView must live in the **same window and view tree**.
- **Cannot blur `SurfaceView`-backed content** (VideoView, MapView/MapFragment,
  GLSurfaceView, camera preview) — snapshots don't capture independent hardware
  surfaces. `TextureView` works only on API 31+. (Dimezis README.)
- **Staleness / sync**: the blurred background is a snapshot; it must be
  re-recorded when the backdrop changes (scroll, animation). Driving it every
  frame is the overdraw/battery trap on low-end devices.
- **Self-reference hazard**: if the blur target accidentally contains the
  GlassView, you get feedback/recursion. The target must be a *sibling backdrop*,
  not an ancestor that includes the surface.

**(b) `PixelCopy` (window-level, async).** `PixelCopy.request(...)` exists from
**API 24**; it copies from a `Surface`/`Window` into a `Bitmap` and *can* read
`SurfaceView` content (its one advantage). But it is **asynchronous**, returns a
**CPU `Bitmap`** (a GPU→CPU readback), and is fundamentally a screenshot — too
slow and too stale for a per-frame backdrop, and copies the *whole window* not a
sub-region cheaply. Use only for a one-shot frozen-glass effect (e.g. a sheet
that snapshots once on open), never for live glass. (Android `PixelCopy` ref.)

**(c) `Window.setBackgroundBlurRadius` for true Dialog/modal scrims** — see 2(a).
Right tool for a full-screen blurred modal background on capable devices; wrong
tool for in-tree surfaces.

### 4. Approximate glass without backdrop sampling — how close it gets

This is the "honest" path and it is genuinely good for the common cases (cards,
nav/tab bars, sheet headers over busy-but-not-photographic content). Recipe,
none of which needs a backdrop capture:

1. **Translucent fill** — semi-transparent tint (e.g. white/black at 0.18–0.28
   alpha, preset-driven `highlightOpacity`/`tint`).
2. **Subtle noise / grain** — a tiled noise drawable at low alpha (~0.04–0.08)
   kills banding and reads as "material," not "flat overlay."
3. **`RenderEffect` on OWN content where it helps** — e.g. blurring a captured
   *snapshot we control* (backdrop mode), or softening an internal gradient. In
   pure approximate mode there's no backdrop to blur, so this is mostly the
   highlight/gradient.
4. **Highlight stroke** — a 1px top/edge inner highlight (lighter at top) +
   optional 1px darker hairline border sells the "lit glass edge."
5. **Rounded corners** via `clipToOutline` (below).

This is exactly what **expo-blur renders by default on Android** (method
`'none'` → *"a semi-transparent view"*), and what `@react-native-community/blur`
falls back to. It looks premium over solid/gradient/photographic-but-static
backdrops; it visibly is *not* real frosted glass when there's sharp,
high-contrast content directly behind it (text, photos). That gap is the entire
reason backdrop mode exists as an opt-in.

### 5. Fallbacks below API 31

- **No `RenderEffect` below API 31.** The only real blur primitive there was
  **RenderScript** (`ScriptIntrinsicBlur`), which is **deprecated since Android
  12 (API 31)**; manufacturers have stopped hardware-accelerating it and
  *"support is expected to be removed entirely in a future release"* —
  intrinsics may run **CPU-only**. Android's own migration guide steers blur to
  `RenderEffect`. (Android *Migrate from RenderScript*.)
- **Decision driver:** we will **not** ship RenderScript. Below API 31, glass =
  **approximate-only** (translucent + noise + highlight), no blur. This mirrors
  expo-blur's `'dimezisBlurViewSdk31Plus'` method (blur on 31+, `'none'`
  fallback older) which exists *specifically to dodge RenderScript's perf
  penalty.*
- **minSdk floor.** Expo SDK's own floor is already API 24+. We support
  rendering down to that floor with **approximate glass**, and light up
  **RenderEffect-based** effects (own-content blur in backdrop mode) at **API
  31+**. So: minSdk = whatever Expo pins (24); "true-ish frosted glass" floor =
  **31**.

### 6. AGSL `RuntimeShader` — the future-Android analog of the iOS `ShaderView`

API **33 (Android 13)**. This is the most important entry for the iOS-lead
thesis: **AGSL `RuntimeShader` is the Android equivalent of the iOS Metal
`ShaderView`.** Where iOS compiles `.metal` functions at build time and renders
them in an `MTKView`/`CAMetalLayer`, Android can compile AGSL shader *source at
runtime* (`RuntimeShader(agslSource)`) and drive it either via
`RenderEffect.createRuntimeShaderEffect` (own-content filtering) or against a
drawn surface (`SurfaceView`/`TextureView` + a render loop) for an interactive
shader view. That is a **different native substrate, reached later** — not the
build-time Metal path — and it is what a divergent Android shader backend would
target.

Two distinct things, kept separate:
- **As the future Android shader-view substrate:** `RuntimeShader` is the right
  analog and the eventual landing spot for porting the `ShaderView` concept to
  Android. Out of scope for V1 (iOS only); noted here so the Android backend
  starts from the right primitive.
- **For Android *glass* specifically:** `createRuntimeShaderEffect` filters a
  view's *own* content and adds **no backdrop source**, so AGSL does not solve
  Android backdrop blur. Even on the future Android backend, glass should not
  depend on it. Keep AGSL scoped to the custom-shader surface, not glass.

### 7. Clipping, rounded corners, transparency, overdraw

- **Rounded corners**: use `setClipToOutline(true)` + a `ViewOutlineProvider`
  with `setRoundRect(...)` (or `ViewOutlineProvider.BACKGROUND` with a rounded
  background drawable). Only rect/circle/round-rect outlines can clip
  (`Outline.canClip()`); **all four corners must share the radius** for rounding.
  Clipping is *"an expensive operation — don't animate the clip shape."* So set
  the corner radius once per layout, never per-frame. (Android *Create shadows
  and clip views*.)
- **Blur + clip interaction**: `RenderEffect` renders offscreen then composites;
  with `MIRROR`/`CLAMP` edgeTreatment plus outline clipping you avoid a
  transparent blur halo bleeding past the rounded corner. Validate on device.
- **Overdraw / battery** (the research thesis's low-end-Android risk): every translucent
  GlassView is an extra full-bounds alpha layer the GPU must blend (overdraw).
  Stacking glass-on-glass, or a live backdrop snapshot re-recorded each frame,
  multiplies it. Mitigations baked into our design:
  - approximate mode is cheap (a few blended layers, static) — fine to stack;
  - backdrop mode must be **opt-in**, snapshot **on-change not per-frame**, and
    documented as "use sparingly, one live-glass surface per screen";
  - never animate the clip/corner radius;
  - prefer a single noise drawable reused across instances (no per-view bitmap).

### 8. How the ecosystem solves it (survey + the tradeoff each picked)

| Library | Android approach | Tradeoff picked |
|---|---|---|
| **expo-blur** | Default `'none'` = semi-transparent view. Real blur only via `'dimezisBlurView'`/`'dimezisBlurViewSdk31Plus'`, which **require wrapping backdrop in `<BlurTargetView>`** and passing its ref. `blurReductionFactor` (default 4) to match iOS. | **Honest by default**, capture opt-in. Real blur needs explicit target wiring; **can't cross a `Modal` boundary** (separate window) — known issue #44165. |
| **@react-native-community/blur (margelo)** | `UIVisualEffectView` on iOS; Android via Dimezis `BlurView`. | Real backdrop blur on Android but inherits BlurView constraints (no SurfaceView, snapshot sync, RenderScript deprecation churn). |
| **Dimezis/BlurView (the native lib underneath)** | V3: snapshot a `BlurTarget` into a RenderNode, blur it (API 31+ render-thread; RenderScript pre-31). | Best-in-class capture; explicit target wrapping; SurfaceView/TextureView limits; pre-31 path deprecated. |
| **react-native-skia `BackdropBlur`** | Backdrop filter only blurs content **drawn within the same Skia `Canvas`**; *"not applied on Android"* for arbitrary RN views behind it; `makeImageFromView` misses overlapping RN views on Android. | Real backdrop blur **only inside Skia's own canvas** — doesn't blur the RN view tree. Heavy dependency and not the current thesis. |

The clear convergent pattern: **nobody gets free in-tree backdrop blur; everyone
who does real blur makes the user wrap the backdrop in an explicit target, and
the common default is honest translucency.**

## Decisions

> **Scope note:** these are decisions for the **eventual Android backend**, not
> iOS V1. iOS V1 ships the Metal `ShaderView` and does not include Android glass.
> "When Android lands" below = the later divergent backend.

**When Android lands, it ships honest approximate glass by default, with an
opt-in capture-based backdrop mode. We do NOT claim free in-tree frosted glass.**

1. **Default = approximate glass (no backdrop sampling).** `<GlassView>` with no
   extra wiring renders translucent fill + noise + edge highlight + rounded
   `clipToOutline`, on **API 24+**. No RenderScript, ever. This is the
   `expo-blur` default model and it is the *correct, non-leaky* default: it
   never silently degrades, never breaks across `Modal`/window boundaries, and
   has predictable overdraw. The Android-backend glass demos (card-in-bottom-sheet,
   press, nav/tab bar) are designed to look premium in this mode.

2. **Opt-in backdrop mode via an explicit target wrapper.** For true frosted
   glass we adopt the proven shape: a `<GlassBackdropTarget>` the developer
   wraps around the content to be blurred, whose ref/registration the
   `<GlassView backdrop>` consumes. Native records that target into a
   `RenderNode`, applies `RenderEffect.createBlurEffect` (**API 31+**), and draws
   the blurred snapshot as the surface background beneath unblurred children.
   Refresh on view-tree change, **not per frame**. Below API 31, `backdrop`
   silently falls back to approximate (documented).

3. **Why opt-in, not default backdrop:** capture is where all the bugs live —
   staleness, SurfaceView/Map/Video/camera can't be captured, `Modal`/dialog
   window-boundary breakage, recursion if the target includes the surface, and
   real overdraw/battery cost on low-end devices. Making it default would make
   GlassView fragile in exactly the hard cases the research thesis calls out
   (bottom-sheet/pager/modal). Opt-in keeps the 95% path bulletproof and gives
   power users the real thing with eyes open.

4. **No RenderScript, no AGSL, no window-blur in the Android glass backend.**
   RenderScript is deprecated/removable. AGSL (API 33) and window/cross-window
   blur are parked *relative to glass*: AGSL → the separate Android custom-shader
   surface (the future analog of the iOS `ShaderView`, see #6);
   `setBackgroundBlurRadius` → a future *true modal/dialog scrim* feature (it's
   the right tool only for full-window blur on capable devices), tracked as an
   open item, not part of the glass backend.

5. **Preset config already anticipates this** (the research preset model's `android` block:
   `backend:"render-effect", blur, saturation, noise, highlightOpacity`).
   Resolution: `backend:"render-effect"` means *own-content/backdrop-snapshot
   RenderEffect*, applied only when `backdrop` is enabled **and** API ≥ 31;
   otherwise the same preset renders its translucent/noise/highlight values
   without blur.

**What we document to users (feeds `gotchas.md` + `glass-view.md`):**
- "On Android, GlassView is **translucent material by default** — it does not
  sample the content behind it. This is intentional: it's robust everywhere and
  cheap. iOS uses true system materials; we promise equal polish, not pixel
  parity." (research thesis stance.)
- "For **true backdrop blur on Android**, wrap the background in
  `<GlassBackdropTarget>` and set `backdrop` on the GlassView. Requirements &
  limits: **Android 12 / API 31+**; backdrop and glass must be in the **same
  window** (won't reach across a React Native `Modal`); **cannot blur** video,
  maps, camera, or other `SurfaceView` content; use sparingly (one live-glass
  surface per screen) for battery."
- "Below Android 12, backdrop mode degrades to translucent automatically."

## Open questions

> All items below are **future-Android** (the later divergent backend), not iOS
> V1 blockers. They run when Android work starts.

- **Future-Android substrate (recentering question):** spec the Android analog of
  the iOS Metal `ShaderView` on **AGSL `RuntimeShader`** — runtime-compiled
  shader source driven via `RenderEffect.createRuntimeShaderEffect` (own-content)
  vs a drawn `SurfaceView`/`TextureView` + render loop (interactive shader
  surface). Decide which substrate carries the `ShaderView` port and how uniforms
  / interaction map onto it. This, not glass, is the real Android shader-view
  path (cross-ref `08-shader-accents-and-distribution.md`,
  `09-api-layering.md`).
- **On-device:** does `RenderEffect` blur on a self-managed backdrop `RenderNode`
  composite cleanly with rounded `clipToOutline` (no edge halo) using
  `CLAMP` vs `MIRROR`? Pick the default tile mode from measurement.
- **On-device:** cheapest correct snapshot-refresh trigger — `ViewTreeObserver`
  pre-draw vs `OnPreDrawListener` on the target vs invalidate-on-scroll — and its
  real frame cost on a low-end device (e.g. Go-class). Validates the "not
  per-frame" claim.
- **On-device:** Fabric/view-flattening interaction — does our `ExpoView`
  GlassView get collapsed such that `setRenderEffect`/outline clipping is lost?
  (cross-ref `06-lifecycle-and-teardown.md`; may need `collapsable={false}`).
- **On-device:** overdraw budget — how many stacked approximate GlassViews before
  jank on a low-end device; confirm reused-noise-drawable strategy holds.
- **API surface:** finalize `<GlassBackdropTarget>` naming + registration
  mechanism (ref vs context) so it stays ergonomic and Fabric-safe.
- **Future:** spec a real **modal/dialog blurred scrim** built on
  `Window.setBackgroundBlurRadius` (gated by `isCrossWindowBlurEnabled()`),
  separate from in-tree GlassView.

## Sources
- `RenderEffect` (added API 31; `createBlurEffect` signatures; `createRuntimeShaderEffect`):
  https://developer.android.com/reference/android/graphics/RenderEffect
- `View.setRenderEffect` (added API 31; remove via `null`):
  https://developer.android.com/reference/android/view/View
- Chet Haase, *Blurring the Lines* (RenderEffect blurs own content; offscreen render→blur→copy):
  https://medium.com/androiddevelopers/blurring-the-lines-4fd33821b83c
- Chet Haase, *RenderNode for Bigger, Better Blurs* (blur a RenderNode you record):
  https://medium.com/androiddevelopers/rendernode-for-bigger-better-blurs-ced9f108c7e2
- AOSP *Window blurs* (`setBackgroundBlurRadius` / `blurBehindRadius`, API 31, window-only, gated, expensive, radius guidance):
  https://source.android.com/docs/core/display/window-blurs
- `WindowManager.LayoutParams.blurBehindRadius`:
  https://learn.microsoft.com/en-us/dotnet/api/android.views.windowmanagerlayoutparams.blurbehindradius
- `RuntimeShader` / AGSL (API 33, own-content filter, `createRuntimeShaderEffect(... "background")`):
  https://developer.android.com/reference/android/graphics/RuntimeShader
  https://developer.android.com/develop/ui/views/graphics/agsl/using-agsl
- *Migrate from RenderScript* (RenderScript deprecated since API 31; use RenderEffect for blur):
  https://developer.android.com/guide/topics/renderscript/migrate
- `PixelCopy` (API 24, async Surface→Bitmap, can read SurfaceView):
  https://developer.android.com/reference/android/view/PixelCopy
- *Create shadows and clip views* (`clipToOutline`, round-rect only, clip is expensive / don't animate):
  https://developer.android.com/training/material/shadows-clipping
- expo-blur `BlurView` (Android methods `none`/`dimezisBlurView`/`dimezisBlurViewSdk31Plus`, `BlurTargetView`, default `none`, `blurReductionFactor`):
  https://docs.expo.dev/versions/latest/sdk/blur-view/
- expo-blur Modal/window-boundary limitation (issue #44165):
  https://github.com/expo/expo/issues/44165
- Dimezis/BlurView (V3 BlurTarget snapshot, API-31 split, SurfaceView/TextureView limits, no self-invalidation):
  https://github.com/Dimezis/BlurView
- @react-native-community/blur (UIVisualEffectView iOS + Dimezis BlurView Android):
  https://www.npmjs.com/package/@react-native-community/blur
- react-native-skia *Backdrop Filters* (backdrop only within Skia canvas; Android limitations, issues #479/#2741/#1633):
  https://shopify.github.io/react-native-skia/docs/backdrops-filters/
