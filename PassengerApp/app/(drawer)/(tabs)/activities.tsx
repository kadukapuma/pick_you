import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ActivityTabHeader from "../../../components/activities/ActivityTabHeader";

export default function ActivitiesScreen() {
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
            Your Activities
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

        {/* Stats Cards */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#D6F2E7",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "500", color: "#6B9E8E" }}>
              Total Rides
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginTop: 2,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#0D4F3C" }}
              >
                42
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="trending-up" size={10} color="#1B9E6E" />
                <Text style={{ fontSize: 10, color: "#1B9E6E", marginLeft: 2 }}>
                  +12%
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#D6F2E7",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "500", color: "#6B9E8E" }}>
              Total Spent
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginTop: 2,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#0D4F3C" }}
              >
                ₿ 2.4k
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar" size={10} color="#6B9E8E" />
                <Text style={{ fontSize: 10, color: "#6B9E8E", marginLeft: 2 }}>
                  Month
                </Text>
              </View>
            </View>
          </View>
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
