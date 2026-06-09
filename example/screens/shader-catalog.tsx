import { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { FxHostedView } from "react-native-fx";
import { NativeSlider } from "../components/native-slider";
import { useTheme } from "../components/theme";

const SHADER_IDS = [
	"fractal-clouds",
	"ink-smoke",
	"liquid-chrome",
	"loop",
	"dots",
	"aurora",
	"noise-field",
	"plasma",
	"caustics",
	"edge-glow",
] as const;

export function ShaderCatalogScreen() {
	const { palette } = useTheme();
	const [shaderId, setShaderId] = useState<string>("fractal-clouds");
	const [intensity, setIntensity] = useState(0.8);

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<View style={styles.grid}>
				{SHADER_IDS.map((id) => {
					const active = shaderId === id;
					return (
						<TouchableOpacity
							key={id}
							onPress={() => setShaderId(id)}
							style={[
								styles.chip,
								{
									backgroundColor: active
										? palette.surfaceActive
										: palette.surface,
									borderColor: active ? palette.accent : palette.surfaceBorder,
								},
							]}
						>
							<Text
								style={{
									color: active ? palette.accent : palette.textMuted,
									fontSize: 13,
								}}
							>
								{id}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				{shaderId} · intensity {intensity.toFixed(2)}
			</Text>

			<FxHostedView
				effect={shaderId}
				intensity={intensity}
				style={styles.box}
			/>

			<NativeSlider value={intensity} min={0} max={1} onChange={setIntensity} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
	},
	box: { width: "100%", height: 200 },
});
