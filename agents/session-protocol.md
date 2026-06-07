# session-protocol — how to start and end a session

Every session follows a fixed start and end sequence. This keeps context minimal and prevents bloated, undirected sessions.

---

## Start — every session, no exceptions

1. **Read `CLAUDE.md`.** The 9 non-negotiable rules gate everything. If the task violates one, stop.
2. **Read `research/7-implementation/progress.md`.** The dashboard. Find the first `in-progress` or `todo` task. That is the current task.
3. **Open the active task folder.** If the task has a `tasks/<id>/` folder, open `task.md`. Read the goal, checklist, and proof. State the current blocker.
4. **State intent.** Before doing work, say what task you are on and what you will do. Example: "Working on U4-001 wrapper mechanic. Current blocker: architecture.md §5.1 still shows container view instead of intermediate sublayer."
5. **Load only what's cited.** Read the contract docs and reference files named in the task, the blueprint unit, or the subtask. Do not load the entire research folder.

### What NOT to load

- The entire `research/` folder — load only the docs cited by the active task
- The entire `references/` folder — open only the files named in the blueprint Precedent cell
- `skills/` unless the task is end-user documentation
- `_legacy/` unless the task explicitly says to read it

---

## During — work

1. **Gate against the rules.** Re-read the 9 rules. Does the change violate any? Stop if yes.
2. **Follow the authority chain.** Research docs > blueprint > architecture > data-layer > reference. If a blueprint unit and a contract doc disagree, the contract wins.
3. **Cross-check per `subtask-protocol.md`.** Gate → bind → honor → get mechanic → consult reference → check verification.
4. **Do not over-build.** A `mimic` means mimic the pattern, not the whole library. A `reject` means do not adopt — honor it.
5. **Verify device claims.** If the task has `device: yes`, the agent can't close it. The agent reaches `headless-done`; the device gate is a human handoff.

---

## End — every session, no exceptions

1. **Update the task.** Mark completed checklist boxes. Update the state in `progress.md` (`in-progress` → `headless-done` or back to `in-progress`).
2. **Record what changed.** In `tasks/<id>/notes.md` (create if absent), write one bullet list of what was changed and why. No narrative — a log.
3. **Signal unverified claims.** If agent work produced claims that need device proof, list them at the top of `notes.md` under "Unverified claims."
4. **Leave a clear next action.** One sentence at the end of `notes.md`: "Next: <action>."
5. **Run lint if code changed.** `bun run lint` on TypeScript; `bun run swift:lint` on Swift.
6. **Do NOT open random files in the next session.** The next session starts from `progress.md`, not from where this session ended.
