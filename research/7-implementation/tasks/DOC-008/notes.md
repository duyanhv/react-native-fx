Unverified claims:

- iOS symbol rendering is not implemented or device-proven by DOC-008. U3-001 owns the later iOS symbol implementation and device proof.
- Android symbol rendering is intentionally deferred; AVD/Lottie rungs remain planned and non-selectable.

Changes:

- Created the DOC-008 task spec with authority links, lifecycle, proof, and scope guards.
- Updated `24` to ratify iOS-only V1 symbol support and defer Android AVD/Lottie.
- Updated `structure.android.md` to mark Android symbol support planned/deferred from V1.
- Updated `data-layer.md` so Android symbol rungs are `status: 'planned'` and D4 is resolved.
- Marked FX-009 resolved in `decision-ledger.md`.
- Moved DOC-008 to `ready-to-merge` and removed DOC-008 as a U3-001 blocker in `progress.md`.
- Updated U3-001 docs and notes: shader implementation remains blocked by U3-006; iOS symbol scope is unblocked but still needs implementation/proof.

Next: Review DOC-008, then implement/prove the iOS symbol path for U3-001 after U3-006 or alongside it if the renderer work is split.
