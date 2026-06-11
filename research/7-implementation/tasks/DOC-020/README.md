# DOC-020 — pin the native ↔ public event-name mapping

Type: `ratify` · State: `todo` · Device: no · Consumes: — · Closes: — (no ledger row)

Origin: critique F18 (LOW, API). The shipped native `Events` are prefixed to dodge React
Native's reserved event names — `onShaderPress`/`onShaderPressIn`/`onShaderPressOut` (press,
on `FxSurfaceView`) and `onFxTransitionEnd`/`onFxLoad`/`onFxError` (lifecycle/load, on every
view). The public contract (`40`/`50`) is the unprefixed `onPress*` / `onTransitionEnd` /
`onStateChange` / `onLoad` / `onError`. The thin surface components (`src/surface/`, not yet
built) re-expose the native events under the public names. That mapping is currently scattered
(a vague note in `architecture.md:228`, the public list in `40`/`50`, the native names only in
code) — pin it in one place before any surface component ships.

Grounding (subtask-protocol §5 — names from the code, not memory):
`packages/ios/FxModule.swift:13,38,60` + `FxSurfaceView.swift:26-32` (and the Kotlin twins,
`FxModule.kt:20,42,64` + `FxSurfaceView.kt:33-39`) register exactly: `onShaderPress`,
`onShaderPressIn`, `onShaderPressOut`, `onFxTransitionEnd`, `onFxLoad`, `onFxError`.
`onStateChange` / `onLongPress` are contract-declared (`40`/`30`) but **not yet wired** native.

## Subtask

- Contract anchors:  `3-motion/40` (the events contract — §native → JS, the owning doc).
                     Consumers: `1-surface/50` (the public event list), `architecture.md`.
- Decision:          `ratify` — pin the canonical mapping table in `40`; point the consumers
                     at it; do **not** rename shipped native events (a code change, out of scope).
- Reference (HOW):   the shipped `FxModule`/view `Events(...)` registrations.
- Guides:            `Writing Style Guide.md`.
- Rules gate:        none breached — docs-only; pins a boundary convention.
- Device-verify:     none — pure.
- Done when:         one canonical native↔public mapping table lives in `40`; `architecture.md`'s
                     scattered note + `50`'s event list point at it; the convention (prefix to
                     dodge RN reserved names; the surface component owns the remap) is stated;
                     the unwired public names (`onStateChange`, `onLongPress`) are marked.

## Proof

- headless: N/A — docs-only.
- device:   N/A.
- docs:     `3-motion/40` (canonical table), `1-surface/50` (pointer), `architecture.md`
            (pointer, replacing the vague `:228` note). No `Closes:` row.
