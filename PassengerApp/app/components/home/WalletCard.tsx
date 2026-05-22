import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type WalletCardProps = {
  compact?: boolean;
};

export default function WalletCard({ compact = false }: WalletCardProps) {
  return (
    <View
      style={{
        width: compact ? 134 : 165,
        backgroundColor: "#22B36A",
        borderRadius: compact ? 20 : 24,
        padding: compact ? 9 : 14,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="text-white font-semibold"
          style={{ fontSize: compact ? 11 : 13 }}
        >
          PickU Wallet
        </Text>

        <Ionicons name="eye-outline" size={compact ? 15 : 18} color="white" />
      </View>

      <Text
        className="text-white font-extrabold"
        style={{
          fontSize: compact ? 19 : 27,
          marginTop: compact ? 4 : 8,
        }}
      >
        Rs. 1,250.00
      </Text>

      <TouchableOpacity
        className="bg-white rounded-full items-center"
        style={{
          marginTop: compact ? 6 : 10,
          paddingVertical: compact ? 5 : 8,
        }}
      >
        <Text
          className="text-[#22B36A] font-bold"
          style={{ fontSize: compact ? 11 : 13 }}
        >
          + Add Money
        </Text>
      </TouchableOpacity>

      <View
        className="flex-row items-center justify-between"
        style={{ marginTop: compact ? 6 : 12 }}
      >
        <View className="flex-row items-center">
          <Ionicons name="star" size={compact ? 12 : 14} color="#FFD84D" />

          <Text
            className="text-white ml-2"
            style={{ fontSize: compact ? 10 : 12 }}
          >
            230 Points
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={compact ? 14 : 16}
          color="white"
        />
      </View>
    </View>
  );
}
