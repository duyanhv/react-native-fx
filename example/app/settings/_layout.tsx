import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function SettingsLayout() {
	return (
		<Stack
			screenOptions={{
				headerLargeTitle: true,
				headerTransparent: Platform.OS === "ios",
				headerShadowVisible: Platform.OS !== "ios",
				headerLargeTitleShadowVisible: false,
				headerLargeStyle: { backgroundColor: "transparent" },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Settings" }} />
		</Stack>
	);
}
