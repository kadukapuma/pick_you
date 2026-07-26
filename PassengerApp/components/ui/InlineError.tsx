import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InlineErrorProps {
    message?: string | null;
    /** Extra top margin. Defaults to 4 */
    marginTop?: number;
}

/**
 * Small inline error shown directly under form fields.
 * Shows nothing when message is empty/null.
 */
export default function InlineError({ message, marginTop = 4 }: InlineErrorProps) {
    if (!message) return null;

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop,
                marginLeft: 2,
                gap: 4,
            }}
        >
            <Ionicons name="alert-circle-outline" size={13} color="#EF5350" />
            <Text
                style={{
                    color: "#EF5350",
                    fontSize: 12,
                    fontWeight: "500",
                    flexShrink: 1,
                }}
            >
                {message}
            </Text>
        </View>
    );
}
