import { Stack, useLocalSearchParams } from "expo-router";
import { COMPS } from "../../data/comps";
import type { DemoScreen } from "../../data/tasks";
import { AndroidMaterialScreen } from "../../screens/android-material";
import { FillMaterialScreen } from "../../screens/fill-material";
import { HostingParityScreen } from "../../screens/hosting-parity";
import { ShaderCatalogScreen } from "../../screens/shader-catalog";
import { SymbolScreen } from "../../screens/symbol";
import { TaskBlankScreen } from "../../screens/task-blank";

function renderDemo(screen: DemoScreen | undefined, label: string) {
	switch (screen) {
		case "fill-material":
			return <FillMaterialScreen />;
		case "shaders":
			return <ShaderCatalogScreen />;
		case "symbol":
			return <SymbolScreen />;
		case "android-material":
			return <AndroidMaterialScreen />;
		case "hosting-parity":
			return <HostingParityScreen />;
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
