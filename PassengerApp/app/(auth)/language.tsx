import { View, Text, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { useState } from "react";

export default function LanguageScreen() {
  const [selected, setSelected] = useState("");

  const handleSelect = (language: string) => {
    setSelected(language);

    setTimeout(() => {
      router.push("/(auth)/get-started");
    }, 350);
  };

  return (
    <View className="flex-1 bg-[#F4F6F8]">

      {/* Logo Section */}
      <View className="flex-1 items-center justify-center px-6">

        <Image
          source={require("../../assets/images/logo.png")}
          style={{
            width: 350,
            height: 350,
            resizeMode: "contain",
          }}
        />

        <Text className="text-gray-500 -mt-6 text-base font-medium">
          Your smart travel partner
        </Text>

      </View>

      {/* Bottom Sheet */}
      <View className="bg-white rounded-t-[34px] px-5 pt-7 pb-9 shadow-xl">

        <Text className="text-2xl font-bold text-center text-[#1E293B]">
          Select your language
        </Text>

        <Text className="text-center text-gray-500 mt-2 mb-6">
          Tap one language to continue
        </Text>

        {/* English */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelect("English")}
          className={`rounded-full py-4 items-center mb-4 border ${
            selected === "English"
              ? "bg-[#59C36A] border-[#59C36A]"
              : "bg-[#EEF2F7] border-gray-200"
          }`}
        >
          <Text
            className={`text-xl font-bold ${
              selected === "English"
                ? "text-white"
                : "text-[#1E293B]"
            }`}
          >
            English
          </Text>
        </TouchableOpacity>

        {/* Sinhala */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelect("Sinhala")}
          className={`rounded-full py-4 items-center mb-4 border ${
            selected === "Sinhala"
              ? "bg-[#59C36A] border-[#59C36A]"
              : "bg-[#EEF2F7] border-gray-200"
          }`}
        >
          <Text
            className={`text-xl font-bold ${
              selected === "Sinhala"
                ? "text-white"
                : "text-[#1E293B]"
            }`}
          >
            සිංහල
          </Text>
        </TouchableOpacity>

        {/* Tamil */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelect("Tamil")}
          className={`rounded-full py-4 items-center border ${
            selected === "Tamil"
              ? "bg-[#59C36A] border-[#59C36A]"
              : "bg-[#EEF2F7] border-gray-200"
          }`}
        >
          <Text
            className={`text-xl font-bold ${
              selected === "Tamil"
                ? "text-white"
                : "text-[#1E293B]"
            }`}
          >
            தமிழ்
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}