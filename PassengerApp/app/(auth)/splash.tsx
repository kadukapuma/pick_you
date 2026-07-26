import { useEffect } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import { useAuth } from "../../state/auth/AuthContext";

const carAnimation = require("../../assets/animations/car-animation.json");

export default function Splash() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      console.log("Splash: Auth is loading...");
      return;
    }

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        console.log("Splash: User authenticated, navigating to home");
        router.replace("/(app)/(tabs)/home");
      } else {
        console.log("Splash: User not authenticated, navigating to get-started");
        router.replace("/(auth)/get-started");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <LottieView
        source={carAnimation}
        autoPlay
        loop
        style={{
          width: 210,
          height: 150,
          marginBottom: -22,
        }}
      />
      <Image
        source={require("../../assets/images/logo.png")}
        style={{
          width: 300,
          height: 220,
          resizeMode: "contain",
        }}
      />
    </View>
  );
}