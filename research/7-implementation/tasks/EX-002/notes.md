# EX-002 — notes

## Unverified claims (need the device gate)

- The three deferred proofs in `evidence/device.md` — (a) multi-instance shared Metal context,
  (b) scroll perf on the mixed 100-cell list, (c) shader-less cells allocate no MTKView at scale —
  are all device-pending. Built and headless-green; none observed on a device yet.

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

Next: maintainer runs `evidence/device.md` (a)/(b)/(c) with agent-device on a physical iOS device + the POCO F1, then ticks `device-verified`.
