# Gestures & interaction
Status: researched
Feeds: skills/react-native-fx/references/interaction.md, references/effect-pressable.md

## Why this matters
Interaction is **the differentiator**. fx V1 is *the interactable native iOS Metal
`ShaderView`*: a real Metal surface (`MTKView` / `CAMetalLayer`) that renders shader output
and **stays fully interactive as one native unit**. The reason it is interactive is
structural and load-bearing: **the Metal surface is an ordinary UIKit `UIView`.** A native
gesture recognizer attaches to it directly, native touch flows into it the same way it flows
into any button, and the whole surface presses, highlights, and springs back without anything
crossing the JS bridge per frame.

**The one architectural choice, in one paragraph.** We render the shader into our own UIKit
Metal-surface `UIView` (`MTKView` / `CAMetalLayer`) *precisely so the surface stays
interactive without severing React Native touch*. The tempting alternative — SwiftUI's
`.layerEffect` — would force RN content to be hosted inside SwiftUI (`UIHostingController` /
`RNHostView`) to receive a stitchable shader, and that hosting severs RN/RNGH touch. By owning
a plain `UIView` instead, the surface is a first-class UIKit citizen in the native RN view
tree: the cooperative press recognizer attaches directly, ordinary UIKit/RNGH arbitration
mediates it for free, and JS only ever receives semantic events. (The full "why hosting
swallows touch" analysis is kept as a brief reference at the end of Findings — it is the
*rationale* for this choice, not the spine of the doc.)

The interaction model: **native owns touch and feeds it into shader uniforms.** Press /
highlight / pointer location are computed natively (per `.changed` / `ACTION_MOVE`) and pushed
into the shader's uniform buffer each frame on the native side (`pressDepth`, `glowX`,
`glowY`; cross-ref `08-shader-accents-and-distribution.md`). JS configures the surface and
supplies imperative inputs (`setUniform` / `setHighlight` via `AsyncFunction`), and receives
**semantic** events (`onPress*`) via Expo `Events` — never per-pointer, never driving frames.

The spine of this doc is the **`interactionMode` prop** and its four values — exactly what
each attaches and does — plus the cooperative native press recognizer they share, the
semantic-events contract, and how interaction feeds the uniform buffer. The interaction
decision is a **cooperative native press recognizer** that *participates in* each platform's
native arbitration, never a custom arbiter racing RNGH. Press-class only for V1; drag/tilt
(G3) deferred. Builds on the Expo Modules view DSL from `01-expo-modules-view.md` (events via
`Events` / `EventDispatcher`, imperative inputs via `AsyncFunction`).

**V1 boundary (explicit):** the Metal `ShaderView` is interactive **as one unit**. Arbitrary
RN children rendered inside / behind the shader are **not** individually touchable through the
shader — the surface is a single native interactive element, not a touch-transparent window
onto a live RN subtree. (Layered composition — shader behind, or a `pointerEvents="none"`
overlay above interactive RN content — is covered in `09-api-layering.md`.)

## Research questions
- The public `interactionMode: 'none' | 'passive' | 'active' | 'controlled'` prop — define
  *exactly* what each value attaches and does, with the default being do-not-claim.
- iOS: `UILongPressGestureRecognizer` with `minimumPressDuration = 0` attached **directly to
  the Metal `UIView`** to get press-in/out *and* finger location every callback.
  `UIGestureRecognizerDelegate` for `shouldRecognizeSimultaneously` / `require(toFail:)`.
  Confirm a parent `UIScrollView` pan claims on movement and cancels ours. **Never** raw
  `touchesBegan/Moved/Ended`.
- **Cancellation behavior.** The iOS scroll-cancel / spring-back path: parent `UIScrollView`
  (or pager/sheet) claims past slop → our recognizer gets `.cancelled` → spring back, emit no
  `onPress`. Android later (`ACTION_CANCEL`).
- **Interaction feeds uniforms.** How native-computed press/highlight/pointer values
  (`pressDepth`, `glowX`, `glowY`) are written into the shader's uniform buffer each frame on
  the native side, and how JS-supplied imperative inputs (`setUniform` / `setHighlight`) land
  in the same buffer (cross-ref `04`, `08`).
- Emitting **semantic** events to JS via Expo Modules `Events` (`onPress`, `onLongPress`,
  `onPressIn`, `onPressOut`) — NOT per-pointer-move.
- **`controlled` mode (first-class):** attach no recognizer (zero arbitration). Discrete
  driving via props (`pressed`, `highlight={{x,y}}`) + imperative (`ref.setHighlight(...)` /
  `ref.setUniform(...)`). Continuous animated-props path is post-V1 (Reanimated) — note the
  boundary, don't build it.
- Android (later backend): the hierarchical interception contract — `onInterceptTouchEvent`
  (parent steals), `requestDisallowInterceptTouchEvent` (child defends), and handling
  `ACTION_CANCEL` to spring back.
- Coexistence test matrix: inside ScrollView, pager, bottom sheet, with RNGH present.
- (Reference) *Why* a Metal-surface `UIView` and not SwiftUI `.layerEffect` — the touch-swallow
  rationale, kept brief.

## Findings

### The `interactionMode` prop — the four modes (the spine)
The entire public interaction surface is one prop:

```ts
interactionMode: 'none' | 'passive' | 'active' | 'controlled'   // default: 'none'
```

The shared `ShaderView` base (`01-expo-modules-view.md`) owns the single attach/detach point,
so a decorative surface (`none`), a pointer-light surface (`passive`), an `EffectPressable`
(`active`), and a developer-driven surface (`controlled`) all share one code path. Default is
`none`: **fx claims nothing unless asked.**

| Mode | What it attaches | What it does | Claims the gesture? | Use |
|---|---|---|---|---|
| **`none`** | nothing (iOS: no recognizer; Android: `onTouchEvent` returns `false`) | no touch handling at all; touches pass straight through | never | decorative / background / backdrop shader surfaces |
| **`passive`** | the cooperative `UILongPressGestureRecognizer(minimumPressDuration=0)`, `cancelsTouchesInView=false`, delegate `simultaneous→true`; Android handles touches but **never** `requestDisallowInterceptTouchEvent` | **observes** the pointer and feeds a pointer uniform (`glowX`/`glowY`), but **never claims** the gesture and emits **no** `onPress*` semantics | never | finger-following / hover-like light that must not interfere with scroll |
| **`active`** | the **same** recognizer, now **owning the press**: cooperative `UILongPressGestureRecognizer(minimumPressDuration=0)` + delegate simultaneity; Android `requestDisallowInterceptTouchEvent(true)` on down, released at slop | full press lifecycle: writes `pressDepth`/`glowX`/`glowY`, emits `onPressIn/onPressOut/onPress/onLongPress`; **yields to scrollers on movement** (cancelled past slop) | press only (yields on movement) | pressable shader cards, magnetic buttons |
| **`controlled`** | **nothing** — attaches **no** recognizer (zero arbitration), identical to `none` for the gesture system | developer drives inputs via the ref methods (`setUniform` / `setHighlight`) and/or props (`pressed`, `highlight`); the developer's own pipeline (RNGH/Reanimated/custom) is the sole gesture owner | never | developer-owned gesture pipeline drives the uniforms |

Read the modes as a 2×2:
- **Who attaches a recognizer?** Only `passive` and `active`. `none` and `controlled` attach
  nothing.
- **Who claims / emits semantics?** Only `active`. `passive` observes-only (pointer uniform, no
  `onPress*`); `none` is inert; `controlled` is developer-owned.

`passive` and `active` share the *exact same* recognizer construction (below); the only
difference is whether it **owns the press** — i.e. defends briefly (Android) and emits
`onPress*` semantics (`active`), vs. observe-and-feed-uniform-only (`passive`).

---

### The cooperative principle — the press recognizer attaches to the Metal `UIView`
The Metal surface is a plain UIKit `UIView` (an `MTKView` subclass, or a `UIView` hosting a
`CAMetalLayer`; see `01-expo-modules-view.md`). Because it is a normal view, `passive`/`active`
attach a single cooperative native press recognizer **directly to it** — exactly as you would
to a button. No hosting, no bridging, no severed responder tree.

A press effect needs three things from input: **press-in** (finger down → highlight/depth),
**finger location** while held (for finger-following light), and a clean **press-out / cancel**
(release → fire `onPress`; cancel → spring back, fire nothing). The decided design gets all
three from each platform's **existing arbitration system** so the recognizer is a
*participant*, not an arbiter:

- It begins eagerly on touch-down (so the effect lights up instantly).
- It **never claims movement**. The moment an ancestor scroller/pager/sheet decides the gesture
  is a scroll (touch crosses slop), that ancestor wins and our recognizer is **cancelled** — by
  the OS, not by our code. We handle the cancel by springing the effect back. Press-class is
  "cooperative for free": yielding *is* the default outcome of native arbitration; we render it.

Raw touch interception is the anti-pattern this avoids — see "Why not raw touches" below.

---

### Interaction feeds uniforms — native owns touch, drives the shader
The load-bearing model: **native computes interaction inputs and writes them into the shader's
uniform buffer; JS never drives frames.** The recognizer reads `location(in:)` each callback
and the native side turns press state + location into uniform values that the render loop reads
every frame:

- `pressDepth` (0→1) — driven by press-in / spring-back, optionally eased natively.
- `glowX`, `glowY` — the finger location (normalized to the surface) for finger-following
  light.
- any preset-specific uniforms the effect declares (cross-ref `04-preset-system.md`,
  `08-shader-accents-and-distribution.md` for the uniform-buffer layout and how shader
  functions are selected/bound).

There are **two input sources into the same uniform buffer**, and the renderer is decoupled
from which one is active (research principle):

1. **The cooperative recognizer** (`passive` / `active`) writes `pressDepth` / `glowX` /
   `glowY` on `.began` / `.changed` / `.ended` / `.cancelled`. (`passive` writes only the
   pointer uniforms — no `pressDepth` press lifecycle.)
2. **JS imperative inputs** — `setHighlight({x,y,intensity})` and the general
   `setUniform(name, value)` (main-thread `AsyncFunction`s on the ref; see
   `01-expo-modules-view.md`) write the same named uniforms. This is how **`controlled`** mode
   and developer-owned pipelines drive the shader.

Per-frame finger updates are written to the uniform buffer **natively** and never cross the
bridge. Only **semantic** events (`onPress*`) go to JS, via Expo `Events`. The exact uniform
names, buffer struct, and per-frame upload mechanism live in `08`; this doc owns *who supplies
the values and when*. **The shaded surface is ONE interactive unit** — the uniforms describe a
single press/pointer on the whole surface, not per-child touch targets (V1 boundary, below).

```swift
// inside the recognizer handler (iOS) — native writes uniforms, emits semantics
case .began:
  view.setUniform("pressDepth", 1)              // → uniform buffer, read each frame (active)
  view.setUniform("glowX", nx); view.setUniform("glowY", ny)
  view.emitPressIn(x: p.x, y: p.y)              // semantic event to JS (active)
case .changed:
  view.setUniform("glowX", nx); view.setUniform("glowY", ny)  // native only — not to JS
```

---

### iOS — `UILongPressGestureRecognizer`, `minimumPressDuration = 0`, on the Metal view

`UILongPressGestureRecognizer` is a **continuous** recognizer. Configure it with
`minimumPressDuration = 0`: it then transitions to `.began` immediately on touch-down (no hold
delay), and reports `.changed` on every finger move, `.ended` on lift, and `.cancelled` when
arbitration takes the touch away. Each callback exposes `location(in:)` — so one recognizer
gives press-in, continuous finger location, and press-out/cancel without per-pointer plumbing
to JS. It attaches straight onto the Metal `MTKView` / `CAMetalLayer`-backed `UIView`. Both
`passive` and `active` use this construction; `passive` simply ignores the press lifecycle and
emits no semantics.

Important nuance from the docs: `allowableMovement` (default 10pt) only gates the
**pre-`.began`** phase. Because we begin at duration 0, the touch has already begun, so
`allowableMovement` is effectively moot — after `.began` the finger moves freely and the
recognizer does **not** self-fail on movement. That is intentional: we do *not* want our
recognizer deciding "this became a scroll." That decision belongs to the ancestor
`UIScrollView`'s `panGestureRecognizer`, which claims once the touch crosses the scroll view's
pan threshold and then **sends our recognizer `.cancelled`**. (UIKit also `delaysContentTouches`
by default, briefly holding touch delivery so the scroll view can decide first; that is the
system doing arbitration for us.)

```swift
// FxPressRecognizer.swift — cooperative press recognizer (iOS), on the Metal ShaderView.
// Constructed for both passive and active; `mode` gates press-ownership/semantics.
final class FxPressRecognizer {
  private weak var view: FxShaderView?            // the MTKView/CAMetalLayer UIView
  private let press = UILongPressGestureRecognizer()
  private let mode: InteractionMode               // .passive or .active
  private var didEnter = false

  init(view: FxShaderView, mode: InteractionMode) {
    self.view = view
    self.mode = mode
    press.minimumPressDuration = 0          // begin immediately on touch-down
    press.cancelsTouchesInView = false      // do NOT swallow touches from others
    press.delaysTouchesBegan = false
    press.delaysTouchesEnded = false
    press.delegate = view.gestureCoordinator // see delegate below
    press.addTarget(self, action: #selector(handle(_:)))
    view.addGestureRecognizer(press)        // ← straight onto the Metal UIView
  }

  @objc private func handle(_ g: UILongPressGestureRecognizer) {
    guard let view else { return }
    let p = g.location(in: view)
    switch g.state {
    case .began:
      didEnter = true
      view.updateHighlight(at: p)          // passive + active: write glowX/glowY (pointer)
      if mode == .active {
        view.renderPressIn(at: p)          // write pressDepth, instant
        view.emitPressIn(x: p.x, y: p.y)   // semantic event to JS
      }
    case .changed:
      view.updateHighlight(at: p)          // native: write glowX/glowY — NOT sent to JS
    case .ended:
      if didEnter && mode == .active {
        view.renderPressOut(springBack: true)   // ease pressDepth back to 0
        view.emitPressOut()
        if view.bounds.contains(p) { view.emitPress() }  // tap-up-inside
      }
      didEnter = false
    case .cancelled, .failed:
      // CANCELLATION PATH: a parent UIScrollView pan (or sheet/pager) claimed the
      // touch. Spring back, emit NO onPress.
      if didEnter && mode == .active { view.renderPressOut(springBack: true); view.emitPressOut() }
      didEnter = false
    default: break
    }
  }
}
```

**Delegate — coexistence, not combat.** A `UIGestureRecognizerDelegate` controls how our
recognizer relates to *other* recognizers on the same touch. By default recognizers are
mutually exclusive; the delegate lets us opt into simultaneity and failure ordering so we never
block scroll/RNGH:

```swift
// FxGestureCoordinator.swift — UIGestureRecognizerDelegate
extension FxGestureCoordinator: UIGestureRecognizerDelegate {
  // Be a good citizen: let scroll views, RNGH recognizers, etc. recognize
  // alongside us. We don't block them; they cancel us when they claim.
  func gestureRecognizer(_ g: UIGestureRecognizer,
      shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
    return true
  }
  // We do NOT require others to fail before us, and we do NOT require-toFail
  // others (that would starve scrolling). Default ordering + simultaneity is
  // sufficient because our recognizer claims nothing.
  func gestureRecognizer(_ g: UIGestureRecognizer,
      shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
    return false
  }
}
```

The two delegate levers, used surgically:
- `shouldRecognizeSimultaneouslyWith → true`: our press coexists with the ancestor pan and with
  RNGH's own recognizers; nobody is forced to lose at touch-down.
- `require(toFail:)` / `shouldBeRequiredToFailBy(_:)`: explicit failure dependencies. V1 needs
  neither aggressively — because our recognizer never *competes for movement*, the scroll view
  simply wins on movement and cancels us. We keep these as the documented escape hatch for G3
  drag.

**Why not raw `touchesBegan/Moved/Ended`.** Overriding the `UIResponder` touch methods on the
view bypasses the gesture-recognizer arbitration graph entirely: you don't participate in
`delaysContentTouches`, you don't get cancelled when a scroll view claims, you can't express
simultaneity/failure relations, and you fight RNGH (which is itself built on
`UIGestureRecognizer`s). The recognizer path is the *only* one that cooperates with UIKit and
RNGH — and it works precisely *because* the Metal surface is a plain `UIView`.

---

### Cancellation behavior — the scroll-cancel / spring-back path
The single most important runtime behavior to get right is **cancellation**: when an ancestor
scroller claims the gesture, the effect must **spring back** and emit **no** `onPress`.

- **iOS (lead).** A parent `UIScrollView`/pager/sheet's `panGestureRecognizer` claims once the
  finger crosses its pan threshold (slop). UIKit then delivers `.cancelled` to our recognizer.
  We handle `.cancelled` (`active` mode) by easing `pressDepth` back to 0 (spring-back),
  emitting `onPressOut`, and emitting **no** `onPress`. `delaysContentTouches` gives the press a
  fair shot first; if the finger never moves, the scroll view never claims and a clean
  `onPress` fires on lift. This `.cancelled`-vs-`.ended` distinction is the #1 device-validation
  item (Open questions).
- **Android (later backend, below).** The equivalent trigger is a single
  `MotionEvent.ACTION_CANCEL` delivered to our child view the instant a parent crosses slop and
  steals the stream; we treat it identically to iOS `.cancelled`.

Spring-back is a native render concern (ease `pressDepth → 0`); it never round-trips through JS.

---

### Semantic events to JS — `Events`, not per-pointer
Per the Expo Modules DSL (`01-expo-modules-view.md`), the view declares
`Events("onPress", "onPressIn", "onPressOut", "onLongPress")` and fires them via
`EventDispatcher`. These are **semantic, low-frequency** signals only, and only in `active`
mode:

- `onPressIn` — finger down / `.began` / `ACTION_DOWN` (may carry `{x,y}` of the initial
  contact for app logic; optional).
- `onPressOut` — release or cancel.
- `onPress` — release **inside** bounds (tap-up-inside); **not** emitted on cancel.
- `onLongPress` — held past the long-press timeout without crossing slop.

**Per-pointer `.changed` / `ACTION_MOVE` is written to the uniform buffer natively and never
crosses the bridge.** Finger-following light updates the native render directly (writes
`glowX`/`glowY`), so there is nothing on the JS thread per frame — the core "JS configures,
native renders" rule. JS learns *that* a press happened, not *where the finger is each frame*.
`passive` emits **no** semantic events at all (observe-only); `none` and `controlled` emit none
either.

---

### `controlled` mode — zero arbitration (first-class)
`controlled` is a **first-class interaction mode**, not a workaround. It is the direct
expression of the "renderer decoupled from input source" principle: the built-in recognizer is
*one* uniform driver; an external pipeline is *another*; same native render function and same
uniform buffer. In `controlled` mode the library **attaches no recognizer at all** (iOS: no
`addGestureRecognizer`; Android: `onTouchEvent` returns `false`, identical to `none` for
touch). There is therefore *zero* arbitration conflict — the developer's own pipeline (RNGH,
Reanimated, custom) is the only thing touching the gesture system. The developer drives press
depth / highlight / arbitrary uniforms via the **ref methods** and/or **props**.

**Discrete / low-frequency → props + imperative ref methods (V1, ships now):**

```tsx
// props — declarative discrete state
<ShaderView interactionMode="controlled" pressed={isPressed} highlight={{ x, y }} />

// imperative — main-thread AsyncFunctions on the ref (see 01-expo-modules-view.md)
ref.current?.setHighlight({ x, y, intensity });   // convenience → glowX/glowY/pressDepth
ref.current?.setUniform("pressDepth", 0.6);       // general escape hatch → any uniform
```

Both paths land through the same Expo DSL we already use: `Prop("pressed")` /
`Prop("highlight")` (stash + apply in `OnViewDidUpdateProps`, writing the uniform buffer) and
`AsyncFunction("setHighlight")` / `AsyncFunction("setUniform")` (main-thread, ref-attached,
writing the same buffer). Good for "toggle the effect from my own logic." Driving these *every
frame* from JS would be the JS-per-frame trap.

**Continuous / per-frame → Reanimated animated props (POST-V1 — boundary only).** The
continuous path (developer's own pan writes shared values on the UI thread, bound to the view's
uniforms via animated props, reaching native off the JS thread) is post-V1 work. **V1 does not
build it.** The boundary is precise:

- **In V1:** `controlled` accepts discrete `pressed` / `highlight` props and the
  `setHighlight` / `setUniform` imperatives. That's the whole contract.
- **Post-V1:** an `animatedProps={{ glowX, glowY }}` channel on an `AnimatedShaderView` for
  silky 120fps bring-your-own-gesture. Out of scope for this doc and `05`'s deliverable.

So: design the V1 discrete `controlled` inputs to be a clean *subset* of the eventual continuous
inputs (same native render function, same uniform names) so the post-V1 animated-props path is
additive, not a rewrite.

---

### Android — the hierarchical interception contract (later backend)

iOS is the lead platform; Android is a later divergent backend (`08`, README). The interaction
contract there is the **dispatch hierarchy**, not a recognizer graph. A `ViewGroup` parent sees
every touch first via `onInterceptTouchEvent(ev)`:

- Parent returns **`false`** from `onInterceptTouchEvent` → it only "spies"; the event flows
  down to the child's `onTouchEvent`. This is the resting state.
- Parent returns **`true`** (e.g. a `ScrollView`/`RecyclerView`/`ViewPager2` once the finger
  crosses **touch slop**) → it **steals** the stream. The child handling the touch is delivered
  a single **`MotionEvent.ACTION_CANCEL`**, and subsequent events go to the parent.

So on Android the *spring-back trigger is `ACTION_CANCEL`*, delivered by the OS the instant a
scroller decides this is a scroll — the direct analogue of iOS `.cancelled`. Our shader view is
the child; it handles touches in `onTouchEvent` and treats `ACTION_CANCEL` exactly like a
cancelled iOS recognizer. Touch slop comes from `ViewConfiguration.get(context).scaledTouchSlop`
— the same constant the framework's scrollers use, so our notion of "moved too far" matches
theirs.

```kotlin
// FxShaderView.kt — cooperative press on Android (child of the scroller)
class FxShaderView(context: Context, appContext: AppContext)
    : ExpoView(context, appContext) {

  private val onPress by EventDispatcher()
  private val onPressIn by EventDispatcher()
  private val onPressOut by EventDispatcher()
  private val onLongPress by EventDispatcher()

  private val slop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f; private var downY = 0f
  private var pressed = false
  private var mode: InteractionMode = InteractionMode.NONE

  override fun onTouchEvent(ev: MotionEvent): Boolean {
    // NONE and CONTROLLED attach nothing — touch is not ours.
    if (mode == InteractionMode.NONE || mode == InteractionMode.CONTROLLED) return false
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downX = ev.x; downY = ev.y; pressed = true
        updateHighlight(ev.x, ev.y)                  // passive + active: write glowX/glowY
        if (mode == InteractionMode.ACTIVE) {
          renderPressIn(ev.x, ev.y)                  // write pressDepth
          onPressIn(mapOf("x" to ev.x, "y" to ev.y))
          // ACTIVE only: defend so a too-eager ancestor doesn't intercept before
          // the user actually moves. Released as soon as movement crosses slop.
          parent?.requestDisallowInterceptTouchEvent(true)
        }
        return true   // we want the stream (until/unless a parent steals it)
      }
      MotionEvent.ACTION_MOVE -> {
        updateHighlight(ev.x, ev.y)                  // write glowX/glowY — native only
        if (kotlin.math.hypot(ev.x - downX, ev.y - downY) > slop
            && mode == InteractionMode.ACTIVE) {
          // Past slop: stop defending. Ancestors may now intercept → they send us
          // ACTION_CANCEL and we spring back. This is the cooperative yield.
          parent?.requestDisallowInterceptTouchEvent(false)
        }
        return true
      }
      MotionEvent.ACTION_UP -> {
        if (pressed && mode == InteractionMode.ACTIVE) {
          renderPressOut(springBack = true); onPressOut(mapOf<String, Any>())
          if (inside(ev)) onPress(mapOf<String, Any>())   // tap-up-inside
        }
        pressed = false
        return true
      }
      MotionEvent.ACTION_CANCEL -> {
        // CANCELLATION PATH: a parent scroller/pager/sheet crossed slop and stole
        // the gesture. Spring back, emit NO onPress.
        if (pressed && mode == InteractionMode.ACTIVE) {
          renderPressOut(springBack = true); onPressOut(mapOf<String, Any>())
        }
        pressed = false
        return true
      }
    }
    return super.onTouchEvent(ev)
  }
}
```

`requestDisallowInterceptTouchEvent(true)` is the **child-defends** lever: it forbids *all*
ancestors from intercepting for the rest of this gesture (auto-clears at `ACTION_UP`/
`ACTION_CANCEL`). Used only in `active`, **released the instant the finger crosses slop**, so a
real scroll always still wins. In `passive` we never disallow interception — observe, don't
defend.

Long-press on Android: schedule a `Handler.postDelayed` for
`ViewConfiguration.getLongPressTimeout()` on `ACTION_DOWN`, fire `onLongPress` if still pressed
and un-moved, cancel the runnable on move-past-slop / up / cancel. (iOS gets long-press by
reading elapsed time in `.changed`, or by adding a second default-0.5s
`UILongPressGestureRecognizer`.)

**Why not intercept aggressively / a custom arbiter.** Returning `true` from
`onInterceptTouchEvent` on our own view, or permanently holding
`requestDisallowInterceptTouchEvent(true)`, *breaks* every parent scroller and fights RNGH
(whose `GestureHandlerRootView` orchestrator wants to arbitrate the whole tree). Staying a
well-behaved child that releases on slop is what makes us coexist.

---

### How RNGH coexists — and why our recognizer doesn't fight it
RNGH is built on the same primitives we are, so being a good native citizen is automatically
being a good RNGH citizen:
- **iOS**: RNGH implements every gesture as a (lightly customized) `UIGestureRecognizer`
  assigned to the detector's child view. Because our press is also a `UIGestureRecognizer` (on
  the Metal `UIView`) with `shouldRecognizeSimultaneouslyWith → true`, UIKit's arbitration graph
  already mediates both. A developer can additionally bind us via RNGH's
  **`simultaneousWithExternalGesture`** / **`NativeGesture`**.
- **Android**: RNGH's `GestureHandlerRootView` intercepts at the root and runs its own
  orchestrator. Our view sits *under* that as an ordinary child honoring
  `onInterceptTouchEvent`/`ACTION_CANCEL`; when RNGH (or a scroller it wraps) claims, we get
  `ACTION_CANCEL` and spring back — the path we already handle.

Net: no "RNGH integration" code path in V1. The press recognizer is just another native
recognizer/child, and both platforms' existing arbitration mediates it — the direct payoff of
keeping the Metal surface a plain `UIView`. (Deep, first-class RNGH composition is G3/post-V1.)

---

### Reference: why a Metal-surface `UIView`, not SwiftUI `.layerEffect`
This is the **rationale** for the architecture choice in *Why this matters* — kept brief here,
not the spine.

A custom `[[stitchable]]` MSL content-effect is only reachable from RN via SwiftUI's
`.layerEffect` (/`.colorEffect`/`.distortionEffect`); there is no UIKit/`CALayer`-level API for
a *stitchable* content-effect on a plain `UIView`. To apply `.layerEffect` to RN content, that
content must be **hosted inside SwiftUI** (`UIHostingController` / Expo's `RNHostView`). Once
hosted, **two stacked failures** break interaction:

1. **UIKit-behind-host blocking.** `UIHostingController`'s view captures touches across its
   *entire bounds* — it blocks all touches behind it. `HostingPassthrough`'s `hitTest` trick
   only redirects touches in **empty/transparent regions**; a `.layerEffect` covers the **whole
   surface**, so there is nothing to pass through — the trick can't help a full-surface shader.
2. **RN responder / RNGH severed.** RN's JS responder system and RNGH arbitrate in the **native
   RN view tree**. Re-parenting the RN subtree under a `UIHostingController` to receive
   `.layerEffect` hands hit-testing to SwiftUI; RN's responder and RNGH recognizers no longer
   see the touches, so the shaded child's `onPress`/`Pressable`/`GestureDetector` go dark.

**This swallow is iOS-only.** Android's equivalent custom effect is `RenderEffect` (AGSL
`RuntimeShader` via `View.setRenderEffect`) — a **draw-time** filter on the view's `RenderNode`,
*independent of input dispatch*. It does not re-parent, does not touch
`dispatchTouchEvent`/`onInterceptTouchEvent`/`onTouchEvent`; hit-testing stays intact.

**Surface-choice matrix (the conclusion):**

| Surface kind | How shader is applied | RN touch survives? | Interactive as one unit? | V1 |
|---|---|---|---|---|
| **Metal `ShaderView`** — `MTKView` / `CAMetalLayer`-backed `UIView` | native Metal render into a real `UIView` | ✅ normal UIKit view in the RN tree; recognizer attaches directly | ✅ **yes** | ✅ **core** |
| **SwiftUI `.layerEffect`** on hosted RN content | stitchable shader via `UIHostingController`/`RNHostView` | ❌ host blocks UIKit behind; RN/RNGH severed | ❌ per-child touch goes dark; trick can't help full surface | ❌ **rejected** |
| Generative shader, **background-behind** RN content | Metal surface as a separate lower layer | ✅ (content is its own layer above) | ✅ shader never intercepts | ✅ composition (`09`) |
| Generative shader, **overlay-above** with `pointerEvents="none"` | Metal surface as a decorative top layer | ✅ touches pass through | ✅ base below stays interactive | ✅ composition (`09`) |

The interactive fx surface is a **Metal-surface-`UIView`**, never a SwiftUI-hosted
`.layerEffect`. Layered composition modes (behind / `pointerEvents="none"` overlay) are in
`09-api-layering.md`; shader function shipping/binding is in
`08-shader-accents-and-distribution.md`.

---

### Coexistence test matrix
What to build into the V1 example app and verify (on device — see Open questions). "Spring
back" = effect returns to rest, **no** `onPress` fired.

| Container | Action | Expected | Verify |
|---|---|---|---|
| `ScrollView` / `FlatList` | tap a child `ShaderView` (`active`) | press-in → release → `onPress`; no scroll | tap-up-inside fires once |
| `ScrollView` / `FlatList` | press then drag to scroll | press-in → **cancel/spring-back** as scroll claims past slop; no `onPress` | iOS: `.cancelled`; Android: `ACTION_CANCEL` arrives |
| `ScrollView` | press, hold still, release without moving | `onPressIn` → `onPressOut` → `onPress` | scroll never steals when finger doesn't move |
| Pager (`ViewPager2` / `react-native-pager-view`) | press then swipe horizontally | spring-back as pager claims; page changes | pager wins on horizontal slop; no `onPress` |
| Bottom sheet (`@gorhom/bottom-sheet`, RNGH-based) | press content then drag sheet | spring-back as sheet pan claims; sheet moves | sheet's RNGH pan cancels ours cleanly |
| Bottom sheet | tap content (no drag) | `onPress` fires; sheet doesn't move | press wins when no drag |
| RNGH `GestureDetector` (`Pan`) wrapping the `ShaderView` | press then pan | RNGH pan activates past slop → our press cancels/springs back | both are recognizers/children; arbitration mediates |
| RNGH, developer wants both | press + their pan together | with `simultaneousWithExternalGesture` / `NativeGesture`, both can run | document the binding; not required for default coexist |
| `passive` mode inside `ScrollView` | drag across the surface | pointer light follows finger; scroll still works; no `onPress*` | passive never claims, never emits semantics |
| `controlled` mode inside any of the above | developer drives via props/ref | **no** recognizer attached; their pipeline is sole owner; uniforms follow their inputs | confirm zero double-handling |
| Nested fx surfaces | tap inner | only inner enters; outer doesn't (or both, per design) | decide + document nesting policy |

## Decisions
1. **`interactionMode: 'none' | 'passive' | 'active' | 'controlled'` is the public interaction
   contract**, default `none`. `none` attaches nothing (decorative); `passive` attaches the
   cooperative recognizer but only observes the pointer → feeds a pointer uniform, never claims,
   no semantics; `active` owns the press (cooperative
   `UILongPressGestureRecognizer(minimumPressDuration=0)` + delegate simultaneity; yields to
   scrollers on movement); `controlled` attaches **no** recognizer and the developer drives
   inputs via `setUniform`/`setHighlight` and/or props. The shared `ShaderView` base owns the
   single attach/detach point.
2. **The interactive surface is a Metal `ShaderView` that *is* a plain UIKit `UIView`**
   (`MTKView` / `CAMetalLayer`). That single structural fact makes it interactive as one native
   unit: the cooperative recognizer attaches **directly**, and ordinary UIKit/RNGH arbitration
   mediates it. We chose this over SwiftUI `.layerEffect` *precisely* so the surface stays
   interactive without severing RN touch (rationale kept as a brief reference, not the spine).
3. **Native owns touch and feeds it into shader uniforms.** Press / highlight / pointer →
   `pressDepth` / `glowX` / `glowY` written to the uniform buffer each frame on the native side.
   Two input sources into one buffer: the cooperative recognizer (`passive`/`active`), and JS
   imperatives `setHighlight` / `setUniform` (main-thread `AsyncFunction`s, used by
   `controlled`). JS does **not** drive frames (uniform layout / upload in `08`; values in
   `04`).
4. **One cooperative press recognizer per platform**, attached by the shared base only in
   `passive`/`active`.
   - iOS: `UILongPressGestureRecognizer`, `minimumPressDuration = 0`, `cancelsTouchesInView =
     false`, delegate `shouldRecognizeSimultaneouslyWith → true`. Read `location(in:)` each
     callback; write uniforms on `.changed`; spring back on `.cancelled`.
   - Android (later backend): handle touches in `onTouchEvent`; spring back on `ACTION_CANCEL`;
     `scaledTouchSlop` from `ViewConfiguration`.
5. **Cancellation = spring-back, no `onPress`.** Yielding is the default outcome, not custom
   logic: we never claim movement; the ancestor scroll/pager/sheet wins on slop and the OS
   cancels us; we render the spring-back. iOS cancel = `.cancelled`; Android cancel =
   `ACTION_CANCEL`.
6. **`active` may briefly defend, then release at slop** (Android
   `requestDisallowInterceptTouchEvent(true)` on down, `false` past slop). iOS needs no
   equivalent — `delaysContentTouches` + simultaneity already give the press a fair shot before
   the scroll view claims.
7. **No raw `touches*` / no `onInterceptTouchEvent` interception / no custom arbiter.** Those
   bypass arbitration and fight RNGH. Press-class only in V1.
8. **Events are semantic only** (`onPress`, `onPressIn`, `onPressOut`, `onLongPress`) via Expo
   `Events`/`EventDispatcher`, and only in `active`. Per-pointer move writes uniforms natively
   and never reaches JS. `passive` emits no semantics.
9. **`controlled` is first-class and attaches nothing** (zero arbitration). V1 ships discrete
   driving: `pressed` / `highlight` props + `setHighlight` / `setUniform` `AsyncFunction`s. The
   continuous Reanimated animated-props path is **post-V1**; V1 uniform names are a clean subset
   so it's additive later.
10. **V1 boundary: the shaded surface is ONE interactive unit — arbitrary RN children inside the
    shader are NOT individually touchable.** Layered composition (shader behind /
    `pointerEvents="none"` overlay above interactive RN content) is the supported way to keep RN
    children touchable (`09-api-layering.md`).
11. **No RNGH dependency or integration code in V1.** Coexistence is free because the surface is
    a plain `UIView` carrying a native recognizer (iOS) / a well-behaved child (Android). Deep
    RNGH composition (`simultaneousWithExternalGesture`/`NativeGesture` first-class) and the
    drag/tilt conflict-policy matrix are G3.

## Open questions
- **Device validation of the cancel path** is the #1 thing to confirm: that a parent
  `UIScrollView` reliably sends `.cancelled` (not just `.ended`) the instant it claims, and that
  Android delivers exactly one `ACTION_CANCEL`. Run the full coexistence matrix on real iOS (and
  later Android).
- **Uniform-write timing vs. the Metal render loop.** Confirm recognizer `.changed` writes to
  the uniform buffer are picked up on the next frame without a frame of lag or a tear, and decide
  whether `pressDepth` spring-back is eased on the native render thread or by re-writing the
  uniform each frame (cross-ref `08` for the per-frame upload mechanism).
- **iOS long-press semantics**: read elapsed time on `.changed` from the single duration-0
  recognizer, or attach a second default-0.5s `UILongPressGestureRecognizer` and wire
  `require(toFail:)` so a tap isn't also a long-press? Prototype both.
- **`@gorhom/bottom-sheet`**: its pan is RNGH, not a raw `UIScrollView`/Android scroller. Verify
  our recognizer is cancelled cleanly by an *RNGH* pan (the "hard case").
- **`react-native-pager-view` horizontal claim**: confirm spring-back fires on horizontal swipe
  and that vertical taps still produce `onPress`.
- **Nesting policy**: nested fx `ShaderView`s — does the inner alone enter, or both? Decide and
  document; affects delegate config on iOS.
- **`cancelsTouchesInView`/`delaysContentTouches` edge cases** with React Native's own touch
  responder system (the JS `Touchable`/Pressable path) when an fx `ShaderView` wraps RN
  touchables or vice-versa.
- **Coordinate units**: `{x,y}` in event payloads and `setHighlight` / `setUniform` — view
  points vs px vs the 0→1 normalized form the shader's uniform buffer wants; normalize in the JS
  wrapper or native? (Cross-ref `04-preset-system.md` and `08`.)

## Sources
- Expo UI — `RNHostView` (hosting RN children inside SwiftUI; layout bridging via shadow
  nodes): https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview/
- `UIHostingController` blocks all touches behind it; `hitTest`-override passthrough only works
  for *empty regions* not containing a SwiftUI view (so it can't help a full-surface shader);
  `.contentShape()` caveat: https://github.com/Priva28/HostingPassthrough
- Android `View.setRenderEffect` / `RenderEffect` — a draw-time render filter applied to the
  view's `RenderNode`, independent of input dispatch / hit-testing:
  https://developer.android.com/reference/android/view/View#setRenderEffect(android.graphics.RenderEffect)
  and https://developer.android.com/reference/android/graphics/RenderEffect
- `MTKView` (a `UIView` subclass that renders Metal content; integrates into a normal UIKit view
  hierarchy): https://developer.apple.com/documentation/metalkit/mtkview
- `CAMetalLayer` (a `CALayer` backing a `UIView` for Metal drawables):
  https://developer.apple.com/documentation/quartzcore/cametallayer
- `UILongPressGestureRecognizer` (continuous gesture; `.began/.changed/.ended/.cancelled`):
  https://developer.apple.com/documentation/uikit/uilongpressgesturerecognizer
- `minimumPressDuration` (default 0.5s; 0 ⇒ begin immediately on touch-down):
  https://developer.apple.com/documentation/uikit/uilongpressgesturerecognizer/minimumpressduration
- `allowableMovement` (gates pre-`.began` phase only; default 10pt):
  https://developer.apple.com/documentation/uikit/uilongpressgesturerecognizer/allowablemovement
- `UIGestureRecognizerDelegate` simultaneity / failure ordering
  (`shouldRecognizeSimultaneouslyWith`, `shouldBeRequiredToFailBy`, `require(toFail:)`;
  recognizers mutually exclusive by default):
  https://developer.apple.com/documentation/uikit/uigesturerecognizerdelegate/gesturerecognizer(_:shouldrecognizesimultaneouslywith:)
- UIScrollView arbitration / `delaysContentTouches` / scroll pan cancelling child gestures
  (WWDC 2014 #235 Advanced Scrollviews & Touch Handling): https://asciiwwdc.com/2014/sessions/235
- Android — Manage touch events in a ViewGroup (`onInterceptTouchEvent`, `ACTION_CANCEL` to
  child, `requestDisallowInterceptTouchEvent` duration, `ViewConfiguration.scaledTouchSlop`):
  https://developer.android.com/develop/ui/views/touch-and-input/gestures/viewgroup
- `ViewConfiguration` (touch slop, long-press timeout):
  https://developer.android.com/reference/android/view/ViewConfiguration
- RNGH — How does it work (iOS = customized `UIGestureRecognizer`s; Android =
  `GestureHandlerRootView` orchestrator):
  https://docs.swmansion.com/react-native-gesture-handler/docs/under-the-hood/how-does-it-work/
- RNGH — Native gesture / `simultaneousWithExternalGesture` (letting native components
  participate in RNGH relations):
  https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/native-gesture/
- Expo Modules API — `Events`/`EventDispatcher` + `AsyncFunction` (see `01-expo-modules-view.md`):
  https://docs.expo.dev/modules/module-api
