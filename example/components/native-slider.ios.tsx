import { Host, Slider } from "@expo/ui/swift-ui";
import type { NativeSliderProps } from "./native-controls-types";

export function NativeSlider({ value, min, max, onChange }: NativeSliderProps) {
	// A slider has no intrinsic size, so `matchContents` collapses it to zero;
	// give the host an explicit height and let it fill the available width.
	return (
		<Host style={{ width: "100%", height: 44 }}>
			<Slider value={value} min={min} max={max} onValueChange={onChange} />
		</Host>
	);
}
