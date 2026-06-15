# DEF-009 Device Run 2 — Re-gate of 495fbe5 fix

**Device:** POCO F1 (API 35)  
**Build commit:** `495fbe5` (fix(effects): start content-distort loop on the container's own attach (DEF-009))  
**APK timestamp:** Jun 15 08:38:24 2026 (fresh `./gradlew :app:assembleDebug` from `example/android`, installed via `adb install -r`)  
**Metro:** Serving JS from `example/` at 192.168.101.181:8081  
**Agent-device session:** `def009-run2`  
**Date:** 2026-06-15

## Verdict table

| Row | Test | Verdict | Evidence |
|-----|------|---------|----------|
| **R1** | First-render ripple (the run-1 defect) | **PASS** | `run2/r1-first-render-frame{1,2,3}.png` — warp pattern visible and moving on fresh mount; `run2/r1-contrast-off.png` — content crisp after chip toggled OFF |
| **R2** | Navigate-away → back | **PASS** | `run2/r2-navigate-back-frame{1,2,3}.png` — ripple animates again after system-back and re-open without manual toggle |
| **R3** | Background-pause resume | **PASS** | `run2/r3-background-resume.png`, `run2/r3-background-resume2.png` — ripple resumes after HOME → 5 s → return; no crash, flash, or reset |

**Overall: 3/3 PASS** → run-1 6/7 + run-2 3/3 = **7/7 overall** for DEF-009.

## Row notes

### R1 — First-render ripple
The screen opened with the "ripple on" chip already ON (default). The heading "Tap through the ripple" and both buttons were visibly warped by the AGSL ripple distortion. Three screenshots captured at ~0 s, ~0.5 s, and ~1.0 s show the warp pattern has shifted, confirming the loop is running. After tapping the chip OFF, the same text and buttons appear crisp and undistorted, confirming the effect is the active shader and not a static artifact.

### R2 — Navigate-away → back
System-back returned to the task list. Re-opening the DEF-009 row brought the screen back with the ripple chip ON and the content already warping. No manual toggle was required. Three screenshots at 0 s, 0.5 s, and 1.0 s show the warp pattern in motion, confirming the loop started on the second mount just as it did on the first.

### R3 — Background-pause resume
While rippling, the HOME key was pressed to background the app. After ~5 seconds the app was brought back to the foreground. The ripple resumed immediately without any flash, crash, or reset. Two screenshots (0 s and 0.5 s after return) show the warp pattern continues from where it left off, confirming the loop was paused while backgrounded and resumed cleanly on `onViewAttachedToWindow`.

## Evidence file list

```
research/7-implementation/tasks/DEF-009/evidence/
├── run2/
│   ├── r1-first-render-frame1.png
│   ├── r1-first-render-frame2.png
│   ├── r1-first-render-frame3.png
│   ├── r1-contrast-off.png
│   ├── r2-navigate-back-frame1.png
│   ├── r2-navigate-back-frame2.png
│   ├── r2-navigate-back-frame3.png
│   ├── r3-background-resume.png
│   └── r3-background-resume2.png
```

## Skipped (already proven in run 1, unaffected by loop-start fix)

- Live child touch-through
- Intensity tracking
- Pre-33 normal-render
- iOS no-op
