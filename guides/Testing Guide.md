# react-native-fx Testing Guide

This guide defines how you design, name, and judge tests for react-native-fx. It is the companion to the [Contributing Guide](./Contributing%20Guide.md), which covers the toolchain and the merge bar.

---

## The test taxonomy

fx tests fall into three tiers. A tier is a category of *what can be proven*, not a file location.

### Tier 1: headless (unit and integration)

Runs on CI without a device. Verifies logic, types, and data.

**What belongs here:**
- `select()` algorithm — the fallback ladder, platform routing, OS gating
- Manifest data — `CapabilityManifest` compiles, ladders are well-formed
- Builders — `fx.effect.*` → `EffectStack`, `fx.motion.*` → `MotionSpec`
- FSM logic — press handler state transitions, presence coordinator phases
- Tune formulas — `speed`/`emphasis`/`distance` produce correct values

**What does NOT belong:**
- Rendering (Metal, AGSL, SwiftUI, Compose)
- Animation (Core Animation, SpringAnimation)
- Touch (UILongPressGestureRecognizer, onTouchEvent)
- Layout (Yoga/Fabric frame reads)
- Lifecycle (off-window pause, background/foreground)

### Tier 2: device verification

Requires a device or simulator. Verifies visual, motion, and touch behavior.

**What belongs here:**
- Effects render on screen without crashing
- Uniform changes update the render
- Content enter/exit animation plays correctly
- Press triggers feedback and events
- Scroller cancellation works
- Lifecycle pause/resume does not stall

**Evidence format:**
- `headless.md` — the device scenario (steps, expected result, failure signs)
- `device.md` — the human's narrative findings
- `logs/` — crash logs, console output
- `screenshots/` — screenshots or video clips

### Tier 3: build verification

Verifies the package builds, links, and installs correctly on each platform.

**What belongs here:**
- `tsc` compiles without errors
- `bun run build` succeeds
- `bun run lint` is green
- iOS example app builds in Xcode
- Android example app builds in Android Studio
- Pod install succeeds (iOS)
- Gradle sync succeeds (Android)

---

## Test file conventions

### TypeScript

- Test files live in `src/__tests__/` alongside the source.
- Name pattern: `*-test.ts` or `*-test.tsx`.
- Platform-specific tests use extensions: `*.test.ios.ts`, `*.test.android.ts`.
- Use `jest` (the preset is `jest-expo`).

```ts
// packages/src/__tests__/manifest-test.ts
describe('select()', () => {
  it('returns the first satisfiable rung', () => {
    const rung = select(manifest.nodes['shader'], 'ios', { deviceOS: 18 });
    expect(rung.via).toBe('shader');
  });

  it('degrades to none when no rung satisfies', () => {
    const rung = select(manifest.nodes['shape-morph'], 'ios', { deviceOS: 18 });
    expect(rung.via).toBe('none');
  });
});
```

### Swift

- Test files live in `ios/__tests__/`.
- Name pattern: `*Tests.swift`.
- Use `XCTest` (the standard Swift testing framework).
- Mock `ExpoModulesCore` types; do not import the real module in unit tests.

---

## What "not testable" means

Some fx behaviors cannot be proven headless. This is expected. When a behavior is not testable:

1. **State the reason.** "Not testable headless because <reason>."
2. **Mark the device scenario.** Write the checklist in the task's `evidence/headless.md`.
3. **Do NOT skip the device gate.** "Not testable headless" means the device gate is *required*, not *bypassed*.

Behaviors that are always device-gated:
- Rendering (Metal, AGSL, SwiftUI, Compose)
- Animation (Core Animation, SpringAnimation, CSS transitions)
- Touch (UILongPressGestureRecognizer, onTouchEvent, hit-testing)
- Layout (Yoga/Fabric frame reads, safe area insets)
- Lifecycle (off-window pause, background/foreground, GPU resume)

---

## When a test is sufficient

A test is sufficient when it covers the behavior the task claims to provide. The proof field on each task says what must be covered.

- **Edge cases matter more than line coverage.** A single test that proves the fallback ladder degrades correctly is worth more than 10 tests that assert each rung's `primitive` field.
- **Borrow Nitro's discipline.** A bug fix ships with the failing test it fixes. A repro-only PR is welcome.
- **Test the contract, not the implementation.** The test should pass regardless of how the code is refactored later, as long as the contract holds.

---

## Running tests

TypeScript (from `packages/`):
```sh
bun run test
```

Swift (from `packages/`):
```sh
bun run swift:lint    # no Swift unit test script yet; add when tests exist
```

CI runs `bun run test` and `bun run swift:lint` on every PR.
