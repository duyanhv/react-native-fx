# DOC-005 notes

## What was ratified

- V1 presence presets: `transient` · `sheet` · `modal` (in `42` + `50` + `56`)
- V1 state preset: `lift` (in `56` + `41`)
- V1 state vocabulary for `lift`: `idle` · `selected` (in `57` + `41`)
- V1 feedback value: `native` (in `57` + `56`)
- Effect vocab already ratified by DOC-007 (no change)

## What stayed with MOT-001 (and why)

- Per-platform spring magnitudes (damping ratios, stiffness, durations, mass)
- Per-platform shapes (edge, origin, travel distances, measured tokens)
- The full `(preset × phase × platform)` catalog in `data-layer.md` §3

These are explicitly device-pending. The provisioning-is-not-closure discipline forbids
laundering them into a ratified decision. MOT-001 will validate on device and propagate to
`41`/`42`.

## What was checked but not changed

- `data-layer.md` §5 — values already matched the source docs; breadcrumbs already pointed to
canon. No change needed.
- `data-layer.md` §4 — base spring constants + formulas are already ratified; no change needed.

## Unverified claims

- None. This is a docs-only ratification.

## Next

MOT-001 device verification of the per-platform spring catalog, then propagate confirmed values
to `41`/`42` and close MOT-001.
