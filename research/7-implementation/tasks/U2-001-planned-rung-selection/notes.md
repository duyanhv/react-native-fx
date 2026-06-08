# U2-001 notes

## Unverified claims

None — headless task.

## What changed and why

- **Implemented `select()`** in `packages/src/manifest/select.ts` — pure function that walks
  a CapabilityNode's per-platform fallback ladder and returns the first satisfiable rung.
  Skips `status: 'planned'` and `status: 'out-of-scope'` rungs. Enforces OS gating,
  `wantInteractive` → `expo-view` substrate, and driver `target` matching. Degrades to
  `{ via: 'none' }` when no rung qualifies.

- **Populated `packages/src/manifest/types.ts`** with the full capability IR types from
  `02` (Platform, Substrate, Via, Asset, Clock, Phase, NodeKind, Status, Interaction,
  Lowering, UniformSpec, CapabilityNode, SelectCtx, CapabilityManifest). Previously a
  `// TODO` placeholder.

- **Created `packages/src/manifest/index.ts`** — barrel re-export of types and `select()`.

- **Created `packages/src/__tests__/manifest-select.test.ts`** — 17 Jest tests covering:
  basic selection, planned skipping, out-of-scope skipping, OS gating, `wantInteractive`
  enforcement, driver target matching (default + explicit), empty ladder degrade,
  all-guarded-out degrade, non-driver nodes ignore target. Uses an inline fixture manifest.

- **Created `packages/jest.config.js`** — extracted jest config from `package.json` to
  resolve react-native jest-preset ESM import issue with `transformIgnorePatterns`.

- **Updated `02-capability-ir-and-lowering.md`** — added `if rung.status == 'planned': continue`
  to the selection rule pseudocode.

- **Resolved SPINE-013** in decision-ledger.md.

## Next: reviewed + merged (human gates)
