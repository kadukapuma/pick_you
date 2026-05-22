import { View, Text } from "react-native";
import HomeHeader from "../../components/home/HomeHeader";

export default function ActivitiesScreen() {
  return (
    <View className="flex-1 bg-white pt-14 px-5">
      {/* HEADER */}
      <HomeHeader />

      {/* CONTENT */}
      <View className="flex-1 items-center justify-center">
        <Text>Activities Screen</Text>
      </View>
    </View>
  );
}
