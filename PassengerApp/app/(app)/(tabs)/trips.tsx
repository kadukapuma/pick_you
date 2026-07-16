import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenTransition from "../../../components/ui/ScreenTransition";
import ActivityTabHeader, { type ActivityTab } from "../../../features/trips/TripHistoryTabs";

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("Ongoing");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" backgroundColor="#F2FBF8" />

      <View style={styles.header}>
        <Text style={styles.title}>Activities</Text>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.84}>
          <Ionicons name="options-outline" size={20} color="#063D31" />
        </TouchableOpacity>
      </View>

      <ScreenTransition style={styles.body}>
        <ActivityTabHeader activeTab={activeTab} onTabChange={setActiveTab} />
      </ScreenTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2FBF8" },
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "900", color: "#18231F" },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
});

