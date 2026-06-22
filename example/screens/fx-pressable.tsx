import { useCallback, useState } from "react";
import {
	FlatList,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { FxPressable } from "react-native-fx";
import { useTheme } from "../components/theme";

interface LogEntry {
	id: string;
	event: string;
	timestamp: number;
}

/**
 * FxPressable device harness — the native press feedback over a shared press FSM.
 *
 * Exercises FxPressable with semantic event logging (onPressIn/Out/Press/LongPress).
 * The basic demo shows scale + opacity press feedback. The scroll-yield test
 * exercises FxPressable nested inside a ScrollView to verify that scrolling yields
 * press and emits only onPressOut. The semantic log captures all press events for
 * inspection.
 */
export function FxPressableScreen() {
	const { palette } = useTheme();
	const [log, setLog] = useState<LogEntry[]>([]);

	const addLog = useCallback((event: string) => {
		const entry: LogEntry = {
			id: `${Date.now()}-${Math.random()}`,
			event,
			timestamp: Date.now(),
		};
		setLog((prev) => [entry, ...prev].slice(0, 20)); // Keep last 20
	}, []);

	const handlePressIn = () => addLog("onPressIn");
	const handlePressOut = () => addLog("onPressOut");
	const handlePress = () => addLog("onPress");
	const handleLongPress = () => addLog("onLongPress");
	const clearLog = () => setLog([]);

	const labelStyle = [styles.label, { color: palette.textMuted }];
	const buttonStyle = [
		styles.button,
		{ backgroundColor: palette.surfaceActive },
	];

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 12 }}
		>
			<Text style={labelStyle}>1 · basic press feedback (scale + opacity)</Text>
			<FxPressable
				feedback="native"
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={handlePress}
				onLongPress={handleLongPress}
				style={styles.pressableContainer}
			>
				<Pressable style={buttonStyle}>
					<Text style={{ color: palette.text, fontWeight: "600" }}>
						Press Me
					</Text>
				</Pressable>
			</FxPressable>

			<Text style={labelStyle}>
				2 · scroll-yield test (drag the button vertically to yield and test
				scroll)
			</Text>
			<ScrollView
				style={[
					styles.scrollTestContainer,
					{
						borderColor: palette.surfaceBorder,
						backgroundColor: palette.surface,
					},
				]}
				scrollEnabled
			>
				<View style={styles.scrollContent}>
					<FxPressable
						feedback="native"
						onPressIn={handlePressIn}
						onPressOut={handlePressOut}
						onPress={handlePress}
						onLongPress={handleLongPress}
						style={styles.pressableContainer}
					>
						<Pressable style={buttonStyle}>
							<Text style={{ color: palette.text, fontWeight: "600" }}>
								Scroll Yield Test
							</Text>
						</Pressable>
					</FxPressable>
					<View style={{ height: 60 }} />
				</View>
			</ScrollView>

			<View
				style={[
					styles.logBox,
					{
						backgroundColor: palette.surface,
						borderColor: palette.surfaceBorder,
					},
				]}
			>
				<View style={styles.logHeader}>
					<Text style={[styles.label, { color: palette.textFaint }]}>
						semantic log (newest first)
					</Text>
					<Pressable onPress={clearLog} style={styles.clearButton}>
						<Text style={{ fontSize: 12, color: palette.textMuted }}>
							Clear
						</Text>
					</Pressable>
				</View>
				{log.length === 0 ? (
					<Text style={{ color: palette.textFaint }}>— no events yet —</Text>
				) : (
					<FlatList
						data={log}
						renderItem={({ item }) => (
							<View style={styles.logEntry}>
								<Text style={{ color: palette.text, fontWeight: "500" }}>
									{item.event}
								</Text>
								<Text style={{ color: palette.textFaint, fontSize: 11 }}>
									{item.timestamp % 1000}
								</Text>
							</View>
						)}
						keyExtractor={(item) => item.id}
						scrollEnabled={false}
						nestedScrollEnabled={false}
					/>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	label: {
		fontSize: 13,
	},
	pressableContainer: {
		marginBottom: 8,
	},
	button: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: "center",
	},
	scrollTestContainer: {
		height: 150,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: 8,
	},
	scrollContent: {
		padding: 16,
		alignItems: "center",
	},
	logBox: {
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		gap: 8,
		minHeight: 100,
	},
	logHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	clearButton: {
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	logEntry: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 6,
		paddingHorizontal: 8,
		borderRadius: 4,
		backgroundColor: undefined, // inherit from surface
	},
});
