# Subtask protocol — how a blueprint unit becomes a verifiable subtask

A subtask **never justifies itself.** It traces up a fixed chain of authorities, each
owning exactly one question, with a strict precedence when they disagree. The blueprint
already hands you the anchors per unit (Contract · Precedent · Decision · flip-trigger);
this doc is the rule for turning a unit into a subtask and cross-checking it.

## The authority stack (top wins on conflict)

| Layer | Answers | Where | Authority |
|---|---|---|---|
| 1 · **Rules** | *What may I never do?* | `CLAUDE.md` (9 non-negotiables + the law) | **gate** — a subtask breaking one is wrong, full stop |
| 2 · **Contract** | *What must it do / why?* | the research doc(s) the unit cites; `02` is the vocabulary authority | **source of truth** |
| 3 · **Blueprint unit** | *What, in what order, mimic/use/adapt?* | `blueprint.md` (Decision + Depends-on + flip-trigger) | **dispatch** — a consumer of the research, not above it |
| 4 · **Platform mechanics** | *How on iOS/Android?* | `5-realization/structure.{ios,android}` (sole home for a mechanic) | per-platform realization |
| 5 · **Reference** | *What's the proven pattern?* | `references/<repo>` + `file:line`; `references/README.md` | **inspiration, lowest authority** — borrow the model, not the package |

**Precedence:** rules > contract (research) > blueprint > reference. If the blueprint and a
contract doc disagree, the contract wins (the blueprint is buggy). If a reference does
something the rules forbid, the rules win — that is what `reject` records.

## The cross-check protocol (per subtask, in order)

1. **Gate against the rules.** Native owns frames; the law (shape-native); reads-layout-
   never-writes (`04`); stays on Expo Modules (`05`/rule #7). A subtask that needs a C++
   commit hook or a hand-rolled spring curve is *breaching* — stop.
2. **Bind to the contract.** Open the unit's cited docs — that is the behavior spec. If the
   subtask isn't traceable to a cited doc, it is invented (never invent a unit without a
   contract anchor).
3. **Honor the decision.** Do the *sanctioned* thing — `mimic`/`adapt`/`use`/`fx-original`,
   not more. (Over-build creeps in here — e.g. mimicking RNGH's *whole* orchestrator when
   the decision says `adapt` a single recognizer.)
4. **Get the mechanic from `structure.*`.** The how-per-platform lives there, in one place —
   don't re-derive it in the subtask.
5. **Consult the reference last, for HOW only.** `references/` + the `file:line` shows the
   proven shape. It answers *how*, never *whether*.
6. **Check the verification frontier.** If the claim is `device-verify pending` (the doc's
   Open questions, the blueprint README's open targets, the `05` falsification test), the
   subtask ends in a **device check**, not a unit test.

## The one discipline that matters most

**References are the most seductive and the lowest authority.** The failure mode is "library
X does it with a C++ hook / worklets, so we will" — copying the *mechanism* because the
reference uses it. The chain prevents that: the reference is consulted *after* the rules and
the decision, and only for the *how* of an already-sanctioned `mimic`/`adapt`. The `reject`
column exists precisely to record "we understand this mechanism and deliberately don't adopt
it." **References answer HOW, never WHETHER.**

## Subtask template

Every subtask spawned from a unit carries its authority links, so its reviewer can verify it
against the same sources without re-deriving anything:

```
Subtask: <unit name> (blueprint Unit N)
- Contract anchors:  <the cited research docs — the behavior spec>
- Decision:          <use | mimic | adapt | fx-original | reject> + the flip-trigger
- Reference (HOW):   <references/<repo>/<path>:<line> — concrete; and what to REJECT from it>
- Guides:            <per-gate rulebooks (see § Each gate has a guide) + this protocol's Lifecycle>
- Rules gate:        <the CLAUDE.md rules this must not breach>
- Device-verify:     <the device-pending claim this must prove, or "none — pure">
- Done when:         <the contract is satisfied + rules honored + (if applicable) device-verified>
```

### Worked example — Unit 7 `FxPresenceCoordinator`

```
Subtask: FxPresenceCoordinator (blueprint Unit 7)
- Contract anchors:  35 (the FSM + deferred-unmount handshake), 42 (presence semantics),
                     54 (the visible-prop API), 04 (React owns the tree)
- Decision:          mimic the deferred-unmount PATTERN via JS-side mount retention.
                     Flip-trigger: a C++ hook only if fx ever drops the visible-prop model.
- Reference (HOW):   reanimated LayoutAnimationsProxy (WAITING→ANIMATING→DEAD) — adopt the
                     state pattern; REJECT its C++ UIManagerCommitHook + worklet runtime.
- Guides:            Code Style + Code Comments (the code); Testing (the headless FSM);
                     Device Verification (the rapid-toggle test); Contributing (merge bar).
- Rules gate:        #1 (native frames), #7 (no JSI/C++), #9 (defer unmount via handshake,
                     never seize the tree).
- Device-verify:     onTransitionEnd ordering under rapid visible toggles; coordinator
                     identity across Fabric commits (the 05 falsification test).
- Done when:         visible→false plays the exit on the wrapper and releases the child on
                     onTransitionEnd, with NO C++ commit hook, verified on device.
```

## Lifecycle and tracking

A unit becomes one or more **subtasks**; each is tracked through a fixed **lifecycle** and
reported as a single **state**. Keep the two separate — a task has eight checklist boxes but
exactly one current state.

### Lifecycle (the checklist inside a task)

```
spec'd → rules-gated → implemented → commented → headless-done → device-verified → reviewed → docs-closed → merged
```

Each box has an objective pass condition — the same rigor as a ledger close condition. "I
wrote a test" is not a gate; "the contract's edge cases are covered and green" is.
`device-verified` applies only to non-headless work (effects, animation, touch do not run
headless). The two human-only gates are `device-verified` and `merged`; an agent owns the
rest.

### Each gate has a guide (the cold-start kit)

A task file is **self-sufficient**: it links its **reference** (the precedent) and **guides**
(the per-gate rulebooks) so a fresh session can start from the file alone — no conversation
history needed. Each lifecycle gate has one binding guide:

| gate | binding guide |
|---|---|
| `implemented` | `guides/Code Style Guide.md` (Biome / swift-format; `.swift-format`, `.editorconfig`) |
| `commented` | `guides/Code Comments Guide.md` |
| `headless-done` | `guides/Testing Guide.md` |
| `device-verified` | `guides/Device Verification Guide.md` |
| `docs-closed` | `guides/Writing Style Guide.md` (when editing docs) |
| `reviewed` / `merged` | `guides/Contributing Guide.md` (the merge bar) |
| all gates | this file — § Lifecycle and tracking |

The **reference** is task-specific (a `references/<repo>/<path>:<line>` precedent, named in the
task); the **guides** are the same for every task — linked, never copied.

### State (the row-level status in `progress.md`)

One value per task — the current resting point:

```
todo · in-progress · blocked · headless-done · device-pending · docs-pending · ready-to-merge · merged
```

| furthest box reached | state |
|---|---|
| nothing started | `todo` |
| spec'd … commented | `in-progress` |
| headless-done | `headless-done` |
| awaiting the device gate | `device-pending` |
| device done, `Closes:` rows not yet true in source | `docs-pending` |
| all gates through `docs-closed` | `ready-to-merge` (= **complete**) |
| git integrated | `merged` |
| stuck on a dependency or an open ledger row | `blocked` |

### `complete` is not `merged`

- **complete** — every gate through `docs-closed` is satisfied (state `ready-to-merge`).
- **merged** — git integration happened.

A task can be complete and unmerged on purpose, when a coupled task must land with it. Track
completeness, not merge, as "done."

### The proof field (required on every task)

No vague "tested." Each task declares up front how every claim is checked:

```
Proof:
- headless: <command, or N/A>
- device:   <device scenario, or N/A>
- docs:     <source doc / ledger row that must change, or N/A>
```

This also splits the labor: an agent runs `headless` and `docs`; `device` is yours.

### The cardinal rule (closure)

> **A task cannot be `complete` unless every `Closes:` ledger row is true in its owning
> source doc** — not in `progress.md`, not in `data-layer.md`, not in the commit message.

`docs-closed` is exactly this gate. It is what stops plane-`7` work from laundering a
provisioned value into a source-of-truth decision.

### Task types (the lifecycle differs by type)

| type | what it is | dominant gates |
|---|---|---|
| `implement` | build a unit/subtask | the full code lifecycle |
| `ratify` | decide an open design call | source-doc decision + ledger close |
| `device-verify` | prove a provisioned value on a device | device evidence + propagate + close |
| `rework` | fix an internal inconsistency | source docs reconciled + ledger close |
| `doc-cleanup` | stale wording / source alignment | one doc edit + ledger close |

The ledger's reconciliation verbs map straight on: `propagate` → `doc-cleanup`;
`ratify`/`device-verify`/`rework` keep their names; `implement` is the build type with no
reconciliation analogue.

### Where it is tracked

- **`progress.md`** — the durable record. A **table** of one row per task (global state
  only), plus an inline **detail block** under the table for active or complex tasks (the
  full checklist + proof). Do **not** put checklist boxes as table columns — the table tracks
  status; detail blocks track work.
- **`tasks/<id>/`** — a folder only when a task accrues artifacts (device clips, a long
  ratify/rework write-up). Its `evidence/` holds the `device` proof; the detail block links
  to it. Trivial tasks stay a single table row. Escalate row → +detail block → +folder, by
  need.

Task ids are `U<unit>-<NNN>` (for example `U6-001`); a cross-cutting doc task with no native
unit takes a `DOC-<NNN>` id.

## Sources

- `CLAUDE.md` (the rules gate), `research/README.md` (the mental model + doc map), `blueprint.md`
  (the units + their anchors), `0-spine/04`/`05` (ownership + boundary), `references/README.md`
  (the explored findings the precedents cite).
