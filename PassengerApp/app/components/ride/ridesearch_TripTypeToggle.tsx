import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TripType = "one-way" | "return-trip";

interface Props {
  tripType: TripType;
  onToggle: (type: TripType) => void;
  slideAnim: Animated.Value;
  pillTranslateX: any;
}

export default function TripTypeToggle({ tripType, onToggle, pillTranslateX }: Props) {
  return (
    <View style={styles.toggleTrack}>
      <Animated.View
        style={[
          styles.togglePill,
          { transform: [{ translateX: pillTranslateX }] },
        ]}
      />
      
      <TouchableOpacity
        style={styles.toggleOption}
        onPress={() => onToggle("one-way")}
      >
        <Ionicons
          name="arrow-forward"
          size={15}
          color={tripType === "one-way" ? "#ffffff" : "#6B9E8E"}
        />
        <Text style={[styles.toggleLabel, tripType === "one-way" && styles.toggleLabelActive]}>
          One way
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleOption}
        onPress={() => onToggle("return-trip")}
      >
        <Ionicons
          name="swap-horizontal"
          size={15}
          color={tripType === "return-trip" ? "#ffffff" : "#6B9E8E"}
        />
        <Text style={[styles.toggleLabel, tripType === "return-trip" && styles.toggleLabelActive]}>
          Return trip
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleTrack: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#D6F2E7",
    borderRadius: 14,
    padding: 4,
    height: 52,
    position: "relative",
    overflow: "hidden",
  },
  togglePill: {
    position: "absolute",
    top: 4,
    left: 4,
    width: (require("react-native").Dimensions.get("window").width - 32) / 2 - 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#1B9E6E",
    shadowColor: "#1B9E6E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    gap: 6,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A7A68",
  },
  toggleLabelActive: {
    color: "#FFFFFF",
  },
});