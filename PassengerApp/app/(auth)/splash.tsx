import { useEffect } from "react";
import { View, Image } from "react-native";
import { router } from "expo-router";

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/language");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

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
