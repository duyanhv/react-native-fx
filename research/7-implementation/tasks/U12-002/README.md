# U12-002 — `effect` prop on `FxView`: behind-content decoration

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes the `57 §FxView` `effect` line; opens no new ledger row) · Unblocks: — · Blocked by: U12-001 (merged)

Origin: blueprint Phase S **Unit 12** scope split (2026-06-20, maintainer-aligned). The `effect` prop was deferred from U12-001 as a distinct ownership problem — z-order, clipping, composition position, pointer pass-through, and whether the effect is `hosted` or `expo-view` relative to the content host. Design aligned with the maintainer (2026-06-21): **JS composition only, behind-content, no new native code.**

## The goal

Ship `FxView.effect` — the `effect` prop on `FxView` that adds an `EffectId | EffectStack` decoration **behind** the user's content, moving with it through the state transition:

```tsx
<FxView
  preset="lift"
  state={selected ? 'selected' : 'idle'}
  effect={fx.effect.glow()}
>
  <MyCard />
</FxView>
```

The glow is decoration attached to the content host. It lifts with the card — it is not a static background. It never intercepts touches. V1: behind-content only.

## The design

### JS composition — no new native code

`FxView.tsx` is the only file that changes. The effect is rendered as the **first child** inside `NativeFxStateView`, so it enters the intermediate container before `{children}`. Because `FxStateView.mountChildComponentView` routes all Fabric children into the animated intermediate container, the effect:

- **Is behind the user's content** — earlier mount = lower z-order on both platforms.
- **Lifts with the content** — it is inside the animated layer, not a sibling of it.
- **Does not intercept touches** — a `<View pointerEvents="none">` wrapper makes pass-through explicit without touching `Fx.tsx`.
- **Fills the managed wrapper's Yoga frame** — `style={StyleSheet.absoluteFill}` on both the wrapper and the `<Fx>`.

```tsx
<NativeFxStateView ...>
  {effect != null && (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fx effect={effect} style={StyleSheet.absoluteFill} />
    </View>
  )}
  {children}
</NativeFxStateView>
```

The `<Fx>` component already runs `select()` and mounts the right substrate. With no `interactionMode`, it stays on the decorative/non-interactive path where available. No new wiring is needed — the existing U10/U11 infrastructure handles effect resolution and rendering.

### Scope guard — explicitly NOT this task

- **No on-top / overlay effects.** The effect is always behind. A future `effectPosition: 'behind' | 'over'` prop is deferred until a concrete use case demands it (requires a z-order decision + device matrix for touch and z-order).
- **No `interactionMode` on `FxView.effect`.** `FxView` does not expose `interactionMode`; if a future `EffectId` resolves exclusively to an interactive substrate, warn and no-op then. The current `EffectId | EffectStack` decorative path works through existing `<Fx>` defaults without guarding.
- **No effect events** (`onFxLoad`, `onFxError`) — wiring the error channel through `FxView` is a separate design decision. V1: the effect renders silently.
- **No shape/corner clipping to content.** The effect fills the Yoga layout frame, not the content's visual corner radius or shape.
- **No new native code** — `FxStateView.{swift,kt}` unchanged. The "No effect prop (deferred)" notes in `structure.{ios,android}.md` flip to shipped in docs-closed (docs-closed edits those files; implementation scope is `FxView.tsx` only).
- **No new `fx.*` builder** — `effect` accepts `EffectId | EffectStack` from the existing U10/U11 types.

## Proof

```
Proof:
- headless: packages tsc + build + lint green; 142 existing tests still pass (no native change,
            no FSM or event wiring touched); example tsc. Gate is lightweight — one .tsx file.
- device:   YES — example harness: <FxView preset="lift" state={...} effect={fx.effect.glow()}>
            wrapping a card-like element with a tap target.
            Row 1 — effect renders behind content: the glow is visible, the card content is
                    unobscured (z-order correct on both platforms).
            Row 2 — effect lifts with content: toggling idle→selected lifts both the card AND
                    the glow together (the glow does not stay at the original position).
            Row 3 — touch-through: tapping the card's tap target fires correctly (the
                    pointerEvents="none" wrapper does not swallow touches on either platform).
            Row 4 — state transition stability: rapid idle↔selected flips do not break the
                    effect render or cause visual artifacts.
            Row 5 — no-effect regression: <FxView> without an effect prop works exactly as in
                    U12-001 (lift, touch-through, state events unchanged).
            iOS sim + POCO F1; native rebuild NOT required (JS-only change — Metro reload
            is sufficient, but launch the app fresh per the Device Verification Guide to be safe).
- docs:     57 §FxView — the `effect` line and the `FxView` example code already show the prop;
                         the open question about `effect` is not listed (it was folded into the
                         U12-002 spawn note) — confirm the example is accurate post-ship.
            structure.ios.md — flip the "No effect prop (deferred to a later unit)" note
                               (line ~178) to "Shipped (U12-002): see FxView.tsx."
            structure.android.md — flip the "No effect prop (deferred)" note (line ~226)
                                   to "Shipped (U12-002): see FxView.tsx."
            blueprint Unit 12 — the effect split note already says "U12-002"; confirm accurate.
            52/index.ts — no change (FxView is already exported; effect is a new prop, not a
                          new export).
```

## Authority links

```
Subtask: FxView effect prop — behind-content decoration (blueprint Phase S, Unit 12 scope split)
- Contract anchors:  57 (FxView effect prop + example; Decision 2: preset/motion/effect/transition),
                     50 (the scoped prop language; effect is an EffectStack, 55), 55 (EffectStack
                     type; the one render-target rule — the existing <Fx> guard applies here too),
                     52 (FxView in the Public exports V1 contract — already exported, no new row).
- Decision:          JS composition only (maintainer-aligned 2026-06-21): <View pointerEvents="none"
                     style={absoluteFill}><Fx effect={effect} style={absoluteFill} /></View> as first
                     child inside NativeFxStateView. Behind-only V1. No interactionMode. No effect
                     events. No new native code.
- Reference (HOW):   packages/src/surface/FxView.tsx (the only file changed); packages/src/surface/Fx.tsx
                     (the component being composed; EffectId | EffectStack prop type); packages/src/effects/
                     effects.ts (EffectId type), packages/src/effects/stack.ts (EffectStack type).
                     NativeFxStateView is already imported in FxView.tsx — no new binding needed.
- Guides:            Code Style (FxViewProps extension; typed import for EffectId/EffectStack); Code
                     Comments (iceberg — why pointerEvents is a View wrapper, not a prop on Fx; why
                     first-child gives behind z-order); Testing (142 existing tests must pass unchanged);
                     Device Verification (the 5-row matrix, both platforms, JS change ⇒ Metro reload
                     is sufficient, but rebuild to be safe); Writing Style (structure doc note flip).
- Rules gate:        #1 (native owns the frame loop — JS sends effect config, native renders),
                     #5 (fx wraps your content; effect is the decoration behind it, not a component),
                     #9 (fx reads layout, animates a managed wrapper; the effect fills that wrapper).
- Device-verify:     Row 1 z-order; Row 2 lift-with-content; Row 3 touch-through; Row 4 transition
                     stability; Row 5 no-effect regression.
- Done when:         FxView accepts effect?: EffectId | EffectStack; the glow (or any EffectId)
                     renders behind content, moves with the lift transform, touch passes through;
                     device-verified both platforms; structure doc notes flipped; 57 example confirmed.
```

## Lifecycle

```
[x] spec'd        this file
[x] rules-gated   #1/#5/#9 — native renders, fx wraps, no layout writes
[x] implemented   packages/src/surface/FxView.tsx — effect prop + first-child <View>/<Fx> render
[x] commented     iceberg: one terse line — wrapper = touch-transparent, first-child = behind content
                  (tightened from two lines per maintainer, 2026-06-21); prop JSDoc owns "behind content"
[x] headless-done packages tsc/build/lint + 142 tests green; example tsc (re-run by planner)
[x] reviewed      planner, 2026-06-21 — gates re-run independently (tsc/lint/142 tests/build + example
                  tsc all green); Fx style-forward verified (Fx.tsx:43/116, absoluteFill wins, default
                  composition undefined — no positioning conflict); comment + JSDoc audited iceberg-clean;
                  no fix-round
[ ] device-verified  5-row matrix PASS both platforms; evidence/device.md
[ ] docs-closed   structure.{ios,android}.md "deferred" notes → shipped; 57 example confirmed
[ ] merged
```

## Start here

1. **This file** — behind-only, JS composition, one-file change, scope guard.
2. **`57 §FxView` + Decision 2** — the effect prop is named in the V1 contract; the example already shows it.
3. **`packages/src/surface/FxView.tsx`** — the only file to change: add `effect?: EffectId | EffectStack` to `FxViewProps`, import `EffectId` from `../effects/effects` and `EffectStack` from `../effects/stack`, import `View` and `StyleSheet` from `react-native`, import `Fx` from `./Fx`; add the conditional first-child render.
4. **`packages/src/surface/Fx.tsx`** — read (do not edit): the `effect: EffectId | EffectStack` prop shape and the `<Fx>` render path you are composing.
5. **`agents/session-protocol.md` + `subtask-protocol.md`** — lifecycle, gates, closure.
6. **Guides per gate:** `implemented`→Code Style; `commented`→Code Comments (no internal ids); `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style.
```
