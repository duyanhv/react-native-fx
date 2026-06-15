# U8-003 — the Android interactive-uniform probe fix (no exception-probe)

Type: `rework` · State: `todo` (spec'd) · Device: `yes` · Consumes: — · Closes: — (no ledger row; **unblocks RT-001 via U8-002**) · Blocked by: — (U8-001 code is live; this reworks it)

## Why this task exists

U8-002's device run hard-crashed on Android (physical POCO F1, **API 33** — the `minSdk`
floor for `RuntimeShader`): the coexistence screen kills the app process on mount, 5/5, a
native SIGABRT before any gesture. Root cause, confirmed from source + the saved tombstone
(`../U8-002/evidence/android-crash-tombstone.txt`):

`FxSurfaceShaderView.probeInteractiveUniforms()` tests whether a shader declares the
`pressDepth`/`touch` uniforms by **calling** `setFloatUniform(name, …)` inside a try/catch and
relying on AGSL's `IllegalArgumentException("unable to find uniform named …")`. The harness
shader `aurora.agsl` declares only `time`/`resolution`/`intensity` (only `dots.agsl` is
interactive), so the probe calls `setFloatUniform` for an absent uniform → on API 33 AGSL's
native error-message construction in `RuntimeShader.nativeUpdateUniforms` corrupts (passes
garbage bytes to `NewStringUTF`) → CheckJNI hard-aborts the process.

**The garbage bytes are AGSL's own — not ours.** We pass the clean literal `"pressDepth"`; the
corruption is inside the platform's error path on API 33. There is **no uninitialised-string
bug in our Kotlin** to hunt. The actionable defect is the pattern: **probing uniform existence
by catching an AGSL exception is unsafe.** U8-001 gated only API 35, where the probe happened
not to abort; the coexistence screen is the first to mount `active`-mode shader surfaces whose
AGSL lacks the interactive uniforms, so it is the first to trip it.

## Authority links

```
Subtask: replace the unsafe interactive-uniform exception-probe with a source-declaration scan.
- Contract anchors:  32-host-safe-hittest-and-sdf.md (the interactive uniforms pressDepth/touch
                     the probe gates), 30-interaction-and-gestures.md (native owns touch →
                     uniforms), structure.android.md §Touch contract + §`shader` (the mechanic
                     home — the no-probe rule gets PINNED here; it was never pinned, which is
                     part of how it slipped past U8-001), DOC-013 (curated hand-maintained
                     MSL+AGSL pairs — the uniform set is statically known from the source files).
                     decision-ledger: closes NOTHING; unblocks RT-001 through U8-002.
- Decision:          rework — kill the exception-probe. The AGSL source text is already read
                     into memory at `setShaderId` (`FxSurfaceShaderView.kt:64`); determine
                     `supportsPressDepthUniform` / `supportsTouchUniform` by scanning that
                     source for the uniform DECLARATION (a token match on the declared name),
                     and DELETE the `RuntimeShader.supportsFloatUniform` extension entirely.
                     The `onDraw` guarded writes (gated on the two flags) stay exactly as they
                     are — only how the flags are computed changes. Safe because AGSL only
                     strips UNUSED uniforms and `dots` both declares and uses them, so a
                     declared interactive uniform is always present to write.
                     Reject: catching the AGSL exception; calling `setFloatUniform` to test
                     existence (the API-33 abort); a second static source-of-truth (a hard-coded
                     id set / a manifest mirror) that can drift from the AGSL files — the source
                     text IS the truth, scan it.
- Mechanics (pin):   structure.android.md — interactive-uniform support is determined by
                     scanning the loaded AGSL source for the uniform declaration, NEVER by an
                     exception-probe (which CheckJNI-aborts on API 33). Add this to §Touch
                     contract (the interactive-uniform write mechanic) or §`shader`; one home.
- Reference (HOW):   the in-hand source at `FxSurfaceShaderView.setShaderId` (`:64`);
                     fixtures: `aurora.agsl` (time/resolution/intensity — non-interactive) vs
                     `dots.agsl` (declares + uses pressDepth/touch — interactive).
- Rules gate:        #1 native owns the frame loop + uniforms; #7 no JSI/C++; #9 reads layout.
                     iOS is untouched (Metal uploads a fixed `FxUniforms` struct via
                     `setFragmentBytes` — no name lookup, no probe, cannot hit this path). Keep
                     FxShaders pixels. The press FSM / recognizer is UNTOUCHED — this is a
                     rendering-path fix only.
- Scope:             ONE file. `FxSurfaceShaderView.kt`: (a) rewrite `probeInteractiveUniforms`
                     to set the two flags from a source-declaration scan of the in-hand AGSL
                     text; (b) delete the `RuntimeShader.supportsFloatUniform` extension and its
                     `IllegalArgumentException` import if now unused; (c) leave `onDraw`, the
                     loop, `setShaderId`'s structure, and the flags' consumers as-is. Guard the
                     scan against obvious false positives (match a declaration, not any mention).
- Scope boundaries:  NOT the press FSM / `FxPressHandler`; NOT iOS; NOT the example harness;
                     NOT the SDF shape test; NO new uniforms, NO AGSL edits, NO manifest change.
                     If the fix appears to need anything beyond this one file, STOP and flag it.
- Device-verify:     physical Android, BOTH API 33 (the floor where it crashed) and API 35
                     (U8-001's original gate): (1) the coexistence screen MOUNTS without
                     SIGABRT (the blocker is gone); (2) regression — an `active`-mode `dots`
                     surface still receives pressDepth/touch writes (press → visible response),
                     and a non-interactive `aurora` surface renders with no writes and no crash;
                     (3) a quick smoke that the U8-002 Android matrix rows can now be reached.
                     The FULL Android matrix scoring stays U8-002's gate — this task proves the
                     crash is fixed so that gate can run. Write evidence/device.md.
- Closure:           on the maintainer's PASS the planner pins the no-probe mechanic in
                     structure.android.md, writes reviews/U8-003.md, ticks through merged, and
                     U8-002's Android matrix re-runs (RT-001 still closes at U8-002, not here).
- Done when:         `probeInteractiveUniforms` uses a source-declaration scan, the
                     `supportsFloatUniform` exception-probe is deleted, packages gates +
                     `compileDebugKotlin` green, the coexistence screen mounts crash-free on
                     API 33, interactive writes still reach `dots`, and the mechanic is pinned
                     in structure.android.md. No comment provenance.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-13)
- [x] rules-gated (planner, 2026-06-13 — #1/#7/#9 honored; iOS + the press FSM untouched; one-file rendering-path fix)
- [x] implemented (agent, 2026-06-13 — `scanInteractiveUniforms` reads the in-hand AGSL source; the `supportsFloatUniform` exception-probe and the `IllegalArgumentException` import are deleted)
- [x] commented (agent, 2026-06-13 — iceberg: why the scan, not a probe — the API-33 AGSL CheckJNI abort; and the declaration-vs-mention word-boundary guard)
- [x] headless-done (agent, 2026-06-13 — packages `tsc`/build/lint/`swift:lint`/58 tests + `:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL, all green)
- [x] device-verified (maintainer-ratified 2026-06-13 — API-33 AVD `fx_api33`: repro validated against the reverted build, then mount **5/5 crash-free** with the fix; API-35 regression-safe from the prior run; `evidence/device.md`. dots-active visible-write residual accepted, occluded by U8-002 nesting)
- [x] reviewed (planner, 2026-06-13 — `../../reviews/U8-003.md`)
- [x] docs-closed (no ledger row; the no-probe mechanic pinned in `structure.android.md` §`shader`)
- [ ] merged (maintainer, on integration/0.1.x)

## Proof

- **headless:** packages `tsc`/build/lint/`swift:lint`/58 tests + `:react-native-fx:compileDebugKotlin`.
  The scan is pure Kotlin; the abort is a device behavior, so the real proof is the device mount.
- **device:** `evidence/device.md` — coexistence-screen mount crash-free on API 33 + API 35;
  `dots` still receives interactive writes; `aurora` renders with none.
- **docs:** structure.android.md — the no-exception-probe rule pinned in the mechanic home. No
  ledger row (a rework of U8-001 code surfaced by U8-002; RT-001 closes at U8-002).
```
