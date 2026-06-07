# react-native-fx Device Verification Guide

This guide defines how you verify visual, motion, and touch behavior on a device. fx effects, animations, and interaction do not run headless — the device gate is mandatory for any task marked `device: yes` in [`progress.md`](../research/7-implementation/progress.md).

---

## The device gate

Every task that touches rendering, motion, or touch has a device gate. The agent stops at `headless-done` and prepares a handoff. The human owns the device gate.

**What requires device verification:**
- A curated shader renders on screen (no black frame, no crash, no GPU stall)
- Content enters and exits with the correct animation
- A press fires the correct events with the correct timing
- A scroller cancellation does not deadlock
- The render loop pauses off-window and resumes correctly
- BYO shader compilation succeeds or fires `onError`
- Tune formulas feel right on each platform

**What does not require device verification:**
- Manifest data compiles and ladders are well-formed (Tier 1: headless)
- `select()` returns the correct rung for a given OS (Tier 1: headless)
- Builders produce the correct data types (Tier 1: headless)
- `tsc` is green (Tier 3: build)

---

## Simulator vs physical device

| Scenario | Simulator okay? | Physical required? |
|----------|----------------|-------------------|
| Metal shader renders | ✅ iOS simulator supports Metal | — |
| AGSL shader renders | ❌ Emulator AGSL support varies | ✅ Physical Android strongly preferred |
| SwiftUI / Compose effects | ✅ Simulator / emulator fine | — |
| Touch interaction | ⚠️ Simulator can test basic taps | ✅ Physical for gesture-scrub, multi-touch |
| Off-window / background lifecycle | ✅ Simulator supports app lifecycle | — |
| Performance / GPU stall | ❌ Simulator perf is not representative | ✅ Physical |
| RNGH coexistence (scroller cancel) | ⚠️ Can test basic scroll | ✅ Physical for real feel |

When in doubt, prefer a physical device. The goal is to verify the behavior, not to find a passing configuration.

---

## Standard verification scenarios

### Rendering

| Scenario | Steps | Expected | Failure signs |
|----------|-------|----------|---------------|
| Shader mounts | Navigate to the shader screen | Shader renders immediately, no black flash | Black frame, crash, or blank screen |
| Uniform change | Change intensity slider | Render updates smoothly | Flicker, stale frame, or no change |
| Time advances | Leave screen idle for 5s | Animation is fluid, no freeze | Frozen animation |
| Shader switches | Cycle through curated shaders | Each shader renders without crash | Crash on switch, corrupted frame |

### Lifecycle

| Scenario | Steps | Expected | Failure signs |
|----------|-------|----------|---------------|
| Off-window pause | Navigate away from the fx screen | Render loop pauses (no CPU/GPU usage) | Loop keeps running, battery drain |
| On-window resume | Return to the fx screen | Render resumes immediately | Stall, flicker, or black frame |
| Background pause | Send app to background | Render loop pauses | Loop keeps running |
| Foreground resume | Return app to foreground | Render resumes, no drawable stall | Black frame after resume |
| Rapid bg/fg toggle | Background → foreground × 5 quickly | No GPU stall or crash | Crash, hang, or corrupted frame |

### Motion

| Scenario | Steps | Expected | Failure signs |
|----------|-------|----------|---------------|
| Enter animation | Toggle visible=true | Content slides/fades in per preset | No animation, wrong edge, wrong timing |
| Exit animation | Toggle visible=false | Content slides/fades out per preset | No animation, premature unmount (flicker) |
| Re-toggle mid-flight | Toggle visible=true during exit | Animation retargets, no snap or restart | Snap to target, double animation |
| Deferred unmount | Let exit animation complete | Child unmounts after exit, no visual glitch | Flicker on unmount, child visible after exit |
| Hit-test at rest | Tap the animated element at rest | Event fires at correct position | Touch does not register |
| Hit-test mid-flight | Tap the element during enter animation | Event fires at target position (iOS) or visual position (Android) | Touch unresponsive during animation |

### Touch

| Scenario | Steps | Expected | Failure signs |
|----------|-------|----------|---------------|
| Press feedback | Press an FxPressable | Visual feedback plays (scale/ripple) | No feedback, delayed feedback |
| Press events | Press → release | `onPressIn` → `onPressOut` → `onPress` fire in order | Wrong order, missing event |
| Scroller cancel | Start press, then scroll | Press cancels, visual springs back, no `onPress` | `onPress` fires despite scroll, deadlock |
| Outside cancel | Start press, drag finger outside bounds | Press cancels, no `onPress` | `onPress` fires despite being outside |
| Rapid taps | Rapidly tap 5 times | Each tap fires correct event sequence | Missing events, wrong state |

---

## Evidence format

### headless.md (agent writes before device)

```md
# <task-id> — Device Scenario

## Goal
<one sentence>

## Steps
1. <exact step>
2. <exact step>

## Expected result
<what should happen>

## Failure signs
<what indicates a bug>

## Platform
- iOS: <yes/no, min version>
- Android: <yes/no, min API>
```

### device.md (human writes after device)

```md
# <task-id> — Device Verification

## Date
<date>

## Result
pass / fail / partial

## Findings
- <observation 1>
- <observation 2>

## Evidence
- Screenshots: `screenshots/<filename>`
- Logs: `logs/<filename>`
```

---

## After verification

1. Place evidence in `tasks/<id>/evidence/`.
2. Update the task checklist in `progress.md` — check `device-verified`.
3. If values need propagating to source docs (e.g., spring parameters confirmed, preset shapes verified), mark `docs-pending`. List the docs and values to propagate.
4. Update `tasks/<id>/notes.md` with the result.
