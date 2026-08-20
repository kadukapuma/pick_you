import React, { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StudentEligibilityModalProps {
  visible: boolean;
  onYes: () => void;
  onDismiss: () => void;
}

export default function StudentEligibilityModal({
  visible,
  onYes,
  onDismiss,
}: StudentEligibilityModalProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 justify-center items-center bg-black/40 px-6">
        <View className="bg-white rounded-3xl px-7 py-8 w-full max-w-sm">
          <TouchableOpacity
            onPress={onDismiss}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#374151" />
          </TouchableOpacity>

          <View className="w-16 h-16 rounded-full bg-[#E8F8F0] items-center justify-center mb-4 mt-2">
            <Ionicons name="school-outline" size={32} color="#0B8F62" />
          </View>

          <View className="flex-row items-center mb-2">
            <Text className="text-xl font-bold text-gray-900">Are you a student?</Text>
            <TouchableOpacity
              onPress={() => setShowInfo((prev) => !prev)}
              className="ml-2 w-6 h-6 rounded-full bg-gray-100 items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="information" size={14} color="#374151" />
            </TouchableOpacity>
          </View>

          {showInfo ? (
            <Text className="text-sm text-[#0B8F62] leading-5 mb-4">
              Students can earn more loyalty points on every ride!
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 leading-5 mb-4">
              Verify your student status to start earning loyalty points on your rides.
            </Text>
          )}

          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.8}
              className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
            >
              <Text className="text-gray-700 font-semibold text-base">No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onYes}
              activeOpacity={0.8}
              className="flex-1 bg-[#0B8F62] rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold text-base">Yes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
