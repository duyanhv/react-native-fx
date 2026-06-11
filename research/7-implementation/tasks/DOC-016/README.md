# DOC-016 — human-contributor path in the Contributing Guide

Type: `doc-cleanup` · State: `merged` · Device: no · Consumes: — · Closes: — (no ledger row)

Origin: critique F19 (LOW, process). The binding agent/guide system
(`agents/`, the session + subtask protocols, the research-driven task lifecycle) is the
de-facto contributor documentation. A human drive-by contributor reads the repo as
agent-only and assumes a typo or a bug fix must travel the whole task machinery. A short
human path in the Contributing Guide keeps drive-by contributions viable.

## Subtask

- Contract anchors:  none — `guides/Contributing Guide.md` is the owning doc; `guides/Writing Style Guide.md` governs the prose.
- Decision:          `doc-cleanup` — add one short section, no architecture change.
- Reference (HOW):   the existing Contributing Guide shape; Software Mansion's two-section PR template already cited there.
- Guides:            `Writing Style Guide.md` (second person, present tense, sentence-case headings, no emojis).
- Rules gate:        none — docs-only, no rule touched.
- Device-verify:     none — pure.
- Done when:         the Contributing Guide carries a short human-contributor path that
                     distinguishes a small drive-by change (no task lifecycle) from a
                     design-question change (the research path), and points at the agent
                     system for context without binding a human to run a "session."

## Proof

- headless: N/A — docs-only, no code changed.
- device:   N/A.
- docs:     `guides/Contributing Guide.md`. No ledger row (process hygiene only).
