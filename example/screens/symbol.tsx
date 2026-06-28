import { useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Fx, FxHostedView, fx, registerSymbol, type SymbolAnimation } from "react-native-fx";
import { NativeSegmented } from "../components/native-segmented";
import { useTheme } from "../components/theme";

// Minimal Lottie JSON for a pulsing circle (discrete — plays once per trigger).
const LOTTIE_PULSE = {
	v: "5.9.0", fr: 30, ip: 0, op: 30, w: 100, h: 100, nm: "pulse",
	ddd: 0, assets: [],
	layers: [{
		ind: 1, ty: 4, nm: "dot", ddd: 0, sr: 1, ao: 0, ip: 0, op: 30, st: 0, bm: 0,
		ks: {
			o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
			p: { a: 0, k: [50, 50, 0] }, a: { a: 0, k: [0, 0, 0] },
			s: { a: 1, k: [
				{ i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] }, t: 0, s: [100, 100, 100] },
				{ i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] }, t: 15, s: [140, 140, 100] },
				{ t: 30, s: [100, 100, 100] },
			] },
		},
		shapes: [{ ty: "gr", it: [
			{ ty: "el", s: { a: 0, k: [60, 60] }, p: { a: 0, k: [0, 0] } },
			{ ty: "fl", c: { a: 0, k: [0.2, 0.5, 1, 1] }, o: { a: 0, k: 100 } },
		] }],
	}],
};

// Minimal Lottie JSON for a spinning circle (indefinite — loops while trigger is active).
const LOTTIE_SPIN = {
	v: "5.9.0", fr: 30, ip: 0, op: 60, w: 100, h: 100, nm: "spin",
	ddd: 0, assets: [],
	layers: [{
		ind: 1, ty: 4, nm: "ring", ddd: 0, sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
		ks: {
			o: { a: 0, k: 100 },
			r: { a: 1, k: [
				{ i: { x: [0.5], y: [0.5] }, o: { x: [0.5], y: [0.5] }, t: 0, s: [0] },
				{ t: 60, s: [360] },
			] },
			p: { a: 0, k: [50, 50, 0] }, a: { a: 0, k: [0, 0, 0] },
			s: { a: 0, k: [100, 100, 100] },
		},
		shapes: [{ ty: "gr", it: [
			{ ty: "el", s: { a: 0, k: [60, 60] }, p: { a: 0, k: [0, 0] } },
			{ ty: "st", c: { a: 0, k: [1, 0.55, 0.1, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 8 } },
		] }],
	}],
};

// Register both shapes for Android. "heart" → discrete pulse; "star" → indefinite spin.
// On iOS these calls are no-ops — SF Symbols supply the visuals.
registerSymbol({ name: "heart", android: { type: "lottie", source: LOTTIE_PULSE } });
registerSymbol({ name: "star", android: { type: "lottie", source: LOTTIE_SPIN } });

const SYMBOL_NAMES = ["heart", "star", "bell", "heart.fill", "star.fill"];

const ANIMATIONS: SymbolAnimation[] = [
	"bounce",
	"pulse",
	"scale",
	"appear",
	"disappear",
	"variableColor",
	"breathe",
	"rotate",
	"wiggle",
];

const TRIGGER_MODES = ["value", "state", "repeat"] as const;

export function SymbolScreen() {
	const { palette } = useTheme();
	const [nameIndex, setNameIndex] = useState(0);
	const [animIndex, setAnimIndex] = useState(0);
	const [triggerIndex, setTriggerIndex] = useState(0);
	const [replaceWithIndex, setReplaceWithIndex] = useState(0);

	const name = SYMBOL_NAMES[nameIndex];
	const animation = ANIMATIONS[animIndex];
	const trigger = TRIGGER_MODES[triggerIndex];
	const replaceWith = SYMBOL_NAMES[replaceWithIndex];

	// One shared config feeds both render paths, so any visual divergence between the
	// direct host view and the public builder is the builder's doing, not the inputs'.
	const config = {
		name,
		animation,
		trigger,
		replaceWith: name !== replaceWith ? replaceWith : undefined,
	};

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				{Platform.OS === "android" ? "DEF-025 · Android symbol (Lottie)" : "U3-007 · iOS symbol effect"}
			</Text>

			<View style={styles.row}>
				<Text style={[styles.label, { color: palette.text }]}>Symbol</Text>
				<NativeSegmented
					options={SYMBOL_NAMES}
					selectedIndex={nameIndex}
					onChange={setNameIndex}
				/>
			</View>

			<View style={styles.row}>
				<Text style={[styles.label, { color: palette.text }]}>Animation</Text>
				<NativeSegmented
					options={ANIMATIONS}
					selectedIndex={animIndex}
					onChange={setAnimIndex}
				/>
			</View>

			<View style={styles.row}>
				<Text style={[styles.label, { color: palette.text }]}>Trigger</Text>
				<NativeSegmented
					options={[...TRIGGER_MODES]}
					selectedIndex={triggerIndex}
					onChange={setTriggerIndex}
				/>
			</View>

			<View style={styles.row}>
				<Text style={[styles.label, { color: palette.text }]}>Replace with</Text>
				<NativeSegmented
					options={SYMBOL_NAMES}
					selectedIndex={replaceWithIndex}
					onChange={setReplaceWithIndex}
				/>
			</View>

			<View style={styles.compareRow}>
				<View style={styles.compareCol}>
					<Text style={[styles.pathLabel, { color: palette.text }]}>
						Direct (FxHostedView)
					</Text>
					<FxHostedView style={styles.box} symbolConfig={config} />
				</View>
				<View style={styles.compareCol}>
					<Text style={[styles.pathLabel, { color: palette.text }]}>
						Builder (fx.effect.symbol)
					</Text>
					<Fx style={styles.box} effect={fx.effect.symbol(config)} />
				</View>
			</View>

			<Text style={[styles.caption, { color: palette.textMuted }]}>
				{name} · {animation} · {trigger}
				{name !== replaceWith ? ` → ${replaceWith}` : ""}
			</Text>

			{Platform.OS === "android" && (
				<View style={{ gap: 6 }}>
					<Text style={[styles.label, { color: palette.text }]}>
						Missing-asset degradation (bell — unregistered)
					</Text>
					<Text style={[styles.caption, { color: palette.textMuted }]}>
						No render, dev warn, onError(unsupported). No crash.
					</Text>
					<Fx
						style={[styles.box, { height: 80 }]}
						effect={fx.effect.symbol({ name: "bell", animation: "bounce" })}
						onError={(e) => console.warn("DEF-025 missing-asset:", e.nativeEvent.reason)}
					/>
				</View>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	row: { gap: 6 },
	label: { fontSize: 14, fontWeight: "600" },
	compareRow: { flexDirection: "row", gap: 12 },
	compareCol: { flex: 1, gap: 6 },
	pathLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
	box: {
		width: "100%",
		height: 200,
		alignItems: "center",
		justifyContent: "center",
	},
	caption: {
		fontSize: 13,
		textAlign: "center",
	},
});
