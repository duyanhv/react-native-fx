import { Stack, useLocalSearchParams } from "expo-router";
import { COMPS } from "../../data/comps";
import type { DemoScreen } from "../../data/tasks";
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

export default function CompDetail() {
	const { compId } = useLocalSearchParams<{ compId: string }>();
	const comp = COMPS.find((item) => item.id === compId);

	return (
		<>
			<Stack.Screen options={{ title: comp?.title ?? "Component" }} />
			{renderDemo(comp?.screen, comp?.title ?? "Component")}
		</>
	);
}
