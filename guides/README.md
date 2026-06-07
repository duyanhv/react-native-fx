# react-native-fx engineering guides

These guides define how you write code and docs for react-native-fx. Read the relevant guide before you contribute. They mirror the conventions of the libraries fx builds on — Expo, React Native, and Software Mansion — adapted to fx's lean toolchain.

| Guide | Owns |
|---|---|
| [Code Style Guide](./Code%20Style%20Guide.md) | Formatting and naming across TypeScript (Biome), Swift and Metal (swift-format), and Kotlin and AGSL when Android lands. The conventions the formatters cannot enforce. |
| [Code Comments Guide](./Code%20Comments%20Guide.md) | When to comment, and the docblock conventions for TSDoc, Swift, and Kotlin. The iceberg principle. |
| [Writing Style Guide](./Writing%20Style%20Guide.md) | Voice, tone, and formatting for all prose: research notes, READMEs, and skill references. Document shapes. |
| [Testing Guide](./Testing%20Guide.md) | How tests are designed, named, and judged sufficient. The three-tier taxonomy (headless, device, build). |
| [Device Verification Guide](./Device%20Verification%20Guide.md) | How to verify on a device. Standard scenarios for rendering, lifecycle, motion, and touch. Evidence formats. |
| [Contributing Guide](./Contributing%20Guide.md) | The toolchain, the commands for each platform, Conventional Commits, documentation closure, and what a change has to meet before it merges. |

For the reasoning behind the architecture, read the source of truth in [research](../research). For the build plan, read [research/7-implementation](../research/7-implementation). For AI session protocols, read [agents](../agents). For the non-negotiable working rules, read [CLAUDE.md](../CLAUDE.md).

Where a guide is silent, defer to the [Expo Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md) and the [Google developer documentation style guide](https://developers.google.com/style).
