export type TaskStatus = "verified" | "in-progress" | "todo";
export type DemoScreen = "fill-material" | "shaders" | "content-motion" | "symbol" | "android-material" | "hosting-parity" | "stress-list" | "presence" | "coexistence" | "source-scroll" | "runtime-shader" | "blank";

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
		id: "DEF-008",
		title: "Runtime shader compilation",
		platform: "iOS · Android",
		what: "app-supplied MSL+AGSL via registerShader · runtime compile · onError on malformed · iOS-only degrades on Android",
		status: "todo",
		screen: "runtime-shader",
	},
	{
		id: "DEF-014",
		title: "Scroll-linked source rung",
		platform: "iOS",
		what: "hosted ScrollView of fx tiles · render-server scrollTransition · zero per-frame JS · os<17 static",
		status: "todo",
		screen: "source-scroll",
	},
	{
		id: "U8-002",
		title: "RNGH coexistence matrix",
		platform: "iOS · Android",
		what: "active surface inside ScrollView/pager/bottom-sheet/RNGH-pan · cancel path · passive/controlled/nested",
		status: "todo",
		screen: "coexistence",
	},
	{
		id: "U7-001",
		title: "FxPresence handshake",
		platform: "iOS · Android",
		what: "deferred-unmount · interrupt-as-retarget · transient envelope · onTransitionEnd",
		status: "todo",
		screen: "presence",
	},
	{
		id: "EX-002",
		title: "100-cell mixed stress list",
		platform: "iOS · Android",
		what: "shared Metal context · scroll perf · no MTKView without a shader",
		status: "todo",
		screen: "stress-list",
	},
	{
		id: "U4-002",
		title: "mountChildComponentView override",
		platform: "iOS · Android",
		what: "RN child mounts into intermediate container; hit-test survives",
		status: "in-progress",
		screen: "content-motion",
	},
	{
		id: "U3-007",
		title: "iOS symbol effect",
		platform: "iOS",
		what: "SF Symbol renders through the hosted path",
		status: "todo",
		screen: "symbol",
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
		id: "U3-003",
		title: "Android material fallback",
		platform: "Android",
		what: "RenderEffect blur · intensity 0–1 · staleness",
		status: "todo",
		screen: "android-material",
	},
	{
		id: "U3-002",
		title: "Hosting parity / glass styles / uniforms",
		platform: "iOS · Android",
		what: "glass styles · uniform alignment · hosting parity",
		status: "todo",
		screen: "hosting-parity",
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
		id: "U3-001",
		title: "Hosted fill + iOS material",
		platform: "iOS · Android",
		what: "gradient fill both platforms; iOS glass over content",
		status: "verified",
		screen: "fill-material",
	},
];
