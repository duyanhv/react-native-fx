# react-native-fx Code Style Guide

This guide defines how you format and name code in react-native-fx, across every language the library ships: TypeScript, Swift, Metal, and — when Android lands — Kotlin and AGSL. It covers the conventions a formatter cannot reason about. The formatters own everything else.

The guiding principle is the same one Expo and Software Mansion follow: **let a formatter settle whitespace and line breaks so the team never relitigates style in review.** Each language has one source-of-truth config, checked into the repo. You configure it once, raise a strong opinion with the team before you change it, and otherwise leave it alone.

For prose and documentation, read the [Writing Style Guide](./Writing%20Style%20Guide.md). For comments and docblocks, read the [Code Comments Guide](./Code%20Comments%20Guide.md).

## Principles that cross every language

These hold regardless of the language you write.

- **The formatter owns whitespace; you own meaning.** A formatter handles indentation, line length, and breaks. It cannot name a type well or choose the right abstraction. The rules in this guide are the part the tool leaves to you.
- **Prefer full words over abbreviations.** Write `descriptor`, not `desc`; `configuration`, not `cfg`. The exception is an established platform term (`MTKView`, `AGSL`).
- **Prefer explicit over implicit.** Write the `return`, name the type, declare the access level. Clever brevity costs the next reader more than it saves you.
- **Keep files small and single-purpose.** When a file grows past a few hundred lines or starts doing two jobs, split it. Smaller units are easier to review, test, and reason about.
- **Name native classes with the `Fx` prefix.** `FxShaderView`, `FxShaderModule`. This matches the Expo Modules view-authoring base (see [research/4-runtime/51-expo-modules-view.md](../research/4-runtime/51-expo-modules-view.md)) and the prefix convention every reference library uses (`RCT`, `RNGH`, `Nitro`). Android mirrors the same prefix when it lands.
- **Encode the platform in the file name, not in a branch.** Use the resolver suffixes `.ios`, `.android`, `.web`, and `.native` (for example **FxShaderView.web.tsx**) so the bundler picks the right file. The vocabulary stays platform-agnostic; the divergence lives in the file name and in `research/5-realization/structure.{ios,android}.md`, nowhere else.

## TypeScript

Biome owns lint and formatting for all TypeScript and JavaScript. **`packages/biome.json` is the source of truth** — the same role `.swift-format` plays for Swift. Biome replaces the ESLint and Prettier stack the Expo module template ships with, so do not add a `.prettierrc` or an `eslint.config` alongside it (see [research/_legacy/00-library-standards-and-publishing.md](../research/_legacy/00-library-standards-and-publishing.md)).

The rules match the Expo and Software Mansion house style:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

Run it from inside **packages**:

```sh
# Rewrite files in place
bun run lint --write

# Check without modifying (this is what CI runs)
bun run lint
```

### Conventions Biome does not enforce

- **Sort imports with Biome's organizer, then leave them.** Biome groups and orders imports on save and in CI. Do not hand-order them.
- **Import types as types.** Write `import type { FxShaderProps } from './FxShader.types'` for type-only imports. It keeps the runtime graph honest and the build fast.
- **Name with intent.** `PascalCase` for types, components, and classes; `camelCase` for values, functions, and props; `UPPER_SNAKE_CASE` for module-level constants. Prefix a genuinely unused binding with `_`.
- **Lead method and function names with a verb.** `setUniform`, `createPresence`, `measureContent`. A name that reads as an action tells the caller what it does before they open it.
- **Match the file name to its primary export.** **FxShaderView.tsx** exports `FxShaderView`. Type-only modules end in `.types.ts`.

### TypeScript compiler settings

`packages/tsconfig.json` runs in `strict` mode with `noUnusedLocals` and `noImplicitReturns`. Treat a type error as a build failure, not a warning. Do not reach for `any` to silence the checker — model the type, or use `unknown` and narrow it. Reserve `// @ts-expect-error` for a genuine compiler gap and always follow it with a one-line reason.

## Swift and Metal

Format the native iOS sources with [swift-format](https://github.com/swiftlang/swift-format) using the repo-root **.swift-format**. swift-format is opinionated; fx accepts its defaults with a few narrow overrides and relies on the formatter to keep the code consistent. This mirrors the [Expo Swift Style Guide](https://github.com/expo/expo/blob/main/guides/Swift%20Style%20Guide.md).

fx deliberately does **not** run SwiftLint. Expo does, but its 400-line ruleset is monorepo scale; fx keeps the native toolchain lean and lets swift-format plus review carry the load. Revisit that decision with the team, not in a single PR.

### Installing swift-format

On macOS with Xcode 26 or newer, swift-format ships with the Swift toolchain — run it through `xcrun`, no install needed:

```sh
xcrun swift-format --version
```

On other platforms, build it from source at the version CI uses and put the binary on your `PATH`:

```sh
git clone --depth 1 https://github.com/swiftlang/swift-format.git /tmp/swift-format
(cd /tmp/swift-format && swift build -c release)
cp /tmp/swift-format/.build/release/swift-format ~/.local/bin/
```

### Running the formatter

From inside **packages**:

```sh
# Rewrite files in place
bun run swift:format

# Check without modifying (this is what CI runs)
bun run swift:lint
```

The scripts touch only tracked `.swift` files, so Pods, **.build**, and **DerivedData** are skipped.

### Configuration

The repo-root **.swift-format** is intentionally minimal:

```json
{
  "indentation": { "spaces": 2 },
  "indentConditionalCompilationBlocks": false,
  "lineLength": 120,
  "version": 1
}
```

Everything else uses swift-format's defaults.

### Conventions swift-format does not enforce

- **Prefer full words over abbreviations.** Write `descriptor`, not `desc`.
- **Use an explicit `return` in closures** rather than relying on an implicit return.
- **Place private helpers at the end of the type,** after the public and internal API.
- **Keep the frame loop, uniform writes, lifecycle, and teardown on the native side.** JS configures; native renders (see [CLAUDE.md](../CLAUDE.md)).

### Metal sources

Format Metal Shading Language (`.metal`) the same way where swift-format does not apply: 2-space indentation, 120-column lines, full words. Name a `.metal` file after its shader and place it in **ios/Shaders**, for example **ios/Shaders/Aurora.metal**. Keep one curated shader per file, with a full-screen-triangle vertex stage and the fragment function selected by id (see [research/2-effects/22-shaders.md](../research/2-effects/22-shaders.md)).

## Kotlin and AGSL

Android lands later (see [CLAUDE.md](../CLAUDE.md) and [research/5-realization/structure.android.md](../research/5-realization/structure.android.md)). When it does, it mirrors the conventions above rather than inventing its own. This section is the placeholder so the standard is set before the first Kotlin file exists.

- **Formatter.** ktlint, run through Gradle's Spotless plugin (`./gradlew spotlessApply`), wired into the same per-platform lint command pattern the JS and Swift sides use. 2-space indentation to match **.editorconfig**.
- **Naming.** `PascalCase` for classes and types; `camelCase` for functions and properties; `UPPER_SNAKE_CASE` for constants. Native classes keep the `Fx` prefix (`FxShaderView`, `FxShaderModule`). Packages use the reverse-domain form under a single fx root.
- **AGSL.** AGSL shaders are the Android peer of Metal shaders — one curated shader per file, named after the shader, full words, selected by id. The authoring split (MSL on iOS, AGSL on Android) lives in `research/2-effects/22-shaders.md`; the mechanics live only in `structure.android.md`.

## References

- [`references/`](../references) — Expo, React Native, gesture-handler, Reanimated, and Nitro, cloned. The living idiom this guide abstracts; when a naming or structural convention here is ambiguous, read how these repos actually write it and match that.
- [Expo Swift Style Guide](https://github.com/expo/expo/blob/main/guides/Swift%20Style%20Guide.md) — the Swift guide this one mirrors.
- [Biome](https://biomejs.dev) — the lint and format toolchain for TypeScript.
- [swift-format](https://github.com/swiftlang/swift-format) — the Swift and Metal formatter.
