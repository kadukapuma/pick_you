import { Ionicons } from "@expo/vector-icons";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";

export default function SearchBar({
  compact = false,
  onPress,
}: {
  compact?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 2 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={[styles.container, compact && styles.containerCompact]}>
          <Ionicons name="car-outline" size={22} color="#9CA3AF" />

          <Text style={[styles.text, compact && styles.textCompact]}>
            BOOK A RIDE
          </Text>

          <View style={[styles.button, compact && styles.buttonCompact]}>
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30, // Highly rounded
    borderWidth: 2,
    borderColor: "#0b9e54", // Green border from image
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",

    // Very lightweight native shadow
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  containerCompact: {
    paddingVertical: 5,
    paddingLeft: 14,
  },
  text: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  textCompact: {
    fontSize: 13,
  },
  button: {
    backgroundColor: "#0b9e54",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
});
