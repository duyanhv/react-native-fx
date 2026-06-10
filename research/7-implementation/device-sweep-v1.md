# V1 device sweep — single-pass checklist

Consolidates the three open V1 device-verify scenarios — **U3-007** (iOS symbol),
**U3-002** (hosting parity / glass styles / uniforms), **U3-003** (Android glass fallback)
— into one device session. Run iOS first, then Android. Tick each line on device; record
pass/fail + device/OS in the sign-off block.

> These are the **human** gates (`device-verified`). When a section passes, tick its
> `device-verified` in `progress.md` and merge. Do not let a "looks right" call stand in for
> an actual on-device observation.

## How to run

```sh
bun run example:ios       # from repo root
bun run example:android   # from repo root
```

## Example-app readiness (READ FIRST — most scenarios need a screen built)

The example routes each task id to its screen in `example/data/tasks.ts`. Only the items
marked ✅ are runnable today.

| Sweep item | Example today | Needs before it can be verified |
|---|---|---|
| U3-007 symbol | ✅ `symbol` screen | Symbol screen — mounts `<FxHostedView symbolConfig={…}>` with name/animation/trigger pickers |
| U3-002 iOS glass styles (`regular`/`clear` + `interactive`) | ✅ `hosting-parity` screen | `hosting-parity` has a glass section — variant segmented control + press-response toggle driving `materialConfig` |
| U3-002 uniform alignment | ✅ `hosting-parity` screen | `hosting-parity` mounts `loop` shader with intensity slider — multi-uniform output makes misalignment visible |
| U3-002 hosting parity / many boundaries | ✅ `hosting-parity` screen | `hosting-parity` mounts a grid of mixed fill/shader boundaries — scroll to verify smoothness |
| U3-002 interactive glass (press response in scroller) | ✅ `hosting-parity` screen | The glass section sits inside the screen's ScrollView — set press response to interactive and press while scrolling |
| U3-002 GPU resume | ⚠️ partial — `shader-catalog` runs a clock | Use shader-catalog; background/foreground (no new screen needed) ✅ |
| U3-003 Android material fallback | ⚠️ partial — `fill-material` `effect="material"` renders the Android fallback | Confirm it is a real blur, not a flat box ✅ (visual only) |
| U3-003 intensity 0–1 (Android blur radius) | ✅ `android-material` screen | `android-material` has `effect="material"` with an intensity slider |
| U3-003 RenderEffect staleness | ✅ `android-material` screen | `android-material` animates a block behind the blur — blur update proves staleness absent |

**Bottom line:** every sweep item now has a runnable screen. Glass styles and interactive
glass run on `hosting-parity` via the `materialConfig` channel (the FX-002 library prep,
landed by U3-002). The remaining work is the human device sweep.

---

## Section A — iOS device (min iOS 17; have an iOS 18 device too if possible)

### A1 · U3-007 — symbol (hosted `.symbolEffect`)
- [ ] iOS 17+: `name:'heart', animation:'bounce'` → SF Symbol renders and bounces.
- [ ] iOS 17: `scale`, `appear`, `disappear`, `variableColor` all animate (these are iOS-17, not 18).
- [ ] Symbol→symbol: switch `heart`→`star` with `replaceWith` → `.contentTransition` animates.
- [ ] iOS 18+: `breathe`, `rotate`, `wiggle` animate.
- [ ] iOS 17 (no 18): `breathe`/`rotate`/`wiggle` render the **plain symbol, no animation** (no invented `.bounce` substitute).
- [ ] iOS <17: same config renders `Color.clear` — no crash, no symbol.
- [ ] Trigger (what's wired): `repeat` mode repeats; `state` mode plays indefinite while held; `value` mode fires discrete once on mount. *(Discrete re-fire on value-change is deferred to the public surface — not expected here.)*
- Fail signs: black frame/crash; symbol renders but never animates; 18-only effect shows a different animation on 17; `symbolConfig` doesn't reach native (prop typing).

### A2 · U3-002 — iOS glass styles (FX-002)
- [ ] `regular` glass renders over content.
- [ ] `clear` glass renders over content.
- [ ] `interactive` press response plays on press (system-owned — no fx press events).
- *`identity` is not adopted: SwiftUI exposes `Glass.identity`, but the ratified `21` surface ships `regular`/`clear` only (see `structure.ios` §material).*
- Fail signs: flat box instead of glass; wrong style; variant switch has no visible effect; crash on Xcode 26 runtime.

### A3 · U3-002 — uniform alignment (FX-005)
- [ ] A multi-uniform shader renders with **correct** values (colors/positions not garbled or offset) — proves Swift↔MSL field order/stride is aligned.
- Fail signs: shifted/garbled output, wrong colors, flicker that implies stride mismatch.

### A4 · U3-002 — hosting parity / many boundaries / GPU resume (SPINE-012)
- [ ] Several hosted boundaries on one screen all render (no missing/blank hosts); scroll is smooth.
- [ ] An interactive glass component inside an RN `ScrollView` behaves (its own gesture + scroll coexist). *(Runnable on `hosting-parity` — set press response to interactive.)*
- [ ] **GPU resume:** with a running shader visible, background the app, then foreground → the clock resumes, no black frame, no runaway battery/leak. *(Runnable today on `shader-catalog`.)*
- Fail signs: blank hosts at scale; jank; frozen/black surface after resume.

---

## Section B — Android device (API 33+ for AGSL; have an API <31 device/emulator for the Haze floor if possible)

### B1 · U3-003 — Android glass fallback + intensity + staleness (FX-003)
- [ ] `effect="material"` renders a **real blur** (own-content `RenderEffect`), never a flat box. *(Runnable today on `fill-material`.)*
- [ ] Below API 31: degrades to the `Haze` (or defined) fallback, still premium — not a plain `View`.
- [ ] `intensity` 0→1 maps to increasing blur radius (needs the intensity-slider screen).
- [ ] **Staleness:** when content behind the blur animates/changes, the blur **updates** (not frozen on the first frame).
- Fail signs: flat box; intensity has no visible effect; blur frozen/stale while content moves.

### B2 · U3-002 — Android hosting parity (SPINE-012)
- [ ] `RNHostView` touch + sizing match iOS behavior (taps land; host sizes to layout, not 0×0).
- [ ] Many hosted boundaries render and scroll smoothly.
- Fail signs: 0×0 hosts; dropped touches; jank at scale.

### B3 · U3-007 — symbol degradation (Android)
- [ ] Same `symbolConfig` mounts → selector skips the planned `lib` rung → `{via:'none'}` → no symbol, **no crash**.
- Fail signs: crash; an attempt to render a symbol.

---

## Sign-off

| Section | Device / OS | Result | Notes |
|---|---|---|---|
| A1 U3-007 iOS | | | |
| A2 U3-002 glass | | | |
| A3 U3-002 uniforms | | | |
| A4 U3-002 parity/resume | | | |
| B1 U3-003 Android glass | | | |
| B2 U3-002 Android parity | | | |
| B3 U3-007 Android | | | |

On pass: tick `device-verified` for U3-007 / U3-002 / U3-003 in `progress.md`, close the
named rows in their owning source docs (FX-002/FX-005/SPINE-012 → U3-002; FX-003 → U3-003),
and merge. Source-doc closure is the cardinal rule — the tick here is not the closure.
