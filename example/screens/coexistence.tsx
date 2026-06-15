import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
	type FxSurfacePressEvent,
	FxSurfaceView,
	type InteractionMode,
	type ShaderId,
} from "react-native-fx";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../components/theme";

type LogLine = { id: number; text: string };

const SHADER: ShaderId = "aurora";

/**
 * The RNGH coexistence harness — one `active`-mode surface dropped into every gesture
 * container the RN ecosystem ships, so the maintainer can read the cancel-vs-press
 * outcome live on a device.
 *
 * The load-bearing observation is the cancel path: the instant an ancestor scroller or
 * RNGH pan claims the gesture, the native press recognizer must cancel (spring-back, no
 * `Press`). Each surface logs only the four semantic press events — `PressIn`/`PressOut`/
 * `Press`/`LongPress` — never a per-frame or per-pointer stream; a clean cancel reads as
 * `PressIn` then `PressOut` with no `Press`. The log is the runbook surface: timestamps
 * let the runner correlate a finger action with what the recognizer emitted.
 *
 * The library carries no RNGH/reanimated dependency; those peers live in the example only.
 * That separation is exactly the claim under test — coexistence is free because the surface
 * is a plain native view, not because fx integrates with the gesture stack.
 */
export function CoexistenceScreen() {
	const { palette } = useTheme();
	const insets = useSafeAreaInsets();
	const [log, setLog] = useState<LogLine[]>([]);
	// Monotonic id: the log caps at 12 lines, so an index-derived key would collide once
	// the buffer wraps. A counter that never resets keeps every row key stable.
	const nextId = useRef(0);

	const append = useCallback((text: string) => {
		const id = nextId.current++;
		const now = new Date();
		const stamp =
			`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
			`.${pad(now.getMilliseconds(), 3)}`;
		setLog((lines) => [{ id, text: `${stamp}  ${text}` }, ...lines].slice(0, 12));
	}, []);

	const press = useCallback(
		(label: string, kind: string) => (event: FxSurfacePressEvent) => {
			const { x, y } = event.nativeEvent;
			append(`${label} · ${kind} (${Math.round(x)},${Math.round(y)})`);
		},
		[append],
	);

	const surface = useCallback(
		(label: string, mode: InteractionMode) => ({
			shader: SHADER,
			intensity: 0.8,
			interactionMode: mode,
			// Handlers are wired in every mode on purpose: in `passive`/`controlled` the
			// native side emits nothing, so an empty log is a live proof of silence rather
			// than an absence of wiring.
			onShaderPressIn: press(label, "PressIn"),
			onShaderPressOut: press(label, "PressOut"),
			onShaderPress: press(label, "Press"),
			onShaderLongPress: press(label, "LongPress"),
		}),
		[press],
	);

	// RNGH pan wrapping a surface (group 4). `runOnJS` keeps the callback on the JS thread so
	// it can append to the log directly; activation past slop is the moment the ancestor
	// claims, and the surface press must cancel in the same instant.
	const pan = useMemo(
		() =>
			Gesture.Pan()
				.runOnJS(true)
				.onStart(() => append("rngh-pan · ACTIVATED — surface press should cancel")),
		[append],
	);

	const sheetSnapPoints = useMemo(() => ["14%", "55%"], []);

	return (
		<View style={[styles.root, { backgroundColor: palette.background }]}>
			<View style={[styles.logPanel, { paddingTop: insets.top + 8, borderColor: palette.surfaceBorder }]}>
				<Text style={[styles.logTitle, { color: palette.textMuted }]}>
					semantic press log — newest first
				</Text>
				{log.length === 0 ? (
					<Text style={[styles.logEmpty, { color: palette.textFaint }]}>
						(silent — perform a gesture below)
					</Text>
				) : (
					log.map((line) => (
						<Text key={line.id} style={[styles.logLine, { color: palette.text }]}>
							{line.text}
						</Text>
					))
				)}
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="never"
			>
				<Text style={[styles.note, { color: palette.textFaint }]}>
					This page is itself a vertical ScrollView — a vertical press-drag on any surface
					exercises the native-scroller cancel too.
				</Text>

				<Section
					title="1 · native horizontal ScrollView"
					caption="tap → one Press · press+horizontal drag → cancel (PressIn/Out, no Press) · press+hold+release → In/Out/Press"
				>
					<ScrollView horizontal style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
						<FxSurfaceView {...surface("scroll", "active")} style={styles.wideSurface} />
						<View style={[styles.filler, { backgroundColor: palette.surface }]} />
					</ScrollView>
				</Section>

				<Section
					title="2 · react-native-pager-view"
					caption="still tap → Press · press+horizontal swipe → page changes, cancel, no Press"
				>
					<PagerView style={styles.pager} initialPage={0}>
						<View key="p0" style={styles.page}>
							<FxSurfaceView {...surface("pager·0", "active")} style={styles.pageSurface} />
						</View>
						<View key="p1" style={styles.page}>
							<FxSurfaceView {...surface("pager·1", "active")} style={styles.pageSurface} />
						</View>
					</PagerView>
				</Section>

				<Section
					title="4 · RNGH GestureDetector(Pan)"
					caption="press+pan → pan ACTIVATES past slop, surface press cancels · still tap → Press"
				>
					<GestureDetector gesture={pan}>
						<View style={styles.panHost}>
							<FxSurfaceView {...surface("rngh-pan", "active")} style={styles.fillSurface} />
						</View>
					</GestureDetector>
				</Section>

				<Section
					title="5 · passive mode inside a ScrollView"
					caption="drag across → pointer uniform follows the finger natively, scroll still works, NO semantic events (log stays silent)"
				>
					<ScrollView horizontal style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
						<FxSurfaceView {...surface("passive", "passive")} style={styles.wideSurface} />
						<View style={[styles.filler, { backgroundColor: palette.surface }]} />
					</ScrollView>
				</Section>

				<Section
					title="6 · controlled mode inside a ScrollView"
					caption="no recognizer attached — the scroller owns the gesture outright, zero double-handling (log stays silent)"
				>
					<ScrollView horizontal style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
						<FxSurfaceView {...surface("controlled", "controlled")} style={styles.wideSurface} />
						<View style={[styles.filler, { backgroundColor: palette.surface }]} />
					</ScrollView>
				</Section>

				<Section
					title="7 · nested fx surfaces"
					caption="tap the inner surface → observe whether INNER alone logs or OUTER too (the nesting policy is observed here, not decided)"
				>
					<FxSurfaceView {...surface("nested·OUTER", "active")} style={styles.nestedOuter}>
						<View style={styles.nestedInset}>
							<FxSurfaceView {...surface("nested·INNER", "active")} shader={"dots"} style={styles.fillSurface} />
						</View>
					</FxSurfaceView>
				</Section>

				<View style={styles.sheetSpacer} />
			</ScrollView>

			<Section.Floating
				title="3 · @gorhom/bottom-sheet (RNGH pan — the hard case)"
				caption="drag the sheet from its content → spring-back as the RNGH pan claims, cancelled cleanly · tap content (no drag) → Press"
				color={palette.textMuted}
			/>
			<BottomSheet
				index={0}
				snapPoints={sheetSnapPoints}
				enableDynamicSizing={false}
				backgroundStyle={{ backgroundColor: palette.surface }}
				handleIndicatorStyle={{ backgroundColor: palette.textMuted }}
			>
				<BottomSheetView style={styles.sheetContent}>
					<Text style={[styles.sheetLabel, { color: palette.textMuted }]}>
						bottom-sheet content — drag here vs tap here
					</Text>
					<FxSurfaceView {...surface("sheet", "active")} style={styles.fillSurface} />
				</BottomSheetView>
			</BottomSheet>
		</View>
	);
}

function pad(value: number, width = 2): string {
	return String(value).padStart(width, "0");
}

function Section({
	title,
	caption,
	children,
}: {
	title: string;
	caption: string;
	children: ReactNode;
}) {
	const { palette } = useTheme();
	return (
		<View style={styles.section}>
			<Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
			<Text style={[styles.sectionCaption, { color: palette.textMuted }]}>{caption}</Text>
			{children}
		</View>
	);
}

// The bottom-sheet is an overlay sibling of the scroll view, so its caption can't live inside
// the scrolled section list. This pins a matching header just above the collapsed sheet handle.
Section.Floating = function FloatingCaption({
	title,
	caption,
	color,
}: {
	title: string;
	caption: string;
	color: string;
}) {
	return (
		<View pointerEvents="none" style={styles.floatingCaption}>
			<Text style={[styles.sectionTitle, { color }]}>{title}</Text>
			<Text style={[styles.sectionCaption, { color }]}>{caption}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	root: { flex: 1 },
	logPanel: {
		paddingHorizontal: 16,
		paddingBottom: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 1,
	},
	logTitle: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
	logEmpty: { fontSize: 12, fontFamily: "Menlo" },
	logLine: { fontSize: 11, fontFamily: "Menlo" },
	scroll: { flex: 1 },
	scrollContent: { padding: 16, gap: 20 },
	note: { fontSize: 12, fontStyle: "italic" },
	section: { gap: 6 },
	sectionTitle: { fontSize: 15, fontWeight: "700" },
	sectionCaption: { fontSize: 12, lineHeight: 16 },
	hScroll: { borderRadius: 12 },
	hScrollContent: { gap: 12, alignItems: "center" },
	wideSurface: { width: 260, height: 110, borderRadius: 12, overflow: "hidden" },
	filler: { width: 220, height: 110, borderRadius: 12 },
	pager: { height: 130 },
	page: { flex: 1, justifyContent: "center" },
	pageSurface: { height: 110, borderRadius: 12, marginHorizontal: 4, overflow: "hidden" },
	panHost: { borderRadius: 12, overflow: "hidden" },
	fillSurface: { height: 110, borderRadius: 12, overflow: "hidden" },
	nestedOuter: {
		height: 200,
		borderRadius: 16,
		overflow: "hidden",
		justifyContent: "center",
	},
	nestedInset: { marginHorizontal: 48, marginVertical: 32 },
	sheetSpacer: { height: 140 },
	floatingCaption: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: "14%",
		marginBottom: 8,
		gap: 4,
	},
	sheetContent: { padding: 16, gap: 10 },
	sheetLabel: { fontSize: 12 },
});
