# DEF-025 — Android `symbol` realization (Lottie via `registerSymbol`, feature-gated rung)

Type: `implement` · State: `todo` · Device: `yes` ·
Consumes: FX-009 (supersedes its "Android deferred" stance), SPINE-005 (feature-flag half) ·
Closes: FX-010 (new — Android symbol realization) · Blocked by: — (V2; trigger fired by the maintainer 2026-06-28)

Origin: maintainer-picked next capability (2026-06-28), settled through a prose recommendation-pass.
Closes the `symbol` cross-platform peer gap recorded in
[`v2-capability-baseline.md`](../../v2-capability-baseline.md) (§Cross-platform peer gaps). This is
**not** a backend fill — it makes the manifest's `requires.feature` / `ctx.features` mechanism real
for the first time, so it is spec'd narrowly per the recommendation-pass.

## Why this task exists

`symbol` ships iOS-only today: `Image(systemName:)` + SwiftUI `.symbolEffect`, pulling every glyph
from Apple's system set for free (`FxSymbolView.swift`). Android has **no system symbol vocabulary
at all**, so the public `fx.effect.symbol({ name, animation, … })` selects `{via:'none'}` on Android
(the manifest Android rung is `status:'planned'`, skipped by `select()`).

This task realizes the Android rung honestly. The recommendation-pass settled the shape (below); the
load-bearing point is that **the asset never becomes an fx-owned visual default** — Android symbols
are app-supplied Lottie playback, bound by name through a registry that mirrors `registerShader`.

## The design (maintainer-aligned, 2026-06-28 recommendation-pass)

The five forks were settled in prose. Pinned decisions:

- **Runtime: Lottie-first, optional peer, AVD deferred.** The Android rung is `via:'lib'`, asset
  `lottie`, requiring the app to install the Lottie peer. No bundled icon pack. AVD remains a later
  `via:'native'` rung, explicitly **out of scope here**.
- **Binding: a global `registerSymbol` registry**, mirroring `registerShader`. `name` stays one
  cross-platform semantic key. No per-call `androidAsset` prop on `SymbolConfig`.
- **Builder trigger normalization** lives in the JS builder, not native.
- **`animation` collapses to a play-mode on Android** — discrete → play once per trigger; indefinite
  → loop while active. The asset carries the actual motion; fx owns play-mode + trigger wiring only.
- **Two-axis degradation:** missing peer → `{via:'none'}` *before mount* (selector); missing
  registered asset → no render + dev warn + `onError({reason:'unsupported'})` (native registry miss).

Build in this order — docs and manifest first (rule: pin the mechanic before you build it).

### 1. Pin the Android symbol mechanic in `research/5-realization/structure.android.md`

Rewrite the `### symbol` section (currently "planned / optional") into the realized mechanic, matching
the Rung / Mechanic / Surface / Degradation shape of the sibling `### content-distort` /
`### shape-morph` sections:

- **Rung:** `via:'lib'`, asset `lottie`, `requires {os:21, substrate:'hosted', feature:'lottie'}`.
- **Mechanic:** an Android **plain-`View`** host (per DOC-017 — V1 Android hosting is plain `View` +
  draw loop, Compose is a future rung), rendering a `LottieDrawable` / `LottieAnimationView` from the
  optional `com.airbnb.android:lottie` peer. Compose is **not** introduced.
- **Asset contract:** the app registers a Lottie JSON by name via `registerSymbol`; the JSON crosses
  the bridge **once** at registration and is held in a process-wide native registry keyed by name —
  the per-view path passes only the `name` string (already in `symbolConfig`). Mirror the
  `registerShader` source-crossing contract exactly.
- **Play-mode mapping:** `bounce|pulse|scale|appear|disappear` → play once per trigger;
  `variableColor|breathe|rotate|wiggle` → loop while active. The Lottie asset defines the look; the
  enum value does not drive a procedural effect.
- **Detection:** the Lottie peer is confirmed at runtime by resolving a sentinel class
  (`com.airbnb.lottie.LottieComposition` via `Class.forName`, no hard runtime dependency); when
  present, `'lottie'` is added to the selector's `features` set. This is the same optional-peer
  pattern the `### shape-morph` "Detection" bullet describes for `m3-expressive` — DEF-025 is its
  first implementation; pin the shared mechanism here and have shape-morph's prose point at it.
- **Degradation (two axes):** peer absent → the rung is skipped → `{via:'none'}` (no view mounts);
  asset unregistered for `name` → the host renders nothing + a dev-mode warn naming the symbol +
  `onFxError` (`reason:'unsupported'`), matching how registered-but-sourceless shaders degrade.

Also update the AVD-vs-Lottie hedge to record Lottie as the shipped rung and AVD as deferred.

### 2. Manifest — make the Android symbol rung selectable (`packages/src/manifest/manifest.ts`)

In the `symbol` node's `lower.android` rung: **remove `status:'planned'`**, keep
`requires: { os: 21, substrate: 'hosted', feature: 'lottie' }`, keep `via:'lib', asset:'lottie'`.
Update the `note` to drop "planned future lowering." No other manifest node changes.

### 3. Runtime feature detection feeding `ctx.features` (the B1 core — keep it narrow)

The `requires.feature` / `ctx.features` mechanism is wired in `select.ts` + `types.ts` but **never
populated at runtime** (`Fx.tsx` passes only `{deviceOS, wantInteractive}`; shape-morph's detection
is prose-only). Make it real, and **only** as far as `symbol` needs — this is feature detection
feeding the existing selector field, **not** a capability coordinator (explicitly not DEF-023-shaped):

- **Native probe.** In Android `FxModule.kt`, resolve the Lottie sentinel class once
  (`Class.forName("com.airbnb.lottie.LottieComposition")`, caught) and expose the result to JS as a
  **synchronous capability snapshot** — module `Constants` (preferred: no async, read at import) or a
  tiny synchronous `Function`. iOS `FxModule.swift` exposes the same surface returning **no**
  `'lottie'` feature (iOS symbol stays SF Symbols; the feature set is empty there).
- **JS capabilities module.** A small `packages/src/runtime/capabilities.ts` (or sibling) reads the
  native snapshot once and returns the available `features: string[]`. No framework; just the read.
- **Wire into selection.** `surface/Fx.tsx` passes `features` into the `select(node, platform, ctx)`
  call. Absent `'lottie'` ⇒ the Android symbol rung is skipped ⇒ `{via:'none'}` before any view
  mounts (the existing `onError reason:'unsupported'` + `render null` path handles the rest).

Keep the feature vocabulary generic enough that `m3-expressive` can reuse the same path later, but do
**not** build detection for anything beyond `lottie` here (SPINE-005's multiple-assets-per-rung half
stays open).

### 4. The `registerSymbol` registry (`packages/src/effects/symbolRegistry.ts`, mirroring `registry.ts`)

A new sibling registry, parallel in shape to `registerShader`:

```ts
registerSymbol({
  name: 'heart.fill',
  android: { type: 'lottie', source: require('./heart-fill.json') },
});
```

- `RegisterSymbolSpec = { name: string; android: { type: 'lottie'; source: object } }`. The `type`
  discriminant leaves room for `'avd'` later; only `'lottie'` is accepted now.
- A `require('./x.json')` returns a **parsed object** under Metro. Resolve the Android payload to a
  JSON **string** (`JSON.stringify`) and push it to native **once**, keyed by name, exactly as
  `registerShader` pushes a source string. Per-view, only `name` crosses (already in `symbolConfig`).
- **iOS registration is a no-op** — JS pushes to native only on Android (`Platform.OS` guard, the way
  `platformSource` resolves to the current platform). iOS `FxModule` exposes `registerSymbol` as a
  harmless no-op so the JS call is safe cross-platform.
- Mirror `registerShader`'s guards: warn + skip on empty/missing payload; skip a re-registration with
  identical payload. Add `isRegisteredSymbol(name)` and `registeredSymbolNames()`.
- Export `registerSymbol`, `isRegisteredSymbol`, `registeredSymbolNames`, `RegisterSymbolSpec` from
  `packages/src/index.ts`.

### 5. Builder trigger normalization (`packages/src/effects/stack.ts`)

Treat "indefinite animation + omitted trigger = static" as a public-surface bug. In **both** the
`.symbol()` builder method and the standalone `symbol()` terminal builder, fill `trigger` **only when
the caller omits it**, by animation class:

- `bounce | pulse | scale | appear | disappear` → default `trigger: 'value'`
- `variableColor | breathe | rotate | wiggle` → default `trigger: 'repeat'`

An explicit `trigger` is always honored. The manifest default and the native literal `symbolConfig`
path are **untouched** — the semantic default lives only at the public builder. This is a shared fix:
it also makes iOS `wiggle`/`breathe`/`rotate`/`variableColor` animate without an explicit trigger, and
it aligns one-for-one with the Android play-mode collapse (indefinite → `repeat` → loop).

### 6. Android native realization

- `FxSymbolRegistry.kt` (new) — `internal object`, `name -> lottieJson: String` behind
  `@Synchronized`, mirroring `FxShaderRegistry.kt`. `register(name, json)`, `source(name)`,
  `isRegistered(name)`.
- `FxModule.kt` — add `Function("registerSymbol") { name, json -> FxSymbolRegistry.register(...) }`
  and the Lottie capability snapshot (§3).
- `FxSymbolView.kt` (new) — the plain-`View` Lottie host: resolve the asset by `name`, build the
  `LottieComposition` from the JSON string, apply the play-mode (once vs loop) and trigger semantics,
  honor `replaceWith` if it maps to a registered name. Mirror the role `FxSymbolView.swift` plays on
  iOS. Missing asset ⇒ render nothing + dev warn + `onFxError(reason:'unsupported')`.
- `FxHostedView.kt` — read `symbolConfig` (today it is iOS-only wiring) and route to `FxSymbolView`.

### 7. iOS — minimal

- `FxModule.swift` — `registerSymbol` no-op + the capability snapshot returning no `'lottie'`.
- No change to `FxSymbolView.swift` symbol behavior. iOS picks up the builder trigger defaults (§5)
  for free — re-verify on device that the indefinite animations now animate by default.

### 8. example / device demo

An app-supplied Lottie registered via `registerSymbol`, rendering + animating on Android hardware:
discrete (play-once-per-trigger) and indefinite (loop) cases; the missing-asset degradation; and the
missing-peer degradation (`{via:'none'}` with the Lottie peer absent).

## Scope guard — explicitly NOT this task

- **No AVD** (`via:'native'`) — deferred as a later rung; `type:'lottie'` only.
- **No bundled icon pack** — fx owns the binding, never the art (rule #5).
- **No `androidAsset` on `SymbolConfig`** — the call site stays cross-platform; assets live in the
  registry.
- **No capability framework** beyond the single `lottie` feature flag — the m3-expressive reuse is a
  free consequence of using `ctx.features`, not built here. Not DEF-023 coordinator work.
- **No Compose** — V1 Android hosting stays plain `View` (DOC-017).
- **No change to iOS symbol behavior** except inheriting the shared builder trigger normalization.
- **SPINE-005's multiple-assets-per-rung half stays open.**

## Authority links

```
Subtask: Android symbol realization — Lottie via registerSymbol, feature-gated rung (FX-010).
- Contract anchors:  24 (the symbol capability doc — supersede FX-009's "Android iOS-only/deferred"
                     with the Lottie realization; record the asset contract + play-mode mapping +
                     two-axis degradation), 02-capability-ir-and-lowering.md (the symbol node +
                     select() + the requires.feature mechanism), decision-ledger.md FX-009 /
                     SPINE-005 / FX-010. Mechanics: structure.android.md § symbol (this task pins
                     the realized mechanic — §1); structure.ios.md § symbol unchanged.
- Decision:          recommendation-pass 2026-06-28 — Lottie-first optional peer (AVD deferred);
                     global registerSymbol registry (no androidAsset prop); builder trigger
                     normalization; animation→play-mode collapse on Android; two-axis degradation.
                     B1 chosen for feature detection: make requires.feature/ctx.features real
                     (the manifest spine, not native fallback), narrowly.
- Reference (HOW):   registerShader end-to-end (effects/registry.ts → FxModule.{kt,swift} →
                     Fx{Shader}Registry.{kt,swift} → view resolves by id) is the exact pattern to
                     mirror for registerSymbol. shape-morph "Detection" prose
                     (structure.android.md) is the optional-peer template — implement it here.
                     Lottie: com.airbnb.android:lottie (compileOnly), LottieComposition /
                     LottieDrawable / LottieAnimationView, fromJsonString.
- Rules gate:        #1 the JSON crosses the bridge ONCE at registration, never per-frame; the play
                     loop stays native. #2 agnostic name, platform-native realization (iOS SF
                     Symbols; Android = app-supplied Lottie, since Android has no system symbol
                     set). #5 fx owns the binding, never a bundled icon set. #6 closes a peer gap.
                     #7 Expo Modules + Fabric; compileOnly peer, no JSI/C++.
- Surface contract (pin exactly):
                     - registerSymbol({ name, android: { type:'lottie', source } }); name is the
                       cross-platform key; no androidAsset prop on SymbolConfig.
                     - <Fx effect={fx.effect.symbol({ name, animation, trigger? })} /> stays the
                       only consumption surface; the JSON lives only in registerSymbol.
                       iOS registration is a no-op.
                     - Builder fills trigger by animation class when omitted (discrete→value,
                       indefinite→repeat); explicit trigger honored; manifest/native defaults
                       untouched.
                     - Android play-mode: discrete→play-once-per-trigger; indefinite→loop.
                     - Degradation: missing peer → {via:'none'} before mount; missing registered
                       asset → no render + dev warn + onError(reason:'unsupported').
- Scope boundaries:  NOT AVD (deferred via:'native'). NOT a bundled icon pack. NOT androidAsset on
                     SymbolConfig. NOT a capability framework beyond the lottie flag (not DEF-023).
                     NOT Compose. NOT iOS symbol behavior changes beyond the shared builder default.
                     NOT multiple-assets-per-rung (SPINE-005 other half stays open).
- Device-verify:     (Android hardware + iOS) (1) an app-registered Lottie renders + animates on
                     Android; discrete plays once per trigger, indefinite loops while active; (2)
                     missing registered asset → no render, onError(unsupported), dev warn, no crash;
                     (3) missing Lottie peer → {via:'none'} before mount (no view, no error churn);
                     (4) iOS indefinite animations (wiggle/breathe/rotate/variableColor) now animate
                     by default via the builder trigger normalization — unregressed glyphs; (5)
                     curated/iOS symbol paths unregressed. Write evidence/device.md.
- Closure:           on the maintainer's PASS, the planner mints FX-010 in the ledger (Android symbol
                     realization), supersedes FX-009 with a citation, advances SPINE-005's
                     feature-flag half (note the multi-asset half stays open), records the decision
                     in 24, confirms structure.android.md § symbol against the shipped mechanic,
                     reconciles the manifest row, writes reviews/DEF-025.md, ticks through merged.
- Done when:         registerSymbol accepts an app Lottie and the Android rung renders + animates on
                     device per the play-mode mapping; ctx.features is runtime-populated and gates
                     the rung (peer-absent → {via:'none'}); the missing-asset degradation holds;
                     builder trigger normalization ships (iOS + Android); headless gates + iOS
                     xcodebuild + Android compileDebugKotlin (with the compileOnly Lottie peer)
                     green; the app-supplied demo renders on device; no comment provenance.
```

## Lifecycle

- [x] spec'd (planner, 2026-06-28)
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done (lint/build/Jest 179-179/iOS xcodebuild/Android compileDebugKotlin)
- [x] device-verified (maintainer-ratified, 2026-06-28 — Android re-gate S1–S4 + off-window PASS on rebuilt + peer-absent APKs; iOS S5 PASS; `evidence/device.md`)
- [x] reviewed (planner, 2026-06-28 — `../../reviews/DEF-025.md`; test-runner artifact caught, 0×0 + S4 class-load crash reworked subclass→FrameLayout, Constant/LinkageError hardening)
- [x] docs-closed (planner, 2026-06-28 — FX-010 minted + FX-009 superseded + SPINE-005 feature-flag half advanced; `24` + `structure.android.md § symbol` + manifest reconciled)
- [x] merged (maintainer-authorized, 2026-06-28 — on integration/0.1.x, this commit)

## Proof

- **headless:** packages gates (`tsc`/build/lint/`swift:lint`/test) + iOS `pod install` + example
  `xcodebuild` + Android `compileDebugKotlin` (resolving the `compileOnly` Lottie peer); unit tests
  for `registerSymbol` (guards/collision/idempotence), the builder trigger normalization (each
  animation class), and feature-gated `select()` (symbol rung selected only with `'lottie'` in
  `features`); the render + animation itself is device-proven.
- **device:** `evidence/device.md` — the five-point scenario above, app-supplied Lottie on Android
  hardware + the iOS trigger-default re-verify.
- **docs:** FX-010 minted + FX-009 superseded + SPINE-005 feature-flag half advanced in the ledger;
  `24` records the realization; `structure.android.md` § symbol confirmed; manifest row reconciled.
</content>
</invoke>
