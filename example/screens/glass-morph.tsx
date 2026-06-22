import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Fx, FxGroup, FxItem } from "react-native-fx";
import { useTheme } from "../components/theme";

const GLASS_W = 130;
const GLASS_H = 100;
const CLOSE_GAP = 4;
const FAR_GAP = 80;

export function GlassMorphScreen() {
	const { palette } = useTheme();
	const [gap, setGap] = useState(CLOSE_GAP);
	const [tapped, setTapped] = useState<string | null>(null);

	const groupWidth = GLASS_W * 2 + gap + 32;

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 24, alignItems: "center" }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13, alignSelf: "flex-start" }}>
				FxGroup · two glass items · iOS 26 morph spike
			</Text>

			{/* Gap control */}
			<View style={styles.controls}>
				<Pressable
					style={[styles.chip, { borderColor: gap === CLOSE_GAP ? "#339af0" : palette.textMuted }]}
					onPress={() => setGap(CLOSE_GAP)}
				>
					<Text style={{ color: palette.text, fontSize: 12 }}>close ({CLOSE_GAP}px)</Text>
				</Pressable>
				<Pressable
					style={[styles.chip, { borderColor: gap === FAR_GAP ? "#339af0" : palette.textMuted }]}
					onPress={() => setGap(FAR_GAP)}
				>
					<Text style={{ color: palette.text, fontSize: 12 }}>apart ({FAR_GAP}px)</Text>
				</Pressable>
			</View>

			{/* The spike harness */}
			<FxGroup
				style={[
					styles.group,
					{ width: groupWidth, backgroundColor: palette.surface },
				]}
			>
				{/*
				 * Pressables added first so they are behind the glass in z-order.
				 * Touch passes through the decorative (non-interactive) glass to reach them.
				 */}
				<Pressable
					style={[styles.label, { left: 16 }]}
					onPress={() => setTapped("A")}
				>
					<Text style={{ color: palette.text, fontSize: 13, fontWeight: "600" }}>A</Text>
					<Text style={{ color: palette.textMuted, fontSize: 10 }}>tap me</Text>
				</Pressable>
				<Pressable
					style={[styles.label, { left: 16 + GLASS_W + gap }]}
					onPress={() => setTapped("B")}
				>
					<Text style={{ color: palette.text, fontSize: 13, fontWeight: "600" }}>B</Text>
					<Text style={{ color: palette.textMuted, fontSize: 10 }}>tap me</Text>
				</Pressable>

				{/* Glass items on top */}
				<FxItem>
					<Fx
						effect="glass"
						style={{
							position: "absolute",
							left: 16,
							top: 0,
							width: GLASS_W,
							height: GLASS_H,
						}}
					/>
				</FxItem>
				<FxItem>
					<Fx
						effect="glass"
						style={{
							position: "absolute",
							left: 16 + GLASS_W + gap,
							top: 0,
							width: GLASS_W,
							height: GLASS_H,
						}}
					/>
				</FxItem>
			</FxGroup>

			{tapped !== null && (
				<Text style={{ color: "#51cf66", fontSize: 13 }}>
					Touch reached item {tapped} — touch-through OK
				</Text>
			)}

			<Text style={[styles.hint, { color: palette.textMuted }]}>
				iOS 26: do the two items merge when "close"? Separate when "apart"?{"\n"}
				iOS {"<"}26 / Android: individual glass, no merge — expected.
			</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	group: {
		height: GLASS_H,
		borderRadius: 12,
		overflow: "hidden",
	},
	label: {
		position: "absolute",
		top: 28,
		width: GLASS_W,
		alignItems: "center",
	},
	controls: {
		flexDirection: "row",
		gap: 8,
		alignSelf: "flex-start",
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
	},
	hint: {
		fontSize: 11,
		lineHeight: 16,
		alignSelf: "flex-start",
	},
});
