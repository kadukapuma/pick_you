import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ActivityTabHeader from "../../../components/activities/ActivityTabHeader";

export default function addplace() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F0FAF5" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingTop: 48,
          paddingHorizontal: 20,
          paddingBottom: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Title Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#0D4F3C",
            }}
          >
            Add Place
          </Text>

          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#D6F2E7",
              borderRadius: 16,
            }}
          >
            <Ionicons name="options-outline" size={18} color="#1B9E6E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab View - This handles everything automatically */}
      <ActivityTabHeader
        activeTab="Ongoing"
        onTabChange={(tab) => console.log(tab)}
      />
    </View>
  );
}
