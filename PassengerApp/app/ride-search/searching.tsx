import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SearchingScreen() {
  return (
    <View style={styles.container}>
      {/* Header with back disabled */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="#fff" style={{ opacity: 0 }} />
        <Text style={styles.title}>Finding a driver…</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Central progress */}
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.message}>Searching for nearby drivers, please wait.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // dark slate background for premium feel
  },
  header: {
    marginTop: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F4FBFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: "#CBD5E1",
    textAlign: "center",
  },
});
