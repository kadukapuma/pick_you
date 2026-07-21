import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#159A5B";
const DARK_GREEN = "#0B3D2E";
const COLLAPSED_HEIGHT = 190;
const EXPANDED_HEIGHT = Math.min(Dimensions.get("window").height * 0.58, 480);

type Props = {
  bottomInset: number;
  isOnTrip: boolean;
  title: string;
  subtitle: string;
  destination: string;
  durationText: string;
  distanceText: string;
  stale?: boolean;
  connected?: boolean;
  onContact: () => void;
  onSafety: () => void;
  onDriver: () => void;
  onDetails: () => void;
};

export default function LiveMapBottomSheet({
  bottomInset, isOnTrip, title, subtitle, destination, durationText, distanceText,
  stale, connected, onContact, onSafety, onDriver, onDetails,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const height = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const gestureStart = useRef(COLLAPSED_HEIGHT);

  const setSheetExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    Animated.spring(height, {
      toValue: next ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
      damping: 22, stiffness: 170, useNativeDriver: false,
    }).start();
  }, [height]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => height.stopAnimation((value) => { gestureStart.current = value; }),
    onPanResponderMove: (_, gesture) => {
      height.setValue(Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, gestureStart.current - gesture.dy)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -40 || gesture.vy < -0.35) setSheetExpanded(true);
      else if (gesture.dy > 40 || gesture.vy > 0.35) setSheetExpanded(false);
      else setSheetExpanded(gestureStart.current > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2);
    },
    onPanResponderTerminate: () => setSheetExpanded(false),
  })).current;

  const liveText = stale
    ? "Reconnecting to live location"
    : connected ? "Live location connected" : "Using backup location updates";

  return (
    <Animated.View style={[styles.sheet, { height, paddingBottom: Math.max(bottomInset, 10) + 8 }]}>
      <View {...panResponder.panHandlers} style={styles.dragArea}>
        <View style={styles.handle} />
        <TouchableOpacity activeOpacity={0.85} onPress={() => setSheetExpanded(!expanded)} style={styles.hint}>
          <Ionicons name={expanded ? "chevron-down" : "chevron-up"} size={15} color={GREEN} />
          <Text style={styles.hintText}>{expanded ? "Show less" : "Swipe up for trip details"}</Text>
        </TouchableOpacity>
      </View>

      <View {...panResponder.panHandlers} style={styles.summary}>
        <View style={styles.icon}>
          <Ionicons name={isOnTrip ? "navigate" : "car-sport"} size={23} color={GREEN} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.eyebrow}>{isOnTrip ? "NEXT DESTINATION" : "RIDE UPDATE"}</Text>
          <Text style={styles.title} numberOfLines={1}>{isOnTrip ? destination : title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isOnTrip ? `${durationText} · ${distanceText}` : subtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={onContact} style={styles.contact} activeOpacity={0.82}>
          <Ionicons name="call" size={18} color={DARK_GREEN} />
        </TouchableOpacity>
      </View>

      <View style={[styles.liveRow, stale && styles.liveRowStale]}>
        <View style={[styles.liveDot, stale && styles.liveDotStale]} />
        <Text style={styles.liveText} numberOfLines={1}>{liveText}</Text>
      </View>

      {expanded && (
        <View style={styles.details}>
          <View style={styles.routeCard}>
            <View style={styles.routeIcon}><Ionicons name="location" size={18} color={GREEN} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>{isOnTrip ? "Destination" : "Current ride"}</Text>
              <Text style={styles.routeValue} numberOfLines={2}>{isOnTrip ? destination : subtitle}</Text>
            </View>
            {isOnTrip && (
              <View style={styles.routeEstimate}>
                <Text style={styles.routeTime}>{durationText}</Text>
                <Text style={styles.routeDistance}>{distanceText}</Text>
              </View>
            )}
          </View>
          <View style={styles.actions}>
            <Action icon="shield-checkmark-outline" label="Safety" onPress={onSafety} danger />
            <Action icon="person-circle-outline" label="Driver" onPress={onDriver} />
            <Action icon="receipt-outline" label="Details" onPress={onDetails} primary />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function Action({ icon, label, onPress, danger, primary }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; primary?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}
      style={[styles.action, danger && styles.actionDanger, primary && styles.actionPrimary]}>
      <Ionicons name={icon} size={18} color={primary ? "#FFF" : danger ? "#DC2626" : GREEN} />
      <Text style={[styles.actionText, danger && styles.actionTextDanger, primary && styles.actionTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 14, overflow: "hidden" },
  dragArea: { alignItems: "center", paddingTop: 9, paddingBottom: 5 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#D7E2DE" },
  hint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  hintText: { color: GREEN, fontSize: 11, fontWeight: "800" },
  summary: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 64 },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#EAF8F1", alignItems: "center", justifyContent: "center" },
  summaryText: { flex: 1 },
  eyebrow: { color: GREEN, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "900", marginTop: 2 },
  subtitle: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 2 },
  contact: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E8F8F0", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D8F2E5" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#ECF9F2", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 3 },
  liveRowStale: { backgroundColor: "#FFF8E8" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#20B768" },
  liveDotStale: { backgroundColor: "#F59E0B" },
  liveText: { flex: 1, color: "#64748B", fontSize: 11, fontWeight: "700" },
  details: { paddingTop: 15, borderTopWidth: 1, borderTopColor: "#EEF2F4", marginTop: 12 },
  routeCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F7FAF9", borderRadius: 16, padding: 13 },
  routeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8F8F0", alignItems: "center", justifyContent: "center" },
  routeLabel: { color: "#64748B", fontSize: 11, fontWeight: "800" },
  routeValue: { color: "#0F172A", fontSize: 14, fontWeight: "900", marginTop: 2 },
  routeEstimate: { alignItems: "flex-end", marginLeft: 8 },
  routeTime: { color: GREEN, fontSize: 15, fontWeight: "900" },
  routeDistance: { color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  action: { flex: 1, height: 50, borderRadius: 16, backgroundColor: "#EAF8F1", borderWidth: 1, borderColor: "#D8F2E5", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  actionDanger: { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" },
  actionPrimary: { backgroundColor: DARK_GREEN, borderColor: DARK_GREEN },
  actionText: { color: DARK_GREEN, fontWeight: "900", fontSize: 13 },
  actionTextDanger: { color: "#DC2626" },
  actionTextPrimary: { color: "#FFF" },
});
