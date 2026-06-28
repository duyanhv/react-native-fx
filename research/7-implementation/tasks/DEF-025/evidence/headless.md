# DEF-025 — Device Handoff

Headless gates passed. Five scenarios require device verification on Android hardware and iOS
simulator.

---

## Setup

**Android — Lottie peer must be present in the example app.** The library uses `compileOnly`; the
example's `android/app/build.gradle` now declares `implementation 'com.airbnb.android:lottie:6.+'`.
Run a full native rebuild before verifying:

```sh
bun run example           # start Metro
bun run example:android   # full native rebuild + install
```

The symbol screen (`Tasks → DEF-025`) registers `"heart"` (discrete/pulse JSON) and `"star"`
(indefinite/spin JSON) via `registerSymbol` at module load. `"bell"` is intentionally left
unregistered for the missing-asset scenario.

**iOS — no rebuild needed.** The trigger-normalization scenarios are JS-only changes; a Metro reload
is sufficient after the iOS binary is already installed.

---

## Scenario 1 — Registered Lottie renders and plays on Android

### Goal

An app-supplied Lottie JSON registered via `registerSymbol` renders and animates on a physical
Android device.

### Steps

1. Build and install the Android binary (`bun run example:android`).
2. Navigate Tasks → DEF-025 (symbol screen).
3. The screen label reads "DEF-025 · Android symbol (Lottie)".
4. The symbol name is "heart" (first segment), animation is "bounce" — a discrete animation.
5. Observe the Direct and Builder columns.

### Expected result

Both columns render a blue pulsing circle (LOTTIE_PULSE JSON). On tap or trigger-value change, the
animation plays once and stops. No black box, no crash, no empty view.

### Failure signs

Empty view, crash, or log error about missing composition.

### Platform

- iOS: no — this scenario is Android-specific
- Android: yes, min API 21, physical device strongly preferred

---

## Scenario 2 — Indefinite animation loops while active

### Goal

An indefinite animation loops continuously when `trigger:'repeat'` is set.

### Steps

1. Same build as Scenario 1 (Android, DEF-025 screen).
2. Switch symbol name to "star" (second segment).
3. Observe the animation.
4. Switch animation to "rotate" — the builder default fills `trigger:'repeat'`.
5. Observe the animation loops without stopping.

### Expected result

The spinning ring (LOTTIE_SPIN JSON) rotates continuously. Switching from "heart"/"bounce" (play-once)
to "star"/"rotate" (loop) demonstrates both play modes on the same screen.

### Failure signs

Animation plays once and stops instead of looping; no animation at all.

### Platform

- iOS: no
- Android: yes, min API 21

---

## Scenario 3 — Missing registered asset: no render, onError, dev warn

### Goal

An unregistered symbol name renders nothing, fires `onError(reason:'unsupported')`, and emits a dev
warning. No crash.

### Steps

1. Same build as Scenario 1 (Android, DEF-025 screen).
2. Scroll to the "Missing-asset degradation (bell — unregistered)" section at the bottom.
3. Observe the Fx component.
4. Open Metro / adb logcat and filter for "DEF-025 missing-asset" or "FxSymbol".

### Expected result

The Fx renders nothing (null / empty view). The Metro console shows
`DEF-025 missing-asset: unsupported`. The Android logcat shows a `W/FxSymbol: …` or similar dev
warning naming `"bell"` as unregistered. No crash.

### Failure signs

App crash, visible error UI, or absence of the warning/error signal.

### Platform

- iOS: no (iOS path uses SF Symbols; "bell" renders the system glyph)
- Android: yes, min API 21

---

## Scenario 4 — Missing Lottie peer: {via:'none'} before mount

### Goal

When the Lottie peer is absent from the app's classpath, the symbol rung is skipped by the selector
(`{via:'none'}`) before any view mounts. No error churn at runtime.

### Steps

1. Remove the Lottie dependency from `example/android/app/build.gradle`
   (`implementation 'com.airbnb.android:lottie:6.+'`) and rebuild.
2. Navigate Tasks → DEF-025 (symbol screen).
3. Observe the Direct and Builder columns.

### Expected result

Both symbol columns render nothing (the selector degraded to `{via:'none'}` before mount). The
`onError({reason:'unsupported'})` JS effect fires (from `Fx.tsx`'s `rung.via === 'none'` path),
but only once — no repeated error churn. Logcat shows no Lottie-related crash.

### Failure signs

App crash, visible Lottie-load error, or error firing on every render.

### Platform

- iOS: no
- Android: yes, min API 21 (rebuild with peer absent)

---

## Scenario 5 — iOS trigger-normalization and symbol regression

### Goal

The builder trigger-normalization (discrete→`'value'`, indefinite→`'repeat'`) does not regress iOS
SF Symbol behavior; indefinite animations now animate by default when `trigger` is omitted.

### Steps

1. Start the iOS binary already installed on simulator (Metro reload is sufficient — no native
   rebuild needed; all changes are JS).
2. Navigate Tasks → symbol (or DEF-025 on iOS shows the same screen).
3. Set animation to "variableColor". Leave trigger selector on the first option (the builder-filled
   default, now `'repeat'`). Observe.
4. Switch animation to "wiggle". Observe.
5. Switch animation to "breathe". Observe.
6. Switch animation to "rotate". Observe.
7. Switch animation to "bounce". Verify it plays once per trigger change (discrete → `'value'`).
8. Switch symbol names across heart / star / bell / heart.fill / star.fill. Verify glyphs render.
9. Switch to "appear" / "disappear". Verify each plays once then holds end state.

### Expected result

variableColor / wiggle / breathe / rotate all animate continuously (trigger default `'repeat'`).
bounce / pulse / scale / appear / disappear play once per trigger change (default `'value'`). All
five symbol names render the correct SF Glyph. No crash, no blank frame.

### Failure signs

Indefinite animations do not animate (stopped at first frame); discrete animations loop unexpectedly;
symbol names render blank or crash.

### Platform

- iOS: yes, iOS 17+ (simulator acceptable)
- Android: no — SF Symbols are iOS-only
