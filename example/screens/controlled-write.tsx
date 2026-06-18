import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FxSurfaceView, type FxSurfaceViewRef, type InteractionMode } from "react-native-fx";
import { useTheme } from "../components/theme";

/**
 * DEF-020 device verification — the controlled write path.
 *
 * The four scenarios to prove:
 * 1. A discrete `setUniform`/`setHighlight` write is observed by the live loop on the next frame.
 * 2. The write survives a host re-render (Fabric commit) — the clobber rule.
 * 3. `controlled` passes touch through (no recognizer) while still accepting writes.
 * 4. Loop pauses off-window (rule #1 unregressed) — this is covered by leaving the screen.
 *
 * No per-frame JS loop in any scenario.
 */
export function ControlledWriteScreen() {
	const { palette } = useTheme();
	const surfaceRef = useRef<FxSurfaceViewRef>(null);
	const [commitCount, setCommitCount] = useState(0);
	const [log, setLog] = useState<string[]>([]);
	const [passThroughCount, setPassThroughCount] = useState(0);
	const [interactionMode, setInteractionMode] = useState<InteractionMode>("controlled");

	const append = useCallback((text: string) => {
		setLog((lines) => [text, ...lines].slice(0, 20));
	}, []);

	const setIntensity = useCallback(
		(value: number) => () => {
			surfaceRef.current?.setUniform("intensity", value);
			const modeSuffix = interactionMode === "none" ? " (mode: none — write no-op)" : "";
			append(`setUniform intensity=${value}${modeSuffix}`);
		},
		[append, interactionMode],
	);

	const setPressDepth = useCallback(
		(value: number) => () => {
			surfaceRef.current?.setUniform("pressDepth", value);
			const modeSuffix = interactionMode === "none" ? " (mode: none — write no-op)" : "";
			append(`setUniform pressDepth=${value}${modeSuffix}`);
		},
		[append, interactionMode],
	);

	const setHighlight = useCallback(
		(x: number, y: number) => () => {
			surfaceRef.current?.setHighlight(x, y);
			const modeSuffix = interactionMode === "none" ? " (mode: none — write no-op)" : "";
			append(`setHighlight (${x},${y})${modeSuffix}`);
		},
		[append, interactionMode],
	);

	const clearUniform = useCallback(
		(name: string) => () => {
			surfaceRef.current?.setUniform(name, null);
			const modeSuffix = interactionMode === "none" ? " (mode: none — write no-op)" : "";
			append(`setUniform ${name}=null (restore prop)${modeSuffix}`);
		},
		[append, interactionMode],
	);

	const forceReRender = useCallback(() => {
		setCommitCount((c) => c + 1);
		append(`host re-render #${commitCount + 1}`);
	}, [commitCount, append]);

	const toggleMode = useCallback(() => {
		setInteractionMode((prev) => {
			const next: InteractionMode = prev === "controlled" ? "none" : "controlled";
			append(`interactionMode → ${next}`);
			return next;
		});
	}, [append]);

	return (
		<View style={[styles.root, { backgroundColor: palette.background }]}>
			<Text style={[styles.header, { color: palette.text }]}>
				DEF-020 — controlled write path
			</Text>

			<View style={styles.surfaceContainer}>
				<TouchableOpacity
					style={[styles.passThroughTarget, { backgroundColor: palette.surface }]}
					onPress={() => {
						setPassThroughCount((c) => c + 1);
						append(`touch passed through (#${passThroughCount + 1})`);
					}}
				>
					<Text style={[styles.passThroughLabel, { color: palette.textMuted }]}>
						Tap here —{" "}
						<Text style={[styles.passThroughCount, { color: palette.text }]}>
							{passThroughCount}
						</Text>
					</Text>
				</TouchableOpacity>
				<FxSurfaceView
					ref={surfaceRef}
					shader="aurora"
					intensity={0.4}
					interactionMode={interactionMode}
					style={styles.surface}
				/>
			</View>

			<View style={styles.modeSection}>
				<Button
					palette={palette}
					onPress={toggleMode}
					label={`interactionMode: ${interactionMode}`}
					wide
				/>
				<Text style={[styles.caption, { color: palette.textFaint }]}>
					M2 restore test: set intensity to 1.0 (controlled) → toggle to none →
					the shader should snap back to the 0.4 prop value (prop reclaims control).
					Toggle back to controlled and the prop value stays until the next write.
				</Text>
			</View>

			<ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>
				<Text style={[styles.section, { color: palette.textMuted }]}>setUniform</Text>
				<View style={styles.row}>
					<Button palette={palette} onPress={setIntensity(0.0)} label="intensity 0" />
					<Button palette={palette} onPress={setIntensity(0.5)} label="intensity 0.5" />
					<Button palette={palette} onPress={setIntensity(1.0)} label="intensity 1" />
				</View>
				<View style={styles.row}>
					<Button palette={palette} onPress={setPressDepth(0.0)} label="pressDepth 0" />
					<Button palette={palette} onPress={setPressDepth(0.5)} label="pressDepth 0.5" />
					<Button palette={palette} onPress={setPressDepth(1.0)} label="pressDepth 1" />
				</View>
				<View style={styles.row}>
					<Button palette={palette} onPress={clearUniform("intensity")} label="clear intensity" />
					<Button palette={palette} onPress={clearUniform("pressDepth")} label="clear pressDepth" />
				</View>

				<Text style={[styles.section, { color: palette.textMuted }]}>setHighlight</Text>
				<View style={styles.row}>
					<Button palette={palette} onPress={setHighlight(0.2, 0.2)} label="highlight TL" />
					<Button palette={palette} onPress={setHighlight(0.5, 0.5)} label="highlight C" />
					<Button palette={palette} onPress={setHighlight(0.8, 0.8)} label="highlight BR" />
				</View>

				<Text style={[styles.section, { color: palette.textMuted }]}>clobber test</Text>
				<Button
					palette={palette}
					onPress={forceReRender}
					label={`force host re-render (#${commitCount})`}
					wide
				/>
				<Text style={[styles.caption, { color: palette.textFaint }]}>
					After setUniform(1.0), tap re-render. The shader should stay at
					intensity 1.0 (imperative wins), not snap back to 0.4.
				</Text>

				<Text style={[styles.section, { color: palette.textMuted }]}>log</Text>
				{log.length === 0 ? (
					<Text style={[styles.caption, { color: palette.textFaint }]}>(tap a button above)</Text>
				) : (
					log.map((line, i) => (
						<Text key={i} style={[styles.logLine, { color: palette.textMuted }]}>
							{line}
						</Text>
					))
				)}
			</ScrollView>
		</View>
	);
}

function Button({
	palette,
	onPress,
	label,
	wide = false,
}: {
	palette: { surface: string; text: string; surfaceBorder: string };
	onPress: () => void;
	label: string;
	wide?: boolean;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[
				styles.button,
				{ backgroundColor: palette.surface, borderColor: palette.surfaceBorder },
				wide && styles.buttonWide,
				wide && { marginHorizontal: 0 },
			]}
		>
			<Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	header: {
		fontSize: 17,
		fontWeight: "700",
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	surfaceContainer: {
		position: "relative",
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	surface: {
		height: 140,
		borderRadius: 12,
		overflow: "hidden",
	},
	passThroughTarget: {
		position: "absolute",
		top: 0,
		left: 16,
		right: 16,
		height: 140,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: "rgba(128,128,128,0.5)",
	},
	passThroughLabel: { fontSize: 13 },
	passThroughCount: { fontWeight: "700" },
	controls: { flex: 1 },
	controlsContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
	section: { fontSize: 13, fontWeight: "600", marginTop: 8 },
	row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
	modeSection: { paddingHorizontal: 16, marginBottom: 8 },
	button: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	buttonWide: { alignSelf: "stretch" },
	buttonLabel: { fontSize: 12, fontWeight: "600" },
	caption: { fontSize: 11, lineHeight: 15, marginTop: 4 },
	logLine: { fontSize: 11, fontFamily: "Menlo" },
});
