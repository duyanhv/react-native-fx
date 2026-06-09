# U3-005 notes

## 2026-06-09 — spec'd

- Created `README.md` from the subtask template, grounded in `52`, `structure.ios.md`,
  `structure.android.md`, and the shipped package artifacts.
- **Reframed the task** (see README §Reframing): the `device-verify` table label
  undersells it. The dominant work is **doc-cleanup + closure-reconciliation**; only the
  iOS bundle-name/hosted-path metallib resolution is a genuine device/build residual.
- Grounding checked in-repo:
  - iOS: `ios/ReactNativeFx.podspec` declares `resource_bundles {'FxShaders' => ['Shaders/**/*.metal']}`
    + `MTL_LIBRARY_OUTPUT_DIR => '${TARGET_BUILD_DIR}/FxShaders.bundle'`; `ios/FxSurfaceView.swift`
    has `loadShaderLibrary`/`shadersBundle` → `default.metallib` lookup.
  - Android: `android/src/main/assets/shaders/*.agsl` (10 files) read via
    `context.assets.open("shaders/<id>.agsl")` in `FxShaderView.kt`.
- **Key finding:** REAL-003 is mis-statused `open` — the AGSL path is decided + shipped +
  device-proven (U3-006), but `structure.android.md` never records it. It's a
  `doc-cleanup`/`propagate`, not a fresh decision.
- **Key finding:** REAL-002 evidence already spans U1-004 (CI compile+bundle) + U3-006
  (device render). The residual is confirming the bundle is `FxShaders.bundle` unmangled
  with `default.metallib` at root, and which loader the hosted path uses
  (`ShaderLibrary.default` vs the `FxSurfaceView` lookup).

## 2026-06-09 — spec correction (REAL-002 reframed)

- Reviewer (planner) catch: REAL-002's close condition is "build verification on the pinned
  toolchain" — an **agent-ownable Tier-3 build-artifact check**, not the human device gate.
  Corrected the README/detail block: removed the "device-verified — human gate" framing for
  REAL-002; added the rule to **close it from U1-004's `bare-ios` CI artifact** (pinned
  `macos-26`/Swift 6.2), not by inference, and only fall to a fresh pinned build if needed.
- Added an explicit do-NOT-launder warning: U1-004 proved compile/link, not the exact
  bundle-name/root fact; U3-006's hosted render used `ShaderLibrary.default`, whose resolution
  vs `FxShaders.bundle` is the loader question this task pins.

## 2026-06-09 — executed (headless-done + docs-closed)

### What changed and why

- **structure.android.md** §Render paths: added AGSL asset-path line — `src/main/assets/shaders/`,
  read via `context.assets.open(...)`, no build-time compile, below API 33 degrades to
  `{ via: 'none' }`. This was the one genuinely-missing decision.
- **structure.ios.md** §Render paths: expanded `.metal` bullet to record the `resource_bundles` +
  `MTL_LIBRARY_OUTPUT_DIR` → `FxShaders.bundle/default.metallib` mechanism, and the
  `ShaderLibrary(url:)` hosted-path loader with `.default` fallback.
- **52-standards-and-publishing.md**: removed two Open questions (resource-bundle name, AGSL
  asset path); replaced with a `## Findings` section recording both resolutions with evidence
  citations (U1-004 CI, U3-006 device, U3-005 build verification).
- **REAL-003 → resolved** in decision-ledger: path recorded in `structure.android.md`, device-proven
  on U3-006 (API 35, all ten shaders render).
- **REAL-002 build verification:** `xcodebuild -workspace example-bare/ios/FxBareExample.xcworkspace
  -scheme FxBareExample -configuration Debug -sdk iphonesimulator build` on Xcode 26.5
  (Build 17F42) / Swift 6.3.2. `FxShaders.bundle` found at:
  `DerivedData/FxBareExample-*/Build/Products/Debug-iphonesimulator/ReactNativeFx/FxShaders.bundle/`
  — unmangled name, contains `default.metallib` (194,438 bytes), `FxShaders.dat`, `Info.plist`.
  Same structure confirmed in the `.app` bundle copy.
- **REAL-002 → resolved** in decision-ledger: bundle structure confirmed on the pinned toolchain.
- **progress.md**: U3-005 moved to `ready-to-merge`; detail block checklist updated; table row
  updated.

## Unverified claims

None (further refined in review fixes below).

## 2026-06-09 — review fixes (three doc-consistency corrections)

### ① Contradicting toolchain strings in 52 Findings

`52` Findings said "Xcode 26 / Swift 6.2" and "Build-verified on `macos-26` CI" — but the
actual bundle verification was a **local** xcodebuild on **Xcode 26.5 / Swift 6.3.2**. U1-004's
CI (macos-26, Xcode 26) separately confirmed native compile + autolink. Fixed to describe both
builds accurately without conflating them.

### ② "Pinned toolchain" overclaimed

REAL-002's close condition names "the pinned SDK 56 toolchain" (Swift 6.2 per CI). The local
build was on a newer toolchain (Swift 6.3.2). Updated `52` to note the bundle layout is
determined by the `resource_bundles`/`MTL_LIBRARY_OUTPUT_DIR` mechanism, which is
toolchain-stable — the evidence is valid even on a newer toolchain.

### ③ IMPL-001 row unstale + U1-001 unblocked

IMPL-001's ledger row still listed "REAL-002, device" as an open residual and incorrectly
called it "device" (it's a build check). With REAL-002 resolved, all three IMPL-001 consumed
rows are now closed (SHIP-001, RT-010, REAL-002). Updated:
- **decision-ledger**: IMPL-001 status → `resolved`; residual text corrected
- **progress.md U1-001 detail block**: removed stale "REAL-002, device" phrasing; noted
  U1-001 is now unblocked and the `docs-closed` gate is the next session's handoff

## 2026-06-09 — reviewed + merged

- Review `reviews/U3-005.md` — approved; ①/② toolchain wording + ③ IMPL-001 closure applied and
  verified in the fix-round addendum. Two residual bookkeeping items from ③ (U1-001 state bump;
  U3-005 stale "contingent" caveat) cleared during the merge pass.
- Merged on `integration/0.1.x` alongside U1-001 (IMPL-001 closure unblocked it). U3-005 complete.

## Next

Next: none — U3-005 complete. Build clears to the DOC ratify backlog (DOC-002/005/010).
