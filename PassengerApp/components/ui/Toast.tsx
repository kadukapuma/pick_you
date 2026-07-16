import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    {
        title: string;
        border: string;
        icon: keyof typeof Ionicons.glyphMap;
        iconColor: string;
        iconBg: string;
    }
> = {
    success: {
        title: "Success",
        border: "rgba(32,183,104,0.28)",
        icon: "checkmark-circle",
        iconColor: "#16A34A",
        iconBg: "#DCFCE7",
    },
    error: {
        title: "Action needed",
        border: "rgba(245,158,11,0.32)",
        icon: "alert-circle",
        iconColor: "#B45309",
        iconBg: "#FEF3C7",
    },
    info: {
        title: "Notice",
        border: "rgba(14,165,233,0.26)",
        icon: "information-circle",
        iconColor: "#0284C7",
        iconBg: "#E0F2FE",
    },
};

export default function Toast({
    visible,
    message,
    type = "info",
    duration = 3600,
    onHide,
}: ToastProps) {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();
    const config = CONFIG[type];

    useEffect(() => {
        if (visible) {
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
                bottom: Math.max(insets.bottom + 18, 30),
                left: 16,
                right: 16,
                zIndex: 9999,
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: config.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#0F172A",
                shadowOpacity: 0.16,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
            }}
        >
            <View
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: config.iconBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                }}
            >
                <Ionicons name={config.icon} size={22} color={config.iconColor} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "900" }}>
                    {config.title}
                </Text>
                <Text style={{ color: "#475569", fontSize: 13, fontWeight: "600", lineHeight: 18, marginTop: 2 }}>
                    {message}
                </Text>
            </View>

            <TouchableOpacity
                onPress={hide}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F8FAFC",
                    marginLeft: 10,
                }}
            >
                <Ionicons name="close" size={17} color="#64748B" />
            </TouchableOpacity>
        </Animated.View>
    );
}