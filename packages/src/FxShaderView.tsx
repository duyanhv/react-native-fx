import { requireNativeView } from 'expo';
import * as React from 'react';

import { NativeShaderViewProps, ShaderViewProps } from './FxShader.types';

const NativeView: React.ComponentType<NativeShaderViewProps> = requireNativeView('FxShader');

/**
 * An interactable, Metal-backed shader surface. JS configures it (shader,
 * intensity, interaction); the native side owns the render loop and touch.
 */
export default function ShaderView({ onPress, onPressIn, onPressOut, ...rest }: ShaderViewProps) {
  return (
    <NativeView
      shader="fractal-clouds"
      intensity={0.8}
      interactionMode="none"
      {...rest}
      onShaderPress={onPress}
      onShaderPressIn={onPressIn}
      onShaderPressOut={onPressOut}
    />
  );
}
