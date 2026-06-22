# DOC-022 — V1-cut closeout sweep

Type: `ratify` + `doc-cleanup` · State: `merged` · Device: no (citation-close only) · Consumes: — · Closes: RT-012, RT-003 · **The V1-cut bookkeeping pass**

> **Done (maintainer-ratified, 2026-06-13).** Both dispositions ratified; RT-012 + RT-003
> resolved in their owning docs + the ledger; `35`'s stale `05`-falsification question struck;
> `v1-cut-checklist.md` written; the stale merge batch ticked and U3-007 A1-2 waived. See the
> §Decision below and [`notes.md`](./notes.md).

Origin: the V1-cut plan, item 2. With Units 1–9 done and DEF-015 ratified, sweep the
remaining open ledger rows to a V1 disposition, strike stale open questions in the owning
docs, and write a standing V1-cut checklist that makes every waiver and remaining gate
explicit. This is bookkeeping — no new design, no new code.

## The two dispositions to ratify

### RT-012 — does the presence handshake generalize? (`35`)

`35` open question: *"Whether this generalizes beyond presence to a general 'native-eased
declarative state' primitive, or stays presence-specific in V1."* The ledger close condition
already reads *"V1 stays presence-specific unless demand appears."*

- **Proposed disposition:** **V1 stays presence-specific.** No general declarative-state
  primitive ships in V1; the generalization is V2, trigger-gated as **DEF-012** (trigger:
  real declarative-state demand). Strike the `35` open question into a one-line resolved note;
  flip RT-012 `open → resolved`; re-point DEF-012 from "closes RT-012" to a trigger-gated V2
  exploration (the pattern used for RT-006→DEF-019).
- **Also caught (doc-cleanup):** `35`'s *first* open question — the `05` falsification test —
  is already closed by **SPINE-009 (U9-002, device-proven-by-citation)**. Strike it too and
  point at `05`/U9-002.

### RT-003 — GPU-loop device items (`31`)

`31` has three needs-device open questions. Each is already answered on device by a shipped,
maintainer-ratified gate — this is a **device-proven-by-citation** close (the U9-002 pattern),
which only the maintainer can ratify:

| `31` open question | Proposed answer | Device citation |
|---|---|---|
| One queue per view vs device-shared singleton | **device-shared singleton** | U4-003 (shared static device/queue/pipeline) + EX-002 (1 `MTLDevice` + 1 `MTLCommandQueue` process-wide under the 100-cell stress) |
| Drawable-on-resume with no stall | **fresh drawable on resume, no stall** | U3-008 GPU-resume PASS (+ `31` Decision 1 mandatory-pause / fresh-drawable-on-resume) |
| On-demand vs continuous for the press/uniform path | **continuous-while-active is cheap; no on-demand burst needed** | RT-006 (U8-001): ≥30 s rapid tap+drag, no jank, gfxinfo 1.23%, 0 missed vsync, loop pauses off-window |

- **Proposed disposition:** record the three answers in `31` (open questions → resolved);
  flip RT-003 `device-pending → resolved` by citation; **awaiting maintainer ratification of
  the citation-close** (planner does not tick device truth). Residual continuous-drag path
  stays with RT-002/DEF-011 (V2).

## The standing V1-cut checklist (the deliverable)

Write `research/7-implementation/v1-cut-checklist.md` — a short standing doc, linked from
`progress.md` and `HOW-TO-CONTINUE.md`. It must make explicit:

- **Every open/device-pending ledger row → its V1 disposition** (resolved, or V2-deferred with
  a named DEF task + trigger). After this task, no V1-scoped row stays `open`.
- **The genuine remaining gate (NOT waived):** **U3-007** — iOS `symbol` OS-degradation rows
  (A1-2) need a real iOS 17 / sub-17 device; the maintainer chose not to waive. This is the one
  outstanding device gate in the V1 cut.
- **The `ready-to-merge` merge-tick batch** awaiting the maintainer's tick: DOC-006, DOC-009,
  DOC-011, DOC-012, U3-004, U9-001, U9-002 (and U3-002's `docs-closed` state cell, which is not
  a legend state — verify/normalize it).
- **The explicit waivers:**
  - U8-002 per-platform-redundant rows (Android pager + raw RNGH-`Pan` hand-rows; the iOS
    hard-case rows) — the same recognizer mechanism already proven on the other platform;
    maintainer's close-bar call, not re-run.
  - **iOS-sim-doesn't-render-stitchable-shaders** — the curated `[[stitchable]]` shaders render
    only on a physical iPhone; iOS shader *visual* ratification must run on hardware (the iOS
    sim verifies wiring/touch, not pixels). *(Premise corrected 2026-06-18 — the hosted-path
    catalog does render on the Apple-silicon sim; DEF-014 + DEF-017 confirm. See the reconciled
    waiver in `v1-cut-checklist.md`; hardware now proves only A15 GPU perf/fidelity.)*
  - U3-008 residuals (interactive-glass VoiceOver reachability; TalkBack demo) — noted, needs
    AX/TalkBack-equipped devices; merged with the residual recorded.
  - **Android `expo-view` interactive-shader rendering is a documented V1 gap** (EX-002:
    `FxSurfaceView.kt` renderer is a deferred TODO) — not a defect; the interactive Android
    renderer is post-V1. State the user-facing degradation honestly.

## Subtask

- Contract anchors:  `4-runtime/35` (RT-012 — the handshake/state owner), `4-runtime/31`
                     (RT-003 — the GPU-loop/lifecycle owner), `decision-ledger.md` (the rows),
                     `0-spine/05` (the falsification test SPINE-009 closed).
- Decision:          `ratify` the two dispositions + `doc-cleanup` the stale open questions;
                     produce the standing checklist. No ledger row of its own beyond the two
                     it closes.
- Reference (HOW):   none — internal bookkeeping.
- Guides:            `Writing Style Guide.md`.
- Rules gate:        none breached — docs + bookkeeping only.
- Device-verify:     none new — RT-003 closes by citation to already-ratified gates; the
                     maintainer ratifies the citation-close (planner does not tick device truth).
- Done when:         RT-012 + RT-003 resolved in their owning docs and the ledger; the stale
                     `35` open questions struck; `v1-cut-checklist.md` written and linked; no
                     V1-scoped ledger row left `open`.

## Proof

- headless: N/A — docs + bookkeeping.
- device:   N/A new — RT-003 is a citation-close over U4-003/EX-002/U3-008/RT-006 (maintainer
            ratifies); U3-007 stays the one open V1 device gate, surfaced in the checklist.
- docs:     `35` (RT-012 + the SPINE-009 strike), `31` (RT-003 ×3), `decision-ledger.md`
            (RT-012, RT-003, DEF-012 re-point), `v1-cut-checklist.md` (new), `progress.md` +
            `HOW-TO-CONTINUE.md` (link the checklist).
