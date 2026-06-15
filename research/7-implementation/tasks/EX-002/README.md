# EX-002 — 100-cell mixed-effect stress list

harness · type: `implement` · state: `device-pending` · device: `yes`
Consumes: — · Closes: — (critique-routed F14, no ledger row) · Blocked by: —

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **The device scenario** — `evidence/device.md` (the standing run the maintainer drives with agent-device).

## Authority links

```
Subtask: 100-cell mixed-effect stress list (harness — critique F14)
- Contract anchors:  structure.ios.md §Lifecycle (the lazy MTKView + process-shared
                     device/queue/library/pipeline-cache mechanic this screen exercises at
                     scale); U4-003 (the rework that landed it — its evidence/device.md §"Not
                     separately exercised" explicitly defers the multi-instance shared-context
                     proof to this screen). The F1/F2 critique costs (per-instance Metal,
                     scroll-time allocation) become measured here rather than theoretical.
- Decision:          critique F14, maintainer-accepted — build a standing device-verify scenario,
                     not a throwaway. JS-only (a new example screen + its registration). No
                     packages/ native change: if the screen needs a native change to render, STOP
                     and flag it — the runtime is already shipped.
- Reference (HOW):   the sibling example screens — content-motion.tsx (FxSurfaceView wrapping a
                     child, no shader), shader-catalog.tsx (the ten shader ids), fill-material.tsx
                     (FxHostedView fill + the material-over-content stack); (tasks)/index.tsx (the
                     FlatList + Link card idiom). Match them; do not invent a new layout system.
- Guides:            Code Style + Code Comments (the screen); Device Verification (the scenario);
                     Contributing (merge bar). No headless test tier — example screens are
                     device-proven, not unit-tested (Testing Guide §Tier-3 build only).
- Rules gate:        #1 (native owns the frame loop — scrolling N shader surfaces must push
                     nothing per-frame across the bridge); #3 (two substrates — the screen mixes
                     hosted FxHostedView + expo-view FxSurfaceView, the only two); #9 (reads
                     layout, never writes it — the cells are plain RN layout).
- Device-verify:     the three deferred proofs (a) multi-instance shared Metal context — N shader
                     surfaces, one process-wide pipeline cache, no per-instance device/queue;
                     (b) scroll perf on the mixed list; (c) shader-less cells allocate no MTKView
                     at list scale. Scenario in evidence/device.md.
- Done when:         the screen renders the four cell kinds, headless gates green (example tsc),
                     and evidence/device.md carries the standing scenario for the human gate.
```

## What was built

A new example screen, `example/screens/stress-list.tsx` (`StressListScreen`), wired as task
`EX-002` (`data/tasks.ts` + the `(tasks)/[taskId].tsx` dispatch, `screen: "stress-list"`). A
virtualized `FlatList` of `CELL_COUNT = 100` cells, deterministic (no randomness — reproducible
cell-for-cell), cycling four kinds by `index % 4`:

| kind | substrate | what it exercises |
|---|---|---|
| `shader` | `FxSurfaceView shader={id}` (expo-view) | the lazy MTKView + shared Metal context; shader ids cycle so the pipeline cache holds several keys and most recur |
| `fill` | `FxHostedView effect="fill"` (hosted) | the decorative hosted path alongside |
| `material` | `FxHostedView effect="material"` over a color backing (hosted) | iOS glass-over-content at scale (Android renders its own-content path) |
| `motion` | `FxSurfaceView` wrapping content, **no** shader (expo-view) | the content-motion-only wrapper — must allocate **no** MTKView |

Each cell carries a caption (`#index · kind · shader`) so a device run's screenshots and the
U4-003 allocation log line up cell-for-cell.

## Proof

- headless: `bunx tsc --noEmit` from `example/` (green). Example screens carry no unit tier
  (effects do not run headless) — the proof is the device scenario.
- device: `evidence/device.md` — the standing scenario (a/b/c above). The human gate.
- docs: none — critique-routed, no ledger row, no source-doc decision.
