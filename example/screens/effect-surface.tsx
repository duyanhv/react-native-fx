import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EdgeGlow, Fx, fx } from "react-native-fx";
import { useTheme } from "../components/theme";

/**
 * Device gate — the `<Fx effect>` front door (string form) and the `fx.effect.*` builder form.
 *
 * Exercises the matrix: a decorative hosted shader, an interactive shader (press + load
 * events), glass, mesh-gradient, EdgeGlow, a `composition="background"` placement, and the
 * adapter-degradation wiring. Sections 7–8 add the builder: each `fx.effect.*` call renders
 * identically to its string-form equivalent, and a two-render-target chain renders only the
 * first step (the rest dev-warn in Metro). The semantic log is the runbook surface.
 */
export function EffectSurfaceScreen() {
	const { palette } = useTheme();
	const [log, setLog] = useState<string[]>([]);

	const append = useCallback((line: string) => {
		setLog((prev) => [line, ...prev].slice(0, 8));
	}, []);

	const labelStyle = [styles.label, { color: palette.textMuted }];
	const boxStyle = [styles.box, { borderColor: palette.surfaceBorder }];

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<View style={[styles.logBox, { backgroundColor: palette.surface }]}>
				<Text style={[styles.label, { color: palette.textFaint }]}>
					semantic log (newest first)
				</Text>
				{log.length === 0 ? (
					<Text style={{ color: palette.textFaint }}>— no events yet —</Text>
				) : (
					log.map((line, i) => (
						<Text key={`${line}-${i}`} style={{ color: palette.text }}>
							{line}
						</Text>
					))
				)}
			</View>

			<Text style={labelStyle}>1 · decorative hosted shader (aurora)</Text>
			<View style={boxStyle}>
				<Fx effect="aurora" style={styles.fill} />
			</View>

			<Text style={labelStyle}>2 · interactive shader (dots, active) — tap it</Text>
			<View style={boxStyle}>
				{/* `dots` is one of the curated shaders the iOS interactive raster path implements;
				    most shaders render only on the hosted path, so an interactive surface for them
				    reports onError (no renderer) — `dots` proves the load + press path on both platforms. */}
				<Fx
					effect="dots"
					interactionMode="active"
					style={styles.fill}
					onLoad={(e) => append(`load: ${e.nativeEvent.shader}`)}
					onError={(e) =>
						append(`error: ${e.nativeEvent.shader} (${e.nativeEvent.reason ?? "native"})`)
					}
					onPressIn={() => append("pressIn")}
					onPress={(e) =>
						append(`press @ ${e.nativeEvent.x.toFixed(2)},${e.nativeEvent.y.toFixed(2)}`)
					}
				/>
			</View>

			<Text style={labelStyle}>3 · glass (hosted, self-gesturing)</Text>
			<View style={boxStyle}>
				<Fx effect="glass" style={styles.fill} />
			</View>

			<Text style={labelStyle}>4 · mesh-gradient (hosted fill)</Text>
			<View style={boxStyle}>
				<Fx effect="mesh-gradient" style={styles.fill} />
			</View>

			<Text style={labelStyle}>5 · EdgeGlow (sugar over effect="edge-glow")</Text>
			<View style={boxStyle}>
				<EdgeGlow style={styles.fill} />
			</View>

			<Text style={labelStyle}>6 · composition="background" (sits behind content)</Text>
			<View style={boxStyle}>
				<Fx effect="plasma" composition="background" />
				<View style={styles.centered}>
					<Text style={{ color: palette.text, fontWeight: "600" }}>
						content above a background effect
					</Text>
				</View>
			</View>

			<Text style={labelStyle}>
				7 · builder form == string form (left: fx.effect.*, right: effect="id")
			</Text>
			<View style={styles.pairRow}>
				<View style={[boxStyle, styles.pairBox]}>
					<Fx effect={fx.effect.glow()} style={styles.fill} />
					<Text style={[styles.pairTag, { color: palette.textFaint }]}>glow()</Text>
				</View>
				<View style={[boxStyle, styles.pairBox]}>
					<Fx effect="edge-glow" style={styles.fill} />
					<Text style={[styles.pairTag, { color: palette.textFaint }]}>"edge-glow"</Text>
				</View>
			</View>
			<View style={styles.pairRow}>
				<View style={[boxStyle, styles.pairBox]}>
					<Fx effect={fx.effect.glass({ variant: "regular" })} style={styles.fill} />
					<Text style={[styles.pairTag, { color: palette.textFaint }]}>glass()</Text>
				</View>
				<View style={[boxStyle, styles.pairBox]}>
					<Fx effect="glass" style={styles.fill} />
					<Text style={[styles.pairTag, { color: palette.textFaint }]}>"glass"</Text>
				</View>
			</View>
			<View style={styles.pairRow}>
				<View style={[boxStyle, styles.pairBox]}>
					<Fx effect={fx.effect.mesh()} style={styles.fill} />
					<Text style={[styles.pairTag, { color: palette.textFaint }]}>mesh()</Text>
				</View>
				<View style={[boxStyle, styles.pairBox]}>
					<Fx effect="mesh-gradient" style={styles.fill} />
					<Text style={[styles.pairTag, { color: palette.textFaint }]}>"mesh-gradient"</Text>
				</View>
			</View>

			<Text style={labelStyle}>
				8 · two-render-target chain → renders the FIRST step only (glow); the second
				dev-warns in Metro
			</Text>
			<View style={boxStyle}>
				{/* A chain holding two render-targets: V1 renders the first step (edge-glow) and
				    drops the rest with a dev warning — multi-layer compositing is a future unit. */}
				<Fx effect={fx.effect.glow().glass({ variant: "regular" })} style={styles.fill} />
			</View>

			<Text style={[styles.label, { color: palette.textFaint }]}>
				Adapter degradation fires onError(reason:"unsupported") when an effect is unavailable
				on this device/substrate (e.g. a shader below iOS 17). It does not fire for the
				supported effects above; the degradation logic is covered by the headless resolver tests.
			</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	logBox: {
		borderRadius: 12,
		padding: 12,
		gap: 2,
		minHeight: 80,
	},
	label: {
		fontSize: 13,
	},
	box: {
		height: 120,
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	pairRow: {
		flexDirection: "row",
		gap: 16,
	},
	pairBox: {
		flex: 1,
	},
	pairTag: {
		position: "absolute",
		bottom: 4,
		left: 6,
		fontSize: 11,
	},
	fill: {
		flex: 1,
	},
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
