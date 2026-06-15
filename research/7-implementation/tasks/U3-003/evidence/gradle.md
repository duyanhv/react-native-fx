# U3-003 — headless gate + Android build evidence

The TS/format gates do not compile Kotlin; the Gradle build is the headless proof that
the new `FxMaterialView` and the `FxHostedView`/`FxModule` wiring build against the
example app's Android toolchain.

## Headless gates (2026-06-10, from `packages/`)

- `bun run lint` — Biome, 16 files checked, no fixes. Green.
- `bun run build` — green.
- `bun run test` — 26 tests pass (21 prior + 5 new material selection/degradation cases).
- `bunx tsc --noEmit` — green.
- `bunx tsc --noEmit` from `example/` — green.

## Android build (2026-06-10, from `example/android`)

- Command: `./gradlew :react-native-fx:compileDebugKotlin` — BUILD SUCCESSFUL.
  One fix required: `MaterialConfig` must be public, not `internal` — the public
  `FxHostedView.setMaterialConfig` signature exposes it and the Kotlin compiler rejects
  the visibility mismatch. The compiler caught this immediately.
- Command: `./gradlew :app:assembleDebug` — `BUILD SUCCESSFUL in 3m 3s`
  (374 actionable tasks: 79 executed, 295 up-to-date). Compiles and packages the full
  example app including the U3-003 changes:
  - `FxMaterialView.kt` (new) — the translucent stack + `setRenderEffect` blur
  - `FxHostedView.kt` — `"material"` mount branch + `pendingMaterialConfig` stash
  - `FxModule.kt` — `Prop("materialConfig")` registration
- Toolchain: Gradle 9.3.1, the example app's pinned AGP/Kotlin.

## Device run

No Android device or emulator was attached this session (`adb devices` empty) — the B1
device scenario in `headless.md` is pending. The APK from `assembleDebug` is at
`example/android/app/build/outputs/apk/debug/app-debug.apk`.
