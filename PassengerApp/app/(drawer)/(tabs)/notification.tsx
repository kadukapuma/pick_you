import HomeHeader from "../../components/home/HomeHeader";
import { View, Text } from "react-native";

export default function NotificationScreen() {
  return (
    <View className="flex-1 bg-white pt-14 px-5">
      {/* HEADER */}
      <HomeHeader />

      {/* CONTENT */}
      <View className="flex-1 items-center justify-center">
        <Text>Notification Screen</Text>
      </View>
    </View>
  );
}
