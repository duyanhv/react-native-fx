# DEF-014 — notes

## Unverified claims (need the device gate — physical iPhone, iOS 17+)

- The per-tile `.scrollTransition` fades/scales and rests at identity (row 1). Compiles + builds;
  the visual is unproven headless (the hosted renderer does not run headless).
- Zero per-frame JS while scrolling (row 2) and the mapping runs render-server under a JS stall
  (row 3) — argued by construction (`.scrollTransition` is native; only `axis` + tiles cross the
  bridge, once), not yet device-measured.
- The hosted `ScrollView` sizes through the auto-Host boundary and self-gestures (row 4).
- os<17 degrades to static, no crash (row 5).
- No regression to the shipped hosted effects (row 6).

Runbook: `evidence/device.md`.

## Changes

Manifest / select (headless-testable):
- `packages/src/manifest/manifest.ts` — added the `source` driver node: `kind:'driver'`,
  `interaction:'self'` (the hosted `ScrollView` self-gestures, rule #3), `phase:'v2'`,
  `properties:{opacity,scale}`. iOS rung `via:'native' ScrollView`, `applyVia:'.scrollTransition'`,
  `clock:'none'` (scroll is the clock — no perpetual loop, no `cadence`), `target:'effect'`,
  `requires{os:17,substrate:'hosted'}`. Android ladder empty → `{via:'none'}`.
- `select.ts` needed **no change** — the existing driver/target/os/empty-ladder logic selects the
  rung on iOS 17+ and degrades everywhere else.
- `config.ts` / `manifest/index.ts` — added the derived `SourceConfig` export (parity with
  `MotionConfig`; no catalog assertion needed).
- `__tests__/manifest-select.test.ts` — +4 source rung tests (iOS 17 select; <17 none; Android
  none; content-target none).
- `__tests__/manifest-conformance.test.ts` — +2 source node assertions (driver/self; one iOS rung
  + empty Android, os17/hosted/effect, `clock:'none'`, no `cadence`).

JS surface:
- `packages/src/source/{types,builders,index}.ts` — the source-driver vocabulary:
  `ScrollAxis`/`ScrollSourceSpec`/`SourceSpec` + `scroll({ axis })` (mirrors `fx.motion.*`).
- `packages/src/fx.ts` — `fx.source = { scroll }`.
- `packages/src/surface/FxScroll.tsx` — the provisional `Fx.Scroll` hosted scroll context
  (`source` + `tiles` props; defaults intensity 0.8 / height 220). Exposes `Fx = { Scroll }`.
- `packages/src/runtime/FxScrollView.tsx` (+ `.android.tsx` static fallback via `FxHostedView`,
  `.web.tsx` null) — the native binding.
- `packages/src/{index,surface/index}.ts` — public exports (`Fx`, `fx.source` types,
  `FxScrollProps`/`FxScrollTile`).

iOS native:
- `packages/ios/FxScrollView.swift` — `FxNativeView` host; persistent `UIHostingController`
  pattern diffed from `FxHostedView` (one controller, observed props holder); `FxScrollTile`
  Record (`effect`/`intensity`/`height`). a11y-hidden, clear background.
- `packages/ios/FxScrollRootView.swift` — `FxScrollRootView` (`ScrollView(axis)` + Lazy stack +
  per-tile effect dispatch + `.scrollLinked()` applying SwiftUI's own `.scrollTransition`
  fade+scale on iOS 17+, static below). `FxScrollProps` observable holder.
- `packages/ios/FxModule.swift` — registered `FxScrollView` (`axis`, `tiles` props; load/error
  events; snapshot; `OnViewDidUpdateProps`).

Example:
- `example/screens/source-scroll.tsx` — a vertical hosted scroll of eight fx tiles.
- `example/data/tasks.ts` (+`source-scroll` DemoScreen, DEF-014 row), `app/(tasks)/[taskId].tsx`
  (import + case).

## Surface-naming proposal (for the planner to ratify at review)

- `fx.source.scroll({ axis })` — keep. Mirrors `fx.motion.*`; agnostic, no mechanism leakage.
- `Fx.Scroll` — shipped as an `Fx` namespace object (`{ Scroll }`), used as `<Fx.Scroll>`. Open
  question for ratification: when the general `<Fx>` effect surface lands (DEF-004/effect chain),
  it becomes a callable component with attached statics that absorbs this `Scroll`. The namespace
  object is forward-compatible (a function can carry the same `.Scroll` property). Alternative if
  preferred: a standalone `FxScroll` export. The component is intentionally minimal — NOT the
  general `Fx.Stack` (DEF-004); it is the smallest container giving `.scrollTransition` a SwiftUI
  `ScrollView` ancestor.
- Tile model: `tiles` is a **data prop** of fx-owned effect descriptors, not RN children — live
  RN content cannot be scroll-linked without hosting it (rule #4). Per-tile `<Fx source=…>`
  binding can arrive with the general `<Fx>`; the V2 opener keeps the source binding
  container-scoped. Flag for ratification.

## Gotchas

- A babel-runtime helper (`slicedToArray`) does not resolve in this bun-hoisted `node_modules`
  layout, so **array destructuring in a Jest test that also imports a CJS builtin** (`node:fs`)
  fails the whole suite to load. Avoided it in the conformance test (`source.lower.ios[0]`, not
  `const [rung] = …`). Worth knowing for future test edits.
- `compileDebugKotlin` was **not run** — no Kotlin/Android-native source changed (the Android
  ladder is empty; the only Android-touching file is `FxScrollView.android.tsx`, a Metro-resolved
  TS fallback). Genuinely unaffected, not skipped.

## Review round 1 (2026-06-14) — fixes applied

- **Provenance leak (commented gate)** — stripped the 5 `(rule #N)` tags from shipped code
  (`manifest.ts`, `FxScroll.tsx` ×2, the two test comments), keeping the constraint prose. The
  Swift comments already stated the constraints without a rule number. Now zero `rule #` in
  shipped code; the "no provenance" claim is accurate.
- **Unfired events (nit)** — dropped `onFxLoad`/`onFxError` from `FxScrollView` (the
  `EventDispatcher`s + the `Events(...)` registration). They were dead surface; per-tile error
  reporting can be wired if/when per-tile config lands. The host now registers no events.
- Re-verified: tsc/lint/swift:lint/64 tests green; example `xcodebuild` **BUILD SUCCEEDED**
  (both edited Swift files recompiled clean).

## Next

Device gate on a physical iPhone (iOS 17+) per `evidence/device.md`; on PASS the planner
reconciles `02`/`40`/`50` + confirms `structure.ios.md` § `source`, ratifies the surface names,
writes `reviews/DEF-014.md`, and ticks through `merged`.

## 2026-06-14 — device run (agent-device): result blocked

Findings: the gate could not be exercised — the physical iPhone 14 (iOS 26.4.1, satisfies the
iOS 17+ floor) is reachable only over the lockdown/usbmux query path; its CoreDevice **tunnel is
unavailable**, so install/launch/automation all fail for Expo, `devicectl`, and agent-device
alike. Root cause is a stale CoreDevice record (`ecid_2854625264943134`) returning
`CoreDeviceError 1011`; bouncing the user-owned `CoreDeviceService` did not clear it. Recovery
needs maintainer action (unlock + replug + re-trust, or sudo-restart `remoted`/`usbmuxd`, or
clear the stale pairing in Xcode › Devices). All six rows are NOT-RUN (row 5 was already NOT-RUN:
no sub-17 device on hand). No DEF-014 surface was touched — `packages/` and
`example/screens/source-scroll.tsx` are clean; the signing config temporarily added to the
gitignored `ios/` prebuild was reverted. Evidence in `evidence/logs/`.

Next: maintainer restores the device connection, then re-runs the runbook (no ratification yet —
there is no passing evidence to ratify).

## 2026-06-14 — simulator smoke test (agent-device), per maintainer "skip physical this task"

Result: partial/pass — 5/6 rows PASS on an iPhone 17 simulator (iOS 26.x), row 5 NOT-RUN. This is
a non-authoritative smoke test, not the device gate (no `device-verified` tick).

Findings:
- **Shaders render on the simulator** (current Metal toolchain) — contradicts the runbook's
  "simulator does not render the curated stitchable shaders" premise. aurora/plasma/caustics/
  liquid-chrome/noise-field/fractal-clouds/ink-smoke + gradient fill all draw. The sim is more
  useful here than assumed; what it still can't prove is iPhone-14 (A15) GPU render/scroll
  performance.
- Row 1 PASS: edge fade+scale, centered tiles at identity (the fill tile's bowtie is the fill
  effect's own shape, confirmed against Comps → "fill · gradient").
- Row 2 PASS: Fx.Scroll exposes no scroll callback; 0 JS-console lines across 12 sustained swipes.
- Row 3 PASS (strong): under a ~75% JS-thread stall the scroll transition stayed live and the
  time-driven shaders kept animating — native frame loop confirmed.
- Row 4 PASS: hosted ScrollView fills its frame, full-width 240pt tiles, self-gestures.
- Row 5 NOT-RUN: no sub-17 runtime installed.
- Row 6 PASS: Comps glass/material + gradient fills unregressed.

Evidence under evidence/ (sim-*.png, sim-row1/row3 *.mp4, logs/sim-*.log). Example-side row-2/3
instrumentation reverted; tree clean apart from added evidence.

Earlier the same session the **physical iPhone gate was BLOCKED** — CoreDevice tunnel unavailable
(stale ecid record, error 1011); maintainer must restore the connection for the true hardware gate.

Next: maintainer decides whether the simulator smoke test suffices for now or holds the gate for
physical hardware; no ratification of `device-verified` yet.
