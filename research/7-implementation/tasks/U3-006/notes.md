# U3-006 notes

## Unverified claims

- No shader implementation has started in this task yet.
- The device claims are unverified. Metal and AGSL rendering require the device gate.
- Android AGSL coverage for the original five ids is required by DOC-013, even though
  the current package exposes those ids only as iOS MSL shaders.

## What changed and why

- **Spec'd** — created `tasks/U3-006/README.md` from the implementation task template.
  The scope consumes FX-004 and REAL-004, and it starts from the committed U3-001
  hosted renderer slice.
- **Rules-gated** — the spec keeps shaders decorative on `hosted`, uses agnostic
  ids, keeps JS out of the frame loop, and rejects BYO/compiler/runtime-source work.
- **Watch-item carried from DOC-013 review** — U3-006 covers AGSL for all ten
  curated ids, not just native support for the five newly ratified ids. This keeps
  Android shader support from being half-scoped.
- **Device sequencing clarified** — implementation and headless checks can proceed
  in U3-006, but device verification batches with or follows U3-005 because rendered
  iOS pixels depend on REAL-002 metallib bundling, and rendered Android pixels depend
  on REAL-003 AGSL runtime reads.
- **Android fallback clarified** — below API 33, hosted shader selection degrades via
  the manifest to `{ via: 'none' }`, or to a preset-declared static fill fallback only.
  The implementation must not add an ad hoc fallback outside `structure.android.md`.
- **Progress linked** — `progress.md` now points the U3-006 row at this task folder
  and carries a detail block with checklist and proof.

Next: Implement U3-006 from the hosted shader renderer plan, then run headless checks
and prepare device proof.
