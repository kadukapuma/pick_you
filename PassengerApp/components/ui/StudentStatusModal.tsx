import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StudentStatusModalProps {
  visible: boolean;
  status: "approved" | "rejected";
  onClose: () => void;
}

export default function StudentStatusModal({
  visible,
  status,
  onClose,
}: StudentStatusModalProps) {
  const isApproved = status === "approved";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/40 px-6">
        <View className="bg-white rounded-3xl px-8 py-8 items-center w-full max-w-sm">
          <View
            className={`w-24 h-24 rounded-full items-center justify-center ${
              isApproved ? "bg-[#E8F8F0]" : "bg-red-50"
            }`}
          >
            <Ionicons
              name={isApproved ? "checkmark-circle" : "close-circle"}
              size={72}
              color={isApproved ? "#59C36A" : "#EF4444"}
            />
          </View>

          <Text className="text-xl font-bold text-gray-900 mb-2 text-center mt-4">
            {isApproved ? "You're a Student Passenger!" : "Application not approved"}
          </Text>

          <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
            {isApproved
              ? "Congratulations! You're now a verified Student Passenger on PickU. Enjoy loyalty points, exclusive offers and more on every ride."
              : "Your student verification could not be approved at this time. You can review your details and re-apply from your profile."}
          </Text>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className={`rounded-xl px-8 py-3 w-full items-center ${
              isApproved ? "bg-[#59C36A]" : "bg-gray-800"
            }`}
          >
            <Text className="text-white font-semibold text-base">
              {isApproved ? "Great!" : "OK"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
