import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FxView, type FxStateChange } from "react-native-fx";
import { useTheme } from "../components/theme";

type LogLine = { id: number; text: string };

/**
 * FxView device harness — state-driven content motion, settle events, and interrupt behavior.
 *
 * Toggle `state` between idle and selected to play the platform `lift` envelope. The
 * settle event is logged so the runner can read state + interrupted ordering under rapid
 * toggles. A counter inside the card proves touch passes through the animated wrapper.
 *
 * Native change ⇒ REBUILD before running; reload is insufficient for new native views.
 */
export function FxViewScreen() {
	const { palette } = useTheme();
	const insets = useSafeAreaInsets();
	const [selected, setSelected] = useState(false);
	const [tapCount, setTapCount] = useState(0);
	const [log, setLog] = useState<LogLine[]>([]);

	const nextLogId = useRef(0);

	function record(event: FxStateChange) {
		const id = nextLogId.current++;
		const text = `state=${event.state} finished=${event.finished} interrupted=${event.interrupted}`;
		setLog((lines) => [{ id, text }, ...lines].slice(0, 8));
	}

	return (
		<View
			style={[
				styles.root,
				{ paddingTop: insets.top + 44, backgroundColor: palette.background },
			]}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U12-001 · FxView lift preset + settle event
			</Text>

			<View style={styles.controls}>
				<Pressable
					onPress={() => setSelected((s) => !s)}
					style={[styles.button, { backgroundColor: palette.surfaceActive }]}
				>
					<Text style={{ color: palette.text, fontWeight: "600" }}>
						{selected ? "Deselect" : "Select"}
					</Text>
				</Pressable>
			</View>

			<View style={styles.stage}>
				<FxView
					preset="lift"
					state={selected ? "selected" : "idle"}
					onStateChange={record}
					style={styles.viewWrapper}
				>
					<Pressable
						onPress={() => setTapCount((c) => c + 1)}
						style={[styles.card, { backgroundColor: palette.surfaceActive }]}
					>
						<Text style={{ color: palette.text, fontWeight: "600" }}>
							{selected ? "Selected" : "Idle"}
						</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							taps through wrapper: {tapCount}
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
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, padding: 16, gap: 12 },
	controls: { flexDirection: "row", gap: 12 },
	button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
	stage: { height: 120, justifyContent: "center", alignItems: "center" },
	viewWrapper: { width: 240 },
	card: {
		height: 80,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
	logBox: { gap: 2 },
});
