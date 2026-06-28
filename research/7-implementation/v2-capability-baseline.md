# V2 capability baseline — current shipped surface (2026-06-28)

The standing snapshot of what react-native-fx actually ships after the V2 engine, its as-built
addenda, and the full public surface landed on `integration/0.1.x`. It is the V2 analog of
[`v1-cut-checklist.md`](./v1-cut-checklist.md): a **capability record, not a schedule** — nothing
here is a commitment to build, and the deferred lists are deliberately demand-gated.

Authority for any single fact is the owning source doc + the [`progress.md`](./progress.md) row;
the per-capability platform status is the canonical manifest (`packages/src/manifest/manifest.ts`).
When this doc and a source doc disagree, the source doc wins — fix this one.

**Publishing is parked.** The `react-native-fxkit` rename, install/import/doc alignment, npm
packaging, and `skills/` polish (DEF-016) are out of scope until publishing is explicitly
reintroduced. This baseline does not assess publish-readiness.

## What's shipped — capability matrix

All rows are merged + device-verified on `integration/0.1.x`. "Both" means the capability has a
real native rung on each platform; magnitudes/fidelity diverge per platform by design (the law:
agnostic names, platform-native defaults).

| Capability | iOS | Android | Public surface | Notes |
|---|---|---|---|---|
| **fill** (`mesh-gradient`) | native | native | `<Fx effect="mesh-gradient">`, `fx.effect.mesh` | intensity only; colors/angle/kind deferred (U3-009) |
| **material** (`glass`) | native (`UIGlassEffect`; iOS 26 morph) | native fx-drawn scrim | `<Fx effect="glass">`, `fx.effect.glass`, `tint`/`colorScheme` | shape-native divergence: iOS glass morph vs Android flat material (DOC-006) |
| **shader** (10 curated) | MSL | AGSL | `<Fx effect="<shaderId>">`, runtime BYO `registerShader` (DEF-008) | interactive subset = 5 shaders; Android expo-view interactive raster renderer is a TODO (renders blank — EX-002) |
| **symbol** | native `.symbolEffect` | lib (Lottie, optional peer) | `fx.effect.symbol({name, animation, …})` + `registerSymbol` for Android assets — builder-only (U10-002, DEF-025) | both; Android = app-supplied Lottie via `registerSymbol`, `feature:'lottie'`-gated; AVD deferred; no `symbol-*` string id |
| **motion** (driver) | native | native | `fx.motion.*`, `FxPresence` motion map | content + effect targets |
| **source** (scroll driver) | native (SwiftUI `.scrollTransition`, os17/hosted) | — | `Fx.Scroll`, `fx.source.scroll` (DEF-014) | **iOS-only, hosted rung only**; ambient-RN-scroll tier + Android deferred |
| **content-distort** | out-of-scope (severs RN touch, rule #4) | shader (`RenderEffect`, draw-time) | mechanical `contentDistortion='ripple'` on `FxSurfaceView` (DEF-009) | **Android-only**; no high-level surface (sugar deferred) |
| **presence** | native FSM | native FSM | `FxPresence` + deferred-unmount; `transient` preset (U7) | both |
| **press feedback** | native | native | `FxPressable`, `<Fx interactionMode>` (U8/U13) | both; RNGH/`@gorhom` coexistence proven (U8-002) |
| **state motion** | native | native | `FxView` (+ `effect` prop) (U12) | both; magnitudes diverge per platform |
| **glass morph compound** | `UIGlassContainerEffect` morph | flat (no morph) | `FxGroup`/`FxItem` (U14) | shape-native divergence; `FxItem` is JS-only |
| **controlled writes** | native | native | view-ref `setUniform`/`setHighlight` (DEF-020) | discrete writes only |
| **drag / tilt** | native | native | `<Fx interactionMode="active" dragAxis>` (DEF-011) | native axis-aware claim/yield; no per-frame JS |

The full V1 surface contract is whole: `fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem,
EdgeGlow` + `fx.effect.*` all shipped.

## Cross-platform peer gaps (rule #6 — iOS and Android are peers)

Shipped features that are currently single-platform. Each is a deliberate deferral with a real
trigger, not a defect — close one only when an app screen needs it (product value, not parity for
its own sake):

- **`symbol` — CLOSED (DEF-025, 2026-06-28).** Was iOS-only; Android animated-icon parity now
  ships as app-supplied Lottie via `registerSymbol`, gated by the optional `feature:'lottie'` peer;
  AVD (`via:'native'`) deferred (`24` FX-010; manifest Android rung selectable).
- **`source`/scroll — iOS-only, hosted rung only.** Android scroll-linked presentation + the
  ambient-RN-scroll best-effort tier are deferred (DEF-014 scope; manifest Android ladder empty).
- **`content-distort` — Android-only** (and `shape-morph` — Android-only manifest node, no public
  surface). These are platform-native capabilities with no peer, not gaps to close: iOS
  `content-distort` is out-of-scope by rule #4; `shape-morph` is M3-Expressive-specific.

## Trigger-gated — build on demand only

Not on the board until a real consumer fires (the standing rule: do not start a trigger-gated row
unprompted). From [`progress.md`](./progress.md) deferred table:

- **DEF-001** build-time shader emitter — trigger: BYO/novel single-source demand.
- **DEF-002** reconsider Nitro / raw Fabric — trigger: per-child control.
- **DEF-006** app-owned Reanimated continuous `source` (optional spike) — trigger: a real app-owned continuous-source integration.
- **DEF-012** declarative state beyond presence — trigger: declarative-state demand.
- **DEF-013** config plugin — trigger: a V2 native mod.
- **DEF-018** `sheet`/`modal` presence presets — trigger: presence-under-navigation settled.
- **DEF-019** SDF feather/threshold tuning — trigger: first shaped shader ships.
- **DEF-021** the `Fx*` `SharedObject` layer + detached `FxEffectRenderer` — trigger: first detached imperative handle / per-child control.
- **DEF-022** `clock` driver node — trigger: a real `clock`-driven consumer.
- **DEF-023** `cadence`-keyed app-state / off-window pause coordinator — trigger: a consumer keyed on `cadence`.
- **DEF-024** `getUniform()` read-back — trigger: a feature needs a uniform read.

## Deliberately not on the board (ratified rejections)

Decided NO in their owning source docs — not deferrals, design choices:

- **No fx portal primitive** (DEF-003) — placement is the app's job; fx guarantees portal/`Modal` coexistence.
- **No `Fx.Stack`/`Fx.Layer` JSX compound** (DEF-004) — the `fx.effect.*` builder is the stack API.
- **No top-level `edge`/`origin` sugar** (DEF-005) — `FxPresence` keeps `preset` or an explicit `motion` map.
- **No BYO intro/outro envelope / reserved lifecycle uniform** (DEF-007) — reached by composition (`FxPresence` + native `time` + eased uniforms).
- **No worklets/Reanimated as the default motion path** — native owns the frame loop (rules #1/#7); Reanimated is a flip only for regime-C continuous gesture-scrubbed motion.
- **No `filter` renderer; no `fill` colors/angle/kind** beyond the rendered intensity subset (U3-009) — narrowed to what the native renderers actually draw.
- **CI iOS sim smoke lane removed for cost** (DEF-017) — local `smoke:ios` harness retained.

## How to extend

When an app actually needs a deferred capability, follow the normal path: recommendation-pass
(if it has a fork) → spec `tasks/<id>/README.md` → executor → device gate → review → docs-closed
→ merge. Prioritize cross-platform peer gaps over elective new surface, but build only on real
product demand.

**Android `symbol` and `source` both REQUIRE a recommendation-pass before spec** — they are not
mere backend fills. Each involves a real public-API-shape choice (the Android symbol asset
contract / Lottie-vs-AVD vocabulary; the Android/ambient `source` rung's surface and degradation
story), so drive the call with prose + a recommendation first, not a straight spec.
