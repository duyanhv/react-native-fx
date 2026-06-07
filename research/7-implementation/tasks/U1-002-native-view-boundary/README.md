# U1-002 · FxNativeView abstract base + substrate view registration

Unit 1 · type: `implement` · state: `headless-done` · device: no
Consumes: RT-010 · Closes: — · Blocked by: U1-001

> **RT-010 closure is split:** this task reconciles the doc wording + builds the code + headless
> proof; the SDK-verify half (runtime registration confirmation) is deferred to U1-003.
> RT-010 stays `open` until U1-003 proves it on device.

> **Next action (resume here):** review U1-002. The headless implementation gate is green;
> runtime registration proof stays deferred to U1-003.

The package is scaffolded (U1-001) but registers only `FxSurfaceView` as the default view.
`architecture.md` §2 wording is already reconciled (the "single routing orchestrator" language is
gone; see reconciliation note in step 8). This task introduces the shared abstract base, registers
the substrate trio, splits JS into per-view binding files, and fixes the default-view binding
pattern in the architecture/data-layer docs. It does NOT build the renderers (U3) or content
motion (U4–U7).

## Start here (cold-start)

A fresh session: read in order, then construct.

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides** (binding — read the one for the gate you are on):
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - (`device-verified` → N/A this task)
4. **Contract + Reference** — below.

## Authority links

```
Subtask: FxNativeView boundary (blueprint Unit 1)
- Contract anchors:  51 (Expo Modules boundary / View DSL / two-phase props),
                     04 (ownership — fx owns presentation, reads layout, never writes),
                     05 (Expo-Modules-sufficiency decision),
                     01 (two substrates: hosted vs expo-view)
- Decision:          use Expo Modules (blueprint Unit 1).
                     Register separate native view classes per substrate
                     (FxHostedView / FxSurfaceView / FxGroupView).
                     Flip-trigger: none — settled. REJECT Nitro / RN Runtimes as boundary.
- Reference (HOW):   references/expo/packages/expo-modules-core/ios/Core/Modules/ModuleDefinition.swift
                     lines 50-54 (default-view assignment) + line 92 (key == DEFAULT_MODULE_VIEW
                     ? name : "\(name)_\(view.name)");
                     references/expo/.../Views/ViewDefinition.swift (view registration mechanics);
                     references/expo/.../Views/ExpoView.swift (typealias for ExpoFabricView);
                     references/expo/.../Events/EventDispatcher.swift lines 65-79 (Mirror
                     reflects only the concrete type's stored properties — not superclass ones);
                     references/expo/.../Fabric/ExpoFabricView.swift line 50 (required init contract).
                     REJECT: @expo/ui universal-component auto-Host (seizes layout/hit-testing — 01).
- Guides:            Code Style Guide (implemented); Code Comments Guide (commented);
                     Testing Guide (headless-done); Contributing Guide (reviewed/merged).
- Rules gate:        #1 (native owns frames), #2 (agnostic names, platform-native defaults),
                     #7 (Expo Modules + Fabric only — NO JSI/C++/HybridObject),
                     #9 (reads layout, never writes; defer unmount via handshake).
- Device-verify:     none — pure headless (build verification).
- Done when:         FxNativeView base exists; three views registered; JS uses explicit
                     requireNativeView('ReactNativeFx') for default, ('ReactNativeFx', '<View>')
                     for named; doc binding bugs fixed; RT-010 docs reconciled (SDK-verify
                     deferred to U1-003); headless build green.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

`device-verified`: N/A — pure boundary plumbing, runs headless.

## Proof

- **headless:** `bunx tsc --noEmit` · `bun run build` · `bun run lint` (Biome) · `bun run swift:lint` — all green. `bun run test` also exits green with no tests found.
- **device:** N/A
- **docs:** `51` (decisions #5 — several views), `architecture.md` §2/§4 (fix default-view binding bugs), `data-layer.md` §9 (D2 binding fix). RT-010: docs reconciled; SDK-verify deferred.

## Work

### 1. Create `packages/ios/FxNativeView.swift` (abstract base)

The shared abstract base extending `ExpoView` (= `ExpoFabricView`). Provides:

- **Two-phase props pattern** — documented in the class: `Prop` setters stash into pending
  fields; `applyResolvedConfig` applies once from the coherent snapshot (contract from 51).
  The fx hook deliberately does **not** use Expo's own `viewDidUpdateProps` method name.
- **NO EventDispatcher stored properties** — `Mirror(reflecting: view).children` reflects
  only the concrete type's own properties, never superclass ones (EventDispatcher.swift:67).
  The Obj-C `responds(to:)` fallback (line 73) doesn't apply to Swift `EventDispatcher`
  properties either — they aren't `@objc` selectors. So dispatchers on the base are invisible
  to `installEventDispatcher`. Shared native event dispatchers (`onFxTransitionEnd`,
  `onFxLoad`, `onFxError`) are declared on each concrete view (steps 2–4).
- **`AsyncFunction` surface stubs** — `snapshot()` (ref-attached, UI-thread); inert, same
  rule as the shared events.
- **Common lifecycle** — `didMoveToWindow` pause/resume hook; `deinit` teardown.
- **Init contract** — `required init(appContext: AppContext? = nil)` (ExpoFabricView.swift:50).
  Every subclass must satisfy this required initializer.
- **NOT a routing orchestrator** — routing by `node.kind` happens in JS via `select()`.
  The base is a shared pattern, not a switch.

Naming: `Fx`-prefixed, full words, explicit access levels, third-person declarative comments
on every function/type. No internal planning references in code comments.

### 2. Reparent `packages/ios/FxSurfaceView.swift`

- Change `FxSurfaceView: ExpoView` → `FxSurfaceView: FxNativeView`.
- Retains all its existing `EventDispatcher` declarations (`onShaderPress`, `onShaderPressIn`,
  `onShaderPressOut`) — these stay on the concrete class (Mirror sees them). Adds
  `onFxTransitionEnd`, `onFxLoad`, `onFxError` here as well (declared on the concrete view, not
  inherited from the base).
- All existing Metal/render loop logic, uniforms, press handling — unchanged. Pixels stay.

### 3. Create `packages/ios/FxHostedView.swift` (minimal shell)

- Extends `FxNativeView`.
- Declares its own `EventDispatcher` stored properties: `onFxTransitionEnd`, `onFxLoad`,
  `onFxError`.
  These are declared here (concrete type) because Mirror reflects only the concrete type's own
  stored properties (EventDispatcher.swift:67).
- Decorative hosted substrate placeholder — the renderer is not built yet.
- Opens with a `// TODO:` comment that names the slot (hosted rendering surface) and the
  future work (mounts the SwiftUI hosting surface; renderer not built yet).
- Satisfies `required init(appContext: AppContext? = nil)`.
- Minimal: just enough to register and instantiate.

### 4. Create `packages/ios/FxGroupView.swift` (minimal shell)

- Extends `FxNativeView`.
- Declares its own `EventDispatcher` stored properties: `onFxTransitionEnd`, `onFxLoad`,
  `onFxError`.
  Same Mirror rule as step 3.
- Morph compound placeholder — the morph compound is not built yet.
- Opens with a `// TODO:` comment that names the slot (morph compound surface) and the
  future work (hosts the glass morph compound surface; renderer not built yet).
- Satisfies `required init(appContext: AppContext? = nil)`.
- Minimal registered shell.

### 5. Modify `packages/ios/FxModule.swift` (register trio)

```swift
View(FxHostedView.self) { ... }   // FIRST → DEFAULT_MODULE_VIEW → "ReactNativeFx"
View(FxSurfaceView.self) { ... }  // "ReactNativeFx_FxSurfaceView"
View(FxGroupView.self) { ... }    // "ReactNativeFx_FxGroupView"
```

- `FxHostedView` is first → becomes the default view (per ModuleDefinition.swift:53).
- `FxSurfaceView` keeps its existing `Prop`/`Events`/`OnViewDidUpdateProps` block.
- `FxHostedView` and `FxGroupView` get minimal prop/event stubs (expanded when the renderer
  is built). Their `Events(...)` blocks must declare the events matching this view's
  EventDispatcher properties: `onFxTransitionEnd`, `onFxLoad`, `onFxError`. The events are
  inert (no emitters yet) but the contract is present. The native names stay prefixed because
  React Native core already uses bare load/error names; public wrapper props can map back to
  semantic names later. Each concrete view owns its own EventDispatcher stored properties —
  the base holds none (Mirror reflects only the concrete type — EventDispatcher.swift:67).

### 6. Create per-view JS binding files in `src/runtime/`

The default view (FxHostedView, first registered) is keyed under the bare module name.
Named views get the `Module_View` key. Create separate files matching their primary export:

**`packages/src/runtime/FxHostedView.tsx`:**
```ts
import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Binding to the default (first-registered) native view — keyed as "ReactNativeFx". */
export const FxHostedView: ComponentType<{ style?: StyleProp<ViewStyle> }> =
  requireNativeView('ReactNativeFx');
```

**`packages/src/runtime/FxSurfaceView.tsx`:**
```ts
import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ShaderId } from '../effects/catalog';

// (props/types lifted from existing FxEffectView.tsx)

/** Binding to the named "FxSurfaceView" — keyed as "ReactNativeFx_FxSurfaceView". */
export const FxSurfaceView: ComponentType<NativeFxSurfaceProps> =
  requireNativeView('ReactNativeFx', 'FxSurfaceView');
```

**`packages/src/runtime/FxGroupView.tsx`:**
```ts
import { requireNativeView } from 'expo';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Binding to the named "FxGroupView" — keyed as "ReactNativeFx_FxGroupView". */
export const FxGroupView: ComponentType<{ style?: StyleProp<ViewStyle> }> =
  requireNativeView('ReactNativeFx', 'FxGroupView');
```

- The existing `FxEffectView.tsx` (`requireNativeView('ReactNativeFx')`) is deleted — its
  types and binding are replaced by the three new files.
- The web stub (`FxEffectView.web.tsx`) is replaced with three null-returning stubs
  (`FxHostedView.web.tsx`, `FxSurfaceView.web.tsx`, `FxGroupView.web.tsx`).
- **Critical:** the default view `requireNativeView('ReactNativeFx')` has NO second argument.
  Adding one would look up `ReactNativeFx_FxHostedView` → undefined → crash.

### 7. Modify `packages/android/.../FxModule.kt` (register trio)

- Create `FxNativeView.kt` abstract base (extends `ExpoView`).
- Create `FxHostedView.kt`, `FxSurfaceView.kt`, `FxGroupView.kt` — minimal `ExpoView`
  subclasses (same altitude as the iOS shells). Each opens with a `// TODO:` comment naming
  the slot and future work.
- Register all three in `FxModule.definition()` with `View(FxHostedView::class) { ... }` etc.
- First view = default (Expo Kotlin modules follow the same convention).
- **Android registration is unverified headless** — Kotlin does not compile in a headless
  gate (`tsc`/`bun run build`/`swift:lint`). Record as an unverified claim in `notes.md`.

### 8. Verify `requireNativeView` binding bugs fixed in architecture / data-layer docs

The default view (first registered, FxHostedView) is keyed under the bare module name by Expo,
NOT `ModuleName_ViewName`. The architecture and data-layer docs had the wrong second-argument form
for the default view. All four instances were fixed in this session — verify they hold:

1. `architecture.md` line 123: `'ReactNativeFx'` (no second arg) for `<Fx effect="...">` — ✅
2. `architecture.md` line 210: `requireNativeView('ReactNativeFx')` — ✅
3. `architecture.md` line 273: `requireNativeView('ReactNativeFx')` — ✅
4. `data-layer.md` line 888: `requireNativeView('ReactNativeFx')` — ✅

If any show the old form, fix them. Otherwise, this step is confirmed.

The §2 "single routing orchestrator" wording is already reconciled (it now reads "shared
abstract base / pattern"). One further §2 reconciliation was applied: the doc said the base
"provides EventDispatcher" and "all three share … EventDispatcher" — which would lead a reader
to declare the shared dispatchers on the base, where `Mirror(reflecting: view).children` can't
see them (events silently never wire). §2 (lines 98, 111) and the §2.3 mechanism finding now
state that each concrete view declares its **own** `EventDispatcher` properties, the base does
not. This matches steps 1–4. Confirm the wording holds.

**RT-010:** the doc-reconciliation half is done here. The SDK-verify half (runtime registration
confirmation) is deferred to U1-003 (which now Closes: RT-010). RT-010 stays `open` in the
ledger until U1-003 proves it on device. See `notes.md` for the carry.

## Scope guard

- Does NOT build the renderers (`FxEffectRenderer`, SwiftUI/Compose host) — that is U3.
- Does NOT build content motion wrapper (Unit 4–7).
- Does NOT add public API beyond what U1-001 exported.
- `FxHostedView` and `FxGroupView` are minimal registered shells, not functional views.
- Keeps the existing `FxShaders.metal` pixels untouched.
- A "mimic" means the pattern, not the whole library.

## Done when

- `FxNativeView` abstract base exists; all three substrate views extend it.
- `FxModule` registers three views; `FxHostedView` is first (= default).
- JS binding uses `requireNativeView('ReactNativeFx')` for the default, explicit
  `('ReactNativeFx', '<ViewName>')` for named views.
- Default-view `requireNativeView` binding bugs fixed in `architecture.md` and `data-layer.md`.
- `bunx tsc --noEmit` · `bun run build` · `bun run lint` · `bun run swift:lint` — all green.
- No un-ratified API surface exposed; no internal planning references in code comments.
- RT-010 docs reconciled; SDK-verify deferred to U1-003.
