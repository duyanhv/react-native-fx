# U1-004 notes

## Unverified claims

- The CI workflow's bare-fixture jobs are authored from locally-verified commands but have not
  run on GitHub Actions yet. The **iOS** build + autolink + compile is proven locally; the
  **Android** `assembleDebug` job follows the proven Reanimated shape + a locally-verified
  autolink resolve, but its first real CI run still needs to be watched.
- SHIP-003 stays open until the CI runs green and `53` records the decision.

## What changed and why

- **Spec'd / scope pinned / rules-gated** — task created from the subtask template; stays on
  Expo Modules autolinking, no config plugin, iOS+Android peers, no public API expansion.
- **Audit response (2026-06-07)** — re-aimed at the literal bare install path required by `53`,
  not the managed CNG `example/` proxy.

### Bare fixture built + verified locally (2026-06-07)

- **`example-bare/`** — a literal bare RN 0.85.3 / New-Arch app (committed `ios/` + `android/`),
  on **bun**, created via `@react-native-community/cli init`. Kept separate from the managed
  `example/`. Expo Modules added through the doc-`53` bare path (`install-expo-modules`).
  `react-native-fx` linked as `file:../packages`.
- **Both platforms autolink fx** — iOS proven by `Podfile.lock` containing `ReactNativeFx (0.1.0)`
  (87 pods); Android proven by the in-tree expo autolink resolver
  (`sourceDir …/node_modules/react-native-fx/android`, module `expo.modules.reactnativefx.FxModule`).
- **iOS native compile: BUILD SUCCEEDED, 0 errors.** `FxBareExample.app` built for the simulator;
  fx's Swift compiled and the `ReactNativeFx` framework linked; **`FxShaders.metal` compiled into
  `default.metallib`, bundled at `FxBareExample.app/FxShaders.bundle/default.metallib`**. This
  clears the spec's mandatory "compile at least one native target".

### Bug found + fixed (library change)

- **`react-native-fx: file:../packages` silently failed to autolink on iOS under bun.** Root cause:
  bun's `file:` install **file-level-symlinks** every file in the package; Expo's podspec scanner
  (`listFilesInDirectories`, filters `isFile()`) skips symlinks, so the podspec was invisible → no
  pod. (Config discovery still worked because reading a known path follows symlinks.)
- **Fix:** declared `apple.podspecPath: "ios/ReactNativeFx.podspec"` in
  `packages/expo-module.config.json`. Expo's `findPodspecFiles` returns the declared path directly
  and **skips the directory scan**, so autolinking works regardless of install method (bun `file:`,
  npm/yarn symlink, tarball, registry). This is a **real library improvement**, not a fixture-only
  workaround — every consumer benefits. The iOS compile above is its build-proof.
- **Note for the ledger:** this touches the shipped library's self-description; relates to the
  package-identity work (IMPL-001 / RT-010 area). Should be recorded as a library config change.

### Xcode 26 / Metal toolchain (CI-relevant)

- On Xcode 26+, the Metal compiler is a separately-downloaded component. The first build failed with
  `cannot execute tool 'metal' due to missing Metal Toolchain`. Fixed by
  `xcodebuild -downloadComponent MetalToolchain` (≈688 MB), then the build went green. **macOS CI
  runners building fx must run this step before any `.metal` compile.** Android avoids it entirely
  (a point for the spec's Android-on-Linux preference).

### CI wiring

- `.github/workflows/ci.yml` — `typescript` + `swift` (library checks, locally green) plus
  `bare-ios` and `bare-android` jobs that build the fixture (install → autolink assert → native
  compile). The earlier static `autolink-guard` (managed-example proxy) was removed; the bare jobs
  are the real proof.

## Committed-fixture + lockfile decisions

- Commit the fixture source + native projects (`ios/`, `android/`) + `bun.lock` + `Podfile.lock`.
  Gitignore `node_modules/`, `ios/Pods/`, `ios/build/`, `android/build/`, `android/.gradle/`
  (RN template `.gitignore` covers most).
- `file:../packages` has no integrity hash (unlike a tarball), so `--frozen-lockfile` is safe; CI
  runs `bun run build` (lib) then `bun install` in `example-bare/` to regenerate the fx symlink.

## Next: run the CI workflow on GitHub to confirm bare-ios + bare-android go green, then propagate the decision to `53` and close SHIP-003 (and record the `podspecPath` library change in the ledger).
