import { router } from "expo-router";
import { View, Text, TouchableOpacity, Image } from "react-native";

export default function WelcomeScreen() {
  return (
    <View className="flex-1 bg-[#F7F7F7] items-center pt-16 px-8">
      {/* LOGO IMAGE */}
      <Image
        source={require("../../assets/images/logo.png")}
        style={{
          width: 220,
          height: 110,
          marginBottom: 45,
        }}
        resizeMode="contain"
      />

      {/* Welcome Text */}
      <Text className="text-2xl font-bold text-[#222] mb-5">
        Welcome to PickU
      </Text>

      <Text className="text-base text-gray-500 mb-8">I’m new to PickU</Text>

      {/* Create Account */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/signup")}
        className="w-full bg-white border border-gray-200 rounded-xl py-4 items-center mb-5"
      >
        <Text className="font-semibold text-[#333] text-base">
          Create an account
        </Text>
      </TouchableOpacity>

      {/* Already Connected */}
      <Text className="text-sm text-gray-500 mb-5">Already connected?</Text>

      {/* Sign In */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/signin")}
        className="w-full bg-[#59C36A] rounded-xl py-4 items-center mb-10"
      >
        <Text className="font-bold text-white text-base">Sign In</Text>
      </TouchableOpacity>

      {/* Bottom Image */}
      <View className="flex-1 w-[130%] justify-end">
        <Image
          source={require("../../assets/images/city-line2.png")}
          className="w-full h-72"
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
