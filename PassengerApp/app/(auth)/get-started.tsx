import { router } from "expo-router";
import { View, Text, TouchableOpacity, Image } from "react-native";

export default function GetStartedScreen() {
  return (
    <View className="flex-1 bg-white">
      {/* Top Image Section */}
      <View className="h-[46%] bg-gray-100">
        <Image
          source={require("../../assets/images/getstarted.png")}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* Bottom Content Section */}
      <View className="flex-1 bg-white rounded-t-[36px] -mt-8 px-6 pt-4 items-center">
        {/* Bigger Logo */}
        <View
          style={{
            marginTop: -35,
            marginBottom: 0,
          }}
        >
          <Image
            source={require("../../assets/images/logo.png")}
            style={{
              width: 160,
              height: 160,
            }}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text className="text-[34px] leading-[42px] font-extrabold text-center text-[#202124] mb-24">
          Fast delivery for a{"\n"}better life
        </Text>

        {/* Button */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/welcome")}
          className="bg-[#34C759] rounded-full w-[70%] py-4 items-center mb-8"
          style={{
            shadowColor: "#34C759",
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <Text className="text-xl font-bold text-white">Get started</Text>
        </TouchableOpacity>

        {/* Bottom Text */}
        <Text className="text-base text-[#222222]">
          Want to earn?{" "}
          <Text className="font-bold text-[#34C759]">Download driver app</Text>
        </Text>
      </View>
    </View>
  );
}
