import {
	Host,
	SegmentedButton,
	SingleChoiceSegmentedButtonRow,
	Text,
} from "@expo/ui/jetpack-compose";
import type { NativeSegmentedProps } from "./native-controls-types";

export function NativeSegmented({
	options,
	selectedIndex,
	onChange,
}: NativeSegmentedProps) {
	return (
		<Host style={{ width: "100%", height: 48 }}>
			<SingleChoiceSegmentedButtonRow>
				{options.map((label, index) => (
					<SegmentedButton
						key={label}
						selected={index === selectedIndex}
						onClick={() => onChange(index)}
					>
						<SegmentedButton.Label>
							<Text>{label}</Text>
						</SegmentedButton.Label>
					</SegmentedButton>
				))}
			</SingleChoiceSegmentedButtonRow>
		</Host>
	);
}
