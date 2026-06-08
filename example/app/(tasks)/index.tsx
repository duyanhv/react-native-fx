import { Link } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../components/theme";
import { type DeviceTask, TASKS, type TaskStatus } from "../../data/tasks";

export default function TasksScreen() {
	const { palette } = useTheme();

	const badgeBg: Record<TaskStatus, string> = {
		verified: palette.badgeVerifiedBg,
		"in-progress": palette.badgeProgressBg,
		todo: palette.badgeTodoBg,
	};
	const badgeFg: Record<TaskStatus, string> = {
		verified: palette.badgeOnColor,
		"in-progress": palette.badgeOnColor,
		todo: palette.badgeTodoText,
	};

	return (
		<FlatList
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 12 }}
			data={TASKS}
			keyExtractor={(task) => task.id}
			renderItem={({ item }: { item: DeviceTask }) => (
				<Link href={`/${item.id}`} asChild>
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
									color: palette.accent,
									fontSize: 15,
									fontWeight: "700",
								}}
							>
								{item.id}
							</Text>
							<Text
								style={{
									fontSize: 11,
									fontWeight: "700",
									paddingHorizontal: 8,
									paddingVertical: 2,
									borderRadius: 6,
									overflow: "hidden",
									color: badgeFg[item.status],
									backgroundColor: badgeBg[item.status],
								}}
							>
								{item.status}
							</Text>
						</View>
						<Text
							style={{ color: palette.text, fontSize: 15, fontWeight: "600" }}
						>
							{item.title}
						</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							{item.platform}
						</Text>
						<Text style={{ color: palette.textFaint, fontSize: 12 }}>
							{item.what}
						</Text>
					</TouchableOpacity>
				</Link>
			)}
		/>
	);
}
