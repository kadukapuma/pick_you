import React from "react";
import { View, Text } from "react-native";

export default function EmptyState({ message = "You don't have any trips" }: { message?: string }) {
    return (
        <View className="flex-1 items-center justify-center py-20">
            <Text className="text-lg font-bold text-slate-800 text-center px-10">
                {message}
            </Text>
        </View>
    );
}
