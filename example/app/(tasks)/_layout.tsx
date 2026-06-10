import { Stack } from "expo-router";

export default function TasksLayout() {
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
			<Stack.Screen name="index" options={{ title: "Tasks" }} />
			<Stack.Screen name="[taskId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
