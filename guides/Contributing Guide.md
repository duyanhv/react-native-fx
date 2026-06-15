# react-native-fx Contributing Guide

This guide is the working reference for contributing to react-native-fx: the toolchain, the commands for each platform, and the expectations a change has to meet before it merges. It is the operational companion to [CLAUDE.md](../CLAUDE.md), which holds the non-negotiable architecture rules.

For how to format and name code, read the [Code Style Guide](./Code%20Style%20Guide.md). For comments, the [Code Comments Guide](./Code%20Comments%20Guide.md). For prose, the [Writing Style Guide](./Writing%20Style%20Guide.md).

## Contributing as a human

fx is built by AI agents working a strict protocol: each feature is a task in [research/7-implementation](../research/7-implementation), driven through a fixed lifecycle against the [agents](../agents) docs and the research source of truth. That machinery governs how the architecture gets built, decision by decision. You do not need it for a drive-by fix.

- **A small change** — a typo, a bug fix, a doc correction, a missing test — needs none of the task lifecycle. Branch, make the change, run the checks below, and open a pull request. The bar in [Before you open a pull request](#before-you-open-a-pull-request) is the whole gate.
- **A change that resolves a design question or alters a capability** touches the research source of truth, so it follows the research path. Start with [research/README.md](../research/README.md) for the mental model, find the doc that owns the area you are changing, and close the loop per [Documentation closure](#documentation-closure). The [decision ledger](../research/7-implementation/decision-ledger.md) tracks what is still open.

The [agents](../agents) folder is the protocol those AI agents follow. Read it to understand how the repo is built, but you are not bound to run an agent "session" to contribute.

## Toolchain

fx pins its toolchain so every contributor builds against the same versions:

- **Bun** is the package manager and task runner — `bun@1.3.14`, pinned in the root **package.json**.
- **Node** 22.11 or newer.
- **Xcode** 26 or newer for the iOS build and the bundled swift-format.
- **Expo SDK 56** and **React Native 0.85** — the version matrix in [research/6-ship](../research/6-ship). Re-pin against this matrix before relying on version-specific behavior.

Install once from the repo root:

```sh
bun install
```

## Commands

The repo is a Bun workspace. Run the workspace-wide scripts from the root, and the library scripts from inside **packages**.

### Workspace root

```sh
bun run build       # build the library
bun run lint        # lint and format-check everything CI checks
bun run test        # run the test suite
bun run example     # start the dev-harness app
bun run example:ios # build and run the example on iOS
```

### TypeScript

Biome owns lint and formatting (see the [Code Style Guide](./Code%20Style%20Guide.md)). From inside **packages**:

```sh
bun run lint          # check (this is what CI runs)
bun run lint --write  # fix and format in place
```

### Swift and Metal

From inside **packages**:

```sh
bun run swift:format  # rewrite tracked .swift files in place
bun run swift:lint    # check without modifying (this is what CI runs)
```

### Android

Android lands later. When it does, it gains a `gradlew spotlessApply` formatting step wired into the same per-platform command pattern (see the [Code Style Guide](./Code%20Style%20Guide.md)).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org). The type prefix is required; the scope is optional but encouraged.

```
feat(shader): add the Aurora curated shader
fix(ios): pause the render loop when the view leaves the window
docs(research): correct the lowering manifest schema
chore: pin bun to 1.3.14
```

Common types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`. Keep the subject in the imperative mood and under about 70 characters. This is the same convention the reference libraries — Nitro, Reanimated, react-native-runtimes — follow, and it lets the changelog be generated from history.

## Before you open a pull request

A change is ready when:

- **The checks pass.** `bun run lint`, `bun run swift:lint`, and `bun run test` are all green. A type error is a build failure, not a warning.
- **New behavior has a test,** or the PR says why it cannot have one. Borrow Nitro's discipline: a bug fix ships with the failing test it fixes.
- **You verified on a device.** Effects do not run headless — neither Metal nor the hosted renderers. A change that touches rendering, interaction, or motion has to be seen running on a device or simulator, and the PR should say so (see [CLAUDE.md](../CLAUDE.md)).
- **The diff is tight.** No stray `console.log`, no commented-out code, no unrelated reformatting or refactor riding along. Keep the change to its purpose.
- **The docs moved with the code.** If you changed a surface, update the skill reference. If you resolved a research question, fold the finding into the doc that owns it.

### Documentation closure

fx's architecture is research-driven. Every decision is tracked in the [decision ledger](../research/7-implementation/decision-ledger.md) and every task in [progress.md](../research/7-implementation/progress.md). A change is not complete until the source docs are updated.

**The closure rule:** a ledger row is closed only when its close condition is true **in the source doc** that owns it — not in `progress.md`, not in `data-layer.md`, not in the commit message. A provisioned value in `data-layer.md` or `architecture.md` does not close a row until it propagates to the source research doc.

When your change resolves a design question:

1. **Update the source research doc.** Write the decision into the doc's "Decisions" or "Findings" section. Do not leave it only in `data-layer.md`.
2. **Update the ledger.** Flip the `Closes:` row from `open` to `resolved`. Only when the close condition is true in the source doc.
3. **Update the reconciliation table.** If the value was provisioned in `data-layer.md`/`architecture.md`, add it to the ledger's [Reconciliation with plane 7](../research/7-implementation/decision-ledger.md#reconciliation-with-plane-7-materialized-pending-closure) punch-list as closed.

When your change materially changes `architecture.md` or `data-layer.md`:

1. **Update the traceability index** in `architecture.md` (§10) so stale entries don't point to rewritten sections.
2. **Cross-reference** any blueprint units that cite the changed sections.

A change that is code-complete but leaves source docs stale is **not ready to merge.**

### Pull request description

Keep it to two sections, the shape Software Mansion uses:

```md
## Description
<!-- What this changes and why. Link the issue it fixes. -->

## Test plan
<!-- How you verified it, including the device or simulator for anything visual. -->
```

## Git hooks

fx standardizes on a pre-commit hook that runs the staged-file checks and a guard that blocks direct commits to `main`, the pattern every Software Mansion library uses. The hook runs `bun run lint` on staged TypeScript and `swift:lint` on staged Swift, so a formatting miss never reaches CI. Wiring the hooks is a tracked follow-up; until then, run the checks by hand before you push.

## Tooling migration in progress

The repo is mid-migration from the Expo module template's ESLint and Prettier stack to Biome (see [research/_legacy/00-library-standards-and-publishing.md](../research/_legacy/00-library-standards-and-publishing.md)). The standard is Biome; `packages/biome.json` is the source of truth once wired. Do not add new ESLint or Prettier configuration — the rules are identical, and the tool is Biome.

## References

- [CLAUDE.md](../CLAUDE.md) — the non-negotiable architecture rules.
- [Conventional Commits](https://www.conventionalcommits.org) — the commit convention.
- [research](../research) — the source of truth for every architectural decision.
