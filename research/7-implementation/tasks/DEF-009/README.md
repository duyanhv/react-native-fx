# DEF-009 — Android content-distort wrapper (ripple demonstrator, FX-008)

Type: `implement` · State: `in-progress` · Device: `yes` (Android-only) · Consumes: — ·
Closes: FX-008 · Blocked by: — (V2 active)

## Why this task exists

`content-distort` is the one effect that runs **over live RN content** — the case rule #4 puts
out-of-scope on iOS (hosting RN content to sample it severs touch). Android can do it: `RenderEffect`
is **draw-time**, so a shader distorts live, still-touchable content (`01` § The Android softening;
`02` § content-distort; `23` open question). This task realizes that capability on Android and closes
the `23` open question ("whether to ever expose a content-filter wrapper on Android").

Framed precisely: this proves the **runtime fact** — a draw-time AGSL sampler visibly distorts live
content while the RN children inside stay touchable — with **one curated `ripple` demonstrator** on a
deliberately minimal native prop. It does **not** design the final product ergonomics. A broader
distortion catalog and a BYO-distortion contract are deferred to real demand (SPINE-001); a public
high-level surface is a separate, later decision.

## No spike, no preflight

`RenderEffect.createRuntimeShaderEffect(RuntimeShader, String)` and `RuntimeShader` are first-party
Android APIs (API 33+), and the second argument is the `uniform shader` name the AGSL program
declares — so `uniform shader content;` + `"content"` is the contract. The shipped
`FxSurfaceShaderView` is in-repo precedent for AGSL + `RuntimeShader` + the `Choreographer` loop +
the source-declaration uniform scan. No references-preflight (first-party APIs, in-repo precedent,
the iOS path is a no-op). The **only** framework detail to confirm — on device, not in a reference —
is the **per-frame refresh idiom**: whether updating the `RuntimeShader`'s `time` uniform requires
re-calling `setRenderEffect(...)` each frame for the change to take, or whether `invalidate()` on the
container suffices. Pick whichever animates and verify it in the device proof.

## Authority links

```
Subtask: Android content-distort wrapper — ripple demonstrator (FX-008).
- Contract anchors:  23-filters.md (the content-filter-wrapper open question this closes;
                     filter is the bundled-inside-effect sibling, content-distort is the
                     over-live-content inverse), 02-capability-ir-and-lowering.md
                     (the content-distort node + worked example — Android rung os33/expo-view,
                     iOS out-of-scope; select() skips planned), 01-substrates-and-hosting.md
                     (§ The Android softening — draw-time → touch survives; Decision 4),
                     decision-ledger.md FX-008. Mechanic: structure.android.md
                     § content-distort (pinned this session — the sole home).
- Decision:          blueprint — **use** first-party Android APIs
                     (RenderEffect.createRuntimeShaderEffect + RuntimeShader, both API 33).
                     fx-original = the ripple AGSL sampler + the minimal contentDistortion prop.
                     Flip-trigger: a broader catalog or BYO distortion only on real demand
                     (SPINE-001); a public high-level surface is a separate later decision.
- Reference (HOW):   the shipped FxSurfaceShaderView.kt (AGSL RuntimeShader load, the
                     Choreographer start/stop loop, baseTimeNanos→time, the scanUniforms /
                     declaresUniform source-scan that AVOIDS the API-33 setFloatUniform probe
                     abort) and FxSurfaceView.kt (the intermediateContainer/FxPassthroughContainer
                     that holds RN children; pausePresentationLoop/resumePresentationLoop;
                     applyResolvedConfig prop batching). Android docs — createRuntimeShaderEffect,
                     RuntimeShader, AGSL. NOT a references/ repo concern.
- Rules gate:        #1 native frame loop, no per-frame JS (the prop crosses once; time advances
                     natively; pause off-window). #2 agnostic capability; the prop name is
                     mechanical, not a platform name. #3 expo-view substrate (FxSurfaceView).
                     #4 NEVER host/reparent the RN children — apply a draw-time RenderEffect to
                     the existing container; the children stay a plain RN view tree (this is why
                     Android touch survives and iOS is out-of-scope). #6 the mechanic lives only
                     in structure.android.md. #9 reads layout, writes none.
- Surface contract (pin exactly):
                     - Native/runtime prop `contentDistortion` on FxSurfaceView. 'ripple' is the
                       ONLY recognized value; absent or unrecognized = no effect. Named
                       mechanically — NEVER `effect` — so it cannot be confused with the
                       generative `shader` surface.
                     - NOT the long-term public API. No high-level component/sugar ships here;
                       that is a separate surface decision, explicitly deferred.
                     - The ripple AGSL is authored INLINE (a Kotlin AGSL const), NOT a manifest
                       ShaderId and NOT in CURATED_SHADER_IDS (it is a sampler, not a generative
                       catalog entry).
                     - Strength rides the existing `intensity` (0–1). No new uniform plumbing.
                     - Combining contentDistortion with a generative `shader` on one surface is
                       out of scope for V1 (undefined) — document, do not engineer.
                     - iOS: the prop is accepted-but-ignored (no-op, {via:'none'}). Register it
                       as an empty setter on iOS so no "unsupported prop" noise; iOS native does
                       nothing.
- Device-verify:     (Android, API 33+) ripple VISIBLY distorts the wrapped RN content AND a
                     button/Pressable inside that content still receives touch (press + fire);
                     the distortion ANIMATES (time advances); the loop pauses off-window /
                     backgrounded; below API 33 (or on a pre-33 device) content renders normally
                     with no crash; iOS is a silent no-op.
- Done when:         the contract is satisfied + rules honored + FX-008 true in 02/23 + the
                     device proof passes on Android.
```

## Scope (build order)

1. **Native mechanic (Android).** Apply `RenderEffect.createRuntimeShaderEffect(rippleShader, "content")`
   to `FxSurfaceView`'s content container (`FxPassthroughContainer`/`intermediateContainer`) when
   `contentDistortion == 'ripple'`; clear it (`setRenderEffect(null)`) otherwise. A `Choreographer`
   frame loop advances `time` and refreshes the effect (verify refresh idiom on device); strength =
   the existing `intensity`. Uniform writes guarded by the source-declaration scan (reuse the
   `declaresUniform` pattern — no `setFloatUniform` probe). Hook the loop into the existing
   `pausePresentationLoop`/`resumePresentationLoop`. Gate all of it behind
   `Build.VERSION.SDK_INT >= TIRAMISU`; below 33 do nothing (content normal). Prefer a focused
   internal helper (e.g. `FxContentDistortion`) over inlining into `FxSurfaceView`, matching the
   `FxAnimationDriver`/`FxPressHandler` idiom.
2. **The ripple AGSL.** One inline sampler const: declares `uniform shader content;` +
   `resolution`/`time`/`intensity`; returns `content.eval(distortedCoord)`. A radial sine ripple is
   enough; tune amplitude on device. Reference sketch (executor to finalize/tune):
   ```agsl
   uniform shader content;
   uniform float2 resolution;
   uniform float time;
   uniform float intensity;
   half4 main(float2 fragCoord) {
     float2 uv = fragCoord / resolution;
     float2 d = uv - float2(0.5);
     float dist = length(d);
     float wave = sin(dist * 40.0 - time * 4.0) * 0.012 * intensity;
     return content.eval(fragCoord + normalize(d) * wave * resolution);
   }
   ```
3. **Prop registration.** `Prop("contentDistortion")` on the FxSurfaceView view block in
   `FxModule.kt` (Android, wired) and `FxModule.swift` (iOS, empty no-op setter). Add the prop to the
   JS native-view types in `packages/src/runtime/FxSurfaceView.tsx`.
4. **Manifest truth.** Flip the Android `content-distort` rung from `status: 'planned'` to a normal
   selectable rung (remove the `status` field) in BOTH `02` (worked example) and the shipped
   `packages/src/manifest/manifest.ts`; iOS rung stays `out-of-scope`. Add/adjust a `select()`
   conformance test: `content-distort` resolves the Android rung at `os:33`, degrades to
   `{via:'none'}` below 33 and on iOS.
5. **Example demo.** A screen wrapping a real, interactive RN subtree (a labeled button or two)
   in an `FxSurfaceView` with `contentDistortion="ripple"` — the device-proof surface (distortion
   visible, button still tappable). Register it like the sibling screens.
6. **Docs-closed (planner, after device):** `23` open question resolved (DEF-009 ships the Android
   ripple demonstrator); `02` content-distort note reflects shipped Android rung; `data-layer` I5 /
   content-distort entry reconciled; ledger FX-008 → resolved. `structure.android.md` § content-distort
   is already pinned this session.

## Proof

```
Proof:
- headless: packages tsc/build/lint/swift:lint + tests (incl. the new select() conformance);
            Android :react-native-fx:compileDebugKotlin BUILD SUCCESSFUL; iOS pod install +
            example xcodebuild BUILD SUCCEEDED (prop no-op compiles); example tsc.
- device:   Android API 33+ — ripple visibly distorts the wrapped content AND a Pressable inside
            it still fires; distortion animates; loop pauses off-window/backgrounded; pre-33 (or
            guarded path) renders content normally, no crash; iOS silent no-op. Runbook +
            evidence under tasks/DEF-009/evidence/.
- docs:     23 (open question resolved), 02 (Android rung shipped), data-layer (I5/entry),
            decision-ledger FX-008 → resolved. structure.android.md § content-distort pinned.
```

## Out of scope (do not build)

- iOS content-distort (structurally out-of-scope, rule #4 — prop is a no-op only).
- A distortion catalog beyond `ripple`; BYO-distortion / the `content` shader-uniform registry
  contract (DEF-008's registry wires `intensity`, not a `content` input shader).
- Any high-level public component or `fx.*` sugar for content-distort (separate surface decision).
- Combining `contentDistortion` with a generative `shader` on one surface.
- Compose / `Modifier.graphicsLayer` path (deferred with the Compose rung).
