import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import { CURATED_SHADER_IDS } from "../../packages/src/effects/catalog";

/**
 * iOS simulator smoke harness for the curated shader catalog.
 *
 * Builds/installs/launches are the responsibility of the CI job (or the local
 * runner). This script only drives the already-running simulator through
 * agent-device, switches to every catalog id, and asserts the rendered surface
 * is non-blank using pixel variance (not golden-image equality).
 */

const APP_PATH = path.resolve(
	process.env.SMOKE_APP_PATH ??
		"ios/build/Build/Products/Release-iphonesimulator/reactnativefxexample.app",
);
const BUNDLE_ID = process.env.SMOKE_BUNDLE_ID ?? "expo.modules.fx.example";
const DEVICE = process.env.SMOKE_DEVICE ?? "iPhone 17 Pro";
const PLATFORM = "ios";
const SURFACE_TEST_ID = "shader-surface";

// The shader-catalog screen (the U3-006 task tile) sits far down a scrollable task
// list, so a tile press can't reach it without scrolling. Deep-link straight to the
// route instead — Expo Router resolves the `[taskId]` segment. The URL scheme equals
// the bundle id: that is the scheme the committed ios/ prebuild registers in Info.plist.
const DEEP_LINK = process.env.SMOKE_DEEP_LINK ?? `${BUNDLE_ID}://U3-006`;

// A deliberately generous threshold: a flat blank frame has variance ~0; any
// rendering shader exceeds this by orders of magnitude on the CI simulator.
// Tuned empirically on the known-good catalog; GPU differences across runners
// only raise the value, so this constant stays conservative.
const SURFACE_VARIANCE_THRESHOLD = 120;

// How long to wait after a shader switch for the hosted render to settle.
const SWITCH_SETTLE_MS = 800;

const workDir = mkdtempSync(join(tmpdir(), "fx-smoke-"));

function runAgentDevice(args: string[], timeoutMs = 60_000): string {
	const result = spawnSync("agent-device", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		timeout: timeoutMs,
	});

	if (result.error) {
		throw new Error(
			`agent-device ${args.join(" ")} could not spawn: ${result.error.message}`,
		);
	}
	if (result.status !== 0) {
		const stderr = result.stderr?.trim() ?? "";
		throw new Error(
			`agent-device ${args.join(" ")} exited ${result.status}${stderr ? `\n${stderr}` : ""}`,
		);
	}
	return result.stdout.trim();
}

function deviceArgs(): string[] {
	return ["--platform", PLATFORM, "--device", DEVICE];
}

function ensureSimulator(): void {
	console.log(`Booting ${DEVICE}...`);
	runAgentDevice(["boot", ...deviceArgs()]);
}

function installApp(): void {
	console.log(`Installing ${APP_PATH}...`);
	runAgentDevice(["install", BUNDLE_ID, APP_PATH, ...deviceArgs()]);
}

function prepareRunner(): void {
	// On a fresh Apple CI runner the XCTest helper must be built before the first
	// selector query, or that first `wait`/`get` pays the setup cost and can time out.
	// Locally the runner is usually already warm, so this is a cheap no-op there.
	console.log("Preparing the XCTest runner...");
	runAgentDevice(["prepare", "ios-runner", ...deviceArgs()], 300_000);
}

function launchAtCatalog(): void {
	console.log("Launching at the shader catalog via deep link...");
	// A single open boots, relaunches for fresh state, and deep-links to the catalog.
	runAgentDevice(["open", BUNDLE_ID, DEEP_LINK, "--relaunch", ...deviceArgs()]);
	runAgentDevice(["wait", `id="${SURFACE_TEST_ID}"`, "8000", ...deviceArgs()]);
}

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

function getSurfaceRect(): Rect | null {
	try {
		const raw = runAgentDevice([
			"get",
			"attrs",
			`id="${SURFACE_TEST_ID}"`,
			"--json",
			...deviceArgs(),
		]);
		const parsed = JSON.parse(raw);
		const rect = parsed?.data?.node?.rect ?? parsed?.data?.rect ?? parsed?.rect;
		if (
			rect &&
			typeof rect.x === "number" &&
			typeof rect.y === "number" &&
			typeof rect.width === "number" &&
			typeof rect.height === "number"
		) {
			return rect;
		}
	} catch (err) {
		// The rect is mandatory — main() hard-fails on null rather than guessing a crop.
		console.warn("Could not read surface rect:", err);
	}
	return null;
}

function captureScreenshot(): string {
	const path = join(workDir, `shot-${Date.now()}.png`);
	runAgentDevice(["screenshot", path, ...deviceArgs()]);
	return path;
}

function convertToBmp(pngPath: string): string {
	const bmpPath = `${pngPath}.bmp`;
	const result = spawnSync("sips", ["-s", "format", "bmp", pngPath, "--out", bmpPath], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		timeout: 30_000,
	});
	if (result.status !== 0) {
		throw new Error(`sips conversion failed: ${result.stderr ?? ""}`);
	}
	return bmpPath;
}

interface BmpInfo {
	width: number;
	height: number;
	bitsPerPixel: number;
	dataOffset: number;
	// A negative on-disk height means the pixel rows run top-down rather than the
	// classic bottom-up order; sips writes top-down BMPs from simulator screenshots.
	topDown: boolean;
	data: Buffer;
}

function readBmp(path: string): BmpInfo {
	const data = readFileSync(path);
	const dataOffset = data.readUInt32LE(10);
	const width = data.readInt32LE(18);
	const rawHeight = data.readInt32LE(22);
	const bitsPerPixel = data.readUInt16LE(28);
	return {
		width,
		height: Math.abs(rawHeight),
		bitsPerPixel,
		dataOffset,
		topDown: rawHeight < 0,
		data,
	};
}

function computeVariance(bmp: BmpInfo, crop: Rect, scale: number): number {
	const x0 = Math.round(crop.x * scale);
	const y0 = Math.round(crop.y * scale);
	const x1 = Math.min(bmp.width, Math.round((crop.x + crop.width) * scale));
	const y1 = Math.min(bmp.height, Math.round((crop.y + crop.height) * scale));

	const bytesPerPixel = Math.floor(bmp.bitsPerPixel / 8);
	const rowSize = Math.ceil((bmp.width * bmp.bitsPerPixel) / 32) * 4;

	let sum = 0;
	let sumSq = 0;
	let count = 0;

	for (let screenY = y0; screenY < y1; screenY++) {
		const row = bmp.topDown ? screenY : bmp.height - 1 - screenY;
		for (let screenX = x0; screenX < x1; screenX++) {
			const offset = bmp.dataOffset + row * rowSize + screenX * bytesPerPixel;
			const b = bmp.data[offset];
			const g = bmp.data[offset + 1];
			const r = bmp.data[offset + 2];
			const luma = 0.299 * r + 0.587 * g + 0.114 * b;
			sum += luma;
			sumSq += luma * luma;
			count++;
		}
	}

	if (count === 0) return 0;
	const mean = sum / count;
	return sumSq / count - mean * mean;
}

function assertNonBlank(shaderId: string, variance: number): void {
	console.log(`  ${shaderId}: variance = ${variance.toFixed(1)}`);
	if (variance <= SURFACE_VARIANCE_THRESHOLD) {
		throw new Error(
			`Surface appears blank for "${shaderId}" (variance ${variance.toFixed(1)} <= threshold ${SURFACE_VARIANCE_THRESHOLD})`,
		);
	}
}

function main(): void {
	try {
		ensureSimulator();
		installApp();
		prepareRunner();
		launchAtCatalog();

		const rect = getSurfaceRect();
		if (!rect) {
			throw new Error("Could not locate the shader surface region.");
		}

		// The simulator screenshot is in pixels; the accessibility frame is in
		// points. Use the device scale to map one to the other. CI pins the
		// iPhone 17 Pro simulator (scale 3); allow an env override for local
		// runs on a different device.
		const scale = Number(process.env.SMOKE_SCREEN_SCALE ?? 3);

		console.log(
			`Surface region (points): ${JSON.stringify(rect)}, scale = ${scale}`,
		);

		// Switching the shader id is the regression-faithful trigger: U3-006 blanked on
		// any prop-change remount (the child momentarily 0×0), and an intensity change hits
		// the same FxHostedView remount path the switch loop already exercises every id.
		// A separate slider-drag is deliberately omitted — dragging NativeSlider headlessly
		// is flaky, and a flaky smoke lane gets muted, which is worse than the marginal
		// extra coverage.
		console.log("Checking each curated shader id...");
		for (const shaderId of CURATED_SHADER_IDS) {
			runAgentDevice(["press", `label="${shaderId}"`, ...deviceArgs()]);
			runAgentDevice(["wait", String(SWITCH_SETTLE_MS)]);

			const pngPath = captureScreenshot();
			const bmpPath = convertToBmp(pngPath);
			const bmp = readBmp(bmpPath);
			const variance = computeVariance(bmp, rect, scale);
			assertNonBlank(shaderId, variance);

			unlinkSync(pngPath);
			unlinkSync(bmpPath);
		}

		console.log("\nAll catalog ids rendered a non-blank surface.");
		process.exitCode = 0;
	} catch (err) {
		console.error("\nShader catalog smoke test failed:\n", err);
		process.exitCode = 1;
	}
}

main();
