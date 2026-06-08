import { NativeTabs } from "expo-router/unstable-native-tabs";
import { ThemeProvider } from "../components/theme";

export default function RootLayout() {
	return (
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
	);
}
