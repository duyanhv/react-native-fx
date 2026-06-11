import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function CompsLayout() {
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
			<Stack.Screen name="index" options={{ title: "Comps" }} />
			<Stack.Screen name="[compId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
