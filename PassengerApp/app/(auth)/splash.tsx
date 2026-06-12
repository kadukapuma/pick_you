import { useEffect } from "react";
import { View, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function Splash() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      // Still loading auth state, wait
      console.log("⏳ Splash: Auth is loading...");
      return;
    }

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        // ✅ User is logged in, go to home
        console.log("✅ Splash: User authenticated, navigating to home");
        router.replace("/(drawer)/(tabs)/home");
      } else {
        // ❌ User not logged in, go to get-started
        console.log(
          "❌ Splash: User not authenticated, navigating to get-started",
        );
        router.replace("/(auth)/get-started");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Image
        source={require("../../assets/images/logo.png")}
        style={{
          width: 320,
          height: 320,
          resizeMode: "contain",
        }}
      />
    </View>
  );
}
