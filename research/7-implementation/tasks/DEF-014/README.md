# DEF-014 — the iOS-hosted `source` rung (scroll-linked presentation)

Type: `implement` · State: `todo` (spec'd) · Device: `yes` · Consumes: — · Closes: — (no
ledger row; the V2 opener, critique F7) · Blocked by: — (trigger "V1 shipped" fired, 2026-06-14)

## Why this task exists

`source` is the third leg of the ratified driver vocabulary `target` / `clock` / `source` (`02`
decision 14, `40` decision 7). V1 shipped `target` (discrete retarget → native spring, U6) and
the presence orchestration over it; `clock` and `source` were left additive, their "rung schema
lands with their build tasks" (`02` d14). This is that build task for `source` — and the
designated V2 opener: critique F7 (maintainer-accepted 2026-06-10) pulls the iOS-hosted `source`
rung forward as the first V1.x task because **scroll-linked presentation is the category's demand
center**.

It ships the **render-server-fidelity tier only** — the one tier where `source` guarantees both
zero per-frame JS *and* zero per-frame main-thread work, which `02` d14 says is true *only* on
iOS hosted. A native scroll position drives fx's own hosted effect content through SwiftUI's
`scrollTransition`/`visualEffect`, computed in the render server off the main thread. The
ambient-RN-scroll best-effort tier (a native `contentOffset` reader) and the Android rung are
deliberately **out of scope** — each is a separate later rung (see Scope boundaries).

## Authority links

```
Subtask: the iOS-hosted `source` driver rung — render-server scroll-linked presentation.
- Contract anchors:  40-motion-reactivity-and-data-flow.md (the three regimes; §Escaping
                     Regime C route 1 = native source read; decision 7 — `source` is V2,
                     substrate-tiered, render-server fidelity only on iOS hosted, zero
                     per-frame JS everywhere),
                     02-capability-ir-and-lowering.md decision 14 (`source` is an additive
                     driver node; rung schema lands with this task) + decision 11 (each
                     `kind:'driver'` rung declares `target:'content'|'effect'`),
                     34-animation-driver.md (the driver contract — targets in, native owns
                     frames, events out; the render-server-first disposition),
                     42-presence-and-lifecycle.md (the measurement contract — fx reads
                     layout to resolve presentation, never writes it; the scope-ceiling
                     discipline this rung inherits).
- Decision:          blueprint — **use** Apple's first-party SwiftUI scroll-effect APIs
                     (`.scrollTransition` / `.visualEffect`) inside an fx-owned hosted
                     SwiftUI `ScrollView`. fx-original API surface (the `source` binding +
                     the hosted scroll context); the *mechanic* is pure Apple SwiftUI with
                     no boundary mechanism. No preflight (see § No preflight).
- Mechanics (pinned): structure.ios.md § `source` — `requires {os:17, substrate:hosted}`,
                     `target:'effect'`, `applyVia:.scrollTransition`/`.visualEffect`, the
                     default = SwiftUI's own edge transition (the law), content fx-owned
                     (rule #4), the scroll-is-the-clock note, the hosting-boundary
                     confirmation, the `{via:'none'}` fallback. structure.android.md
                     § `source` — deferred, empty ladder. The mechanic lives in
                     structure.*, nowhere else — read it before building.
- Reference (HOW):   Apple SwiftUI docs (`scrollTransition(_:transition:)`,
                     `visualEffect(_:)`, `ScrollTransitionPhase`) — the relevant precedent
                     is Apple's own, NOT a clonable references/ repo (none use these APIs).
                     For the HOSTING boundary, diff fx's OWN proven hosted path:
                     packages/ios FxHostedView (persistent UIHostingController + observable
                     props holder, U3-008) — the SwiftUI ScrollView mounts the same way.
- Rules gate:        #1 native owns the frame loop — scroll position NEVER crosses the
                     bridge; the mapping runs in the render server. #2 agnostic name
                     (`source`/`scroll`), platform-native default (SwiftUI's own scroll
                     transition — the law). #3 hosted = decorative/self-gesturing (the
                     SwiftUI ScrollView self-gestures). #4 NEVER host RN content to
                     sample/distort it — the rung drives fx's OWN content only. #7 Expo
                     Modules + Fabric only — no JSI/C++ (there is no boundary mechanism
                     here at all). #9 reads layout to resolve presentation, never writes.
                     Keep FxShaders pixels.
- Scope (iOS only):  (a) the `source` rung in the manifest — `02` doc rung schema +
                     packages/src/manifest (manifest.ts + types/select), iOS-hosted rung
                     `requires {os:17, substrate:hosted}` `target:'effect'`, Android empty
                     → `{via:'none'}`; conformance test extended. (b) the JS surface in
                     `50` + packages/src/surface — a `source` binding on `<Fx>`
                     (`source={fx.source.scroll({ axis })}`) and a MINIMAL fx-owned hosted
                     scroll context to host it (provisional name `Fx.Scroll` — see § Surface
                     naming). (c) the iOS native realization — the hosted SwiftUI ScrollView
                     + per-item `.scrollTransition`/`.visualEffect`, mounted through the
                     proven persistent-UIHostingController path. (d) an example demo screen
                     (`example/screens/`) — a vertical hosted scroll of generative effect
                     tiles that fade/scale across the viewport, plus registration. (e)
                     onLoad/error parity unchanged; no new event surface beyond what the
                     binding needs.
- Scope boundaries:  NOT the ambient-RN-scroll tier (a native UIScrollView contentOffset
                     reader feeding the hosted view — the best-effort tier `02` d14
                     separates out; spawns its own DEF row when triggered). NOT Android
                     (deferred — structure.android.md § `source`; its own task). NOT
                     wrapping/scroll-linking the developer's interactive RN content (rule
                     #4 — would sever touch). NOT `Fx.Stack` (DEF-004 — introduce only the
                     minimal scroll context, do not pre-empt the general compound). NOT the
                     `clock` driver (its own later task). No explicit per-uniform mapping
                     authoring beyond the default + a single bound property (keep the V2
                     opener minimal; richer mapping is additive later).
- Device-verify:     (agent-device — iOS ONLY; PHYSICAL iPhone, iOS 17+; the hosted
                     renderer does not run headless and the cut waiver requires hardware
                     for iOS visuals) (1) scroll-linked: as effect tiles scroll through the
                     viewport their appearance animates (edge fade/scale) and is at-rest
                     identity when fully scrolled in; (2) zero per-frame JS: scroll is
                     smooth under load with no JS callback per frame (instrument the JS side
                     to prove silence; revert after); (3) the mapping runs render-server —
                     scrolling stays smooth while the JS thread is busy; (4) hosting
                     boundary: the hosted ScrollView sizes correctly through the auto-Host
                     boundary and its scroll gesture is self-contained (coexists with an
                     outer RN scroller per the §Hosting landmine); (5) os<17 / fallback:
                     the same screen degrades to static content, no crash; (6) no regression
                     to the shipped hosted effects (a hosted glow/glass tile still renders).
                     Write evidence/device.md.
- Closure:           DEF-014 closes no ledger row. On the maintainer's device PASS the
                     planner reconciles the source-of-truth docs (the `02` rung schema and
                     `40`'s resolved source-driver note flipped to shipped-on-iOS, `50`
                     surface, structure.ios.md § `source` confirmed against the shipped
                     mechanic), writes reviews/DEF-014.md, and ticks through merged. The
                     deferred tiers stay parked behind their triggers.
- Done when:         the `source` rung selects on iOS-hosted/os17+ and is `{via:'none'}`
                     elsewhere; `<Fx source={fx.source.scroll(...)}>` inside the minimal
                     hosted scroll context drives render-server scroll-linked presentation
                     of fx-owned content on a physical iPhone; scroll position never crosses
                     the bridge; headless gates + xcodebuild green (Android compile
                     unaffected — empty ladder); the six-point iOS device scenario written;
                     no comment provenance; surface naming confirmed at review.
```

## No preflight (deliberate)

The references-preflight is **skipped** — it fails the bar on all three triggers
(`agents/references-preflight.md`): no rule-#7 tension (the mechanic is pure first-party SwiftUI
running in the render server — zero boundary mechanism, no JSI/C++/worklet temptation); the
hosting mechanic it builds on is already device-proven in fx (U3-001/U3-002/U3-008, the
persistent `UIHostingController` path — the preflight's explicit "obvious low-risk precedent
already in fx" skip condition); and the `references/` repos do not solve scroll-linked SwiftUI
presentation, so there is no template to diff. Verification is the **device gate on a physical
iPhone**, which the V1-cut waiver already mandates for iOS visuals. The one residual risk — the
hosted `ScrollView` sizing through the auto-Host boundary — is a named device-verify row (4) and
an implementation note (diff fx's OWN shipped FxHostedView), not a references fan-out.

> If the ambient-RN-scroll tier is ever pulled in (a native UIScrollView `contentOffset` reader),
> preflight returns — that reader mechanic has genuine references-relevant risk (KVO vs delegate
> vs display-link; an Expo/RN precedent worth diffing). That tier is out of scope here.

## Surface naming (confirm at review)

The capability is settled; the public names are provisional, to be confirmed at review under the
DEF-015 naming-surface discipline (agnostic names, no mechanism leakage, no `hosted`/`expo-view`
in the public surface):
- `source={fx.source.scroll({ axis })}` — a `source` driver binding on `<Fx>`. Mirrors the
  existing `fx.effect.*` / `fx.motion.*` factory idiom.
- `Fx.Scroll` — the minimal fx-owned hosted scroll context (provisional). It is NOT `Fx.Stack`
  (DEF-004); keep it the smallest container that gives `scrollTransition` a SwiftUI `ScrollView`
  ancestor. The executor proposes the final name + shape; the planner ratifies at review.

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-14)
- [x] rules-gated (executor, 2026-06-14 — #1/#2/#3/#4/#7/#9 gated; see notes.md)
- [x] implemented (executor, 2026-06-14 — manifest rung + JS surface + iOS native + example)
- [x] commented (executor, 2026-06-14 — iceberg only, no provenance)
- [x] headless-done (executor, 2026-06-14 — all gates + xcodebuild green; see Proof)
- [x] device-verified (maintainer-ratified, 2026-06-14 — physical confirmed; the formal hold waived; sim smoke 5/6 PASS, row 5 os<17 code-reasoned + A15-perf residuals recorded in `evidence/device.md`)
- [x] reviewed (planner, 2026-06-14 — `../../reviews/DEF-014.md`; 2 headless findings fixed, both spec deviations ratified)
- [x] docs-closed (planner, 2026-06-14 — `02`/`40`/`50` reconciled, `structure.ios.md § source` confirmed, surface names ratified in `50` Decision 9; no `Closes:` ledger row)
- [x] merged (maintainer-authorized, 2026-06-14 — on integration/0.1.x, this commit)

## Proof

- **headless:** packages gates (`bunx tsc --noEmit` · `bun run build` · `bun run lint` ·
  `bun run swift:lint` · `bun run test`) + iOS `pod install` + example `xcodebuild`; the
  manifest conformance test extended for the new `source` rung; Android `compileDebugKotlin`
  unaffected (empty ladder). The native scroll-effect behavior is device-proven, not unit-faked.
- **device:** `evidence/device.md` — the six-point iOS scenario above, on a physical iPhone.
- **docs:** `02` (the `source` rung schema), `40` (the resolved source-driver note → shipped on
  iOS hosted), `50` (the `source` binding surface), `structure.ios.md` § `source` (confirmed
  against the shipped mechanic). No `Closes:` ledger row.
