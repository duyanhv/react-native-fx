# 6-ship · publishing & install — getting fx into apps

**Plane:** cross-cutting (ship) · **Domain:** both · **Substrate:** n/a · **Phase:** v1
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

Everything between "the library works" and "a developer can install and use it":
repo/package conventions, the build, asset bundling, release, the config-plugin
decision, install (managed + bare), and runtime capability gating.

Out of scope: how anything *works* (every other folder). This folder is delivery only.

## Invariants that bite here

- **Stay on Expo Modules + Fabric** (rule #7) — no hand-written JSI / C++ in the
  boundary; the packaging assumes the Expo Modules toolchain.
- **BYO assets ship as data** — a developer's `.metal` / `.agsl` must bundle and be
  discoverable; `onLoad` / `onError` exist because compilation can fail at runtime.
- **Graceful degradation is a shipped guarantee** — capability gating by OS / feature
  resolves to a no-op, never a crash, on unsupported devices.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| 52 | standards-and-publishing | repo/package conventions, build, asset bundling, release | researched |
| 53 | config-plugin-and-install | install (managed + bare), the no-plugin decision, capability gating | researched |

## Feeds

- **Consumes ←** `4-runtime/51` (the native-view boundary it packages), `0-spine/01`
  (substrate / version gates feeding the min-version matrix), the whole vault (it ships
  the result).
- **Feeds →** the published package + the README min-version matrix.

## Open research targets

Mostly `researched`; the work is executing as implementation lands:

- Asset bundling for BYO `.metal` / `.agsl` (and any `via:'lib'` optional peer deps — the
  optional-peer rule is settled in `53` decision 6; the open part is only package/version
  naming in `0-spine/02`).
- The min-version / capability matrix kept current as nodes and OS gates change.
- Build + release wiring (the `packages/` toolchain) verified end-to-end on a real
  install (managed and bare).
