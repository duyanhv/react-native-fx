# react-native-fx Writing Style Guide

This guide gives editorial rules for react-native-fx prose: research notes, READMEs, and skill references. Aim for clarity, accuracy, and completeness.

It mirrors the [Expo Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md). This page covers the rules you hit most often; where it is silent, defer to Expo's guide and the [Google developer documentation style guide](https://developers.google.com/style).

For comments and docblocks in code, read the [Code Comments Guide](./Code%20Comments%20Guide.md). All docs are written in Markdown.

## Voice and tone

Write in plain American English. Aim for clarity for all English speakers.

- **Show, don't tell.** Give an example instead of explaining a concept. Examples grab attention and remove friction.
- **Write in the second person.** Use "you", not "we". Reserve "we" for when the team speaks directly to the reader.
- **Use present tense.** Describe what the code does now.
- **Use active voice.** Avoid "was" and "by". Active sentences are shorter and clearer.
- **Write short sentences — one thought each.** If you must write a long sentence, follow it with a short one to snap the reader back.
- **Use gender-neutral terms.** Use singular "they", or address "developers".

## Formatting

### Headings

Top-level headings on a page use H2. Do not skip heading levels to emphasize a sub-section.

Use sentence case: capitalize the first word and proper nouns only. Capitalize product names (react-native-fx, Metal, Expo Modules, Liquid Glass).

- Correct: Hosting the Metal surface
- Incorrect: Hosting The Metal Surface

Front-load keywords so headings stay scannable. For procedural sections, lead with a verb ("Install the module", "Add a shader"). Headings are the outline of the document — break long sections into H3s and H4s with parallel structure.

### File names, directory names, and extensions

Write file and directory names and extensions as **bold**, not code.

- Correct: The native view lives in **ios/FxShaderView.swift**.
- Incorrect: The native view lives in `ios/FxShaderView.swift`.

### Inline code

Use backticks only for code, identifiers, and commands.

- Correct: Call `setUniform` to push a value, then run `bun run build`.
- Incorrect: Open the `File` menu.

### Other formatting rules

- **Do not use emojis** in docs.
- Use **double quotes** in prose: Set the field named "shader".
- Use **Oxford commas**.
- **Numbered lists start at `1`**, never `0`.
- **Link descriptive text**, never the word "here". The link text should describe its destination.
- Avoid Latin abbreviations. Write "for example", not "e.g."; write "that is", not "i.e."
- Use external product casing as the industry does: iOS, Android, React Native, Metal, MetalKit, Swift, TypeScript, Expo Modules, CocoaPods, Xcode, npm, bun.

## Vocabulary

The product vocabulary — the capability names, the primitives, the substrates, the planes and domains — lives in one place: [research/README.md](../research/README.md), with the capability manifest in [research/0-spine/02-capability-ir-and-lowering.md](../research/0-spine/02-capability-ir-and-lowering.md). That is the single source of truth, and it is the naming authority across the codebase and the docs. Do not redefine those terms here or anywhere else; a second glossary only rots out of sync with the first.

When you write a term, match its canonical casing. Write the package name **react-native-fx** in lowercase. Write native types in their code casing: `FxShaderView`, `FxShaderModule`.

## Document shapes

fx docs follow a small set of shapes so the body of work stays scannable and consistent.

### Research documents

Every file in [research](../research) opens with a short status block, then leads with why the doc exists. The status lines fx uses:

```md
# <title>
Status: open | researched | prototyped | verified
Phase: <optional — the roadmap phase, e.g. v1 (decorative) · v2 (interactive)>
Feeds: <the docs or skill references this one feeds>
Owns: <optional — the IR node or concern this doc is authoritative for>

## Why this matters

<one or two paragraphs: the unknown this doc resolves and what depends on it>
```

After "Why this matters", use whatever sections the doc needs — research questions, findings, decisions, open questions, sources. Keep the source of truth in `research/`; do not add a competing architecture or roadmap doc at the repo root.

### Skill references

End-user usage docs live under [skills/react-native-fx](../skills/react-native-fx) as a router plus self-contained references. The `SKILL.md` is the router: read it first, then load only the reference that matches the task. Each file in **references/** stands on its own — a reader should not need the others to follow it. Keep a short "non-negotiable rules" list near the top, and never invent an API: if a surface is not in the references, say so rather than guess.

## References

- [Expo Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md) — the exhaustive guide this one mirrors.
- [Writing scannable titles and headings](https://github.com/expo/expo/blob/main/guides/Wrtiting%20scannable%20titles%20and%20headings.md)
- [Google developer documentation style guide](https://developers.google.com/style)
