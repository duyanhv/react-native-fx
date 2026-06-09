import { Text, View } from "react-native";
import { useTheme } from "../components/theme";

export function TaskBlankScreen({ label }: { label: string }) {
	const { palette } = useTheme();
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				gap: 8,
				backgroundColor: palette.background,
			}}
		>
			<Text style={{ color: palette.text, fontSize: 16, fontWeight: "600" }}>
				Not implemented yet
			</Text>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				{label} content lands when this is built.
			</Text>
		</View>
	);
}
