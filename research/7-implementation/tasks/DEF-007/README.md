# DEF-007 — BYO intro/outro envelope declaration (MOT-008)

Type: `ratify` · State: `merged` · Device: `no` · Consumes: — · Closes: MOT-008 ·
Blocked by: — (V2)

## The decision (resolved by composition, maintainer-ratified 2026-06-14)

**Resolved by composition — the premise is false.** MOT-008 asked how a BYO author declares an
intro/outro envelope "not hardcoded to the curated glow." Checking the shipped path showed there
is **nothing hardcoded to un-hardcode**: fx bakes no shader-internal intro/outro envelope for
curated effects either. Curated shaders animate off native `time` + an eased `intensity` uniform;
whole-surface appear/disappear is the `FxPresence` wrapper envelope (transform/opacity).

So a BYO author already has **full parity by construction**, through the same three channels
curated effects use:
1. **Whole-surface lifecycle** → wrap `<Fx>` in `FxPresence` (the platform-native enter/exit
   transform/opacity envelope).
2. **Self-contained shader animation** (the "intro reveal driven by `time`") → the author's
   `.metal`/`.agsl` reads native `time` and animates freely.
3. **Parameter reveals / one-shots** → declare semantic uniforms (`registerShader`), drive them
   with discrete targets eased by `transition`, re-fire bursts via `triggerKey`/`version`.

This is **resolved by composition, not deferred-until-demand**. There is no BYO
envelope-declaration mechanism and no reserved reveal/lifecycle uniform. A future reserved
lifecycle uniform would be a *new feature* that must apply to curated shaders too (else BYO would
get a mechanism the core catalog does not use); if a concrete BYO intro ever proves inexpressible
by the three channels, that is the trigger for a fresh row, not a gap here.

## Authority links

```
Subtask: ratify the BYO intro/outro envelope question (MOT-008).
- Contract anchors:  40-motion-reactivity-and-data-flow.md (the envelope/data-flow contract
                     + the one-shot trigger model; owns the open question), 34-animation-
                     driver.md (the driver — carried the companion open question), 22-shaders.md
                     (the BYO registration contract + runtime behavior), decision-ledger.md
                     MOT-008. Verification: the shipped FxShaderView/FxSurfaceView/
                     FxPresenceCoordinator path (curated = time + intensity + wrapper envelope;
                     no baked shader-internal envelope).
- Decision:          ratify "resolved by composition — no BYO envelope mechanism, no reserved
                     lifecycle uniform; parity via the three existing channels." Charter-
                     consistent (rule #1: native owns the envelope math off time/the driver).
- Rules gate:        #1 (native owns the frame loop / envelope math; JS sets discrete targets).
- Device-verify:     none — pure ratify (no code).
- Done when:         MOT-008 closed in 40 + 34 (the owning docs) + the ledger; the three-channel
                     contract documented in 40 + 22.
```

## What was recorded (docs-closed)

- `40-motion-reactivity-and-data-flow.md` — the BYO-envelope open question struck and replaced
  with the three-channel composition contract + the false-premise finding + the "not
  deferred-until-demand" wording.
- `34-animation-driver.md` — the companion open question struck; points to `40`'s contract.
- `22-shaders.md` — Runtime behavior gains a BYO lifecycle/intro-outro note (composed, never a
  baked envelope; parity by construction).
- `decision-ledger.md` — MOT-008 `open` → `resolved` (resolved-by-composition, false premise).

No source code touched (the decision is that the runtime model already covers it).

## Lifecycle

- [x] spec'd (planner, 2026-06-14)
- [x] rules-gated (#1 — the decision honors native-owned envelope math)
- [x] ratified (maintainer — resolved by composition, 2026-06-14)
- [x] docs-closed (planner, 2026-06-14 — `40` + `34` open questions; `22` runtime behavior;
      ledger MOT-008 resolved)
- [x] reviewed (planner, 2026-06-14 — no separate doc; self-evident ratify, per the
      DOC-002/003/005 convention)
- [x] merged (maintainer-authorized, 2026-06-14 — on integration/0.1.x, this commit)

## Proof

- **headless:** N/A (no code).
- **device:** N/A (pure ratify).
- **docs:** MOT-008 true in its owning docs (`40` + `34` § Open questions) and closed in the
  ledger; the three-channel contract documented in `40` + `22`.
