import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, Platform, TouchableOpacity, View } from "react-native";
import { ProfileService } from "../../../src/services/auth/profileService";

type HomeHeaderProps = {
  compact?: boolean;
};

export default function HomeHeader({ compact = false }: HomeHeaderProps) {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const run = async () => {
        const result = await ProfileService.getProfile();
        if (!isMounted) {
          return;
        }

        setProfileImage(
          result.success ? (result.data?.profileImage ?? null) : null,
        );
      };

      run();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
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
        {/* LOGO CONTAINER */}
        <View
          style={{
            justifyContent: "center",
            alignItems: "flex-start",
            width: compact ? 140 : 170,
            height: compact ? 50 : 65,
            marginLeft: compact ? -25 : -35,
          }}
        >
          <Image
            source={require("../../../assets/images/logo.png")}
            style={{
              width: compact ? 210 : 270, // slightly larger
              height: compact ? 78 : 100, // slightly larger
              resizeMode: "contain",
              marginLeft: compact ? -45 : -65, // adjusted to keep same position
            }}
          />
        </View>
      </View>

      {/* RIGHT SIDE */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* NOTIFICATION BUTTON */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(drawer)/(tabs)/notification")}
          style={{
            width: compact ? 42 : 44,
            height: compact ? 42 : 44,
            borderRadius: compact ? 21 : 22,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",

            // Cross-platform shadow
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 4,

            elevation: 3,
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={compact ? 20 : 22}
            color="#0B3D2E"
          />

          {/* RED DOT */}
          <View
            style={{
              position: "absolute",
              right: compact ? 10 : 11,
              top: compact ? 9 : 10,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#FF4D4F",
            }}
          />
        </TouchableOpacity>

        {/* PROFILE BUTTON */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(drawer)/(tabs)/account")}
          style={{
            width: compact ? 40 : 44,
            height: compact ? 40 : 44,
            borderRadius: compact ? 20 : 22,
            overflow: "hidden",
            backgroundColor: "#D1D5DB",
            marginLeft: 10,

            // Better Android rendering
            borderWidth: Platform.OS === "android" ? 0.3 : 0,
            borderColor: "#D1D5DB",
          }}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#E5E7EB",
              }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
