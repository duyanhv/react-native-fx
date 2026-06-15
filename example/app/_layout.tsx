import { NativeTabs } from "expo-router/unstable-native-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "../components/theme";

// react-native-gesture-handler requires a single root host above every screen so its
// native gestures (the RNGH pan/bottom-sheet drags on the coexistence screen) resolve
// against one touch tree. It must stay outermost and fill the window. The library itself
// stays RNGH-free — this is example-app wiring, not a runtime dependency.
export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ThemeProvider>
				<NativeTabs>
					<NativeTabs.Trigger name="(tasks)">
						<NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
						<NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
					</NativeTabs.Trigger>
					<NativeTabs.Trigger name="comps">
						<NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="widgets" />
						<NativeTabs.Trigger.Label>Comps</NativeTabs.Trigger.Label>
					</NativeTabs.Trigger>
					<NativeTabs.Trigger name="settings">
						<NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
						<NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
					</NativeTabs.Trigger>
				</NativeTabs>
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}
