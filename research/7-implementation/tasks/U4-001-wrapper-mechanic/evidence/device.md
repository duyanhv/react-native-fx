# U4-001 device scenario — child rides animated intermediate container

**Device gate:** verify the intermediate container mechanic works on Fabric.

## Scenario

Mount an RN child inside `<FxPresence>` and confirm the child rides the animated
intermediate container and hit-testing survives.

### Setup

```tsx
function Test() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Toggle" onPress={() => setOpen(!open)} />
      <FxPresence visible={open} preset="transient">
        <View style={{ padding: 20, backgroundColor: '#fff' }}>
          <Text>Tap me</Text>
        </View>
      </FxPresence>
    </View>
  );
}
```

### Steps

1. **Build the example app** with the current `react-native-fx` package.
2. **Tap "Toggle"** to show the `<FxPresence>`.
3. **Observe:** the child view (`<Text>Tap me</Text>`) should enter with the `transient`
   preset animation (slide in from the top edge on iOS, bottom edge on Android).
4. **While the enter animation is running**, tap the child.
   - **iOS:** the tap may land at the target (final) position, not the on-screen
     position — this is the model-layer caveat, expected behavior.
   - **Android:** the tap should land at the visual position as it moves.
5. **After the animation completes**, tap the child. The tap should be received
   correctly on both platforms.
6. **Tap "Toggle" again** to hide. The child should exit with the exit animation.

### Pass criteria

- [ ] The child view rides the animated container — it moves with the animation,
  not left behind at the original position.
- [ ] Hit-testing at rest works correctly on both platforms.
- [ ] The iOS mid-flight model-layer caveat is observed (or noted as acceptable
  for short envelopes).
- [ ] No crash or layout corruption.

### Failure modes

- Child does not move with the animation → the intermediate container is not
  receiving the children or the animator is not targeting the container.
- Hit-testing fails at rest → the intermediate container is intercepting touches
  instead of passing them through to the child.
- iOS crash on mount → the `mountChildComponentView` override is not compatible
  with the current Expo Modules / Fabric version.

### Notes

- This scenario verifies the **decided mechanic** from U4-001. The actual
  `mountChildComponentView` override implementation is owned by U4-002 (RT-014).
- If the device scenario fails, the decision in `33`/`34` may need revision.
