# U13-001 — working notes

Executor fills this during the build: unverified claims, framework unknowns, device-tuned
feedback magnitudes (iOS press-in scale/opacity; Android ripple bounds), and anything the
host-protocol refactor surfaces about the shared FSM.

## Open at spec time
- Exact iOS press-in scale/opacity magnitudes — device-tuned at the gate (the `56`/`57` open
  question; defaults ride this unit, as `transient` rode MOT-001).
- The precise host-protocol surface (method/closure shape) — pin in `structure.{ios,android}.md`
  before building; keep the existing `<Fx interactionMode>` host behavior byte-identical.
