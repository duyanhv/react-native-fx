# react-native-fx Code Comments Guide

This guide defines how you comment code in react-native-fx: when to write a comment, what to put in it, and the docblock conventions for each language. It mirrors the comment idiom shared across Expo, React Native, and Software Mansion — document the part the reader cannot see, and trust the code for the rest.

For formatting and naming, read the [Code Style Guide](./Code%20Style%20Guide.md). For prose and documentation, read the [Writing Style Guide](./Writing%20Style%20Guide.md).

## The one rule: comment the iceberg, not the surface

A signature already shows the reader the parameters, the return type, and the name. Those are the tip above the water. A comment earns its place by documenting the iceberg below: the failure modes, the side effects, the preconditions, the threading, and the reason a thing is done the way it is.

- **Comment why, not what.** The code says what it does. A comment explains why it does it, or why it must — the constraint, the platform quirk, the ordering that is not obvious.
- **Match the surrounding density.** Write at the comment density and idiom of the code around you. A file that comments sparingly is telling you its conventions; follow them.
- **A comment is a promise.** It has to stay true as the code changes. A wrong comment is worse than none. If you cannot keep it accurate, do not write it.
- **Quality over quantity.** If a comment only restates the name, leave it out. Reserve your words for what the reader cannot otherwise know.

## When to comment, and when not

Write a comment when the reader genuinely cannot recover the information from the code:

- A non-obvious constraint or ordering — for example, why a uniform must be written before the next frame, or why teardown happens in a specific sequence.
- A platform quirk or workaround, with a link to the issue or the research doc that explains it.
- A threading or lifecycle expectation — which thread a method runs on, what must already be true when it is called.
- A deliberate deviation from the obvious approach, so the next reader does not "fix" it back.

Do not comment to restate the name, narrate line by line, or leave commented-out code in place. Delete dead code; git remembers it.

When you suppress a lint or type rule, the suppression itself needs a comment. Write `// @ts-expect-error <reason>` or `// biome-ignore lint/<rule>: <reason>` with a real reason, never bare.

### Never reference internal planning artifacts in code comments

Shipped code is read by app developers and by the next contributor in the file — not by someone holding the research tree. Keep the planning layer out of code comments entirely:

- **No references to research docs, the decision ledger, the architecture or data-layer docs, the blueprint, build-unit ids, or ledger ids.** Not `(data-layer §9 D2)`, not `research/0-spine/02`, not `U1-002`, not `SHIP-001`, not `architecture §2.2`. That provenance lives in the task and research layer (`research/7-implementation/`), and it rots the moment a doc is renumbered.
- **Cross-reference code, not docs.** Point at a related type, function, or sibling source file by name — `{@link FxSurfaceView}` in TSDoc, `` `FxSurfaceView` `` in Swift/Kotlin, or a plain path to a real source file. Never at a planning document.
- **State the reason, not its source.** Write the constraint or platform quirk itself so the comment stands on its own. The one sanctioned external link is to a *public* issue or vendor bug that explains a workaround — a GitHub/Apple/Android tracker URL, never an internal path.
- **Describe behavior, not project status.** A note that a thing is a deliberate partial implementation is fine when it stops the next reader from "completing" it wrongly; tying it to a build-unit id or a doc section is not.

## TypeScript and TSDoc

Document the public TypeScript API with [TSDoc](https://tsdoc.org). The audience is the app developer reading your types in their editor, so the docblock is part of the product.

- **Write docblocks in the third-person declarative,** not the second-person imperative.
  - Correct: Pushes a uniform value to the shader on the next frame.
  - Incorrect: Push a uniform value to the shader.
- **Document the iceberg below the surface** — failure modes, side effects, preconditions, and threading. Parameters and return types are already visible; explain what is not.
- **Write useful parameter descriptions.** Teach the reader something. If you have nothing useful to add, leave the `@param` out — quality over quantity.
- **Cross-reference with `{@link}`.** Point to the related type or function by name so the editor links it.
- **Wrap docblocks to the file's column width** (100 columns for TypeScript).
- **Leave off the period for a single-phrase description.** Use periods once a description runs to more than one sentence.

Useful tags: `@param`, `@returns`, `@throws`, `@default`, `@example`, `@platform ios`, `@deprecated`. Mark a platform-specific surface with `@platform`, and give `@deprecated` a migration path, not just a flag.

```ts
/**
 * Pushes a semantic uniform to the shader, applied on the next frame.
 *
 * The value crosses the bridge as a discrete target, not per frame — see
 * {@link FxShaderProps}. Writing the same key twice before a frame coalesces
 * to the last value.
 *
 * @param name - the semantic uniform key declared by the curated shader
 * @param value - normalized to the shader's expected range natively
 * @platform ios
 */
setUniform(name: string, value: number): void;
```

## Swift

Document types, methods, and properties with Swift's documentation comments. Use `///` for a single line and `/** … */` for a block. The idiom matches TypeScript: third-person declarative, and the iceberg over the surface.

- **Document what the signature cannot show** — which thread a method runs on, what the caller must guarantee, what the method owns versus borrows, and how teardown behaves. This is where native bugs hide, so this is where comments pay off.
- **Organize a type with `// MARK:` sections.** Group the public API, the internal API, and the private helpers, in that order, each under a `// MARK:` divider. swift-format leaves structure to you; `// MARK:` is how you give it.
- **Keep doc comments out of local scope.** A `///` belongs on a declaration, not on a statement inside a function. Use a plain `//` for an inline note.
- **Refer to symbols in backticks** inside a docblock: `` `MTKView` ``.

```swift
/// Renders the curated Metal shader into the owned `MTKView`.
///
/// The render loop runs on the main thread and pauses when the view leaves
/// the window or the app backgrounds. Uniform writes from JS are buffered and
/// applied at the top of the next frame; they never block the caller.
final class FxShaderView: ExpoView {
  // MARK: - Public API
  // ...
  // MARK: - Private helpers
}
```

## Kotlin

Android lands later (see [CLAUDE.md](../CLAUDE.md)). When it does, document the public Kotlin API with [KDoc](https://kotlinlang.org/docs/kotlin-doc.html), following the same idiom: third-person declarative, the iceberg over the surface, `@param` and `@return` only where they teach. Use a one-line `/** … */` for a simple member and a block for anything with a precondition or a threading note. Place annotations on their own line above the declaration.

## File headers

fx does not require a copyright or license header on source files. Software Mansion's libraries — fx's closest analogs — ship without them, and the license lives once in **LICENSE**. Keeping headers off every file keeps diffs clean and removes a thing that rots.

If you want to mark a file's license, a single SPDX line is allowed and is the only header form fx uses:

```ts
// SPDX-License-Identifier: MIT
```

Do not add multi-line copyright blocks, author tags, or creation-date headers. Authorship lives in git history, not in a banner.

## References

- [TSDoc](https://tsdoc.org) — the TypeScript docblock standard.
- [Swift documentation comments](https://www.swift.org/documentation/api-design-guidelines/) — the Swift API design guidelines.
- [KDoc](https://kotlinlang.org/docs/kotlin-doc.html) — the Kotlin documentation standard.
