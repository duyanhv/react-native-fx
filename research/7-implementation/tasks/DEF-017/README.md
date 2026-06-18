# DEF-017 · simulator smoke lane (CI lane removed; local harness retained)

6-ship · type: `implement` · state: `resolved` (CI lane removed; harness kept local) · device: no
Consumes: — · Closes: — (critique-routed F16, no ledger row) · Blocked by: —

> **Disposition change (2026-06-18) — the CI lane was removed; the harness lives on locally.**
> The `ios-smoke` job shipped (`78176af`) and was reviewed, but its first hosted runs exposed
> the real cost: a ~15-minute `macos-26` job (billed at ~10× the Linux rate) running on every
> PR/push to `main` to guard 10 V1-frozen, rarely-changing curated shaders. The maintainer
> judged the recurring spend not worth it for a regression class that changes only when the
> catalog does. **The CI job was deleted; `example/scripts/smoke-shader-catalog.ts` + the
> `smoke:ios` script are kept** as an on-demand local check — run `cd example && bun run
> smoke:ios` before touching the curated shaders. Device stays the gate for feel/touch/springs.
> The original CI-lane spec below is retained as the historical record of what was built.

## Start here (cold-start)

A fresh session: read in order, then construct.

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides** (binding — read the one for the gate you are on):
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - (`device-verified` → N/A this task — the lane *is* the headless proof)
4. **Contract + Reference** — below.

## Authority links

```
Subtask: simulator smoke lane in CI (critique F16, post-V1 ship hygiene)
- Contract anchors:  critique F16 (research/wip/critique-2026-06-10.md — the F16 disposition:
                     "a simulator smoke lane (mount each catalog id, screenshot, diff) would
                     catch the U3-006 blank-on-switch class without device sessions"); the
                     U3-006 regression itself (tasks/U3-006/notes.md § Post-review fixes #4 —
                     switching shaders / changing intensity blanked the preview via a 0×0
                     remount + clock reset). The catalog source of truth is CURATED_SHADER_IDS
                     (packages/src/effects/catalog.ts).
- Decision:          use the repo's existing sim driver (agent-device — already the device-test
                     tool) + extend the existing .github/workflows/ci.yml with ONE new job.
                     The smoke harness is fx-original. REJECT: golden-image pixel diffing
                     (brittle for animated shaders — assert non-blank, not equality); a new
                     screenshot/diff dependency (agent-device + a variance check suffice); an
                     Android smoke job (the Android lib is still a build scaffold — no
                     assembleDebug in CI yet; deferred WITH this reason, see Scope OUT).
- Reference (HOW):   .github/workflows/ci.yml § bare-ios (the macos-26 runner + the
                     -downloadComponent MetalToolchain step + the xcodebuild -sdk
                     iphonesimulator pattern — copy this build shape); U1-004 (the CI-lane
                     precedent, tasks/U1-004-bare-fabric-example-ci); the agent-device skill
                     (boot / install / launch / navigate / screenshot a simulator headlessly).
                     Diff the actual agent-device CLI surface before wiring it — name nothing
                     unverified.
- Guides:            Testing Guide (headless-done — what a real gate is); Code Style + Code
                     Comments (the harness code + the yaml); Contributing Guide (the per-platform
                     commands + the merge bar); Writing Style (docs-close).
- Rules gate:        no rule writes per-frame from JS / hosts content / etc. here — this is CI
                     infra. The one live rule is #6 (iOS/Android peers): Android is NOT dropped,
                     it is deferred with a stated reason (the lib doesn't yet configure), exactly
                     as ci.yml already defers the Android native compile.
- Device-verify:     none — the entire point is to catch the regression class WITHOUT device
                     sessions. The lane runs on a CI simulator (Apple-silicon sims run Metal +
                     SwiftUI). Device remains the gate for feel/touch/springs, untouched.
- Done when:         a CI job mounts every CURATED_SHADER_ID via the catalog switch, asserts
                     each renders non-blank, and FAILS if a blank-on-switch regression returns;
                     green on the pinned SDK 56 / RN 0.85 / macos-26 toolchain; wired into
                     ci.yml.
```

## Why this task exists

U3-006 shipped a real blank-on-switch bug once (tasks/U3-006/notes.md § fix #4): switching the
shader — or dragging `intensity` — blanked the preview box, because each remount briefly sized
the new child 0×0 and reset the native clock. It was fixed and device-verified, but nothing
guards the regression *class* headlessly: today it would only resurface in a manual device
session. F16 (LOW, deferred to DEF-017 at the 2026-06-10 critique) is the cheap net — a
simulator lane that exercises the switch path on every catalog id every CI run, so the class
can't silently return between device gates.

## Scope — IN / OUT

**IN:**
- One new `ci.yml` job (an iOS simulator smoke lane) that, on the Apple-silicon `macos-26`
  runner: builds the **`example`** app for the simulator, boots a sim, installs + launches it,
  navigates to the shader catalog (the `shaders` demo screen — reachable via the U3-006 task
  tile or a router deep-link), then **iterates `CURATED_SHADER_IDS`** (the source-of-truth
  list, not a hardcoded copy), switching the picker to each, screenshotting, and asserting the
  surface region is **non-blank**.
- The switch sequence is the regression-specific part: mount the first id, then **switch to
  each remaining id** and assert no blank frame persists (the U3-006 failure was on *switch* +
  on an `intensity` change — exercise both if cheap).
- A small, readable harness (a bun/node script under `example/`) that drives agent-device and
  carries the non-blank assertion; the yaml job just runs it.

**OUT (explicitly):**
- **No Android smoke job yet** — `packages/android` is still a build scaffold that doesn't
  configure (the same reason ci.yml skips the Android `assembleDebug`); a Android smoke lane
  belongs with the Android build-readiness work. Note it in the yaml comment so it reads as
  *deferred*, not *forgotten* (rule #6).
- **No golden-image / pixel-exact diffing** — animated GPU shaders never match frame-to-frame;
  the assertion is "rendered something" (pixel variance / not-a-flat-color over the surface
  region), not equality. A golden baseline would be a flake factory.
- **No feel / touch / spring / timing verification** — those stay the device gate. This lane is
  a blank-frame regression net, nothing more.
- **No new screenshot/diff/image dependency** — agent-device (already in the toolchain) plus a
  few lines of variance check cover it.

## Design (the lazy-correct shape — confirm against the tools, don't over-build)

- Reuse the `bare-ios` build recipe verbatim where it fits: `macos-26`, `setup-bun`,
  `-downloadComponent MetalToolchain` (continue-on-error), `xcodebuild -sdk iphonesimulator`.
  The difference is the target (`example`, not `example-bare`) and that this job *runs* the
  app, not just builds it.
- Drive the sim with agent-device (boot / install / launch / navigate / screenshot) — it is the
  repo's existing simulator+device driver, so this is rung-4 (an installed dependency), not new
  infra. Diff its actual CLI/API surface first.
- Non-blank assertion: capture the surface region and reject a frame whose pixels are
  effectively uniform (a single flat colour = the blank box). Tune the variance threshold on the
  known-good catalog; leave the threshold as a named constant (a CI runner's GPU output is not
  bit-identical to a dev machine's — the knob is expected, not a smell).
- Iterate `CURATED_SHADER_IDS` imported from the source of truth so a new shader is covered the
  day it lands, with zero test edits. (Bonus, only if free: assert the example screen's local
  `SHADER_IDS` equals `CURATED_SHADER_IDS` — but don't gold-plate.)

## Proof

```
Proof:
- headless: the new ci.yml job is green on the pinned toolchain — it mounts every
            CURATED_SHADER_ID via the catalog switch and asserts each renders non-blank;
            a deliberately-reintroduced 0×0-remount blank (or an empty-frame stub) makes
            the job RED (prove the net actually catches the class, don't just prove green).
- device:   N/A — the lane exists to avoid device sessions; device stays the feel/touch gate.
- docs:     critique F16 disposition marked done (research/wip/critique-2026-06-10.md routes
            F16 → DEF-017); progress.md DEF-017 row flipped blocked → done. No ledger row.
```

## Lifecycle checklist

- [x] spec'd (this file)
- [x] rules-gated (#6 — Android deferred with a stated reason in the `bare-android` ci.yml comment, not dropped)
- [x] implemented (the `ios-smoke` ci.yml job + `example/scripts/smoke-shader-catalog.ts`)
- [x] commented
- [x] headless-done (green on the full catalog + red-on-regression proven; see § Executor run)
- [x] device-verified (N/A — headless CI lane)
- [x] reviewed (planner, 2026-06-18 — gates re-run independently green; tree clean, RED stub + testID wrapper confirmed reverted/behavior-neutral; harness + ci.yml read line-by-line; two minor notes fixed. Residual: the first GitHub-hosted run is the remaining proof the hosted-VM sim GPU-renders Metal.)
- [x] docs-closed (F16 disposition reconciled in `critique-2026-06-10.md`; progress.md row updated)
- [x] resolved (2026-06-18 — the CI lane was removed before it ever ran green on a hosted runner; the local harness is retained. The two hosted-CI bring-up fixes, `da2672b` prebuild + `10bf282` boot-timeout, were committed during diagnosis: the prebuild step went away with the job; the harness boot-timeout change stays and is harmless for the fast local boot. The earlier "first hosted run GPU-renders Metal" residual is now moot — no hosted run will fire.)

## Executor run (2026-06-18)

Ran locally on a booted iPhone 17 Pro simulator (iOS 26, agent-device 0.17.1 — the
CI-pinned version), against a Release build of the `example` app.

Headless gates (all green): packages `tsc`, `build`, `lint` (37 files), `test` (89);
`example` `tsc`. The smoke harness lives in `example/scripts/` — outside the packages
biome scope and the example tsconfig (`scripts` excluded), so no configured linter/tsc
covers it; it is a bun-run CI script, verified by running end-to-end.

Net proven both ways:
- GREEN — all 10 `CURATED_SHADER_IDS` render non-blank via the picker switch sequence
  (variance ~680–5860, threshold 120).
- RED — a blank-frame stub (FxHostedView removed, flat box) rebuilt into the Release app
  fails the lane on the first id (variance 0.0 ≤ 120, exit 1); reverted after.

Defects found and fixed while wiring against the real agent-device CLI (the spec's "diff
before wiring — name nothing unverified"):
- Navigation: pressing `label="U3-006"` cannot work — that tile is far down a scrollable
  list and its accessibility label is the full composite cell string. Switched to a deep
  link (`<bundle-id>://U3-006`). The URL scheme equals the bundle id because that is what
  the committed `ios/` prebuild registers in Info.plist (not the `app.json` `rnfxexample`).
- Surface rect lived at `data.node.rect`, not `data.rect` — the original path always
  returned null and aborted the run.
- `sips` writes a top-down BMP (negative height); the variance loop assumed bottom-up, so
  the crop collapsed to zero rows and every shader read as variance 0.0.
- Added `prepare ios-runner` before the first selector query (the workflow help mandates
  it for Apple CI) and dropped the unused `SMOKE_BUILD_CONFIG` env from the ci.yml job.

Only CI can exercise: the cold macos-26 runner path (fresh `pod install` + `xcodebuild`
Release + `prepare ios-runner` building the XCTest helper from scratch). The drive +
assert path is what ran locally.
