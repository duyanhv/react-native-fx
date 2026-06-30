import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FxReveal, type FxRevealTransitionEnd } from "react-native-fx";
import { useTheme } from "../components/theme";

type LogLine = { id: number; text: string };

/**
 * FxReveal device harness — the anchored-reveal geometric spine (step 2).
 *
 * The collapsed card (a chat-input stand-in) reveals into a bottom-half panel holding a camera
 * stand-in (no camera peer is wired in the example; the stand-in is a plain tappable panel so the
 * runner can prove touch survives the reveal). Toggle `open` to play the morph; rapid-toggle to
 * exercise interruption (one completion event per settled phase, the interrupted edge first).
 *
 * Reveal-host: the reveal is mounted inside a root-level absoluteFill + pointerEvents="box-none"
 * overlay whose bounds span the collapsed slot AND the bottom-half expanded target. FxReveal fills
 * that host; the `style` prop positions the collapsed card within it. The host-contained placement
 * is what makes the expanded panel touch-reachable on Android (TouchTargetHelper does not descend
 * into a parent for out-of-bounds points).
 *
 * Step 2 adds the chrome channel: the collapsed card reveals with its corner radius (12pt) morphing
 * to the expanded panel radius (20pt), clipped throughout. The radius must stay circular under the
 * non-uniform morph (G1); clip must not overflow (G2); Shutter must stay tappable through the clip
 * (G3).
 */
export function RevealScreen() {
	const { palette } = useTheme();
	const insets = useSafeAreaInsets();
	const [open, setOpen] = useState(false);
	const [w8Mode, setW8Mode] = useState(false);
	const [w8Open, setW8Open] = useState(true);
	const [cameraTaps, setCameraTaps] = useState(0);
	const [log, setLog] = useState<LogLine[]>([]);
	const nextLogId = useRef(0);

	function record(event: FxRevealTransitionEnd) {
		const id = nextLogId.current++;
		const text = `${event.phase} finished=${event.finished} interrupted=${event.interrupted}`;
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
				FxReveal · radius morph + clip (step 2)
			</Text>

			<View style={styles.controls}>
				<Pressable
					onPress={() => setOpen((value) => !value)}
					style={[styles.button, { backgroundColor: palette.surfaceActive }]}
				>
					<Text style={{ color: palette.text, fontWeight: "600" }}>
						{open ? "Close" : "Open"}
					</Text>
				</Pressable>
				<Pressable
					onPress={() => { setW8Mode((v) => !v); setW8Open(true); }}
					style={[styles.button, { backgroundColor: palette.surfaceActive }]}
				>
					<Text style={{ color: palette.text, fontWeight: "600" }}>
						{w8Mode ? "W8: ON" : "W8: OFF"}
					</Text>
				</Pressable>
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 12 }}>
				a sibling row — it must not reflow when the panel reveals
			</Text>

			{/* Host: bounds-containing overlay — full-window (default) or fixed-height W8 variant.
			    pointerEvents="box-none" lets taps pass through to controls above; FxReveal's own
			    BOX_NONE shell passes through non-content taps. */}
			{w8Mode ? (
				// W8 — non-full-window host: fixed height so the expanded panel is within a host
				// smaller than the screen. Reveal starts open=true to test the initial-open seating
				// path (the fix: expanded content stays 0×0/hidden until onLayout supplies real size).
				<View
					style={[styles.w8Host, { bottom: insets.bottom }]}
					pointerEvents="box-none"
				>
					<FxReveal
						open={w8Open}
						preset="anchoredMorph"
						onTransitionEnd={record}
						style={[styles.shell, { bottom: 16 }]}
						collapsed={
							<Pressable
								onPress={() => setW8Open(true)}
								style={[styles.card, { backgroundColor: palette.surfaceActive }]}
							>
								<Text style={{ color: palette.text, fontWeight: "600" }}>
									Ask anything… (W8)
								</Text>
								<Text style={{ color: palette.textMuted, fontSize: 12 }}>
									non-full-window host · initial open=true
								</Text>
							</Pressable>
						}
						expanded={
							<View style={[styles.panel, { backgroundColor: "#0b0b0f" }]}>
								<Text style={styles.panelLabel}>Camera stand-in (W8)</Text>
								<Pressable
									onPress={() => setCameraTaps((count) => count + 1)}
									style={styles.shutter}
								>
									<Text style={{ color: "#0b0b0f", fontWeight: "700" }}>
										Shutter · {cameraTaps}
									</Text>
								</Pressable>
								<Pressable onPress={() => setW8Open(false)} style={styles.close}>
									<Text style={{ color: "#fff" }}>Close</Text>
								</Pressable>
							</View>
						}
					/>
				</View>
			) : (
				// Default — full-window host (W1–W7 rows).
				<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
					<FxReveal
						open={open}
						preset="anchoredMorph"
						onTransitionEnd={record}
						style={[styles.shell, { bottom: insets.bottom + 16 }]}
						collapsed={
							<Pressable
								onPress={() => setOpen(true)}
								style={[styles.card, { backgroundColor: palette.surfaceActive }]}
							>
								<Text style={{ color: palette.text, fontWeight: "600" }}>
									Ask anything…
								</Text>
								<Text style={{ color: palette.textMuted, fontSize: 12 }}>
									tap to open camera
								</Text>
							</Pressable>
						}
						expanded={
							<View style={[styles.panel, { backgroundColor: "#0b0b0f" }]}>
								<Text style={styles.panelLabel}>Camera preview (stand-in)</Text>
								<Pressable
									onPress={() => setCameraTaps((count) => count + 1)}
									style={styles.shutter}
								>
									<Text style={{ color: "#0b0b0f", fontWeight: "700" }}>
										Shutter · {cameraTaps}
									</Text>
								</Pressable>
								<Pressable onPress={() => setOpen(false)} style={styles.close}>
									<Text style={{ color: "#fff" }}>Close</Text>
								</Pressable>
							</View>
						}
					/>
				</View>
			)}

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
	root: { flex: 1, padding: 16, gap: 12 },
	controls: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
	// Positions the collapsed slot within the full-bounds host. `bottom` is dynamic (adds insets).
	shell: { position: "absolute", left: 16, right: 16 },
	// Fixed-height non-full-window host for W8. `bottom` is dynamic (adds insets).
	w8Host: { position: "absolute", left: 0, right: 0, height: 420 },
	card: {
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		justifyContent: "center",
		gap: 2,
	},
	panel: {
		flex: 1,
		padding: 20,
		justifyContent: "flex-end",
		gap: 16,
	},
	panelLabel: { color: "#9aa0aa", fontSize: 13, position: "absolute", top: 16, left: 20 },
	shutter: {
		alignSelf: "center",
		backgroundColor: "#fff",
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 28,
	},
	close: { alignSelf: "center", paddingVertical: 8 },
	logBox: { gap: 2, marginTop: "auto" },
});
