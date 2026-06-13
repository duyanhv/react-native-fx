# DEF-015 — the V1 naming review (surface freeze) + the package-name call

Type: `ratify` · State: `merged` · Device: no · Consumes: — · Closes: — (no ledger row) · **Blocks DEF-016**

Origin: critique F17 (LOW, API) + F15 (LOW, ship). The surface-freeze trigger is reached —
Units 5/6/7/8 are done, so the public vocabulary is now stable enough to name once and freeze.
This is the publish-critical unblocker: DEF-016 (the mechanical rename of `packages/package.json`
+ all README/skills/doc refs) cannot run until the name is decided here.

## The four sub-decisions

This task owns one naming pass over the frozen surface plus the package identity. Each is an
independent call; record each in its owning doc.

- **(a) The `<Fx effect={fx.effect.*}>` stutter.** The drawn-effect component `<Fx>`, the
  `effect` prop, and the `fx.effect.*` builder namespace stack three forms of the same token
  in one call site: `<Fx effect={fx.effect.glow()}>`. Decide whether to rename one of the
  three, accept the stutter, or restructure the builder entry point. Owning docs: `50`
  (the prop language + builder namespaces), `55` (the composition chain + `fx.effect.*`).
- **(b) `interactionMode` runtime vocabulary on a user surface.** `interactionMode="none |
  passive | active | controlled"` (`<Fx>`, `30`) reads as runtime-internal vocabulary on a
  consumer-facing prop. Decide whether the value set / prop name should speak in
  user-intent terms instead. Owning docs: `50` (the prop), `4-runtime/30` (the interaction
  semantics behind the values).
- **(c) `hosted` / `expo-view` mechanism leakage above the manifest.** The two substrate
  names (rule #3) are mechanism — and `expo-view` names a vendor — yet they appear in docs
  that otherwise refuse to leak mechanism above the capability vocabulary (rule #2). Decide
  the public-facing vocabulary for the substrate distinction (or confirm it never surfaces
  publicly and is research-internal only). Owning docs: `0-spine/01`/`02` (substrate), `56`,
  and the `skills/` parity story (DEF-016 consumes the outcome). _Note: a scan on
  2026-06-13 found no `hosted`/`expo-view` leak in `skills/` — the leak is in the research
  layer; confirm scope before churning._
- **(d) The package-name call (F15).** The unscoped `react-native-fx` is **unclaimable** on
  npm — the typosquat filter rejects it as too close to `react-native-fs`. A placeholder
  `react-native-fxkit@0.0.1` is published (2026-06-11). `packages/package.json` still reads
  the unpublishable `react-native-fx`. Decide whether the product/repo identity adopts
  `fxkit`, or keeps `react-native-fx` as the product name over an `fxkit` package. Owning
  artifact: `packages/package.json` `name` (renamed under DEF-016, not here) + the product
  story in README/`skills/`.

## Subtask

- Contract anchors:  `1-surface/50` (the public prop language + builder namespaces — the
                     umbrella), `1-surface/55` (`fx.effect.*` / composition chain),
                     `1-surface/56` (behavior presets), `1-surface/54` (presence surface),
                     `4-runtime/30` (interaction semantics behind `interactionMode`),
                     `0-spine/01`/`02` (substrate + the capability-vocabulary law).
- Decision:          `ratify` — decide each of the four calls as a prose design dialogue with
                     the maintainer; record each in its owning surface doc. No ledger row.
- Reference (HOW):   the ecosystem naming precedents the critique cites (RNGH's
                     builder-over-component shift; the `react-native-*` package landscape) —
                     framing only, not adopted.
- Guides:            `Writing Style Guide.md` (the doc edits).
- Rules gate:        #2 (one platform-agnostic capability vocabulary — agnostic names,
                     platform-native defaults; never expose `SwiftUI*`/`Compose*` names above
                     the manifest — governs (b)+(c)); #5 (fx is not a UI kit; the front door
                     is platform-native behavior presets, not exported components — governs
                     how (a) names the drawn-effect surface).
- Device-verify:     none — docs + a package-name call.
- Done when:         each of the four calls is decided and recorded in its owning doc; the
                     package-name decision is explicit enough for DEF-016 to execute the
                     `package.json` + docs rename without re-deciding.

## Decision

Ratified by the maintainer (2026-06-13), driven as a prose design dialogue.

- **(a) `<Fx effect={fx.effect.*}>` — keep as-is.** The repetition lives only at the layer-3
  builder escape hatch; the front door is the string form `<Fx effect="plasma" />` + presets.
  The `fx.effect.*`/`fx.motion.*` symmetry is a deliberate mnemonic, not broken to de-stutter
  a rare site. **No bare `effect` export ships in V1.** Recorded in `50` Decision 8 + `55`
  Decision 7.
- **(b) `interactionMode` — keep the prop and `none | passive | active`.** Agnostic names (no
  rule-#2 leak); intent-word substitutes collide inside fx (`pressable` = `FxPressable`,
  `reactive` = Reanimated). `controlled` is **defined but deferred to DEF-020** (no V1
  consumer for its `setUniform`/`setHighlight` write path). Recorded in `30` Decision 7 + the
  `controlled` contract-table marker; `50` Decision 8.
- **(c) `hosted` / `expo-view` — research-internal only.** Lowering vocabulary, never
  end-user vocabulary; the substrate is derived from the chosen capability. Public docs state
  capability constraints, never substrate names. Recorded in `01` (§The two substrates guard)
  + `02` (§Canonical IR node vocabulary guard); `50` Decision 8. _Scan 2026-06-13: `skills/`
  is already clean — the guard prevents reintroduction._
- **(d) Package name — publish unscoped as `react-native-fxkit`** (revised 2026-06-13). The
  decision first landed on `@react-native-fx/core`, but claiming that scope needs a by-hand
  npm org creation (no `npm org create` CLI exists; verified the org was free but the claim
  is a website step). The maintainer chose the already-owned, already-published
  `react-native-fxkit@0.0.1` instead — it removes the scope-claim blocker entirely. The
  unscoped `react-native-fx` stays unclaimable (typosquat filter vs `react-native-fs`). API
  symbols stay short (`Fx`/`fx.*`); the package name is not an API symbol. The mechanical
  `package.json` + docs rename is DEF-016, not this task. Recorded in `50` Decision 8 + `52`
  Decision 10.

## Proof

- headless: N/A — docs + a naming call.
- device:   N/A.
- docs:     `50` (Decision 8), `55` (Decision 7), `30` (Decision 7 + `controlled` row),
            `01`/`02` (substrate-vocabulary guard), `52` (Decision 10 reconciled — the
            single core package publishes under the scope, not a multi-package split). No
            `Closes:` ledger row of its own. `packages/package.json` `name` + the
            install/import snippets across docs are DEF-016's mechanical follow-through.

## DEF-016 mechanical-reference inventory (not changed here)

The decision-level docs are reconciled. These literal `react-native-fx` install/import
snippets are the mechanical swap DEF-016 owns (→ `react-native-fxkit`):
`52` §publishing (l.20 "npm `react-native-fx`", l.73 `from 'react-native-fx'`), `53` install
snippets (l.33/68), `data-layer.md` l.843 import example, `tasks/EX-001-device-harness`
import, and `skills/react-native-fx/SKILL.md` (the end-user usage skill — install/import +
the parity/degradation story per DEF-016's F13 scope). The Gradle module id
`:react-native-fx:` and the GitHub remote in the podspec are NOT package-name references and
stay unless the repo itself is renamed (a separate maintainer call).
