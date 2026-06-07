# U1-004 · bare Fabric example in CI

Unit 1 · type: `implement` · state: `in-progress` · device: no
Consumes: — · Closes: SHIP-003 · Blocked by: U1-001

> **Next action (resume here):** implement a literal bare/Fabric install check, not a
> managed CNG proxy. Keep the proof headless: CI must prove Expo Modules autolinking
> on iOS and Android, then compile at least one native target. U1-003 owns runtime/device
> observations.

The package scaffold exists, but the bare install path can still rot if only the library
package builds or the managed CNG harness prebuilds. This task wires a bare React Native
+ Fabric fixture into CI so the `install-expo-modules` path, package shape, Expo Modules
autolinking, and native project generation stay exercised on the pinned SDK 56 / RN 0.85
toolchain.

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
   - (`device-verified` → N/A this task)
4. **Contract + Reference** — below.

## Authority links

```
Subtask: bare Fabric example in CI (blueprint Unit 1 shipping/install gate)
- Contract anchors:  53 (install, no config plugin, SDK 56 / RN 0.85 / New Arch floor),
                     52 (workspace shape: packages/ publishable library + example/ dev harness),
                     51 (Expo Modules boundary that the example must autolink).
- Decision:          use Expo Modules autolinking through the literal bare install path:
                     a bare RN fixture runs install-expo-modules, consumes packages/
                     as react-native-fx, resolves iOS + Android links, and compiles at
                     least one native target. No config plugin in V1.
                     The fixture proves install/build plumbing, not effect pixels.
- Reference (HOW):   current example/ app is only the dev harness and U1-003 runtime
                     vehicle. For SHIP-003, create or generate a bare fixture that
                     exercises the bare install path from 53. Use generated native
                     artifacts as assertions: iOS Podfile/Podfile.lock and Android
                     settings.gradle / Gradle project wiring. REJECT: managed CNG
                     prebuild as the sole proof; REJECT: native project mutations that
                     would imply a config plugin.
- Guides:            Code Style Guide (implemented); Code Comments Guide (commented);
                     Testing Guide (headless-done); Writing Style Guide (docs-closed);
                     Contributing Guide (reviewed/merged).
- Rules gate:        #7 (Expo Modules + Fabric only — no JSI/C++ boundary);
                     #1 (no per-frame JS); #5 (do not introduce UI-kit components);
                     #6 (iOS and Android stay peers); #9 (the example reads/builds,
                     it does not create layout-writing presentation behavior).
- Device-verify:     none. CI/headless build only. U1-003 runs device verification after
                     this task supplies the runnable app.
- Done when:         a greenfield CI workflow creates/checks the bare/Fabric fixture;
                     CI resolves links on both platforms, compiles at least one native
                     target, and SHIP-003 is true in 53 and the decision ledger.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [ ] implemented
- [ ] commented
- [ ] headless-done
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

`device-verified`: N/A — this task proves install/build plumbing only.

## Proof

- **headless:** package build and lint still pass; CI creates/checks a bare RN + Fabric
  fixture with Expo Modules installed, verifies iOS and Android autolinking artifacts, and
  compiles at least one native target. Preferred rung: Linux validates Android link
  resolution and runs the Android compile/assemble check; macOS validates iOS link
  resolution with `pod install` / Podfile.lock assertions. A full iOS compile is optional
  unless CI cost permits it.
- **device:** N/A. U1-003 uses the resulting runnable app for SDK boundary observations.
- **docs:** `53` open question "Bare + Fabric CI" resolved; decision-ledger SHIP-003 closed.
  Also: the `apple.podspecPath` addition to `packages/expo-module.config.json` (the autolink fix
  this task uncovered) recorded in the implementation/package row it belongs to (IMPL-001 / RT-010
  area), since it changes the shipped library's self-description — not just the fixture.

## Work

1. **Create the CI workflow.** There is no repository CI yet. Add the workflow, runner
   matrix, toolchain setup, cache choices, and package-manager commands from scratch.
2. **Define the bare fixture.** Add a checked-in bare fixture or generate one deterministically
   in CI. It must use RN 0.85 / SDK 56, New Architecture/Fabric, `install-expo-modules`,
   and a local dependency on `react-native-fx`.
3. **Keep managed `example/` separate.** The current `example/` app is a managed CNG dev
   harness and U1-003 device vehicle. It is not sufficient by itself for SHIP-003.
4. **Prove iOS autolinking.** The check must fail unless the generated iOS native project
   includes the package's pod/module wiring in real artifacts, for example `Podfile`,
   `Podfile.lock`, or generated Expo modules provider files. Assert actual package/module
   names from the generated files, not a guessed `ReactNativeFx` string.
5. **Prove Android autolinking.** The check must fail unless Android generated artifacts
   include the package's Gradle/project wiring, for example `settings.gradle`,
   generated Expo modules package lists, or the app Gradle dependency graph. Assert actual
   package/module identifiers from the generated files.
6. **Compile at least one native target.** Link resolution on both platforms is mandatory.
   A native compile/assemble check is mandatory for at least one platform so the install
   path proves more than file generation. Prefer Android compile on Linux for cost; add
   iOS compile on macOS only if the runner budget allows it.
7. **Keep the screen minimal.** The bare fixture may render a scaffold screen. Do not add
   public `react-native-fx` API exports to make the screen interesting.
8. **Document the exact proof.** Update this task, `progress.md`, `53`, and the ledger with
   the commands, generated artifacts asserted, runner matrix, and observed result.

## Scope guard

- Does NOT close RT-010, RT-011, RT-004, SURF-010, REAL-002, or any renderer/device row.
- Does NOT build hosted effects, content motion, or press behavior.
- Does NOT use managed CNG prebuild as the only proof of SHIP-003.
- Does NOT add a config plugin or mutate consumer native projects beyond the documented
  bare RN + Expo Modules install path.
- Does NOT expand the public API surface.

## Done when

- A CI workflow exists and includes the literal bare/Fabric install/build check.
- The command is runnable from a clean checkout with the repo's package manager.
- iOS and Android generated artifacts prove `react-native-fx` autolinks through Expo
  Modules on both platforms.
- At least one native target compiles in CI.
- `53` no longer lists "Bare + Fabric CI" as open.
- SHIP-003 is `resolved` in `decision-ledger.md`.
- The `apple.podspecPath` library-config change is recorded in its owning implementation/package
  ledger row (IMPL-001 / RT-010 area) before docs-close — it is a package self-description change,
  not fixture-only.
