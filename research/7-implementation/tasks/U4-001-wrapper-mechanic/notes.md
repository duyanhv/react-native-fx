## 2026-06-09 — U4-001 rework complete (headless-done → device-pending)

### What changed and why

- **Decided the intermediate container mechanic.** The animator targets an intermediate
  container — a native view inside `FxSurfaceView` that Fabric does not track — so
  Fabric cannot clobber its `transform`/`opacity`. This is a view, not a raw `CALayer`,
  and the override is scoped to `FxSurfaceView` (expo-view substrate only), not the
  abstract `FxNativeView` base.

- **Source docs reconciled:**
  - `33-shadow-nodes-and-layout.md`: replaced ambiguous "intermediate layer/container"
    with "intermediate container" and defined it explicitly. Updated the falsification
    test to refer to the container.
  - `34-animation-driver.md`: updated the verified-against-source finding to use
    "intermediate container". Added a forward-pointer about the `hitTest` override
    deferred to U6/U8.

- **Platform mechanics pinned:**
  - `structure.ios.md`: added the intermediate container mechanic to the `motion`
    content target section. Updated the touch contract to note the container and
    shaped/SDF pass-through compose in the same `hitTest` override.
  - `structure.android.md`: added the intermediate container mechanic to the `motion`
    content target section.

- **Consumers reconciled:**
  - `architecture.md` §5.1: replaced "FxManagedView" and "intermediate sublayer" with
    "intermediate container inside FxSurfaceView". Updated the diagram. Added the
    forward-pointer about the `hitTest` override.
  - `data-layer.md`: updated the `motion` node notes to refer to the intermediate
    container.
  - `blueprint.md` Unit 4: corrected the decision text from "FxNativeView creates..."
    to "FxSurfaceView creates..." and the shape line from "Native sublayer" to
    "Intermediate container".

- **Device scenario written:** `tasks/U4-001/evidence/device.md` defines the test:
  mount an RN child inside `<FxPresence>`, toggle `visible`, confirm the child rides
  the animated container and hit-testing survives at rest.

### Unverified claims

- The device scenario is written but not executed — the device gate is the human's.
- The actual `mountChildComponentView` override implementation is owned by U4-002
  (RT-014), not U4-001.

### Ledger

- **RT-015 closed** in `33`/`34` — the exact object the animator targets is now
  decided and documented in the source docs. The consumers (`architecture.md`,
  `data-layer.md`, `blueprint.md`) are reconciled to match.

### Next: U4-002 (RT-014) — implement and verify the `mountChildComponentView` override on device.
