import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FxHostedView } from "react-native-fx";
import { useTheme } from "../components/theme";

const TINTS = [
	{ label: "none", value: undefined as string | undefined },
	{ label: "#ff6b6b", value: "#ff6b6b" },
	{ label: "#339af0", value: "#339af0" },
	{ label: "#51cf66", value: "#51cf66" },
] as const;

const COLOR_SCHEMES = ["system", "light", "dark"] as const;
type ColorSchemeValue = (typeof COLOR_SCHEMES)[number];

export function FillMaterialScreen() {
	const { palette } = useTheme();
	const [tint, setTint] = useState<string | undefined>(undefined);
	const [colorScheme, setColorScheme] = useState<ColorSchemeValue>("system");

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

			<Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
				material · tint + colorScheme (U15-001)
			</Text>

			<Text style={{ color: palette.textMuted, fontSize: 11 }}>tint</Text>
			<View style={styles.row}>
				{TINTS.map((t) => (
					<Pressable
						key={t.label}
						onPress={() => setTint(t.value)}
						style={[
							styles.chip,
							{ borderColor: palette.textMuted },
							tint === t.value && { borderColor: "#339af0", borderWidth: 2 },
						]}
					>
						{t.value && (
							<View
								style={[styles.swatch, { backgroundColor: t.value }]}
							/>
						)}
						<Text style={{ color: palette.text, fontSize: 12 }}>{t.label}</Text>
					</Pressable>
				))}
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 11 }}>colorScheme</Text>
			<View style={styles.row}>
				{COLOR_SCHEMES.map((cs) => (
					<Pressable
						key={cs}
						onPress={() => setColorScheme(cs)}
						style={[
							styles.chip,
							{ borderColor: palette.textMuted },
							colorScheme === cs && { borderColor: "#339af0", borderWidth: 2 },
						]}
					>
						<Text style={{ color: palette.text, fontSize: 12 }}>{cs}</Text>
					</Pressable>
				))}
			</View>

			<View style={[styles.box, { backgroundColor: palette.surface }]}>
				<View style={styles.cardContent}>
					<View style={[styles.colorBlock, { backgroundColor: "#ff6b6b" }]} />
					<View style={[styles.colorBlock, { backgroundColor: "#51cf66" }]} />
					<View style={[styles.colorBlock, { backgroundColor: "#339af0" }]} />
					<Text style={[styles.cardText, { color: palette.text }]}>
						tint: {tint ?? "none"} · {colorScheme}
					</Text>
				</View>
				<FxHostedView
					effect="material"
					intensity={0.7}
					materialConfig={{ tint, colorScheme }}
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
	sectionLabel: { fontSize: 13, marginTop: 8 },
	row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
	},
	swatch: { width: 12, height: 12, borderRadius: 3 },
});
