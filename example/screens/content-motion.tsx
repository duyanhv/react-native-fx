import { useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { FxSurfaceView } from "react-native-fx";
import { useTheme } from "../components/theme";

export function ContentMotionScreen() {
	const { palette } = useTheme();
	const [show, setShow] = useState(false);
	const [tapCount, setTapCount] = useState(0);

	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				gap: 16,
				backgroundColor: palette.background,
				padding: 16,
			}}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U4-002 · mountChildComponentView override
			</Text>

			<Pressable
				onPress={() => setShow(!show)}
				style={[
					styles.button,
					{ backgroundColor: palette.surfaceActive },
				]}
			>
				<Text style={{ color: palette.text, fontSize: 14, fontWeight: "600" }}>
					{show ? "Hide child" : "Show child"}
				</Text>
			</Pressable>

			<FxSurfaceView style={styles.box}>
				{show && (
					<Pressable
						onPress={() => setTapCount((c) => c + 1)}
						style={[
							styles.child,
							{ backgroundColor: palette.surface },
						]}
					>
						<Text style={{ color: palette.text, fontSize: 14 }}>
							Tap me
						</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							count: {tapCount}
						</Text>
					</Pressable>
				)}
			</FxSurfaceView>

			<Text style={{ color: palette.textMuted, fontSize: 12, textAlign: "center" }}>
				No shader prop — metalView is hidden. The child should mount into the intermediate container and receive taps.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	button: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
	},
	box: {
		width: 200,
		height: 200,
		borderRadius: 12,
		overflow: "hidden",
	},
	child: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
});
