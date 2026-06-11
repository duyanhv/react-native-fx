# EX-002 — notes

## 2026-06-11 — device-gate session (agent-device) · evidence written, awaiting ratification

- iOS leg on iPhone 17 Pro sim (iOS 26.5, Metal). Added the U4-003 log-only instrumentation to
  `packages/ios/FxSurfaceView.swift` (3 × `NSLog("[FXINSTR] …")`: static device/queue init,
  `ensureEffectSurface()` MTKView alloc, pipeline-cache-miss compile), drove launch → EX-002 →
  full list traversal, read the log, then **reverted** it — `git diff` on `packages/` empty,
  `swift:lint` + `bun run lint` green.
- **(a) shared Metal context — PASS:** 1 `MTLDevice` + 1 `MTLCommandQueue` for the whole process;
  5 pipeline compiles = the 5 distinct iOS raster ids, each once; repeat-id cells reuse the cached
  pipeline with no recompile.
- **(c) zero MTKView for motion cells — PASS:** 28 allocations over the traversal, all from shader
  cells via `ensureEffectSurface`; motion-only cells never allocate.
- **(b) scroll perf — PASS on Android hardware** (POCO F1: 59.8 fps, 0 stutters (4+), ~0.4–2.6%
  dropped) / **partial on iOS sim** (Apple fps tooling unavailable on simulators).
- **a11y — PASS** both platforms (decorative surfaces inert/unlabeled, motion content reachable).
- Results in `evidence/device.md`; artifacts `ios-fxinstr-device-log.txt`, `ios-stress-list-*.png`,
  `ios-a11y-tree.txt`, `android-stress-list-*.png`, `android-a11y-tree.txt`.
- **Finding (flagged, pre-existing — not an EX-002 defect):** Android expo-view shader cells render
  blank — `FxSurfaceView.kt updateEffectSurfaceVisibility()` is a TODO that attaches no render
  surface; the Android interactive (expo-view) shader renderer is unimplemented (the hosted
  `FxShaderView.kt` path does render). The scenario doc's "Android … shader cells via AGSL" claim is
  inaccurate (flagged in `device.md`). On iOS the 5 non-raster ids are blank by design (5-id subset).
- `device-verified` / `merged` NOT ticked — left for the maintainer.

## Unverified claims (need the device gate)

- The three deferred proofs in `evidence/device.md` — (a) multi-instance shared Metal context,
  (b) scroll perf on the mixed 100-cell list, (c) shader-less cells allocate no MTKView at scale —
  are all device-pending. Built and headless-green; none observed on a device yet.
  **[2026-06-11: (a)/(c)/a11y now observed PASS on device; (b) PASS on Android hardware / partial on
  iOS sim — see the session section above. Still awaiting maintainer ratification.]**

## Changes

- **New screen** `example/screens/stress-list.tsx` (`StressListScreen`): a virtualized `FlatList`
  of 100 deterministic cells cycling four kinds by `index % 4` — `shader` (`FxSurfaceView shader=`,
  the expo-view Metal path), `fill` / `material` (`FxHostedView`, the hosted path), and `motion`
  (`FxSurfaceView` wrapping content, no shader → no MTKView). Shader cells cycle the ten curated
  ids so the pipeline cache holds several keys with repeats. Each cell captions its kind (+ shader
  id) for cell-for-cell device correlation.
- **Registration:** added `"stress-list"` to the `DemoScreen` union and an `EX-002` `TASKS` entry
  in `example/data/tasks.ts`; imported `StressListScreen` and added its `case` to the `renderDemo`
  switch in `example/app/(tasks)/[taskId].tsx`. Matches the existing screen-registration idiom.
- **Task folder:** `README.md` (work order + authority links) and `evidence/device.md` (the
  standing scenario) created.

## Decisions / rationale

- **Shader cells use `FxSurfaceView`, not `FxHostedView`.** The U4-003 lazy-MTKView + shared
  static Metal context lives in `FxSurfaceView.swift` (the expo-view substrate). Proofs (a)/(c)
  target that code path, so shader cells must be `FxSurfaceView shader={id}`. `FxHostedView` runs
  the separate hosted Metal path and is used for the fill/material cells (its own decorative lane).
- **Virtualized `FlatList`, not a fully-mounted `ScrollView`.** A real 100-cell feed virtualizes;
  this makes (b) an honest scroll-perf measurement and (a)/(c) exercise mount/unmount churn against
  the process-lived shared context — exactly the stress U4-003 deferred here. Matches
  `(tasks)/index.tsx`.
- **No native touched.** JS-only, as the task scoped. The runtime is shipped; the screen only
  drives it.
- **`StyleSheet.absoluteFillObject` unavailable** in this RN version's types — used explicit
  `position:"absolute"` + edges for the material backing.

## Verification

- `bunx tsc --noEmit` from `example/` — green. Example is not under Biome (config scopes to
  `packages/src`; no example lint script); the new file uses tab indentation matching the sibling
  screens. `packages/` untouched this half — its gates stayed green from U1-006.

Next: maintainer reviews `evidence/device.md` (a)/(c)/a11y PASS + Android (b) PASS, ratifies `device-verified` (optionally re-running (b) on a physical iPhone for an iOS fps number), and routes the Android expo-view shader-renderer gap to a follow-up task.
