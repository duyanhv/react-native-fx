export type NativeSliderProps = {
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
};

export type NativeSegmentedProps = {
	options: string[];
	selectedIndex: number;
	onChange: (index: number) => void;
};
