# U7-002 — the presence catalog on device: fill, law-test, and the carried rows

Type: `device-verify` · State: `todo` (spec'd) · Device: `yes` · Consumes: — · Closes: MOT-001 (**device-gated** — see Closure) · Blocked by: — (U7-001 merged 2026-06-12)

## Start here

1. **This file** — the work order (spec'd by the planner, 2026-06-12).
2. **`../U7-001/evidence/device.md`** — the handshake gate this builds on. The handshake,
   event ordering, deferred unmount, and reduce-motion are PROVEN — do not re-run them as
   goals; this task owns the *feel* and the five React-semantics rows.
3. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and
   tracking · **`guides/Device Verification Guide.md`**.

## Authority links

```
Subtask: the per-platform presence default catalog (blueprint Unit 7, the device-truth
         half) — turn the provisional `transient` rows into device-validated values that
         pass the law test, prove the five React-semantics rules on device, and land the
         two bounded fixes carried from U7-001.
- Contract anchors:  research/3-motion/42-presence-and-lifecycle.md §The per-platform
                     default catalog (the deliverable table: one row per preset × phase,
                     fields source/shape/timing per platform) + §The envelope,
                     research/3-motion/41-motion-vocabulary.md (the shape-native law +
                     its OPERATIONAL TEST: a nameable platform source, no uniform
                     invention, native-component parity; Decision 11 — springs authored
                     as platform tokens: iOS duration/bounce, Android SpringForce
                     stiffness/dampingRatio or M3 tokens where present),
                     research/4-runtime/35-view-state.md §React-semantics edge cases
                     (the five resolved rules — each row says exactly what the FSM must
                     do; this task proves each on device),
                     data-layer.md §Presence presets (the provisional transient rows
                     marked [device-pending] — the values under test),
                     research/5-realization/structure.{ios,android}.md §presence presets
                     (where confirmed values get pinned; Android notes the M3
                     MotionScheme upgrade is library-gated — REAL-001's pin — and the
                     POCO has no M3, so standard SpringForce values are what this task
                     fills), decision-ledger.md MOT-001 (close condition: the catalog
                     filled on device and parity-checked against each platform; its
                     sheet/modal rider stays deferred — see Closure).
- Decision:          the law decides tuning direction — each (preset × phase) row must
                     mirror a NAMEABLE platform behavior (iOS: the system banner;
                     Android: the Material snackbar), staying inside the platform's own
                     spring family. Prefer the platform default; adjust only what the
                     side-by-side comparison against the real platform component
                     demands, and record every adjusted value as a platform token.
- Reference (HOW):   compare against the REAL components on device (trigger a system
                     banner / a Material snackbar) — the law test is parity with them,
                     not taste. The U7-001 presence screen is the harness; extend it,
                     do not rebuild it.
- Guides:            Device Verification (the runs); Code Style + Comments (the bounded
                     fixes — NO planning-artifact refs in shipped comments, the U7-001
                     round-1 lesson); Testing (any new Tier-1 cases); Writing Style
                     (the docs propagation is the PLANNER's at docs-closed — you write
                     evidence + notes only).
- Rules gate:        #2 THE LAW IS THE TASK — platform-native defaults, no
                     cross-platform-uniform invention; #1 tuning never adds per-frame
                     JS; #9 values change transform/opacity magnitudes only, never
                     layout. Driver changes are bounded to passing spring parameters
                     through — the U6-001/U6-002-proven retarget mechanics must not
                     change (re-run a basic retarget after any driver touch).
- The work (five parts, BOTH platforms unless noted):
                     1. CATALOG FILL — for transient × {enter, exit, hold}: confirm or
                        adjust shape (edge, travel magnitude, fade) and spring (iOS
                        unified-spring duration/bounce; Android SpringForce stiffness/
                        dampingRatio tokens) side-by-side against the named platform
                        source. Record each row's source/shape/timing exactly per the
                        catalog table fields. If a value differs from the platform
                        default spring, plumb it as a parameter from the coordinator to
                        the driver (bounded — defaults stay the platform family).
                        Exit must be the idiomatic platform dismiss, not a blind
                        reverse — judge it against the real component's dismissal.
                     2. THE FIVE REACT-SEMANTICS ROWS — prove each `35` rule on device:
                        StrictMode (dev build, double-invoked effects — no double
                        enter/exit, no phantom events); Fast Refresh mid-exit (edit →
                        remount — the stranded guard releases, no leak, no event);
                        Suspense/offscreen hide (a hide is a hold — no FSM edge fires);
                        re-render mid-exit (parent re-render with changed child props —
                        the exiting snapshot does not update, config applies next
                        phase); list eviction (FlatList scrolling a presence cell out —
                        no phantom exit, no crash, clean recycle). Each: PASS/FAIL +
                        observed log.
                     3. FIRST-MOUNT TRANSLATE FIX (carried from U7-001) — the first
                        prop batch can precede layout, so measured travel resolves 0
                        and the first enter only fades. Fix bounded to the coordinator/
                        surface seam (e.g. defer the initial appear-enter until the
                        first layout observation lands, or re-seat the away vector on
                        first layout if still entering from a zero-travel seat). Prove
                        on device: a fresh mount's enter visibly translates.
                     4. HARNESS FIX (carried) — the presence screen's log list keys by
                        index and collides past 8 entries (LogBox warning); key
                        monotonically. One line, example-only.
                     5. PARITY CHECK — after tuning, run the two platforms side by side:
                        same behavior intent, platform-divergent shape (iOS top banner
                        vs Android bottom snackbar) — divergence is CORRECT under the
                        law; sameness through accident is what to catch.
- Device-verify:     iOS 17+ (sim acceptable, established precedent) + physical
                     Android. Write evidence/catalog.md: the filled catalog table
                     (every field, marking which values changed from provisional and
                     why), the five React-rows with logs, the first-mount fix proof,
                     recordings local/gitignored.
- Closure:           MOT-001 closes ONLY on the planner's review after the maintainer
                     ratifies: the V1 catalog (transient) filled + law-tested. Its
                     sheet/modal rider stays DEFERRED (trigger: presence-under-
                     navigation settled) — the planner re-homes that rider at closure;
                     you do not touch the ledger. Do not tick device-verified/merged.
                     Value propagation (data-layer rows un-marked, `42`/`41` device
                     notes, structure.* §presence-presets pins) is the planner's at
                     docs-closed — your evidence is the input.
- Done when:         evidence/catalog.md complete (catalog + five rows + fix proofs);
                     the bounded fixes shipped with gates green (tsc/build/lint/test/
                     swift:lint + both native builds; a U6-era basic retarget re-run if
                     the driver was touched); tree clean except code-fixes + evidence +
                     notes; notes.md updated with results, unverified claims, "Next:".
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-12)
- [ ] rules-gated
- [ ] implemented (the bounded fixes + any spring-param plumbing)
- [ ] commented
- [ ] headless-done
- [ ] device-verified (human gate — the catalog + the five rows ratified)
- [ ] reviewed
- [ ] docs-closed (MOT-001 per Closure; values propagated to data-layer/`42`/`41`/structure.*)
- [ ] merged (human gate)

## Proof

- **headless:** the standard package gates + both native builds; new Tier-1 cases only if
  the fixes add pure logic.
- **device:** `evidence/catalog.md` — the filled catalog (law-tested, parity-checked), the
  five React-semantics rows, the first-mount translate proof.
