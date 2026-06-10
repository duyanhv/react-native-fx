# V1 device sweep — findings

Agent-driven pass on the iOS 26 simulator (iPhone 17 Pro, Xcode 26) via agent-device.
Grounds each finding in `file:line`. The human `device-verified` gate still governs
closure; these are reviewer findings, not closures. Evidence captured under
`/tmp/fx-sweep/` during the session (screenshots + short recordings).

> Simulator caveat: glass and Metal render faithfully on Apple-silicon + Xcode 26, so
> positive-render rows are trustworthy. OS-degradation rows that need a lower OS (iOS 17 /
> sub-17) are explicitly marked not-coverable here.

## A1 · U3-007 symbol — pass, with one semantic finding + a coverage gap

> **A1-1 RESOLVED (2026-06-10).** `replaceWith` now drives the displayed glyph
> (`replaceWith ?? name` in `FxSymbolView`), honoring the `24` contract — no rename.
> Device-evidenced (AX identifiers heart→star, static background) and maintainer-ratified;
> evidence in `tasks/U3-007/evidence/device-run-2026-06-10/`. **A1-2 stays open by
> maintainer decision (not waived):** the OS-degradation rows wait for a real iOS 17 /
> sub-17 device. The text below is the original sweep record, kept as written.

Confirmed: renders through the hosted path; `symbolConfig` reaches native; discrete
(`bounce`) and indefinite (`variableColor`) effects animate; `repeat` loops; an
iOS-18-only effect (`wiggle`) renders rather than degrading; symbol→symbol transition
animates when the displayed symbol changes.

**Finding A1-1 — `replaceWith` ignores its own value.**
`FxSymbolView.swift:34` always renders `Image(systemName: symbolConfig.name)`.
`replaceWith` only arms `.contentTransition(.symbolEffect(.automatic))` through the
`!= nil` guard (`:39-41`); its string value is never used to choose the glyph. So
setting "Replace with → star" while the symbol stays `heart` shows nothing (verified on
device: glyph stays heart, caption says "→ star"). The transition fires only when
`name` itself changes. Either the prop should drive the displayed symbol
(transition `name`→`replaceWith` on trigger), or it should be renamed to a boolean
intent. Reconcile against the U3-007 design before closing. The example screen's
"Replace with" control inherits the same misleading affordance.

**Coverage gap A1-2 — OS degradation not exercisable on iOS 26.**
iOS-17 plain-symbol fallback for `breathe`/`rotate`/`wiggle` (`FxSymbolView.swift:84-85,
94-95, 104-105`) and the iOS <17 `Color.clear` path (`:24`) need a real iOS 17 / sub-17
device. Code paths exist; not verifiable on this sim.

## A2 · U3-002 glass (FX-002) — FAIL as it stands

> **RESOLVED (2026-06-10, UIKit glass-rung rework).** A2-1, A2-2, and A2-4 are all fixed and
> device-verified: the iOS-26 rung moved from the SwiftUI `.glassEffect` modifier to a
> UIKit `UIVisualEffectView` + `UIGlassEffect` surface (`FxGlassSurfaceView`), which the
> spike proved is the only way to have a clear fill and the interactive press at once.
> Evidence: `tasks/U3-002/evidence/device-run-2026-06-10/` + maintainer live tap. A2-3
> stands as a design limit, recorded in `structure.ios.md` §Glass compositing limit. The
> text below is the original sweep record, kept as written.

The `materialConfig` channel is correct: `variant` (regular/clear) and `interactive`
map cleanly to `Glass` at `FxMaterialView.swift:25-34`. The rendering wrapper is broken.

**Finding A2-1 — opaque dark fill behind the glass.**
`FxMaterialView.swift:16` renders a bare `Rectangle()` with no `.fill(.clear)` on the
iOS-26 path, so SwiftUI paints the default foreground (dark) across the full host
bounds. That opaque fill sits between the glass and any backdrop — observed on device as
a dark rectangle framing the glass. (The pre-26 branch `:19` is fine; it fills with a
material.) Fix direction: base the glass on a clear shape so the backdrop shows through.

**Finding A2-2 — glass shape ignores host bounds (always a capsule).**
`.glassEffect(resolvedGlass)` (`:17`) uses SwiftUI's default shape `Capsule()`, so the
glass is always a pill regardless of the tile's size/`borderRadius`. RN `borderRadius`
never reaches the native glass shape. Combined with A2-1, the capsule's uncovered
corners expose the dark fill. Fix direction: pass an explicit shape
(`RoundedRectangle` matching the host) to `glassEffect`.

**Finding A2-3 (architectural) — stacked hosts don't refract.**
The example layers two independent `FxHostedView`s (an `aurora` backdrop + the
`material` tile). `.glassEffect` samples only what is behind its own SwiftUI host, not a
sibling RN-layered hosted view, so "glass over fx-drawn content" cannot refract the
aurora even once A2-1/A2-2 are fixed. Real glass-over-content refraction needs the
content composed inside the same host as the glass. Flag against the U3-002 / FX-002
design; "glass renders over content" (A2) passes only trivially today.

**Automation note.** The live-shader glass screen (interactive glass + aurora + loop
sampling together) makes the AX snapshot time out and intermittently drops the
agent-device runner session (recoverable with `open`). The RN perf monitor read UI 60 /
JS 60 fps; `regular` and `clear` glass both render.

**Post-fix re-verification (2026-06-10, after the A2 rework):**
- A2-1 (dark fill) — **fixed.** No dark box; aurora shows around the rounded corners.
- A2-2 (shape) — **fixed.** Glass renders as a `RoundedRectangle` matching the host;
  NSLog confirms the host layer `cornerRadius` reads 16.0 for the material tile (8.0 for
  the grid tiles), so Fabric maps RN `borderRadius` → `layer.cornerRadius` (R1 holds).
- `clear` variant — renders as a near-transparent rounded rect showing the backdrop.
- A2-3 (refraction) — limit holds: glass does not refract the sibling `aurora` host.

**Finding A2-4 — interactive press response: STILL BROKEN (open).**
After the A2-1 clear-fill change the system-owned `interactive` glass press response stops
firing. The round-2 `.contentShape(RoundedRectangle(cornerRadius:))`
(`FxMaterialView.swift:23`) did NOT fix it — confirmed by live device test (2026-06-10):
with `interactive` selected, pressing the glass produces no response.

Evidence caveat (reviewer error, retracted): an earlier "verified-fixed" call compared
screenshots before/after a longpress, but the `aurora` backdrop is a color-cycling shader,
so the frame difference was the backdrop animating, not a press response. Frame-diff
against an animated background cannot isolate a touch effect — do not use it here.

Root cause not yet identified (do NOT guess-fix): `FxNativeView`/`FxHostedView` have no
`hitTest`/`userInteractionEnabled`/passthrough code, so the touch-delivery path is
unmodified Expo/Fabric. Candidates to investigate: (a) the parent RN `ScrollView`/Fabric
touch system intercepting before SwiftUI; (b) `Glass.interactive(true)` on a static
`Rectangle` needing an actual SwiftUI interaction/gesture, not just a `contentShape` hit
region. Requires investigation + a verification method that does NOT rely on frame-diff
over the animated backdrop (e.g. a static backdrop, instrumented touch logging, or a live
human tap).

## A3 · U3-002 uniform alignment (FX-005) — pass (visual)

The multi-uniform `loop` shader renders ordered diagonal rainbow stripes with no
garbling/offset — Swift↔MSL field order/stride looks aligned. (Intensity-slider drive
not separately captured; multi-uniform render correctness is the load-bearing check and
passed.)

## A4 · U3-002 hosting parity / GPU resume (SPINE-012) — pass, one item open

- Many boundaries: the 12-cell grid (fills + `ink-smoke`/`loop`/`aurora` shaders)
  renders with no blank hosts. **Pass.**
- Smoothness: RN perf monitor read UI 60 / JS 60 fps on the grid. **Pass.** Caveat:
  on the interactive-glass stage the UI thread dropped to ~40 fps on this sim — worth a
  look but not a parity blocker.
- GPU resume: on `shader-catalog`/fractal-clouds, background→foreground produced no
  black frame and the time-driven clock resumed advancing (verified by frame diff).
  **Pass.**
- Open: interactive-glass-inside-scroller coexistence (own press response + scroll) was
  not cleanly verified — the live-shader screen kept dropping the runner session. The
  interactive config path renders without crashing; the gesture/scroll coexistence
  itself is unconfirmed.

## Net iOS verdict

- **U3-007 (A1):** functionally passes on iOS 26; finding A1-1 (`replaceWith`) needs a
  design decision; degradation rows (A1-2) need a lower-OS device.
- **U3-002 glass (A2):** **FAIL** — A2-1/A2-2 are confirmed code defects in
  `FxMaterialView`; A2-3 is a design-level concern. Blocks U3-002 closure until fixed.
  *(Superseded 2026-06-10: resolved by the UIKit glass-rung rework — see the A2 banner.)*
- **U3-002 uniforms (A3) + parity/resume (A4):** pass (one open coexistence item).
  *(The coexistence item closed 2026-06-10: the shipped UIKit rung is scroll-through —
  `01` decision 6.)*

## B1 · U3-003 Android material fallback (FX-003) — FAIL (not implemented)

Device: POCO F1, LineageOS, **Android 15 / API 35** (so RenderEffect/AGSL are
supported; the sub-API-31 Haze floor is not testable here). Installed dev APK built
2026-06-09 15:01 — newer than the last Android native change (2026-06-08 21:23), so this
is current native code, not a stale build.

**Finding B1-1 — `effect="material"` mounts nothing on Android.**
`FxHostedView.kt:81-88` `mountEffect` has branches only for `"fill"` and the ten shader
ids; `"material"` falls to `else -> return`, so the host mounts no view. On device the
`android-material` screen shows the moving block **sharp, with no blur** — the empty
material host is transparent and the block shows through. No `RenderEffect` /
`createBlurEffect` / `setRenderEffect` exists anywhere in the Android source (only a
`FxGroupView.kt:7` TODO). The entire U3-003 native path — RenderEffect blur,
intensity→radius, staleness, sub-31 Haze fallback — is **absent**. This is consistent
with `progress.md:57`, where U3-003 is state `todo` (not yet implemented); the
misleading artifact is `device-sweep-v1.md`'s readiness table, which implied the Android
material was runnable today. Intensity and staleness rows are moot until U3-003 is built.

## B2 · U3-002 Android hosting parity (SPINE-012) — pass (implemented effects)

The 12-cell grid renders fully — `FxFillView` gradient tiles + `ink-smoke`/`loop`/
`aurora` shaders, no blank hosts, tiles sized to layout (not 0×0). Scroll worked at
~60 fps (a handful of cumulative stutters, acceptable). The glass stage shows only the
`aurora` backdrop — the `material` tile is absent (B1-1), not a parity regression. RN
host touch/sizing parity for the implemented effects looks correct.

## B3 · U3-007 Android symbol degradation (FX-003) — pass

The symbol screen mounts; controls render; `FxHostedView` + `symbolConfig` produces no
symbol and no crash (app process stayed alive). `symbolConfig` is not a handled prop in
the Android `FxModule`, so the host stays empty — the expected `{via:none}` degradation.

## Net Android verdict (POCO F1, API 35)

- **U3-003 material (B1): FAIL — not implemented natively.** Blocks U3-003 closure.
- **Hosting parity (B2): pass** for fill/shader boundaries.
- **Symbol degradation (B3): pass.**
- Not coverable here: sub-API-31 Haze fallback (device is API 35).

> Note: transient "Downloading 100%…" reloads seen early in the session were Metro
> Fast-Refresh churn (repo-root file writes during setup), not a screen crash — the
> hosting-parity screen renders correctly once settled. The app process pid held across
> the reloads (no native crash).
