import { NativeModule, requireNativeModule } from 'expo';

declare class FxShaderModule extends NativeModule<{}> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<FxShaderModule>('FxShader');
