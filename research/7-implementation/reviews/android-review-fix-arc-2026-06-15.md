# Review-fix arc — Android device confirm (2026-06-15)

Covers the native review-pass commits that landed after DEF-009:
`5c32983` (Android shader render lifecycle + error paths), `57bc2dc` (Android rule-#1 focus gap,
BYO same-id reload, unresolved-shader visibility), and the comment/style commits `9419017`,
`4c9f076`, `7ef92d8`, `dd08444`, `d52172c`. Not a tracked task row — these were a standalone
review pass; this note is the device record.

## Android — device-confirmed (POCO F1 / API 35; APK 11:06 build `8a8c4a4`)

Run on the `runtime-shader` + `content-distort` example screens, fresh `:app:assembleDebug`
(`content_ripple.agsl` confirmed in the APK).

| Row | Behavior | Verdict | Evidence |
|---|---|---|---|
| A | rule-#1 background pause | **PASS** | code-definitive (`FxSurfaceShaderView.onWindowFocusChanged` → `stopLoop` → `removeFrameCallback`; `FxSurfaceView.onWindowFocusChanged` + the `applyResolvedConfig` re-pause guard) + visual resume on both screens; the same `pausePresentationLoop` mechanism was logcat-proven for content-distort in DEF-009 run 1. No fresh log line — `stopLoop` is silent. |
| B | malformed BYO → `onFxError` + degrade GONE | **PASS** | `runtime-shader` "Malformed" → `error: app-broken — unknown identifier 'nonexistent_symbol'`, no crash, surface empty. |
| C | iOS-only source on Android → `{via:'none'}` | **PASS** | "iOS-only" → blank, no error, no crash. |
| D | BYO same-id reload (apply-gated) | **PASS — corrected expectation** | see below. |

### Row D — the corrected finding

The first device pass reported Row D as a native FAIL ("visual reloads but `onFxLoad` never
re-emits"). That report was internally inconsistent: `registerShader` is registry-only by design
(`FxModule.kt:18-20` → `FxShaderRegistry.register`; no view notification), and both the visual
reload (`updateEffectSurfaceVisibility` → child `setShaderId`) and the event
(`dispatchShaderLoadState`) flow through the **same `applyResolvedConfig`** reading the **same
registry** with **symmetric** dedupe — so "visual yes / event no" is unreachable.

Tiebreaker (re-register, then nudge intensity to force an apply) resolved it: **(a)** button alone
did **not** change the pattern, **(b)** status stayed `idle`, **(c)** after the slider nudge status
re-emitted `load: app-pulse`, **(d)** the pattern became source B. The reload + re-emit is
**prop-apply-gated**, matching the registry contract ("a new source for an existing id … the next
mount compiles it"). `57bc2dc` is correct as designed.

The "propless instant re-emit" expectation was a planner test-spec error, not a code defect. The
`runtime-shader` "Reload pulse (new source)" button (commit `8a8c4a4`) demonstrates the reload only
in combination with a subsequent prop apply — to be reworked so a single tap forces the apply (or
relabeled), so it is not misleading.

Evidence PNGs in the device session's scratch dir (gitignored per the `d21e9bb` policy); this
write-up is the versioned record.

## iOS — device-confirmed (fresh build, 2026-06-15 14:27, HEAD `7218afc`)

Re-run on a freshly-built binary (`expo run:ios`, build dated 14:27:14, HEAD `7218afc` — the
committed iOS review fixes) with the working-tree JS served over Metro (the harness reload fix).
**A/B/C/D PASS**, E code-reasoned:

| Row | Behavior | Verdict | Note |
|---|---|---|---|
| A | rule-#1 background pause (MTKView + content driver) | **PASS** | resumes cleanly on `runtime-shader` + `content-distort`; off-window pause rides on code-reasoning (`MTKView.isPaused` + content-driver pause), same as Android. |
| B | malformed BYO → `onFxError` | **PASS** | `error: app-broken — runtime shader failed to compile`, blank surface, no crash (the Metal message differs from the AGSL one — expected). |
| C | iOS-only source renders on iOS | **PASS** | `load: app-ios-only`, pink/blue ripple. The stale-build FAIL was confirmed to be staleness. |
| D | BYO same-id reload, single tap | **PASS** | tap → `load: app-pulse` + pattern flips (intensity 0.60↔0.85); validates the harness reload fix (0.6/0.85 delta) on device. |
| E | long-press during scroll | code-reasoned (see below) | no scroll+interactive harness screen. |

### The rejected first pass (kept as the lesson)

## iOS — first pass REJECTED (stale build)

The iOS half of the review-fix arc (rule-#1 background Metal + content-driver pause, shader
load/error dedup, `.common` long-press timer, fail-closed shader resolution; commits `4c9f076`,
`7ef92d8`, `dd08444`) **compiles green** (2026-06-15): the drifted `example/` CocoaPods were
reconciled with `bun install` + `pod update` (the `ExpoModulesWorklets`/`ExpoFileSystem`/`ExpoFont`
version mismatch cleared), then `xcodebuild ... -sdk iphonesimulator build` → **BUILD SUCCEEDED**.
The pod reconcile touched only the gitignored `example/ios` generated folder — no tracked change.

**Device-pending — on a FRESH build.** A first iOS device pass (2026-06-15) was **rejected**: the
agent installed a stale `example/ios/build` `.app` (Jun 12) that predates every iOS review-fix
commit, so it tested pre-fix code. The re-test must `expo run:ios` (build current source) and
verify the running app's build date is today before trusting any row. Targets: iOS rule-#1
background pause (Metal `MTKView` loop + content driver), malformed BYO → `onFxError`, iOS-only
source renders on iOS (DEF-008 baseline, already proven in DEF-008's Jun-14 gate — expected PASS),
BYO same-id reload (apply-gated; the harness reload control now forces the apply with a 0.6/0.85
intensity delta after the ±0.001 nudge proved too small to cross the iOS Fabric prop diff).

**Long-press-during-scroll (`.common`-mode timer): code-reasoned ACCEPTED.** `FxPressHandler.swift`
constructs the long-press `Timer` manually and adds it via `RunLoop.main.add(timer, forMode:
.common)` (`:135-145`) — the canonical fix for the default-mode stall during
`UITrackingRunLoopMode`; guards (`didBeginActivePress`, `!didFireLongPress`, `[weak self]`,
invalidate-before-schedule) are sound. Device coverage is blocked by a harness gap — no screen pairs
a scrollable list with an `interactionMode="active"` surface — filed as a follow-up; not a blocker
for the fix.
