import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ErrorAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export default function ErrorAlert({
  visible,
  title = "Error",
  message,
  onDismiss,
  onRetry,
  showRetry = false,
}: ErrorAlertProps) {
  const [scaleAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-center items-center bg-black/40">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
          }}
          className="bg-white rounded-2xl px-6 py-6 items-center w-80"
        >
          {/* Error Icon */}
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name="alert-circle" size={56} color="#EF5350" />
          </View>

          {/* Title */}
          <Text className="text-lg font-bold text-gray-900 mb-2 text-center">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-sm text-gray-600 text-center mb-6 leading-5">
            {message}
          </Text>

          {/* Buttons */}
          <View className="flex-row gap-3 w-full">
            <TouchableOpacity
              onPress={onDismiss}
              className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
            >
              <Text className="font-semibold text-gray-800">Dismiss</Text>
            </TouchableOpacity>

            {showRetry && (
              <TouchableOpacity
                onPress={onRetry}
                className="flex-1 bg-[#59C36A] rounded-lg py-3 items-center"
              >
                <Text className="font-semibold text-white">Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
