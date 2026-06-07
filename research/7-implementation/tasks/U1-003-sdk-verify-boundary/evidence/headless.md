# U1-003 — Device scenario

## Goal

Verify four Expo Modules SDK 56 boundary behaviors before closing SURF-010, RT-010, RT-011, and RT-004.

## Steps

1. Run Scenario 1 from the task README on iOS and Android: mount `FxHostedView`, `FxSurfaceView`, and `FxGroupView` from the internal runtime bindings, then fast refresh.
2. Run Scenario 2 from the task README: add the temporary `BoundaryTestRecord` prop on iOS and Android, send omitted and explicit fields, and inspect the coerced native record values.
3. Run Scenario 3 from the task README: mount distinct `FxSurfaceView` rows in a `FlatList`, scroll them out and back, toggle conditional mounts, and log native object identity plus prop state on iOS and Android.
4. Run Scenario 4 from the task README: add prop-setter counters on iOS and Android, re-render unchanged primitive props, re-render a fresh `_testRecord` object with the same effective value, then re-render with a changed field.
5. Remove every temporary record, prop, log, and counter after observation.
6. Record the result in `device.md` beside this file, with screenshots or logs in sibling folders if needed.

## Expected result

- All three registered native views resolve at runtime with no duplicate-registration error on iOS and Android.
- Omitted `Record` fields receive their native defaults on both iOS and Android.
- No native view instance is rebound to a different React row/tag with stale shader, intensity, or interaction mode.
- Unchanged primitive props and unchanged nested `Record` props skip their native setters on both iOS and Android.

## Failure signs

- A native view cannot resolve, or fast refresh reports duplicate view registration.
- An omitted record field becomes `nil`, `0`, or a platform-specific default instead of the declared default.
- A native object identity appears under a different row/tag with prior prop state.
- Primitive props skip but nested records do not, or setters fire on every re-render for equal values. This is a valid SURF-010 rework outcome, not a failed setup by itself.

## Platform

- iOS: yes, SDK 56 app, simulator or physical device.
- Android: yes, SDK 56 app, physical device preferred; emulator acceptable for these boundary-only checks if the native app build is otherwise representative.
