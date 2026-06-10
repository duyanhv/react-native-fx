# Interactive glass touch delivery — spike (sweep A2-4)

Status: ratified (2026-06-10) — the findings and fix direction (option 1, the UIKit rung) are promoted into `structure.ios.md` §material and `01-substrates-and-hosting.md` by the U3-002 glass-rung rework
Scope: find *why* the system-owned interactive glass press response does not fire on the
`hosted` substrate, with device evidence; answer the scroller-coexistence question. Findings +
recommended direction only — **no production fix landed here.** The diagnostic instrumentation
was reverted (Swift files restored to their exact pre-spike shasums; `xcodebuild` BUILD
SUCCEEDED and `swift:lint` clean on the reverted tree).

> Reproduced and then root-caused on device (iOS 26.5 sim, iPhone 17 Pro): on the
> hosting-parity glass stage with `Press response: interactive`, the clear-fill glass produces
> no system press response. The opaque build does.

## Root cause (resolved, device-grounded)

`.glassEffect(.interactive(true))` applied over a `.fill(.clear)` shape never materializes the
system's interactive-glass touch handler, so the press response cannot fire. The touch reaches
SwiftUI fine — what is missing is the **`UIPlatformGlassInteractionView`** that the interactive
glass installs only when it has a real (opaque) surface to ride.

This was proven by an A/B build with two backdrop-independent signals — a `hitTest` override on
`FxHostedView` logging the **UIKit view class** that wins the hit test, and a non-consuming
SwiftUI `simultaneousGesture` probe — frame-diff over the animated `aurora` was deliberately
**not** used (it is invalid and produced the prior false conclusion).

| Build | `FxMaterialView` iOS-26 body | `hitTest` result on the glass | SwiftUI probe | Press response |
|---|---|---|---|---|
| **A (opaque, committed `1471c19`)** | `Rectangle().glassEffect(resolvedGlass)` | **`UIPlatformGlassInteractionView`** (35×), `_UIHostingView` (5×) | fires | **yes** |
| **B (clear, working-tree A2-1/A2-2)** | `Rectangle().fill(.clear).contentShape(…).glassEffect(…, in:)` | **`_UIHostingView<AnyView>`** (72×), **zero** `UIPlatformGlassInteractionView` | fires | **no** |

Reading the table:

- **Touch delivery is identical and works in both builds.** `hitTest` resolves into the host
  (`inBounds=yes`) and the SwiftUI probe fires in A *and* B. So the carrier delivers the touch
  to SwiftUI regardless of fill. **H2 (the ScrollView / Fabric / hosting path swallows the
  press) is refuted** — and sweep candidate (a) with it.
- **The difference is one concrete UIKit view.** In the opaque build the interactive glass
  installs a `UIPlatformGlassInteractionView` that wins the hit test and handles the press. In
  the clear build that view never appears in the chain — only the generic `_UIHostingView` —
  so the touch lands on inert hosting content and no press response is produced. **H1 is
  confirmed, with a precise mechanism: a clear-filled shape gives the interactive glass nothing
  hittable to attach its interaction view to.**
- **"The opaque build responded" is real, not a frame-diff artifact.** A dedicated system
  interaction view (`UIPlatformGlassInteractionView`) is present and receiving the press in the
  opaque build and absent in the clear build — a pixel-independent fact from the log.
- The visual record agrees but is secondary: held-vs-rest video frames (geometry, not backdrop
  colour) show the opaque capsule with a subtle press state and the clear tile with none.

The `.contentShape(RoundedRectangle)` added in sweep round 2 explains why that fix did not
work: it restores hit-testing for *SwiftUI's own* gesture system (the probe fires), but the
**system glass interaction view does not consult it** — it keys off the modified content
itself being present.

### The deeper tension this exposes

A2-1 (the dark-box fix) and A2-4 (the interactive press) are in **direct conflict on the
SwiftUI rung**. The committed opaque `Rectangle()` produced *both* a dark fill (A2-1 bug) *and*
a working press (A2-4 pass). Switching to `.fill(.clear)` to kill the dark box is *exactly*
what removes the surface the interactive glass needs. So the current SwiftUI rung cannot have
both a clear backdrop and an interactive press at once — the fix must change the rung, not just
the fill.

## Scroller coexistence (SPINE-012 / `01` open question — answered)

Tested on the working (opaque) build, where the interaction view exists, with a clean A/B pan
at the same `y`, one starting on the glass tile and one on the left margin:

- **Drag starting on the glass → does not scroll.** `UIPlatformGlassInteractionView` captures
  the moving touch (logged repeatedly during the drag); the parent RN `ScrollView` never pans.
- **Drag starting anywhere else → scrolls normally** (same `gesture pan` primitive, same `y`;
  the grid above is revealed).
- **Tap/press on the glass → press response handled** (the interaction view wins the hit test).
- The high-level scroll (`agent-device scroll`) works throughout, confirming the list itself
  scrolls.

So the answer to "how does a `self`-gesturing hosted view coexist with the parent RN
scroller": **press and scroll coexist, with one caveat — the interactive glass wins for
touches that *begin on it*, so you cannot scroll by dragging *from* the glass.** This is the
standard iOS behaviour for an interactive system element (you do not scroll by dragging on a
button), and it is acceptable for a small glass control; it is a real limitation for a large
glass surface meant to be scroll-through. The arbitration is owned by Apple's interaction view,
not by fx — fx installs no recognizer on `hosted`.

## What this resolves

- **`01` open question "Self-gesturing inside a scroller"** (`01-substrates-and-hosting.md:122-123`)
  — answered for iOS: `self`-interaction glass inside an RN scroller delivers its press, and
  coexists with scrolling except for drags that start on the glass (which it captures).
- **SPINE-012's self-gesturing sub-question** (`decision-ledger.md:52`, "self-gesturing system
  components (glass `.interactive()`) inside RN scrollers") — the device behaviour is now
  characterised. (Closure stays the human gate; this spike does not tick it.)
- **The model is unchanged.** `material` stays `interaction:'self'`
  (`02-capability-ir-and-lowering.md:224`); interactive glass remains `hosted`, **not** an
  `expo-view` promotion. fx installs no gesture recognizer and drives no frame loop here — the
  system glass owns its own press. The fix is "make the hosted glass present a hittable surface
  to its own system interaction view (and accept/tune scroll capture)", which is a within-`hosted`
  change, not a substrate move. This keeps rule #3 (hosted = self-gesturing) and rule #4 (no RN
  content hosted/sampled) intact: the glass is self-contained fx-drawn content.

## Recommended fix direction (for a follow-up ratify/implement task — not done here)

Stay on `hosted`, keep `interaction:'self'`. The job is to give the interactive glass a real
hittable surface without reintroducing the A2-1 dark box. Options, strongest first:

1. **Move the glass rung to the UIKit `UIVisualEffectView` + `UIGlassEffect` surface** (the
   `references/expo/packages/expo-glass-effect/ios/GlassView.swift` precedent). That view is a
   real, hit-testable `UIView`; `effect.isInteractive = true` gives the press response without
   any clear-fill problem, and `cornerConfiguration` gives the rounded shape — so it resolves
   A2-1, A2-2, and A2-4 together. Tradeoff: a heavier UIKit rung that diverges from the other
   SwiftUI-modifier hosted views; must mirror the precedent's lifecycle quirks (create/recreate
   the effect in `layoutSubviews()`, clear the prior effect before toggling `isInteractive` —
   `GlassView.swift:53-63,221-228,251-273`). `structure.ios.md:113-114` already frames the
   SwiftUI rung as backed by the same system surface, so this is a realization swap, not a
   capability change.
2. **Keep SwiftUI but stop interposing a clear rectangle.** Apply `.glassEffect(_:in:)` to a
   view that genuinely *is* the glass content (sized container / real interactive element)
   rather than `Rectangle().fill(.clear)`, and verify on device that
   `UIPlatformGlassInteractionView` then appears in the hit-test chain. Cheaper and keeps the
   rung uniform, but depends on undocumented SwiftUI behaviour that this spike shows is
   fragile — must be device-verified by the same `hitTest`-class signal, not by eye.
3. **Scroll-through tuning (orthogonal, only if needed):** if a large glass surface must also
   scroll, the UIKit rung (option 1) can let the parent scroll pan win via the interaction
   view's gesture delegate; the SwiftUI rung gives no such lever. Default recommendation: accept
   the capture for interactive glass (it is correct iOS behaviour) and document it.

Whichever rung is chosen, the press response must be proven by the `hitTest`-view-class /
instrumented signal and closed at the human device gate — never by frame-diff over an animated
backdrop.

## Method and evidence (for audit)

- A/B builds of `example` against `packages/ios` (pod path `../../packages/ios`), Xcode 26.5,
  installed on the booted iPhone 17 Pro (iOS 26.5) sim; driven with agent-device; NSLog
  captured via `simctl spawn booted log stream --predicate 'eventMessage CONTAINS "fx-spike"'`.
- Instrumentation (reverted): a `hitTest(_:with:)` override on `FxHostedView` logging the
  winning view class for the `material` host, and a `.simultaneousGesture(DragGesture(minimumDistance: 0))`
  probe on the glass logging touch arrival. Build A also restored the committed opaque body.
  The probe is present in *both* builds, so it cannot explain the A/B difference.
- Evidence under `/tmp/fx-spike/` (this run): `RESULTS.txt` (the hitTest-class tallies above),
  `A-press.mp4`/`B-press.mp4` and `*-crop-*.png` (held-vs-rest glass geometry),
  `A-T-onglass-after.png` vs `A-C-offglass-after.png` (the coexistence A/B).
- Caveat retained: the held-vs-rest *visual* difference is subtle over the live backdrop; the
  load-bearing evidence is the `UIPlatformGlassInteractionView` presence/absence, which is
  backdrop-independent.

## Scope guards honored

No production fix implemented. Instrumentation reverted (exact pre-spike shasums restored, no
residue; reverted tree builds and lints clean). A2-1/A2-2 logic untouched. No ledger row closed,
no `device-verified`/`merged` tick, no `_layout.tsx` edits, no deletion of
`critique-2026-06-10.md`. This doc is wip and non-authoritative until ratified.

## Sources

- Device run, this spike: `hitTest`-class split (A: `UIPlatformGlassInteractionView`; B:
  `_UIHostingView` only), `/tmp/fx-spike/RESULTS.txt` and recordings.
- `packages/ios/FxMaterialView.swift:19-29` (clear-fill body), `FxHostedView.swift:109-125`
  (host mount, `backgroundColor = .clear`), `FxModule.swift:24-25` — the hosted glass rung.
- `git show 1471c19:packages/ios/FxMaterialView.swift` vs working tree — the opaque→clear
  boundary that Build A/B reproduces.
- `research/5-realization/structure.ios.md:67-78` (hosted touch contract), `:110-129`
  (`material` rung, `interaction:'self'`), `:113-114` (SwiftUI glass = system UIKit surface).
- `research/0-spine/01-substrates-and-hosting.md:122-123` (the answered open question),
  `:105-112` (substrate/interaction decisions); `02-capability-ir-and-lowering.md:70-71,224`
  (the `none|self|fx` lane, `material` = `self`); `04-state-ownership-and-boundaries.md`
  decisions 3 & 5; `decision-ledger.md:52` (SPINE-012).
- `references/expo/packages/expo-glass-effect/ios/GlassView.swift:8,35,53-63,221-228,251-273` —
  interactive glass as a hit-testable `UIVisualEffectView` + `UIGlassEffect.isInteractive`.
- `example/screens/hosting-parity.tsx:38,117-124` — the stage (glass tile over `aurora`, inside
  a `ScrollView`).
- `research/7-implementation/device-sweep-v1-findings.md` A2-4 — the symptom and the retracted
  frame-diff false-positive.
</content>
