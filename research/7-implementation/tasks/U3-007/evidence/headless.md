# U3-007 — Device Scenario

## Goal
Verify that the iOS `.symbolEffect` path renders correctly on device, degrades gracefully below iOS 17, and the Android planned rung is correctly skipped.

## Steps

### iOS 17+ (primary path)
1. Launch the example app on an iOS 17+ device or simulator.
2. Navigate to a screen that mounts `<FxHostedView symbolConfig={{ name: 'heart', animation: 'bounce' }} />`.
3. Observe the SF Symbol renders with the bounce animation.
4. Toggle the symbol to `name: 'star', animation: 'pulse'` and observe the symbol→symbol transition via `.contentTransition(.symbolEffect(.automatic))`.
5. Test `animation: 'variableColor'` and `animation: 'scale'` — both should animate.

### iOS 18+ (extended effects)
6. On iOS 18+, test `animation: 'breathe'`, `animation: 'rotate'`, and `animation: 'wiggle'` — these require `.symbolEffect` API availability from iOS 18.

### iOS <17 (degradation)
7. On iOS 16 or earlier, mount the same symbol config — the view should render as `Color.clear` (no crash, no visible symbol).

### Android (planned rung skip)
8. On Android, mount the same symbol config — the selector should skip the planned `lib` rung and degrade to `{via: 'none'}` (no effect renders, no crash).

## Expected result
- iOS 17+: SF Symbol renders with the requested `.symbolEffect` animation.
- iOS 18+: breathe/rotate/wiggle also work.
- iOS <17: graceful degradation (no symbol, no crash).
- Android: no symbol effect (planned rung skipped, no crash).
- Symbol→symbol transition animates smoothly on iOS 17+.

## Failure signs
- Black frame or crash on mount.
- Symbol renders but does not animate.
- iOS 18-only effects render with a different animation on iOS 17 (should render plain symbol, no invented fallback).
- Android crashes or attempts to render a symbol.
- `symbolConfig` prop does not reach native (prop typing mismatch).

## Platform
- iOS: yes, min 17
- Android: yes (degradation verification)

## Unverified claims
- `.symbolEffect` renders correctly on a physical iOS device.
- Symbol→symbol `.contentTransition` animates as expected.
- iOS 18-only effects (breathe/rotate/wiggle) degrade correctly on iOS 17.
- Android planned rung skip confirmed at runtime.
