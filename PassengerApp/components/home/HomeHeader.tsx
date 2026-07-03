import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Platform, TouchableOpacity, View } from "react-native";
import { ProfileService } from "../../services/auth/profileService";

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
        paddingTop: 8,
      }}
    >
      {/* LEFT SIDE */}
      <View style={{ flex: 1, justifyContent: "center", height: 44 }}>
        {/* LOGO CONTAINER */}
        <Image
          source={require("../../assets/images/logo.png")}
          style={{
            position: "absolute",
            left: -10,
            width: 170, // Make it massively wide if desired visually
            height: 110, // Make it extremely tall visually
            resizeMode: "contain",
          }}
        />
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
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",

            // Subtle Shadow
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#0B3D2E"
          />

          {/* RED DOT */}
          <View
            style={{
              position: "absolute",
              right: 12,
              top: 10,
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
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#F3F4F6",
            marginLeft: 12,

            borderWidth: 1.5,
            borderColor: "#E5E7EB",
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
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#E5E7EB",
              }}
            >
              <Ionicons name="person" size={24} color="#9CA3AF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
