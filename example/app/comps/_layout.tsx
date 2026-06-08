import { Stack } from "expo-router";

export default function CompsLayout() {
	return (
		<Stack screenOptions={{ headerLargeTitle: true }}>
			<Stack.Screen name="index" options={{ title: "Comps" }} />
			<Stack.Screen name="[compId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
