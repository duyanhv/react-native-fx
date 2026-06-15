# DEF-020 — view-ref `controlled` write path (`setUniform` / `setHighlight`)

Type: `implement` · State: `in-progress` (spec'd) · Device: `yes` · Consumes: — · Closes: — ·
Blocked by: — · Unblocks: DEF-011

## Why this task exists

`interactionMode="controlled"` is the one interaction value still deferred (`30` Decision 7;
`DEF-015` froze `none | passive | active` and pushed `controlled` here). `controlled` attaches
**no recognizer** — zero arbitration — and lets the developer's own pipeline write the effect's
uniforms directly. That write path is what **DEF-011 (drag/tilt) hard-needs**: a gesture in JS
reads the drag, then writes a discrete uniform to the surface. Without it DEF-011 is not buildable.

This is the **minimal half** of the original DEF-020. The bundled "true `Fx*` SharedObject /
`FxEffectRenderer` object / HybridObject shape" was **split out to DEF-021** (trigger-gated): that
half is only needed by a *detached* JS-held handle (the post-v2 impulse API, or per-child control),
which is also the `05` Nitro re-evaluation trigger. Keeping them apart is what keeps this task
rule-#7 clean and free of speculative architecture (the U9 ratification logic still holds: don't
build a SharedObject before a consumer holds one).

## Scope — the split

**IN (this task):**
- `setUniform(name, value)` and `setHighlight(x, y)` as **imperative methods on the surface
  ref**, implemented as Expo `AsyncFunction(view, …)` (`51` § the thin async boundary — the
  sanctioned discrete-imperative channel). No `SharedObject`, no returned handle object.
  `setUniform` is **number-only** for this cut; `null` clears the imperative override and lets
  the prop-derived value win again.
- `interactionMode="controlled"` selectable: attaches no recognizer (identical to `none` for the
  gesture system), but enables the write path.
- Writes land in the **same uniform buffer the native render loop already reads** (`30` § two
  input sources, one buffer — the renderer is decoupled from which source is active). `setHighlight`
  is convenience sugar over the highlight uniforms (`touch`/`pressDepth`); `setUniform` is
  the general escape hatch over any declared uniform, guarded by the existing `declaresUniform`
  check (the DEF-008 guarded-write precedent). Unknown/undeclared uniform names are a **no-op**
  on both platforms (no new error channel).
- Coordinate space pinned to **RT-005**: `[0,1]` y-up UV for `setHighlight`/`setUniform` writes
  (the shipped touch-uniform convention); JS-facing events stay in view points.

**OUT (explicitly — do not build):**
- **Continuous / per-frame gesture-sourced uniforms** → DEF-006 (regime C, the Reanimated
  UI-thread channel). `controlled` here supports **discrete writes only**; the device proof is that
  the native loop *observes* a discrete write, **not** a per-frame JS gesture loop. The rule is
  absolute: **never per-frame `setUniform` from the JS thread** (`30` Decision 7; `40` regime C).
- **The true `Fx*` SharedObject / `FxEffectRenderer` extraction / HybridObject shape** → DEF-021.
- **Declarative `pressed`/`highlight` props** — ref-only for this cut (`controlled` = your pipeline
  writes; prop sugar is a later, separate addition).
- **`ref.fire()` one-shots** — stay declarative (`triggerKey`) until a real `4-runtime` need proves
  otherwise (`40` / `51` defer it). Not bundled here.
- **Per-child control** → DEF-002 / DEF-021 (the `05` Nitro trigger). One handle per surface only.

## Preflight: GREEN (see `preflight.md`)

The bounded references-preflight (2026-06-15) cleared the one question — view-ref `AsyncFunction`s
can write native state on the mounted view, survive Fabric commits, and be observed by the existing
per-view loop with no per-frame JS. The write is a strict twin of the already-shipped
`snapshot` `AsyncFunction` (`packages/{ios,android}/FxModule.*`). No SharedObject/Nitro needed
(that's DEF-021). Mechanic details + citations are in `preflight.md`.

## The clobber rule (the design crux — from preflight)

`controlled` = zero arbitration, so **the developer's imperative write must win**: a `setUniform`/
`setHighlight` write must **persist across a later host re-render**, i.e. `applyResolvedConfig()`
(iOS) / `OnViewDidUpdateProps` (Android) must NOT reset the imperatively-set uniform back to its
prop-derived value. The implementation tracks which uniforms have been imperatively overridden and
the prop-reapply path skips those. This is the single thing the device spike must prove.

## Spike first (do before the full build)

Confirm the clobber rule on a device before committing the full implementation:

- iOS: `AsyncFunction` on `FxSurfaceView` → write into the MSL uniform struct the `MTKView`/driver
  reads; confirm the uniform changes on the next `CADisplayLink` tick **and** survives a forced host
  re-render (a prop commit that does not touch that uniform).
- Android: `AsyncFunction` → write the `RuntimeShader` uniform the per-frame `setRenderEffect` reads
  (guarded by the source-declaration scan, never a blind `setFloatUniform`); confirm next
  Choreographer frame reflects it **and** survives a host re-render.

A negative result (the write races the loop, or a commit clobbers it) is a real finding — record it
in `notes.md` and adjust scope. The result finalizes the mechanic section in `structure.{ios,android}.md`.

## Authority links

- **Contract:** `4-runtime/30` Decision 7 + the `controlled` row + § two input sources / one buffer;
  `3-motion/40` regime C (the never-per-frame-JS law); RT-005 (`decision-ledger.md` — coordinate
  space). `4-runtime/51` § the thin async boundary (`AsyncFunction` as the discrete-imperative
  mechanic).
- **Decision:** `adapt` the Expo `AsyncFunction(view, …)` ref-method pattern. Flip-trigger to a
  SharedObject / Nitro: a *detached* handle or per-child control → DEF-021 / DEF-002, not this task.
- **Reference (HOW):** `references/expo` (expo-modules-core) — `AsyncFunction` on a view definition,
  UI-thread dispatch. REJECT taking the `SharedObject`/JSI path (no detached handle here). Diff the
  actual view-`AsyncFunction` template, do not just name it (protocol step 5).
- **Mechanics (pinned at docs-closed):** `5-realization/structure.{ios,android}.md` — a new
  `controlled` write-path section (the uniform-write mechanic, the guarded-write rule, the `[0,1]`
  y-up UV space). One place each.
- **Rules gate:** #1 (native owns the frame loop — discrete writes only, no JS frame loop), #7
  (stay on Expo Modules — `AsyncFunction`, no JSI/SharedObject), #2 (agnostic names — `setUniform`/
  `setHighlight` are platform-agnostic), #8 (discrete targets, not per-frame JS).

## Proof

- headless: packages `tsc` / `build` / `lint` / `swift:lint` + tests (a Tier-1 test that
  `controlled` selects no recognizer and that an unknown uniform name is rejected by the guard);
  Android `:react-native-fx:compileDebugKotlin`; iOS `pod install` + example `xcodebuild`.
- device: (1) the spike — a discrete `setUniform`/`setHighlight` write is observed by the live loop
  on the next frame; (2) the write survives a host re-render (Fabric commit); (3) `controlled`
  passes touch through (no recognizer) while still accepting writes; (4) loop pauses off-window
  (rule #1 unregressed). **No per-frame JS loop in any scenario.**
- docs: `30` Decision 7 `controlled` flipped from deferred → shipped (discrete-write subset; the
  continuous channel stays DEF-006); the `controlled` write-path mechanic pinned in
  `structure.{ios,android}.md`; `DEF-015`'s `controlled→DEF-020` note resolved. No ledger row of its
  own (DEF-020 closes no `Closes:` id; it *unblocks* DEF-011/RT-002).

## Lifecycle checklist

- [x] spec'd (this file)
- [x] rules-gated (#1 discrete-only, #7 Expo-Modules-only, #8 no per-frame JS)
- [x] implemented (spike → then the full write path)
- [x] commented (iceberg — the guarded-write rule, the UV space, why discrete-only)
- [x] headless-done
- [ ] device-verified (the 4 device scenarios above — human's gate)
- [ ] reviewed
- [ ] docs-closed (`30` + `structure.*` + `DEF-015` note)
- [ ] merged (human's tick)

## Deferred to DEF-021 (recorded so this task does not creep)

True `Fx*` `SharedObject` layer + `FxEffectRenderer` object extraction + HybridObject shape
(`equals`/`dispose`/identity). Trigger: the first **detached** imperative handle (post-v2 impulse
API `surface.ripple()`), or **per-child control** (DEF-002 / SPINE-010 — the `05` Nitro
re-evaluation). Keep `setUniform`/`setHighlight` a clean subset so that swap stays mechanical.
