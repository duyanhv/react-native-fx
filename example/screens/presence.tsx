import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FxPresence, type FxTransitionEnd } from "react-native-fx";
import { useTheme } from "../components/theme";

type LogLine = { id: number; text: string };

/**
 * FxPresence device harness — the presence FSM + deferred-unmount handshake.
 *
 * Toggle `visible` to play the platform `transient` envelope (iOS top-banner / Android
 * snackbar). The child stays mounted through the exit and unmounts only after the exit
 * completes; `onTransitionEnd` is logged so the runner can read phase + interrupted ordering
 * under rapid toggles. The `appear` switch remounts the subtree to exercise instant-present.
 */
export function PresenceScreen() {
	const { palette } = useTheme();
	const [visible, setVisible] = useState(false);
	const [appear, setAppear] = useState(true);
	const [mountKey, setMountKey] = useState(0);
	const [tapCount, setTapCount] = useState(0);
	const [log, setLog] = useState<LogLine[]>([]);

	function record(event: FxTransitionEnd) {
		const text = `${event.phase} finished=${event.finished} interrupted=${event.interrupted}`;
		setLog((lines) => [{ id: lines.length, text }, ...lines].slice(0, 8));
	}

	return (
		<View style={[styles.root, { backgroundColor: palette.background }]}>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U7-001 · FxPresence handshake
			</Text>

			<View style={styles.controls}>
				<Pressable
					onPress={() => setVisible((v) => !v)}
					style={[styles.button, { backgroundColor: palette.surfaceActive }]}
				>
					<Text style={{ color: palette.text, fontWeight: "600" }}>
						{visible ? "Hide" : "Show"}
					</Text>
				</Pressable>
				<Pressable
					onPress={() => {
						setAppear((a) => !a);
						setVisible(true);
						setMountKey((k) => k + 1);
					}}
					style={[styles.button, { backgroundColor: palette.surface }]}
				>
					<Text style={{ color: palette.text }}>appear={String(appear)} · remount</Text>
				</Pressable>
			</View>

			<View style={styles.stage}>
				<FxPresence
					key={mountKey}
					visible={visible}
					preset="transient"
					appear={appear}
					onTransitionEnd={record}
					style={styles.banner}
				>
					<Pressable
						onPress={() => setTapCount((c) => c + 1)}
						style={[styles.card, { backgroundColor: palette.surfaceActive }]}
					>
						<Text style={{ color: palette.text, fontWeight: "600" }}>Transient</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							taps: {tapCount}
						</Text>
					</Pressable>
				</FxPresence>
			</View>

			<View style={styles.logBox}>
				<Text style={{ color: palette.textMuted, fontSize: 12 }}>onTransitionEnd</Text>
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
	root: { flex: 1, padding: 16, gap: 16 },
	controls: { flexDirection: "row", gap: 12 },
	button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
	stage: { height: 160, justifyContent: "flex-start" },
	banner: { alignSelf: "stretch" },
	card: {
		height: 64,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
	},
	logBox: { gap: 2 },
});
