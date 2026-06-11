import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ActivityTabHeader, {
  ActivityTab,
} from "../../components/activities/ActivityTabHeader";
import OngoingTab from "../../components/activities/OngoingTab";
import CompletedTab from "../../components/activities/CompletedTab";
import ComplaintTab from "../../components/activities/ComplaintTab";
import CancelledTab from "../../components/activities/CancelledTab";

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("Ongoing");

  const renderTabContent = () => {
    switch (activeTab) {
      case "Ongoing":
        return <OngoingTab />;
      case "Completed":
        return <CompletedTab />;
      case "Complaint":
        return <ComplaintTab />;
      case "Cancelled":
        return <CancelledTab />;
      default:
        return <OngoingTab />;
    }
  };

  return (
    <View className="flex-1 bg-gray-50/50">
      {/* HEADER SECTION */}
      <View className="bg-white pt-14 px-5 pb-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">
            Your activities
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-10 h-10 items-center justify-center bg-gray-100 rounded-full"
          >
            <Ionicons name="options-outline" size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* TAB BAR */}
        <ActivityTabHeader activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {/* TAB CONTENT */}
      <View className="flex-1 px-5 pt-4">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {renderTabContent()}
        </ScrollView>
      </View>
    </View>
  );
}
