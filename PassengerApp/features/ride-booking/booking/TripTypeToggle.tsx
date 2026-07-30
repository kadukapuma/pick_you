import { Ionicons } from "@expo/vector-icons";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
        <Text style={[styles.toggleLabel, tripType === "one-way" && styles.toggleLabelActive]}>
          One Way
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleOption}
        onPress={() => onToggle("return-trip")}
      >
        <Text style={[styles.toggleLabel, tripType === "return-trip" && styles.toggleLabelActive]}>
          Return Trip
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#20B768",
    height: 48,
    position: "relative",
    overflow: "hidden",
  },
  togglePill: {
    position: "absolute",
    top: -1,
    left: -1,
    width: "50%",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#20B768",
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#20B768",
  },
  toggleLabelActive: {
    color: "#FFFFFF",
  },
});
