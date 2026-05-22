import React, { useEffect, useState } from "react";
import { View, Text, Modal, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  onDismiss?: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

export default function SuccessModal({
  visible,
  title = "Success!",
  message = "Operation completed successfully.",
  onDismiss,
  autoClose = true,
  autoCloseDuration = 2000,
}: SuccessModalProps) {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      if (autoClose) {
        const timer = setTimeout(() => {
          animateOut();
        }, autoCloseDuration);

        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={animateOut}
    >
      <View className="flex-1 justify-center items-center bg-black/40">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
          className="bg-white rounded-2xl px-8 py-8 items-center w-80"
        >
          {/* Checkmark Icon */}
          <View className="w-16 h-16 rounded-full bg-[#E8F5E9] items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={56} color="#4CAF50" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text className="text-sm text-gray-600 text-center">{message}</Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
