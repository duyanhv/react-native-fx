# U3-008 — notes

## 2026-06-10 — persistent host + a11y defaults

### What changed

- `packages/ios/FxHostedRootView.swift` (new) — `FxHostedRootView` (the single SwiftUI
  root; the old `makeSwiftUIView` dispatch became its body, reading the observed holder)
  + `FxHostedProps` (`ObservableObject`; `@Published` effect/intensity/symbolConfig/
  materialConfig, mutated once per batch on the main actor). `FxEmptyView` moved here
  with its consumer.
- `packages/ios/FxHostedView.swift` — ONE persistent
  `UIHostingController<FxHostedRootView>` created lazily on the first SwiftUI-path
  config (`mountHostIfNeeded`); `applyResolvedConfig()` mutates the holder instead of
  remounting. The UIKit glass path is untouched; the two mount paths stay exclusive and
  crossing between them is the only remaining controller teardown (plus unmount/deinit).
  The hosting controller's view sets `accessibilityElementsHidden = true` (decorative).
- `packages/ios/FxGlassSurfaceView.swift` — starts `accessibilityElementsHidden = true`;
  `setMaterialConfig` re-admits the surface to the accessibility tree only when
  `interactive` is true.
- `packages/android/.../FxHostedView.kt` — mounted effect children set
  `importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO` (decorative default; the
  in-place update path was already correct and is unchanged).
- `research/5-realization/structure.ios.md` §Hosting mechanics — pinned the
  persistent-host + observed-props mechanic and the a11y default (interactive-glass
  VoiceOver semantics recorded as an open item owned by the interactive-surface work).
- `guides/Device Verification Guide.md` — one expectation added: every `device: yes`
  scenario answers what VoiceOver/TalkBack perceives for the effect under test.
- `research/7-implementation/tasks/U3-008/` — spec, evidence, notes.

### Why

- Critique F1 (maintainer-accepted): the per-batch `UIHostingController` remount blocks
  the planned eased-uniform `transition` channel and kills SwiftUI symbol-effect state
  mid-animation. Expo's `SwiftUIHostingView`, the Android sibling, and the UIKit glass
  path all update in place — the iOS hosted path now matches.
- Critique F10 (cheap half): decorative hosted effect output is presentation-only and
  was leaking VoiceOver elements (an SF Symbol image exposes a label by default);
  interactive glass must stay reachable because it is self-gesturing.

### Unverified claims

- TalkBack actually skips the Android hosted children (`IMPORTANT_FOR_ACCESSIBILITY_NO`
  is the standard lever, but no Android device session ran here — ride the next one).
- The eased-uniform `transition` channel itself — this task only unblocks it.
- VoiceOver semantics (label/trait) for the interactive glass — deliberately open,
  owned by the interactive-surface work.
- Below-26 SwiftUI material fallback render — no sub-26 simulator session this run
  (compile-proven only; the dispatch is unchanged apart from reading the holder).

### Device results (iPhone 17 Pro simulator, iOS 26.0, agent-device; stills only — no video recorded)

Method note: the known AX-runner starvation on `hosting-parity` (heavy concurrent Metal
rendering; first seen in the U3-002 run) blocked XCTest snapshots AND, this run,
coordinate presses on that screen. Workarounds: visuals via `simctl io screenshot`;
the hosting-parity AX tree read through the macOS accessibility bridge (the
Accessibility-Inspector channel — same UIAccessibility elements VoiceOver walks) with a
direct `AXUIElement` Swift dump; input on that screen via frontmost-guarded macOS
clicks on the Simulator window. The symbol screen is light, so XCTest snapshots worked
there. Animation continuity was read by diffing PNG scanline bytes in the effect region
between paired stills, with the static status-bar rows as the zero-diff control.

| Scenario | Result | Evidence |
|----------|--------|----------|
| F1 symbol — `variableColor`+`repeat` runs | PASS — symbol region differs A→B (18,557 bytes), status bar 0 | `F1-symbol-A…t0.png`, `F1-symbol-B…t1.png` |
| F1 symbol — animation survives replace-with change | PASS — glyph content-transitioned heart→star, symbol mid-dim immediately after the change (not blank, not back at full-opacity phase zero), still animating C→D (17,195 bytes, status bar 0) | `F1-symbol-C-after-replaceWith-immediate.png`, `F1-symbol-D-after-replaceWith-t1.png` |
| F1 shader — intensity drag, no blank/reset | PASS — slider drag 0.80→0.35, shader visibly dimmer but continuously rendering in the immediate-after still; clock advances B→C (125,007 bytes, status bar 0); cloud layout continues rather than restarting | `F1-shader-A-intensity80.png`, `F1-shader-B…immediate.png`, `F1-shader-C…t1.png` |
| Glass regression — regular + clear render | PASS — frosted regular and visibly-more-transparent clear over the aurora, rounded shape, no dark box | `glass-regular-static.png`, `glass-clear-variant.png`, `glass-screen-top.png` (12-cell boundary grid all rendering) |
| Glass regression — interactive machinery path | PASS (structural) — the interactive toggle flows through `setMaterialConfig` (UI flips, glass re-renders, no crash); the path is code-identical to the U3-002-verified rung except the one a11y line; a macOS-bridge click in interactive mode resolved deep into the glass view subtree | `glass-after-interactive-click.png` |
| A11y — decorative hidden | PASS — symbol screen XCTest AX tree has NO element for the rendered symbol (controls + caption only); hosting-parity AX-element tree has NO element for any fill/shader/aurora/glass tile (RN captions only) | `a11y-symbol-screen-ax-tree.txt`, `a11y-glass-static-ax-tree.txt` |
| A11y — interactive glass reachable | PARTIAL / FINDING — fx no longer hides it (`accessibilityElementsHidden=false` when interactive), but the glass exposes no AX element in EITHER state: a bare `UIVisualEffectView` is not an accessibility element, and `accessibilityElementsHidden` only governs descendant elements (none exist). VoiceOver perceives nothing for the interactive glass today — old code and new code identically. This is exactly the open VoiceOver-semantics item owned by the interactive-surface work (pinned in structure.ios.md); making the surface an element with a label/trait is that future work, not this task | `a11y-glass-interactive-ax-tree.txt` (identical element set to static) |
| GPU resume — no black frame, clock resumes | PASS — shader already live in the immediate foreground still (mid app-switch zoom), clock advanced across the cycle (124,640 differing bytes A→C) | `GPU-resume-A…png`, `GPU-resume-B-foreground-immediate.png`, `GPU-resume-C-foreground-settled.png` |

Environment left running for ratification: Metro on :8081 (started by this session) and
the iPhone 17 Pro / iOS 26.0 simulator with the rebuilt app installed.

Next: maintainer ratification.
