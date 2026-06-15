# DEF-009 — device run 3 (bundled-asset re-gate, R1 only)

Bounded re-confirm after the ripple sampler moved from an inline Kotlin const to the bundled
asset `assets/shaders/content_ripple.agsl` (commit `5ef3fc7`). Only R1 is in scope — where the
shader *text* is sourced from is the sole change; R2/R3/touch/intensity/pre-33/iOS were proven
7/7 in run 1+2 and are independent of the source.

- **Build:** fresh `:react-native-fx:compileDebugKotlin --rerun-tasks` (393 executed) +
  `:app:assembleDebug` SUCCESSFUL; `unzip -l app-debug.apk` confirmed
  `assets/shaders/content_ripple.agsl` (552 B) inside the APK beside the 10 device-proven siblings.
- **Device:** Android, content-distort screen, default `rippling=true`, no toggle, intensity 0.80.

## R1 — first-render ripple from the bundled asset: PASS

- `run3-asset-r1-first-render.png` — on first render the heading "Tap through the ripple" and both
  buttons ("Increment (0)", "Second button (0)") are visibly warped; "ripple on" chip active;
  taps 0 / second 0 (no interaction).
- `run3-asset-r1-frame2.png` (~500 ms later) — the warp pattern is at a clearly different phase
  (letter positions and button-edge bulges shifted), confirming the Choreographer loop runs.
- UI ~59.9 fps.

Conclusion: `content_ripple.agsl` resolves via `ensureShader()` from the bundled asset and the loop
starts on the container's own attach. No regression from the inline→asset refactor (`5ef3fc7`).

PNGs are gitignored per the `d21e9bb` evidence-binary policy; this write-up is the versioned record.
