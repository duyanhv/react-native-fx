// The registry pushes the current platform's JSON to a native module and de-dupes / rejects
// registrations in pure JS. The native module and Platform.OS are mocked so the guards,
// idempotence, and Android-only native-push logic can be exercised headlessly.

const mockRegisterSymbolNative = jest.fn();
const mockPlatform = { OS: 'android' as 'ios' | 'android' | 'web' };

jest.mock('expo', () => ({
  requireNativeModule: () => ({ registerSymbol: mockRegisterSymbolNative }),
}));

jest.mock('react-native', () => ({
  get Platform() {
    return mockPlatform;
  },
}));

// Re-imported fresh per test so the module-scoped registry Map starts empty.
function loadRegistry() {
  return require('../effects/symbolRegistry');
}

const LOTTIE_SOURCE = { v: '5.0', layers: [] };
const SPEC = { name: 'heart.fill', android: { type: 'lottie' as const, source: LOTTIE_SOURCE } };

describe('registerSymbol()', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    mockRegisterSymbolNative.mockClear();
    mockPlatform.OS = 'android';
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('registers a symbol and pushes the JSON to native on Android', () => {
    const { registerSymbol, isRegisteredSymbol } = loadRegistry();
    registerSymbol(SPEC);

    expect(isRegisteredSymbol('heart.fill')).toBe(true);
    expect(mockRegisterSymbolNative).toHaveBeenCalledWith(
      'heart.fill',
      JSON.stringify(LOTTIE_SOURCE)
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not push to native on iOS (registration is a no-op at the native level)', () => {
    mockPlatform.OS = 'ios';
    const { registerSymbol, isRegisteredSymbol } = loadRegistry();
    registerSymbol(SPEC);

    expect(isRegisteredSymbol('heart.fill')).toBe(true);
    expect(mockRegisterSymbolNative).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects a registration with an empty name', () => {
    const { registerSymbol, isRegisteredSymbol } = loadRegistry();
    registerSymbol({ name: '', android: { type: 'lottie', source: LOTTIE_SOURCE } });

    expect(isRegisteredSymbol('')).toBe(false);
    expect(mockRegisterSymbolNative).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('rejects a registration with no android source', () => {
    const { registerSymbol, isRegisteredSymbol } = loadRegistry();
    // Cast to bypass TypeScript type guard for the runtime test
    registerSymbol({ name: 'x', android: { type: 'lottie', source: null as unknown as object } });

    expect(isRegisteredSymbol('x')).toBe(false);
    expect(mockRegisterSymbolNative).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is an idempotent no-op when the same source is re-registered', () => {
    const { registerSymbol } = loadRegistry();
    registerSymbol(SPEC);
    registerSymbol(SPEC);

    expect(mockRegisterSymbolNative).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('replaces the entry and re-pushes when a name is re-registered with new source', () => {
    const { registerSymbol } = loadRegistry();
    const newSource = { v: '5.0', layers: [{ ty: 4 }] };
    registerSymbol(SPEC);
    registerSymbol({ name: 'heart.fill', android: { type: 'lottie', source: newSource } });

    expect(mockRegisterSymbolNative).toHaveBeenCalledTimes(2);
    expect(mockRegisterSymbolNative).toHaveBeenLastCalledWith(
      'heart.fill',
      JSON.stringify(newSource)
    );
  });

  it('lists registered names in registration order', () => {
    const { registerSymbol, registeredSymbolNames } = loadRegistry();
    registerSymbol(SPEC);
    registerSymbol({ name: 'star', android: { type: 'lottie', source: { v: '5.0', layers: [] } } });

    expect(registeredSymbolNames()).toEqual(['heart.fill', 'star']);
  });

  it('isRegisteredSymbol returns false for an unknown name', () => {
    const { isRegisteredSymbol } = loadRegistry();
    expect(isRegisteredSymbol('unknown')).toBe(false);
  });

  it('registeredSymbolNames returns an empty array when no symbols are registered', () => {
    const { registeredSymbolNames } = loadRegistry();
    expect(registeredSymbolNames()).toEqual([]);
  });
});
