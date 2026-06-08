import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

export type ActivityTab = "Ongoing" | "Completed" | "Complaint" | "Cancelled";

interface ActivityTabHeaderProps {
    activeTab: ActivityTab;
    onTabChange: (tab: ActivityTab) => void;
}

const tabs: ActivityTab[] = ["Ongoing", "Completed", "Complaint", "Cancelled"];

export default function ActivityTabHeader({
    activeTab,
    onTabChange,
}: ActivityTabHeaderProps) {
    return (
        <View className="border-b border-gray-100 mb-4">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
            >
                <View className="flex-row">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => onTabChange(tab)}
                                className={`px-4 py-3 mr-2 ${isActive ? "border-b-2 border-orange-400" : ""
                                    }`}
                                activeOpacity={0.7}
                            >
                                <Text
                                    className={`text-base font-medium ${isActive ? "text-slate-900 font-bold" : "text-gray-400"
                                        }`}
                                >
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}
