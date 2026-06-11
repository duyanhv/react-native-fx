import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function TasksLayout() {
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
			<Stack.Screen name="index" options={{ title: "Tasks" }} />
			<Stack.Screen name="[taskId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
