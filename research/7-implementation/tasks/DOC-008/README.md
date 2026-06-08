# DOC-008 — Android symbol scope ratification

2-effects · type: `ratify` · state: `ready-to-merge` · device: no
Consumes: — · Closes: FX-009 · Blocked by: —

> **Next action (resume here):** review DOC-008, then start the U3-001 symbol implementation
> path with iOS-only proof.

DOC-008 closes the Android `symbol` scope decision. `symbol` ships in V1 only on iOS through
the hosted `.symbolEffect` path. Android AVD/Lottie support stays planned/deferred; those
rungs stay documented but non-selectable until a future implementation and asset contract
land.

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: Android symbol scope ratification
- Contract anchors:  24 (symbol semantics), structure.ios.md §symbol,
                     structure.android.md §symbol, data-layer.md D4.
- Decision:          ratify iOS-only V1 symbol support. Android AVD/Lottie remains
                     planned/deferred and must not be runtime-selectable in V1.
- Reference (HOW):   SF Symbols / `.symbolEffect` on iOS. Android AVD/Lottie are named
                     only as future lowering choices. REJECT adding a Lottie dependency,
                     Android asset contract, or Android symbol renderer in this task.
- Guides:            Writing Style Guide, Contributing Guide, subtask protocol.
- Rules gate:        #1 (native owns frames), #2 (one agnostic vocabulary), #5
                     (curated effect surface, not app-authored shader/component work),
                     #7 (Expo Modules + Fabric), #9 (no layout writes).
- Device-verify:     none for ratification. U3-001 owns later iOS symbol rendering proof.
- Done when:         24 and structure.android agree that Android symbol is deferred;
                     data-layer marks Android symbol rungs planned; FX-009 is resolved.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] source docs reconciled (`24`, `structure.android.md`, and `data-layer.md`)
- [x] Android symbol rungs kept non-selectable for V1
- [x] ledger FX-009 closed
- [x] docs-closed
- [ ] reviewed
- [ ] merged

`device-verified`: N/A — this task is pure source-doc ratification.

## Proof

- **headless:** `git diff --check`.
- **device:** N/A.
- **docs:** `24` pins iOS-only V1; `structure.android.md` marks AVD/Lottie planned/deferred;
  `data-layer.md` marks Android symbol rungs `status: 'planned'`; `decision-ledger.md`
  marks FX-009 resolved; `progress.md` moves DOC-008 to `ready-to-merge` and removes it
  as a U3-001 blocker.

## Work

1. Ratify symbol scope in `24`: iOS `.symbolEffect` is the V1 shipped path.
2. Defer Android symbol support: AVD/Lottie are future lowering choices, not V1 runtime
   behavior.
3. Reconcile `structure.android.md` and `data-layer.md` so Android symbol rungs are planned.
4. Close FX-009 after the owning source doc is true.
5. Update U3-001 tracking so DOC-008 is removed as a blocker; iOS symbol implementation
   and proof remain U3-001 work.

## Scope guard

- Does NOT implement iOS symbol rendering.
- Does NOT implement Android AVD or Lottie rendering.
- Does NOT add a Lottie dependency, optional peer metadata, or asset registration contract.
- Does NOT close SPINE-007; the package/version naming convention for `via:'lib'` remains
  owned by DOC-002.

## Done when

- FX-009 is `resolved` in `decision-ledger.md`.
- DOC-008 is `ready-to-merge` in `progress.md`.
- U3-001 is no longer blocked on DOC-008.
