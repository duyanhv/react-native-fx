import { FxSurfaceView } from "react-native-fx";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../components/theme";

export function DragAxisSpikeScreen() {
  const { palette } = useTheme();

  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={[styles.heading, { color: palette.text }]}>
        Horizontal drag axis inside vertical scroller
      </Text>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        Drag horizontally inside the shader to claim the X axis. The vertical
        scroller should still scroll when you drag vertically.
      </Text>
      <View style={styles.surfaceRow}>
        <FxSurfaceView
          shader="dots"
          interactionMode="active"
          dragAxis="horizontal"
          intensity={0.9}
          style={[styles.surface, { backgroundColor: palette.surface }]}
        />
      </View>

      <Text style={[styles.heading, { color: palette.text }]}>
        Vertical drag axis inside horizontal scroller
      </Text>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        Drag vertically inside the shader to claim the Y axis. The horizontal
        scroller should still scroll when you drag horizontally.
      </Text>
      <ScrollView horizontal style={styles.horizontalScroll}>
        <View style={styles.horizontalRow}>
          <View style={[styles.spacerCell, { backgroundColor: palette.surface }]} />
          <View style={styles.surfaceCell}>
            <FxSurfaceView
              shader="dots"
              interactionMode="active"
              dragAxis="vertical"
              intensity={0.9}
              style={[styles.surface, { backgroundColor: palette.surface }]}
            />
          </View>
          <View style={[styles.spacerCell, { backgroundColor: palette.surface }]} />
        </View>
      </ScrollView>

      <Text style={[styles.heading, { color: palette.text }]}>
        Both axes (no scroller yield)
      </Text>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        dragAxis=&quot;both&quot; claims both axes. The shader captures all
        drag input; no scroller scrolling while dragging inside.
      </Text>
      <View style={styles.surfaceRow}>
        <FxSurfaceView
          shader="dots"
          interactionMode="active"
          dragAxis="both"
          intensity={0.9}
          style={[styles.surface, { backgroundColor: palette.surface }]}
        />
      </View>

      <Text style={[styles.heading, { color: palette.text }]}>
        No dragAxis (today&apos;s default — yields all movement)
      </Text>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        When dragAxis is unset, any movement past slop yields to the scroller.
      </Text>
      <View style={styles.surfaceRow}>
        <FxSurfaceView
          shader="dots"
          interactionMode="active"
          intensity={0.9}
          style={[styles.surface, { backgroundColor: palette.surface }]}
        />
      </View>

      <Text style={[styles.heading, { color: palette.text }]}>
        dragAxis inert without active mode
      </Text>
      <Text style={[styles.label, { color: palette.textMuted }]}>
        dragAxis=&quot;horizontal&quot; with interactionMode=&quot;passive&quot; —
        the prop is ignored; the surface yields all movement.
      </Text>
      <View style={styles.surfaceRow}>
        <FxSurfaceView
          shader="dots"
          interactionMode="passive"
          dragAxis="horizontal"
          intensity={0.9}
          style={[styles.surface, { backgroundColor: palette.surface }]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  surfaceRow: {
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  surface: {
    height: 200,
    borderRadius: 16,
  },
  horizontalScroll: {
    marginBottom: 8,
  },
  horizontalRow: {
    flexDirection: "row",
    height: 200,
  },
  surfaceCell: {
    width: 300,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  spacerCell: {
    width: 300,
    height: 200,
    borderRadius: 16,
  },
});
