import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FxSurfaceView } from "react-native-fx";
import { NativeSlider } from "../components/native-slider";
import { useTheme } from "../components/theme";

// Android-only content-distort demonstrator: a ripple AGSL sampler distorts the live RN
// subtree wrapped below it via a draw-time RenderEffect. The load-bearing proof is that the two
// counters inside the distorted surface still register taps — the distortion is draw-time, so
// touch survives. iOS ignores the prop (out-of-scope); below API 33 the content renders normally.
export function ContentDistortScreen() {
	const { palette } = useTheme();
	const [rippling, setRippling] = useState(true);
	const [intensity, setIntensity] = useState(0.8);
	const [taps, setTaps] = useState(0);
	const [resets, setResets] = useState(0);

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				content-distort · DEF-009
			</Text>

			<TouchableOpacity
				onPress={() => setRippling((on) => !on)}
				style={[
					styles.chip,
					{
						backgroundColor: rippling ? palette.surfaceActive : palette.surface,
						borderColor: rippling ? palette.accent : palette.surfaceBorder,
					},
				]}
			>
				<Text style={{ color: rippling ? palette.accent : palette.textMuted }}>
					ripple {rippling ? "on" : "off"}
				</Text>
			</TouchableOpacity>

			<FxSurfaceView
				contentDistortion={rippling ? "ripple" : undefined}
				intensity={intensity}
				style={[styles.surface, { backgroundColor: palette.surface }]}
			>
				<View style={styles.content}>
					<Text style={[styles.heading, { color: palette.text }]}>Tap through the ripple</Text>
					<TouchableOpacity
						onPress={() => setTaps((count) => count + 1)}
						style={[styles.button, { backgroundColor: palette.accent }]}
					>
						<Text style={styles.buttonLabel}>Increment ({taps})</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setResets((count) => count + 1)}
						style={[styles.button, { backgroundColor: palette.surfaceActive, borderColor: palette.accent, borderWidth: 1 }]}
					>
						<Text style={{ color: palette.accent, fontWeight: "600" }}>Second button ({resets})</Text>
					</TouchableOpacity>
				</View>
			</FxSurfaceView>

			<Text style={{ color: palette.textMuted }}>
				taps {taps} · second {resets} — both should keep counting while the ripple animates
			</Text>

			<View style={{ gap: 8 }}>
				<Text style={{ color: palette.text }}>intensity {intensity.toFixed(2)}</Text>
				<NativeSlider value={intensity} min={0} max={1} onChange={setIntensity} />
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	chip: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
	surface: { height: 280, borderRadius: 16, overflow: "hidden" },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 16 },
	heading: { fontSize: 18, fontWeight: "600" },
	button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
	buttonLabel: { color: "#ffffff", fontWeight: "600" },
});
