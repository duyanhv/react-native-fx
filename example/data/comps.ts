import type { DemoScreen } from "./tasks";

export type CompStatus = "ready" | "todo";

export type Comp = {
	id: string;
	title: string;
	subtitle: string;
	status: CompStatus;
	screen: DemoScreen;
};

export const COMPS: Comp[] = [
	{
		id: "fill-material",
		title: "Fill & Material",
		subtitle: "Gradient fill · iOS glass over content",
		status: "ready",
		screen: "fill-material",
	},
	{
		id: "shaders",
		title: "Shaders",
		subtitle: "10 curated generative shaders",
		status: "ready",
		screen: "shaders",
	},
	{
		id: "edge-glow",
		title: "Edge Glow",
		subtitle: "Self-contained edge glow effect",
		status: "todo",
		screen: "blank",
	},
];
