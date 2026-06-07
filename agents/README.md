# agents — AI collaboration protocols

These files define how an AI agent starts, executes, and ends a session. Read in order:

1. [`session-protocol.md`](./session-protocol.md) — start and end a session
2. [`task-execution.md`](./task-execution.md) — execute a task by type
3. [`device-handoff.md`](./device-handoff.md) — prepare work for device verification

The authority chain (rules > contract > blueprint > reference) lives in [`research/7-implementation/subtask-protocol.md`](../research/7-implementation/subtask-protocol.md). These files reference it; they never redefine it.

The decision ledger is at [`research/7-implementation/decision-ledger.md`](../research/7-implementation/decision-ledger.md). Every task references ledger rows it consumes and closes.

The task list is at [`research/7-implementation/progress.md`](../research/7-implementation/progress.md). It is the durable record of build execution.

## Anti-patterns

- **Do not start random work.** Read `progress.md`, open the active task, state what you're doing.
- **Do not close a ledger row in progress.md.** Source docs close rows; progress reports them.
- **Do not skip the device gate.** Effects, motion, and touch do not run headless.
- **Do not hand-format code.** The formatters own whitespace (see [`guides/`](../guides)).
- **Do not load the entire research folder.** Load only the docs cited by the active task.

## Required reading (first session)

1. `CLAUDE.md` — the non-negotiable rules
2. `research/README.md` — the mental model and doc map
3. `research/7-implementation/blueprint.md` — the build order
4. `research/7-implementation/architecture.md` — how the pieces connect
5. `research/7-implementation/decision-ledger.md` — what's still open
6. `research/7-implementation/progress.md` — what's being built
7. The guide that owns the work (see `CLAUDE.md` operating rules)
