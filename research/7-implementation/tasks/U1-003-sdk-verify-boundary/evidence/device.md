# U1-003 — Device Verification

## Date

2026-06-08

## Result

**pass** — all four scenarios pass on both iOS and Android.

## Findings

- **S1 · RT-010 — multi-view registration:** All three views (FxHostedView, FxSurfaceView, FxGroupView) mount without crash on both platforms. Fast refresh produces no "Tried to register two views with the same name" error on either platform. Registration keying works correctly on Expo SDK 56.
- **S2 · RT-011 — @Field Record coercion:** Absent `Record` fields are filled with `@Field` defaults on both platforms. `_testRecord={{ valueA: 99 }}` (omitting `valueB`) produces `valueB=default` natively on both iOS and Android. Explicit fields override correctly.
- **S3 · RT-004 — view recycling:** Toggle unmount/remount creates fresh native instances (new `identityHashCode`/`ObjectIdentifier`) on both platforms. No instance rebinds to a different React row/tag with stale shader/intensity/mode. `shouldBeRecycled() = false` is sufficient — no reset hook needed.
- **S4 · SURF-010 — previousProps value-equality:** Primitive props and nested `Record` props skip native setters on re-render when values are unchanged, on both platforms. A fresh JS object with the same effective value (`{ valueA: 99 }`) does not trigger the setter — Expo compares by value, not reference. The data-layer §5.1 guidance that inline builder literals work without `useMemo` is confirmed.

## Evidence

- Android: `adb logcat` output captured with filtered tag `U1-003:D`. Init, setter, and applyResolvedConfig call counts tracked. Call counts stay at 1 across identical-value re-renders; setBoundaryTestRecord filled omitted valueB with default.
- iOS: Xcode console output observed during build-and-run. All four scenarios executed on device (simulator). Swift `print()` output confirmed identical behavior: init logging, setter call-count invariance, Record default-filling.

## Platform

- iOS: yes, SDK 56, simulator
- Android: yes, SDK 56, physical device
