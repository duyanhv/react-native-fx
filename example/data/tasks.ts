export type TaskStatus = "verified" | "in-progress" | "todo";
export type DemoScreen = "fill-material" | "shaders" | "content-motion" | "blank";

export type DeviceTask = {
	id: string;
	title: string;
	platform: string;
	what: string;
	status: TaskStatus;
	screen: DemoScreen;
};

export const TASKS: DeviceTask[] = [
	{
		id: "U3-001",
		title: "Hosted fill + iOS material",
		platform: "iOS · Android",
		what: "gradient fill both platforms; iOS glass over content",
		status: "verified",
		screen: "fill-material",
	},
	{
		id: "U3-006",
		title: "Curated shader catalog (10)",
		platform: "iOS · Android",
		what: "10 shaders render; time advances; intensity; switch; lifecycle",
		status: "in-progress",
		screen: "shaders",
	},
	{
		id: "U3-002",
		title: "Hosting parity / glass styles / uniforms",
		platform: "iOS · Android",
		what: "glass styles · uniform alignment · hosting parity",
		status: "todo",
		screen: "blank",
	},
	{
		id: "U3-003",
		title: "Android material fallback",
		platform: "Android",
		what: "RenderEffect blur · intensity 0–1 · staleness",
		status: "todo",
		screen: "blank",
	},
	{
		id: "U3-005",
		title: "metallib bundle + AGSL asset loading",
		platform: "iOS · Android",
		what: "default metallib resolves · AGSL assets read",
		status: "todo",
		screen: "blank",
	},
	{
		id: "U3-007",
		title: "iOS symbol effect",
		platform: "iOS",
		what: "SF Symbol renders through the hosted path",
		status: "todo",
		screen: "blank",
	},
	{
		id: "U4-002",
		title: "mountChildComponentView override",
		platform: "iOS · Android",
		what: "RN child mounts into intermediate container; hit-test survives",
		status: "in-progress",
		screen: "content-motion",
	},
];
