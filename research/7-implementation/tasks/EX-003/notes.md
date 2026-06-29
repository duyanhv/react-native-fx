# EX-003 — notes

## Unverified claims

- The combined chat harness still needs full device verification on iOS and Android for motion,
  touch, reveal placement, source scrolling, and low-level diagnostics.
- Android-specific paths need device proof: `contentDistortion="ripple"`, best-effort `Fx.Scroll`,
  optional Lottie symbol selection, and `FxSurfaceView` controlled writes.

## Changes

- Added `example/screens/all-api-chat.tsx` as a ChatGPT-style all-public-surface harness.
- Registered a BYO shader and Android symbol asset once at module load, then used registry status in
  the diagnostics strip.
- Composed `FxPresence`, `FxView`, `FxPressable`, `<Fx>`, `EdgeGlow`, `FxGroup`/`FxItem`,
  `FxReveal`, `Fx.Scroll`, `FxHostedView`, and `FxSurfaceView` in one route.
- Cleaned up the first iOS 26 viewport after an `agent-device` smoke pass: removed the blocky
  header `EdgeGlow` overlay, clipped and softened effect-backed message hosts, started without the
  typing row, kept suggestion chips visually plain, and lifted the composer above the native tab
  bar.
- Added `EX-003` to `example/data/tasks.ts` and routed it in `example/app/(tasks)/[taskId].tsx`.
- Verified headlessly with `bun x tsc --noEmit` from **example/** and `bun run lint` from the repo
  root.
- Verified a first-viewport iOS 26.5 visual smoke with `agent-device` on iPhone 17 Pro; screenshot
  evidence is `/private/tmp/fx-ios26-ex003-fixed2.png`.

Next: run the full EX-003 device scenario on iOS and Android, capture interaction evidence, then
review the harness.
