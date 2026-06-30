import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  pickupText: string;
  dropText: string;
  onPickupPress: () => void;
  onDropPress: () => void;
  onSwapPress: () => void;
}

export default function LocationInputHeader({
  pickupText,
  dropText,
  onPickupPress,
  onDropPress,
  onSwapPress,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {/* Pickup */}
        <TouchableOpacity style={styles.inputRow} onPress={onPickupPress}>
          <View style={[styles.dot, styles.pickupDot]} />
          <Text style={styles.inputText} numberOfLines={1}>
            {pickupText}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Drop */}
        <TouchableOpacity style={styles.inputRow} onPress={onDropPress}>
          <View style={[styles.dot, styles.dropDot]} />
          <Text
            style={[styles.inputText, !dropText && styles.placeholder]}
            numberOfLines={1}
          >
            {dropText || "Where are you going?"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.swapButton} onPress={onSwapPress}>
        <Ionicons name="swap-vertical" size={20} color="#1B9E6E" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 8,
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  inputContainer: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  pickupDot: {
    backgroundColor: "#1B9E6E",
  },
  dropDot: {
    backgroundColor: "#FF6B6B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0FAF5",
    marginLeft: 18,
  },
  inputText: {
    fontSize: 14,
    color: "#0D4F3C",
    flex: 1,
  },
  placeholder: {
    color: "#6B9E8E",
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FAF5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
