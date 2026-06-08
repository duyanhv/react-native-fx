# U1-003 notes

## Unverified claims

None remaining — all four scenarios verified on device (iOS + Android).

## What changed and why

- **Spec'd** — created `tasks/U1-003-sdk-verify-boundary/README.md` from the subtask
  template, adapted for the `device-verify` task type. Four device scenarios derived from
  the four ledger rows: RT-010 (registration), RT-011 (@Field Record coercion), RT-004
  (recycle reset), SURF-010 (previousProps value-equality). Each scenario defines
  prerequisites, steps, expected results, and failure modes.

- **Progress.md bugs found and fixed (2026-06-07):**
  - RT-005 → RT-004 swap. U1-003's original Closes column listed RT-005 — wrong row. Fixed.
  - RT-004 double-closed. Removed from U3-002. U1-003 is the sole owner.
  - RT-005 orphaned. Added to U8-001's Closes.
  - U1-003 missing U1-004 dependency. Added U1-004 to Blocked by.

- **Audit (2026-06-07) — three findings, all applied:**
  - Scenario 1 import path — switched to debug-only relative import.
  - Scenario 1 scope-bleed — RT-010 close claim clarified to "three views resolve without crashing."
  - Scenario 4 missing counter — added setIntensityCallCount.

- **Audit (2026-06-07) — device handoff fixed:**
  - Lifecycle drift fixed — marked rules-gated and scenario-written.
  - Guide evidence gap — added evidence/headless.md.
  - Scenario 1 executable import — replaced with direct internal imports.
  - Scenario 2 platform gap — added Android Record instrumentation.
  - Scenario 3 recycling ambiguity — reframed proof around identity rebinding.
  - Scenario 4 close-condition mismatch — added _testRecord value-equality re-render check.

- **Audit response (2026-06-07) — closure and parity tightened:**
  - RT-010 stale reconciliation row — added cleanup to close condition.
  - Scenario 1 Android parity — registration proof now cross-platform.
  - Scenario 4 risk callout — nested Record equality flagged as highest-risk.
  - Metro resolver failure mode — added as distinct failure mode.

- **Device verification (2026-06-08) — all four scenarios pass:**
  - **S1 · RT-010:** Three views (FxHostedView, FxSurfaceView, FxGroupView) mount without crash on iOS + Android. Fast refresh produces no duplicate-registration errors. **PASS.**
  - **S2 · RT-011:** `BoundaryTestRecord` with omitted `valueB` fills `@Field` default (`valueB=default`) on both platforms. Explicit fields override correctly. **PASS.**
  - **S3 · RT-004:** FlatList toggle creates fresh instances (no identity rebinding to different rows). `shouldBeRecycled() = false` is sufficient — no reset hook needed. **PASS.**
  - **S4 · SURF-010:** `previousProps` skips both primitive and nested `Record` props when values are unchanged. Fresh JS object with equal effective value does not trigger setter. **PASS.**
  - iOS build fix: moved `print()` after `super.init()` to satisfy Swift's init ordering rule.
  - Evidence recorded in `tasks/U1-003-sdk-verify-boundary/evidence/device.md`.

- **Temporary instrumentation added and removed:**
  - iOS: `BoundaryTestRecord` struct, 4 call counters, instanceId tracking, print() logs, `setBoundaryTestRecord()` method in FxSurfaceView.swift; `_testRecord` Prop in FxModule.swift.
  - Android: `BoundaryTestRecord` class, same counters + Log.d() in FxSurfaceView.kt; `_testRecord` Prop in FxModule.kt.
  - example/App.tsx: U1-003 test screen with all four scenarios.
  - All removed after observation. Build/lint clean verified (`tsc`, `build`, `swift:lint`, `biome`).

- **Source docs reconciled and ledger rows closed:**
  - **SURF-010** → `resolved`. `data-layer.md` §5.1 ratified: `previousProps` value-equality confirmed for both primitives and nested Records. Conditional language removed; `useMemo`/`useCallback` marked unnecessary.
  - **RT-010** → `resolved`. `51` open question closed: registration keying confirmed with three views under one module. `decision-ledger` reconciliation row flipped from `rework` to `propagate`.
  - **RT-011** → `resolved`. `51` open question closed: `@Field` Record coercion fills absent fields on both platforms.
  - **RT-004** → `resolved`. `31` open question closed: `shouldBeRecycled() = false` is sufficient; no reset hook needed. Recycling guidance simplified — defensive language removed.
  - Stale reconciliation row for RT-010 cleared.

## Next: U1-003 is ready for the `reviewed` gate. The device-verified checklist box is the human's — the human observes device.md and ticks it. Then `docs-closed` is complete (source docs reconciled, all four ledger rows resolved). After review, merge.
