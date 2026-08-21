import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Promotion } from "../../../services/promotions/promotionTypes";

type PromotionCardProps = {
  item: Promotion;
  compact?: boolean;
  width: number;
  onPress: () => void;
};

export default function PromotionCard({
  item,
  compact = false,
  width,
  onPress,
}: PromotionCardProps) {
  return (
    <View style={[styles.card, { width, borderRadius: compact ? 18 : 22 }]}>
      <Image
        source={
          item.imageUrl
            ? { uri: item.imageUrl }
            : require("../../../assets/images/banner.png")
        }
        style={{ width: "100%", height: compact ? 110 : 140 }}
        contentFit="cover"
      />

      <View style={{ padding: compact ? 12 : 14 }}>
        <Text numberOfLines={1} style={[styles.title, { fontSize: compact ? 14 : 16 }]}>
          {item.title}
        </Text>

        <Text
          numberOfLines={2}
          style={[styles.description, { fontSize: compact ? 11 : 12, marginTop: 4 }]}
        >
          {item.description}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          disabled={!item.actionUrl}
          style={[
            styles.button,
            {
              paddingVertical: compact ? 7 : 9,
              paddingHorizontal: compact ? 12 : 14,
              opacity: item.actionUrl ? 1 : 0.5,
            },
          ]}
        >
          <Text style={[styles.buttonText, { fontSize: compact ? 11 : 12 }]}>
            {item.buttonLabel}
          </Text>
          <Ionicons name="arrow-forward" size={13} color="white" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  title: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  description: {
    color: "#6B7280",
    lineHeight: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    backgroundColor: "#14B86A",
    borderRadius: 20,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});
