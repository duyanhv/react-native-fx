import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FxSurfaceView, registerShader } from "react-native-fx";
import { NativeSlider } from "../components/native-slider";
import { useTheme } from "../components/theme";

// App-supplied shader source, inlined here in app code — no build-path placement, no config
// plugin. registerShader pushes it across the bridge once; fx compiles it natively at runtime.
// The iOS fragment matches the fx raster ABI (`fx_fragment` over the prepended FxUniforms/VSOut);
// the Android AGSL declares the uniforms it uses so every native write is guarded.
const PULSE_MSL = `
fragment half4 fx_fragment(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  float2 c = uv - 0.5;
  float d = length(c);
  float wave = 0.5 + 0.5 * sin(u.time * 2.0 - d * 18.0);
  float3 col = mix(float3(0.05, 0.10, 0.35), float3(0.95, 0.45, 0.75), wave);
  col *= u.intensity;
  return half4(half3(col), 1.0);
}
`;

const PULSE_AGSL = `
uniform float time;
uniform vec2 resolution;
uniform float intensity;

half4 main(float2 fragCoord) {
  vec2 uv = fragCoord / resolution;
  vec2 c = uv - 0.5;
  float d = length(c);
  float wave = 0.5 + 0.5 * sin(time * 2.0 - d * 18.0);
  vec3 col = mix(vec3(0.05, 0.10, 0.35), vec3(0.95, 0.45, 0.75), wave);
  col *= intensity;
  return half4(col, 1.0);
}
`;

// Visibly different source for the same id — tests that re-registration reloads the surface.
const PULSE_MSL_ALT = `
fragment half4 fx_fragment(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  float2 c = uv - 0.5;
  float d = length(c);
  float wave = 0.5 + 0.5 * sin(u.time * 2.0 - d * 30.0);
  float3 col = mix(float3(0.35, 0.05, 0.10), float3(0.45, 0.95, 0.85), wave);
  col *= u.intensity;
  return half4(half3(col), 1.0);
}
`;

const PULSE_AGSL_ALT = `
uniform float time;
uniform vec2 resolution;
uniform float intensity;

half4 main(float2 fragCoord) {
  vec2 uv = fragCoord / resolution;
  vec2 c = uv - 0.5;
  float d = length(c);
  float wave = 0.5 + 0.5 * sin(time * 2.0 - d * 30.0);
  vec3 col = mix(vec3(0.35, 0.05, 0.10), vec3(0.45, 0.95, 0.85), wave);
  col *= intensity;
  return half4(col, 1.0);
}
`;

// Deliberately malformed: an undeclared identifier on both platforms. Compiles fail at runtime,
// so mounting it fires onFxError with no crash — the BYO fallback signal.
const BROKEN_MSL = `
fragment half4 fx_fragment(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  return half4(nonexistent_symbol, 1.0);
}
`;

const BROKEN_AGSL = `
uniform float time;
half4 main(float2 fragCoord) {
  return half4(nonexistent_symbol, 1.0);
}
`;

// Registered with iOS source only: on Android it degrades to {via:'none'} (the pair rule) —
// no draw, no error.
registerShader({ id: "app-pulse", source: { ios: PULSE_MSL, android: PULSE_AGSL } });
registerShader({ id: "app-broken", source: { ios: BROKEN_MSL, android: BROKEN_AGSL } });
registerShader({ id: "app-ios-only", source: { ios: PULSE_MSL } });

type Variant = "app-pulse" | "app-broken" | "app-ios-only";

const VARIANTS: { id: Variant; label: string }[] = [
	{ id: "app-pulse", label: "Working pulse" },
	{ id: "app-broken", label: "Malformed (onError)" },
	{ id: "app-ios-only", label: "iOS-only (Android none)" },
];

export function RuntimeShaderScreen() {
	const { palette } = useTheme();
	const [variant, setVariant] = useState<Variant>("app-pulse");
	const [intensity, setIntensity] = useState(0.8);
	const [status, setStatus] = useState("idle");
	const [useAltPulse, setUseAltPulse] = useState(false);

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<View style={styles.row}>
				{VARIANTS.map(({ id, label }) => {
					const active = variant === id;
					return (
						<TouchableOpacity
							key={id}
							onPress={() => {
								setStatus("idle");
								setVariant(id);
							}}
							style={[
								styles.chip,
								{
									backgroundColor: active ? palette.surfaceActive : palette.surface,
									borderColor: active ? palette.accent : palette.surfaceBorder,
								},
							]}
						>
							<Text style={{ color: active ? palette.accent : palette.textMuted }}>{label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* Re-registering replaces the source in the registry; the surface recompiles and re-emits onFxLoad or onFxError on the next prop apply. The intensity change below is a real, visible delta that forces that apply without changing the shader prop. */}
			<View style={styles.row}>
				<TouchableOpacity
					onPress={() => {
						setStatus("idle");
						const next = !useAltPulse;
						setUseAltPulse(next);
						registerShader({
							id: "app-pulse",
							source: {
								ios: next ? PULSE_MSL_ALT : PULSE_MSL,
								android: next ? PULSE_AGSL_ALT : PULSE_AGSL,
							},
						});
						setIntensity(next ? 0.6 : 0.85);
					}}
					style={[
						styles.chip,
						{
							backgroundColor: palette.surface,
							borderColor: palette.surfaceBorder,
						},
					]}
				>
					<Text style={{ color: palette.textMuted }}>Reload pulse (new source)</Text>
				</TouchableOpacity>
			</View>

			<FxSurfaceView
				shader={variant}
				intensity={intensity}
				onFxLoad={(event) => setStatus(`load: ${event.nativeEvent.shader}`)}
				onFxError={(event) =>
					setStatus(`error: ${event.nativeEvent.shader} — ${event.nativeEvent.reason ?? "?"}`)
				}
				style={styles.surface}
			/>

			<Text style={{ color: palette.textMuted }}>status: {status}</Text>

			<View style={{ gap: 8 }}>
				<Text style={{ color: palette.text }}>intensity {intensity.toFixed(2)}</Text>
				<NativeSlider value={intensity} min={0} max={1} onChange={setIntensity} />
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
	surface: { height: 240, borderRadius: 16, overflow: "hidden" },
});
