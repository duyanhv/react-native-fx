import { StyleSheet, Text, View } from "react-native";
import { Fx, fx } from "react-native-fx";
import { useTheme } from "../components/theme";

// A vertical hosted scroll of fx-owned generative tiles. On iOS 17+ each tile fades and
// scales as it crosses the viewport edges and rests at identity when fully scrolled in —
// the mapping runs in SwiftUI's render server, with no per-frame JS. Below 17 and on
// Android the tiles render static (the empty-ladder degradation).
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

export function SourceScrollScreen() {
	const { palette } = useTheme();
	return (
		<View style={[styles.root, { backgroundColor: palette.background }]}>
			<Text style={[styles.caption, { color: palette.textMuted }]}>
				source · scroll-linked tiles (iOS 17+)
			</Text>
			<Fx.Scroll
				source={fx.source.scroll({ axis: "vertical" })}
				tiles={TILES.map((tile) => ({ ...tile, height: 240 }))}
				style={styles.scroll}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	caption: { fontSize: 13, paddingHorizontal: 16, paddingTop: 12 },
	scroll: { flex: 1 },
});
