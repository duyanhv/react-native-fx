# U15-001 — device runbook: tint + colorScheme

Harness screen: **fill-material** (already in the task list). Scroll to the "material · tint + colorScheme" section.

This is a **native change** — rebuild is mandatory before testing (do not reload JS only).

```
cd example
# iOS
bunx expo run:ios
# Android
bunx expo run:android
```

---

## iOS 26 (device or simulator)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open fill-material screen | Baseline glass renders (no tint, system colorScheme) — same as before this change |
| 2 | Tap **#ff6b6b** tint | Glass acquires a visible red cast; backdrop still shows through |
| 3 | Tap **#339af0** tint | Cast shifts to blue |
| 4 | Tap **#51cf66** tint | Cast shifts to green |
| 5 | Tap **none** tint | Cast removed; glass returns to untinted system appearance |
| 6 | Tap **dark** colorScheme | Glass forces dark appearance regardless of system dark/light mode |
| 7 | Tap **light** colorScheme | Glass forces light appearance |
| 8 | Tap **system** colorScheme | Glass follows the system appearance |
| 9 | Set tint **#ff6b6b** + colorScheme **dark** | Red-tinted dark glass |
| 10 | Scroll to the uncontrolled glass above | Verifies variant/interactive unregressed (same as pre-change) |

## iOS below 26 (if available)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open fill-material screen | `.ultraThinMaterial` / `.thinMaterial` fallback renders |
| 2 | Tap **dark** colorScheme | Material forces dark appearance |
| 3 | Tap **light** colorScheme | Material forces light appearance |
| 4 | Tap any tint | No visible change (tint degrades on this rung — documented behavior) |

Note: if no sub-26 device is available, code-reason the degradation from `FxMaterialView.swift` (no tint API on SwiftUI materials).

---

## Android (POCO F1 — API 35)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open fill-material screen | Baseline frost scrim renders (white, system colorScheme) — unregressed |
| 2 | Tap **#ff6b6b** tint | Frost scrim acquires a red-tinted hue |
| 3 | Tap **#339af0** tint | Frost scrim shifts to blue-tinted |
| 4 | Tap **none** tint | White scrim restored |
| 5 | Tap **dark** colorScheme | Scrim switches to near-black dark base |
| 6 | Tap **light** colorScheme | Scrim returns to white |
| 7 | Tap **system** colorScheme | Same as light (system default) |
| 8 | Intensity + variant unregressed | Change intensity via other rows on the screen — behavior unchanged |
| 9 | interactive stays inert | No crash, no gesture registered |

---

## Evidence to collect

- Screenshot or video of iOS 26 tint cast (at least two colors)
- Screenshot of iOS dark/light colorScheme toggle
- Screenshot of Android tint (at least one color)
- Screenshot of Android dark colorScheme base
- Note in device.md: platform version, build hash, result (pass/fail per row)
