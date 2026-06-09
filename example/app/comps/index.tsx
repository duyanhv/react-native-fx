import { Link } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../components/theme";
import { COMPS, type Comp } from "../../data/comps";

export default function CompsScreen() {
	const { palette } = useTheme();

	return (
		<FlatList
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 12 }}
			data={COMPS}
			keyExtractor={(comp) => comp.id}
			renderItem={({ item }: { item: Comp }) => {
				const ready = item.status === "ready";
				return (
					<Link href={`/comps/${item.id}`} asChild>
						<TouchableOpacity
							style={{
								backgroundColor: palette.surface,
								borderRadius: 12,
								borderWidth: 1,
								borderColor: palette.surfaceBorder,
								padding: 14,
								gap: 4,
							}}
						>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<Text
									style={{
										color: palette.text,
										fontSize: 15,
										fontWeight: "600",
									}}
								>
									{item.title}
								</Text>
								<Text
									style={{
										fontSize: 11,
										fontWeight: "700",
										paddingHorizontal: 8,
										paddingVertical: 2,
										borderRadius: 6,
										overflow: "hidden",
										color: ready ? palette.badgeOnColor : palette.badgeTodoText,
										backgroundColor: ready
											? palette.badgeVerifiedBg
											: palette.badgeTodoBg,
									}}
								>
									{item.status}
								</Text>
							</View>
							<Text style={{ color: palette.textMuted, fontSize: 12 }}>
								{item.subtitle}
							</Text>
						</TouchableOpacity>
					</Link>
				);
			}}
		/>
	);
}
