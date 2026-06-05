# react-native-fx Swift Style Guide

Format the native iOS sources (Swift and Metal) with [swift-format](https://github.com/swiftlang/swift-format) using the configuration at the repo root (**.swift-format**). swift-format is opinionated. Rather than maintain a long list of in-house conventions, accept its defaults with a few narrow overrides and rely on the formatter to keep the code consistent.

This mirrors the [Expo Swift Style Guide](https://github.com/expo/expo/blob/main/guides/Swift%20Style%20Guide.md).

## Installing swift-format

### macOS with Xcode 26 or newer

swift-format ships with the Swift toolchain. Run it through `xcrun`:

```sh
xcrun swift-format --version
```

No extra install is needed.

### Other platforms

Build it from source at the version CI uses, and put the binary on your `PATH`:

```sh
git clone --depth 1 https://github.com/swiftlang/swift-format.git /tmp/swift-format
(cd /tmp/swift-format && swift build -c release)
cp /tmp/swift-format/.build/release/swift-format ~/.local/bin/
```

## Running the formatter

From inside **packages**:

```sh
# Rewrite files in place
bun run swift:format

# Check without modifying (this is what CI runs)
bun run swift:lint
```

The scripts touch only tracked `.swift` files, so Pods, **.build**, and **DerivedData** are skipped.

## Configuration

The repo-root **.swift-format** is intentionally minimal:

```json
{
  "indentation": { "spaces": 2 },
  "indentConditionalCompilationBlocks": false,
  "lineLength": 120,
  "version": 1
}
```

Everything else uses swift-format's defaults. The goal of a formatter is to stop relitigating style on a per-PR basis, so raise a strong opinion with the team before you change the config.

## Conventions the formatter does not enforce

A formatter handles whitespace and line breaks. It cannot reason about meaning. These are reviewer expectations:

- **Prefer full words over abbreviations.** Write `descriptor`, not `desc`.
- **Use explicit `return` in closures** rather than relying on implicit returns.
- **Place private helpers at the end of the type**, after the public and internal API.

### react-native-fx native naming

- Prefix native classes with `Fx`: `FxShaderView`, `FxShaderModule`. This matches the Expo Modules view authoring base (see [research/01-expo-modules-view.md](../research/01-expo-modules-view.md)).
- Name a `.metal` file after its shader and place it in **ios/Shaders**, for example **ios/Shaders/Aurora.metal**.
- Keep the render loop, uniform writes, lifecycle, and teardown on the native side. JS configures; native renders (see [CLAUDE.md](../CLAUDE.md)).

## Metal sources

Format Metal Shading Language (`.metal`) the same way where swift-format does not apply: 2-space indentation, 120-column lines, full words. Keep one curated shader per file, with a full-screen-triangle vertex stage and the fragment function selected by id (see [research/08-shader-accents-and-distribution.md](../research/08-shader-accents-and-distribution.md)).
