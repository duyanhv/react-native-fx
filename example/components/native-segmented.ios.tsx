import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import type { NativeSegmentedProps } from "./native-controls-types";

export function NativeSegmented({
	options,
	selectedIndex,
	onChange,
}: NativeSegmentedProps) {
	return (
		<Host style={{ width: "100%", height: 36 }}>
			<Picker
				selection={selectedIndex}
				onSelectionChange={(selection) =>
					onChange(
						typeof selection === "number" ? selection : Number(selection),
					)
				}
				modifiers={[pickerStyle("segmented")]}
			>
				{options.map((label, index) => (
					<Text key={label} modifiers={[tag(index)]}>
						{label}
					</Text>
				))}
			</Picker>
		</Host>
	);
}
