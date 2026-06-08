import { Stack, useLocalSearchParams } from "expo-router";
import type { DemoScreen } from "../../data/tasks";
import { TASKS } from "../../data/tasks";
import { FillMaterialScreen } from "../../screens/fill-material";
import { ShaderCatalogScreen } from "../../screens/shader-catalog";
import { TaskBlankScreen } from "../../screens/task-blank";

function renderDemo(screen: DemoScreen | undefined, label: string) {
	switch (screen) {
		case "fill-material":
			return <FillMaterialScreen />;
		case "shaders":
			return <ShaderCatalogScreen />;
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
