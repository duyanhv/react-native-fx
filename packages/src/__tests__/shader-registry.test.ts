// The registry pushes the current platform's source to a native module and de-dupes / rejects
// registrations in pure JS. The native module and `Platform.OS` are mocked so the collision, pair,
// and re-registration logic can be exercised headlessly; the compile-and-render is device-proven.

const mockRegisterShaderNative = jest.fn();
const mockPlatform = { OS: 'ios' as 'ios' | 'android' | 'web' };

jest.mock('expo', () => ({
  requireNativeModule: () => ({ registerShader: mockRegisterShaderNative }),
}));

jest.mock('react-native', () => ({
  get Platform() {
    return mockPlatform;
  },
}));

// Re-imported fresh per test so the module-scoped registry Map starts empty.
function loadRegistry() {
  return require('../effects/registry');
}

describe('registerShader()', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    mockRegisterShaderNative.mockClear();
    mockPlatform.OS = 'ios';
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('registers a dual-source shader and pushes the ios source to native', () => {
    const { registerShader, isRegisteredShader } = loadRegistry();
    registerShader({ id: 'app-glow', source: { ios: 'MSL', android: 'AGSL' } });

    expect(isRegisteredShader('app-glow')).toBe(true);
    expect(mockRegisterShaderNative).toHaveBeenCalledWith('app-glow', 'MSL');
    expect(warn).not.toHaveBeenCalled();
  });

  it('pushes the android source when running on android', () => {
    mockPlatform.OS = 'android';
    const { registerShader } = loadRegistry();
    registerShader({ id: 'app-glow', source: { ios: 'MSL', android: 'AGSL' } });

    expect(mockRegisterShaderNative).toHaveBeenCalledWith('app-glow', 'AGSL');
  });

  it('pushes a null source for the platform that has none (the pair rule)', () => {
    mockPlatform.OS = 'android';
    const { registerShader } = loadRegistry();
    registerShader({ id: 'ios-only', source: { ios: 'MSL' } });

    expect(mockRegisterShaderNative).toHaveBeenCalledWith('ios-only', null);
  });

  it('rejects a collision with a curated id and lets the curated id win', () => {
    const { registerShader, isRegisteredShader } = loadRegistry();
    registerShader({ id: 'aurora', source: { ios: 'MSL', android: 'AGSL' } });

    expect(isRegisteredShader('aurora')).toBe(false);
    expect(mockRegisterShaderNative).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('rejects a registration with neither platform source', () => {
    const { registerShader, isRegisteredShader } = loadRegistry();
    registerShader({ id: 'empty', source: {} });

    expect(isRegisteredShader('empty')).toBe(false);
    expect(mockRegisterShaderNative).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is an idempotent no-op when the same source is re-registered', () => {
    const { registerShader } = loadRegistry();
    registerShader({ id: 'app-glow', source: { ios: 'MSL', android: 'AGSL' } });
    registerShader({ id: 'app-glow', source: { ios: 'MSL', android: 'AGSL' } });

    expect(mockRegisterShaderNative).toHaveBeenCalledTimes(1);
  });

  it('replaces the entry and re-pushes when an id is re-registered with new source', () => {
    const { registerShader } = loadRegistry();
    registerShader({ id: 'app-glow', source: { ios: 'MSL-v1', android: 'AGSL' } });
    registerShader({ id: 'app-glow', source: { ios: 'MSL-v2', android: 'AGSL' } });

    expect(mockRegisterShaderNative).toHaveBeenCalledTimes(2);
    expect(mockRegisterShaderNative).toHaveBeenLastCalledWith('app-glow', 'MSL-v2');
  });

  it('lists registered ids in registration order', () => {
    const { registerShader, registeredShaderIds } = loadRegistry();
    registerShader({ id: 'first', source: { ios: 'a' } });
    registerShader({ id: 'second', source: { android: 'b' } });

    expect(registeredShaderIds()).toEqual(['first', 'second']);
  });
});
