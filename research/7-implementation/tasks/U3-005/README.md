# U3-005 — shader asset packaging + runtime load proof

Unit 3 · type: `device-verify` (hybrid — see Reframing) · state: `in-progress` · device: yes
Consumes: — · Closes: REAL-002, REAL-003
Blocked by: U3-001 (satisfied — merged)

> Closes the two shader-asset rows: iOS `.metal` packages into `FxShaders.bundle`
> as `default.metallib` and resolves at runtime on the pinned toolchain (REAL-002),
> and Android `.agsl` packages as assets read at load time (REAL-003). This task
> does **not** add new shaders, BYO registration, or a compiler — those ship and
> are device-proven under U3-006. It collects the packaging/runtime-load evidence,
> records the one missing source-doc decision, and closes the rows.

## Reframing (read first — the table label undersells it)

`progress.md` tags U3-005 `device-verify`, which implies two fresh device runs of an
undecided design. The cited sources say otherwise:

- **REAL-002's close condition is a *build* check, not a device render — and it is
  agent-ownable.** The ledger close condition is literally "build verification on the
  pinned toolchain": CocoaPods emits `FxShaders.bundle` unmangled with `default.metallib`
  at its root on SDK 56. That is a Tier-3 build-artifact inspection (Testing Guide), not
  the human device gate. The packaging mechanism is already recorded in `52` (Decision #2)
  and implemented in `ios/ReactNativeFx.podspec` + the `FxSurfaceView.swift` bundle lookup;
  the *render* through it is already proven by U3-006. **Close REAL-002 from a real build
  artifact — first inspect U1-004's existing `bare-ios` CI run (built on `macos-26` /
  Swift 6.2 — the pinned toolchain) for the `FxShaders.bundle → default.metallib`
  structure.** Only if that log/artifact does not expose the bundle internals, run a
  targeted build — and only on the pinned toolchain (a non-pinned local SDK proves nothing
  for REAL-002).
- **Do NOT close REAL-002 on inference.** U1-004 proved fx compiles/links and `Podfile.lock`
  resolves — it did *not* assert the bundle name is unmangled with `default.metallib` at
  the root. U3-006's hosted render used `ShaderLibrary.default[dynamicMember:]`, whose
  resolution path vs `FxShaders.bundle` is the very thing this task pins (see the Done-when
  loader question). Treating "a metallib renders" as "REAL-002's exact bundle fact" launders
  a near-match into the source of truth — the closure-rule failure mode. Verify the artifact.
- **REAL-003 is mis-statused `open`.** The AGSL path is already chosen and shipped
  (`android/src/main/assets/shaders/*.agsl`, read via `context.assets.open(...)`),
  and device-proven on U3-006 (POCO F1, API 35, all ten shaders render). The only gap
  is that **`structure.android.md` never records the asset path + read API**. That is a
  `doc-cleanup`/`propagate`, not a decision or a device run.
- **The evidence already exists across two merged tasks.** U1-004's bare-CI native
  compile bundled `FxShaders.metal → default.metallib`; U3-006's device pass rendered
  shaders through the hosted Metal path (iOS) and the AGSL assets path (Android).

So the **dominant work is doc-cleanup + closure-reconciliation**, with a thin
device/build-verify residual confined to the iOS bundle-name + hosted-path metallib
resolution. Frame the proof accordingly — do not re-run what U1-004 and U3-006 proved.

## Start here (cold-start)

1. **This file** — the work order, authority links, scope, and proof.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle and closure rules.
3. **`research/7-implementation/tasks/U3-005/notes.md`** — current handoff.
4. **Per-gate guides:**
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - all gates → `agents/session-protocol.md`

## Authority links

```
Subtask: shader asset packaging + runtime load proof (blueprint Unit 3)
- Contract anchors:  52 (§Cross-platform shader asset bundling; Decisions #2/#3;
                      Open questions — resource-bundle name, AGSL asset path),
                      structure.ios.md (§Render paths — build-time .metallib,
                      linkage-agnostic bundle lookup), structure.android.md
                      (§Render paths — RuntimeShader/AGSL; the asset-path line is
                      MISSING and this task adds it)
- Decisions:         Honor 52 #2 (iOS resource_bundles + MTL_LIBRARY_OUTPUT_DIR),
                      52 #3 (Android .agsl as packaged assets), REAL-004 (hand-
                      maintained MSL+AGSL pairs). No new packaging mechanism.
                      Flip-trigger: none — runtime shader compilation is deferred
                      (FX-007), not a V1 path.
- Reference (HOW):   Shipped package code is the precedent:
                      `packages/ios/ReactNativeFx.podspec` (resource_bundles + MTL
                      output dir), `packages/ios/FxSurfaceView.swift`
                      (`loadShaderLibrary`/`shadersBundle` → default.metallib),
                      `packages/android/src/main/java/expo/modules/reactnativefx/
                      FxShaderView.kt` (`context.assets.open("shaders/<id>.agsl")`),
                      `packages/android/src/main/assets/shaders/*.agsl`.
                      `52` cites `_legacy/08 §5` for the resource_bundles rationale.
                      REJECT: iOS `source_files` for `.metal`; Android `res/raw`;
                      runtime `makeLibrary(source:)` as the default load path.
- Guides:            Writing Style Guide (the doc edits), Device Verification Guide
                      (the iOS build/render confirmation), Contributing Guide
                      (merge bar), session-protocol
- Rules gate:        #1 (native injects time/resolution; no per-frame JS — already
                      true), #6 (iOS and Android are peers — both rows close together),
                      #7 (Expo Modules packaging via the podspec/assets; no custom
                      native boundary)
- Build-verify:      REAL-002 — "build verification on the pinned toolchain": CocoaPods
                      emits `FxShaders.bundle` unmangled with `default.metallib` at root
                      on SDK 56. This is an AGENT-ownable Tier-3 build-artifact check, not
                      the human device gate. Inspect U1-004's `bare-ios` CI artifact first
                      (pinned `macos-26` / Swift 6.2); fall to a targeted pinned-toolchain
                      build only if the artifact doesn't expose the bundle internals. The
                      render through the bundle is already proven by U3-006.
- Device-verify:     none new — REAL-003's render is already device-proven on U3-006
                      (POCO F1, API 35); it needs the source-doc line, not a re-run.
- Done when:         structure.android.md records the AGSL asset path + read API;
                      the iOS bundle/metallib resolution is confirmed and recorded in
                      structure.ios.md / 52; REAL-002 + REAL-003 are true in their
                      source docs and flipped to resolved; the IMPL-001 REAL-002
                      residual is thereby cleared (U1-001 closes in its own task).
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [ ] implemented — N/A (no code; packaging is already shipped)
- [ ] commented — N/A
- [ ] headless-done — REAL-002's build-artifact check: inspect U1-004's `bare-ios` CI
      run for `FxShaders.bundle → default.metallib` (agent-ownable Tier-3 build verify)
- [ ] device-verified — N/A new (REAL-003 render proven on U3-006; REAL-002 is a build
      check, not a device render)
- [ ] docs-closed — `structure.android.md` AGSL path added; `structure.ios.md`/`52`
      bundle resolution recorded; REAL-002 + REAL-003 closed in source
- [ ] reviewed
- [ ] merged

## Proof

- headless:
  - From the bare-CI / a local pod build, confirm `pod install` links
    `ReactNativeFx` and the Metal toolchain produces `FxShaders.bundle` containing
    `default.metallib` (U1-004's `bare-ios` job already exercises this — reuse its
    artifact rather than re-running where possible).
  - From **packages/**: the package build stays green (no regression): `bunx tsc
    --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, `bun run test`.
- build-verify (REAL-002, agent-ownable):
  - Inspect U1-004's `bare-ios` CI run (pinned `macos-26` / Swift 6.2): confirm the
    emitted bundle is named `FxShaders.bundle` (unmangled) with `default.metallib` at
    its root. If the log doesn't expose the bundle internals, run a targeted build on a
    pinned toolchain. This is the literal REAL-002 close condition — close it from this
    artifact, not from inference.
  - Record which loader the hosted path uses (`ShaderLibrary.default` vs the
    `FxSurfaceView` lookup) in `structure.ios.md` — the open loader question.
- device (no new run):
  - **Android (REAL-003):** already observed on U3-006 (POCO F1, API 35) — all ten
    AGSL shaders read from `assets/shaders/` and render. Reference that evidence.
  - **iOS render:** already observed on U3-006. REAL-002 needs the *build* artifact
    (above), not a fresh render.
  - Evidence lands in `evidence/device.md`; cross-link U1-004 and U3-006 evidence.
- docs:
  - `structure.android.md` §Render paths gains the AGSL packaging line: `.agsl` ship
    under `src/main/assets/shaders/`, read at load via `context.assets.open(...)`
    (not `res/raw`); below API 33 degrades to `{ via: 'none' }`.
  - `structure.ios.md` §Render paths / `52` confirm `FxShaders.bundle` +
    `default.metallib` resolution on SDK 56 and which loader the hosted path uses.
  - `52` Open questions: both "Resource-bundle name" and "AGSL asset packaging path"
    bullets removed once recorded.
  - decision-ledger REAL-002 + REAL-003 flipped to `resolved` with the close note.
  - `progress.md` moves U3-005 through the lifecycle.

## Scope

### In scope (this task)

- Record the Android AGSL asset path + runtime read API in `structure.android.md`
  (the one genuinely-missing decision).
- Confirm and record the iOS `FxShaders.bundle` / `default.metallib` resolution on the
  SDK 56 toolchain and the hosted-path loader, in `structure.ios.md` / `52`.
- Reconcile REAL-002 + REAL-003 against existing U1-004 and U3-006 evidence and close
  both rows in their source docs.

### Out of scope

- New shaders, BYO `.metal`/`.agsl` registration, or the asset manifest (U3-004 owns
  the BYO contract; U3-006 shipped the curated set).
- Runtime shader compilation (FX-007, deferred) and JS `source` props.
- The interactive `expo-view` shader surface and `MTKView` pipeline (V2, Unit 3's
  second face) — this task touches only the *packaging/load* of the hosted path.
- Closing IMPL-001 / U1-001. This task clears their REAL-002 *residual*; U1-001 closes
  in its own task once REAL-002 is resolved here.

## Done when

- `structure.android.md` records the AGSL asset path + read API; `structure.ios.md`/`52`
  record the iOS bundle/metallib resolution; both `52` open-question bullets are gone.
- REAL-002 and REAL-003 are true in their source docs and flipped to `resolved`.
- The iOS bundle-name + hosted-path resolution is device/build-confirmed on SDK 56
  (human gate), referencing U1-004 + U3-006 evidence rather than re-running it.
- `progress.md` reflects the closure and links the evidence.
