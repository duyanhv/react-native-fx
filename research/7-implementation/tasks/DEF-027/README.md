# DEF-027 — FxReveal geometric spine (anchored reveal, step 1)

Type: implement (code) + paired docs-closed ratification. Device-gated.
Trigger: maintainer picked anchored-reveal v1 (2026-06-29), after the recommendation-pass on
`research/wip/anchored-reveal-and-library-shape.md`. Ledger row minted at docs-closed.

This is **step 1 of two**: the geometric spine only. Chrome (radius morph + clip, then
border/background) is a **separate future row** — explicitly out of scope here.

## Goal

Ship `FxReveal` — a new native lifecycle component that reveals an fx-owned shell from its own
collapsed frame to an expanded placement (e.g. a card-sized chat-input chrome → a bottom-half
panel), using the inverse-transform technique so content renders sharp at target size. Step 1
proves the geometry, the content handoff, completion, and interruption. Square/unclipped corners
are acceptable in step 1.

## The decided public API (no anchor prop)

```tsx
<FxReveal
  open={cameraOpen}                       // discrete target: false = collapsed, true = expanded
  collapsed={<ChatInput borderless />}    // content shown in the collapsed frame
  expanded={<CameraView />}               // content shown at the expanded target
  preset="anchoredMorph"                  // behavior preset; OWNS the expansion target (bottom-half now)
  transition={{ preset: "platform", ios: { preset: "snappy" }, android: { preset: "materialEmphasized" } }}
  onTransitionEnd={(e) => {/* e.phase: 'expand' | 'collapse' */}}
/>
```

**No public `placement` prop (maintainer, 2026-06-29).** Per the repo's preset-first law (`50`:
preset names behavior, native resolves shape + timing), `preset="anchoredMorph"` **owns the default
expansion target** — bottom-half for now, platform-native later. `placement` was an implementation
knob leaking into the public API; it is removed from the public surface. Keep any internal placement
plumbing **private** (native default `bottom-half`) only if tests/native wiring need it — it must not
be a public prop. A typed override is a **future escape hatch**, not a v1 prop, and only when a
second real placement exists:

```tsx
// FUTURE — do NOT ship in step 1 (no second placement yet):
<FxReveal open={open} preset="anchoredMorph" target={{ kind: "panel", edge: "bottom", size: "half" }} />
```

Hard surface constraint (maintainer): **do not expose `from={{ anchor: ... }}` or any
anchor-shaped prop.** The collapsed frame is the shell's **own** laid-out frame (a self-read); the
public surface must read as the self-owned-shell model — `collapsed` content morphs into the
preset's target, never a cross-tree anchor lookup. `preset="anchoredMorph"` is acceptable for the
first pass; do **not** freeze additional preset names, the `target` escape-hatch type, or detailed
`transition` types beyond the DOC-034 hybrid principle (`41` decision 15). The `collapsed`/`expanded`
content-slot naming may be refined at review/docs-closed; the no-anchor-prop and no-public-placement
rules may not.

## The reveal-host requirement (maintainer-ratified, `54`/`50`, 2026-06-29)

For **interactive** expanded content, **the app owns the bounds-containing placement host; fx owns
the reveal animation inside it.** The app lays out a host — a root-level overlay, the app's own
portal, or RN `Modal` — whose bounds span the collapsed slot *and* the expanded target; `FxReveal`
fills that host, and fx reads the **collapsed slot/wrapper frame inside it** (one slot frame — a
self-read, never a descendant search or foreign ref). Without a bounds-containing host the panel
overflows a collapsed-sized parent and is **not touch-reachable on Android** (`TouchTargetHelper`
does not descend into a parent for out-of-bounds points). fx creates **no overlay window of its own**
(DEF-003 intact). The current native mechanic + the device gate live in `android-rework.md`.

## Boundary call — A by construction

This stays **Boundary A** only because v1 owns both endpoints: fx owns the shell, reads its **own**
frame, animates its own wrapper/transform, and never discovers or retains a foreign tree endpoint.
The canon's cross-tree frontier (`04 §The cross-tree frontier`, Decision 8) is where a *foreign*
anchor / shared-element read would land — gated by an `05` decision. `FxAnchor` (foreign-rect) is
deferred to exactly that gate and is out of scope here. No outside-sibling reflow (that is Boundary
L, out).

## Reuse vs build (grounded)

**Reuse (shipped — do not rebuild):**
- The fx-owned shell + RN-child hosting: `intermediateContainer` + symmetric mount/unmount
  (`packages/ios/FxSurfaceView.swift:126,468-477`; `packages/android/.../FxSurfaceView.kt:104-113,
  441-500`). This is the shell the reveal animates.
- The transform+opacity spring driver with retarget integrator (`FxAnimationDriver.{swift,kt}`):
  drives transform→identity and the content cross-fade (opacity), touch-safe; the retarget path
  (`FxSpring` / `SpringAnimation.animateToFinalPosition`) gives interruption for free.
- The self-frame geometry read (`FxLayoutObserver`, U5-001): supplies the collapsed `fromRect`.

**Build (new, both platforms):**
1. **Non-uniform scale** — `scaleX`/`scaleY` channels in `FxAnimationVector` + manifest
   `motion.properties` + both drivers. Today the driver collapses to one `scale`
   (`manifest.ts:224-230`; Android sets `scaleX = scaleY = scale`; iOS `fxScale = sqrt(a²+c²)`
   polar read-back must be replaced to survive independent axes — `FxAnimationDriver.swift:256-291`).
2. **Origin/pivot** control — pin the inverse transform to the collapsed rect's corner, not the
   shell center (nothing sets `anchorPoint`/`pivot` today).
3. **The reveal coordinator** — resolve `fromRect` (self-read) and `toRect` (placement, computed
   natively from container/window bounds, **never written into Yoga** — an fx-owned presentation
   overlay, no sibling reflow); lay the shell at `toRect`, apply the inverse transform so it starts
   at `fromRect`, animate transform→identity; cross-fade `collapsed`→`expanded` via opacity; emit
   one completion event per phase. Likely an `FxRevealCoordinator.{swift,kt}` on the shipped driver
   (the `FxPresenceCoordinator` is the precedent).

## Native mechanic direction (executor pins exact form; docs-closed records it)

- Closed: the shell is a normal in-flow fx-owned wrapper rendering `collapsed`; fx reads its frame.
- Open: fx realizes an fx-owned overlay sized to the resolved placement (no Yoga write), renders
  `expanded` at full target size, inverse-transforms (non-uniform scale + origin) to start at the
  collapsed frame, animates to identity; content cross-fades. Reverse on close.
- The exact overlay realization (how `toRect` is sized/positioned without a Yoga write) is the open
  mechanic the executor proves on device and `structure.{ios,android}` records at docs-closed.

## Out of scope (explicit)

- **No `FxAnchor`.** No foreign-rect reads (only the shell's own frame).
- **No shared-element retention / cross-tree endpoint discovery.**
- **No radius morph, no clip in step 1** (square/unclipped accepted). No border/background morph.
- **No layout reflow** — no Yoga/Fabric write; siblings stay put; the expanded panel is an overlay.
- **No iOS content sampling/distortion** (rule #4 — never host RN/camera content to sample it).
- No per-frame geometry or progress to JS. No `width`/`height`/`flex` on `fx.motion`.
- No camera-session/keyboard/focus lifecycle API (that surfaces only as a device-gate concern).
- No extra preset names or frozen `transition` types beyond `41` decision 15.

## Per-platform degradation

- **iOS < 17:** motion ladder empty → `{via:'none'}`, instant cut (placement correct, no
  animation). Reduce-motion (any version) → instant.
- **Android API 21+:** standard `androidx.dynamicanimation` `SpringForce`; M3 Expressive springs
  are progressive enhancement at API 23+ behind the optional `material3` peer. Reduce-motion →
  manual gate (`areAnimatorsEnabled()`).
- Non-uniform scale is built here; absent it would degrade to uniform.

## Authority sources

- `research/wip/anchored-reveal-and-library-shape.md` (the narrowed direction; this row promotes it).
- `0-spine/04`/`05` (Boundary A + the cross-tree frontier / Decision 8), CLAUDE.md rule #9.
- `1-surface/50` (preset-first surface direction, the layered library model), `3-motion/41`
  (decision 15 — the grammar + hybrid timing).
- `5-realization/structure.{ios,android}.md §motion` (the shipped wrapper + driver mechanics).
- The guides (Code Style, Code Comments, Testing, Device Verification, Contributing) — binding.

## Lifecycle + gates

1. **implement → headless-done (executor).** Build step 1 to this spec. Honor the out-of-scope
   list. Run all headless gates: `bun run lint`, `bun run build`, `bun run test` (Jest), Android
   `:react-native-fx:compileDebugKotlin`, iOS `pod install` + example `xcodebuild`, example tsc.
   Add a `reveal` example screen (collapsed card → bottom-half panel, with a live `CameraView` or a
   stand-in if camera setup is heavy). Write `evidence/headless.md` (the device runbook) + a
   `notes.md` with unverified claims. The executor does NOT close the device gate.
2. **device gate (maintainer).** card/collapsed → bottom-half reveal with correct geometry (sharp
   content at target size, no blur); camera preview renders + touch survives through the reveal;
   content cross-fade; interruption (open↔close mid-flight retargets cleanly, one completion event,
   correct phase); off-window pause + background/foreground; reduce-motion → instant; iOS < 17
   degradation (code-reasoned if no device). Square/unclipped accepted.
3. **docs-closed (planner) — the paired ratification.** Ratify the narrowed anchored-reveal
   direction in canon: `50` (FxReveal as the geometry-orchestration layer, preset-first, no anchor
   prop in v1, self-owned-shell model; FxAnchor deferred to the `05` cross-tree gate); `41`
   (anchoredMorph lowers to the target driver + the new non-uniform scale/origin channels); `04`/`05`
   (record v1-Boundary-A-by-construction + FxAnchor/foreign-rect = the cross-tree frontier gated by
   Decision 8); `structure.{ios,android} §motion` (inverse-transform mechanic, overlay-not-Yoga
   placement, non-uniform scale + origin/pivot, self-frame-read reuse, degradation); `manifest.ts`
   (`motion.properties` gains the new channels). Mint the ledger row. Promote the
   anchored-reveal WIP to derivation history with a banner (chrome/FxAnchor/Boundary-L scope stays
   as future). Write `reviews/DEF-027.md`.
4. **merge** on `integration/0.1.x` (maintainer tick).

The chrome step (radius morph + clip, then border/background) is a **future DEF row**, spec'd only
after this spine is device-verified.
