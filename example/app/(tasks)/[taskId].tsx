import { Stack, useLocalSearchParams } from "expo-router";
import type { DemoScreen } from "../../data/tasks";
import { TASKS } from "../../data/tasks";
import { AndroidMaterialScreen } from "../../screens/android-material";
import { CoexistenceScreen } from "../../screens/coexistence";
import { ContentMotionScreen } from "../../screens/content-motion";
import { FillMaterialScreen } from "../../screens/fill-material";
import { HostingParityScreen } from "../../screens/hosting-parity";
import { PresenceScreen } from "../../screens/presence";
import { RuntimeShaderScreen } from "../../screens/runtime-shader";
import { ShaderCatalogScreen } from "../../screens/shader-catalog";
import { SourceScrollScreen } from "../../screens/source-scroll";
import { StressListScreen } from "../../screens/stress-list";
import { SymbolScreen } from "../../screens/symbol";
import { TaskBlankScreen } from "../../screens/task-blank";

function renderDemo(screen: DemoScreen | undefined, label: string) {
	switch (screen) {
		case "fill-material":
			return <FillMaterialScreen />;
		case "shaders":
			return <ShaderCatalogScreen />;
		case "content-motion":
			return <ContentMotionScreen />;
		case "symbol":
			return <SymbolScreen />;
		case "android-material":
			return <AndroidMaterialScreen />;
		case "hosting-parity":
			return <HostingParityScreen />;
		case "stress-list":
			return <StressListScreen />;
		case "presence":
			return <PresenceScreen />;
		case "coexistence":
			return <CoexistenceScreen />;
		case "source-scroll":
			return <SourceScrollScreen />;
		case "runtime-shader":
			return <RuntimeShaderScreen />;
		default:
			return <TaskBlankScreen label={label} />;
	}
}

export default function TaskDetail() {
	const { taskId } = useLocalSearchParams<{ taskId: string }>();
	const task = TASKS.find((item) => item.id === taskId);

	return (
		<>
			<Stack.Screen options={{ title: task?.id ?? "Task" }} />
			{renderDemo(task?.screen, task?.title ?? "Task")}
		</>
	);
}
