import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type PromoBannerProps = {
  compact?: boolean;
};

export default function PromoBanner({ compact = false }: PromoBannerProps) {
  return (
    <View
      style={{
        backgroundColor: "#14B86A",

        borderRadius: compact ? 18 : 22,

        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",

          paddingVertical: compact ? 6 : 12,
          paddingLeft: compact ? 12 : 14,
          paddingRight: 8,
        }}
      >
        {/* LEFT */}
        <View
          style={{
            flex: 1,
            paddingRight: 6,
          }}
        >
          {/* TAG */}
          <View
            style={{
              backgroundColor: "#FDE68A",

              alignSelf: "flex-start",

              paddingHorizontal: compact ? 7 : 8,
              paddingVertical: compact ? 3 : 4,

              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#14532D",
                fontSize: compact ? 8 : 9,
                fontWeight: "700",
              }}
            >
              NEW USER OFFER
            </Text>
          </View>

          {/* TITLE */}
          <Text
            style={{
              color: "white",

              fontSize: compact ? 15 : 18,
              fontWeight: "800",

              marginTop: compact ? 4 : 8,
            }}
          >
            Rs.100 Cashback
          </Text>

          {/* SUBTITLE */}
          <Text
            style={{
              color: "rgba(255,255,255,0.88)",

              fontSize: compact ? 10 : 11,

              marginTop: 3,
            }}
          >
            On your first 2 rides
          </Text>

          {/* BUTTON */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              backgroundColor: "white",

              alignSelf: "flex-start",

              flexDirection: "row",
              alignItems: "center",

              paddingHorizontal: compact ? 10 : 12,
              paddingVertical: compact ? 6 : 8,

              borderRadius: 20,

              marginTop: compact ? 6 : 10,
            }}
          >
            <Text
              style={{
                color: "#14B86A",
                fontWeight: "700",
                fontSize: compact ? 10 : 11,
              }}
            >
              Book a Ride
            </Text>

            <Ionicons
              name="arrow-forward"
              size={13}
              color="#14B86A"
              style={{
                marginLeft: 4,
              }}
            />
          </TouchableOpacity>
        </View>

        {/* IMAGE */}
        <Image
          source={require("../../../assets/images/banner.png")}
          style={{
            width: compact ? 82 : 120,
            height: compact ? 82 : 120,
            resizeMode: "contain",
          }}
        />
      </View>
    </View>
  );
}
