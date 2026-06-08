# Example app: native router + tabs + theming + @expo/ui — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the `example/` dev-harness from a hand-rolled single-`App.tsx` into an expo-router app with native tabs, native stack headers, device-driven theming with an in-app override, and `@expo/ui` native controls.

**Architecture:** expo-router (SDK 56) owns navigation. Three native tabs (`expo-router/unstable-native-tabs`), each a `Stack` for native large-title headers. Theming is pure RN + expo-router: a token palette driven by `useColorScheme()`, with the Settings override calling `Appearance.setColorScheme()` so the OS appearance trait re-themes native chrome too — no `@react-navigation/native` import. `@expo/ui` supplies a segmented theme picker and a shader-intensity slider behind agnostic platform-split wrappers.

**Tech Stack:** Expo SDK 56, React Native 0.85, React 19.2, expo-router, `@expo/ui` (swift-ui / jetpack-compose), TypeScript, Biome.

**Verification reality:** Effects do not run headless (CLAUDE.md), and the example has no unit-test harness. The per-task gate is therefore **`tsc --noEmit` (typecheck) + `biome check --write` (format)**; correctness of rendering is proven once at the end via on-device verification (`guides/Device Verification Guide.md`). This replaces TDD, which cannot apply to native rendering here.

**Style:** Match the existing `App.tsx` idiom — **tab indentation, double quotes**. The example is not covered by `packages/biome.json`; run Biome with its defaults from the `example/` directory.

**Route tree (collision-free):**

```
example/
  app/
    _layout.tsx               ThemeProvider → <NativeTabs> (tasks / comps / settings)
    (tasks)/
      _layout.tsx             <Stack> large-title header
      index.tsx               /            verification task list
      [taskId].tsx            /:taskId     task detail (fill-material | shaders | blank)
    comps/
      _layout.tsx             <Stack>
      index.tsx               /comps       fx component catalog
      [compId].tsx            /comps/:compId  component demo
    settings/
      _layout.tsx             <Stack>
      index.tsx               /settings    theme override + build info
  components/
    theme.tsx                 palette tokens + ThemeProvider/useTheme + Appearance override
    native-controls-types.ts  shared prop types for the @expo/ui wrappers
    native-segmented.tsx      base/web fallback (tsc + web resolution target)
    native-segmented.ios.tsx  @expo/ui/swift-ui Picker (segmented)
    native-segmented.android.tsx  @expo/ui/jetpack-compose Picker (segmented)
    native-slider.tsx         base/web fallback
    native-slider.ios.tsx     @expo/ui/swift-ui Slider
    native-slider.android.tsx @expo/ui/jetpack-compose Slider
  screens/
    fill-material.tsx         migrated from App.tsx FillMaterialScreen
    shader-catalog.tsx        migrated from App.tsx ShaderScreen (intensity → NativeSlider)
    task-blank.tsx            migrated from App.tsx BlankScreen
  data/
    tasks.ts                  TASKS metadata (no render fns)
    comps.ts                  COMPS catalog metadata
```

Why `(tasks)` is a group but `comps`/`settings` are not: two silent groups can't both own `/`, and two root-level `[param]` routes collide. `(tasks)` owns `/` + `/:taskId`; `comps`/`settings` carry their folder name in the URL, so `/comps`, `/comps/:compId`, `/settings` are distinct and static paths win over `/:taskId`.

---

## Task 1: Install dependencies and switch the entry point

**Files:**
- Modify: `example/package.json` (main field; deps added by `expo install`)
- Modify: `example/app.json`
- Modify: `example/metro.config.js`
- Delete: `example/index.ts`, `example/App.tsx` (deleted in Step 6, after routes exist — see Task 9)

- [ ] **Step 1: Install router + nav + UI deps (SDK-56-correct versions, via bun)**

Run from `example/`:

```sh
cd example && bunx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar @expo/ui
```

Expected: each package added to `example/package.json` `dependencies` at SDK-56-compatible versions; `bun.lock` updated.

- [ ] **Step 2: Confirm the native-tabs + @expo/ui entry points actually exist**

The skill targets SDK 55; verify SDK 56 paths before coding against them.

```sh
cd example
node -e "console.log(require.resolve('expo-router/unstable-native-tabs'))" || echo "MISSING unstable-native-tabs"
node -e "console.log(require.resolve('@expo/ui/swift-ui'))"
node -e "console.log(require.resolve('@expo/ui/jetpack-compose'))"
```

Expected: all three resolve. If `unstable-native-tabs` is MISSING, check for a graduated path:

```sh
node -e "const p=require('./node_modules/expo-router/package.json'); console.log(Object.keys(p.exports||{}).filter(k=>k.includes('tab')))"
```

Use whichever native-tabs subpath resolves in every `NativeTabs` import below (default: `expo-router/unstable-native-tabs`).

- [ ] **Step 3: Point the entry at expo-router**

In `example/package.json`, change:

```json
"main": "index.ts",
```

to:

```json
"main": "expo-router/entry",
```

- [ ] **Step 4: Update app.json — scheme, plugin, automatic appearance**

In `example/app.json`, inside `"expo"`, set `"userInterfaceStyle": "automatic"` (was `"light"`) and add a top-level `scheme` and `plugins`:

```json
{
  "expo": {
    "name": "react-native-fx-example",
    "slug": "react-native-fx-example",
    "version": "1.0.0",
    "scheme": "rnfxexample",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "plugins": ["expo-router"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "expo.modules.fx.example"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "package": "expo.modules.fx.example"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

- [ ] **Step 5: Guard the new native singletons in metro**

Confirm the library/root don't ship duplicate copies of the new native singletons:

```sh
cd example && ls ../packages/node_modules/react-native-screens ../packages/node_modules/react-native-safe-area-context ../node_modules/react-native-screens 2>/dev/null
```

Then add the example copies to `extraNodeModules` in `example/metro.config.js` so they always resolve from the app. Edit the `extraNodeModules` block:

```js
config.resolver.extraNodeModules = {
  'react-native-fx': path.resolve(__dirname, '../packages'),
  react: path.resolve(exampleModules, 'react'),
  'react-native': path.resolve(exampleModules, 'react-native'),
  expo: path.resolve(exampleModules, 'expo'),
  'expo-modules-core': path.resolve(exampleModules, 'expo-modules-core'),
  'react-native-screens': path.resolve(exampleModules, 'react-native-screens'),
  'react-native-safe-area-context': path.resolve(
    exampleModules,
    'react-native-safe-area-context',
  ),
};
```

If Step 5's `ls` found a duplicate under `../packages` or `../node_modules`, also append a `blockList` entry for it mirroring the existing react/expo entries.

- [ ] **Step 6: Commit (entry + config only — routes come next)**

Do NOT delete `index.ts`/`App.tsx` yet (deleted in Task 9 once routes exist, to keep each commit runnable).

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/package.json example/app.json example/metro.config.js example/bun.lock
git commit -m "chore(example): add expo-router, @expo/ui, native nav deps"
```

---

## Task 2: Theme module

**Files:**
- Create: `example/components/theme.tsx`

- [ ] **Step 1: Write the theme module**

```tsx
import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useMemo,
	useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

export type Palette = {
	background: string;
	surface: string;
	surfaceBorder: string;
	surfaceActive: string;
	text: string;
	textMuted: string;
	textFaint: string;
	accent: string;
	badgeVerifiedBg: string;
	badgeProgressBg: string;
	badgeTodoBg: string;
	badgeOnColor: string;
	badgeTodoText: string;
};

const dark: Palette = {
	background: "#0d0d0d",
	surface: "#1a1a2e",
	surfaceBorder: "#333333",
	surfaceActive: "#1a2a4e",
	text: "#ffffff",
	textMuted: "#9aa0a6",
	textFaint: "#6b7280",
	accent: "#5b8cff",
	badgeVerifiedBg: "#51cf66",
	badgeProgressBg: "#ffd43b",
	badgeTodoBg: "#333333",
	badgeOnColor: "#0d0d0d",
	badgeTodoText: "#cbd5e1",
};

const light: Palette = {
	background: "#f2f2f7",
	surface: "#ffffff",
	surfaceBorder: "#d1d1d6",
	surfaceActive: "#e0e7ff",
	text: "#000000",
	textMuted: "#6b7280",
	textFaint: "#9aa0a6",
	accent: "#2563eb",
	badgeVerifiedBg: "#34c759",
	badgeProgressBg: "#ffcc00",
	badgeTodoBg: "#e5e5ea",
	badgeOnColor: "#ffffff",
	badgeTodoText: "#3a3a3c",
};

export type ThemeOverride = "system" | "light" | "dark";

type ThemeValue = {
	palette: Palette;
	scheme: "light" | "dark";
	override: ThemeOverride;
	setOverride: (next: ThemeOverride) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [override, setOverrideState] = useState<ThemeOverride>("system");
	const deviceScheme = useColorScheme();

	// Driving the OS appearance trait (rather than a navigation theme object) is
	// what lets the override re-tint the native tab bar and header too — not just
	// app content. `null` hands control back to the device.
	const setOverride = useCallback((next: ThemeOverride) => {
		setOverrideState(next);
		Appearance.setColorScheme(next === "system" ? null : next);
	}, []);

	const value = useMemo<ThemeValue>(() => {
		const scheme: "light" | "dark" = deviceScheme === "dark" ? "dark" : "light";
		return {
			palette: scheme === "dark" ? dark : light,
			scheme,
			override,
			setOverride,
		};
	}, [deviceScheme, override, setOverride]);

	return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeValue {
	const value = use(ThemeContext);
	if (!value) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return value;
}
```

- [ ] **Step 2: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write components/theme.tsx
```

Expected: no type errors; file formatted.

- [ ] **Step 3: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/components/theme.tsx
git commit -m "feat(example): theme palette + device-driven theme context"
```

---

## Task 3: Catalog data modules

**Files:**
- Create: `example/data/tasks.ts`
- Create: `example/data/comps.ts`

- [ ] **Step 1: Write `data/tasks.ts`**

```ts
export type TaskStatus = "verified" | "in-progress" | "todo";
export type DemoScreen = "fill-material" | "shaders" | "blank";

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
];
```

- [ ] **Step 2: Write `data/comps.ts`**

```ts
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
```

- [ ] **Step 3: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write data/
```

- [ ] **Step 4: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/data/
git commit -m "feat(example): task and component catalog data"
```

---

## Task 4: @expo/ui control wrappers

**Files:**
- Create: `example/components/native-controls-types.ts`
- Create: `example/components/native-slider.tsx` (+ `.ios.tsx`, `.android.tsx`)
- Create: `example/components/native-segmented.tsx` (+ `.ios.tsx`, `.android.tsx`)

The base `.tsx` files exist so `tsc` and web resolve a module for the bare import; metro picks `.ios`/`.android` on device.

- [ ] **Step 1: Confirm the @expo/ui API before coding (most reliable source)**

```sh
cd example
PKG=$(node -e "const path=require('path'); console.log(path.dirname(require.resolve('@expo/ui/swift-ui')))")
echo "$PKG"
ls "$PKG"
sed -n '1,80p' "$PKG/Slider/index.d.ts" 2>/dev/null || echo "check directory listing for the Slider/Picker dirs"
sed -n '1,80p' "$PKG/Picker/index.d.ts" 2>/dev/null
```

Confirm: Slider props (`value`, `min`, `max`, `onValueChange`), Picker props (`options`, `selectedIndex`, `variant`/segmented style, `onOptionSelected` with `nativeEvent.index`), and that both export `Host`. If a prop name differs in SDK 56, adapt the wrappers below to the `.d.ts` (the wrappers' own agnostic prop interface stays the same).

- [ ] **Step 2: Write shared types `components/native-controls-types.ts`**

```ts
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
```

- [ ] **Step 3: Write the slider — base, iOS, Android**

`components/native-slider.tsx` (base / web fallback):

```tsx
import type { NativeSliderProps } from "./native-controls-types";

// The native slider ships only on iOS and Android (@expo/ui). Web renders nothing.
export function NativeSlider(_props: NativeSliderProps) {
	return null;
}
```

`components/native-slider.ios.tsx`:

```tsx
import { Host, Slider } from "@expo/ui/swift-ui";
import type { NativeSliderProps } from "./native-controls-types";

export function NativeSlider({ value, min, max, onChange }: NativeSliderProps) {
	return (
		<Host matchContents>
			<Slider value={value} min={min} max={max} onValueChange={onChange} />
		</Host>
	);
}
```

`components/native-slider.android.tsx`:

```tsx
import { Host, Slider } from "@expo/ui/jetpack-compose";
import type { NativeSliderProps } from "./native-controls-types";

export function NativeSlider({ value, min, max, onChange }: NativeSliderProps) {
	return (
		<Host matchContents>
			<Slider value={value} min={min} max={max} onValueChange={onChange} />
		</Host>
	);
}
```

- [ ] **Step 4: Write the segmented control — base, iOS, Android**

`components/native-segmented.tsx` (base / web fallback):

```tsx
import type { NativeSegmentedProps } from "./native-controls-types";

// The native segmented control ships only on iOS and Android (@expo/ui).
export function NativeSegmented(_props: NativeSegmentedProps) {
	return null;
}
```

`components/native-segmented.ios.tsx` (SDK 56 swift-ui `Picker`: `selection` + `Text` children tagged by index, segmented via `pickerStyle` modifier):

```tsx
import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import type { NativeSegmentedProps } from "./native-controls-types";

export function NativeSegmented({
	options,
	selectedIndex,
	onChange,
}: NativeSegmentedProps) {
	return (
		<Host matchContents>
			<Picker
				selection={selectedIndex}
				onSelectionChange={(selection) =>
					onChange(typeof selection === "number" ? selection : Number(selection))
				}
				modifiers={[pickerStyle("segmented")]}
			>
				{options.map((label, index) => (
					<Text key={label} modifiers={[tag(index)]}>
						{label}
					</Text>
				))}
			</Picker>
		</Host>
	);
}
```

`components/native-segmented.android.tsx` (SDK 56 jetpack-compose has no Picker; Material 3 `SingleChoiceSegmentedButtonRow` + `SegmentedButton`):

```tsx
import {
	Host,
	SegmentedButton,
	SingleChoiceSegmentedButtonRow,
	Text,
} from "@expo/ui/jetpack-compose";
import type { NativeSegmentedProps } from "./native-controls-types";

export function NativeSegmented({
	options,
	selectedIndex,
	onChange,
}: NativeSegmentedProps) {
	return (
		<Host matchContents>
			<SingleChoiceSegmentedButtonRow>
				{options.map((label, index) => (
					<SegmentedButton
						key={label}
						selected={index === selectedIndex}
						onClick={() => onChange(index)}
					>
						<SegmentedButton.Label>
							<Text>{label}</Text>
						</SegmentedButton.Label>
					</SegmentedButton>
				))}
			</SingleChoiceSegmentedButtonRow>
		</Host>
	);
}
```

- [ ] **Step 5: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write components/
```

Expected: no type errors. If `tsc` flags an `@expo/ui` prop name, reconcile against the `.d.ts` from Step 1.

- [ ] **Step 6: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/components/native-*.tsx example/components/native-controls-types.ts
git commit -m "feat(example): @expo/ui segmented + slider wrappers"
```

---

## Task 5: Demo screens (migrated from App.tsx)

**Files:**
- Create: `example/screens/task-blank.tsx`
- Create: `example/screens/fill-material.tsx`
- Create: `example/screens/shader-catalog.tsx`

These reuse the existing `FxHostedView` usage verbatim; only the container (no back button — the native header owns back) and colors (theme tokens) change.

- [ ] **Step 1: Write `screens/task-blank.tsx`**

```tsx
import { Text, View } from "react-native";
import { useTheme } from "../components/theme";

export function TaskBlankScreen({ label }: { label: string }) {
	const { palette } = useTheme();
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				gap: 8,
				backgroundColor: palette.background,
			}}
		>
			<Text style={{ color: palette.text, fontSize: 16, fontWeight: "600" }}>
				Not implemented yet
			</Text>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				{label} content lands when this is built.
			</Text>
		</View>
	);
}
```

- [ ] **Step 2: Write `screens/fill-material.tsx`**

```tsx
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { FxHostedView } from "../../packages/src/runtime/FxHostedView";
import { useTheme } from "../components/theme";

export function FillMaterialScreen() {
	const { palette } = useTheme();
	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				fill · gradient (iOS + Android)
			</Text>
			<FxHostedView effect="fill" intensity={0.8} style={styles.box} />

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				fill · gradient, intensity 0.3
			</Text>
			<FxHostedView effect="fill" intensity={0.3} style={styles.box} />

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				material · glass over content (iOS only)
			</Text>
			<View style={[styles.box, { backgroundColor: palette.surface }]}>
				<View style={styles.cardContent}>
					<View style={[styles.colorBlock, { backgroundColor: "#ff6b6b" }]} />
					<View style={[styles.colorBlock, { backgroundColor: "#51cf66" }]} />
					<View style={[styles.colorBlock, { backgroundColor: "#339af0" }]} />
					<Text style={[styles.cardText, { color: palette.text }]}>
						Hello from behind glass
					</Text>
				</View>
				<FxHostedView
					effect="material"
					intensity={0.6}
					style={StyleSheet.absoluteFill}
				/>
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				none · empty (no effect prop)
			</Text>
			<FxHostedView
				style={[styles.box, { backgroundColor: palette.surface }]}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	box: { width: 200, height: 150 },
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
		fontSize: 14,
		fontWeight: "600",
		width: "100%",
		textAlign: "center",
	},
});
```

- [ ] **Step 3: Write `screens/shader-catalog.tsx` (intensity → NativeSlider)**

```tsx
import { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { FxHostedView } from "../../packages/src/runtime/FxHostedView";
import { NativeSlider } from "../components/native-slider";
import { useTheme } from "../components/theme";

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

export function ShaderCatalogScreen() {
	const { palette } = useTheme();
	const [shaderId, setShaderId] = useState<string>("fractal-clouds");
	const [intensity, setIntensity] = useState(0.8);

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<View style={styles.grid}>
				{SHADER_IDS.map((id) => {
					const active = shaderId === id;
					return (
						<TouchableOpacity
							key={id}
							onPress={() => setShaderId(id)}
							style={[
								styles.chip,
								{
									backgroundColor: active
										? palette.surfaceActive
										: palette.surface,
									borderColor: active ? palette.accent : palette.surfaceBorder,
								},
							]}
						>
							<Text
								style={{
									color: active ? palette.accent : palette.textMuted,
									fontSize: 13,
								}}
							>
								{id}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<Text style={{ color: palette.textMuted, fontSize: 13 }}>
				{shaderId} · intensity {intensity.toFixed(2)}
			</Text>

			<FxHostedView effect={shaderId} intensity={intensity} style={styles.box} />

			<NativeSlider value={intensity} min={0} max={1} onChange={setIntensity} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
	},
	box: { width: "100%", height: 200 },
});
```

- [ ] **Step 4: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write screens/
```

- [ ] **Step 5: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/screens/
git commit -m "feat(example): themed demo screens (fill/material, shaders, blank)"
```

---

## Task 6: Root layout — ThemeProvider + native tabs

**Files:**
- Create: `example/app/_layout.tsx`

- [ ] **Step 1: Write `app/_layout.tsx`**

Use the native-tabs import path confirmed in Task 1 Step 2 (default `expo-router/unstable-native-tabs`). If the installed `@expo/ui`/native-tabs in SDK 56 exposes icons as standalone `Icon`/`Label` imports (SDK-54 style) instead of `NativeTabs.Trigger.Icon`, switch to that form per the `.d.ts`.

```tsx
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { ThemeProvider } from "../components/theme";

export default function RootLayout() {
	return (
		<ThemeProvider>
			<NativeTabs>
				<NativeTabs.Trigger name="(tasks)">
					<NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
					<NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="comps">
					<NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="widgets" />
					<NativeTabs.Trigger.Label>Comps</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="settings">
					<NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
					<NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
			</NativeTabs>
		</ThemeProvider>
	);
}
```

- [ ] **Step 2: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write app/_layout.tsx
```

- [ ] **Step 3: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/app/_layout.tsx
git commit -m "feat(example): root layout with native tabs + theme provider"
```

---

## Task 7: Tasks tab (list + detail)

**Files:**
- Create: `example/app/(tasks)/_layout.tsx`
- Create: `example/app/(tasks)/index.tsx`
- Create: `example/app/(tasks)/[taskId].tsx`

- [ ] **Step 1: Write `app/(tasks)/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function TasksLayout() {
	return (
		<Stack screenOptions={{ headerLargeTitle: true }}>
			<Stack.Screen name="index" options={{ title: "Tasks" }} />
			<Stack.Screen name="[taskId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
```

- [ ] **Step 2: Write `app/(tasks)/index.tsx`**

```tsx
import { Link } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../components/theme";
import { type DeviceTask, type TaskStatus, TASKS } from "../../data/tasks";

export default function TasksScreen() {
	const { palette } = useTheme();

	const badgeBg: Record<TaskStatus, string> = {
		verified: palette.badgeVerifiedBg,
		"in-progress": palette.badgeProgressBg,
		todo: palette.badgeTodoBg,
	};
	const badgeFg: Record<TaskStatus, string> = {
		verified: palette.badgeOnColor,
		"in-progress": palette.badgeOnColor,
		todo: palette.badgeTodoText,
	};

	return (
		<FlatList
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 12 }}
			data={TASKS}
			keyExtractor={(task) => task.id}
			renderItem={({ item }: { item: DeviceTask }) => (
				<Link href={`/${item.id}`} asChild>
					<TouchableOpacity
						style={{
							backgroundColor: palette.surface,
							borderRadius: 12,
							borderWidth: 1,
							borderColor: palette.surfaceBorder,
							padding: 14,
							gap: 4,
						}}
					>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<Text
								style={{
									color: palette.accent,
									fontSize: 15,
									fontWeight: "700",
								}}
							>
								{item.id}
							</Text>
							<Text
								style={{
									fontSize: 11,
									fontWeight: "700",
									paddingHorizontal: 8,
									paddingVertical: 2,
									borderRadius: 6,
									overflow: "hidden",
									color: badgeFg[item.status],
									backgroundColor: badgeBg[item.status],
								}}
							>
								{item.status}
							</Text>
						</View>
						<Text
							style={{ color: palette.text, fontSize: 15, fontWeight: "600" }}
						>
							{item.title}
						</Text>
						<Text style={{ color: palette.textMuted, fontSize: 12 }}>
							{item.platform}
						</Text>
						<Text style={{ color: palette.textFaint, fontSize: 12 }}>
							{item.what}
						</Text>
					</TouchableOpacity>
				</Link>
			)}
		/>
	);
}
```

- [ ] **Step 3: Write `app/(tasks)/[taskId].tsx`**

```tsx
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
```

- [ ] **Step 4: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write "app/(tasks)/"
```

- [ ] **Step 5: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add "example/app/(tasks)/"
git commit -m "feat(example): tasks tab list + detail routes"
```

---

## Task 8: Comps tab and Settings tab

**Files:**
- Create: `example/app/comps/_layout.tsx`
- Create: `example/app/comps/index.tsx`
- Create: `example/app/comps/[compId].tsx`
- Create: `example/app/settings/_layout.tsx`
- Create: `example/app/settings/index.tsx`

- [ ] **Step 1: Write `app/comps/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function CompsLayout() {
	return (
		<Stack screenOptions={{ headerLargeTitle: true }}>
			<Stack.Screen name="index" options={{ title: "Comps" }} />
			<Stack.Screen name="[compId]" options={{ headerLargeTitle: false }} />
		</Stack>
	);
}
```

- [ ] **Step 2: Write `app/comps/index.tsx`**

```tsx
import { Link } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../components/theme";
import { type Comp, COMPS } from "../../data/comps";

export default function CompsScreen() {
	const { palette } = useTheme();

	return (
		<FlatList
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 12 }}
			data={COMPS}
			keyExtractor={(comp) => comp.id}
			renderItem={({ item }: { item: Comp }) => {
				const ready = item.status === "ready";
				return (
					<Link href={`/comps/${item.id}`} asChild>
						<TouchableOpacity
							style={{
								backgroundColor: palette.surface,
								borderRadius: 12,
								borderWidth: 1,
								borderColor: palette.surfaceBorder,
								padding: 14,
								gap: 4,
							}}
						>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<Text
									style={{
										color: palette.text,
										fontSize: 15,
										fontWeight: "600",
									}}
								>
									{item.title}
								</Text>
								<Text
									style={{
										fontSize: 11,
										fontWeight: "700",
										paddingHorizontal: 8,
										paddingVertical: 2,
										borderRadius: 6,
										overflow: "hidden",
										color: ready ? palette.badgeOnColor : palette.badgeTodoText,
										backgroundColor: ready
											? palette.badgeVerifiedBg
											: palette.badgeTodoBg,
									}}
								>
									{item.status}
								</Text>
							</View>
							<Text style={{ color: palette.textMuted, fontSize: 12 }}>
								{item.subtitle}
							</Text>
						</TouchableOpacity>
					</Link>
				);
			}}
		/>
	);
}
```

- [ ] **Step 3: Write `app/comps/[compId].tsx`**

```tsx
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
```

- [ ] **Step 4: Write `app/settings/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function SettingsLayout() {
	return (
		<Stack screenOptions={{ headerLargeTitle: true }}>
			<Stack.Screen name="index" options={{ title: "Settings" }} />
		</Stack>
	);
}
```

- [ ] **Step 5: Write `app/settings/index.tsx`**

```tsx
import Constants from "expo-constants";
import { ScrollView, Text, View } from "react-native";
import { NativeSegmented } from "../../components/native-segmented";
import { type ThemeOverride, useTheme } from "../../components/theme";

const OVERRIDES: ThemeOverride[] = ["system", "light", "dark"];
const LABELS = ["System", "Light", "Dark"];

export default function SettingsScreen() {
	const { palette, override, setOverride, scheme } = useTheme();
	const selectedIndex = Math.max(0, OVERRIDES.indexOf(override));

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: palette.background }}
			contentContainerStyle={{ padding: 16, gap: 24 }}
		>
			<View style={{ gap: 8 }}>
				<Text style={{ color: palette.textMuted, fontSize: 13 }}>
					Appearance
				</Text>
				<NativeSegmented
					options={LABELS}
					selectedIndex={selectedIndex}
					onChange={(index) => setOverride(OVERRIDES[index])}
				/>
				<Text style={{ color: palette.textFaint, fontSize: 12 }}>
					Resolved scheme: {scheme}
				</Text>
			</View>

			<View style={{ gap: 4 }}>
				<Text style={{ color: palette.textMuted, fontSize: 13 }}>Build</Text>
				<Text selectable style={{ color: palette.text, fontSize: 14 }}>
					{Constants.expoConfig?.name} v{Constants.expoConfig?.version}
				</Text>
				<Text selectable style={{ color: palette.textFaint, fontSize: 12 }}>
					Expo SDK {Constants.expoConfig?.sdkVersion ?? "—"}
				</Text>
			</View>
		</ScrollView>
	);
}
```

- [ ] **Step 6: Typecheck + format**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write app/comps/ app/settings/
```

- [ ] **Step 7: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git add example/app/comps/ example/app/settings/
git commit -m "feat(example): comps catalog + settings (theme override) tabs"
```

---

## Task 9: Remove the legacy entry

**Files:**
- Delete: `example/App.tsx`
- Delete: `example/index.ts`

- [ ] **Step 1: Delete the old entry files**

```sh
cd /Users/duyanhvu/works/react-native-fx
git rm example/App.tsx example/index.ts
```

- [ ] **Step 2: Typecheck (whole app) + format pass**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check --write .
```

Expected: no type errors; no dangling imports of `App`/`FxHostedView` from the old paths.

- [ ] **Step 3: Commit**

```sh
cd /Users/duyanhvu/works/react-native-fx
git commit -m "refactor(example): drop hand-rolled App entry for expo-router"
```

---

## Task 10: Native build + on-device verification

Effects do not run headless; this task proves the app actually renders. No code changes unless a defect is found.

- [ ] **Step 1: Clean prebuild + run iOS**

```sh
cd example && bunx expo run:ios
```

Expected: app builds and launches into the **Tasks** tab with a native large-title header and a native tab bar (Tasks / Comps / Settings).

- [ ] **Step 2: iOS verification checklist**

Verify on the iOS simulator/device and capture evidence per `guides/Device Verification Guide.md`:
- Native tab bar shows three tabs with SF Symbol icons; large-title headers per tab.
- Tapping a task pushes a native-header detail with a working native back swipe/button.
- U3-001 renders fill (×2 intensities) + iOS glass material over content.
- Comps → Shaders renders shaders; the **native slider** drives intensity live.
- Settings segmented control switches System/Light/Dark; **light/dark re-themes the native header, tab bar, and screen content**; "Resolved scheme" updates.
- Toggling the simulator appearance (System mode) re-themes everything.

- [ ] **Step 3: Run Android**

```sh
cd example && bunx expo run:android
```

Expected: app builds and launches; Material 3 bottom tab bar with `md` icons; large-title-equivalent headers.

- [ ] **Step 4: Android verification checklist**

- Three tabs with Material icons; headers per tab.
- Task/Comps detail navigation with native back.
- Fill renders (material/glass is iOS-only — fill still shows on Android).
- Shaders render; native Compose slider drives intensity.
- Settings segmented control switches appearance; light/dark re-themes chrome + content.

- [ ] **Step 5: Final checks green**

```sh
cd example && bunx tsc --noEmit && bunx @biomejs/biome check .
```

Expected: typecheck clean, Biome reports no issues.

- [ ] **Step 6: Record verification in the PR/test plan**

Note the device/simulator used and attach screenshots (light + dark, each tab) per the Contributing Guide's Test plan section.

---

## Notes / risks

- **Native-tabs import path** (`expo-router/unstable-native-tabs`) and **`NativeTabs.Trigger.Icon` vs standalone `Icon`** are verified against the installed package in Task 1 Step 2 / Task 6 Step 1 — SDK 56 may differ from the SDK-55 skill.
- **`@expo/ui` prop names** are verified against the installed `.d.ts` in Task 4 Step 1; the agnostic wrapper interface absorbs any drift.
- **Web is out of scope** — native tabs and `@expo/ui` are device-only; the base wrapper files render `null` on web so bundling/tsc still resolve.
- **Singleton duplication** under the bun monorepo is guarded by the metro `extraNodeModules`/`blockList` in Task 1 Step 5; a defect here surfaces as a redbox about duplicate React/Expo registries and is fixed by adding the offending copy to `blockList`.
```
