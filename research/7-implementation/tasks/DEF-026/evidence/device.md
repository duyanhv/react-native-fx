# DEF-026 — device evidence (DRAFT for maintainer ratification)

Captured by the planner via an agent-device run on **2026-06-28**. The `device-verified` tick and
any waivers are the maintainer's — this is the evidence draft, not a self-certification.

## Setup

- **Device:** POCO F1, physical, **Android 15 / API 35** (serial `69424da8`).
- **Build:** `expo run:android` (debug) from `example/`, native rebuild including the new
  `FxScrollView` Kotlin view + module registration. `BUILD SUCCESSFUL`, APK installed + launched.
- **Screen:** task `DEF-014` → `source-scroll` demo (`example/screens/source-scroll.tsx`), reached
  by deep link `rnfxexample:///DEF-014`.
- **Driver:** agent-device 0.17.1.

## Results

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Android native rung active (not the deleted static fallback) | **PASS** | caption reads `source · best-effort UI-thread offset→opacity/scale (Android)` — `is visible` Passed; `01-vertical-top.png` |
| 2 | Vertical scroll animates opacity/scale; shader tiles render (API 35 ≥ 33) | **PASS** | aurora/plasma/caustics AGSL tiles draw; opacity edge-fade visible (washed-out tile band at the viewport edge vs. vivid in-view tile) across `01-vertical-top.png` → `02-vertical-mid.png`; motion in `vertical-scroll.mp4` |
| 3 | Horizontal axis renders + animates | **PASS** | `fx.source.scroll({axis:'horizontal'})` strip shows fill gradient + aurora tiles; `01-vertical-top.png` / `03-after-resume.png` |
| 4 | Smooth scroll, no jank | **PASS** | perf overlay `UI 59.9 fps · 0 stutters (4+)`; `agent-device perf frames` → `droppedFramePercent: 0` during the scroll window |
| 5 | Off-window background → resume | **PASS** | HOME to background, re-foreground: caption `is visible` Passed; shader pattern advanced (loops resumed), no blank/crash; `03-after-resume.png` |
| 6 | Zero per-frame JS during scroll | **PASS (code-verified + perf-consistent)** | no `onScroll` callback crosses the bridge (review-confirmed: native-only `onScrollChanged` reader, no JS event); device perf shows healthy UI-thread frames with no JS-driven stutter. Not independently bridge-traced this session. |
| 7 | Sub-API-33 degradation (shader tiles transparent, container still scrolls + animates fill) | **NOT-RUN** | no ≤API-32 device available (hardware is API 35; the only low AVD `fx_api33` is exactly API 33, where shaders render). Needs a ≤32 emulator or maintainer waiver — analogous to DEF-014's os<17 NOT-RUN row. |
| 8 | iOS render-server `.scrollTransition` unregressed | **NOT-RUN this session** | no iOS file changed by DEF-026 (iOS rung/surface/wire untouched), so unregressed by construction; not device-re-verified here (no iOS sim booted). Maintainer may re-confirm on iOS if desired. |

## Artifacts (this directory)

- `01-vertical-top.png` — initial state, vertical list top + horizontal strip + Android caption.
- `02-vertical-mid.png` — mid-scroll; tiles at different opacity vs. #1 (edge fade).
- `03-after-resume.png` — after background→foreground; tiles re-rendered, loops advanced.
- `vertical-scroll.mp4` — vertical scroll motion (opacity/scale edge transition).

## For the maintainer

Core capability is proven on physical hardware: the native Android `Fx.Scroll` rung renders fx-owned
shader tiles, animates `opacity`/`scale` from native scroll offset on both axes at 60 fps with zero
dropped frames, and survives off-window background/resume. Two rows are **NOT-RUN** (sub-API-33
degradation, iOS regression) — waive or cover before ticking `device-verified`.
</content>
