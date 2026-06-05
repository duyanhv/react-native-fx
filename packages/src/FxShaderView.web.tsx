import { ShaderViewProps } from './FxShader.types';

// ShaderView is native-only (Metal). It renders nothing on the web.
export default function ShaderView(_props: ShaderViewProps) {
  return null;
}
