import { Platform, StyleSheet, Text, View } from "react-native";
import { Fx, fx } from "react-native-fx";
import { useTheme } from "../components/theme";

// A vertical hosted scroll of fx-owned generative tiles. On iOS 17+ each tile fades and
// scales as it crosses the viewport edges in SwiftUI's render server — zero per-frame JS.
// On Android (API 21+) the same opacity/scale edge transition runs on the UI thread via
// ScrollView.onScrollChanged — best-effort, lower fidelity than the iOS render-server tier,
// zero per-frame JS. Shader tiles require API 33+ on Android; fill tiles run from API 21+.
const TILES = [
	{ effect: "aurora", intensity: 0.85 },
	{ effect: "plasma", intensity: 0.8 },
	{ effect: "fill", intensity: 0.9 },
	{ effect: "caustics", intensity: 0.8 },
	{ effect: "liquid-chrome", intensity: 0.85 },
	{ effect: "noise-field", intensity: 0.7 },
	{ effect: "fractal-clouds", intensity: 0.8 },
	{ effect: "ink-smoke", intensity: 0.85 },
] as const;

const HORIZONTAL_TILES = [
	{ effect: "fill", intensity: 0.9 },
	{ effect: "aurora", intensity: 0.85 },
	{ effect: "dots", intensity: 0.8 },
	{ effect: "loop", intensity: 0.8 },
	{ effect: "plasma", intensity: 0.75 },
] as const;

export function SourceScrollScreen() {
	const { palette } = useTheme();
	const fidelityNote = Platform.OS === "android"
		? "source · best-effort UI-thread offset→opacity/scale (Android)"
		: "source · render-server .scrollTransition (iOS 17+)";

	return (
		<View style={[styles.root, { backgroundColor: palette.background }]}>
			<Text style={[styles.caption, { color: palette.textMuted }]}>
				{fidelityNote}
			</Text>
			<Fx.Scroll
				source={fx.source.scroll({ axis: "vertical" })}
				tiles={TILES.map((tile) => ({ ...tile, height: 240 }))}
				style={styles.scrollVertical}
			/>
			<Text style={[styles.caption, styles.sectionLabel, { color: palette.textMuted }]}>
				horizontal axis
			</Text>
			<Fx.Scroll
				source={fx.source.scroll({ axis: "horizontal" })}
				tiles={HORIZONTAL_TILES.map((tile) => ({ ...tile, height: 200 }))}
				style={styles.scrollHorizontal}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	caption: { fontSize: 13, paddingHorizontal: 16, paddingTop: 12 },
	sectionLabel: { paddingTop: 8 },
	scrollVertical: { flex: 1 },
	scrollHorizontal: { height: 240 },
});
