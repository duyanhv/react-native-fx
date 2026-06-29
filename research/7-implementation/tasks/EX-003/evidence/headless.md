# EX-003 — device scenario

## Goal

Verify that the all-public-surface chat harness renders and remains touchable on iOS and Android.

## Setup

1. Start Metro from the repo root with `bun run example`.
2. Launch the example app on iOS or Android.
3. Open **Tasks -> EX-003**.

## Steps

1. Confirm the header effect renders and the message thread is visible.
2. Tap several messages. The selected message should lift, keep touch reachable, and append
   `state:` events to the semantic log.
3. Tap and long-press assistant/user bubbles. Native feedback should play and no touch should be
   swallowed by the effect decoration.
4. Tap suggestion chips. Glass surfaces should render, the draft text should update, and the chip
   press should log.
5. Tap the composer send button. A user message should appear, the typing bubble should show, and
   an assistant message should arrive after the short timer.
6. Tap `+` in the composer. The reveal drawer should expand from the composer into the attachment
   panel. Tap **Close** inside the expanded panel and confirm it collapses.
7. In the attachment panel, scroll the source tile rail. Tiles should remain visible and source
   motion should run without JS scroll callbacks.
8. In the runtime strip, tap the interactive effect. The press count and semantic log should update.
9. Tap **Write** and **Clear** under the controlled surface. The shader should visibly change or
   degrade without crashing, and the log should show controlled writes.
10. Confirm the direct hosted view row renders a material swatch and symbol swatch or degrades
    gracefully.
11. Confirm the content-distortion card is visible. On Android API 33+, the RN content should render
    through the ripple distortion and stay touch-safe. On iOS, the prop should degrade harmlessly.

## Expected result

- The screen loads without a redbox.
- Visual effects render or degrade gracefully.
- Every touch target remains reachable.
- The reveal drawer is touchable because it fills a bounds-containing host.
- No event behaves like a per-frame stream; logs update only on discrete interactions.

## iOS 26.5 visual smoke

Run with `agent-device` on **iPhone 17 Pro / iOS 26.5** after launching
`expo.modules.fx.example://EX-003`.

- Initial visual issue reproduced: the header carried a blocky effect overlay, selected message
  effects leaked hard shader corners, and the composer covered visible thread content.
- Follow-up visual smoke after the screen cleanup passed for the first viewport: the header effect
  renders without the blocky overlay, message effects stay clipped to their host, the initial
  typing row is absent, suggestion chips render as normal tappable pills, and the composer no
  longer covers the visible message thread.
- Screenshot evidence: `/private/tmp/fx-ios26-ex003-fixed2.png`.

This is not the full device gate. The interaction rows above still need a complete iOS and Android
pass before `device-verified`.

## Failure signs

- Blank header or blank diagnostics surface where the platform should support the effect.
- Redbox or native crash during BYO shader, symbol, controlled write, or content distortion.
- Composer or reveal content becomes untouchable.
- Tapping a message or chip produces no native feedback.
- Source scroll tiles stutter, disappear, or require JS scroll events.

## Platform

- iOS: yes, iOS 17+ preferred for shader and symbol coverage.
- Android: yes, API 33+ preferred for AGSL shader and content-distortion coverage; API 21+ still
  verifies graceful degradation for the lower rungs.
