# react-native-fx Writing Style Guide

This guide gives editorial rules for writing clear, consistent react-native-fx prose: research notes, READMEs, skill references, and TSDoc comments. Aim for clarity, accuracy, and completeness.

It mirrors the [Expo Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md). This page covers the rules you hit most often; where it is silent, defer to Expo's guide and the [Google developer documentation style guide](https://developers.google.com/style).

All docs are written in Markdown.

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

## Glossary

Use these terms consistently. They are the vocabulary of the thesis (see [research](../research)).

- **ShaderView** — the public, interactable native view that renders a Metal shader. The product.
- **Interactable** — the shader surface responds to native touch as one native unit (it emits `onPress*`, accepts `setUniform`/`setHighlight`). It does not make arbitrary React Native children individually touchable.
- **Curated shader** — a build-time `.metal` function the library ships and selects by id. The library author writes shaders; the app developer does not.
- **Uniform** — a value passed to the fragment shader. `time` and `resolution` are injected natively; semantic uniforms come from props.
- **Surface** — the Metal-backed view (`MTKView` / `CAMetalLayer`).
- **Composition mode** — how React Native children layer with the surface: `background`, `overlay`, or `surface`.
- **Glass** — the secondary, system-material alternative (`UIVisualEffectView` / `UIGlassEffect`). Not the core.

Write the package name **react-native-fx** in lowercase. Write native types in their code casing: `FxShaderView`, `FxShaderModule`.

## TSDoc and code comments

Document the public TypeScript API with [TSDoc](https://tsdoc.org). Match the comment density and idiom of the surrounding code.

- Write docblocks in the **third-person declarative**, not the second-person imperative.
  - Correct: Pushes a uniform value to the shader on the next frame.
  - Incorrect: Push a uniform value to the shader.
- **Document the iceberg below the surface** — failure modes, side effects, preconditions, and threading. Parameters and return types are already visible; explain what is not.
- Write useful parameter descriptions. Teach the reader something. If you have nothing useful to add, leave it out — quality over quantity.
- Wrap docblocks to fit the file's column width (100 columns for TypeScript).
- Leave off the period when a description is a single phrase. Use periods for subsequent sentences.

Useful tags: `@param`, `@returns`, `@throws`, `@default`, `@example`, `@platform ios`, `@deprecated`.

## Research document template

Every file in [research](../research) follows this shape so the docs stay scannable:

```md
# <title>
Status: open | researched | prototyped | verified
Feeds: <skill reference(s)>

## Why this matters
## Research questions
## Findings
## Decisions
## Open questions
## Sources
```

## References

- [Expo Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md) — the exhaustive guide this one mirrors.
- [Writing scannable titles and headings](https://github.com/expo/expo/blob/main/guides/Wrtiting%20scannable%20titles%20and%20headings.md)
- [Google developer documentation style guide](https://developers.google.com/style)
