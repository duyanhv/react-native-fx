import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text } from 'react-native';
import { ShaderView, type ShaderId } from 'react-native-fx';

const SHADERS: ShaderId[] = ['dots', 'fractal-clouds', 'ink-smoke', 'liquid-chrome', 'loop'];

export default function App() {
  const [index, setIndex] = useState(0);
  const shader = SHADERS[index];

  return (
    <SafeAreaView style={styles.container}>
      <ShaderView shader={shader} intensity={1} interactionMode="active" style={styles.shader} />
      <Pressable style={styles.bar} onPress={() => setIndex((i) => (i + 1) % SHADERS.length)}>
        <Text style={styles.label}>
          {index + 1}/{SHADERS.length}   {shader}   ·   tap to change
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  shader: { flex: 1 },
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  label: { color: '#fff', fontSize: 15, textAlign: 'center' },
});
