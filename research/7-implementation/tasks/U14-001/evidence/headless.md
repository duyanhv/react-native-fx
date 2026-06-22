# U14-001 headless evidence + spike runbook

## Headless gate results

```
packages tsc --noEmit:    PASS
packages build:           PASS (exit 0)
packages lint:            PASS (biome: 46 files, no fixes)
packages test:            PASS (145 tests, 7 suites)
example tsc --noEmit:     PASS
pod install:              PASS (100 pods installed)
iOS xcodebuild:           BUILD SUCCEEDED
Android compileDebugKotlin --rerun-tasks: BUILD SUCCESSFUL
Android assembleDebug:    BUILD SUCCESSFUL
```

---

## Device spike runbook

### Prerequisites

Launch the app with a **full rebuild** — this is a native change:

```
cd example
bun run ios          # or: cd ios && pod install && xcodebuild …
# Android:
bun run android
```

Metro reload alone is NOT sufficient. Rebuild the native target.

Navigate to: Tasks → U14-001 FxGroup / FxItem

---

### iOS 26 — the spike question

**Do the two glass items morph/merge when "close"?**

1. Open the harness on an iOS 26 device or simulator.
2. Verify both glass surfaces are visible side by side with the default 4 px gap.
3. Tap "close (4px)" if not already selected.
4. **Spike question:** do the two glass shapes merge into one continuous Liquid Glass
   surface along the shared edge?
5. Tap "apart (80px)". Do they separate back into two distinct surfaces?

Pass: items merge at close range, separate at distance.
Fail: items remain visually separate at 4 px gap — touch directness is the suspected
cause (see notes.md). If this fails, flatten FxItem further or restructure the glass
to be more direct before re-spiking.

---

### iOS 26 — secondary checks

- Labels "A" / "B" are visible through the glass.
- Tapping the glass area triggers "Touch reached item A/B" (touch-through confirmed).
- No crash on open, navigate away, navigate back.

---

### iOS <26 (e.g., iOS 17/18)

- Both items render as individual glass (ultraThinMaterial fallback).
- No morph — expected.
- No crash.

---

### Android (POCO F1 or equivalent)

- Both items render as individual material glass side by side.
- No morph, no crash — the ratified divergence.
- Touch-through: tapping items shows "Touch reached item A/B".
