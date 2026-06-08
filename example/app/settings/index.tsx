import Constants from "expo-constants";
import { ScrollView, Text, View } from "react-native";
import { NativeSegmented } from "../../components/native-segmented";
import { type ThemeOverride, useTheme } from "../../components/theme";

const OVERRIDES: ThemeOverride[] = ["system", "light", "dark"];
const LABELS = ["System", "Light", "Dark"];

export default function SettingsScreen() {
	const { palette, override, setOverride, scheme } = useTheme();
	const selectedIndex = Math.max(0, OVERRIDES.indexOf(override));

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 24 }}
		>
			<View style={{ gap: 8 }}>
				<Text style={{ color: palette.textMuted, fontSize: 13 }}>
					Appearance
				</Text>
				<NativeSegmented
					options={LABELS}
					selectedIndex={selectedIndex}
					onChange={(index) => setOverride(OVERRIDES[index])}
				/>
				<Text style={{ color: palette.textFaint, fontSize: 12 }}>
					Resolved scheme: {scheme}
				</Text>
			</View>

			<View style={{ gap: 4 }}>
				<Text style={{ color: palette.textMuted, fontSize: 13 }}>Build</Text>
				<Text selectable style={{ color: palette.text, fontSize: 14 }}>
					{Constants.expoConfig?.name} v{Constants.expoConfig?.version}
				</Text>
				<Text selectable style={{ color: palette.textFaint, fontSize: 12 }}>
					Expo SDK {Constants.expoConfig?.sdkVersion ?? "—"}
				</Text>
			</View>
		</ScrollView>
	);
}
