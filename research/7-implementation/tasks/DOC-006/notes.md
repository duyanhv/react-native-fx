# DOC-006 notes

## What was ratified

- `FxGroup` cross-item morph scope is **glass-only in V1** (`57` Decision 6, `21` Decision 5).
- **iOS 26+ only** — uses the system's `GlassEffectContainer` for morphing.
- **Merge-threshold / `spacing` contract is system-owned in V1** — no explicit `spacing` prop; deferred to V2.
- **Below iOS 26** — no morphing; individual glass views via `.ultraThinMaterial` fallback.
- **Android** — no morphing; uses its own material/blur fallback (exact mechanic owned by `structure.android.md`).
- No other effect nodes (`fill`, `shader`, `symbol`, `filter`) support cross-item morph in V1.

## Source doc changes

- `57-content-primitives.md`:
  - Added Decision 6: `FxGroup` morph scope is glass-only in V1.
  - Struck the `FxGroup` morph scope open question (resolved).
- `21-materials-and-glass.md`:
  - Added Decision 5: `FxGroup` merge contract is system-owned in V1; glass is the only morphable effect.
  - Struck the `FxGroup` merge contract open question (resolved).
- `data-layer.md` §10:
  - Updated the provisioned-candidate header to ratified status (SURF-006 resolved).
- `decision-ledger.md`:
  - SURF-006 row flipped to `resolved` with closure condition grounded in `57`/`21`.

## Unverified claims

- None. This is a docs-only ratification.

## Next

Task complete; SURF-006 closed in source. Maintainer review + merge.
