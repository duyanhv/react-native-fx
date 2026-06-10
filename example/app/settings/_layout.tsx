import { Stack } from "expo-router";

export default function SettingsLayout() {
	return (
		<Stack
			screenOptions={{
				headerLargeTitle: true,
				headerTransparent: true,
				headerShadowVisible: false,
				headerLargeTitleShadowVisible: false,
				headerLargeStyle: { backgroundColor: "transparent" },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Settings" }} />
		</Stack>
	);
}
