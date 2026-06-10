# U3-002 — notes

## Unverified claims

- `regular`/`clear` glass renders distinctly on an iOS 26 device (the variant reaches
  `.glassEffect` through `materialConfig`).
- `.interactive()` plays the system press response, and it coexists with the RN scroller
  on the `hosting-parity` screen.
- The below-26 material fallback is unchanged by the refactor (intensity-keyed materials).
- Uniform alignment (FX-005) and hosting parity / GPU resume (SPINE-012) — pure device
  checks against the existing harness; no code claim, but unverified until the sweep runs.
- **NEW (rework round 1):** `self.layer.cornerRadius` is populated by Fabric when `borderRadius` is
  set on the RN style. If it reads `0`, the glass shape falls back to a sharp rectangle.
  The `layoutSubviews` override rebuilds the host when the radius changes, so a late
  Fabric layout pass should correct the shape. Unverified until device logs are checked.
- **NEW (rework round 1):** With the opaque base gone, the glass may or may not refract the
  aurora backdrop. The example composes the aurora as an independent `FxHostedView`; if
  `.glassEffect` samples only its own host, the glass will not refract the aurora. This
  is a hypothesis, not a claim — the device test determines the real behavior.
- **NEW (rework round 2):** `.contentShape(RoundedRectangle(cornerRadius: cornerRadius))` restores
  the hit region for the `interactive` glass press response. The press response is the
  system's own; fx surfaces no press events. Unverified until device confirmation — the
  human/reviewer verifies the press fires while the dark box does not come back.

## What changed

- `research/7-implementation/tasks/U3-002/README.md` — new spec (subtask template; the
  folded FX-002 prep scope from the progress.md scope note).
- `packages/ios/FxMaterialView.swift` — added the `MaterialConfig` Record (`variant`,
  `interactive`, `@Field` on every property) and `resolvedGlass`: iOS 26 now applies
  `.glassEffect(glass.interactive(bool))` with `Glass.regular`/`Glass.clear` mapped from
  `variant` (unknown → regular). The below-26 intensity-keyed material fallback is untouched.
- `packages/ios/FxHostedView.swift` — `pendingMaterialConfig` + `setMaterialConfig`; the
  `material` case passes the config through `makeSwiftUIView`.
- `packages/ios/FxModule.swift` — `Prop("materialConfig")` on the `FxHostedView` definition.
- `packages/src/effects/catalog.ts` — `MaterialVariant` + `MaterialConfig` types (the `21`
  subset this slice ships; a `TODO` slot marks tint/color-scheme/weight for the full surface).
- `packages/src/runtime/FxHostedView.tsx` — `materialConfig?: MaterialConfig` on
  `NativeFxHostedProps`.
- `packages/src/index.ts` — exports `MaterialConfig`, `MaterialVariant`.
- `example/screens/hosting-parity.tsx` — glass section: variant segmented control +
  press-response toggle driving `<FxHostedView effect="material" materialConfig={…}>` over
  an aurora backdrop, inside the existing ScrollView (covers A2 and the A4 interactive case).
  No routing changes — the screen was already routed in both routers and `data/tasks.ts`.
- `research/5-realization/structure.ios.md` §material — pinned the variant/interactive
  lowering (`Glass.regular`/`.clear` ↔ `UIGlassEffect.Style`, the `Glass.interactive(_:)`
  combinator, `.identity` not adopted, unknown-variant fallback).
- `research/7-implementation/device-sweep-v1.md` — glass-styles + interactive-glass
  readiness rows ❌ → ✅; §A2 reconciled to the ratified `regular`/`clear` (+ `interactive`)
  vocabulary with `identity` marked explicitly not-adopted; the stale blocked notes and the
  stale "routes to blank placeholder" intro line removed; bottom line updated.
- `tasks/U3-002/evidence/headless.md` — the device scenario (sweep §A2/§A3/§A4/§B2).
- `tasks/U3-002/evidence/xcodebuild.md` — BUILD SUCCEEDED record (Xcode 26.5, Debug,
  iphonesimulator, full example workspace).

### Rework round 1 additions (2026-06-10)

- `packages/ios/FxMaterialView.swift` — **A2-1 fix**: `Rectangle().fill(.clear)` on the iOS 26
  path so the glass lets the backdrop show through (no opaque dark fill). **A2-2 fix**: added
  `cornerRadius: CGFloat` parameter and `.glassEffect(resolvedGlass, in: RoundedRectangle(...))`
  so the glass shape follows the host bounds, not the default `Capsule()`.
- `packages/ios/FxHostedView.swift` — passes `self.layer.cornerRadius` to `FxMaterialView`.
  Added `layoutSubviews()` override that reads the layer radius, logs it with `NSLog`, and
  rebuilds the SwiftUI host if the radius changed while the effect is `material`. This
  addresses the mount-time-stale-corner-radius problem (R2).
- `research/5-realization/structure.ios.md` §material — added the glass shape mechanic
  (host-layer corner-radius read) and the **glass compositing limit** note (`.glassEffect`
  samples only its own host; in-host composition is needed for glass-over-fx-drawn-content).
- `research/2-effects/21-materials-and-glass.md` — added a citation-only note pointing to
  `structure.ios.md` §material for the shape mechanic and compositing limit.
- `tasks/U3-002/evidence/headless.md` — expanded A2 steps with corner-radius logging,
  shape-matching check, and A2-3 re-verification as a hypothesis test.

### Rework round 2 additions (2026-06-10)

- `packages/ios/FxMaterialView.swift` — **A2-4 fix**: `.contentShape(RoundedRectangle(cornerRadius:))`
  added to the iOS 26 path to restore the hit region for the `interactive` glass press response
  after `.fill(.clear)` removed the opaque hit surface. The visual stays clear (no dark box);
  the hit-test region is the same shape as the glass.
- `tasks/U3-002/evidence/headless.md` — added the A2-4 interactive press-response check to
  the A2 steps (press the glass tile, confirm the system liquid response fires).

### Rework round 2 removals (2026-06-10)

- `research/wip/critique-2026-06-10.md` — deleted (out of scope for U3-002; 414-line
  architectural critique is not a glass-fix changeset). The critique may have value for a
  planner triage separately.
- `research/wip/README.md` — reverted to original state ("Nothing in flight.") to remove the
  critique reference.
- `research/7-implementation/progress.md` — reverted the leading-space churn introduced in
  round 1; the U3-002 detail block now has no leading spaces on the list/checklist/proof lines.
  The only added content is the genuine "Rework (2026-06-10):" paragraph.

## Why

- `21` §The typed inputs ratifies the surface: `variant?: 'regular' | 'clear'` (the
  `UIGlassEffect.Style` vocabulary, never the public `effect` id) + `interactive?: boolean`.
  The config rides the effect channel mirroring `symbolConfig` (rule #5 — no top-level prop;
  rule #2 — no `Glass`/`UIGlassEffect`/`.glassEffect` names above the manifest).
- **`.identity` reconciliation (the ledger FX-002 note):** SwiftUI's `Glass` does expose
  `.identity` (grounded in `references/expo/packages/expo-ui/ios/Modifiers/GlassEffectModifier.swift`,
  which maps regular/clear/identity), so it exists in the API — but `21` deliberately ships
  `regular`/`clear` only, and `.identity` stays out of the fx surface. Confirmed: do not
  adopt. Recorded in `structure.ios` §material and sweep §A2; the FX-002 ledger row itself
  closes on device.
- The grounded iOS 26 API shape is `.glassEffect(glass.interactive(bool), in: shape)`;
  fx passes the `Glass` value and a `RoundedRectangle` matching the host, replacing the
  default `Capsule()` that produced the dark-corner artifact.
- **A2-4 rationale:** `.fill(.clear)` removes the opaque hit surface, so the `interactive`
  glass modifier (`.glassEffect`) cannot receive touches. `.contentShape` restores the hit-test
  region to the same `RoundedRectangle` used by the glass, without reintroducing the dark fill.
  The visual remains clear; the touch region is the correct shape.
- No new tests: the slice is bridge passthrough + native rendering — no JS resolution logic,
  and glass does not render headless. The proof is the gates + xcodebuild + the device sweep.

## Next:

Run the device sweep (reworked `evidence/headless.md` §A2) on an iOS 26 device, verify: (1) the
press response fires on `interactive` glass (A2-4), (2) the dark box does NOT come back, (3) the
glass shape matches the tile bounds (A2-2), (4) the layer `cornerRadius` log reads the expected
value (16), (5) the A2-3 refraction hypothesis. Record results in `notes.md` under a device-run
section. Then close FX-002 in `21`, FX-005 in `22`, SPINE-012 in `01` and the ledger — the human gate.

## Glass-rung rework — UIKit `UIVisualEffectView` + `UIGlassEffect` (2026-06-10)

### Unverified claims (device gate)

- The interactive press fires via the system interaction view on the UIKit rung
  (`UIGlassEffect.isInteractive`) — must be proven by a backdrop-independent signal.
- The `clear` variant shows no dark box (the clear-fill/interactive mutual exclusion is gone
  because the effect view is a real hittable surface).
- The rounded shape renders via `cornerConfiguration` (radius 16 on the example tile; sharp
  rectangle at 0 stays the fallback).
- The below-26 `.ultraThinMaterial`-family fallback is unchanged by the shrink of
  `FxMaterialView`.
- GPU resume (background → foreground) is unaffected by the new mount path.
- Drags that begin on the glass are captured by the interaction view (expected behavior per
  the spike, not a scroll bug) — confirm the parent scroller still pans from elsewhere.

### What changed

- `packages/ios/FxGlassSurfaceView.swift` (new) — the iOS-26 glass rung as a hit-testable
  `UIVisualEffectView` + `UIGlassEffect` (variant → `Style`, `interactive` → `isInteractive`,
  host radius → `cornerConfiguration`), mirroring the ratified spike's precedent lifecycle:
  effect created in `layoutSubviews()`, stale-effect clear before `isInteractive` reassignment,
  `setNeedsLayout()` on window re-entry. `MaterialConfig` moved here with its consumer
  (bridge contract unchanged).
- `packages/ios/FxHostedView.swift` — `material` on iOS 26 mounts `FxGlassSurfaceView`
  directly as a UIKit subview (no `UIHostingController`); `layoutSubviews()` now pushes the
  radius into the surface instead of remounting; the diagnostic `NSLog` is removed; mount
  paths are exclusive and tear each other down on effect switches.
- `packages/ios/FxMaterialView.swift` — shrunk to the below-26 intensity-keyed fallback; the
  SwiftUI `.glassEffect` body and `resolvedGlass` are deleted (the spike proved clear fill and
  the interactive press are mutually exclusive on that rung).
- `research/5-realization/structure.ios.md` §material — the rung entry now pins the UIKit
  mechanic (mount path, lifecycle quirks, `cornerConfiguration` shape) and records why the
  SwiftUI claim was overturned.
- `research/0-spine/01-substrates-and-hosting.md` — the "self-gesturing inside a scroller"
  open question is resolved as decision 6 (press and scroll coexist; the glass captures drags
  that begin on it; arbitration is the system's). SPINE-012 stays open — ledger closure is
  the human device gate.
- `research/wip/interactive-glass-touch-delivery.md` — status flipped to ratified.
- `tasks/U3-002/README.md` — Reference cell and iOS-native scope amended to the UIKit rung.
- `tasks/U3-002/evidence/headless.md` — A2/A4 steps reworked: the press is verified by a
  backdrop-independent signal, never frame-diff over an animated backdrop.

Next: human device gate — A2 scenarios with a backdrop-independent press signal.

## Device run 2026-06-10 (agent-device)

Run by an agent-device-instructed session on the uncommitted UIKit glass rework (no rework
code changed; the `hitTest` instrumentation was temporary and reverted to the recorded
shasums). Device: iPhone 17 Pro simulator, iOS 26.0 (the spike used 26.5; `UIGlassEffect` is
26.0+). App built and launched via `bun ios` (`expo run:ios`). Evidence:
`evidence/device-run-2026-06-10/`. The human ratifies; no gate ticked here.

One method note: heavy concurrent Metal rendering on `hosting-parity` starves the XCTest AX
runner, so accessibility snapshots time out. Verification used `simctl io booted screenshot`
for visuals and coordinate `press`/`gesture pan` (pinned to the sim `--udid`, since a physical
iPhone was also connected) for input — both backdrop-independent.

- A2-1 regular over aurora — PASS. `A2-1-regular-glass.png`. Frosted system glass over the
  moving aurora; no flat box, no dark box.
- A2-1b clear — PASS. `A2-1b-clear-glass.png`. Visibly more transparent than regular, the
  aurora shows through, still no dark box.
- A2-2 shape (`borderRadius: 16`) — PASS. `A2-2-shape-rounded-edge.png`. Rounded-rectangle
  edge matching the tile; not a pill, not a sharp rectangle.
- A2-4 interactive press (the load-bearing signal) — PASS, backdrop-independent.
  `A2-4-hittest-interaction-ab.txt` (+ `A2-4-raw-off.log` / `A2-4-raw-on.log`). The deepest
  hit-test winner is `UIVisualEffectView` in BOTH states (40× OFF, 45× ON) — the UIKit rung
  installs no separate hittable interaction VIEW, unlike the spike's SwiftUI-rung
  `UIPlatformGlassInteractionView`. The differentiator is the effect view's state:
    - OFF (static):  `UIGlassEffect isInteractive=false`, `interactions=[]`
    - ON (interactive): `UIGlassEffect isInteractive=true`, `interactions=[_UIFlexInteraction, _UIUpdateLinkViewInteraction]`
  `_UIFlexInteraction` (the system glass press/flex interaction) is installed ONLY when
  interactive and absent when static — the press machinery, proven without any frame-diff.
- A2-3 / A3 (uniform alignment, FX-005) — SKIPPED per work order (A3 passed previously; the
  rework does not touch shaders).
- A4-9 many boundaries — PASS. `A4-9-many-boundaries-grid.png`. All 12 mixed fill/shader hosts
  render; scrolling is smooth.
- A4-10 scroll coexistence — MIXED / FLAG. `A4-10-scroll-coexistence.txt` + the six
  `A4-10-*.png`. Off-glass drag pans the list (PASS, expected). **On-glass drag ALSO pans the
  list** (600ms and slow 1500ms both), with the log showing the glass received the touch-down
  (`UIVisualEffectView` ×9). The UIKit rung does NOT capture drags that begin on the glass —
  standard iOS arbitration hands the pan to the ScrollView once the finger crosses the scroll
  threshold; the press still fires on a stationary tap (A2-4). This CONTRADICTS the spike's
  SwiftUI-rung finding ("drag starting on the glass does not scroll") and the rework's stated
  expected behavior ("drags that begin on the glass are captured"). Net effect is cleaner
  scroll-through, but it is a behavioral change the maintainer should ratify. Synthesized
  gestures only — re-confirm with a real finger.
- Window re-entry — PASS. `window-reentry-glass-reappears.png`. Navigating to Tasks and back
  into U3-002 re-renders the glass (the `setNeedsLayout` re-entry path).
- A4-11 GPU resume — PASS. `A4-11-shader-before-background.png`, `A4-11-resume-immediate-no-black-frame.png`,
  `A4-11-resume-settled.png`. On `shader-catalog` (fractal-clouds), backgrounding (launched
  Settings) then foregrounding resumes the shader with no black frame; cloud positions advance
  between frames, so the clock resumes.
- Below-26 fallback — SKIPPED. An iOS 18.5 runtime is installed, but building and installing on
  a second simulator was out of scope for this session. Not exercised; available for follow-up.

Reverted-tree check: after removing the instrumentation, `packages/ios/FxHostedView.swift`
shasum is back to `49092e585976646faac71b4f77ad4e3b389d288d` (baseline), and `bun ios`
re-built the reverted tree (BUILD SUCCEEDED).

## Device run 2026-06-10 — verification addendum (agent-device, second session)

A second session dispatched with the same work order found the run above already recorded.
Instead of duplicating it, this session audited every artifact and closed the one gap.

Audit of the recorded run (no re-run):
- Every evidence file in `evidence/device-run-2026-06-10/` exists and substantiates its
  claimed reading — the A2-1/A2-1b/A2-2 stills show frosted vs clear rounded glass over the
  aurora with no dark box; the A2-4 raw logs are genuine `log stream` captures whose ON/OFF
  interaction sets match the summary (OFF: `interactions=[]`, `isInteractive=false`; ON:
  `interactions=[_UIFlexInteraction,_UIUpdateLinkViewInteraction]`, `isInteractive=true`);
  the A4-10 before/after pairs show the list panning from an on-glass drag start; the A4-11
  trio shows the shader live immediately on resume with cloud positions advanced.
- Instrumentation revert re-confirmed: `FxHostedView.swift` shasum matches the recorded
  baseline (`49092e58…`), no `fx-verify`/`hitTest` strings remain in `packages/ios/*.swift`,
  and the rebuilt app binary (20:51, post-revert) contains no `fx-verify` strings.
- `example/` working tree carries no backdrop swap or other temporary edits.

Below-26 fallback — now exercised (was skipped above):
- Device: iPhone 16 Pro simulator, iOS 18.5, same post-revert Debug build installed via
  `simctl install`; Metro already running. The known AX-runner starvation on
  `hosting-parity` recurred, so visuals used `simctl io <udid> screenshot` and input used
  coordinate presses pinned to the 18.5 session — the proven method.
- PASS. `below26-fallback-top.png` (boundary grid renders, no crash on material mount),
  `below26-fallback-mid.png` / `below26-fallback-material-tile.png` (the glass tile renders
  a translucent system material whose tint tracks the animated aurora — a real material,
  not iOS-26 glass and not a flat or dark box), `below26-fallback-clear-variant-noop.png`
  (variant flipped to `clear`: no visible change below 26 — expected, the variant channel
  is iOS-26-only and the fallback is intensity-keyed).
- Observation (flagged, not fixed): the fallback tile renders with sharp corners on 18.5
  while the iOS-26 rung is rounded — the host layer `cornerRadius` does not visibly clip
  the below-26 material. No pre-rework 18.5 baseline exists to say whether this is new;
  the maintainer should judge it against the "fallback unchanged" claim.
- Cleanup: the 18.5 simulator was shut down after the run; the iPhone 17 Pro simulator and
  Metro were left as found.

## Closure — 2026-06-10 (housekeeping session)

Human gate: the maintainer confirmed the live tap — the system press response plays on the
interactive glass tile. With that, every A2/A4 item is verified and U3-002 is device-verified.

- `device-verified` ticked (agent-device evidence run + maintainer live tap, 2026-06-10).
- `reviewed` ticked — review record in `reviews/U3-002.md` (rework diff review + device
  evidence audit; one review fix: dead `ExpoModulesCore` import dropped from
  `FxMaterialView.swift`).
- `docs-closed` ticked. Ledger closures: FX-002 (in `21` + ledger), FX-005 (in `22` +
  ledger), SPINE-012 (in `01` + ledger). `01` decision 6 amended: drag arbitration is
  rung-specific — the shipped UIKit rung is scroll-through (the A4-10 finding superseded the
  SwiftUI-rung capture behavior). `structure.ios.md` §material gained the press-machinery
  signal (`_UIFlexInteraction` interaction set, not a hit-test winner class) and the
  scroll-through coexistence mechanic. `evidence/headless.md` step 10 reconciled.
- Below-26 sharp-corner observation dispositioned: pre-existing, not a regression — the
  below-26 branch was a plain `Rectangle().fill(material)` with no corner handling before
  the rework too (checked against the pre-rework commit). Logged as a non-blocking polish
  candidate: clip the fallback to the host layer radius. Not a V1 gate.
- The interactive-glass-stage ~40 fps simulator reading stays a watch item (recorded in the
  SPINE-012 closure), not a blocker.

Next: merge gate (maintainer). The V1 queue continues with A1 `replaceWith` (U3-007), then
U3-003 Android material, then the wip critique triage.
