# Cold-start prompt — kick off an agent on the next task

Paste the block below verbatim into a fresh agent session. It self-selects the next task from
`research/7-implementation/progress.md`, so the same text works every session. It is a launcher,
not a copy of the procedure — it points the agent at the binding docs (`CLAUDE.md`, `agents/`,
`guides/`, the protocols) and restates the load-bearing rules. To force a specific task, append
`Task: <id>.` to the end.

```
Resume react-native-fx implementation. Follow the repo's own protocol — do not freelance,
and do not over-build.

READ, IN ORDER (binding; they override your defaults):
1. CLAUDE.md — the 9 non-negotiable rules + the law + Operating rules. agents/ and guides/
   are strictly enforced at the implemented / commented / reviewed gates.
2. agents/session-protocol.md — the start / during / end sequence. Then follow it.
3. research/7-implementation/progress.md — the tracker. Find the FIRST `in-progress` task;
   if none, the first `todo` whose `blocked by` is satisfied. THAT is your task. State which
   task you're on and your intended action before doing any work.
4. research/7-implementation/subtask-protocol.md — the authority stack, the cross-check
   protocol, the Lifecycle, the proof field, the task types, and the closure rule.

OPEN THE TASK:
- If tasks/<id>/ exists, open its README/task.md — a self-sufficient cold-start kit. Start there.
- If it does NOT exist, SPEC it first: create tasks/<id>/README.md from the subtask template,
  filling authority links from blueprint.md (the unit), decision-ledger.md (the row it Closes/
  Consumes), architecture.md / data-layer.md (provisioned structure + names), and the cited
  research docs. spec'd is a gate; pass it before coding.

LOAD ONLY WHAT'S CITED — not the whole research/ or references/ tree, only the docs the task,
its blueprint unit, and its ledger row name. Authority order on conflict:
rules > contract (research docs) > blueprint > platform mechanics
(research/5-realization/structure.{ios,android}.md — the SINGLE home for any per-platform
mechanic; pin it there before building, never re-derive it in the task) > architecture/data-layer
(consumers) > references (lowest authority — borrow the proven shape, never a mechanism a rule
forbids; honor `reject`).

GUIDES (binding, per gate — read the one for the gate you're on):
- guides/Code Style Guide.md   — naming + declaration (Fx-prefixed native classes, full words,
  verb-led functions, explicit return / access level / typed imports; file name = primary export).
  Do not hand-format; the formatters (Biome / swift-format) own whitespace.
- guides/Code Comments Guide.md — comment the iceberg (why / constraint / threading), third-person
  declarative. Do NOT document every function — trivial ones (simple overrides, inits, obvious
  accessors) stay bare, as they do in references/. NEVER reference internal planning artifacts in
  code comments: no research-doc paths, ledger ids, build-unit ids, or doc-section refs.
  Cross-reference code symbols and sibling source files only.
- guides/Testing Guide.md      — Tier-1 headless for logic/data/FSM; Tier-3 for build verification.
- guides/Device Verification Guide.md — when the task is device:yes.
- guides/Contributing Guide.md  — commands and the merge bar.
- guides/Writing Style Guide.md — when editing docs.
- For any naming, declaration, or comment idiom the guides leave ambiguous, match the cloned
  reference repos in references/ (Expo, React Native, gesture-handler, Reanimated, Nitro) — they
  are the ground truth the guides abstract.

GATE AGAINST THE HARD RULES FIRST (stop if the change breaches one): #1 native owns the frame loop
(no per-frame JS); #2 agnostic names, platform-native defaults; #3 two substrates; #7 Expo Modules +
Fabric only — NO JSI / C++ / HybridObject; #9 reads layout, never writes it. Keep the existing
FxShaders.metal pixels. A `mimic` means the pattern, not the whole library; honor `reject`/`use`/`adapt`.

VERIFY (bun workspace — `bun install` at root first, then from packages/):
  bunx tsc --noEmit · bun run build · bun run lint (Biome) · bun run swift:lint  (+ bun run test)

Drive the task through its lifecycle to the last AGENT-ownable gate for its type
(subtask-protocol §Task types): `implement` -> headless-done (build/tsc/lint green); `ratify`
-> the decision recorded in its source doc + the ledger row closed; `rework`/`doc-cleanup` ->
the source docs reconciled + ledger closed; `device-verify` -> the device scenario written up
for the human. Effects/animation/touch/layout/lifecycle never run headless — write the device
scenario, don't fake the gate.

THEN, per the session protocol's end sequence: update progress.md's state, tick the task
checklist, log changes + unverified claims + a one-line "Next:" in tasks/<id>/notes.md, run lint
if code changed, and do not open random files. THEN STOP for review.

Two gates are the human's — `device-verified` and `merged`. Never tick them. And never close a
`Closes:` ledger row unless its condition is genuinely true in the OWNING source doc (the cardinal
closure rule — provisioning is not closure).

To force a specific task instead of auto-selecting, append: Task: <id>.
```
