import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const features = [
  {
    icon: "shield-checkmark",
    title: "Verified",
    subtitle: "Drivers",
  },
  {
    icon: "navigate-circle",
    title: "Live",
    subtitle: "Tracking",
  },
  {
    icon: "headset",
    title: "24/7",
    subtitle: "Support",
  },
  {
    icon: "card",
    title: "Multiple",
    subtitle: "Payments",
  },
];

type FeatureRowProps = {
  compact?: boolean;
};

export default function FeatureRow({ compact = false }: FeatureRowProps) {
  return (
    <View
      style={{
        backgroundColor: "white",

        borderRadius: compact ? 18 : 22,

        paddingHorizontal: 10,
        paddingVertical: compact ? 6 : 10,

        flexDirection: "row",
        justifyContent: "space-between",

        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {features.map((item, index) => (
        <View
          key={index}
          style={{
            alignItems: "center",
            flex: 1,
          }}
        >
          {/* ICON */}
          <View
            style={{
              width: compact ? 26 : 34,
              height: compact ? 26 : 34,
              borderRadius: compact ? 13 : 17,

              backgroundColor: "#E8FAF0",

              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={item.icon as any}
              size={compact ? 14 : 17}
              color="#22B36A"
            />
          </View>

          {/* TITLE */}
          <Text
            style={{
              fontSize: compact ? 9 : 10,
              fontWeight: "700",
              color: "#111827",
              marginTop: compact ? 3 : 5,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {/* SUBTITLE */}
          <Text
            style={{
              fontSize: compact ? 8 : 9,
              color: "#6B7280",
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        </View>
      ))}
    </View>
  );
}
