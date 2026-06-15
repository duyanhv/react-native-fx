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

## iOS — NOT YET VERIFIED (blocked)

The iOS half of the review-fix arc (rule-#1 background Metal + content-driver pause, shader
load/error dedup, `.common` long-press timer, fail-closed shader resolution; commits `4c9f076`,
`7ef92d8`, `dd08444`) is **compile- and device-unverified**: the `example/` CocoaPods drifted
(RNGH missing file, then ExpoModulesWorklets / ExpoFileSystem version mismatch). Needs a
`bun install` + `pod install` reconcile (or `expo run:ios`) before any iOS compile-proof or device
confirm. Behavioral device targets when unblocked: iOS rule-#1 background pause, BYO same-id reload
(apply-gated, same as Android), iOS long-press-during-scroll.
