import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	EdgeGlow,
	Fx,
	FxGroup,
	FxHostedView,
	FxItem,
	FxPresence,
	FxPressable,
	FxReveal,
	FxSurfaceView,
	FxView,
	fx,
	isRegisteredShader,
	isRegisteredSymbol,
	registerShader,
	registeredShaderIds,
	registeredSymbolNames,
	registerSymbol,
	type EffectId,
	type FxRevealTransitionEnd,
	type FxStateChange,
	type FxSurfaceViewRef,
	type FxTransitionEnd,
	type InteractionMode,
	type MaterialConfig,
	type PresencePreset,
	type RegisterShaderSpec,
	type RegisterSymbolSpec,
	type SymbolAnimation,
	type FxScrollTile,
} from "react-native-fx";
import { useTheme } from "../components/theme";

type ChatRole = "assistant" | "user";

type ChatMessage = {
	id: string;
	role: ChatRole;
	text: string;
};

type EventLine = {
	id: number;
	text: string;
};

const CHAT_SHADER_ID = "chat-pulse";
const CHAT_SYMBOL_NAME = "heart";
const CHAT_SYMBOL_ANIMATION: SymbolAnimation = "bounce";
const PRESENCE_PRESET: PresencePreset = "transient";
const CONTROLLED_MODE: InteractionMode = "controlled";
const ACTIVE_MODE: InteractionMode = "active";
const HEADER_EFFECT: EffectId = "aurora";

const GLASS_CONFIG: MaterialConfig = {
	variant: "regular",
	interactive: true,
	tint: "#5b8cff",
	colorScheme: "system",
};

const MESSAGE_MOTION = {
	idle: fx.motion.identity(),
	selected: fx.motion.scale({ to: 1.03 }),
};

const ASSISTANT_PRESENCE_MOTION = {
	enter: fx.motion.edgeIn({ from: "bottom" }),
	exit: fx.motion.edgeOut({ to: "top" }),
};

const CHAT_SCROLL_TILES: FxScrollTile[] = [
	{ effect: "aurora", intensity: 0.85, height: 160 },
	{ effect: "plasma", intensity: 0.75, height: 160 },
	{ effect: "fill", intensity: 0.9, height: 160 },
	{ effect: "dots", intensity: 0.8, height: 160 },
];

const CHAT_SHADER: RegisterShaderSpec = {
	id: CHAT_SHADER_ID,
	source: {
		ios: `
fragment half4 fx_fragment(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  float wave = 0.5 + 0.5 * sin(u.time * 2.1 + uv.x * 9.0 + uv.y * 5.0);
  float3 cold = float3(0.06, 0.12, 0.22);
  float3 hot = float3(0.36, 0.80, 0.74);
  float3 color = mix(cold, hot, wave) * u.intensity;
  return half4(half3(color), 1.0);
}
`,
		android: `
uniform float time;
uniform vec2 resolution;
uniform float intensity;

half4 main(float2 fragCoord) {
  vec2 uv = fragCoord / resolution;
  float wave = 0.5 + 0.5 * sin(time * 2.1 + uv.x * 9.0 + uv.y * 5.0);
  vec3 cold = vec3(0.06, 0.12, 0.22);
  vec3 hot = vec3(0.36, 0.80, 0.74);
  vec3 color = mix(cold, hot, wave) * intensity;
  return half4(color, 1.0);
}
`,
	},
};

const CHAT_SYMBOL: RegisterSymbolSpec = {
	name: CHAT_SYMBOL_NAME,
	android: {
		type: "lottie",
		source: {
			v: "5.9.0",
			fr: 30,
			ip: 0,
			op: 36,
			w: 96,
			h: 96,
			nm: "chat-heart",
			ddd: 0,
			assets: [],
			layers: [
				{
					ind: 1,
					ty: 4,
					nm: "heart",
					ddd: 0,
					sr: 1,
					ao: 0,
					ip: 0,
					op: 36,
					st: 0,
					bm: 0,
					ks: {
						o: { a: 0, k: 100 },
						r: { a: 0, k: 0 },
						p: { a: 0, k: [48, 48, 0] },
						a: { a: 0, k: [0, 0, 0] },
						s: {
							a: 1,
							k: [
								{ t: 0, s: [92, 92, 100] },
								{ t: 12, s: [126, 126, 100] },
								{ t: 36, s: [92, 92, 100] },
							],
						},
					},
					shapes: [
						{
							ty: "gr",
							it: [
								{ ty: "el", s: { a: 0, k: [56, 56] }, p: { a: 0, k: [0, 0] } },
								{ ty: "fl", c: { a: 0, k: [0.22, 0.52, 1, 1] }, o: { a: 0, k: 100 } },
							],
						},
					],
				},
			],
		},
	},
};

registerShader(CHAT_SHADER);
registerSymbol(CHAT_SYMBOL);

const INITIAL_MESSAGES: ChatMessage[] = [
	{
		id: "assistant-1",
		role: "assistant",
		text: "I can wrap your app UI, move it natively, and draw effects around it without JS driving frames.",
	},
	{
		id: "user-1",
		role: "user",
		text: "Show me the whole library surface in one chat screen.",
	},
];

const SUGGESTIONS = ["Summarize", "Rewrite", "Ship checklist"];

export function AllApiChatScreen() {
	const { palette } = useTheme();
	const insets = useSafeAreaInsets();
	const controlledSurfaceRef = useRef<FxSurfaceViewRef>(null);
	const nextEventId = useRef(0);
	const pendingResponse = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [messages, setMessages] = useState(INITIAL_MESSAGES);
	const [draft, setDraft] = useState("Explain the surface in one paragraph");
	const [selectedMessageId, setSelectedMessageId] = useState("assistant-1");
	const [typingVisible, setTypingVisible] = useState(false);
	const [attachmentOpen, setAttachmentOpen] = useState(false);
	const [eventLog, setEventLog] = useState<EventLine[]>([]);
	const [sendCount, setSendCount] = useState(0);
	const [controlledHot, setControlledHot] = useState(false);
	const [surfacePressCount, setSurfacePressCount] = useState(0);
	const composerBottom = insets.bottom + 76;
	const scrollBottom = composerBottom + 156;

	const selectedEffect = useMemo(
		() =>
			fx.effect
				.glow({ intensity: 0.2 })
				.animate({ duration: 220 })
				.defaults({ duration: 320 }),
		[]
	);
	const glassEffect = useMemo(() => fx.effect.glass(GLASS_CONFIG), []);
	const meshEffect = useMemo(() => fx.effect.mesh({ intensity: 0.72 }), []);
	const symbolEffect = useMemo(
		() =>
			fx.effect.symbol({
				name: CHAT_SYMBOL_NAME,
				animation: CHAT_SYMBOL_ANIMATION,
				trigger: "value",
			}),
		[]
	);

	const record = useCallback((text: string) => {
		const id = nextEventId.current++;
		setEventLog((lines) => [{ id, text }, ...lines].slice(0, 8));
	}, []);

	useEffect(() => {
		return () => {
			if (pendingResponse.current) {
				clearTimeout(pendingResponse.current);
			}
		};
	}, []);

	function handlePresenceTransition(event: FxTransitionEnd) {
		record(`presence:${event.phase} finished=${event.finished} interrupted=${event.interrupted}`);
	}

	function handleStateChange(event: FxStateChange) {
		record(`state:${event.state} finished=${event.finished} interrupted=${event.interrupted}`);
	}

	function handleRevealTransition(event: FxRevealTransitionEnd) {
		record(`reveal:${event.phase} finished=${event.finished} interrupted=${event.interrupted}`);
	}

	function handleSend() {
		const text = draft.trim();
		if (!text) {
			return;
		}
		if (pendingResponse.current) {
			clearTimeout(pendingResponse.current);
		}
		const nextSendCount = sendCount + 1;
		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			text,
		};
		setMessages((items) => [...items, userMessage]);
		setDraft("");
		setSendCount(nextSendCount);
		setTypingVisible(true);
		record(`send:${nextSendCount}`);
		pendingResponse.current = setTimeout(() => {
			const assistantMessage: ChatMessage = {
				id: `assistant-${Date.now()}`,
				role: "assistant",
				text: "The response is a normal React tree. fx owns only presentation: effects, motion, press feedback, and the reveal shell.",
			};
			setMessages((items) => [...items, assistantMessage]);
			setSelectedMessageId(assistantMessage.id);
			setTypingVisible(false);
			record("assistant-response");
		}, 650);
	}

	function toggleControlledSurface() {
		const next = !controlledHot;
		setControlledHot(next);
		void controlledSurfaceRef.current?.setUniform("intensity", next ? 1 : 0.45);
		void controlledSurfaceRef.current?.setHighlight(next ? 0.76 : 0.24, next ? 0.68 : 0.32);
		record(next ? "controlled:setHighlight" : "controlled:setUniform");
	}

	function clearControlledSurface() {
		setControlledHot(false);
		void controlledSurfaceRef.current?.setUniform("intensity", null);
		void controlledSurfaceRef.current?.setUniform("pressDepth", null);
		record("controlled:clear");
	}

	const shaderRegistered = isRegisteredShader(CHAT_SHADER_ID);
	const symbolRegistered = isRegisteredSymbol(CHAT_SYMBOL_NAME);
	const runtimeSummary = [
		`shader:${shaderRegistered ? "registered" : "missing"}`,
		`symbol:${symbolRegistered ? "registered" : "missing"}`,
		`shaderIds:${registeredShaderIds().length}`,
		`symbolNames:${registeredSymbolNames().length}`,
	].join("  ");

	return (
		<View style={[styles.root, { backgroundColor: palette.background }]}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={styles.scroll}
				contentContainerStyle={[
					styles.content,
					{ paddingTop: 12, paddingBottom: scrollBottom },
				]}
			>
				<View style={[styles.header, { borderColor: palette.surfaceBorder }]}>
					<Fx effect={HEADER_EFFECT} intensity={0.86} composition="background" />
					<View style={styles.headerShade} pointerEvents="none" />
					<View style={styles.headerCopy}>
						<Text style={styles.headerKicker}>react-native-fx</Text>
						<Text style={styles.headerTitle}>All API chat</Text>
						<Text style={styles.headerText}>
							One conversation surface composed from the shipped public runtime.
						</Text>
					</View>
				</View>

				<View style={styles.thread}>
					{messages.map((message) => {
						const selected = message.id === selectedMessageId;
						const isAssistant = message.role === "assistant";
						return (
							<FxPresence
								key={message.id}
								visible
								preset={PRESENCE_PRESET}
								motion={isAssistant ? ASSISTANT_PRESENCE_MOTION : undefined}
								transition={{ spring: "native" }}
								onTransitionEnd={handlePresenceTransition}
							>
								<View
									style={[
										styles.messageRow,
										isAssistant ? styles.assistantRow : styles.userRow,
									]}
								>
									<FxView
										state={selected ? "selected" : "idle"}
										preset="lift"
										motion={MESSAGE_MOTION}
										transition={{ spring: "native" }}
										effect={selected ? selectedEffect : undefined}
										onStateChange={handleStateChange}
										style={styles.messageMotionHost}
									>
										<FxPressable
											feedback="native"
											onPress={() => setSelectedMessageId(message.id)}
											onLongPress={() => record(`longPress:${message.id}`)}
										>
											<View
												style={[
													styles.messageBubble,
													{
														backgroundColor: isAssistant
															? palette.surface
															: palette.surfaceActive,
														borderColor: selected
															? palette.accent
															: palette.surfaceBorder,
													},
												]}
											>
												{isAssistant && (
													<View style={styles.messageIcon}>
														<Fx effect={symbolEffect} style={styles.messageIconFx} />
													</View>
												)}
												<Text style={[styles.messageText, { color: palette.text }]} selectable>
													{message.text}
												</Text>
											</View>
										</FxPressable>
									</FxView>
								</View>
							</FxPresence>
						);
					})}

					<FxPresence
						visible={typingVisible}
						preset={PRESENCE_PRESET}
						motion={ASSISTANT_PRESENCE_MOTION}
						appear={false}
						onTransitionEnd={handlePresenceTransition}
					>
						<View style={styles.assistantRow}>
							<FxView state="idle" preset="lift" effect={meshEffect} style={styles.typingHost}>
								<View
									style={[
										styles.typingBubble,
										{ backgroundColor: palette.surface, borderColor: palette.surfaceBorder },
									]}
								>
									<Text style={{ color: palette.textMuted }}>Assistant is composing</Text>
									<View style={styles.dotsRow}>
										<Fx effect="dots" style={styles.typingDot} />
										<Fx effect="dots" style={styles.typingDot} />
										<Fx effect="dots" style={styles.typingDot} />
									</View>
								</View>
							</FxView>
						</View>
					</FxPresence>
				</View>

				<FxGroup style={styles.suggestions}>
					{SUGGESTIONS.map((label) => (
						<FxItem key={label}>
							<FxPressable
								feedback="native"
								onPress={() => {
									setDraft(label);
									record(`suggestion:${label}`);
								}}
								onLongPress={() => record(`suggestion-hold:${label}`)}
								style={styles.suggestionItem}
							>
								<View
									style={[
										styles.suggestion,
										{
											backgroundColor: palette.surface,
											borderColor: palette.surfaceBorder,
										},
									]}
								>
									<Text style={[styles.suggestionText, { color: palette.text }]}>{label}</Text>
								</View>
							</FxPressable>
						</FxItem>
					))}
				</FxGroup>

				<View style={[styles.apiPanel, { backgroundColor: palette.surface }]}>
					<Text style={[styles.panelTitle, { color: palette.text }]}>Runtime strip</Text>
					<Text style={[styles.panelCaption, { color: palette.textMuted }]} selectable>
						{runtimeSummary}
					</Text>
					<View style={styles.runtimeGrid}>
						<View style={[styles.runtimeCell, { borderColor: palette.surfaceBorder }]}>
							<Text style={[styles.cellLabel, { color: palette.textMuted }]}>
								interactive effect
							</Text>
							<Fx
								effect="dots"
								interactionMode={ACTIVE_MODE}
								onLoad={(event) => record(`fx-load:${event.nativeEvent.shader}`)}
								onError={(event) =>
									record(`fx-error:${event.nativeEvent.shader}:${event.nativeEvent.reason ?? "native"}`)
								}
								onPress={() => {
									setSurfacePressCount((count) => count + 1);
									record("fx-press");
								}}
								style={styles.inlineFxSurface}
							/>
							<Text style={[styles.panelCaption, { color: palette.textMuted }]}>
								presses: {surfacePressCount}
							</Text>
						</View>

						<View style={[styles.runtimeCell, { borderColor: palette.surfaceBorder }]}>
							<Text style={[styles.cellLabel, { color: palette.textMuted }]}>
								controlled surface
							</Text>
							<FxSurfaceView
								ref={controlledSurfaceRef}
								shader={CHAT_SHADER_ID}
								interactionMode={CONTROLLED_MODE}
								intensity={0.65}
								onFxLoad={(event) => record(`surface-load:${event.nativeEvent.shader}`)}
								onFxError={(event) =>
									record(
										`surface-error:${event.nativeEvent.shader}:${event.nativeEvent.reason ?? "native"}`
									)
								}
								style={styles.inlineFxSurface}
							/>
							<View style={styles.controlRow}>
								<Pressable onPress={toggleControlledSurface} style={styles.textButton}>
									<Text style={[styles.textButtonLabel, { color: palette.accent }]}>Write</Text>
								</Pressable>
								<Pressable onPress={clearControlledSurface} style={styles.textButton}>
									<Text style={[styles.textButtonLabel, { color: palette.textMuted }]}>Clear</Text>
								</Pressable>
							</View>
						</View>
					</View>

					<View style={styles.runtimeGrid}>
						<View style={[styles.runtimeCell, { borderColor: palette.surfaceBorder }]}>
							<Text style={[styles.cellLabel, { color: palette.textMuted }]}>
								hosted view
							</Text>
							<View style={styles.hostedRow}>
								<FxHostedView
									effect="material"
									materialConfig={GLASS_CONFIG}
									style={styles.hostedSwatch}
								/>
								<FxHostedView
									symbolConfig={{
										name: CHAT_SYMBOL_NAME,
										animation: "pulse",
										trigger: "repeat",
									}}
									style={styles.hostedSwatch}
								/>
								<View style={styles.edgeGlowSwatch}>
									<Fx effect={glassEffect} composition="background" />
									<EdgeGlow style={StyleSheet.absoluteFill} intensity={0.24} />
									<Text style={styles.edgeGlowLabel}>EdgeGlow</Text>
								</View>
							</View>
						</View>

						<View style={[styles.runtimeCell, { borderColor: palette.surfaceBorder }]}>
							<Text style={[styles.cellLabel, { color: palette.textMuted }]}>
								content distortion
							</Text>
							<FxSurfaceView
								contentDistortion="ripple"
								intensity={0.8}
								style={styles.distortionSurface}
							>
								<View style={styles.distortionContent}>
									<Text style={styles.distortionText}>Live RN content</Text>
								</View>
							</FxSurfaceView>
						</View>
					</View>

					<View style={[styles.logBox, { borderColor: palette.surfaceBorder }]}>
						<Text style={[styles.cellLabel, { color: palette.textMuted }]}>
							semantic events
						</Text>
						{eventLog.length === 0 ? (
							<Text style={[styles.panelCaption, { color: palette.textFaint }]}>
								No events yet
							</Text>
						) : (
							eventLog.map((line) => (
								<Text key={line.id} style={[styles.panelCaption, { color: palette.text }]}>
									{line.text}
								</Text>
							))
						)}
					</View>
				</View>
			</ScrollView>

			<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
				<FxReveal
					open={attachmentOpen}
					preset="anchoredMorph"
					onTransitionEnd={handleRevealTransition}
					style={[styles.composerAnchor, { bottom: composerBottom }]}
					collapsed={
						<View
							style={[
								styles.composer,
								{
									backgroundColor: palette.surface,
									borderColor: palette.surfaceBorder,
								},
							]}
						>
							<Pressable
								onPress={() => setAttachmentOpen(true)}
								style={[styles.composerIconButton, { backgroundColor: palette.surfaceActive }]}
							>
								<Text style={[styles.composerIconText, { color: palette.text }]}>+</Text>
							</Pressable>
							<TextInput
								value={draft}
								onChangeText={setDraft}
								placeholder="Message fx"
								placeholderTextColor={palette.textFaint}
								multiline
								style={[styles.input, { color: palette.text }]}
							/>
							<FxPressable feedback="native" onPress={handleSend}>
								<View style={[styles.sendButton, { backgroundColor: palette.accent }]}>
									<Fx effect={symbolEffect} style={styles.sendSymbol} />
								</View>
							</FxPressable>
						</View>
					}
					expanded={
						<View style={[styles.attachmentPanel, { backgroundColor: palette.surface }]}>
							<View style={styles.attachmentHeader}>
								<Text style={[styles.panelTitle, { color: palette.text }]}>
									Native source drawer
								</Text>
								<Pressable onPress={() => setAttachmentOpen(false)} style={styles.textButton}>
									<Text style={[styles.textButtonLabel, { color: palette.accent }]}>Close</Text>
								</Pressable>
							</View>
							<Text style={[styles.panelCaption, { color: palette.textMuted }]}>
								Generated tiles scroll with native source mapping.
							</Text>
							<Fx.Scroll
								source={fx.source.scroll({ axis: "horizontal" })}
								tiles={CHAT_SCROLL_TILES}
								style={styles.sourceScroll}
							/>
						</View>
					}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	scroll: { flex: 1 },
	content: { paddingHorizontal: 16, gap: 16 },
	header: {
		height: 156,
		borderRadius: 22,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		padding: 18,
		justifyContent: "flex-end",
	},
	headerShade: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: "rgba(3, 8, 18, 0.42)",
	},
	headerCopy: { gap: 6 },
	headerKicker: { color: "#cce7ff", fontSize: 12, fontWeight: "700" },
	headerTitle: { color: "#ffffff", fontSize: 29, fontWeight: "800" },
	headerText: { color: "#d9eef2", fontSize: 14, maxWidth: 280 },
	thread: { gap: 12 },
	messageRow: { flexDirection: "row" },
	assistantRow: { justifyContent: "flex-start" },
	userRow: { justifyContent: "flex-end" },
	messageMotionHost: { maxWidth: "84%", borderRadius: 18, overflow: "hidden" },
	messageBubble: {
		minHeight: 54,
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		gap: 8,
	},
	messageText: { fontSize: 15, lineHeight: 21 },
	messageIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	messageIconFx: { width: 24, height: 24 },
	typingHost: { width: 220, borderRadius: 18, overflow: "hidden" },
	typingBubble: {
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		gap: 8,
	},
	dotsRow: { flexDirection: "row", gap: 6 },
	typingDot: { width: 18, height: 18, borderRadius: 9, overflow: "hidden" },
	suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
	suggestionItem: { minWidth: 108 },
	suggestion: {
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	suggestionText: { fontSize: 13, fontWeight: "700" },
	apiPanel: { borderRadius: 18, padding: 14, gap: 12 },
	panelTitle: { fontSize: 15, fontWeight: "800" },
	panelCaption: { fontSize: 12, lineHeight: 17 },
	runtimeGrid: { flexDirection: "row", gap: 10 },
	runtimeCell: {
		flex: 1,
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 10,
		gap: 8,
		minHeight: 156,
	},
	cellLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
	inlineFxSurface: { height: 86, borderRadius: 12, overflow: "hidden" },
	controlRow: { flexDirection: "row", gap: 8 },
	textButton: { paddingVertical: 6, paddingHorizontal: 4 },
	textButtonLabel: { fontSize: 13, fontWeight: "700" },
	hostedRow: { flexDirection: "row", gap: 8 },
	hostedSwatch: {
		flex: 1,
		height: 86,
		borderRadius: 12,
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	edgeGlowSwatch: {
		flex: 1,
		height: 86,
		borderRadius: 12,
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#08111f",
	},
	edgeGlowLabel: { color: "#d9eef2", fontSize: 12, fontWeight: "800" },
	distortionSurface: { height: 86, borderRadius: 12, overflow: "hidden" },
	distortionContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#182033",
	},
	distortionText: { color: "#ffffff", fontWeight: "800" },
	logBox: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 3 },
	composerAnchor: { position: "absolute", left: 12, right: 12 },
	composer: {
		minHeight: 62,
		borderRadius: 24,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 8,
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
	},
	composerIconButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
	},
	composerIconText: { fontSize: 25, lineHeight: 30, fontWeight: "500" },
	input: { flex: 1, maxHeight: 92, minHeight: 42, paddingVertical: 10, fontSize: 15 },
	sendButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	sendSymbol: { width: 28, height: 28 },
	attachmentPanel: { flex: 1, padding: 16, gap: 10 },
	attachmentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	sourceScroll: { height: 190 },
});
