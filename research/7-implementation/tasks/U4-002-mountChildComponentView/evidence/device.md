# U4-002 device scenario — RN child mounts into the intermediate container

**Device gate:** verify the `mountChildComponentView` override works on Fabric.

## Scenario

Mount an RN child inside `<FxSurfaceView>` and confirm it lands in the intermediate container, rides the animation, and hit-testing survives.

### Setup

Open the **U4-002 / content-motion** screen in the example app. The screen is registered as a runnable device task in the example app registry.

### Steps

1. **Build the example app** with the current `react-native-fx` package.
2. **Tap "Toggle"** to show the child.
3. **Observe:** the child view (`<Text>Tap me</Text>`) should appear inside the `FxSurfaceView`.
4. **Tap the child.** The tap should be received correctly.
5. **Tap "Toggle" again** to hide. The child should disappear.

### Pass criteria

- [ ] The child view renders inside `FxSurfaceView` — it is routed into the intermediate container, not left behind or clipped.
- [ ] The child measures and layouts correctly — its size matches its declared styles (not 0×0 or collapsed).
- [ ] The child draws correctly — background color and text are visible, not blank or clipped.
- [ ] Hit-testing works correctly on both platforms — tap lands exactly on the child's visual bounds.
- [ ] No crash or layout corruption.

### Failure modes

- Child does not appear → the `mountChildComponentView` / `addView` override is not routing children into the intermediate container.
- Child appears but measures 0×0 or is mis-positioned → the Android proxy methods (`getChildCount`/`getChildAt`/`indexOfChild`) are confusing the framework's traversal; the container is not being laid out correctly.
- Child appears but is blank or clipped → the draw traversal is skipping the intermediate container's subtree.
- Child appears but hit-testing fails → the intermediate container is intercepting touches instead of passing them through, or the touch traversal is not reaching the grandchildren.
- iOS crash on mount → the `mountChildComponentView` override signature does not match the Expo/Fabric superclass (e.g., UIView vs UIView!, internal vs open, arg labels).

### Notes

- **iOS test condition:** Do not pass a `shader` prop. With no active effect, `metalView` is hidden and the content-motion container is fully visible. The both-active case (shader + content) is the open item flagged in `34` — not tested here.
- **Android traversal risk:** `FxSurfaceView` proxies `getChildCount`/`getChildAt`/`indexOfChild` to `intermediateContainer`. This is necessary for Fabric reconciliation consistency, but it can confuse the framework's measure/layout/draw/touch traversal. Watch for: double-layout, mis-positioning, blank frames, or touch anomalies.
- This scenario verifies the **override implementation** from U4-002. The animation test (child riding the animated container) is owned by U4-001 and requires the animator (U6-001) to be active.
