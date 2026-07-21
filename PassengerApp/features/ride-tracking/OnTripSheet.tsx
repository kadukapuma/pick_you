import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  destination: string;
  durationText?: string | null;
  distanceText?: string | null;
  driverName?: string | null;
  plateNumber?: string | null;
  connected?: boolean;
  stale?: boolean;
  onSafety: () => void;
  onDriver: () => void;
  onDetails: () => void;
};

const COLLAPSED_HEIGHT = 178;
const EXPANDED_HEIGHT = 236;

export default function OnTripSheet({
  destination,
  durationText,
  distanceText,
  driverName,
  plateNumber,
  connected,
  stale,
  onSafety,
  onDriver,
  onDetails,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const height = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const gestureStart = useRef(COLLAPSED_HEIGHT);

  const setExpandedState = useCallback((next: boolean) => {
    setExpanded(next);
    Animated.spring(height, {
      toValue: next ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
      damping: 24,
      stiffness: 210,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [height]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          height.stopAnimation((value) => {
            gestureStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          height.setValue(
            Math.max(
              COLLAPSED_HEIGHT,
              Math.min(EXPANDED_HEIGHT, gestureStart.current - gesture.dy),
            ),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -32 || gesture.vy < -0.3) setExpandedState(true);
          else if (gesture.dy > 32 || gesture.vy > 0.3)
            setExpandedState(false);
          else setExpandedState(gestureStart.current > 205);
        },
        onPanResponderTerminate: () => setExpandedState(expanded),
      }),
    [expanded, height, setExpandedState],
  );

  const statusText = stale
    ? "Reconnecting to live vehicle location"
    : connected
      ? "Live driver location connected"
      : "Using backup location updates";

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: Animated.add(height, 8),
          paddingBottom: 8,
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.navigationCircle}>
          <Ionicons name="navigate" size={23} color="#159A5B" />
        </View>
        <View style={styles.destinationBlock}>
          <Text style={styles.eyebrow}>NEXT DESTINATION</Text>
          <Text style={styles.destination} numberOfLines={1}>
            {destination}
          </Text>
        </View>
        <View style={styles.routeMetric}>
          <Text style={styles.duration} numberOfLines={1}>
            {durationText || "Updating"}
          </Text>
          <Text style={styles.distance}>{distanceText || "Live route"}</Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.driverStrip}>
          <View style={styles.syncDotWrap}>
            <View
              style={[
                styles.syncDot,
                { backgroundColor: stale ? "#F59E0B" : "#20B768" },
              ]}
            />
            <Text style={styles.syncText} numberOfLines={1}>
              {statusText}
            </Text>
          </View>
          <Text style={styles.driverMeta} numberOfLines={1}>
            {[driverName, plateNumber].filter(Boolean).join(" · ")}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <SheetAction
          icon="shield-checkmark-outline"
          label="Safety"
          tone="danger"
          onPress={onSafety}
        />
        <SheetAction
          icon="person-circle-outline"
          label="Driver"
          tone="green"
          onPress={onDriver}
        />
        <SheetAction
          icon="receipt-outline"
          label="Details"
          tone="dark"
          onPress={onDetails}
        />
      </View>
    </Animated.View>
  );
}

function SheetAction({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: "danger" | "green" | "dark";
  onPress: () => void;
}) {
  const palette =
    tone === "danger"
      ? { background: "#FEF2F2", border: "#FEE2E2", foreground: "#DC2626" }
      : tone === "green"
        ? { background: "#EAF8F1", border: "#D8F2E5", foreground: "#0B3D2E" }
        : { background: "#0B3D2E", border: "#0B3D2E", foreground: "#FFFFFF" };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.action,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <Ionicons name={icon} size={18} color={palette.foreground} />
      <Text style={[styles.actionText, { color: palette.foreground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    zIndex: 30,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(153,177,169,0.25)",
    elevation: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.17,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -5 },
    overflow: "hidden",
  },
  handleArea: {
    height: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7E2DE",
  },
  summaryRow: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navigationCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#EAF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  destinationBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "#159A5B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.45,
  },
  destination: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  routeMetric: {
    maxWidth: 112,
    alignItems: "flex-end",
  },
  duration: {
    color: "#159A5B",
    fontSize: 17,
    fontWeight: "900",
  },
  distance: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  driverStrip: {
    minHeight: 45,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: "#F7FAF9",
    justifyContent: "center",
  },
  syncDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncText: {
    flex: 1,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  driverMeta: {
    marginTop: 3,
    marginLeft: 14,
    color: "#0B3D2E",
    fontSize: 11,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  action: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
