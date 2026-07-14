import { useState } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActivityTabHeader, {
  type ActivityTab,
} from "../../../components/activities/ActivityTabHeader";

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("Ongoing");
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F2F5", paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F2F5" />

      {/* ── Header ─────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#111827",
          }}
        >
          Your activities
        </Text>

        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="options-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── Tab View ───────────────────────────────────── */}
      <ActivityTabHeader activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
}
