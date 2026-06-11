# U4-003 — notes

## Device run — 2026-06-11 — PASS (awaiting maintainer's device-verified tick)

Driven on an iOS 26 sim (iPhone 17 Pro) via agent-device, on a log-only-instrumented build
(reverted after; committed code compiles/lints identically). Full write-up + log + screenshots
in `evidence/device.md` §Results. Headline: **exactly one `MTKView` allocation across the whole
session**, only when a shader first became active.

- §1 zero GPU for content-motion-only — **PASS** (mount: `metalViewExists=0`, no alloc log).
- Functional child mount + hit-test on the GPU-free surface — **PASS** (`count: 0 → 2`).
- §2 lazy first activation renders — **PASS** (one alloc on `shader=loop`; `loop` rendered, not blank).
- §3 no re-allocation on reuse — **PASS** (later applies: `metalViewExists=1`, no further alloc).
  Multi-instance shared-context proper wants EX-002; single-instance reuse shown.
- §4 isolated teardown / re-mount — **PASS** (back→unmount no crash; re-enter = fresh instance, 0 alloc).
- §5 a11y — observed (the `MTKView` never appeared as its own a11y element; only the child did).

Pre-existing, non-U4-003 nuance noted: `shader` → `undefined` doesn't reset the native shader
(Expo omits the prop). Orthogonal to lazy/shared Metal; parked next to the U2-003 event wiring.

## What changed

- `packages/ios/FxSurfaceView.swift` — the only source change:
  - **Lazy Metal.** `init` no longer calls `setUpMetal()`; it sets up the intermediate
    container only. The `MTKView` is built on first need by `ensureEffectSurface()`, called
    from `updateEffectSurfaceVisibility()` when a shader becomes active. `metalView` is now
    `MTKView?`. A no-shader surface builds no GPU view.
  - **Shared static Metal context.** `device`/`commandQueue`/`library`/`pipelineCache` moved
    from per-instance to `private static` (`sharedDevice`, `sharedCommandQueue`,
    `sharedLibrary`, `pipelineCache`) plus a `colorPixelFormat` constant. `pipeline(for:)`,
    `loadSharedLibrary`/`sharedBundle` are now static. `draw(in:)` uses `Self.sharedCommandQueue`
    / `Self.pipeline(...)`. The context is process-lived; `deinit`/`tearDownMetal` release only
    the per-view `MTKView`.
  - Z-order preserved: `ensureEffectSurface` adds the `MTKView` after the container (in front),
    matching the old eager `bringSubviewToFront`.
- `research/5-realization/structure.ios.md` §Lifecycle — pinned the lazy-effect-surface +
  process-shared-Metal-context mechanic (the prior "tear down the MTKView, pipeline" wording
  was stale once the pipeline/library/device became process-lived).
- No JS/TS change. No public API, prop, event, or child-routing change.

## Environment note (not a code change)

- The example's `ios/Pods/Pods.xcodeproj` was **stale** — it predated `FxHostedRootView.swift`
  and `FxGlassSurfaceView.swift` (0 refs each), so the first `xcodebuild` failed with
  "cannot find FxHostedProps/FxHostedRootView/MaterialConfig" in `FxHostedView.swift` —
  unrelated to U4-003. Re-ran `pod install` (CocoaPods re-globs `source_files`); both files
  now have refs and the build succeeds. The next iOS session should `pod install` if it hits
  the same phantom missing-type errors. (`Pods/` is gitignored — no repo change.)

## Android

No change. `FxSurfaceView.kt` is a pure `FrameLayout` shell with no GPU resources; F2/F11's
per-instance Metal cost is iOS-only. The cadence half of F11 is out of scope (split to U2-003).

## Headless proof (all green)

- From `packages/`: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
  `bun run test` (26 pass). `git diff --check` clean.
- Native: `xcodebuild` (Debug, iphonesimulator, Xcode 26.5) on `reactnativefxexample` →
  **BUILD SUCCEEDED**.

Next: maintainer runs the iOS device scenario in `evidence/device.md` (GPU-capture the
no-shader surface to confirm zero allocation), then review.
