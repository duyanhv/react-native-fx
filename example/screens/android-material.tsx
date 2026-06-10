import { useEffect, useRef, useState } from "react";
import {
	Animated,
	Easing,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { FxHostedView } from "react-native-fx";
import { NativeSlider } from "../components/native-slider";
import { useTheme } from "../components/theme";

export function AndroidMaterialScreen() {
	const { palette } = useTheme();
	const [intensity, setIntensity] = useState(0.5);

	// Animated block behind the blur to exercise RenderEffect staleness.
	const animValue = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.loop(
			Animated.timing(animValue, {
				toValue: 1,
				duration: 3000,
				easing: Easing.linear,
				useNativeDriver: false,
			}),
		);
		anim.start();
		return () => anim.stop();
	}, [animValue]);

	const translateX = animValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 140],
	});

	const backgroundColor = animValue.interpolate({
		inputRange: [0, 0.33, 0.66, 1],
		outputRange: ["#ff6b6b", "#51cf66", "#339af0", "#ff6b6b"],
	});

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				U3-003 · Android material fallback + intensity + staleness
			</Text>

			<View style={[styles.stage, { backgroundColor: palette.surface }]}
			>
				<Animated.View
					style={[
						styles.block,
						{
							transform: [{ translateX }],
							backgroundColor,
						},
					]}
				/>
				<FxHostedView
					effect="material"
					intensity={intensity}
					style={StyleSheet.absoluteFill}
				/>
			</View>

			<NativeSlider value={intensity} min={0} max={1} onChange={setIntensity} />

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				intensity {intensity.toFixed(2)}
			</Text>

			<Text style={[styles.note, { color: palette.textFaint }]}>
				The block behind the blur moves and changes color. If the blur
				updates with the content, RenderEffect staleness is not present.
			</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	stage: {
		width: "100%",
		height: 200,
		borderRadius: 12,
		overflow: "hidden",
		position: "relative",
	},
	block: {
		width: 50,
		height: 50,
		borderRadius: 8,
		marginTop: 20,
		marginLeft: 20,
	},
	note: {
		fontSize: 12,
		lineHeight: 18,
	},
});
