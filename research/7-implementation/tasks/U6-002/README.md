# U6-002 — the hard-retarget matrix: RT-016's device truth

Type: `device-verify` · State: `todo` (spec'd) · Device: `yes` · Consumes: — · Closes: RT-016 (**device-gated** — see Closure) · Blocked by: — (U6-001 merged 2026-06-12)

## Start here

1. **This file** — the work order (spec'd by the planner, 2026-06-12).
2. **`../U6-001/preflight.md`** — the spring dossier. The verdict question this task
   answers on device is its §The verdict question (RT-016); the disposition under test is
   §Findings (render-server-first / integrator-on-retarget; Android stock).
3. **`../U6-001/evidence/device-run.md`** — the baseline gate. Reuse its instrumentation
   pattern (temporary local control + native trigger + log lines), its build/install
   discipline (gradlew + adb install with timestamp check; xcodebuild direct), and its
   marker convention.
4. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and
   tracking · **`guides/Device Verification Guide.md`** (the binding gate guide).

## Authority links

```
Subtask: the RT-016 device matrix (blueprint Unit 6, the device-truth half) — prove on
         BOTH platforms that the shipped retarget paths survive the hard cases, or
         produce the concrete failure evidence that triggers the integrator flip.
- Contract anchors:  research/4-runtime/34-animation-driver.md §Findings — the iOS
                     spring disposition (render-server-first, integrator-on-retarget;
                     the documented weak points: presentation() exposes value not
                     velocity, displacement-normalized initialVelocity degenerates at
                     small displacements) and §Findings — reduce-motion (the manual
                     Android spring gate), tasks/U6-001/preflight.md (the RT-016
                     verdict question + dossier), decision-ledger.md RT-016 (close
                     condition: on-device proof of the retarget cases),
                     structure.{ios,android}.md §motion (the pinned mechanics — report
                     divergence, never silently re-pin).
- Decision:          already made (DOC-009) — this task does not redesign; it proves or
                     falsifies on device. The flip-trigger IS the deliverable: any
                     matrix row that fails cleanly documents the case the stock path
                     cannot serve, and the integrator extension becomes a follow-up
                     rework task (planner scopes it) — U6-002 builds NOTHING either way.
- Reference (HOW):   the U6-001 instrumented-harness pattern (temporary local example
                     control + platform-side trigger + counters/logs, fully reverted).
                     The driver still has no JS API; do not add one.
- Guides:            Device Verification (the scenario + evidence bar); Writing Style
                     (the evidence write-up); Contributing (commands).
- Rules gate:        #1 (the matrix must show no per-frame JS — motion runs with the JS
                     thread idle), #7 (instrumentation is Expo-Modules-side Swift/Kotlin
                     only), #9 (only the intermediate container is animated). Any fix
                     the matrix tempts you into is OUT OF SCOPE — evidence only.
- The matrix (run EVERY row on BOTH platforms; log one line per retarget/completion/
  cancel with the vector, and record each row PASS/FAIL):
                     1. Retarget timing sweep — interrupt at roughly 10% / 50% / 90% of
                        the envelope. The ~90% (near-rest, small-displacement) row is
                        the documented iOS degenerate case — watch for snap, overshoot,
                        or a dead stop.
                     2. Reversal vs extension — (a) retarget to the opposite direction
                        (the opposing-inertia clip must zero the opposing channels);
                        (b) retarget FURTHER along the same direction (velocity must
                        carry — a clip firing here is a defect).
                     3. Rapid-fire — 3+ retargets inside ~100 ms (i.e. several inside
                        one envelope, at least two inside the display-link path on
                        iOS). Exactly one completion, at the last target only; display
                        link / spring set fully stops at rest.
                     4. Zero-displacement retarget — retarget to (approximately) the
                        current in-flight value. No snap, no stuck envelope, completion
                        fires once.
                     5. Retarget-after-rest boundary — call animate-to again AFTER rest:
                        must run as a fresh fire-once envelope (iOS: render-server path,
                        NOT a display-link continuation — log the source).
                     6. Rotation + combined channels — vectors with rotation ≠ 0
                        composed with scale and translation (U6-001 ran rotation=0
                        throughout — the presentation-transform decomposition under
                        combined scale+rotation is UNTESTED on device). Retarget
                        mid-flight; watch for transform skew/jump at the handoff
                        capture.
                     7. Mixed-channel disagreement — a retarget where some channels
                        oppose (clip) and some extend (carry) simultaneously; verify
                        per-channel clip behavior in the logged carriedVelocity.
                     8. Cancel under rapid-fire — cancel issued between two rapid
                        retargets: settles in place, nothing fires afterward, no
                        lingering frame work (iOS: displayLink nil; Android: zero
                        active springs — log both).
                     9. JS-thread silence — during rows 1–3, capture proof that no
                        per-frame JS/bridge traffic drives motion (e.g. the busy-JS
                        check from the Device Verification Guide or log absence).
- Device-verify:     iOS 17+ (sim acceptable per the U5-001/U6-001 precedent; a physical
                     iPhone upgrade re-run stays on the standing-gates list) and Android
                     API 24+ hardware. Write evidence/matrix.md: per-row PASS/FAIL ×
                     platform with the actual log lines, device models + OS versions,
                     local recording filenames (recordings stay local, gitignored).
- Closure:           RT-016 closes ONLY on a full-matrix PASS, and only the planner/
                     maintainer flip it after review — the agent must not tick
                     device-verified/merged or touch RT-016/progress state. On ANY FAIL:
                     stop the matrix row, capture the repro + recording, write it up as
                     FAIL, do NOT attempt a fix — the integrator flip is a planner-
                     scoped follow-up. structure.{ios,android}.md §motion get a pin
                     update only at docs-closed, only if the evidence contradicts a
                     pinned mechanic, and the planner does it.
- Done when:         evidence/matrix.md carries all nine rows × two platforms with logs
                     and a one-word verdict per row; all temporary instrumentation
                     reverted; tree clean except evidence + notes.md; notes.md updated
                     with results, unverified claims, and a one-line "Next:".
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-12)
- [ ] rules-gated (instrumentation only — confirm no rule is touched before the run)
- [ ] device scenario run (the matrix, both platforms)
- [ ] device-verified (human gate — maintainer ratifies the matrix)
- [ ] reviewed
- [ ] docs-closed (RT-016 per Closure; `34` §Findings disposition line annotated with the device truth)
- [ ] merged (human gate)

## Proof

- **headless:** none beyond hygiene — this task ships no code. `git diff --check`; the
  instrumentation reverted (`git status` clean except evidence + notes).
- **device:** `evidence/matrix.md` — nine rows × iOS + Android, logs inline, verdict per
  row, for the maintainer's ratification.
