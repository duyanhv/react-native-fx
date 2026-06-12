import { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FxPresence, type FxTransitionEnd } from "react-native-fx";
import { useTheme } from "../components/theme";

type LogLine = { id: number; text: string };

/**
 * FxPresence device harness — the presence FSM, the deferred-unmount handshake, and the
 * React-semantics edge cases.
 *
 * Toggle `visible` to play the platform `transient` envelope (iOS top-banner / Android
 * snackbar). The child stays mounted through the exit and unmounts only after the exit
 * completes; `onTransitionEnd` is logged so the runner can read phase + interrupted ordering
 * under rapid toggles. The `appear` switch remounts the subtree to exercise instant-present.
 *
 * The `offscreen` switch hides the stage with `display:none` while `visible` stays true — a
 * hide is a hold, so no transition event must fire. The eviction list scrolls presence cells
 * out of a virtualized list to prove eviction is silent teardown, never a phantom exit.
 */
export function PresenceScreen() {
	const { palette } = useTheme();
	// The (tasks) Stack uses a transparent iOS header, so it reserves no layout space and the
	// top-anchored controls would render under it. Inset the root by the safe area + the standard
	// 44pt bar (this screen sets headerLargeTitle: false). Other demo screens dodge this with a
	// scroll view's contentInsetAdjustmentBehavior; this one is a plain top-aligned View.
	const insets = useSafeAreaInsets();
	const [visible, setVisible] = useState(false);
	const [appear, setAppear] = useState(true);
	const [offscreen, setOffscreen] = useState(false);
	const [mountKey, setMountKey] = useState(0);
	const [tapCount, setTapCount] = useState(0);
	const [log, setLog] = useState<LogLine[]>([]);
	const [evictionLog, setEvictionLog] = useState<LogLine[]>([]);

	// Monotonic keys: the log caps at 8 entries, so an index-derived id repeats and collides
	// once the list is full. A counter that never resets keeps every row key unique.
	const nextLogId = useRef(0);

	function record(event: FxTransitionEnd) {
		const id = nextLogId.current++;
		const text = `${event.phase} finished=${event.finished} interrupted=${event.interrupted}`;
		setLog((lines) => [{ id, text }, ...lines].slice(0, 8));
	}

	function recordEviction(index: number, event: FxTransitionEnd) {
		const id = nextLogId.current++;
		const text = `cell ${index}: ${event.phase} finished=${event.finished}`;
		setEvictionLog((lines) => [{ id, text }, ...lines].slice(0, 6));
	}

	return (
		<View
			style={[
				styles.root,
				{ paddingTop: insets.top + 44, backgroundColor: palette.background },
			]}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U7-002 · FxPresence catalog + React-semantics rows
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
				<Pressable
					onPress={() => setOffscreen((o) => !o)}
					style={[styles.button, { backgroundColor: palette.surface }]}
				>
					<Text style={{ color: palette.text }}>offscreen={String(offscreen)}</Text>
				</Pressable>
			</View>

			<View style={[styles.stage, { display: offscreen ? "none" : "flex" }]}>
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

			<Text style={{ color: palette.textMuted, fontSize: 12 }}>
				eviction list — scroll a cell out; no exit must fire
			</Text>
			<FlatList
				style={styles.evictionList}
				data={EVICTION_CELLS}
				keyExtractor={(item) => String(item)}
				renderItem={({ item }) => (
					<FxPresence
						visible
						appear={false}
						preset="transient"
						onTransitionEnd={(event) => recordEviction(item, event)}
						style={styles.evictionCell}
					>
						<View style={[styles.card, { backgroundColor: palette.surface }]}>
							<Text style={{ color: palette.text }}>cell {item}</Text>
						</View>
					</FxPresence>
				)}
			/>

			<View style={styles.logBox}>
				{evictionLog.length === 0 ? (
					<Text style={{ color: palette.textMuted, fontSize: 12 }}>
						eviction events: none
					</Text>
				) : (
					evictionLog.map((line) => (
						<Text key={line.id} style={{ color: palette.text, fontSize: 12 }}>
							{line.text}
						</Text>
					))
				)}
			</View>
		</View>
	);
}

const EVICTION_CELLS = Array.from({ length: 12 }, (_, index) => index);

const styles = StyleSheet.create({
	root: { flex: 1, padding: 16, gap: 12 },
	controls: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
	stage: { height: 120, justifyContent: "flex-start" },
	banner: { alignSelf: "stretch" },
	card: {
		height: 64,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
	},
	logBox: { gap: 2 },
	evictionList: { maxHeight: 150, alignSelf: "stretch" },
	evictionCell: { alignSelf: "stretch", marginBottom: 8 },
});
