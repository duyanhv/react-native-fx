import type { NativeSliderProps } from "./native-controls-types";

// The native slider ships only on iOS and Android (@expo/ui). Web renders nothing.
export function NativeSlider(_props: NativeSliderProps) {
	return null;
}
