import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

// The interactive shader demo is parked while the package is restructured. The
// native surface (FxSurfaceView) and its Metal pixels are intact; the demo
// returns once the public `<Fx>` component that renders them is built.
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>react-native-fx</Text>
        <Text style={styles.subtitle}>Scaffold ready · effect demo returns with {'<Fx>'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#9aa0a6', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
