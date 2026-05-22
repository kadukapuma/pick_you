import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

type SearchBarProps = {
  compact?: boolean;
  onPress?: () => void;
};

export default function SearchBar({
  compact = false,
  onPress,
}: SearchBarProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 28,
        bounciness: 4,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 8,
      }),
    ]).start(() => onPress?.());
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => animatePress(0.97)}
        onPressOut={() => animatePress(1)}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: compact ? 20 : 24,
            paddingHorizontal: compact ? 14 : 18,
            paddingVertical: compact ? 9 : 12,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Ionicons name="location" size={20} color="#22B36A" />

          <Text
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: compact ? 13 : 15,
              color: "#9CA3AF",
            }}
          >
            Where are you going?
          </Text>

          <View
            style={{
              borderLeftWidth: 1,
              borderLeftColor: "#E5E7EB",
              paddingLeft: 14,
            }}
          >
            <Ionicons name="home-outline" size={20} color="#374151" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
