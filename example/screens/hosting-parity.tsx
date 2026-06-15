import { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { FxHostedView, type MaterialVariant } from "react-native-fx";
import { NativeSegmented } from "../components/native-segmented";
import { NativeSlider } from "../components/native-slider";
import { useTheme } from "../components/theme";

const BOUNDARY_COUNT = 12;

const GLASS_VARIANTS: MaterialVariant[] = ["regular", "clear"];

const INTERACTIVE_MODES = ["static", "interactive"] as const;

const SHADER_IDS = [
	"fractal-clouds",
	"ink-smoke",
	"liquid-chrome",
	"loop",
	"dots",
	"aurora",
] as const;

export function HostingParityScreen() {
	const { palette } = useTheme();
	const [intensity, setIntensity] = useState(0.8);
	const [variantIndex, setVariantIndex] = useState(0);
	const [interactiveIndex, setInteractiveIndex] = useState(0);

	const variant = GLASS_VARIANTS[variantIndex];
	const interactive = INTERACTIVE_MODES[interactiveIndex] === "interactive";

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U3-002 · Hosting parity / many boundaries / uniform alignment
			</Text>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				Many boundaries — fill and shader mixed
			</Text>

			<View style={styles.grid}>
				{Array.from({ length: BOUNDARY_COUNT }).map((_, i) => {
					const isFill = i % 2 === 0;
					return (
						<View key={i} style={styles.cell}>
							{isFill ? (
								<FxHostedView
									effect="fill"
									intensity={0.5}
									style={styles.tile}
								/>
							) : (
								<FxHostedView
									effect={SHADER_IDS[(i % SHADER_IDS.length)]}
									intensity={intensity}
									style={styles.tile}
								/>
							)}
							<Text style={[styles.cellLabel, { color: palette.textFaint }]}>
								{isFill ? "fill" : SHADER_IDS[(i % SHADER_IDS.length)]}
							</Text>
							</View>
						);
					})}
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				Multi-uniform shader — intensity observable
			</Text>

			<FxHostedView
				effect="loop"
				intensity={intensity}
				style={styles.box}
			/>

			<NativeSlider value={intensity} min={0} max={1} onChange={setIntensity} />

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				intensity {intensity.toFixed(2)}
			</Text>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				Glass styles — variant and press response (iOS 26)
			</Text>

			<View style={styles.row}>
				<Text style={[styles.label, { color: palette.text }]}>Variant</Text>
				<NativeSegmented
					options={GLASS_VARIANTS}
					selectedIndex={variantIndex}
					onChange={setVariantIndex}
				/>
			</View>

			<View style={styles.row}>
				<Text style={[styles.label, { color: palette.text }]}>
					Press response
				</Text>
				<NativeSegmented
					options={[...INTERACTIVE_MODES]}
					selectedIndex={interactiveIndex}
					onChange={setInteractiveIndex}
				/>
			</View>

			<View style={styles.glassStage}>
				<FxHostedView effect="aurora" intensity={0.8} style={styles.backdrop} />
				<FxHostedView
					effect="material"
					materialConfig={{ variant, interactive }}
					style={styles.glassTile}
				/>
			</View>

			<Text style={[styles.note, { color: palette.textFaint }]}>
				The glass tile sits over a moving shader so variant differences are
				visible. In interactive mode, press the tile inside this scroller —
				its own press response and scrolling must coexist.
			</Text>

			<Text style={[styles.note, { color: palette.textFaint }]}>
				Scroll to verify boundaries render smoothly. The shader tile uses
				loop, which depends on time and intensity — garbled output would
				indicate a uniform-alignment mismatch.
			</Text>

			<Text style={[styles.note, { color: palette.textFaint }]}>
				GPU resume is exercisable on shader-catalog — no new screen needed.
			</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	cell: {
		width: 100,
		gap: 4,
		alignItems: "center",
	},
	tile: {
		width: 100,
		height: 100,
		borderRadius: 8,
	},
	cellLabel: {
		fontSize: 11,
	},
	box: {
		width: "100%",
		height: 200,
		borderRadius: 12,
	},
	row: { gap: 6 },
	label: { fontSize: 14, fontWeight: "600" },
	glassStage: {
		width: "100%",
		height: 200,
		borderRadius: 12,
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	glassTile: {
		width: 160,
		height: 120,
		borderRadius: 16,
	},
	note: {
		fontSize: 12,
		lineHeight: 18,
	},
});
