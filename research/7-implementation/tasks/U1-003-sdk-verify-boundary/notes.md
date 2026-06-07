# U1-003 notes

## Unverified claims

All four claims — this is a device-verify task. Every claim waits on the human's device gate.

## What changed and why

- **Spec'd** — created `tasks/U1-003-sdk-verify-boundary/README.md` from the subtask
  template, adapted for the `device-verify` task type. Four device scenarios derived from
  the four ledger rows: RT-010 (registration), RT-011 (@Field Record coercion), RT-004
  (recycle reset), SURF-010 (previousProps value-equality). Each scenario defines
  prerequisites, steps, expected results, and failure modes.

- **Progress.md bugs found and fixed (2026-06-07):**
  - **RT-005 → RT-004 swap.** U1-003's original Closes column listed `RT-005` (SDF
    hit-testing, `32`) — wrong row. The proof column said "recycle reset" which maps to
    RT-004. Fixed: U1-003 now closes RT-004; RT-005 moved to U8-001 (press-recognizer +
    SDF, natural home).
  - **RT-004 double-closed.** RT-004 was already in U3-002's Closes (hosted-GPU rendering
    — unrelated to recycling). Removed from U3-002. U1-003 is the sole owner of RT-004.
  - **RT-005 orphaned.** After the swap, RT-005 had zero tasks closing it. Added to
    U8-001's Closes (the press recognizer + SDF hit-test task already consumes RT-006).
    Invariant restored: every in-flight row is closed by exactly one task.
  - **U1-003 missing U1-004 dependency.** Every scenario mounts JS views against a real
    module — needs a runnable app (U1-004). Added U1-004 to Blocked by.

- **Audit (2026-06-07) — three findings, all applied:**
  - **Scenario 1 import path.** `import from 'react-native-fx/src/...'` violates the
    root-only exports (`52`). Switched to a debug-only `index.ts` export or relative
    import inside `example/`, with a remove-after-testing note.
  - **Scenario 1 scope-bleed.** "FxSurfaceView renders the Metal shader (curated pixels
    visible)" is a REAL-002 / U3-005 concern, not RT-010. Clarified: the RT-010 close
    claim is "three views resolve without crashing"; Metal rendering is a bonus
    observation.
  - **Scenario 4 missing counter.** Steps 6–7 referenced `setIntensityCallCount` but the
    prerequisite only declared `setShaderCallCount`. Added `setIntensityCallCount` and
    its increment instruction.

- **Audit (2026-06-07) — device handoff fixed; task now blocked on U1-004/device execution:**
  - **Lifecycle drift.** `progress.md` had U1-003 `in-progress` with only `spec'd`
    checked, while the task already contained device scenarios. Marked `rules-gated`
    and `scenario-written`. Kept the row blocked because U1-004 still must provide
    the runnable app before the human device gate.
  - **Guide evidence gap.** The Device Verification Guide requires an agent-written
    `headless.md` before device execution. Added
    `tasks/U1-003-sdk-verify-boundary/evidence/headless.md`.
  - **Scenario 1 executable import.** The debug export still modified the root public
    API and exported all views from the hosted-view file. Replaced it with direct
    internal imports in `example/App.tsx`.
  - **Scenario 2 platform gap.** The Record coercion scenario was Swift-only. Added the
    Android `Record` instrumentation and made cross-platform agreement part of the
    expected result.
  - **Scenario 3 recycling ambiguity.** The original steps mixed "same instance reused"
    with "new instance created." Reframed the proof around no native object being
    rebound to a different row/tag with stale prop state, on both platforms.
  - **Scenario 4 close-condition mismatch.** The scenario only checked primitive props,
    but SURF-010 closes only when nested records/value objects are proven. Added the
    `_testRecord` value-equality re-render check on both platforms.

- **Audit response (2026-06-07) — closure and parity tightened:**
  - **RT-010 stale reconciliation row.** The main RT-010 close path now also requires
    clearing the reconciliation note that still says `architecture.md` needs the
    single-orchestrator rework. That text is stale after U1-002, but must be cleaned when
    RT-010 closes.
  - **Scenario 1 Android parity.** Registration proof now runs on iOS and Android, with
    platform-neutral expected results for the empty host/group shells.
  - **Scenario 4 risk callout.** The nested `Record` equality check is flagged as the
    highest-risk claim. A failure is an expected possible outcome that sends SURF-010 to
    rework rather than a reason to force the guidance closed.
  - **Metro resolver failure mode.** Added the raw-source import resolver issue as a
    distinct failure mode so it is not confused with native registration.

## Next: Human executes the four scenarios on SDK 56 after U1-004 lands, records
`evidence/device.md`, then propagates/rewrites the source docs and closes the ledger rows.
