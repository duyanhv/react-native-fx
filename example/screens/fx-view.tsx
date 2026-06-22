import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FxView, fx, type FxStateChange } from "react-native-fx";
import { useTheme } from "../components/theme";

type LogLine = { id: number; text: string };

/**
 * FxView device harness — state-driven content motion, effect decoration, and touch-through.
 *
 * Row A: FxView with `effect={fx.effect.glow()}` — verifies the glow is behind the card
 * (U12-002, Rows 1–4). Row B: FxView without effect — regression against U12-001 (Row 5).
 * A single toggle drives both; separate tap counters prove touch passes through each wrapper.
 *
 * Native change ⇒ REBUILD before running; reload is insufficient for new native views.
 */
export function FxViewScreen() {
	const { palette } = useTheme();
	const insets = useSafeAreaInsets();
	const [selected, setSelected] = useState(false);
	const [tapCountA, setTapCountA] = useState(0);
	const [tapCountB, setTapCountB] = useState(0);
	const [log, setLog] = useState<LogLine[]>([]);

	const nextLogId = useRef(0);
	const glowEffect = useMemo(() => fx.effect.glow(), []);

	function record(event: FxStateChange) {
		const id = nextLogId.current++;
		const text = `state=${event.state} finished=${event.finished} interrupted=${event.interrupted}`;
		setLog((lines) => [{ id, text }, ...lines].slice(0, 8));
	}

	const cardStyle = [styles.card, { backgroundColor: palette.surfaceActive }];
	const labelStyle = { color: palette.textMuted, fontSize: 11 };

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ flex: 1, backgroundColor: palette.background }}
			contentContainerStyle={[styles.root, { paddingTop: insets.top + 44 }]}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U12-002 · FxView effect prop — behind-content decoration
			</Text>

			<Pressable
				onPress={() => setSelected((s) => !s)}
				style={[styles.button, { backgroundColor: palette.surfaceActive }]}
			>
				<Text style={{ color: palette.text, fontWeight: "600" }}>
					{selected ? "Deselect" : "Select"}
				</Text>
			</Pressable>

			<Text style={labelStyle}>with effect (glow)</Text>
			<View style={styles.stage}>
				<FxView
					preset="lift"
					state={selected ? "selected" : "idle"}
					onStateChange={record}
					effect={glowEffect}
					style={styles.viewWrapper}
				>
					<Pressable onPress={() => setTapCountA((c) => c + 1)} style={cardStyle}>
						<Text style={{ color: palette.text, fontWeight: "600" }}>
							{selected ? "Selected" : "Idle"}
						</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							taps: {tapCountA}
						</Text>
					</Pressable>
				</FxView>
			</View>

			<Text style={[labelStyle, { marginTop: 8 }]}>
				U12-001 · no effect (regression)
			</Text>
			<View style={styles.stage}>
				<FxView
					preset="lift"
					state={selected ? "selected" : "idle"}
					onStateChange={record}
					style={styles.viewWrapper}
				>
					<Pressable onPress={() => setTapCountB((c) => c + 1)} style={cardStyle}>
						<Text style={{ color: palette.text, fontWeight: "600" }}>
							{selected ? "Selected" : "Idle"}
						</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							taps: {tapCountB}
						</Text>
					</Pressable>
				</FxView>
			</View>

			<View style={styles.logBox}>
				<Text style={{ color: palette.textMuted, fontSize: 12 }}>onStateChange</Text>
				{log.map((line) => (
					<Text key={line.id} style={{ color: palette.text, fontSize: 12 }}>
						{line.text}
					</Text>
				))}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	root: { padding: 16, gap: 12 },
	button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignSelf: "flex-start" },
	stage: { height: 140, justifyContent: "center", alignItems: "center" },
	viewWrapper: { width: 240 },
	card: {
		height: 120,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
	logBox: { gap: 2, marginTop: 8 },
});
