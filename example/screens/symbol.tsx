import { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { FxHostedView, type SymbolAnimation } from "react-native-fx";
import { NativeSegmented } from "../components/native-segmented";
import { useTheme } from "../components/theme";

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

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U3-007 · iOS symbol effect
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

			<FxHostedView
				style={styles.box}
				symbolConfig={{
					name,
					animation,
					trigger,
					replaceWith: name !== replaceWith ? replaceWith : undefined,
				}}
			/>

			<Text style={[styles.caption, { color: palette.textMuted }]}>
				{name} · {animation} · {trigger}
				{name !== replaceWith ? ` → ${replaceWith}` : ""}
			</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	row: { gap: 6 },
	label: { fontSize: 14, fontWeight: "600" },
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
