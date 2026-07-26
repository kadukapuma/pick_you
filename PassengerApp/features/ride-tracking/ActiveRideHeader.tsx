import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  subtitle: string;
  distanceText?: string | null;
  onBack: () => void;
  onCall: () => void;
};

export default function ActiveRideHeader({
  title,
  subtitle,
  distanceText,
  onBack,
  onCall,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.position, { top: Math.max(insets.top, 10) + 8 }]}
    >
      <View style={styles.card}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to trips"
          activeOpacity={0.82}
          onPress={onBack}
          style={styles.roundButton}
        >
          <Ionicons name="arrow-back" size={23} color="#0B3D2E" />
        </TouchableOpacity>

        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Call driver"
          activeOpacity={0.82}
          onPress={onCall}
          style={styles.roundButton}
        >
          <Ionicons name="call" size={20} color="#159A5B" />
        </TouchableOpacity>
      </View>

      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>
          LIVE{distanceText ? ` · ${distanceText}` : " · Updating route"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 30,
  },
  card: {
    minHeight: 70,
    borderRadius: 23,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
    elevation: 9,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF8F1",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  title: {
    color: "#0B3D2E",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
  subtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  liveBadge: {
    alignSelf: "flex-start",
    marginTop: 9,
    marginLeft: 8,
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: "#0B3D2E",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#20B768",
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
