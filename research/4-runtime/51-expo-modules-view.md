# Expo Modules view base
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md, structure.{ios,android}.md
Owns: the native-view authoring base (the boundary). Mechanics → structure.{ios,android}.

## Why this matters

Every fx component is a native view, and the **Expo Modules API** is the decided
substrate: its `View {}` DSL is the most ergonomic way to author a Fabric-backed native
view, it handles registration (no hand-written Codegen), and its SwiftUI/Compose hosting
infrastructure is exactly what the `hosted` substrate needs. This doc pins how that DSL
works and the boundary rules; the per-platform view code lives in `structure.*`.

## The boundary, in one rule

The JS↔native boundary is **thin and async** — config, semantic events, discrete
imperatives, never per-frame. That is why Expo Modules suffices and **no hand-written
JSI / C++ / HybridObject** is needed (the thin boundary is the reason). fx targets
**Fabric** from day one (so it's on JSI under the hood) without authoring it.

## The View DSL

- **`Prop(name) { (view, value) -> }`** — a setter; Expo coerces JS → native type.
  Setters **only stash** into a `pending` struct.
- **`OnViewDidUpdateProps { view -> }`** — fires **once** after the whole prop batch;
  the place to **apply** the resolved config (the two-phase rule — apply once from a
  coherent snapshot, never per-setter).
- **`Events("onX", …)`** + an `EventDispatcher` per event — the semantic native→JS push
  channel (`onPress*`, `onTransitionEnd`, `onLoad`/`onError`).
- **`AsyncFunction(name) { (view, …args) -> }`** — runs on the UI thread, attached to the
  React ref; the **pull** channel (`snapshot()`/`getUniform()`, `04`/`35`). Config crosses
  as *props*, not imperative setters — so `fire` is **deferred** (one-shots are declarative
  trigger values, `40`), and `setUniform`/`setHighlight` are an escape hatch, not the default.

## Two phases, two substrates

`FxNativeView` is the shared **abstract base / pattern**; the concrete registered classes are
**substrate-specific** (`FxHostedView` / `FxSurfaceView`, blueprint Unit 1). The base serves
all three cases: a `hosted` node mounts a SwiftUI/Compose host inside it; an `expo-view`
effect hosts the interactive render surface directly; and a **content wrapper**
(`FxPresence`/`FxView`) hosts the RN children and animates *its own* layer transform — never
reaching into the children (`33`, expo#27846). Props stash in phase 1; `OnViewDidUpdateProps` applies once in phase 2 —
select the lowering (per `02`), write config, sync the recognizer/clock/animation driver.

## Cross-boundary typing

- **String unions** (`effect` id, `composition`, `interactionMode`) → `Enumerable`
  enums; Expo coerces and rejects unknown values at the boundary.
- **Uniforms** cross as a typed `Record` (`@Field` struct with defaults) → native
  defensively defaults any missing field.
- **Colors** cross as hex strings / native color types (built-in coercion).
- JS binding via **`requireNativeView('ReactNativeFx', …)`** (SDK 52+; the SDK 56 floor makes
  this the path, not the legacy `requireNativeViewManager`) — naming the **concrete
  substrate-specific view** (`FxHostedView` / `FxSurfaceView`), which extend the `FxNativeView`
  base. The native base name is `FxNativeView` — deliberately *not* `FxView`, which is the
  public content-wrapper *component* (`57`); the JS components wrap the native view, they don't
  share its name.

## Decisions

1. **Expo Modules + Fabric is the substrate**; **no JSI/C++/HybridObject** for the
   boundary — the thin async boundary is why it isn't needed, and the hosting infra is
   Expo's. (The boundary-mechanism *decision* and its falsification test live in
   `0-spine/05`; Nitro/JSI is the deferred fallback, not the default.)
2. **Two-phase props** — `Prop` setters stash; `OnViewDidUpdateProps` applies once from a
   coherent snapshot.
3. **`AsyncFunction` is the imperative channel** (UI-thread, ref-attached); **`Events`**
   the semantic push channel.
4. **Coerce at the boundary** — `Enumerable` enums for string unions, a `Record` for
   uniforms (defensively defaulted), built-in color coercion.
5. **`requireNativeView` from `expo`** (SDK 52+); one module name, **likely several**
   native view classes — substrate-specific (`hosted` vs `expo-view`, blueprint Unit 1),
   not a single `FxView` switching on `node`.
6. **No `collapsable={false}` on the native view** (never layout-only); only a JS-side
   children container that must survive needs it.

## Open questions

- ~~**Hosted-view authoring**~~ — **resolved: `FxHostedView` mounts a SwiftUI host via
  `UIHostingController` (iOS) and a plain `View`-based renderer (Android). Props (`effect`,
  `intensity`) cross the Expo boundary via `Prop`/`OnViewDidUpdateProps`. Verified on SDK 56,
  iOS 26+ and Android (2026-06-08, U3-001). Compose deferred — V1 uses `View.onDraw()`.~~
- ~~**One native view class vs several**~~ — **resolved: several** — three substrate-specific
  views (`FxHostedView`, `FxSurfaceView`, `FxGroupView`) registered under one module. SDK 56
  registration keying confirmed on iOS and Android (2026-06-08).
- ~~**Record coercion of absent uniforms**~~ — **resolved: `@Field` defaults fill omitted
  fields** — confirmed on SDK 56, iOS and Android (2026-06-08).

## Sources

- `_legacy/01-expo-modules-view.md` — the full DSL findings (`Prop`/`Events`/
  `AsyncFunction`/`OnViewDidUpdateProps`, two-phase rule, `Enumerable`/`Record`,
  `requireNativeView`, flattening).
- Expo Modules API docs (module-api); `structure.{ios,android}.md` — the per-platform
  `ExpoView` subclasses.
