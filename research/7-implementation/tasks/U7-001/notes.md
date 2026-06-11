# U7-001 — notes

## Unverified claims (need device proof)

- All five React-semantics rules are source-grounded, not device-proven — each remains a
  U7-002 device row (StrictMode, Fast Refresh, Suspense hide, re-render mid-exit, eviction).
- The stranded-exit guard's trigger (host ref → null on a Fast Refresh remount mid-exit) is
  inferred from RN/Expo source; verify the ref-detach actually fires in that order on device.
- SPINE-009 (identity across commits) stays device-pending — U9-002.

## 2026-06-11 — references preflight (read-only research + doc corrections, no code)

- Ran the `agents/references-preflight.md` protocol on the `35` handshake / `54` contract;
  fan-out over `references/{reanimated,react-native,expo}` (gesture-handler checked and
  dropped — eager teardown, no precedent). Verdict: **sound** — JS mount retention is
  Fabric's own differ semantics (no `Remove` for a retained child); Reanimated's commit hook
  serves only the no-wrapper, removal-inferred-exit case rule #7 forbids and fx's model
  excludes.
- Wrote `preflight.md` (this folder) — brief, per-reference file:line findings, synthesis,
  verdict, deltas.
- `35`: status line; two new invariants (stranded-exit guard, snapshot semantics); a new
  source-audit bullet (differ + mounted-only events); React-semantics table rewritten from
  open questions to resolved rules; two research questions struck as resolved; falsification
  open question annotated.
- `54`: snapshot-semantics sentence added to the lifecycle contract (rule owned by `35`).
- `decision-ledger.md`: SPINE-009 annotated (reinforced, still device-pending). SPINE-010
  untouched — flip trigger unchanged.
- `progress.md`: U7-001 row annotated (state stays `todo`; still blocked by U6-001).
- `structure.{ios,android}.md`: deliberately untouched — no per-platform mechanic changed;
  the handshake lives in `35`.

Next: when U6-001 unblocks, write the U7-001 task spec carrying the five FSM rules + the two
new invariants from `preflight.md`.
