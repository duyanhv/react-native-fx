import { Stack } from "expo-router";

export default function CompsLayout() {
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
			<Stack.Screen name="index" options={{ title: "Comps" }} />
			<Stack.Screen name="[compId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
