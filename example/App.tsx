// TODO: U3-001 temporary test screen — remove after device verification.
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { FxHostedView } from '../packages/src/runtime/FxHostedView';

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>U3-001 · hosted effect renderer</Text>

        <Text style={styles.label}>fill · gradient (iOS + Android)</Text>
        <FxHostedView effect="fill" intensity={0.8} style={styles.box} />

        <Text style={styles.label}>fill · gradient, intensity 0.3</Text>
        <FxHostedView effect="fill" intensity={0.3} style={styles.box} />

        <Text style={styles.label}>material · glass (iOS only)</Text>
        <FxHostedView effect="material" intensity={0.6} style={styles.box} />

        <Text style={styles.label}>none · empty (no effect prop)</Text>
        <FxHostedView style={styles.box} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  content: { padding: 16, gap: 16 },
  header: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { color: '#9aa0a6', fontSize: 13, marginTop: 8 },
  box: { width: 200, height: 150, backgroundColor: '#1a1a2e' },
});
