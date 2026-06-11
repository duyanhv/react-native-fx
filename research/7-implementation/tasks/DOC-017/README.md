# DOC-017 — reconcile the spine to the shipped Android hosted mechanic

Type: `rework` · State: `merged` · Device: no · Consumes: — · Closes: — (no ledger row)

Origin: critique F4 (HIGH, spine docs). The spine defines `hosted` as the
"SwiftUI/Compose host" and `02`'s worked examples lower Android shaders via Compose
mechanics (`ShaderBrush` / `RenderEffect` / `frame-nanos`). The shipped code deliberately
avoids Compose: a plain `View` drawing a `RuntimeShader` through a `Paint` in `onDraw`,
driven by a `Choreographer.FrameCallback` (`FxShaderView.kt`). The reasoning is sound
(`RenderEffect.createRuntimeShaderEffect` filters *existing* content; a generative shader
produces its own pixels), but the authority chain is broken — the spine teaches a mechanic
the code rejected, and the next agent re-derives "Android hosted = Compose."

Grounding (subtask-protocol §5 — diff the code, not the name): `FxShaderView.kt:11-26`
docblock + `init` confirm plain `View` + `RuntimeShader` + `Paint.onDraw` +
`Choreographer.FrameCallback`. `FxMaterialView` (U3-003) and the `fill` renderer (U3-001)
are the same plain-`View` family.

Scope (grounded extension): the charge names `01`/`02`/`README`, but `structure.android.md`
(the SINGLE home for the mechanic) is itself stale and self-contradictory — its Substrates
(`:15`) and Hosting-mechanics (`:42`) call hosted a "Compose composable/host," while its
child-layout mechanic (`:45-54`) and render-paths deviation (`:76-81`) describe a
"plain-`View` host." Closing F4 ("a mechanic lives in exactly one place") requires the
mechanic home to be truthful, so the clock (`:68-69`) and shader render path (`:82-83`) are
corrected there too. Compose stays recorded as the intended future rung everywhere.

## Subtask

- Contract anchors:  `0-spine/01` (the cross-platform substrate model), `0-spine/02` (the
                     vocabulary + worked examples), `research/README.md` (the doc map's
                     substrate axis). `structure.android.md` is the mechanic home they defer to.
- Decision:          `rework` — record View-based hosting as the Android V1 hosted mechanic
                     with Compose as a future rung (the critique's sanctioned alternative).
                     Do not rewrite the *designed* Compose ladder (the mesh-AGSL `ShaderBrush`
                     rung, the Compose motion drivers); only stop teaching it as shipped.
- Reference (HOW):   `packages/android/.../FxShaderView.kt`, `FxMaterialView.kt` — the shipped
                     plain-`View` realization.
- Guides:            `Writing Style Guide.md` (prose). `CLAUDE.md` rule #6 (platform
                     divergence localized) + the cardinal "one home for a mechanic."
- Rules gate:        none breached — docs-only; the fix *restores* rule #6 (one home).
- Device-verify:     none — the mechanic is already device-proven (U3-006 Android PASS).
- Done when:         no spine doc teaches "Android hosted = Compose" as the V1 reality;
                     `structure.android.md` states the shipped plain-`View` mechanic with
                     Compose marked as the deferred future rung; the two docs agree.

## Proof

- headless: N/A — docs-only, no code changed.
- device:   N/A — shipped mechanic already proven on U3-006 (POCO F1, API 35).
- docs:     `research/README.md`, `0-spine/01`, `0-spine/02`, `5-realization/structure.android.md`.
            No ledger row (REAL-003 already resolved the AGSL asset path; this is the
            drawing-mechanic wording the spine never caught up to).
