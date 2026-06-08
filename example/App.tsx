// TODO: temporary device-verification harness — remove after device verification.
import { type ReactElement, useState } from "react";
import {
	FlatList,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { FxHostedView } from "../packages/src/runtime/FxHostedView";

type TaskStatus = "verified" | "in-progress" | "todo";

type DeviceTask = {
	id: string;
	title: string;
	platform: string;
	what: string;
	status: TaskStatus;
	render: (onBack: () => void) => ReactElement;
};

// Each row is a task with a non-headless gate. `render` returns its on-device
// verification screen; todo tasks point at the shared BlankScreen until built.
const TASKS: DeviceTask[] = [
	{
		id: "U3-001",
		title: "Hosted fill + iOS material",
		platform: "iOS · Android",
		what: "gradient fill both platforms; iOS .glassEffect over content",
		status: "verified",
		render: (onBack) => <FillMaterialScreen onBack={onBack} />,
	},
	{
		id: "U3-006",
		title: "Curated shader catalog (10)",
		platform: "iOS · Android",
		what: "10 shaders render; time advances; intensity; switch; lifecycle",
		status: "in-progress",
		render: (onBack) => <ShaderScreen onBack={onBack} />,
	},
	{
		id: "U3-002",
		title: "Hosting parity / glass styles / uniforms / GPU resume",
		platform: "iOS · Android",
		what: "FX-002 glass styles · FX-005 uniform alignment · SPINE-012 parity",
		status: "todo",
		render: (onBack) => <BlankScreen taskId="U3-002" onBack={onBack} />,
	},
	{
		id: "U3-003",
		title: "Android material fallback",
		platform: "Android",
		what: "FX-003 RenderEffect blur · intensity 0–1 · staleness",
		status: "todo",
		render: (onBack) => <BlankScreen taskId="U3-003" onBack={onBack} />,
	},
	{
		id: "U3-005",
		title: "metallib bundle + AGSL asset loading",
		platform: "iOS · Android",
		what: "REAL-002 default.metallib resolves · REAL-003 AGSL assets read",
		status: "todo",
		render: (onBack) => <BlankScreen taskId="U3-005" onBack={onBack} />,
	},
	{
		id: "U3-007",
		title: "iOS symbol (.symbolEffect)",
		platform: "iOS",
		what: "SF Symbol renders through the hosted path",
		status: "todo",
		render: (onBack) => <BlankScreen taskId="U3-007" onBack={onBack} />,
	},
];

export default function App() {
	const [activeId, setActiveId] = useState<string | null>(null);
	const active = TASKS.find((task) => task.id === activeId);

	if (active) {
		return active.render(() => setActiveId(null));
	}

	return (
		<SafeAreaView style={styles.root}>
			<Text style={styles.homeHeader}>Device verification</Text>
			<FlatList
				data={TASKS}
				keyExtractor={(task) => task.id}
				contentContainerStyle={styles.listContent}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={styles.taskRow}
						onPress={() => setActiveId(item.id)}
					>
						<View style={styles.taskRowHead}>
							<Text style={styles.taskId}>{item.id}</Text>
							<Text style={[styles.statusBadge, statusStyle[item.status]]}>
								{item.status}
							</Text>
						</View>
						<Text style={styles.taskTitle}>{item.title}</Text>
						<Text style={styles.taskMeta}>{item.platform}</Text>
						<Text style={styles.taskWhat}>{item.what}</Text>
					</TouchableOpacity>
				)}
			/>
		</SafeAreaView>
	);
}

// Placeholder for a task whose render screen is not built yet.
function BlankScreen({
	taskId,
	onBack,
}: {
	taskId: string;
	onBack: () => void;
}) {
	return (
		<SafeAreaView style={styles.root}>
			<View style={styles.content}>
				<TouchableOpacity onPress={onBack} style={styles.backButton}>
					<Text style={styles.backText}>{"< Back"}</Text>
				</TouchableOpacity>
				<Text style={styles.header}>{taskId}</Text>
				<View style={styles.blankBody}>
					<Text style={styles.blankText}>Not implemented yet</Text>
					<Text style={styles.blankSub}>
						Render content lands when this task is built.
					</Text>
				</View>
			</View>
		</SafeAreaView>
	);
}

function FillMaterialScreen({ onBack }: { onBack: () => void }) {
	return (
		<SafeAreaView style={styles.root}>
			<ScrollView contentContainerStyle={styles.content}>
				<TouchableOpacity onPress={onBack} style={styles.backButton}>
					<Text style={styles.backText}>{"< Back"}</Text>
				</TouchableOpacity>

				<Text style={styles.header}>U3-001 · hosted effect renderer</Text>

				<Text style={styles.label}>fill · gradient (iOS + Android)</Text>
				<FxHostedView effect="fill" intensity={0.8} style={styles.box} />

				<Text style={styles.label}>fill · gradient, intensity 0.3</Text>
				<FxHostedView effect="fill" intensity={0.3} style={styles.box} />

				<Text style={styles.label}>
					material · glass over content (iOS only)
				</Text>
				<View style={styles.box}>
					<View style={styles.cardContent}>
						<View style={[styles.colorBlock, { backgroundColor: "#ff6b6b" }]} />
						<View style={[styles.colorBlock, { backgroundColor: "#51cf66" }]} />
						<View style={[styles.colorBlock, { backgroundColor: "#339af0" }]} />
						<Text style={styles.cardText}>Hello from behind glass</Text>
					</View>
					<FxHostedView
						effect="material"
						intensity={0.6}
						style={StyleSheet.absoluteFill}
					/>
				</View>

				<Text style={styles.label}>none · empty (no effect prop)</Text>
				<FxHostedView style={styles.box} />
			</ScrollView>
		</SafeAreaView>
	);
}

const SHADER_IDS = [
	"fractal-clouds",
	"ink-smoke",
	"liquid-chrome",
	"loop",
	"dots",
	"aurora",
	"noise-field",
	"plasma",
	"caustics",
	"edge-glow",
] as const;

const INTENSITY_STEPS = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

function ShaderScreen({ onBack }: { onBack: () => void }) {
	const [shaderId, setShaderId] = useState<string>("fractal-clouds");
	const [intensity, setIntensity] = useState(0.8);

	return (
		<SafeAreaView style={styles.root}>
			<ScrollView contentContainerStyle={styles.content}>
				<TouchableOpacity onPress={onBack} style={styles.backButton}>
					<Text style={styles.backText}>{"< Back"}</Text>
				</TouchableOpacity>

				<Text style={styles.header}>U3-006 · curated shaders</Text>

				<View style={styles.shaderGrid}>
					{SHADER_IDS.map((id) => (
						<TouchableOpacity
							key={id}
							style={[
								styles.shaderChip,
								shaderId === id && styles.shaderChipActive,
							]}
							onPress={() => setShaderId(id)}
						>
							<Text
								style={[
									styles.shaderChipText,
									shaderId === id && styles.shaderChipTextActive,
								]}
							>
								{id}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<Text style={styles.label}>
					{shaderId} · intensity: {intensity.toFixed(1)}
				</Text>

				<FxHostedView
					effect={shaderId}
					intensity={intensity}
					style={styles.shaderBox}
				/>

				<View style={styles.intensityRow}>
					{INTENSITY_STEPS.map((step) => (
						<TouchableOpacity
							key={step}
							style={[
								styles.intensityChip,
								intensity === step && styles.intensityChipActive,
							]}
							onPress={() => setIntensity(step)}
						>
							<Text
								style={[
									styles.intensityText,
									intensity === step && styles.intensityTextActive,
								]}
							>
								{step.toFixed(1)}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#0d0d0d" },
	content: { padding: 16, gap: 16 },
	homeHeader: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "700",
		padding: 16,
		paddingBottom: 8,
	},
	listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
	taskRow: {
		backgroundColor: "#1a1a2e",
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: "#333",
		gap: 4,
	},
	taskRowHead: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	taskId: { color: "#5B8CFF", fontSize: 15, fontWeight: "700" },
	taskTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
	taskMeta: { color: "#9aa0a6", fontSize: 12 },
	taskWhat: { color: "#6b7280", fontSize: 12 },
	statusBadge: {
		fontSize: 11,
		fontWeight: "700",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		overflow: "hidden",
	},
	badgeVerified: { color: "#0d0d0d", backgroundColor: "#51cf66" },
	badgeProgress: { color: "#0d0d0d", backgroundColor: "#ffd43b" },
	badgeTodo: { color: "#cbd5e1", backgroundColor: "#333" },
	blankBody: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 80,
		gap: 8,
	},
	blankText: { color: "#fff", fontSize: 16, fontWeight: "600" },
	blankSub: { color: "#9aa0a6", fontSize: 13 },
	header: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
	label: { color: "#9aa0a6", fontSize: 13, marginTop: 8 },
	box: { width: 200, height: 150, backgroundColor: "#1a1a2e" },
	shaderBox: { width: "100%", height: 200, backgroundColor: "#1a1a2e" },
	cardContent: {
		flex: 1,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "center",
		padding: 8,
		gap: 6,
	},
	colorBlock: { width: 50, height: 50, borderRadius: 8 },
	cardText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		width: "100%",
		textAlign: "center",
	},
	backButton: { paddingVertical: 4 },
	backText: { color: "#5B8CFF", fontSize: 15 },
	shaderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	shaderChip: {
		backgroundColor: "#1a1a2e",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#333",
	},
	shaderChipActive: { borderColor: "#5B8CFF", backgroundColor: "#1a2a4e" },
	shaderChipText: { color: "#9aa0a6", fontSize: 13 },
	shaderChipTextActive: { color: "#5B8CFF", fontWeight: "600" },
	intensityRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
	intensityChip: {
		backgroundColor: "#1a1a2e",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#333",
	},
	intensityChipActive: { borderColor: "#5B8CFF", backgroundColor: "#1a2a4e" },
	intensityText: { color: "#9aa0a6", fontSize: 13 },
	intensityTextActive: { color: "#5B8CFF", fontWeight: "600" },
});

const statusStyle: Record<TaskStatus, object> = {
	verified: styles.badgeVerified,
	"in-progress": styles.badgeProgress,
	todo: styles.badgeTodo,
};
