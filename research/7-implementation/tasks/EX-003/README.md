# EX-003 — all API chat screen

Subtask: all-public-surface chat harness

- Contract anchors: `research/7-implementation/v2-capability-baseline.md`,
  `research/1-surface/50-api-and-presets.md`, `research/1-surface/54-presence.md`,
  `research/1-surface/55-composition-chain.md`, `research/1-surface/57-content-primitives.md`,
  `research/3-motion/40-motion-reactivity-and-data-flow.md`,
  `research/2-effects/24-symbols.md`, `research/5-realization/structure.ios.md`, and
  `research/5-realization/structure.android.md`.
- Decision: use the shipped surface as a consumer; do not add a new primitive, preset, or source
  doc decision.
- Reference: existing example screens under `example/screens/`, especially `effect-surface.tsx`,
  `fx-view.tsx`, `fx-pressable.tsx`, `symbol.tsx`, `source-scroll.tsx`, `runtime-shader.tsx`, and
  `reveal.tsx`.
- Guides: Code Style, Code Comments, Testing, Device Verification, Writing, Contributing, and the
  subtask protocol.
- Rules gate: native owns frames; capability names stay agnostic; `FxReveal` uses an app-owned
  bounds-containing host; controlled writes are discrete, not per-frame JS; fx wraps app content and
  never becomes a UI kit.
- Device-verify: yes. The screen combines visual effects, motion, touch, reveal geometry, native
  source scrolling, Android-only content distortion, and degradation paths.
- Done when: the example route compiles headlessly, renders on both platforms, all touch paths remain
  reachable, no unsupported platform path crashes, and the task is reviewed.

## Scope

Build one example screen, `AllApiChatScreen`, reachable from the Tasks list as `EX-003`. The screen
uses a ChatGPT-style transcript to exercise the full shipped public runtime together:

- `FxPresence`, `FxView`, and `FxPressable` for content lifecycle, mounted state, and native press
  feedback.
- `<Fx>`, `EdgeGlow`, `fx.effect.*`, and string-form effect ids for self-contained visuals.
- `FxGroup` / `FxItem` for glass chip grouping.
- `FxReveal` inside a root overlay host for an attachment drawer.
- `Fx.Scroll` and `fx.source.scroll` for native source-driven tiles.
- `registerShader`, shader registry reads, `registerSymbol`, symbol registry reads, `FxHostedView`,
  `FxSurfaceView`, `setUniform`, `setHighlight`, `interactionMode`, and `contentDistortion` in a
  diagnostics strip.

## Out of scope

- No native code.
- No new public API.
- No source-doc decision or ledger row.
- No visual claim closes until the device gate runs.

## Proof

- headless: `bun x tsc --noEmit` from **example/** and `bun run lint` from the repo root.
- device: run **Tasks -> EX-003** on iOS and Android; follow **evidence/headless.md**.
- docs: N/A.
