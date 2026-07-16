import React, { useEffect, useRef } from "react";
import { View, Text, Modal, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  onDismiss?: () => void;
  onClose?: () => void;
  buttonText?: string;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

export default function SuccessModal({
  visible,
  title = "Success!",
  message = "Operation completed successfully.",
  onDismiss,
  onClose,
  buttonText = "OK",
  autoClose = true,
  autoCloseDuration = 2800,
}: SuccessModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();

      if (autoClose) {
        const timer = setTimeout(animateOut, autoCloseDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.85, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => {
      onDismiss?.();
      onClose?.();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={animateOut}>
      <View className="flex-1 justify-center items-center bg-black/40">
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
          className="bg-white rounded-3xl px-8 py-8 items-center w-80"
        >
          <View className="w-24 h-24 rounded-full bg-[#E8F8F0] items-center justify-center">
            <Ionicons name="checkmark-circle" size={72} color="#59C36A" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center mt-2">
            {title}
          </Text>

          {/* Message */}
          {message ? (
            <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
              {message}
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Button */}
          <TouchableOpacity
            onPress={animateOut}
            activeOpacity={0.8}
            className="bg-[#59C36A] rounded-xl px-8 py-3 w-full items-center"
          >
            <Text className="text-white font-semibold text-base">{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
