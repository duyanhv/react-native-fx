# DEF-020 preflight — view-ref `controlled` write path

Tiny, single-question preflight (maintainer-scoped, 2026-06-15). The full SharedObject/Nitro
preflight is deliberately skipped — it belongs to DEF-021 when the detached-handle row fires.

## The one question

Can Expo Modules view-ref `AsyncFunction`s write native state on the mounted view, have that state
survive Fabric commits (host re-renders), and be observed by the existing per-view native render
loop — all WITHOUT any per-frame JS?

## Verdict: GREEN

All four clauses satisfied by mechanisms already pinned and device-proven in-repo; the discrete
write is a strict twin of the shipped `snapshot` `AsyncFunction`.

- **Write native state on the view** — `AsyncFunction(name) { (view, …args) -> }` runs on the UI
  thread, ref-attached (`4-runtime/51:31,68`). The sanctioned discrete-imperative channel;
  SharedObject/Nitro is explicitly NOT needed for a view-attached method (`05:24,57`; no-Nitro bet
  device-settled `05:99-111`).
- **Survive Fabric commits** — Expo views are never recycled (`shouldBeRecycled()=false`), identity
  stable across re-renders (`05:99-111`; `36:114-118`); in-flight uniform/clock state survives
  unrelated prop batches (`structure.ios.md:42-50`).
- **Observed by the loop** — iOS `CADisplayLink`→`MTKView` (`structure.ios.md:63`), Android
  `Choreographer` frame callback (`structure.android.md:77,416-418`); the existing per-view clocks.
  No `FxEffectRenderer` extraction required — rendering stays inline in the view classes in V1
  (`36:98-99,109-110`).
- **No per-frame JS** — `controlled` is discrete writes only; "two input sources, one buffer,
  renderer decoupled from which is active" sanctions a second writer into the existing uniform
  buffer (`30:33,50-63` Decision 3).

## In-repo precedent (the shape to reuse)

`AsyncFunction("snapshot") { (view: Fx…View) -> }` already ships — `packages/ios/FxModule.swift`
(~`:33,72,89,101`) and `packages/android/.../FxModule.kt` (~`:35,80,92`): the exact typed-view-
first-arg, UI-thread shape. `controlled`'s write is the same shape made mutating. Diff this template,
do not just name it.

## Mechanic (to pin in `structure.*` at docs-closed)

- **iOS:** `AsyncFunction("setUniform"/"setHighlight") { (view: FxSurfaceView, …) }` on the main
  thread writes the per-view uniform state uploaded via `setFragmentBytes` at buffer index 0
  (`structure.ios.md:79`); the `CADisplayLink` loop reads it next frame. A second writer alongside
  `FxPressHandler`.
- **Android:** `AsyncFunction("setUniform") { view: FxSurfaceView -> }` writes the `RuntimeShader`
  uniform, **guarded by the source-declaration scan** (never a blind `setFloatUniform` — the API-33
  CheckJNI abort, `structure.android.md:282-295,422-423`); the `Choreographer` loop re-sets the
  effect next frame.

## The one residual risk the device spike MUST clear

A discrete write must **persist across a subsequent host re-render** — i.e. `applyResolvedConfig()` /
`OnViewDidUpdateProps` must NOT clobber the imperatively-set uniform back to its prop-derived value.
This is the design crux for `controlled` (zero arbitration = the developer's write wins). See the
README § "The clobber rule".
