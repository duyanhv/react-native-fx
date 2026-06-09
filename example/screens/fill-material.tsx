import { ScrollView, StyleSheet, Text, View } from "react-native";
import { FxHostedView } from "react-native-fx";
import { useTheme } from "../components/theme";

export function FillMaterialScreen() {
	const { palette } = useTheme();
	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				fill · gradient (iOS + Android)
			</Text>
			<FxHostedView effect="fill" intensity={0.8} style={styles.box} />

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				fill · gradient, intensity 0.3
			</Text>
			<FxHostedView effect="fill" intensity={0.3} style={styles.box} />

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				material · glass over content (iOS only)
			</Text>
			<View style={[styles.box, { backgroundColor: palette.surface }]}>
				<View style={styles.cardContent}>
					<View style={[styles.colorBlock, { backgroundColor: "#ff6b6b" }]} />
					<View style={[styles.colorBlock, { backgroundColor: "#51cf66" }]} />
					<View style={[styles.colorBlock, { backgroundColor: "#339af0" }]} />
					<Text style={[styles.cardText, { color: palette.text }]}>
						Hello from behind glass
					</Text>
				</View>
				<FxHostedView
					effect="material"
					intensity={0.6}
					style={StyleSheet.absoluteFill}
				/>
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				none · empty (no effect prop)
			</Text>
			<FxHostedView
				style={[styles.box, { backgroundColor: palette.surface }]}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	box: { width: 200, height: 150 },
	cardContent: {
		flex: 1,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "center",
		padding: 8,
		gap: 6,
	},
	colorBlock: { width: 50, height: 50, borderRadius: 8 },
	cardText: {
		fontSize: 14,
		fontWeight: "600",
		width: "100%",
		textAlign: "center",
	},
});
