# Session handoff — 2026-06-10 (V1 device sweep + interactive-glass spike)

Planner/Reviewer session. Drove the V1 device sweep on real targets via agent-device,
reviewed three fix rounds, and ran an architecture spike. This is the resume index — read
it first, then the linked docs.

## Durable artifacts (the source of truth)

- `device-sweep-v1-findings.md` — full iOS (A1–A4) + Android (B1–B3) sweep results.
- `wip/interactive-glass-touch-delivery.md` — the spike that root-caused A2-4 (the big one).
- `wip/critique-2026-06-10.md` — a 19-finding (F1–F19) architecture/API critique an agent
  produced; KEPT by user decision, awaits separate triage (not yet dispositioned).
- `decision-ledger.md` SPINE-012 / FX-002 / FX-003 — the rows this work touches.

## Where V1 stands

Sweep done on device (iOS 26 sim + Android 15/API 35 POCO F1). Verdicts:

- **iOS A1 (U3-007 symbol):** functional; finding A1-1 (`replaceWith` ignores its value)
  open; OS-degradation rows need a lower-OS device.
- **iOS A2 (U3-002 glass):** dark-box (A2-1) and shape (A2-2) fixes verified, BUT the spike
  proved A2-1 (clear fill) and A2-4 (interactive press) are **mutually exclusive on the
  SwiftUI `.glassEffect` rung**. The current uncommitted clear-fill changes are a DEAD END
  for interactive glass.
- **iOS A3 (uniforms) / A4 (parity, GPU resume):** pass. (A4 interactive-glass-in-scroller
  now answered by the spike.)
- **Android B1 (U3-003 material):** NOT implemented — `effect="material"` has no branch
  (`FxHostedView.kt:81-88`); U3-003 is openly `todo`.
- **Android B2 (parity) / B3 (symbol degradation):** pass.

## The A2-4 root cause (resolved)

`.glassEffect(.interactive(true))` over `.fill(.clear)` never installs the system
`UIPlatformGlassInteractionView`, so the press can't fire (A/B `hitTest`-class proof in the
spike). Fix direction: move the iOS-26 glass rung to UIKit `UIVisualEffectView` +
`UIGlassEffect.isInteractive` (the `expo-glass-effect` precedent) — a real hit-testable,
translucent view that resolves A2-1 + A2-2 + A2-4 together. Realization swap, not a
capability change; model stays `interaction:'self'`, hosted (rules #3/#4 intact).

## DECISIONS AWAITING THE USER (resume here)

1. **V1 scope fork (immediate):** do the UIKit glass rework NOW (interactive works for V1,
   U3-002 closes), OR defer interactive and ship clear *decorative* glass for V1 (smaller,
   but FX-002's `interactive` knob ships dead/deferred). Reviewer recommendation: do the
   rework now.
2. **A1 `replaceWith`:** make it drive the displayed glyph, or rename to a boolean intent —
   reconcile against the U3-007 design.
3. **Critique triage:** disposition the 19 findings (F1–F19) in `wip/critique-2026-06-10.md`
   — ratify / rework / implement / reject each, or discard.
4. **Working tree:** the uncommitted SwiftUI A2-1/A2-2 changes are a confirmed dead-end —
   revert them (clean base for the UIKit rework) or keep for reference? Reviewer rec: revert.

## Working-tree state (uncommitted)

- `packages/ios/FxMaterialView.swift` + `FxHostedView.swift` — the dead-end clear-fill +
  cornerRadius-reactivity changes (decision 4 above).
- `research/2-effects/21-materials-and-glass.md`, `structure.ios.md` — R3 doc additions
  (glass shape mechanic + compositing limit) — these are still valid.
- `tasks/U3-002/{notes.md,evidence/*}` — U3-002 round-1/2 records.
- `device-sweep-v1-findings.md`, `wip/*` — sweep + spike + critique (keep).
- Committed this session: `ab695eb` feat(example): transparent navigation headers.
- `progress.md` was destroyed by a fix agent and RESTORED to pristine HEAD; do not re-trust
  any agent's whole-file doc edits — require surgical Edit + `git diff` self-check.

## Next-action queue (paste-ready prompts in this session's history)

- **U3-002 UIKit glass rework** (pending decision 1) — write fresh: UIKit
  `UIVisualEffectView`+`UIGlassEffect`, resolves A2-1/2/4, ratify the spike into
  structure.ios + the SPINE-012 scroller-coexistence answer, device-verify via the
  `hitTest`-class signal (NEVER frame-diff over the animated backdrop).
- **A1 symbol** (`replaceWith`) — prompt ② drafted.
- **B1 / U3-003 Android material** — prompt ③ drafted (implement RenderEffect blur; resolve
  the own-content-vs-backdrop fork against FX-003/structure.android first).

## Hard-won verification rules (do not repeat the mistakes)

- NEVER verify a touch/animation effect by frame-diff over an animating shader backdrop —
  it produced a false "interactive fixed" call. Use a backdrop-independent signal
  (`hitTest`-class log, static backdrop, or a live human tap).
- `device-verified` stays the human's visual gate even with agent-device.
- Require agents to `git diff --stat` self-check against a file allowlist before "done" —
  this session an agent silently destroyed `progress.md` and restyled 3 layout files.

## Housekeeping (pending)

Delete both `device-sweep-v1.md` and `device-sweep-v1-findings.md` ONLY after every finding
(A1/A2/A2-4/B1) is fixed AND device-verified. The spike doc + critique are separate; keep.
