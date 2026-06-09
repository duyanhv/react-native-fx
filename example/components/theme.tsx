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
		Appearance.setColorScheme(next === "system" ? "unspecified" : next);
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
