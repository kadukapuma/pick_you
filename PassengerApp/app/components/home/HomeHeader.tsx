import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, TouchableOpacity, View } from "react-native";

type HomeHeaderProps = {
  compact?: boolean;
};

export default function HomeHeader({ compact = false }: HomeHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingTop: 2,
      }}
    >
      {/* LEFT SIDE */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        }}
      >
        {/* HOME BADGE */}
        <View
          style={{
            width: compact ? 36 : 42,
            height: compact ? 36 : 42,
            borderRadius: compact ? 18 : 21,
            backgroundColor: "#E8F5EF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="home" size={compact ? 20 : 22} color="#0B3D2E" />
        </View>

        {/* LOGO */}
        <View
          style={{
            width: compact ? 108 : 120,
            height: compact ? 42 : 52,
            justifyContent: "center",
            marginLeft: 2,
          }}
        >
          <Image
            source={require("../../../assets/images/logo.png")}
            style={{
              width: compact ? 154 : 175,
              height: compact ? 56 : 64,
              resizeMode: "contain",
              transform: [{ translateX: compact ? -24 : -28 }],
            }}
          />
        </View>
      </View>

      {/* RIGHT SIDE */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/(tabs)/notification")}
          style={{
            width: compact ? 34 : 38,
            height: compact ? 34 : 38,
            borderRadius: compact ? 17 : 19,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={compact ? 19 : 21}
            color="#0B3D2E"
          />

          <View
            style={{
              position: "absolute",
              right: compact ? 8 : 9,
              top: compact ? 7 : 8,
              width: 7,
              height: 7,
              borderRadius: 10,
              backgroundColor: "#FF4D4F",
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(drawer)/(tabs)/account")}
          style={{
            width: compact ? 32 : 36,
            height: compact ? 32 : 36,
            borderRadius: compact ? 16 : 18,
            overflow: "hidden",
            backgroundColor: "#D1D5DB",
          }}
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/100" }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
