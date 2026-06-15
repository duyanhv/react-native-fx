import { FlatList, StyleSheet, Text, View } from "react-native";
import { FxHostedView, FxSurfaceView, type ShaderId } from "react-native-fx";
import { useTheme } from "../components/theme";

// The ten curated shader ids, cycled across the shader cells so the pipeline cache
// holds several keys and most ids recur — proving both cache-hit reuse (repeat ids)
// and multi-key residency (distinct ids) within one process-wide context.
const SHADER_IDS: ShaderId[] = [
	"fractal-clouds",
	"ink-smoke",
	"liquid-chrome",
	"loop",
	"dots",
	"aurora",
	"noise-field",
	"plasma",
	"caustics",
	"edge-glow",
];

type CellKind = "shader" | "fill" | "material" | "motion";

type Cell = {
	key: string;
	index: number;
	kind: CellKind;
	shader: ShaderId;
};

const CELL_COUNT = 100;

// A deterministic mix: every fourth cell is a shader surface, the rest rotate through
// the two hosted decorative effects and a plain content-motion-only wrapper. Fixed
// (no randomness) so a device run and its screenshots are reproducible cell-for-cell.
const CELLS: Cell[] = Array.from({ length: CELL_COUNT }, (_, index) => {
	const kind = (["shader", "fill", "material", "motion"] as const)[index % 4];
	return {
		key: `cell-${index}`,
		index,
		kind,
		shader: SHADER_IDS[Math.floor(index / 4) % SHADER_IDS.length],
	};
});

const KIND_LABEL: Record<CellKind, string> = {
	shader: "shader · FxSurfaceView (MTKView)",
	fill: "fill · FxHostedView",
	material: "material · FxHostedView",
	motion: "motion-only · FxSurfaceView (no MTKView)",
};

/**
 * A 100-cell mixed-effect list standing in for a real content feed under scroll.
 *
 * The four cell kinds exercise both substrates at list scale: shader cells drive the
 * `expo-view` Metal path (the lazy `MTKView` over the process-shared device/queue/
 * pipeline cache), motion-only cells prove that a shader-less surface allocates no
 * `MTKView`, and the hosted fill/material cells run the decorative path alongside.
 * Virtualized so cells mount and unmount under scroll — the shared Metal context must
 * outlive any single surface while no per-instance device or queue is ever created.
 */
export function StressListScreen() {
	const { palette } = useTheme();

	return (
		<FlatList
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={styles.content}
			data={CELLS}
			keyExtractor={(cell) => cell.key}
			renderItem={({ item }) => <StressCell cell={item} />}
		/>
	);
}

function StressCell({ cell }: { cell: Cell }) {
	const { palette } = useTheme();

	const caption =
		cell.kind === "shader" ? `${KIND_LABEL.shader} · ${cell.shader}` : KIND_LABEL[cell.kind];

	return (
		<View style={styles.cell}>
			<Text style={[styles.caption, { color: palette.textMuted }]}>
				#{cell.index} · {caption}
			</Text>
			<View style={[styles.surface, { borderColor: palette.surfaceBorder }]}>
				{cell.kind === "shader" && (
					<FxSurfaceView shader={cell.shader} intensity={0.8} style={StyleSheet.absoluteFill} />
				)}

				{cell.kind === "fill" && (
					<FxHostedView effect="fill" intensity={0.8} style={StyleSheet.absoluteFill} />
				)}

				{cell.kind === "material" && (
					<>
						<View style={styles.materialBacking}>
							<View style={[styles.colorBlock, { backgroundColor: "#ff6b6b" }]} />
							<View style={[styles.colorBlock, { backgroundColor: "#51cf66" }]} />
							<View style={[styles.colorBlock, { backgroundColor: "#339af0" }]} />
						</View>
						<FxHostedView
							effect="material"
							intensity={0.6}
							style={StyleSheet.absoluteFill}
						/>
					</>
				)}

				{cell.kind === "motion" && (
					<FxSurfaceView style={StyleSheet.absoluteFill}>
						<View style={[styles.motionChild, { backgroundColor: palette.surface }]}>
							<Text style={{ color: palette.text, fontSize: 14, fontWeight: "600" }}>
								content only
							</Text>
							<Text style={{ color: palette.textMuted, fontSize: 12 }}>
								wrapper animates this — no Metal
							</Text>
						</View>
					</FxSurfaceView>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	content: { padding: 16, gap: 12 },
	cell: { gap: 6 },
	caption: { fontSize: 12 },
	surface: {
		height: 120,
		borderRadius: 12,
		borderWidth: 1,
		overflow: "hidden",
	},
	materialBacking: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	colorBlock: { width: 44, height: 44, borderRadius: 8 },
	motionChild: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
});
