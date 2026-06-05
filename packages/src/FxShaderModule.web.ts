import { registerWebModule, NativeModule } from 'expo';

// FxShaderModule is not available on the web platform.
class FxShaderModule extends NativeModule<{}> {}

export default registerWebModule(FxShaderModule, 'FxShaderModule');
