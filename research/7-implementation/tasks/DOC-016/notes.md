# DOC-016 — notes

## Changed
- `guides/Contributing Guide.md` — added `## Contributing as a human` between the intro
  links and `## Toolchain`. Three-part orientation: (1) the agent/task machinery governs
  how the architecture is built and is not needed for a drive-by fix; (2) a small change
  (typo / bug fix / doc / missing test) goes branch → checks → PR, gated only by §Before
  you open a pull request; (3) a design-question or capability change follows the research
  path (research/README.md → owning doc → §Documentation closure; decision ledger tracks
  open questions). Closes by pointing at `agents/` for context without binding a human to
  run a "session."
- Anchor links used (`#before-you-open-a-pull-request`, `#documentation-closure`) match
  existing H2/H3 headings in the same file.

## Lifecycle
- spec'd → rules-gated (docs-only, no rule touched) → docs reconciled. State: `ready-to-merge`.
- `reviewed` / `merged` are the maintainer's gates (matches DOC-006 / DOC-009 / DOC-012).

## Proof
- headless: N/A — docs-only, no code changed (no lint run needed).
- device:   N/A.
- docs:     `guides/Contributing Guide.md`. No `Closes:` ledger row.

## Unverified claims
- None — prose-only orientation; every link target exists in the same guide or the repo tree.

Next: maintainer review of the new section, then continue with DOC-017 (Android-hosted spine reconciliation).
