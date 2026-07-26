import { View, Text, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  value: boolean;
  onToggle: (value: boolean) => void;
}

export default function BookForFriendToggle({ value, onToggle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Ionicons name="people" size={20} color="#1B9E6E" />
        <Text style={styles.text}>Book for a friend</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#D6F2E7", true: "#1B9E6E" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0D4F3C",
  },
});
