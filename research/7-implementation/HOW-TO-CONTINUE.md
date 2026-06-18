# How to continue

You are picking up react-native-fx — a native presentation runtime for React Native. The research
folder is the source of truth; the build runs out of this folder (`7-implementation`). This page
orients you in five minutes: where the project is, how the build is organized, and the two ways to
push it forward.

## The one mental model

Work is tracked as **tasks**, one per build unit, in [`progress.md`](./progress.md) — that table is
the live dashboard; [`v1-cut-checklist.md`](./v1-cut-checklist.md) is the standing V1-cut readiness
record (dispositions, the one remaining gate, waivers, known limitations). Each task moves through a
fixed **lifecycle**:

```
spec'd -> rules-gated -> implemented -> commented -> headless-done -> device-verified -> reviewed -> docs-closed -> merged
```

An agent owns every gate except two — **`device-verified`** and **`merged`** are yours. A task is
**done** only when its `Closes:` rows are true in their owning source docs (the closure rule); that
is the `docs-closed` gate, and it is what stops a half-built thing from being marked finished.

The rules that gate everything live in [`../../CLAUDE.md`](../../CLAUDE.md); the exact start/during/end
steps live in [`../../agents/session-protocol.md`](../../agents/session-protocol.md); the authority
chain and lifecycle rules live in [`subtask-protocol.md`](./subtask-protocol.md).

## Where the project is

Read [`progress.md`](./progress.md) for the authoritative state — the snapshot below rots. As of
2026-06-18:

- **The native runtime + boundary (Units 1–9) are built, device-proven, and merged** on
  `integration/0.1.x` — effects, materials, shaders, motion, presence, interaction, drag/tilt, the
  hosted scroll `source` (DEF-014), runtime-source BYO (DEF-008), Android content-distort (DEF-009).
- **The JS public surface (Units 10–14) is the remaining work, and it is unbuilt** — `<Fx effect>`,
  `fx.effect.*`, `FxView`, `FxPressable`, `FxGroup`/`FxItem`, `EdgeGlow`. The original `blueprint.md`
  scoped the surface out and delegated it to `1-surface/`; nothing tracked it, so the engine shipped
  while this front door went untracked (five of the eight `52 §Public exports` contract symbols + the
  `fx.effect.*` builder are absent in code). It is now decomposed in `blueprint.md` Phase S and tracked
  in `progress.md` Surface build (all `todo`). **Start with Unit 10.**
- **Publishing waits on V2 + the surface build** — DEF-016 (the `react-native-fxkit` rename) fires
  pre-publish, after the surface lands.

Each active task keeps a `tasks/<id>/notes.md` with what changed, any unverified claims, and a
one-line "Next:". Start there to see what the last session did.

## Two ways to push it forward

### Drive an agent

Open a fresh agent session and paste the launcher in
[`../../agents/cold-start-prompt.md`](../../agents/cold-start-prompt.md). It self-selects the next
task from `progress.md`, reads the rules, protocol, guides, and only the cited research, then drives
the task to the last gate an agent owns and stops for you. To pin a specific task, append `Task: <id>.`

When it stops, you do the human gates: verify on a device if the task is `device:yes`, then merge.

### Do it yourself

Read [`../../CLAUDE.md`](../../CLAUDE.md) and
[`../../agents/session-protocol.md`](../../agents/session-protocol.md), open
[`progress.md`](./progress.md), pick the first `in-progress` task (or the first `todo` whose
`blocked by` is satisfied), and follow its `tasks/<id>/` kit. If the task has no folder yet, spec it
first with the template in [`subtask-protocol.md`](./subtask-protocol.md).

## Verify and build

It is a Bun workspace. From the repo root run `bun install` once, then from `packages/`:

```sh
bunx tsc --noEmit      # types
bun run build          # emit build/
bun run lint           # Biome (TypeScript)
bun run swift:lint     # swift-format (Swift/Metal)
bun run test           # jest (no tests yet — passes clean)
```

Effects do not run headless. To see pixels and motion, run the dev harness on a device:

```sh
bun run example:ios    # from the repo root
```

## The map

- [`CLAUDE.md`](../../CLAUDE.md) — the 9 rules + the law; the entry point for any contributor or agent.
- [`agents/`](../../agents) — the session protocol and the cold-start prompt.
- [`guides/`](../../guides) — how to write code and docs here (style, comments, testing, contributing,
  device verification). Binding, not advisory.
- [`progress.md`](./progress.md) — the task dashboard. [`decision-ledger.md`](./decision-ledger.md) —
  every in-flight decision and the proof that closes it. [`blueprint.md`](./blueprint.md) — the
  build-ordered units. [`architecture.md`](./architecture.md) / [`data-layer.md`](./data-layer.md) —
  the structure and materialized data.
- [`../`](../) — the research planes (`0-spine` … `6-ship`); the source of truth for every decision.
- [`packages/`](../../packages) — the library. [`example/`](../../example) — the dev harness.
