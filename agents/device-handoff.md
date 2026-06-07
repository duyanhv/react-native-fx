# device-handoff — prepare work for device verification

When an agent reaches the device gate, it stops and prepares a handoff. The human owns the device gate — the agent owns everything up to it.

---

## What the agent prepares

### 1. Device scenario in `tasks/<id>/evidence/headless.md`

Write a single markdown file with these sections:

```md
# <task-id> — Device Scenario

## Goal
<one sentence: what must be proven on device>

## Steps
1. <exact step>
2. <exact step>

## Expected result
<what the human should observe if correct>

## Failure signs
<what to look for if broken — flicker, crash, wrong position, etc.>

## Platform
- iOS: <yes/no, version gate if any>
- Android: <yes/no, API gate if any>

## Evidence to capture
- [ ] screenshot / video
- [ ] log output (see commands below)
```

### 2. Update progress.md

- Task state: `in-progress` → `device-pending`
- Add a one-line note in the task's detail block: "Handoff prepared — see `tasks/<id>/evidence/headless.md`."

### 3. Update `tasks/<id>/notes.md`

```
## <date> — device handoff prepared
- Device scenario written in `evidence/headless.md`
- Unverified claims:
  - <claim 1>
  - <claim 2>
- Next: device verification by human
```

---

## What the human does on device

1. Read `tasks/<id>/evidence/headless.md`.
2. Follow the steps exactly.
3. Capture evidence:
   - Logs go in `evidence/logs/`
   - Screenshots / video go in `evidence/screenshots/`
   - Narrative findings go in `evidence/device.md`
4. Update the task checklist in `progress.md`:
   - Check `device-verified` if all claims pass
   - If values need propagation to source docs, mark `docs-pending`; list the docs and the values
5. Update `tasks/<id>/notes.md`:
   ```
   ## <date> — device verification done
   - Result: pass / fail / partial
   - Findings: <what was observed>
   - Next: propagate values to source docs / rework
   ```

---

## Standard device scenarios

These are the recurring scenarios every effect, motion, and interaction task must pass. Reference them in the device scenario rather than rewriting.

### Rendering
- [ ] Shader renders on screen (no black frame, no crash)
- [ ] Uniform change updates the render (intensity, color, etc.)
- [ ] Time advances (animation is not frozen)

### Lifecycle
- [ ] Pause when off-window (leave the screen)
- [ ] Resume when on-window (return to the screen)
- [ ] Pause when backgrounded (send app to background)
- [ ] Resume when foregrounded (return to foreground)
- [ ] No GPU stall after rapid bg/fg toggle

### Motion
- [ ] Content enter animation plays (visible=true)
- [ ] Content exit animation plays (visible=false)
- [ ] Re-toggle mid-flight retargets (no snap, no double animation)
- [ ] Child unmounts after exit animation completes (no visual glitch)
- [ ] Hit-testing correct at rest (tap the animated element)

### Touch
- [ ] Press triggers visual feedback (press-in → scale/ripple)
- [ ] Press fires onPress event (press-in → release)
- [ ] Press cancelled when scroller claims (slide over scroll view → scroller wins)
- [ ] Press cancelled when touch moves outside bounds
- [ ] Rapid taps sequence correctly (no missing events)
