# DOC-017 — notes

## Changed
Reconciled every spine assertion of "Android hosted = SwiftUI/Compose host" to the shipped
plain-`View` realization, Compose recorded as the deferred future rung.

- `5-realization/structure.android.md` (mechanic home — was itself stale/self-contradictory):
  - Substrates `hosted` (`:15`) — now "a host view fx owns; V1 ships a plain `View`" drawing
    the effect directly; Compose named as the future rung.
  - Hosting mechanics (`:42`) — "Compose host" → "Host view … a plain `View` in V1 (Compose deferred)."
  - Clock `hosted` (`:68`) — `Choreographer.FrameCallback` on the plain View is the V1 path;
    `withFrameNanos`/`rememberInfiniteTransition` deferred with the Compose rung.
  - Shader render path (`:82`) — RuntimeShader drawn through a `Paint` in `onDraw` on the plain
    View; `RenderEffect.createRuntimeShaderEffect` explicitly NOT used (filters existing content,
    not generative pixels); the createRuntimeShaderEffect/ShaderBrush path marked Compose-era/deferred.
- `0-spine/01` — `hosted` substrate def (`:19`) reconciled (SwiftUI iOS / plain View Android V1,
  Compose future); "Compose host vs plain ExpoView" (`:88`) → "the hosted host view vs plain ExpoView";
  "fx owns its boundary" (`:55`) softened from "hosts SwiftUI/Compose" → "hosts its own view".
- `0-spine/02` — `Substrate` type comment (`:58`) reconciled + note that the Android `applyVia`
  values name the Compose-era mechanism, realized via plain-View draw in V1; shader-hosted worked
  row (`:206`) `applyVia: 'RenderEffect'` → `'Paint.onDraw'` with the generative-vs-filter note.
- `research/README.md` — Substrate axis (`:82`) reconciled.

## Deliberately NOT changed (in scope, left as designed)
- The *designed* Compose ladder stays: the `fill` mesh-AGSL `ShaderBrush` rung (`02:180`), the
  gradient-family `Brush.*` rows + API table in `structure.android.md` (`:124`,`:134`), and the
  Compose motion drivers (`animate*AsState`/`spring`, `:237`). These are the intended future
  mechanism, not a claim of V1 shipping. The substrate-level framing now disambiguates them.
  The critique praised the realization's reasoning; only the *teaching as shipped* was the bug.
- `02:8` primitive-family list ("Compose/RenderEffect/AGSL on Android") — accurate as a family
  list; not a hosting claim.

## Scope note
Charge named `01`/`02`/`README`; extended to `structure.android.md` because it is the SINGLE
home for the mechanic (cardinal rule) and was itself stale — fixing the spine to defer to it
while it still taught Compose would only relocate the drift. Grounded in `FxShaderView.kt`
(plain `View` + `RuntimeShader` + `Paint.onDraw` + `Choreographer.FrameCallback`).

## Lifecycle
- spec'd → rules-gated (docs-only; the fix *restores* rule #6, one home for a mechanic) →
  docs reconciled. State: `ready-to-merge`. `reviewed`/`merged` are the maintainer's.

## Proof
- headless: N/A — docs-only, no code changed.
- device:   N/A — shipped mechanic already device-proven on U3-006 (POCO F1, API 35).
- docs:     README, `0-spine/01`, `0-spine/02`, `structure.android.md`. No `Closes:` row
            (REAL-003 already resolved the AGSL asset path; this was the drawing-mechanic wording).

## Unverified claims
- None — every mechanic asserted is grounded in shipped code (`FxShaderView.kt`,
  `FxMaterialView.kt`, the `fill` renderer) and already device-proven.

Next: maintainer review, then DOC-018 (presence scope ceiling + sheet/modal naming + React-semantics rows in `35`).
