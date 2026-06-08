import { Host, Slider } from "@expo/ui/jetpack-compose";
import type { NativeSliderProps } from "./native-controls-types";

export function NativeSlider({ value, min, max, onChange }: NativeSliderProps) {
	return (
		<Host matchContents>
			<Slider value={value} min={min} max={max} onValueChange={onChange} />
		</Host>
	);
}
