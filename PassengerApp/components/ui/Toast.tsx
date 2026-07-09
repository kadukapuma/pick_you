import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    duration?: number;
    onHide: () => void;
}

const CONFIG: Record<
    ToastType,
    { bg: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }
> = {
    success: { bg: "#1E7D34", icon: "checkmark-circle", iconColor: "#A5D6A7" },
    error: { bg: "#C62828", icon: "alert-circle", iconColor: "#EF9A9A" },
    info: { bg: "#1A1A2E", icon: "information-circle", iconColor: "#90CAF9" },
};

export default function Toast({
    visible,
    message,
    type = "info",
    duration = 3000,
    onHide,
}: ToastProps) {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const { bg, icon, iconColor } = CONFIG[type];

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
                Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start();

            const timer = setTimeout(() => hide(), duration);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: 100, duration: 240, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide());
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={{
                transform: [{ translateY }],
                opacity,
                position: "absolute",
                bottom: 36,
                left: 16,
                right: 16,
                zIndex: 9999,
                backgroundColor: bg,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 8,
            }}
        >
            <Ionicons name={icon} size={22} color={iconColor} />

            <Text
                style={{
                    flex: 1,
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "500",
                    marginLeft: 10,
                    lineHeight: 20,
                }}
            >
                {message}
            </Text>

            <TouchableOpacity onPress={hide} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
        </Animated.View>
    );
}
